"""
AKI (Analisis Kelayakan Investasi) Calculation Engine
Telkom Indonesia - Tim Solution & Offering

Replicates exact logic from Excel template:
  Sheet 2. Rev   -> revenue projection
  Sheet 3. Cpx   -> CAPEX & depreciation
  Sheet 4. Dir   -> direct cost / COGS
  Sheet 5. Opx   -> OPEX / O&M
  Sheet 6. Resume-> summary
  Sheet COM      -> full income statement, FCF, NPV, IRR, MIRR, PP
  Sheet 7. NJKI  -> feasibility verdict
"""

import math
from dataclasses import dataclass, field
from typing import List, Optional

# ── Constants ──────────────────────────────────────────────────────────────────
WACC = 0.1135          # Confirmed from template
TAX_RATE = 0.22        # Per template (22%)
BOP_LAKWAS_PCT = 0.004 # 0.4% of CAPEX
OM_DEFAULT_PCT = 0.12  # 12% of revenue per month (annual: varies by active months)
COGS_PCT_NON_HSI = 0.70  # 70% COGS for non-HSI products
MIN_NPV = 0            # NPV > 0
MIN_IRR = WACC + 0.02  # 13.35%
MIN_NIM = 0.02         # 2%
MIN_GPM = 0.07         # 7%
N_YEARS = 5            # Projection horizon

AR_DAYS = 60           # Account Receivable days
AP_DAYS = 60           # Account Payable days

PARENT_EVP = [
    ("PSB Astinet", 0.25),
    ("Astinet Fit IP/29", 0.20),
    ("Astinet Fit IP/31", 0.30),
    ("Add On IPv4 Astinet", 0.50),
    ("IP Transit", 0.20),
    ("VPN IP", 0.30),
    ("Metro E", 0.30),
    ("WMS", 0.30),
    ("Astinet", 0.30),
]


@dataclass
class ProductLine:
    name: str
    qty: int
    monthly_price: float   # Harga bulanan (revenue per unit per bulan)
    otc_price: float       # One-time charge (OTC instalasi)
    is_hsi: bool           # True = HSI, no COGS
    evp: Optional[float] = None  # EVP margin; recurring COGS = 1 - EVP
    satuan: str = "Titik"
    tipe: str = "Butuh JT" # "Butuh JT" | "Tanpa JT"


@dataclass
class CapexInput:
    material: float        # Material dari TIF
    jasa: float            # Jasa dari TIF
    lifetime_years: int = 5
    waktu_penyelesaian_bulan: int = 1  # Berapa bulan dari start hingga revenue mulai

    @property
    def total(self) -> float:
        return self.material + self.jasa

    @property
    def bop_lakwas(self) -> float:
        return self.total * BOP_LAKWAS_PCT

    @property
    def total_investasi(self) -> float:
        return self.total + self.bop_lakwas


@dataclass
class AKIInput:
    # Cover info
    nama_program: str
    nama_customer: str
    lokasi: str
    cust_group: str
    teknologi: str
    rencana_selesai: int          # Tahun
    jumlah_lop: int
    id_lop: str

    # Kontrak
    kontrak_tahun: int
    kontrak_bulan: int            # Extra bulan di atas tahun

    # Products
    products: List[ProductLine]


    capex: Optional[CapexInput] = None

    # OPEX parameter
    om_pct: float = OM_DEFAULT_PCT  # fraction of monthly revenue

    # Waktu mulai billing (bulan ke-1 dalam tahun pertama)
    start_month: int = 1          # 1-12; bulan berapa dalam tahun pertama revenue mulai

    @property
    def kontrak_total_bulan(self) -> int:
        return self.kontrak_tahun * 12 + self.kontrak_bulan


# ── Revenue distribution helper ────────────────────────────────────────────────
def distribute_months(total_bulan: int, start_month: int = 1) -> List[int]:
    """
    Distribute active months across 5 fiscal years.
    start_month: 1-12 (bulan ke berapa dalam tahun fiskal pertama mulai billing)
    Returns list of 5 integers: active months per year.
    """
    months = [0] * N_YEARS
    remaining = total_bulan
    for yr in range(N_YEARS):
        if remaining <= 0:
            break
        if yr == 0:
            available = 12 - start_month + 1
        else:
            available = 12
        active = min(available, remaining)
        months[yr] = active
        remaining -= active
    return months


def _normalize_evp(evp: Optional[float]) -> Optional[float]:
    if evp is None:
        return None
    try:
        value = float(evp)
    except (TypeError, ValueError):
        return None
    if value < 0:
        return None
    return value / 100 if value > 1 else value


def _resolve_parent_evp(name: str = "", group: str = "") -> Optional[float]:
    haystack_name = name or ""
    haystack_group = group or ""
    for prefix, evp in PARENT_EVP:
        if prefix in haystack_name or prefix in haystack_group:
            return evp
    return None


def _recurring_cogs_ratio(prod: ProductLine) -> float:
    if prod.is_hsi:
        return 0.0
    evp = _normalize_evp(prod.evp)
    if evp is None:
        evp = _resolve_parent_evp(prod.name)
    if evp is not None:
        return max(0.0, 1.0 - evp)
    return COGS_PCT_NON_HSI


# ── Core calculation ────────────────────────────────────────────────────────────
def calculate_aki(inp: AKIInput) -> dict:
    """Full AKI calculation. Returns a dict mirroring all Excel sheets."""

    months_per_year = distribute_months(inp.kontrak_total_bulan, inp.start_month)

    # ── 1. Revenue projection (Sheet 2. Rev) ──────────────────────────────────
    rev_lines = []  # per product line detail
    rev_by_year = [0.0] * N_YEARS   # total revenue per year

    for prod in inp.products:
        line_rev = []
        for yr in range(N_YEARS):
            m = months_per_year[yr]
            # OTC only in year 0 (first active year), month = 1 unit
            otc_this_year = prod.otc_price * prod.qty if yr == 0 else 0.0
            recurring_this_year = prod.monthly_price * prod.qty * m
            total_this_year = otc_this_year + recurring_this_year
            line_rev.append(total_this_year)
            rev_by_year[yr] += total_this_year
        rev_lines.append({"product": prod.name, "qty": prod.qty, "monthly": prod.monthly_price,
                           "otc": prod.otc_price, "is_hsi": prod.is_hsi, "by_year": line_rev})

    total_revenue = sum(rev_by_year)

    # ── 2. CAPEX & Depreciation (Sheet 3. Cpx) ────────────────────────────────
    if inp.capex:
        capex_total = inp.capex.total_investasi
        lifetime = inp.capex.lifetime_years
        # Monthly depreciation = capex_total / (lifetime * 12)
        monthly_dep = capex_total / (lifetime * 12)
        dep_by_year = []
        for yr in range(N_YEARS):
            dep_by_year.append(monthly_dep * months_per_year[yr])
        total_dep = sum(dep_by_year)
    else:
        capex_total = 0.0
        dep_by_year = [0.0] * N_YEARS
        total_dep = 0.0

    # ── 3. Direct Cost / COGS (Sheet 4. Dir) ──────────────────────────────────
    # OTC instalasi COGS = 75% of OTC revenue (from template: 1875000/2500000)
    # Recurring COGS:
    #   HSI     -> 0
    #   Non-HSI -> based on EVP (fallback 70% if EVP unavailable)
    dir_by_year = [0.0] * N_YEARS
    dir_lines = []

    for prod in inp.products:
        line_dir = []
        for yr in range(N_YEARS):
            m = months_per_year[yr]
            otc_cost = (prod.otc_price * 0.75 * prod.qty) if yr == 0 else 0.0
            recurring_cost = prod.monthly_price * prod.qty * m * _recurring_cogs_ratio(prod)
            total_cost = otc_cost + recurring_cost
            line_dir.append(total_cost)
            dir_by_year[yr] += total_cost
        dir_lines.append({"product": prod.name, "by_year": line_dir})

    total_cogs = sum(dir_by_year)

    # ── 4. OPEX / O&M (Sheet 5. Opx) ──────────────────────────────────────────
    # O&M = om_pct * monthly_revenue * active_months
    opx_by_year = [0.0] * N_YEARS
    for yr in range(N_YEARS):
        m = months_per_year[yr]
        monthly_rev_this_year = rev_by_year[yr] / m if m > 0 else 0
        opx_by_year[yr] = inp.om_pct * monthly_rev_this_year * m
    total_opex = sum(opx_by_year)

    # ── 5. Income Statement (Sheet COM & Resume) ───────────────────────────────
    gross_profit_by_year = [rev_by_year[yr] - dir_by_year[yr] for yr in range(N_YEARS)]
    total_gross_profit = sum(gross_profit_by_year)
    gpm = total_gross_profit / total_revenue if total_revenue > 0 else 0

    ebitda_by_year = [gross_profit_by_year[yr] - opx_by_year[yr] for yr in range(N_YEARS)]
    total_ebitda = sum(ebitda_by_year)

    ebit_by_year = [ebitda_by_year[yr] - dep_by_year[yr] for yr in range(N_YEARS)]
    total_ebit = sum(ebit_by_year)

    tax_by_year = [max(0, ebit_by_year[yr]) * TAX_RATE for yr in range(N_YEARS)]
    total_tax = sum(tax_by_year)

    ni_by_year = [ebit_by_year[yr] - tax_by_year[yr] for yr in range(N_YEARS)]
    total_ni = sum(ni_by_year)
    nim = total_ni / total_revenue if total_revenue > 0 else 0

    # ── 6. Working Capital (Sheet COM) ────────────────────────────────────────
    # AR = (Revenue / 365) * AR_DAYS  per year
    # AP = (COGS   / 365) * AP_DAYS  per year
    ar_by_year = [(rev_by_year[yr] / 365) * AR_DAYS for yr in range(N_YEARS)]
    ap_by_year = [(dir_by_year[yr] / 365) * AP_DAYS for yr in range(N_YEARS)]
    wc_by_year = [ar_by_year[yr] - ap_by_year[yr] for yr in range(N_YEARS)]

    # WC change (incremental)
    wc_change_by_year = [0.0] * N_YEARS
    for yr in range(N_YEARS):
        prev_wc = wc_by_year[yr - 1] if yr > 0 else 0
        wc_change_by_year[yr] = -(wc_by_year[yr] - prev_wc)  # negative = cash outflow

    # ── 7. Free Cash Flow ─────────────────────────────────────────────────────
    # FCF = EBIT(after tax) + Depreciation + WC_change - CAPEX
    # CAPEX outflow only in year 0 (based on template)
    capex_outflow = [-capex_total if yr == 0 else 0.0 for yr in range(N_YEARS)]

    fcf_by_year = [
        (ebit_by_year[yr] * (1 - TAX_RATE))
        + dep_by_year[yr]
        + wc_change_by_year[yr]
        + capex_outflow[yr]
        for yr in range(N_YEARS)
    ]

    acc_fcf = []
    running = 0.0
    for yr in range(N_YEARS):
        running += fcf_by_year[yr]
        acc_fcf.append(running)

    print("=== DEBUG AKI ===")
    print("Revenue:", rev_by_year)
    print("COGS:", dir_by_year)
    print("OPEX:", opx_by_year)
    print("EBIT:", ebit_by_year)
    print("NI:", ni_by_year)
    print("DEP:", dep_by_year)
    print("WC:", wc_change_by_year)
    print("FCF:", fcf_by_year)
    print("ACC FCF:", acc_fcf)
    print("=================")

    # ── 8. NPV ─────────────────────────────────────────────────────────────────
    # Discount factors: 1/(1+WACC)^yr for yr=1..5
    discount_factors = [1 / (1 + WACC) ** (yr + 1) for yr in range(N_YEARS)]
    pv_fcf = [fcf_by_year[yr] * discount_factors[yr] for yr in range(N_YEARS)]
    npv = sum(pv_fcf)

    # ── 9. IRR / MIRR ──────────────────────────────────────────────────────────
    # Build cash flow array: [-capex_total, FCF_yr1, FCF_yr2, ...]
    # Note: template uses MIRR not pure IRR for verdict
    cf_for_irr = [-capex_total] + [
        (ebit_by_year[yr] * (1 - TAX_RATE))
        + dep_by_year[yr]
        + wc_change_by_year[yr]
        for yr in range(N_YEARS)
    ]

    irr = _calc_irr(cf_for_irr)

    # MIRR berbasis FCF aktual, finance & reinvest rate = WACC
    mirr = _calc_mirr(fcf_by_year, finance_rate=WACC, reinvest_rate=WACC)
    if mirr is None:
        mirr = irr

    # ── 10. Payback Period ─────────────────────────────────────────────────────
    # Based on accumulated FCF crossing zero
    payback = _calc_payback(fcf_by_year)

    # ── 11. Finance Charge & EVA (Sheet COM) ──────────────────────────────────
    finance_charge_by_year = [
        (capex_total if yr == 0 else 0.0) * WACC for yr in range(N_YEARS)
    ]
    eva_by_year = [ni_by_year[yr] - finance_charge_by_year[yr] for yr in range(N_YEARS)]

    # ── 12. Feasibility Verdict (Sheet 7. NJKI) ───────────────────────────────
    npv_ok = npv > MIN_NPV
    irr_val = mirr if mirr is not None else irr
    irr_ok = irr_val is not None and irr_val > MIN_IRR
    pp_ok = payback is not None and payback <= (inp.kontrak_total_bulan / 12)
    nim_ok = nim >= MIN_NIM
    gpm_ok = gpm >= MIN_GPM

    layak = npv_ok and irr_ok and pp_ok and nim_ok and gpm_ok

    # Format payback as "X Tahun Y Bulan"
    pp_str = _format_pp(payback)

    return {
        # Meta
        "input": inp,
        "months_per_year": months_per_year,
        "kontrak_total_bulan": inp.kontrak_total_bulan,

        # Revenue
        "rev_lines": rev_lines,
        "rev_by_year": rev_by_year,
        "total_revenue": total_revenue,

        # CAPEX
        "capex_total": capex_total,
        "dep_by_year": dep_by_year,
        "total_dep": total_dep,

        # Direct Cost
        "dir_lines": dir_lines,
        "dir_by_year": dir_by_year,
        "total_cogs": total_cogs,

        # OPEX
        "opx_by_year": opx_by_year,
        "total_opex": total_opex,

        # Income Statement
        "gross_profit_by_year": gross_profit_by_year,
        "total_gross_profit": total_gross_profit,
        "gpm": gpm,

        "ebitda_by_year": ebitda_by_year,
        "total_ebitda": total_ebitda,

        "ebit_by_year": ebit_by_year,
        "total_ebit": total_ebit,

        "tax_by_year": tax_by_year,
        "total_tax": total_tax,

        "ni_by_year": ni_by_year,
        "total_ni": total_ni,
        "nim": nim,

        # Working Capital
        "wc_by_year": wc_by_year,
        "wc_change_by_year": wc_change_by_year,

        # FCF
        "fcf_by_year": fcf_by_year,
        "acc_fcf": acc_fcf,
        "pv_fcf": pv_fcf,
        "discount_factors": discount_factors,

        # Metrics
        "npv": npv,
        "irr": irr,
        "mirr": mirr,
        "payback": payback,
        "payback_str": pp_str,

        # EVA
        "finance_charge_by_year": finance_charge_by_year,
        "eva_by_year": eva_by_year,

        # Verdict
        "npv_ok": npv_ok,
        "irr_ok": irr_ok,
        "pp_ok": pp_ok,
        "nim_ok": nim_ok,
        "gpm_ok": gpm_ok,
        "layak": layak,

        # Thresholds for display
        "wacc": WACC,
        "min_irr": MIN_IRR,
        "min_nim": MIN_NIM,
        "min_gpm": MIN_GPM,
        "tax_rate": TAX_RATE,
    }


# ── Financial math helpers ──────────────────────────────────────────────────────

def _calc_irr(cashflows: List[float], guess: float = 0.1) -> Optional[float]:
    """Newton-Raphson IRR. Returns None if no solution."""
    if not any(cf < 0 for cf in cashflows) or not any(cf > 0 for cf in cashflows):
        return None
    rate = guess
    for _ in range(1000):
        npv_val = sum(cf / (1 + rate) ** i for i, cf in enumerate(cashflows))
        d_npv = sum(-i * cf / (1 + rate) ** (i + 1) for i, cf in enumerate(cashflows))
        if abs(d_npv) < 1e-12:
            break
        new_rate = rate - npv_val / d_npv
        if abs(new_rate - rate) < 1e-8:
            return new_rate
        rate = new_rate
        if rate <= -1:
            return None
    return rate if abs(_npv(cashflows, rate)) < 1.0 else None


def _calc_mirr(cashflows: List[float], finance_rate: float, reinvest_rate: float) -> Optional[float]:
    """MIRR calculation matching Excel MIRR function."""
    n = len(cashflows) - 1  # number of periods
    neg_flows = [min(cf, 0) for cf in cashflows]
    pos_flows = [max(cf, 0) for cf in cashflows]

    pv_neg = sum(neg_flows[i] / (1 + finance_rate) ** i for i in range(n + 1))
    fv_pos = sum(pos_flows[i] * (1 + reinvest_rate) ** (n - i) for i in range(n + 1))

    if pv_neg == 0 or fv_pos <= 0:
        return None

    return (fv_pos / abs(pv_neg)) ** (1 / n) - 1


def _npv(cashflows: List[float], rate: float) -> float:
    return sum(cf / (1 + rate) ** i for i, cf in enumerate(cashflows))


def _calc_payback(fcf_by_year: List[float]) -> Optional[float]:
    cumulative = 0.0
    for i, fcf in enumerate(fcf_by_year):
        prev = cumulative
        cumulative += fcf

        if cumulative >= 0:
            if fcf == 0:
                return i + 1
            fraction = (0 - prev) / fcf
            return i + fraction

    return None


def _format_pp(pp: Optional[float]) -> str:
    if pp is None:
        return "Belum balik modal (Payback > horizon)"
    if pp < 0:
        tahun = int(pp)
        bulan = round((pp - tahun) * 12)
        return f"{tahun} Tahun {abs(bulan)} Bulan"
    tahun = int(pp)
    bulan = round((pp - tahun) * 12)
    return f"{tahun} Tahun {bulan} Bulan"


# ── AI Recommendation input builder ────────────────────────────────────────────

def build_reco_context(result: dict) -> str:
    """Build context string for AI recommendation when not layak."""
    inp: AKIInput = result["input"]
    months = max(inp.kontrak_total_bulan, 1)

    issues = []
    if not result["npv_ok"]:
        issues.append(f"NPV negatif (Rp{result['npv']:,.0f}) — butuh NPV > 0")
    if not result["irr_ok"]:
        mirr_str = f"{result['mirr']*100:.2f}%" if result["mirr"] is not None else "N/A"
        issues.append(f"MIRR {mirr_str} di bawah minimum {result['min_irr']*100:.2f}%")
    if not result["pp_ok"]:
        issues.append(f"Payback Period {result['payback_str']} melebihi masa kontrak {months} bulan")
    if not result["gpm_ok"]:
        issues.append(f"GPM {result['gpm']*100:.1f}% di bawah minimum 7%")
    if not result["nim_ok"]:
        issues.append(f"NIM {result['nim']*100:.1f}% di bawah minimum 2%")

    # Per-product breakdown
    monthly_rev_total = result["total_revenue"] / months
    products_lines = []
    for p in inp.products:
        contrib_monthly = p.qty * p.monthly_price
        contrib_pct = (contrib_monthly / monthly_rev_total * 100) if monthly_rev_total > 0 else 0
        products_lines.append(
            f"  - [{('HSI' if p.is_hsi else 'Non-HSI')}] {p.name}: "
            f"{p.qty} {p.satuan} × Rp{p.monthly_price:,.0f}/bln = Rp{contrib_monthly:,.0f}/bln ({contrib_pct:.1f}% revenue), "
            f"OTC Rp{p.otc_price:,.0f}"
        )
    products_summary = "\n".join(products_lines)

    # Gap analysis — berapa tambahan revenue bulanan yang dibutuhkan
    cogs_ratio = result["total_cogs"] / result["total_revenue"] if result["total_revenue"] > 0 else 0.7
    om_pct = float(getattr(inp, "om_pct", 0.12))
    ni_margin = max(0.05, 1 - cogs_ratio - om_pct - 0.22 * max(0, 1 - cogs_ratio - om_pct))

    npv_gap_monthly = 0
    if not result["npv_ok"] and result["npv"] < 0:
        npv_gap_monthly = int(math.ceil(abs(result["npv"]) / max(months * ni_margin, 1)))

    nim_gap_monthly = 0
    if not result["nim_ok"]:
        target_ni_monthly = 0.02 * monthly_rev_total
        current_ni_monthly = result["total_ni"] / months
        nim_gap_monthly = int(math.ceil(max(0, target_ni_monthly - current_ni_monthly) / max(ni_margin, 0.01)))

    min_contract_months = None
    if not result["pp_ok"] and result["payback"] is not None:
        min_contract_months = math.ceil(result["payback"] * 12) + 1

    gap_lines = []
    if npv_gap_monthly > 0:
        gap_lines.append(f"  • Butuh tambahan revenue ≈ Rp{npv_gap_monthly:,.0f}/bln agar NPV positif")
    if nim_gap_monthly > 0:
        gap_lines.append(f"  • Butuh tambahan revenue ≈ Rp{nim_gap_monthly:,.0f}/bln agar NIM ≥ 2%")
    if min_contract_months:
        gap_lines.append(f"  • Kontrak minimal {min_contract_months} bulan agar Payback Period tercapai (saat ini {months} bulan)")

    ctx = f"""
PROJECT: {inp.nama_program}
CUSTOMER: {inp.nama_customer} ({inp.cust_group})
LOKASI: {inp.lokasi}
MASA KONTRAK: {months} bulan ({inp.kontrak_tahun} tahun {inp.kontrak_bulan} bulan)
START BULAN: {inp.start_month}
O&M PCT: {om_pct*100:.0f}%

PRODUK (total {len(inp.products)} item, revenue bulanan saat ini Rp{monthly_rev_total:,.0f}/bln):
{products_summary}

FINANSIAL:
  CAPEX TOTAL       : Rp{result['capex_total']:,.0f}
  TOTAL REVENUE     : Rp{result['total_revenue']:,.0f} (≈ Rp{monthly_rev_total:,.0f}/bln rata-rata)
  TOTAL COGS        : Rp{result['total_cogs']:,.0f} (ratio {cogs_ratio*100:.1f}%)
  GROSS PROFIT      : Rp{result['total_gross_profit']:,.0f} | GPM: {result['gpm']*100:.1f}% (min 7%)
  NET INCOME        : Rp{result['total_ni']:,.0f} | NIM: {result['nim']*100:.1f}% (min 2%)
  NPV               : Rp{result['npv']:,.0f} (min > 0)
  MIRR              : {f"{result['mirr']*100:.2f}%" if result['mirr'] is not None else 'N/A'} (min {result['min_irr']*100:.2f}%)
  PAYBACK PERIOD    : {result['payback_str']}

MASALAH KELAYAKAN:
{chr(10).join(f"  • {i}" for i in issues) if issues else "  • Semua indikator LAYAK"}

ANALISIS GAP (apa yang dibutuhkan agar layak):
{chr(10).join(gap_lines) if gap_lines else "  • Tidak ada gap signifikan"}
"""
    return ctx.strip()


# ── Test / demo ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    test_input = AKIInput(
        nama_program="Penyediaan Layanan Jaringan PT QL Agrofood Tanjungsari",
        nama_customer="PT QL Agrofood",
        lokasi="CAU",
        cust_group="Large Enterprise",
        teknologi="FO",
        rencana_selesai=2026,
        jumlah_lop=1,
        id_lop="11270075-PT3-CAU-FC-CIBADAK",
        kontrak_tahun=1,
        kontrak_bulan=0,
        start_month=1,
        products=[
            ProductLine("Astinet Reguler 150 Mbps @ 1 SSL", qty=1, monthly_price=9106000, otc_price=2500000, is_hsi=False),
            ProductLine("Last Mile Astinet @ 1", qty=1, monthly_price=750000, otc_price=0, is_hsi=False),
            ProductLine("PSB Astinet @ 1 SSL", qty=1, monthly_price=0, otc_price=2500000, is_hsi=False),
            ProductLine("Astinet Reguler 300 Mbps @ 1 SSL", qty=1, monthly_price=16964667, otc_price=0, is_hsi=False),
            ProductLine("Last Mile Astinet @ 1 SSL", qty=1, monthly_price=750000, otc_price=0, is_hsi=False),
            ProductLine("Astinet Lite 10 Mbps @ 1 SSL", qty=1, monthly_price=535000, otc_price=0, is_hsi=False),
            ProductLine("Astinet Lite 100 Mbps @ 1 SSL", qty=1, monthly_price=6141000, otc_price=0, is_hsi=False),
            ProductLine("Astinet Lite 60 Mbps @ 1 SSL", qty=1, monthly_price=4869000, otc_price=0, is_hsi=False),
        ],
        capex=CapexInput(material=40637662, jasa=43469314, lifetime_years=5),
        om_pct=0.12,
    )

    result = calculate_aki(test_input)
    print("=" * 60)
    print(f"PROJECT: {test_input.nama_program}")
    print(f"TOTAL REVENUE   : Rp {result['total_revenue']:>18,.0f}")
    print(f"TOTAL COGS      : Rp {result['total_cogs']:>18,.0f}")
    print(f"GROSS PROFIT    : Rp {result['total_gross_profit']:>18,.0f}  GPM: {result['gpm']*100:.1f}%")
    print(f"OPEX            : Rp {result['total_opex']:>18,.0f}")
    print(f"EBITDA          : Rp {result['total_ebitda']:>18,.0f}")
    print(f"DEPRECIATION    : Rp {result['total_dep']:>18,.0f}")
    print(f"EBIT            : Rp {result['total_ebit']:>18,.0f}")
    print(f"TAX (22%)       : Rp {result['total_tax']:>18,.0f}")
    print(f"NET INCOME      : Rp {result['total_ni']:>18,.0f}  NIM: {result['nim']*100:.1f}%")
    print(f"CAPEX TOTAL     : Rp {result['capex_total']:>18,.0f}")
    print("-" * 60)
    print(f"NPV             : Rp {result['npv']:>18,.0f}  {'✓' if result['npv_ok'] else '✗'}")
    mirr_disp = f"{result['mirr']*100:.2f}%" if result['mirr'] is not None else "N/A"
    print(f"MIRR            :    {mirr_disp:>17}  {'✓' if result['irr_ok'] else '✗'} (min {result['min_irr']*100:.2f}%)")
    print(f"PAYBACK PERIOD  :    {result['payback_str']:>17}  {'✓' if result['pp_ok'] else '✗'}")
    print(f"GPM             :    {result['gpm']*100:>16.1f}%  {'✓' if result['gpm_ok'] else '✗'} (min 7%)")
    print(f"NIM             :    {result['nim']*100:>16.1f}%  {'✓' if result['nim_ok'] else '✗'} (min 2%)")
    print("=" * 60)
    print(f"VERDICT: {'✅ LAYAK' if result['layak'] else '❌ TIDAK LAYAK'}")

    if not result["layak"]:
        print("\nAI CONTEXT:")
        print(build_reco_context(result))
