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

# Upgrade tier map untuk HSI — delta = selisih harga bulanan ke tier berikutnya
# Berdasarkan katalog produk aktual (HSI Bisnis Standar/Premium & HSI Basic Standar/Premium)
HSI_UPGRADE_MAP = {
    "HSI Bisnis Standar 50 Mbps":  {"upgrade_to": "HSI Bisnis Standar 75 Mbps",    "current": 439_000, "delta": 80_000},
    "HSI Bisnis Standar 75 Mbps":  {"upgrade_to": "HSI Bisnis Premium 100 Mbps",   "current": 519_000, "delta": 150_000},
    "HSI Bisnis Premium 100 Mbps": {"upgrade_to": "HSI Bisnis Premium 150 Mbps",   "current": 669_000, "delta": 150_000},
    "HSI Bisnis Premium 150 Mbps": {"upgrade_to": "HSI Bisnis Premium 200 Mbps",   "current": 819_000, "delta": 230_000},
    "HSI Bisnis Premium 200 Mbps": {"upgrade_to": "HSI Bisnis Premium 300 Mbps",   "current": 1_049_000, "delta": 450_000},
    "HSI Basic Standar 50 Mbps":   {"upgrade_to": "HSI Basic Standar 75 Mbps",     "current": 387_000, "delta": 60_000},
    "HSI Basic Standar 75 Mbps":   {"upgrade_to": "HSI Basic Premium 100 Mbps",    "current": 447_000, "delta": 110_000},
    "HSI Basic Premium 100 Mbps":  {"upgrade_to": "HSI Basic Premium 150 Mbps",    "current": 557_000, "delta": 140_000},
    "HSI Basic Premium 150 Mbps":  {"upgrade_to": "HSI Basic Premium 200 Mbps",    "current": 697_000, "delta": 180_000},
    "HSI Basic Premium 200 Mbps":  {"upgrade_to": "HSI Basic Premium 300 Mbps",    "current": 877_000, "delta": 380_000},
}

# Upgrade tier map untuk WMS — delta = selisih harga bulanan ke tier berikutnya
WMS_UPGRADE_MAP = {
    "WMS Standar Silver 20 Mbps":      {"upgrade_to": "WMS Standar Gamer 30 Mbps",     "current": 435_000,   "delta": 165_000},
    "WMS Standar Gamer 30 Mbps":       {"upgrade_to": "WMS Standar Gamer 40 Mbps",     "current": 600_000,   "delta": 175_000},
    "WMS Standar Gamer 40 Mbps":       {"upgrade_to": "WMS Standar Gold 50 Mbps",      "current": 775_000,   "delta": 175_000},
    "WMS Standar Gold 50 Mbps":        {"upgrade_to": "WMS Standar Platinum 100 Mbps", "current": 950_000,   "delta": 550_000},
}


def _compute_scenarios(result: dict) -> dict:
    """Pre-kalkulasi skenario konkret: extend kontrak & upgrade tier produk."""
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

    # Skenario 2: upgrade tier per produk HSI/WMS yang ada di proyek
    hsi_units = sum(p.qty for p in inp.products if p.is_hsi and p.monthly_price > 0)
    non_hsi_units = sum(p.qty for p in inp.products if not p.is_hsi and p.monthly_price > 0)

    upgrade_scenarios = []
    for p in inp.products:
        if p.monthly_price <= 0:
            continue
        upgrade_info = HSI_UPGRADE_MAP.get(p.name) or WMS_UPGRADE_MAP.get(p.name)
        if upgrade_info:
            delta_total = upgrade_info["delta"] * p.qty
            upgrade_scenarios.append({
                "produk_saat_ini": p.name,
                "produk_upgrade": upgrade_info["upgrade_to"],
                "qty": p.qty,
                "delta_per_unit": upgrade_info["delta"],
                "delta_total": delta_total,
                "menutup_gap": revenue_gap > 0 and delta_total >= revenue_gap,
                "is_hsi": p.is_hsi,
            })

    # Astinet/Metro-E: bandwidth upgrade note (tidak ada fix delta di katalog, hanya estimasi)
    astinet_metroo_units = sum(
        p.qty for p in inp.products
        if not p.is_hsi and p.monthly_price > 0
        and ("Astinet" in p.name or "Metro-E" in p.name)
    )

    return {
        "min_contract_months": min_contract,
        "current_contract_months": months,
        "revenue_gap_monthly": revenue_gap,
        "monthly_rev_now": int(monthly_rev),
        "hsi_units": hsi_units,
        "non_hsi_units": non_hsi_units,
        "upgrade_scenarios": upgrade_scenarios,
        "astinet_metroo_units": astinet_metroo_units,
    }

SYSTEM_PROMPT = """Anda adalah analis investasi senior Telkom Indonesia, Tim Solution & Offering.

Data yang diberikan sudah mencakup skenario yang telah dihitung: kontrak minimum dan opsi upgrade tier produk berdasarkan katalog aktual.
Tugas Anda: tulis rekomendasi BISNIS yang jelas dan actionable berdasarkan skenario tersebut.

FOKUS REKOMENDASI UTAMA (urut prioritas):
1. PERPANJANG KONTRAK — sebutkan dari berapa bulan ke berapa bulan, dan apa dampaknya ke Payback Period.
2. UPGRADE TIER PRODUK — gunakan skenario upgrade yang tersedia. Sebutkan nama produk saat ini → produk upgrade, berapa unit, delta Rp/bln per unit, total delta, dan apakah gap tertutup.
   - HSI (Bisnis/Basic): upgrade ke tier bandwidth lebih tinggi (Standar → Premium → dst)
   - WMS: upgrade ke tier lebih tinggi (Silver → Gamer → Gold → Platinum)
   - Astinet/Metro-E: upgrade bandwidth (misal 10 Mbps → 20 Mbps), sebutkan estimasi delta berdasarkan proporsi harga
3. Jika masih ada produk non-HSI/non-WMS, boleh tambah rekomendasi ke-3: repricing dengan menyebut produk spesifik dan target harga.

ATURAN:
- HSI dan WMS DILARANG naik harga langsung — hanya via upgrade tier bandwidth.
- Gunakan angka dari skenario yang diberikan, jangan mengarang angka sendiri.
- Setiap rekomendasi: kondisi sekarang (nama produk + Rp) → target (nama produk + Rp).

WAJIB response JSON ini SAJA (tanpa markdown):
{
  "summary": "2-3 kalimat: masalah utama + gap revenue bulanan + solusi utama yang direkomendasikan",
  "recommendations": [
    {
      "type": "extend_contract|upgrade_bandwidth|adjust_margin",
      "priority": "high|medium|low",
      "title": "Judul singkat dan spesifik",
      "detail": "Kondisi saat ini → target. Sebutkan nama produk, angka Rp, dan bulan secara eksplisit.",
      "estimated_impact": "Dampak kuantitatif: +Rp X/bln revenue, atau PP turun dari Y ke Z bulan",
      "action": "Langkah konkret untuk Tim Solution dalam 1-2 kalimat"
    }
  ],
  "minimum_contract_months": <bulan minimum agar PP tercapai, atau null>,
  "minimum_revenue_monthly": <Rp/bln minimum agar layak, atau null>,
  "notes": "Catatan singkat: asumsi, batasan HSI/WMS, atau risiko negosiasi"
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

    return _normalize_reco(_rule_based(result, scenarios), result, "rule_based", scenarios)


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

    if s["upgrade_scenarios"]:
        lines.append("  [UPGRADE TIER] Opsi upgrade produk berdasarkan katalog aktual:")
        for u in s["upgrade_scenarios"]:
            status = "✓ MENUTUP GAP" if u["menutup_gap"] else f"menutup sebagian (total +Rp{u['delta_total']:,.0f}/bln)"
            produk_type = "HSI" if u["is_hsi"] else "WMS"
            lines.append(
                f"    - [{produk_type}] {u['produk_saat_ini']} → {u['produk_upgrade']}: "
                f"+Rp{u['delta_per_unit']:,.0f}/unit/bln × {u['qty']} unit "
                f"= +Rp{u['delta_total']:,.0f}/bln → {status}"
            )
    elif s["astinet_metroo_units"] > 0:
        lines.append(
            f"  [UPGRADE BANDWIDTH] Tidak ada HSI/WMS untuk upgrade tier. "
            f"Ada {s['astinet_metroo_units']} unit Astinet/Metro-E — "
            f"pertimbangkan upgrade bandwidth (proporsi harga naik ≈ harga tier lebih tinggi di katalog)."
        )
    elif s["non_hsi_units"] > 0:
        lines.append(f"  [REPRICING] Tidak ada produk dengan upgrade tier tersedia. Produk non-HSI: {s['non_hsi_units']} unit — pertimbangkan repricing.")

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
            "type": r.get("type", "upgrade_bandwidth"),
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

    notes = reco.get("notes") or "Catatan: harga untuk produk HSI dan WMS tidak disarankan dinaikkan langsung; optimasi melalui upgrade tier bandwidth di katalog."

    summary = reco.get("summary")
    if not summary:
        summary = "Proyek belum layak dan membutuhkan penyesuaian kontrak, revenue bulanan, serta strategi upgrade tier produk."

    if not normalized_recs:
        rb = _rule_based(result, scenarios)
        normalized_recs = rb.get("recommendations", [])

    return {
        "summary": summary,
        "recommendations": normalized_recs,
        "minimum_contract_months": min_months,
        "minimum_revenue_monthly": min_rev,
        "notes": notes,
        "source": source,
    }


def _rule_based(result: dict, scenarios: dict = None) -> dict:
    inp: AKIInput = result["input"]
    recs = []

    if not result["pp_ok"] and result["payback"] is not None:
        min_months = math.ceil(result["payback"] * 12) + 1
        recs.append({
            "type": "extend_contract",
            "priority": "high",
            "title": "Perpanjang Masa Kontrak",
            "detail": (
                f"Payback Period saat ini {result['payback_str']} melebihi masa kontrak "
                f"{result['kontrak_total_bulan']} bulan. Perpanjang ke minimal {min_months} bulan."
            ),
            "estimated_impact": f"Kontrak minimal {min_months} bulan agar PP < masa kontrak",
            "action": f"Negosiasikan perpanjangan kontrak menjadi minimal {min_months} bulan dengan customer",
        })
    elif not result["pp_ok"]:
        recs.append({
            "type": "extend_contract",
            "priority": "high",
            "title": "Perpanjang Masa Kontrak",
            "detail": "Payback Period tidak tercapai dalam horizon 5 tahun.",
            "estimated_impact": "Perpanjang kontrak dan/atau naikkan revenue bulanan",
            "action": "Review ulang nilai CAPEX dan masa kontrak dengan TIF",
        })

    # Upgrade tier untuk HSI/WMS berdasarkan katalog aktual
    upgrade_scenarios = (scenarios or {}).get("upgrade_scenarios", [])
    revenue_gap = (scenarios or {}).get("revenue_gap_monthly", 0)

    if upgrade_scenarios:
        # Pilih upgrade terbaik: yang menutup gap atau delta terbesar
        best_upgrade = max(upgrade_scenarios, key=lambda u: u["delta_total"])
        gap_note = ""
        if revenue_gap > 0:
            if best_upgrade["menutup_gap"]:
                gap_note = f" — menutup gap Rp{revenue_gap:,.0f}/bln"
            else:
                gap_note = f" — menutup sebagian dari gap Rp{revenue_gap:,.0f}/bln"

        produk_type = "HSI" if best_upgrade["is_hsi"] else "WMS"
        recs.append({
            "type": "upgrade_bandwidth",
            "priority": "high" if revenue_gap > 0 else "medium",
            "title": f"Upgrade Tier {produk_type}: {best_upgrade['produk_saat_ini'].split(' ', 2)[-1] if len(best_upgrade['produk_saat_ini'].split()) > 2 else best_upgrade['produk_saat_ini']}",
            "detail": (
                f"{best_upgrade['produk_saat_ini']} (×{best_upgrade['qty']}) → {best_upgrade['produk_upgrade']}: "
                f"+Rp{best_upgrade['delta_per_unit']:,.0f}/unit/bln × {best_upgrade['qty']} unit "
                f"= +Rp{best_upgrade['delta_total']:,.0f}/bln{gap_note}."
            ),
            "estimated_impact": f"+Rp{best_upgrade['delta_total']:,.0f}/bln dari upgrade {best_upgrade['qty']} unit",
            "action": (
                f"Tawarkan upgrade dari {best_upgrade['produk_saat_ini']} ke {best_upgrade['produk_upgrade']} "
                f"untuk {best_upgrade['qty']} unit. Tambahan biaya customer: +Rp{best_upgrade['delta_per_unit']:,.0f}/unit/bln."
            ),
        })

        # Jika masih ada upgrade lain yang bisa menutup gap lebih baik
        for u in upgrade_scenarios:
            if u is best_upgrade:
                continue
            if u["menutup_gap"] and not best_upgrade["menutup_gap"]:
                recs.append({
                    "type": "upgrade_bandwidth",
                    "priority": "medium",
                    "title": f"Alternatif Upgrade: {u['produk_upgrade']}",
                    "detail": (
                        f"{u['produk_saat_ini']} (×{u['qty']}) → {u['produk_upgrade']}: "
                        f"+Rp{u['delta_per_unit']:,.0f}/unit/bln × {u['qty']} unit "
                        f"= +Rp{u['delta_total']:,.0f}/bln — menutup gap."
                    ),
                    "estimated_impact": f"+Rp{u['delta_total']:,.0f}/bln",
                    "action": f"Tawarkan upgrade ke {u['produk_upgrade']} sebagai alternatif.",
                })
                break

    elif not result["gpm_ok"] or not result["nim_ok"]:
        # Tidak ada HSI/WMS upgrade tersedia — cek apakah ada Astinet/Metro-E
        astinet_products = [p for p in inp.products if "Astinet" in p.name or "Metro-E" in p.name]
        if astinet_products:
            p = astinet_products[0]
            recs.append({
                "type": "upgrade_bandwidth",
                "priority": "high",
                "title": f"Upgrade Bandwidth {p.name}",
                "detail": (
                    f"GPM {result['gpm']*100:.1f}% / NIM {result['nim']*100:.1f}% di bawah minimum. "
                    f"Upgrade bandwidth {p.name} ke tier lebih tinggi untuk menambah revenue."
                ),
                "estimated_impact": "Upgrade 2x bandwidth meningkatkan revenue ~50-80% per produk",
                "action": f"Cek harga tier bandwidth lebih tinggi di katalog Astinet/Metro-E dan ajukan ke customer",
            })

    if not result["nim_ok"]:
        has_non_hsi_non_wms = any(
            not p.is_hsi and "WMS" not in p.name and p.monthly_price > 0
            for p in inp.products
        )
        if has_non_hsi_non_wms:
            recs.append({
                "type": "adjust_margin",
                "priority": "medium",
                "title": "Repricing Produk Non-HSI",
                "detail": (
                    f"NIM {result['nim']*100:.1f}% di bawah minimum 2%. "
                    f"Naikkan ARPU untuk produk Astinet/Metro-E atau tekan O&M."
                ),
                "estimated_impact": "Kenaikan ARPU non-HSI 8-15% berpotensi menaikkan NIM ke atas 2%",
                "action": "Tetapkan baseline→target harga per produk non-HSI dan negosiasikan repricing dengan customer",
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
        "notes": "Harga HSI dan WMS tidak disarankan dinaikkan langsung; peningkatan revenue dilakukan lewat upgrade tier bandwidth di katalog.",
        "source": "rule_based",
    }
