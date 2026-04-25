import { AppBackground, LogoStrip } from "../components/Layout.jsx";
import { fmt, fmtPct } from "../utils/calc.js";

export default function HalamanRiwayat({ user, history, page, setPage, setShowExitModal, handleUseHistory, clearHistory, exitModalUI }) {
  return (
    <AppBackground>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/55 backdrop-blur-2xl relative">
        <div className="flex w-full items-center gap-4 px-4 py-4 md:px-6">
          <div className="min-w-0 flex-1">
            <div className="syne truncate text-xl font-800 leading-none tracking-tight text-white md:text-2xl">AKI System</div>
            <div className="mt-1 truncate text-xs text-red-200/60">Solution & Offering · {user?.profile?.full_name || user?.email}</div>
          </div>

          <button
            onClick={() => setPage("home")}
            className={`hidden rounded-full border px-4 py-2 text-sm font-semibold transition md:inline-flex ${page === "home" ? "border-red-600 bg-red-600 text-white shadow-lg" : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10 hover:text-white"}`}
          >
            Beranda
          </button>

          <button
            onClick={() => setPage("history")}
            className={`hidden rounded-full border px-4 py-2 text-sm font-semibold transition md:inline-flex ${page === "history" ? "border-red-600 bg-red-600 text-white shadow-lg" : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10 hover:text-white"}`}
          >
            Riwayat ({history.length})
          </button>

          <button
            onClick={() => setShowExitModal(true)}
            className="hidden rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 hover:text-red-300 md:inline-flex"
          >
            Keluar
          </button>

          <div className="ml-auto hidden shrink-0 md:block">
            <LogoStrip />
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 md:px-6">
        {history.length === 0 ? (
          <div className="glass rounded-[2rem] p-10 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 text-2xl font-bold">AKI</div>
            <h2 className="syne text-2xl font-800">Belum ada riwayat</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-white/45">Hitung satu proyek dulu, nanti hasilnya otomatis muncul di sini.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={clearHistory} className="rounded-xl border border-red-300/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/20">
                Hapus Riwayat
              </button>
            </div>
            {history.map(item => (
              <article key={item.id} className="glass rounded-3xl p-5 md:p-6">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.result?.layak ? "bg-emerald-500/15 text-emerald-200" : "bg-red-500/15 text-red-200"}`}>
                        {item.result?.layak ? "LAYAK" : "TIDAK LAYAK"}
                      </span>
                      <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-white/55">Solution & Offering</span>
                      <span className="text-xs text-white/35">{new Date(item.createdAt).toLocaleString("id-ID")}</span>
                    </div>
                    <h2 className="syne truncate text-2xl font-800">{item.form?.nama_program || "Tanpa nama program"}</h2>
                    <p className="mt-1 text-sm text-white/48">{item.form?.nama_customer || "Customer belum diisi"} - {item.form?.lokasi || "Lokasi belum diisi"}</p>
                  </div>
                  <button onClick={() => handleUseHistory(item)}
                    className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-red-950 transition hover:bg-red-100">
                    Buka Lagi
                  </button>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  {[
                    ["Revenue", `Rp ${fmt(item.result?.total_revenue)}`],
                    ["GPM", fmtPct(item.result?.gpm)],
                    ["NIM", fmtPct(item.result?.nim)],
                    ["Produk", `${item.products?.filter(p => p.product).length || 0} item`],
                  ].map(([label, value]) => (
                    <div key={label} className="glass-sm rounded-2xl p-4">
                      <div className="text-xs uppercase tracking-widest text-white/35">{label}</div>
                      <div className="mt-1 font-bold text-white">{value}</div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      {exitModalUI}
    </AppBackground>
  );
}
