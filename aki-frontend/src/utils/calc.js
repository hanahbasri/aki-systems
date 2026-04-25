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

export function calcPreview(products, kontrakBulan) {
  const WACC = 0.1135;
  let rev = 0, cogs = 0;
  products.forEach(({ product, qty }) => {
    if (!product) return;
    rev += product.bulanan * qty * kontrakBulan + product.otc * qty;
    cogs += product.isHSI ? 0 : product.bulanan * qty * kontrakBulan * 0.70 + product.otc * qty * 0.75;
  });
  const gp = rev - cogs;
  const gpm = rev > 0 ? gp / rev : 0;
  const opex = rev * 0.12 * (kontrakBulan / 12);
  const ebit = gp - opex;
  const ni = ebit * (1 - 0.22);
  const nim = rev > 0 ? ni / rev : 0;
  const npv = ni / (1 + WACC) - 0;
  return { rev, cogs, gp, gpm, opex, ebit, ni, nim, npv, layak: gpm >= 0.07 && nim >= 0.02 && npv > 0 };
}
