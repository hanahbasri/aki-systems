import { AppBackground, LogoStrip } from "../components/Layout.jsx";

export default function HalamanBeranda({ user, history, page, setPage, setShowExitModal, setStep, setResult, setRecos, exitModalUI }) {
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
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-red-200/70">Beranda</p>
          <h1 className="syne mt-3 text-4xl font-500 leading-tight text-white md:text-5xl">Mulai Perhitungan AKI</h1>
          <p className="mt-2 text-sm text-white/45">Gunakan menu untuk menghitung kelayakan investasi dari suatu proyek.</p>
        </div>

        <section className="grid gap-5 lg:grid-cols-1">
          <button
            onClick={() => { setPage("dashboard"); setStep(0); setResult(null); setRecos(null); }}
            className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-7 text-left shadow-[0_24px_90px_rgba(0,0,0,0.25)] transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07]"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
            <div className="relative">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/45">
                <span className="h-2 w-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500" />
                HITUNG KELAYAKAN INVESTASI PROYEK
              </div>

              <div className="flex items-start justify-between gap-4">
                <h2 className="syne text-3xl font-800 text-white md:text-4xl">Solution & Offering</h2>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/55">Analisis lengkap</span>
              </div>

              <p className="mt-4 max-w-xl text-sm leading-7 text-white/50">Kalkulasi lengkap dengan CAPEX, OPEX, NPV, MIRR, dan Excel.</p>

              <div className="mt-7 space-y-3">
                <div className="flex items-center gap-3 text-sm text-white/60"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-[10px] text-red-200">✓</span><span>Input CAPEX dari TIF</span></div>
                <div className="flex items-center gap-3 text-sm text-white/60"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-[10px] text-red-200">✓</span><span>Generate Excel</span></div>
                <div className="flex items-center gap-3 text-sm text-white/60"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-[10px] text-red-200">✓</span><span>AI rekomendasi</span></div>
              </div>

              <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-red-950 transition group-hover:bg-red-100">Mulai Hitung<span className="text-base">→</span></div>
            </div>
          </button>
        </section>
      </div>
      {exitModalUI}
    </AppBackground>
  );
}
