"""
AI Recommendation Engine
Primary: Gemini (google-generativeai)
Fallback: Groq (llama-3.1)
Fallback 2: Rule-based
"""

import json
import re
import os
import math
from aki_engine import AKIInput, build_reco_context

# Incremental revenue per unit dari add-on HSI (selisih harga add-on vs base HSI)
# Konsisten di semua tier (Bisnis & Basic)
HSI_ADDONS = [
    {"name": "Add-on Voice (800 menit)", "delta": 40_000},
    {"name": "Add-on Netmonk (monitoring jaringan)", "delta": 26_000},
    {"name": "Add-on OCA (CDN Telkom)", "delta": 104_000},
    {"name": "Add-on IPTV", "delta": 200_000},
    {"name": "Add-on IPTV + Voice", "delta": 225_000},
]


def _compute_scenarios(result: dict) -> dict:
    """Pre-kalkulasi skenario konkret: extend kontrak & tambah add-on."""
    inp: AKIInput = result["input"]
    months = max(inp.kontrak_total_bulan, 1)
    monthly_rev = result["total_revenue"] / months

    # Skenario 1: extend kontrak
    min_contract = None
    if not result["pp_ok"] and result["payback"] is not None:
        min_contract = math.ceil(result["payback"] * 12) + 1

    # Hitung revenue gap bulanan
    cogs_ratio = result["total_cogs"] / result["total_revenue"] if result["total_revenue"] > 0 else 0.7
    om_pct = float(getattr(inp, "om_pct", 0.12))
    ni_margin = max(0.01, (1 - cogs_ratio - om_pct) * (1 - 0.22))

    revenue_gap = 0
    if not result["nim_ok"]:
        cur_ni_monthly = result["total_ni"] / months
        target_ni_monthly = 0.02 * monthly_rev
        revenue_gap = max(revenue_gap, int(math.ceil(max(0, target_ni_monthly - cur_ni_monthly) / ni_margin)))
    if not result["npv_ok"] and result["npv"] < 0:
        revenue_gap = max(revenue_gap, int(math.ceil(abs(result["npv"]) / max(months * ni_margin, 1))))

    # Skenario 2: add-on per produk HSI yang ada
    hsi_units = sum(p.qty for p in inp.products if p.is_hsi)
    non_hsi_units = sum(p.qty for p in inp.products if not p.is_hsi)

    addon_scenarios = []
    if revenue_gap > 0 and hsi_units > 0:
        for addon in HSI_ADDONS:
            delta_total = addon["delta"] * hsi_units
            units_extra = max(1, math.ceil(revenue_gap / addon["delta"])) if hsi_units == 0 else 0
            addon_scenarios.append({
                "nama": addon["name"],
                "delta_per_unit": addon["delta"],
                "hsi_units": hsi_units,
                "delta_total_jika_semua": delta_total,
                "menutup_gap": delta_total >= revenue_gap,
            })

    return {
        "min_contract_months": min_contract,
        "current_contract_months": months,
        "revenue_gap_monthly": revenue_gap,
        "monthly_rev_now": int(monthly_rev),
        "hsi_units": hsi_units,
        "non_hsi_units": non_hsi_units,
        "addon_scenarios": addon_scenarios,
    }

SYSTEM_PROMPT = """Anda adalah analis investasi senior Telkom Indonesia, Tim Solution & Offering.

Data yang diberikan sudah mencakup skenario yang telah dihitung: kontrak minimum dan opsi add-on per produk HSI.
Tugas Anda: tulis rekomendasi BISNIS yang jelas dan actionable berdasarkan skenario tersebut.

FOKUS HANYA DUA REKOMENDASI UTAMA (urut prioritas):
1. PERPANJANG KONTRAK — sebutkan dari berapa bulan ke berapa bulan, dan apa dampaknya ke Payback Period.
2. TAMBAH ADD-ON PRODUK — pilih add-on terbaik dari skenario yang tersedia, sebutkan nama add-on, berapa unit, Rp/bln tambahannya, dan apakah gap tertutup.

Jika produk non-HSI ada, boleh tambah rekomendasi ke-3: repricing non-HSI (baseline Rp → target Rp).

ATURAN:
- HSI DILARANG naik harga langsung — hanya via add-on atau upgrade tier bandwidth.
- Gunakan angka dari data yang diberikan, jangan mengarang angka sendiri.
- Setiap rekomendasi: kondisi sekarang → target (dalam Rp/bln atau bulan).

WAJIB response JSON ini SAJA (tanpa markdown):
{
  "summary": "2-3 kalimat: masalah utama + gap revenue bulanan + kontrak minimum yang dibutuhkan",
  "recommendations": [
    {
      "type": "extend_contract|add_product|adjust_margin",
      "priority": "high|medium|low",
      "title": "Judul singkat dan spesifik",
      "detail": "Kondisi saat ini → target. Sebutkan angka Rp dan bulan secara eksplisit.",
      "estimated_impact": "Dampak kuantitatif: +Rp X/bln revenue, atau PP turun dari Y ke Z bulan",
      "action": "Langkah konkret untuk Tim Solution dalam 1-2 kalimat"
    }
  ],
  "minimum_contract_months": <bulan minimum agar PP tercapai, atau null>,
  "minimum_revenue_monthly": <Rp/bln minimum agar layak, atau null>,
  "notes": "Catatan singkat: asumsi, batasan HSI, atau risiko negosiasi"
}"""


def get_ai_recommendations(result: dict) -> dict:
    """Try Gemini → Groq → rule-based, then normalize fields."""
    scenarios = _compute_scenarios(result)
    context = build_reco_context(result) + "\n\n" + _format_scenarios(scenarios)

    reco = _try_gemini(context)
    if reco:
        return _normalize_reco(reco, result, "gemini", scenarios)

    reco = _try_groq(context)
    if reco:
        return _normalize_reco(reco, result, "groq", scenarios)

    return _normalize_reco(_rule_based(result), result, "rule_based", scenarios)


def _format_scenarios(s: dict) -> str:
    lines = ["SKENARIO YANG SUDAH DIHITUNG (gunakan angka ini):"]

    if s["min_contract_months"]:
        lines.append(
            f"  [KONTRAK] Saat ini {s['current_contract_months']} bulan → "
            f"perpanjang ke minimal {s['min_contract_months']} bulan agar Payback Period tercapai."
        )
    else:
        lines.append(f"  [KONTRAK] Saat ini {s['current_contract_months']} bulan — PP sudah dalam rentang kontrak.")

    if s["revenue_gap_monthly"] > 0:
        lines.append(f"  [GAP] Dibutuhkan tambahan ≈ Rp{s['revenue_gap_monthly']:,.0f}/bln agar proyek layak.")
    else:
        lines.append("  [GAP] Revenue sudah cukup — masalah lebih ke kontrak/PP.")

    if s["addon_scenarios"]:
        lines.append(f"  [ADD-ON] Produk HSI saat ini: {s['hsi_units']} unit. Opsi add-on per unit:")
        for a in s["addon_scenarios"]:
            status = "✓ MENUTUP GAP" if a["menutup_gap"] else f"belum cukup (total +Rp{a['delta_total_jika_semua']:,.0f}/bln)"
            lines.append(
                f"    - {a['nama']}: +Rp{a['delta_per_unit']:,.0f}/unit/bln × {a['hsi_units']} unit "
                f"= +Rp{a['delta_total_jika_semua']:,.0f}/bln → {status}"
            )
    elif s["non_hsi_units"] > 0:
        lines.append(f"  [ADD-ON] Tidak ada produk HSI. Produk non-HSI: {s['non_hsi_units']} unit — pertimbangkan repricing.")

    return "\n".join(lines)


def _parse_json(text: str) -> dict | None:
    """Parse JSON from AI response, strip markdown fences if any."""
    try:
        clean = re.sub(r"```json\s*|\s*```", "", text).strip()
        return json.loads(clean)
    except Exception:
        return None


def _try_gemini(context: str) -> dict | None:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        import google.generativeai as genai  # type: ignore
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=SYSTEM_PROMPT,
        )
        response = model.generate_content(
            f"Buat rekomendasi berdasarkan data dan skenario berikut. Fokus pada kontrak minimum dan add-on produk:\n\n{context}"
        )
        return _parse_json(response.text)
    except Exception as e:
        print(f"[Gemini] Error: {e}")
        return None


def _try_groq(context: str) -> dict | None:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None
    try:
        from groq import Groq

        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Buat rekomendasi berdasarkan data dan skenario berikut. Fokus pada kontrak minimum dan add-on produk:\n\n{context}"},
            ],
            temperature=0.3,
            max_tokens=800,
        )
        return _parse_json(response.choices[0].message.content)
    except Exception as e:
        print(f"[Groq] Error: {e}")
        return None


def _estimate_minimum_revenue_monthly(result: dict) -> int | None:
    inp: AKIInput = result["input"]
    months = max(inp.kontrak_total_bulan, 1)
    current_monthly = result["total_revenue"] / months if months > 0 else 0.0

    total_revenue = result["total_revenue"] or 0.0
    total_cogs = result["total_cogs"] or 0.0
    cogs_ratio = (total_cogs / total_revenue) if total_revenue > 0 else 0.7
    om_pct = float(getattr(inp, "om_pct", 0.12))
    ni_sensitivity = max(0.05, 1 - cogs_ratio - om_pct)

    ni_gap = 0.0
    target_ni = max(0.02 * total_revenue, 0.0)
    if not result["nim_ok"]:
        ni_gap = max(0.0, target_ni - max(result["total_ni"], 0.0))

    npv_gap = 0.0
    if not result["npv_ok"]:
        npv_gap = abs(min(result["npv"], 0.0))

    revenue_needed_for_ni = (ni_gap / ni_sensitivity) if ni_gap > 0 else 0.0
    revenue_needed_for_npv = (npv_gap / max(0.1, ni_sensitivity * 0.6)) if npv_gap > 0 else 0.0

    annual_needed = max(revenue_needed_for_ni, revenue_needed_for_npv, 0.0)
    monthly_needed = current_monthly + (annual_needed / 12.0)

    if monthly_needed <= 0:
        return None
    return int(math.ceil(monthly_needed))


def _normalize_reco(reco: dict, result: dict, source: str, scenarios: dict = None) -> dict:
    if not isinstance(reco, dict):
        reco = {}

    recs = reco.get("recommendations")
    if not isinstance(recs, list):
        recs = []

    normalized_recs = []
    for r in recs:
        if not isinstance(r, dict):
            continue
        normalized_recs.append({
            "type": r.get("type", "add_product"),
            "priority": r.get("priority", "medium"),
            "title": r.get("title", "Rekomendasi perbaikan kelayakan"),
            "detail": r.get("detail", "Lakukan penyesuaian parameter proyek agar memenuhi indikator kelayakan."),
            "estimated_impact": r.get("estimated_impact", ""),
            "action": r.get("action", "Koordinasikan revisi proposal bersama tim Solution & Offering."),
        })

    min_months = reco.get("minimum_contract_months")
    if min_months is None and scenarios:
        min_months = scenarios.get("min_contract_months")
    if min_months is None and result.get("payback") is not None and not result.get("pp_ok", True):
        min_months = math.ceil(result["payback"] * 12) + 1

    min_rev = reco.get("minimum_revenue_monthly")
    if min_rev is None and scenarios and scenarios.get("revenue_gap_monthly"):
        min_rev = scenarios["monthly_rev_now"] + scenarios["revenue_gap_monthly"]
    if min_rev is None:
        min_rev = _estimate_minimum_revenue_monthly(result)

    notes = reco.get("notes") or "Catatan: harga untuk produk HSI tidak disarankan dinaikkan; optimasi melalui upgrade paket atau add-on."

    summary = reco.get("summary")
    if not summary:
        summary = "Proyek belum layak dan membutuhkan penyesuaian kontrak, revenue bulanan, serta strategi upsell produk."

    if not normalized_recs:
        rb = _rule_based(result)
        normalized_recs = rb.get("recommendations", [])

    return {
        "summary": summary,
        "recommendations": normalized_recs,
        "minimum_contract_months": min_months,
        "minimum_revenue_monthly": min_rev,
        "notes": notes,
        "source": source,
    }


def _rule_based(result: dict) -> dict:
    inp: AKIInput = result["input"]
    recs = []

    if not result["pp_ok"] and result["payback"] is not None:
        min_months = math.ceil(result["payback"] * 12) + 1
        recs.append({
            "type": "extend_contract",
            "priority": "high",
            "title": "Perpanjang Masa Kontrak",
            "detail": f"Payback Period {result['payback_str']} melebihi masa kontrak {result['kontrak_total_bulan']} bulan.",
            "estimated_impact": f"Kontrak minimal {min_months} bulan agar PP < masa kontrak",
            "action": f"Negosiasikan perpanjangan kontrak menjadi minimal {min_months} bulan",
        })
    elif not result["pp_ok"]:
        recs.append({
            "type": "extend_contract",
            "priority": "high",
            "title": "Perpanjang Masa Kontrak",
            "detail": "Payback Period tidak tercapai dalam horizon 5 tahun.",
            "estimated_impact": "Perpanjang kontrak dan/atau naikkan revenue",
            "action": "Review ulang nilai CAPEX dan masa kontrak dengan TIF",
        })

    if not result["gpm_ok"]:
        recs.append({
            "type": "upgrade_bandwidth",
            "priority": "high",
            "title": "Upgrade Bandwidth Produk",
            "detail": f"GPM {result['gpm']*100:.1f}% di bawah minimum 7%. Upgrade bandwidth untuk naikkan revenue.",
            "estimated_impact": "Upgrade 2x bandwidth umumnya meningkatkan revenue 40-60%",
            "action": "Tawarkan upgrade ke tier bandwidth yang lebih tinggi",
        })

    if not result["nim_ok"]:
        has_non_hsi = any(not p.is_hsi for p in inp.products)
        if has_non_hsi:
            recs.append({
                "type": "adjust_margin",
                "priority": "medium",
                "title": "Optimasi Margin Produk Non-HSI",
                "detail": f"NIM {result['nim']*100:.1f}% di bawah minimum 2%. Naikkan ARPU untuk produk non-HSI atau tekan O&M.",
                "estimated_impact": "Kenaikan ARPU non-HSI 8-15% berpotensi menaikkan NIM ke atas 2%",
                "action": "Review list produk non-HSI, tetapkan baseline->target harga per produk, dan negosiasikan repricing",
            })
        else:
            recs.append({
                "type": "add_product",
                "priority": "high",
                "title": "Tambah Add-on karena Portofolio Dominan HSI",
                "detail": "Seluruh/Mayoritas produk adalah HSI, sehingga kenaikan harga langsung tidak direkomendasikan.",
                "estimated_impact": "Tambahan 1-2 add-on aktif dapat menaikkan revenue bulanan signifikan tanpa mark-up HSI",
                "action": "Bundling HSI dengan Voice / Netmonk / OCA / IPTV untuk menaikkan revenue",
            })

    if not result["npv_ok"]:
        recs.append({
            "type": "add_product",
            "priority": "medium",
            "title": "Tambah Produk Add-on yang Relevan",
            "detail": "NPV masih negatif. Tambahkan add-on seperti Voice, Netmonk, OCA, atau IPTV sesuai profil customer.",
            "estimated_impact": "Kombinasi 2-3 add-on dapat menambah revenue sekitar Rp 200.000 - Rp 1.000.000/bulan per site",
            "action": "Buat 2 skenario bundling (basic & advanced), lalu pilih skenario dengan dampak NPV terbaik",
        })

    min_months = None
    if result["payback"] is not None and not result["pp_ok"]:
        min_months = math.ceil(result["payback"] * 12) + 1

    issues = [k for k, v in [
        ("NPV negatif", not result["npv_ok"]),
        ("MIRR rendah", not result["irr_ok"]),
        ("PP > masa kontrak", not result["pp_ok"]),
        ("GPM rendah", not result["gpm_ok"]),
        ("NIM rendah", not result["nim_ok"]),
    ] if v]

    min_revenue = _estimate_minimum_revenue_monthly(result)

    return {
        "summary": f"Proyek tidak layak karena: {', '.join(issues)}.",
        "recommendations": recs,
        "minimum_contract_months": min_months,
        "minimum_revenue_monthly": min_revenue,
        "notes": "Harga produk HSI tidak disarankan dinaikkan; peningkatan dilakukan lewat upgrade paket atau bundling add-on.",
        "source": "rule_based",
    }
