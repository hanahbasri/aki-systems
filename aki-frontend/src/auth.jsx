import { useState } from "react";
import { BrandMark } from "./components/Layout.jsx";
import { apiFetch, setToken, setUser } from "./authClient.js";
import { supabase } from "./supabaseClient.js";

export function LoginPage({ onLogin, initialError = "", onErrorClear }) {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const canGoogle = Boolean(supabase);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      if (data.ok) {
        setToken(data.access_token);
        setUser(data.user);
        onLogin(data.user);
      } else {
        setError(data.error || "Login gagal");
      }
    } catch {
      setError("Tidak dapat terhubung ke server");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const data = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (data.ok) {
        setSuccess("Registrasi berhasil! Silakan login dengan akun yang baru dibuat.");
        setTab("login");
      } else {
        setError(data.error || "Registrasi gagal");
      }
    } catch {
      setError("Tidak dapat terhubung ke server");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!supabase) return;
    setOauthLoading(true);
    setError("");
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (oauthError) setError(oauthError.message || "Gagal login dengan Google");
    } finally {
      setOauthLoading(false);
    }
  };

  const f = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) });

  return (
    <div className="app-shell relative min-h-screen p-6 text-white flex items-center justify-center">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        .font-display { font-family: 'Poppins', sans-serif; }
        .font-body { font-family: 'DM Sans', sans-serif; }
        .logo-pill {
          background: rgba(255,255,255,0.92);
          border-radius: 10px;
          padding: 8px 16px;
          display: inline-flex;
          align-items: center;
        }
      `}</style>

      <div className="absolute right-8 top-6 z-10 flex items-center gap-4">
        <div className="logo-pill">
          <img src="/telkomindonesia.png" alt="Telkom Indonesia" className="h-10 object-contain" />
        </div>
        <div className="h-8 w-px bg-white/30" />
        <div className="logo-pill">
          <img src="/danantara.png" alt="Danantara" className="h-10 object-contain" />
        </div>
      </div>

      <div
        className="mx-auto grid w-full max-w-7xl items-center gap-16 py-16 px-4 lg:gap-32 lg:grid-cols-2"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* Kiri: Branding */}
        <section className="hidden lg:block w-full">
          <div className="mb-7">
            <BrandMark />
            <p className="mt-1 text-xs uppercase tracking-[.28em] text-red-200/65" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
              Analisis Kelayakan Investasi · Telkom
            </p>
          </div>

          <h2 className="text-5xl lg:text-6xl leading-[1.1] tracking-tight text-white mt-10" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}>
            Dari peluang,<br />
            <span style={{ fontStyle: "italic", fontWeight: 400, color: "rgba(255,255,255,0.9)" }}>menjadi jaringan</span>
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/60" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>
            Hitung kelayakan investasi (AKI) untuk layanan connectivity Telkom dengan lebih mudah, valid, dan terpusat.
          </p>
        </section>

        {/* Kanan: Auth card */}
        <section className="mx-auto w-full max-w-md lg:max-w-[420px] lg:translate-y-16">
          <div className="mb-7 text-center lg:hidden">
            <div className="flex justify-center">
              <BrandMark compact />
            </div>
            <p className="mt-1 text-xs uppercase tracking-[.28em] text-red-200/65" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Analisis Kelayakan Investasi · Telkom
            </p>
          </div>

          <div className="glass rounded-2xl p-8 border border-white/10 bg-black/20 backdrop-blur-xl shadow-2xl">
            <div className="mb-6 flex rounded-xl bg-white/5 p-1">
              {[["login", "Masuk"], ["register", "Daftar"]].map(([t, l]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTab(t); setError(""); setSuccess(""); onErrorClear?.(); }}
                  className={`flex-1 rounded-lg py-2.5 text-sm transition-all ${tab === t ? "bg-red-700 text-white shadow-lg" : "text-white/50 hover:text-white"}`}
                  style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}
                >
                  {l}
                </button>
              ))}
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-700/50 bg-red-900/40 px-4 py-2.5 text-sm text-red-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 rounded-xl border border-emerald-700/50 bg-emerald-900/40 px-4 py-2.5 text-sm text-emerald-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {success}
              </div>
            )}

            {tab === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <button
                  type="button"
                  disabled={!canGoogle || loading || oauthLoading}
                  onClick={handleGoogleLogin}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white/90 transition-all hover:bg-white/10 hover:border-white/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
                  style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}
                >
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="h-5 w-5" />
                  {oauthLoading ? "Menghubungkan..." : "Lanjutkan dengan Google"}
                </button>

                {!canGoogle && (
                  <div className="rounded-xl border border-amber-700/40 bg-amber-900/20 px-4 py-3 text-xs text-amber-100/80 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Google login belum aktif. Isi <code className="text-amber-200">VITE_SUPABASE_URL</code> dan <code className="text-amber-200">VITE_SUPABASE_ANON_KEY</code> di <code className="text-amber-200">aki-frontend/.env</code>.
                  </div>
                )}

                <div className="flex items-center gap-3 my-5">
                  <div className="h-px flex-1 bg-white/10" />
                  <div className="text-[11px] font-bold uppercase tracking-widest text-white/35" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    atau
                  </div>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
                {/* ---------------------------------------- */}

                <div>
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>Email</div>
                  <input type="email" placeholder="nama@telkom.co.id" autoComplete="email" disabled={loading} {...f("email")} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 focus:border-red-500 focus:bg-white/10 focus:outline-none transition-all disabled:opacity-60" required />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>Password</div>
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-[11px] text-white/45 transition hover:text-white/80" style={{ fontWeight: 500 }}>{showPassword ? "Sembunyikan" : "Tampilkan"}</button>
                  </div>
                  <input type={showPassword ? "text" : "password"} placeholder="Masukkan password" autoComplete="current-password" disabled={loading} {...f("password")} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 focus:border-red-500 focus:bg-white/10 focus:outline-none transition-all disabled:opacity-60" required />
                </div>

                <button type="submit" disabled={loading} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 py-3 text-sm text-white transition-all hover:bg-red-600 active:scale-[0.98] shadow-lg shadow-red-900/20 disabled:opacity-50" style={{ fontWeight: 600 }}>
                  {loading && <span className="spin inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white" />}
                  {loading ? "Masuk..." : "Masuk"}
                </button>

                <div className="text-center text-xs text-white/40 pt-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Belum punya akun? <button type="button" onClick={() => { setTab("register"); setError(""); setSuccess(""); }} className="text-white hover:text-red-300 transition-colors" style={{ fontWeight: 600 }}>Daftar</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <button
                  type="button"
                  disabled={!canGoogle || loading || oauthLoading}
                  onClick={handleGoogleLogin}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white/90 transition-all hover:bg-white/10 hover:border-white/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
                  style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}
                >
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="h-5 w-5" />
                  {oauthLoading ? "Menghubungkan..." : "Daftar dengan Google"}
                </button>

                {!canGoogle && (
                  <div className="rounded-xl border border-amber-700/40 bg-amber-900/20 px-4 py-3 text-xs text-amber-100/80 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Google login belum aktif.
                  </div>
                )}

                <div className="flex items-center gap-3 my-5">
                  <div className="h-px flex-1 bg-white/10" />
                  <div className="text-[11px] font-bold uppercase tracking-widest text-white/35" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    atau
                  </div>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <div>
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>Nama Lengkap</div>
                  <input placeholder="Nama sesuai profil" autoComplete="name" disabled={loading} {...f("full_name")} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 focus:border-red-500 focus:bg-white/10 focus:outline-none transition-all disabled:opacity-60" required />
                </div>
                <div>
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>Email</div>
                  <input type="email" placeholder="nama@telkom.co.id" autoComplete="email" disabled={loading} {...f("email")} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 focus:border-red-500 focus:bg-white/10 focus:outline-none transition-all disabled:opacity-60" required />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>Password</div>
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-[11px] text-white/45 transition hover:text-white/80" style={{ fontWeight: 500 }}>{showPassword ? "Sembunyikan" : "Tampilkan"}</button>
                  </div>
                  <input type={showPassword ? "text" : "password"} placeholder="Minimal 8 karakter" autoComplete="new-password" disabled={loading} {...f("password")} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 focus:border-red-500 focus:bg-white/10 focus:outline-none transition-all disabled:opacity-60" required />
                </div>

                <button type="submit" disabled={loading} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 py-3 text-sm text-white transition-all hover:bg-red-600 active:scale-[0.98] shadow-lg shadow-red-900/20 disabled:opacity-50" style={{ fontWeight: 600 }}>
                  {loading && <span className="spin inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white" />}
                  {loading ? "Mendaftar..." : "Daftar"}
                </button>

                <div className="text-center text-xs text-white/40 pt-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Sudah punya akun? <button type="button" onClick={() => { setTab("login"); setError(""); setSuccess(""); }} className="text-white hover:text-red-300 transition-colors" style={{ fontWeight: 600 }}>Masuk</button>
                </div>
              </form>
            )}
          </div>

          <p className="mt-8 text-center text-xs text-white/30" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Telkom Indonesia · Witel Priangan Barat 2026
          </p>
        </section>
      </div>
    </div>
  );
}
