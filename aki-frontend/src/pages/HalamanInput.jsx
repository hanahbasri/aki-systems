import { useState } from "react";
import { AppBackground, BrandMark, LogoStrip } from "../components/Layout.jsx";
import { PRODUCTS } from "../data/products.js";
import { fmt, fmtPct } from "../utils/calc.js";

// ── Komponen kecil khusus halaman input ──────────────────────────────────────

function Label({ children }) {
  return <div className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">{children}</div>;
}

function ProductSearch({ row, index, onChange, onRemove }) {
  const [q, setQ] = useState(row.product?.value || "");
  const [open, setOpen] = useState(false);
  const filtered = q.length > 1 ? PRODUCTS.filter(p => p.value.toLowerCase().includes(q.toLowerCase())) : [];
  const groups = [...new Set(filtered.map(p => p.group))];

  return (
    <div className="glass-sm rounded-xl p-3 hover:border-red-500/20 transition-colors">
      <div className="grid grid-cols-1 gap-2 items-center md:grid-cols-12">
        <div className="relative md:col-span-5">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input className="gi w-full pl-9 pr-3 py-2.5 text-sm rounded-lg"
            placeholder="Cari produk..." value={q}
            onChange={e => { setQ(e.target.value); setOpen(true); onChange(index, "product", null); }}
            onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} />
          {open && q.length > 1 && (
            <div className="absolute z-50 top-full left-0 right-0 rounded-xl shadow-2xl max-h-60 overflow-y-auto mt-1"
              style={{ background: "#1a1030", border: "1px solid rgba(255,255,255,0.12)" }}>
              {filtered.length === 0 && <div className="px-4 py-3 text-sm text-white/30 italic">Tidak ditemukan</div>}
              {groups.map(g => (
                <div key={g}>
                  <div className="px-3 py-1.5 text-xs font-bold text-red-400/70 uppercase tracking-wider"
                    style={{ background: "rgba(0,0,0,0.3)" }}>{g}</div>
                  {filtered.filter(p => p.group === g).map(p => (
                    <button key={p.value} className="w-full text-left px-4 py-2.5 text-sm text-white/80 hover:bg-red-900/30 hover:text-white flex justify-between transition-colors"
                      onMouseDown={() => { onChange(index, "product", p); setQ(p.value); setOpen(false); }}>
                      <span>{p.value}</span>
                      <span className="text-xs text-white/30 ml-2 shrink-0">{p.satuan}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="md:col-span-2">
          <input type="number" min="1"
            className="gi w-full px-3 py-2.5 text-sm text-center rounded-lg"
            value={row.qty} onChange={e => onChange(index, "qty", parseInt(e.target.value) || 1)} />
        </div>
        <div className="md:col-span-2">
          <select className="gi w-full px-2 py-2.5 text-xs rounded-lg"
            value={row.tipe} onChange={e => onChange(index, "tipe", e.target.value)}>
            <option value="Butuh JT">Butuh JT</option>
            <option value="Tanpa JT">Tanpa JT</option>
          </select>
        </div>
        <div className="flex flex-col items-center justify-center gap-1 md:col-span-2">
          {row.product ? (
            <>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${row.product.isHSI ? "bg-orange-500/20 text-orange-300" : "bg-red-500/20 text-red-300"}`}>
                {row.product.isHSI ? "HSI" : "Non-HSI"}
              </span>
              {!row.product.isHSI && (
                <span className="text-xs text-white/40">
                  EVP {row.product.evp != null ? `${(row.product.evp * 100).toFixed(0)}%` : "-"}
                </span>
              )}
              <span className="text-xs text-white/40">Rp {fmt(row.product.bulanan)}/bln</span>
            </>
          ) : <span className="text-xs text-white/20 italic">—</span>}
        </div>
        <div className="flex justify-end md:col-span-1">
          <button onClick={() => onRemove(index)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 text-lg font-bold transition-all">×</button>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, ok, threshold }) {
  const border = ok === true ? "border-emerald-500/30" : ok === false ? "border-red-500/30" : "border-white/10";
  const bg = ok === true ? "bg-emerald-500/10" : ok === false ? "bg-red-500/10" : "bg-white/5";
  const valColor = ok === true ? "text-emerald-400" : ok === false ? "text-red-400" : "text-white";
  return (
    <div className={`rounded-xl p-4 border ${border} ${bg}`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs text-white/40 font-medium">{label}</span>
        <div className="flex items-center gap-6">
          {threshold && <span className={`text-xs font-semibold ${ok ? "text-emerald-400/70" : "text-red-400/70"}`}>{threshold}</span>}
          {ok === true && <span className="text-emerald-400 text-xs">✓</span>}
        </div>
      </div>
      <div className={`font-bold text-base ${valColor}`}>{value}</div>
    </div>
  );
}


function RecoCard({ reco }) {
  const icons = { upgrade_bandwidth: "📶", extend_contract: "📅", adjust_margin: "💰", add_product: "➕", reduce_capex: "🔧" };
  const border = { high: "border-red-500/30", medium: "border-orange-500/30", low: "border-white/10" };
  const badge = { high: "bg-red-500/20 text-red-300", medium: "bg-orange-500/20 text-orange-300", low: "bg-white/10 text-white/50" };
  const label = { high: "Prioritas Tinggi", medium: "Prioritas Sedang", low: "Prioritas Rendah" };
  return (
    <div className={`rounded-xl p-4 border ${border[reco.priority]} bg-white/4`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{icons[reco.type] || "💡"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-semibold text-white text-sm">{reco.title}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge[reco.priority]}`}>{label[reco.priority]}</span>
          </div>
          <p className="text-sm text-white/60 mb-2 leading-relaxed">{reco.detail}</p>
          {reco.estimated_impact && (
            <div className="text-xs text-white/40 bg-white/5 rounded-lg px-3 py-2 mb-2">
              📊 <strong className="text-white/60">Estimasi dampak:</strong> {reco.estimated_impact}
            </div>
          )}
          {reco.action_items?.length > 0 && (
            <ul className="text-xs text-white/40 space-y-1">
              {reco.action_items.map((a, i) => <li key={i} className="flex gap-2"><span className="text-red-400/60">→</span>{a}</li>)}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Halaman Input Utama ───────────────────────────────────────────────────────

export default function HalamanInput({
  user, page, setPage, setShowExitModal,
  form, setForm, products, setProducts, capex, setCapex,
  result, recos, recoLoading, pdfLoading, loading,
  hasProducts, steps, step, setStep, isLastStep, kontrakBulan,
  handleCalculate, handleGetRecos, handleExportPdf, updateProduct,
  exitModalUI, apiAvailable, calcWarning,
  cameFromHistory, setCameFromHistory,
  handleBackToFirstStep, handleFinishToHome,
}) {
  const handleBack = () => {
    if (step === 0) {
      setPage("home");
      return;
    }
    setStep(s => s - 1);
  };
  return (
    <AppBackground>
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/55 backdrop-blur-2xl">
        <div className="flex w-full items-center px-4 py-4 md:px-6">
          {page !== "dashboard" && (
            <div className="shrink-0 min-w-[120px]">
              <BrandMark compact />
              <div className="mt-1 truncate text-xs text-red-200/60">Solution & Offering · {user.profile?.full_name || user.email}</div>
            </div>
          )}

          {/* Step indicator */}
          <div className={`flex-1 flex justify-center px-4 overflow-x-auto scrollbar-none ${page === "dashboard" ? "max-w-full" : ""}`}>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 whitespace-nowrap">
              {steps.map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-all ${
                    i < step ? "bg-emerald-500/15 text-emerald-300"
                      : i === step ? "bg-red-600 text-white shadow-lg shadow-red-900/40"
                      : "text-white/35"
                  }`}>
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${i <= step ? "border-current" : "border-white/10"}`}>
                      {i < step ? "✓" : i + 1}
                    </span>
                    <span className="uppercase tracking-[0.18em]">{s}</span>
                  </div>
                  {i < steps.length - 1 && <span className="text-white/15">›</span>}
                </div>
              ))}
            </div>
          </div>

          {page !== "dashboard" && (
            <div className="shrink-0 flex items-center gap-3">
              <button onClick={() => setPage("home")} className={`hidden rounded-full border px-4 py-2 text-sm font-semibold transition md:inline-flex ${page === "home" ? "border-red-600 bg-red-600 text-white shadow-lg" : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10 hover:text-white"}`}>
                Beranda
              </button>
              {isLastStep && (
                <button onClick={() => setPage("history")} className={`hidden rounded-full border px-4 py-2 text-sm font-semibold transition md:inline-flex ${page === "history" ? "border-red-600 bg-red-600 text-white shadow-lg" : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10 hover:text-white"}`}>
                  Riwayat
                </button>
              )}
              <button onClick={() => setShowExitModal(true)} className="hidden rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 hover:text-red-300 md:inline-flex">
                Keluar
              </button>
              <div className="hidden md:block"><LogoStrip /></div>
            </div>
          )}
        </div>
      </header>

      <div className="relative z-10 max-w-5xl mx-auto px-5 py-8 space-y-5">

        {/* ── STEP 0: Info Program ─────────────────────────────────────── */}
        {step === 0 && (
          <div className="fade glass rounded-2xl p-6">
            <h2 className="syne text-xl font-700 text-white mb-1">Informasi Program</h2>
            <p className="text-white/35 text-sm mb-7">Isi data dasar proyek</p>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Nama Program / Proyek *</Label>
                <input className="gi w-full px-4 py-3 rounded-xl text-sm"
                  placeholder="cth. Penyediaan Layanan Internet PT XYZ" value={form.nama_program}
                  onChange={e => setForm({ ...form, nama_program: e.target.value })} />
              </div>
              <div>
                <Label>Nama Customer *</Label>
                <input className="gi w-full px-4 py-3 rounded-xl text-sm"
                  placeholder="PT / CV / Instansi" value={form.nama_customer}
                  onChange={e => setForm({ ...form, nama_customer: e.target.value })} />
              </div>
              <div>
                <Label>Customer Group</Label>
                <select className="gi w-full px-4 py-3 rounded-xl text-sm"
                  value={form.cust_group} onChange={e => setForm({ ...form, cust_group: e.target.value })}>
                  <option value="">Pilih...</option>
                  {["Business Services", "Government Services"].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <Label>Lokasi / Site *</Label>
                <select className="gi w-full px-4 py-3 rounded-xl text-sm"
                  value={form.lokasi} onChange={e => setForm({ ...form, lokasi: e.target.value })}>
                  <option value="">-- Pilih Lokasi --</option>
                  {["Kota Bogor", "Kab Bogor", "Depok", "Kota Sukabumi", "Kab Sukabumi", "Cianjur"].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <Label>Masa Kontrak *</Label>
                <div className="relative">
                  <input type="number" min="0" max="10"
                    className="gi w-full px-4 py-3 rounded-xl text-sm pr-14"
                    value={form.kontrak_tahun} onChange={e => setForm({ ...form, kontrak_tahun: parseInt(e.target.value) || 0 })} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30 pointer-events-none">Tahun</span>
                </div>
                {kontrakBulan > 0 && (
                  <p className="text-xs text-red-400/80 font-medium mt-1.5">Total: {kontrakBulan} bulan</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: Produk ────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="fade space-y-3">
            <div className="glass rounded-2xl p-6 overflow-visible" style={{ position: "relative", zIndex: 10 }}>
              <h2 className="syne text-xl font-700 text-white mb-1">Produk & Layanan</h2>
              <p className="text-white/35 text-sm mb-5">Tambah semua produk dalam proyek ini</p>
              <div className="hidden grid-cols-12 gap-2 mb-2 md:grid" style={{ paddingLeft: "13px", paddingRight: "13px" }}>
                <div className="col-span-5 text-xs font-semibold text-white/25 uppercase tracking-wider text-center">Produk</div>
                <div className="col-span-2 text-xs font-semibold text-white/25 uppercase tracking-wider text-center">Qty</div>
                <div className="col-span-2 text-xs font-semibold text-white/25 uppercase tracking-wider text-center">Tipe</div>
                <div className="col-span-2 text-xs font-semibold text-white/25 uppercase tracking-wider text-center">Info</div>
                <div className="col-span-1"></div>
              </div>
              <div className="space-y-2">
                {products.map((row, i) => (
                  <ProductSearch key={i} row={row} index={i} onChange={updateProduct}
                    onRemove={i => setProducts(products.filter((_, idx) => idx !== i))} />
                ))}
              </div>
              <button onClick={() => setProducts([...products, { product: null, qty: 1, tipe: "Butuh JT" }])}
                className="mt-3 w-full py-3 rounded-xl text-sm text-white/30 hover:text-white/60 hover:bg-white/5 transition-all flex items-center justify-center gap-2 font-medium"
                style={{ border: "2px dashed rgba(255,255,255,0.1)" }}>
                + Tambah Produk
              </button>
            </div>
            <div className="glass-sm rounded-xl px-4 py-3 text-xs text-amber-300/70"
              style={{ borderColor: "rgba(245,158,11,0.2)" }}>
              <strong className="text-amber-300">Catatan Biaya: </strong>
              HSI → recurring cost = 0 |
              Non-HSI → recurring cost = harga bulanan × (1 - EVP) |
              kalau EVP belum ada, fallback 70%
            </div>
          </div>
        )}

        {/* ── STEP 2: CAPEX ────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="fade glass rounded-2xl p-6">
            <h2 className="syne text-xl font-700 text-white mb-1">CAPEX & Parameter Biaya</h2>
            <p className="text-white/35 text-sm mb-7">Nilai investasi dari TIF dan parameter operasional</p>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <Label>Material (dari TIF)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/30 font-medium">Rp</span>
                  <input type="number" className="gi w-full pl-9 pr-4 py-3 rounded-xl text-sm"
                    placeholder="0" value={capex.material} onChange={e => setCapex({ ...capex, material: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Jasa (dari TIF)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/30 font-medium">Rp</span>
                  <input type="number" className="gi w-full pl-9 pr-4 py-3 rounded-xl text-sm"
                    placeholder="0" value={capex.jasa} onChange={e => setCapex({ ...capex, jasa: e.target.value })} />
                </div>
              </div>
              {(capex.material || capex.jasa) && (
                <div className="grid gap-3 glass-sm rounded-xl p-4 text-center md:col-span-2 md:grid-cols-3">
                  {[
                    ["Total CAPEX", (+capex.material || 0) + (+capex.jasa || 0)],
                    ["BOP Lakwas (0.4%)", ((+capex.material || 0) + (+capex.jasa || 0)) * 0.004],
                    ["Total Investasi", ((+capex.material || 0) + (+capex.jasa || 0)) * 1.004],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <div className="text-xs text-white/35 mb-1">{l}</div>
                      <div className="text-sm font-bold text-white">Rp {fmt(v)}</div>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <Label>O&M % / bulan</Label>
                <div className="gi w-full px-4 py-3 rounded-xl text-sm text-white/50 cursor-default select-none">
                  {(form.om_pct * 100).toFixed(0)}% dari Revenue
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Hasil AKI ─────────────────────────────────────────── */}
        {isLastStep && (
          <div className="fade space-y-4">
            {!result ? (
              <div className="glass rounded-2xl p-10 text-center">
                <div className="text-6xl mb-5">🧮</div>
                <h2 className="syne text-2xl font-700 text-white mb-2">Siap Menghitung AKI</h2>
                <p className="text-white/40 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
                  Kalkulasi lengkap: Revenue, COGS, OPEX, CAPEX, NPV, IRR, MIRR, Payback Period
                </p>
                <button onClick={handleCalculate} disabled={loading || !hasProducts}
                  className="px-10 py-3.5 bg-red-700 text-white rounded-xl font-semibold hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-900/40 flex items-center gap-2.5 mx-auto text-sm">
                  {loading
                    ? <><span className="spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Menghitung...</>
                    : <>🧮 Hitung AKI</>}
                </button>
              </div>
            ) : (
              <>
                {calcWarning && (
                  <div className="glass-sm rounded-xl px-4 py-3 text-xs text-amber-300/90"
                    style={{ borderColor: "rgba(245,158,11,0.25)" }}>
                    ⚠️ {calcWarning}
                  </div>
                )}
                {/* Summary Proyek */}
                <div className="glass rounded-2xl p-6">
                  <h3 className="syne font-700 text-white mb-4">Ringkasan Proyek</h3>
                  <div className="grid gap-4 md:grid-cols-3 mb-5">
                    <div>
                      <div className="text-xs text-white/30 uppercase tracking-wider font-semibold mb-1">Program / Proyek</div>
                      <div className="text-white/80 font-medium">{form.nama_program || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/30 uppercase tracking-wider font-semibold mb-1">Customer</div>
                      <div className="text-white/80 font-medium">{form.nama_customer || "—"}{form.lokasi ? ` · ${form.lokasi}` : ""}</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/30 uppercase tracking-wider font-semibold mb-1">Masa Kontrak</div>
                      <div className="text-white/80 font-medium">{form.kontrak_tahun} Tahun <span className="text-white/40 font-normal">({kontrakBulan} bulan)</span></div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-white/30 uppercase tracking-wider font-semibold mb-2">Produk</div>
                    <div className="rounded-xl border border-white/8 overflow-hidden text-sm">
                      {products.filter(p => p.product).map((p, i) => (
                        <div key={i} className="flex items-start justify-between px-3 py-2.5 border-b border-white/5 last:border-b-0">
                          <div className="flex-1 min-w-0 pr-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-white/80">{p.product.value}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${p.product.isHSI ? "bg-orange-500/15 text-orange-300/70" : "bg-white/5 text-white/35"}`}>
                                {p.product.isHSI ? "HSI" : "Non-HSI"}
                              </span>
                              {!p.product.isHSI && (
                                <span className="text-xs text-white/30">
                                  EVP {p.product.evp != null ? `${(p.product.evp * 100).toFixed(0)}%` : "-"}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-white/35">
                              <span>×{p.qty} {p.product.satuan}</span>
                              <span className={p.tipe === "Butuh JT" ? "text-red-300/60" : ""}>{p.tipe}</span>
                              {p.product.otc > 0 && (
                                <span>OTC: Rp {fmt(p.product.otc * p.qty)}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-mono text-white/75">
                              Rp {fmt(p.product.bulanan * p.qty)}<span className="text-white/30 text-xs">/bln</span>
                            </div>
                            {p.qty > 1 && (
                              <div className="text-white/30 text-xs mt-0.5">@ Rp {fmt(p.product.bulanan)}/unit</div>
                            )}
                          </div>
                        </div>
                      ))}
                      {/* Total baris */}
                      {(() => {
                        const totalBulanan = products.filter(p => p.product).reduce((s, p) => s + p.product.bulanan * p.qty, 0);
                        const totalOTC = products.filter(p => p.product).reduce((s, p) => s + p.product.otc * p.qty, 0);
                        return (
                          <div className="flex items-center justify-between px-3 py-2.5 bg-white/[0.03] border-t border-white/10">
                            <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Total Recurring</span>
                            <div className="text-right">
                              <span className="font-mono font-semibold text-white/80">Rp {fmt(totalBulanan)}<span className="text-white/30 text-xs font-normal">/bln</span></span>
                              {totalOTC > 0 && (
                                <div className="text-xs text-white/35 mt-0.5">+ OTC Rp {fmt(totalOTC)}</div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Verdict */}
                <div className={`rounded-2xl p-6 border-2 flex items-center justify-between ${result.layak ? "border-emerald-500/40 bg-emerald-500/10" : "border-red-500/40 bg-red-500/10"}`}>
                  <div>
                    <div className={`syne text-4xl font-800 ${result.layak ? "text-emerald-400" : "text-red-400"}`}>
                      {result.layak ? "✓ LAYAK" : "✗ TIDAK LAYAK"}
                    </div>
                    <div className={`text-sm mt-1.5 ${result.layak ? "text-emerald-400/70" : "text-red-400/70"}`}>
                      {result.layak
                        ? "Proyek memenuhi semua kriteria kelayakan investasi"
                        : "Proyek belum memenuhi satu atau lebih kriteria kelayakan"}
                    </div>
                  </div>
                  <div className="text-6xl opacity-60">{result.layak ? "📈" : "📉"}</div>
                </div>

                {/* P&L + Metrik */}
                <div className="glass rounded-2xl p-6 space-y-5">
                  <h3 className="syne font-700 text-white">Hasil Perhitungan</h3>

                  {/* Income Statement */}
                  <div className="rounded-xl border border-white/8 overflow-hidden text-sm">
                    {[
                      { label: "Revenue", value: result.total_revenue, indent: false, bold: false, separator: false },
                      { label: "COGS", value: -result.total_cogs, indent: true, bold: false, separator: false },
                      { label: "Gross Profit", value: result.total_gross_profit, indent: false, bold: true, badge: fmtPct(result.gpm), badgeOk: result.gpm_ok, badgeThreshold: "min 7%", separator: true },
                      { label: "OPEX / O&M (12%)", value: result.total_opex != null ? -result.total_opex : null, indent: true, bold: false, separator: false },
                      { label: "EBITDA", value: result.total_ebitda ?? null, indent: false, bold: false, separator: true },
                      { label: "Depresiasi", value: result.total_dep != null ? -result.total_dep : null, indent: true, bold: false, separator: false },
                      { label: "EBIT", value: result.total_ebit, indent: false, bold: false, separator: true },
                      { label: "Pajak (22%)", value: result.total_tax != null ? -result.total_tax : null, indent: true, bold: false, separator: false },
                      { label: "Net Income", value: result.total_ni, indent: false, bold: true, badge: fmtPct(result.nim), badgeOk: result.nim_ok, badgeThreshold: "min 2%", separator: true },
                    ].map((row, i) => {
                      if (row.value == null) return null;
                      const isNeg = row.value < 0;
                      const valColor = row.bold ? (isNeg ? "text-red-400" : "text-white") : (isNeg ? "text-red-400/80" : "text-white/75");
                      return (
                        <div key={i} className={`flex items-center justify-between px-4 py-2.5 ${row.separator ? "border-t border-white/8" : ""} ${row.bold ? "bg-white/[0.03]" : ""}`}>
                          <span className={`${row.indent ? "pl-4 text-white/40" : row.bold ? "font-semibold text-white/80" : "text-white/55"}`}>{row.label}</span>
                          <div className="flex items-center gap-3">
                            {row.badge && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${row.badgeOk ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
                                {row.badge} <span className="opacity-60">({row.badgeThreshold})</span>
                              </span>
                            )}
                            <span className={`font-mono font-medium ${valColor}`}>
                              {isNeg ? `(Rp ${fmt(-row.value)})` : `Rp ${fmt(row.value)}`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Investasi */}
                  {(capex.material || capex.jasa) && (() => {
                    const mat = +capex.material || 0;
                    const jasa = +capex.jasa || 0;
                    const bop = (mat + jasa) * 0.004;
                    const total = result.capex_total > 0 ? result.capex_total : (mat + jasa) * 1.004;
                    return (
                      <div className="rounded-xl border border-white/8 overflow-hidden text-sm">
                        <div className="px-4 py-2 bg-white/[0.03] border-b border-white/8">
                          <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Total Investasi</span>
                        </div>
                        {[["Material (TIF)", mat], ["Jasa (TIF)", jasa], ["BOP Lakwas (0.4%)", bop]].map(([l, v]) => (
                          <div key={l} className="flex justify-between px-4 py-2.5">
                            <span className="text-white/40 pl-4">{l}</span>
                            <span className="font-mono text-white/70">Rp {fmt(v)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between px-4 py-2.5 border-t border-white/8 bg-white/[0.03]">
                          <span className="font-semibold text-white/80">Total Investasi</span>
                          <span className="font-mono font-bold text-white">Rp {fmt(total)}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Key Metrics */}
                  <div className="grid gap-3 md:grid-cols-3">
                    <MetricCard label="NPV (WACC 11.35%)" value={result.npv != null ? `Rp ${fmt(result.npv)}` : "—"} ok={result.npv_ok} threshold="NPV > 0" />
                    <MetricCard
                      label="MIRR"
                      value={result.mirr != null ? fmtPct(result.mirr) : "Belum balik modal / cashflow tidak valid"}
                      ok={result.mirr != null ? result.irr_ok : false}
                      threshold="Min 13.35%"
                    />
                    <MetricCard label="Payback Period" value={result.payback_str} ok={result.pp_ok} threshold={`< ${form.kontrak_tahun} Tahun`} />
                  </div>
                </div>

                {/* Aksi */}
                <div className="flex gap-3 flex-wrap">
                  <button onClick={handleBackToFirstStep} disabled={loading}
                    className="px-4 py-2.5 glass rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2">
                    🔄 Hitung Ulang
                  </button>
                  <button onClick={handleExportPdf} disabled={pdfLoading || !apiAvailable}
                    className="px-5 py-2.5 bg-emerald-700/80 border border-emerald-600/40 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600/80 disabled:opacity-30 transition-all flex items-center gap-2">
                    {pdfLoading ? <span className="spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : "📄"}
                    Download PDF
                  </button>
                  {!result.layak && (
                    <button onClick={handleGetRecos} disabled={recoLoading || !apiAvailable}
                      className="px-5 py-2.5 bg-amber-600/80 border border-amber-500/40 text-white rounded-xl text-sm font-semibold hover:bg-amber-500/80 disabled:opacity-30 transition-all flex items-center gap-2">
                      {recoLoading ? <span className="spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : "🤖"}
                      AI Rekomendasi
                    </button>
                  )}
                </div>

                {/* Rekomendasi AI */}
                {recos && (
                  <div className="glass rounded-2xl p-6 fade">
                    <h3 className="syne font-700 text-white mb-3 flex items-center gap-2">🤖 Rekomendasi AI</h3>
                    {recos.summary && (
                      <p className="text-sm text-white/60 mb-4 glass-sm rounded-xl p-3 leading-relaxed">{recos.summary}</p>
                    )}

                    {(recos.minimum_contract_months || recos.minimum_revenue_monthly || recos.notes) && (
                      <div className="mb-4 space-y-2">
                        {recos.minimum_contract_months && (
                          <div className="glass-sm rounded-xl px-4 py-3 text-sm text-blue-300/80"
                            style={{ borderColor: "rgba(96,165,250,0.2)" }}>
                            📅 <strong className="text-blue-300">Kontrak minimal agar layak:</strong> {recos.minimum_contract_months} bulan
                          </div>
                        )}
                        {recos.minimum_revenue_monthly && (
                          <div className="glass-sm rounded-xl px-4 py-3 text-sm text-emerald-300/80"
                            style={{ borderColor: "rgba(16,185,129,0.22)" }}>
                            💵 <strong className="text-emerald-300">Estimasi revenue minimum per bulan:</strong> Rp {fmt(recos.minimum_revenue_monthly)}
                          </div>
                        )}
                        {recos.notes && (
                          <div className="glass-sm rounded-xl px-4 py-3 text-sm text-amber-300/85"
                            style={{ borderColor: "rgba(245,158,11,0.25)" }}>
                            ⚠️ <strong className="text-amber-300">Catatan:</strong> {recos.notes}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-3">
                      {recos.recommendations?.map((r, i) => <RecoCard key={i} reco={r} />)}
                    </div>
                  </div>
                )}


              </>
            )}
          </div>
        )}

        {/* ── Navigasi ─────────────────────────────────────────────────── */}
        <div className="flex justify-between pt-2 pb-8">
          <button onClick={handleBack}
            className="px-5 py-2.5 glass rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/10 transition-all">
            ← Kembali
          </button>
          {isLastStep ? (
            <button onClick={handleFinishToHome}
              className="px-7 py-2.5 bg-red-700 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-all shadow-lg shadow-red-900/30">
              Selesai
            </button>
          ) : (
            <button onClick={() => setStep(s => s + 1)}
              disabled={step === 0 && (!form.nama_program || !form.nama_customer || !form.lokasi || kontrakBulan === 0)}
              className="px-7 py-2.5 bg-red-700 text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-900/30">
              Lanjut →
            </button>
          )}
        </div>
      </div>
      {exitModalUI}
    </AppBackground>
  );
}
