export const HISTORY_KEY = "aki_history";
export const ROLE_KEY = "aki_role";

export const fmt = (n) => (n == null ? "-" : new Intl.NumberFormat("id-ID").format(Math.round(n)));
export const fmtPct = (n) => (n == null ? "-" : `${(n * 100).toFixed(1)}%`);

const safeJson = (value, fallback) => {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
};

export const readStorage = (key, fallback) => safeJson(localStorage.getItem(key), fallback);
export const writeStorage = (key, value) => localStorage.setItem(key, JSON.stringify(value));

const N_YEARS = 5;
const WACC = 0.1135;
const TAX_RATE = 0.22;
const MIN_IRR = WACC + 0.02;

const distributeMonths = (totalBulan, startMonth = 1) => {
  const months = [0, 0, 0, 0, 0];
  let remaining = Math.max(0, totalBulan || 0);
  for (let yr = 0; yr < N_YEARS; yr++) {
    if (remaining <= 0) break;
    const available = yr === 0 ? 12 - startMonth + 1 : 12;
    const active = Math.min(available, remaining);
    months[yr] = active;
    remaining -= active;
  }
  return months;
};

const calcMirr = (cashflows, financeRate, reinvestRate) => {
  const n = cashflows.length - 1;
  if (n <= 0) return null;

  let pvNeg = 0;
  let fvPos = 0;
  for (let i = 0; i <= n; i++) {
    const cf = cashflows[i];
    if (cf < 0) pvNeg += cf / (1 + financeRate) ** i;
    if (cf > 0) fvPos += cf * (1 + reinvestRate) ** (n - i);
  }

  if (pvNeg === 0 || fvPos <= 0) return null;
  return (fvPos / Math.abs(pvNeg)) ** (1 / n) - 1;
};

const calcPayback = (fcfByYear) => {
  let cumulative = 0;
  for (let i = 0; i < fcfByYear.length; i++) {
    const prev = cumulative;
    cumulative += fcfByYear[i];
    if (cumulative >= 0) {
      if (fcfByYear[i] === 0) return i + 1;
      const fraction = (0 - prev) / fcfByYear[i];
      return i + fraction;
    }
  }
  return null;
};

const formatPayback = (pp) => {
  if (pp == null) return "Belum balik modal (Payback > horizon)";
  const tahun = Math.trunc(pp);
  const bulan = Math.round((pp - tahun) * 12);
  return `${tahun} Tahun ${Math.abs(bulan)} Bulan`;
};

const normalizeEvp = (evp) => {
  if (evp == null || Number.isNaN(Number(evp))) return null;
  const value = Number(evp);
  if (value < 0) return null;
  return value > 1 ? value / 100 : value;
};

const getRecurringCostRatio = (product) => {
  if (!product || product.isHSI) return 0;
  const evp = normalizeEvp(product.evp);
  if (evp != null) return Math.max(0, 1 - evp);
  return 0.70;
};

export function calcPreview(products, kontrakBulan, capex = { material: "", jasa: "", lifetime_years: 5 }, omPct = 0.12, startMonth = 1) {
  const monthsPerYear = distributeMonths(kontrakBulan, startMonth);

  const revByYear = Array(N_YEARS).fill(0);
  const cogsByYear = Array(N_YEARS).fill(0);

  products.forEach(({ product, qty }) => {
    if (!product) return;
    for (let yr = 0; yr < N_YEARS; yr++) {
      const m = monthsPerYear[yr];
      const otcRev = yr === 0 ? (product.otc || 0) * qty : 0;
      const recurringRev = (product.bulanan || 0) * qty * m;
      const rev = otcRev + recurringRev;
      revByYear[yr] += rev;

      const otcCost = yr === 0 ? (product.otc || 0) * qty * 0.75 : 0;
      const recurringCost = (product.bulanan || 0) * qty * m * getRecurringCostRatio(product);
      cogsByYear[yr] += otcCost + recurringCost;
    }
  });

  const material = parseFloat(capex?.material) || 0;
  const jasa = parseFloat(capex?.jasa) || 0;
  const capexTotal = (material + jasa) * 1.004;
  const lifetimeYears = parseInt(capex?.lifetime_years) || 5;
  const monthlyDep = lifetimeYears > 0 ? capexTotal / (lifetimeYears * 12) : 0;
  const depByYear = monthsPerYear.map((m) => monthlyDep * m);

  const opexByYear = revByYear.map((rev) => rev * omPct);
  const gpByYear = revByYear.map((r, i) => r - cogsByYear[i]);
  const ebitdaByYear = gpByYear.map((gp, i) => gp - opexByYear[i]);
  const ebitByYear = ebitdaByYear.map((v, i) => v - depByYear[i]);
  const taxByYear = ebitByYear.map((e) => Math.max(0, e) * TAX_RATE);
  const niByYear = ebitByYear.map((e, i) => e - taxByYear[i]);

  const wcChangeByYear = Array(N_YEARS).fill(0);
  const fcfByYear = Array(N_YEARS).fill(0).map((_, yr) => {
    const capexOut = yr === 0 ? capexTotal : 0;
    return ebitByYear[yr] * (1 - TAX_RATE) + depByYear[yr] + wcChangeByYear[yr] - capexOut;
  });

  const discountFactors = Array(N_YEARS).fill(0).map((_, yr) => 1 / (1 + WACC) ** (yr + 1));
  const pvFcf = fcfByYear.map((fcf, i) => fcf * discountFactors[i]);
  const npv = pvFcf.reduce((a, b) => a + b, 0);

  const mirr = calcMirr(fcfByYear, WACC, WACC);
  const payback = calcPayback(fcfByYear);

  const rev = revByYear.reduce((a, b) => a + b, 0);
  const cogs = cogsByYear.reduce((a, b) => a + b, 0);
  const gp = rev - cogs;
  const opex = opexByYear.reduce((a, b) => a + b, 0);
  const ebit = ebitByYear.reduce((a, b) => a + b, 0);
  const ni = niByYear.reduce((a, b) => a + b, 0);

  const gpm = rev > 0 ? gp / rev : 0;
  const nim = rev > 0 ? ni / rev : 0;

  const npv_ok = npv > 0;
  const irr_ok = mirr != null && mirr > MIN_IRR;
  const pp_ok = payback != null && payback <= (kontrakBulan / 12);
  const gpm_ok = gpm >= 0.07;
  const nim_ok = nim >= 0.02;
  const layak = npv_ok && irr_ok && pp_ok && gpm_ok && nim_ok;

  return {
    rev, cogs, gp, gpm, opex, ebit, ni, nim, npv, mirr, payback,
    payback_str: formatPayback(payback),
    npv_ok, irr_ok, pp_ok, gpm_ok, nim_ok, layak,
    rev_by_year: revByYear,
    dir_by_year: cogsByYear,
    opx_by_year: opexByYear,
    ni_by_year: niByYear,
    dep_by_year: depByYear,
    fcf_by_year: fcfByYear,
    capex_total: capexTotal,
    total_ebitda: ebitdaByYear.reduce((a, b) => a + b, 0),
    total_dep: depByYear.reduce((a, b) => a + b, 0),
    total_tax: taxByYear.reduce((a, b) => a + b, 0),
    total_gross_profit: gp,
    total_revenue: rev,
    total_cogs: cogs,
    total_opex: opex,
    total_ebit: ebit,
    total_ni: ni,
  };
}
