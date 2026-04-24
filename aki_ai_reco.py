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

SYSTEM_PROMPT = """Anda adalah analis investasi senior di Telkom Indonesia, spesialis Tim Solution & Offering.

Tugas: berikan rekomendasi KONKRET dan ACTIONABLE agar proyek AKI yang tidak layak menjadi LAYAK.

Fokus rekomendasi HANYA pada:
1. Upgrade bandwidth/tier produk (misal 10 Mbps → 100 Mbps) untuk naikkan revenue
2. Perpanjang masa kontrak (minimal sampai Payback Period tercapai)
3. Penyesuaian margin / naikkan harga jual
4. Tambah produk add-on (Voice, Netmonk, OCA, IPTV) untuk upsell
5. Kurangi CAPEX jika ada komponen yang bisa dihilangkan

WAJIB response dalam JSON berikut SAJA (tanpa markdown, tanpa teks lain):
{
  "summary": "Ringkasan masalah dalam 1-2 kalimat",
  "recommendations": [
    {
      "type": "upgrade_bandwidth|extend_contract|adjust_margin|add_product|reduce_capex",
      "priority": "high|medium|low",
      "title": "Judul singkat",
      "detail": "Penjelasan konkret apa yang diubah",
      "estimated_impact": "Estimasi dampak kuantitatif",
      "action": "Langkah aksi spesifik untuk Tim Solution"
    }
  ],
  "minimum_contract_months": <angka atau null>,
  "minimum_revenue_monthly": <angka atau null>
}"""


def get_ai_recommendations(result: dict) -> dict:
    """Try Gemini → Groq → rule-based."""
    context = build_reco_context(result)

    # Try Gemini first
    reco = _try_gemini(context)
    if reco:
        return reco

    # Fallback to Groq
    reco = _try_groq(context)
    if reco:
        return reco

    # Final fallback: rule-based
    return _rule_based(result)


def _parse_json(text: str) -> dict | None:
    """Parse JSON from AI response, strip markdown fences if any."""
    try:
        clean = re.sub(r"```json\s*|\s*```", "", text).strip()
        return json.loads(clean)
    except Exception:
        return None


def _try_gemini(context: str) -> dict | None:
    """Call Google Gemini API."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        import google.generativeai as genai # type: ignore
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=SYSTEM_PROMPT,
        )
        response = model.generate_content(
            f"Analisis proyek berikut dan berikan rekomendasi agar LAYAK:\n\n{context}"
        )
        return _parse_json(response.text)
    except Exception as e:
        print(f"[Gemini] Error: {e}")
        return None


def _try_groq(context: str) -> dict | None:
    """Call Groq API."""
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
                {"role": "user", "content": f"Analisis proyek berikut dan berikan rekomendasi agar LAYAK:\n\n{context}"}
            ],
            temperature=0.3,
            max_tokens=800,
        )
        return _parse_json(response.choices[0].message.content)
    except Exception as e:
        print(f"[Groq] Error: {e}")
        return None


def _rule_based(result: dict) -> dict:
    """Fallback rule-based recommendations."""
    inp: AKIInput = result["input"]
    recs = []

    # PP issue → extend contract
    if not result["pp_ok"] and result["payback"] is not None:
        min_months = math.ceil(result["payback"] * 12) + 1
        recs.append({
            "type": "extend_contract",
            "priority": "high",
            "title": "Perpanjang Masa Kontrak",
            "detail": f"Payback Period {result['payback_str']} melebihi masa kontrak {result['kontrak_total_bulan']} bulan.",
            "estimated_impact": f"Kontrak minimal {min_months} bulan agar PP < masa kontrak",
            "action": f"Negosiasikan perpanjangan kontrak menjadi minimal {min_months} bulan"
        })
    elif not result["pp_ok"]:
        recs.append({
            "type": "extend_contract",
            "priority": "high",
            "title": "Perpanjang Masa Kontrak",
            "detail": "Payback Period tidak tercapai dalam horizon 5 tahun.",
            "estimated_impact": "Perpanjang kontrak dan/atau naikkan revenue",
            "action": "Review ulang nilai CAPEX dan masa kontrak dengan TIF"
        })

    if not result["gpm_ok"]:
        recs.append({
            "type": "upgrade_bandwidth",
            "priority": "high",
            "title": "Upgrade Bandwidth Produk",
            "detail": f"GPM {result['gpm']*100:.1f}% di bawah minimum 7%. Upgrade bandwidth untuk naikkan revenue.",
            "estimated_impact": "Upgrade 2x bandwidth umumnya meningkatkan revenue 40-60%",
            "action": "Tawarkan upgrade ke tier bandwidth yang lebih tinggi"
        })

    if not result["nim_ok"]:
        recs.append({
            "type": "adjust_margin",
            "priority": "medium",
            "title": "Sesuaikan O&M atau Naikkan Harga Jual",
            "detail": f"NIM {result['nim']*100:.1f}% di bawah minimum 2%.",
            "estimated_impact": "Turunkan O&M dari 12% ke 8% → NIM naik ~3-4%",
            "action": "Koordinasikan penyesuaian % O&M dengan Manager"
        })

    if not result["npv_ok"]:
        recs.append({
            "type": "add_product",
            "priority": "medium",
            "title": "Tambah Produk Add-on",
            "detail": "NPV negatif. Tambah layanan add-on (Voice, Netmonk, OCA) tanpa tambah CAPEX.",
            "estimated_impact": "Add-on menambah Rp 40.000–200.000/bulan per titik",
            "action": "Tawarkan bundling HSI+Voice atau HSI+OCA ke customer"
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

    return {
        "summary": f"Proyek tidak layak karena: {', '.join(issues)}.",
        "recommendations": recs,
        "minimum_contract_months": min_months,
        "minimum_revenue_monthly": None,
        "source": "rule_based"
    }