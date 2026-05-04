import { useState, useEffect } from "react";
import { LoginPage } from "./auth.jsx";
import {
  apiFetch,
  apiFetchRaw,
  clearToken,
  getToken,
  getUser as getStoredUser,
  setToken as setStoredToken,
  setUser as setStoredUser,
} from "./authClient.js";
import { supabase } from "./supabaseClient.js";
import { HISTORY_KEY, ROLE_KEY, calcPreview, readStorage, writeStorage } from "./utils/calc.js";
import HalamanRiwayat from "./pages/HalamanRiwayat.jsx";
import HalamanBeranda from "./pages/HalamanBeranda.jsx";
import HalamanInput from "./pages/HalamanInput.jsx";

export default function AKIApp() {
  const [user, setUser] = useState(() => {
    const token = getToken();
    const storedUser = getStoredUser();
    return token && storedUser ? storedUser : null;
  });

  const [authCallbackError, setAuthCallbackError] = useState(() => {
    const hash = window.location.hash;
    if (!hash.includes("error=")) return "";
    const params = new URLSearchParams(hash.slice(1));
    const code = params.get("error_code");
    if (code === "otp_expired") return "Link verifikasi sudah kadaluarsa. Silakan login jika akun sudah aktif, atau daftar ulang.";
    const desc = params.get("error_description");
    return desc ? desc.replace(/\+/g, " ") : "Terjadi kesalahan verifikasi email.";
  });

  useEffect(() => {
    if (authCallbackError) window.history.replaceState({}, "", window.location.pathname);
  }, [authCallbackError]);
  const [showExitModal, setShowExitModal] = useState(false);
  const [page, setPage] = useState("home");
  const [history, setHistory] = useState([]);
  const [cameFromHistory, setCameFromHistory] = useState(false);
  const [role, setRole] = useState(() => readStorage(ROLE_KEY, "solution"));
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(false);
  const [calcWarning, setCalcWarning] = useState("");

  const [form, setForm] = useState({
    nama_program: "", nama_customer: "", cust_group: "", lokasi: "",
    kontrak_tahun: 1,
    start_month: 1, om_pct: 0.12,
  });
  const [products, setProducts] = useState([{ product: null, qty: 1, tipe: "Butuh JT" }]);
  const [capex, setCapex] = useState({ material: "", jasa: "", lifetime_years: 5 });

  const [result, setResult] = useState(null);
  const [recos, setRecos] = useState(null);
  const [recoLoading, setRecoLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const kontrakBulan = form.kontrak_tahun * 12;

  useEffect(() => {
    apiFetchRaw("/health").then(r => r.ok && setApiAvailable(true)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!supabase) return;

    const syncFromSession = async (session) => {
      if (!session?.access_token) return;
      setStoredToken(session.access_token);

      let me = await apiFetch("/auth/me").catch(() => null);

      // Token ditolak server — coba refresh sekali
      if (!me?.ok) {
        try {
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (refreshData?.session?.access_token) {
            setStoredToken(refreshData.session.access_token);
            me = await apiFetch("/auth/me").catch(() => null);
          }
        } catch {
          me = null;
        }
      }

      // Setelah refresh masih gagal → paksa logout
      if (!me?.ok) {
        clearToken();
        setUser(null);
        return;
      }

      const profile = me.profile || null;
      const nextUser = {
        id: session.user?.id,
        email: session.user?.email,
        profile: profile || { id: session.user?.id },
      };

      setStoredUser(nextUser);
      setUser(nextUser);
    };

    supabase.auth.getSession().then(({ data }) => {
      const session = data?.session;
      if (session) {
        syncFromSession(session);
      } else {
        // Tidak ada session valid (expired) → clear dan paksa login ulang
        clearToken();
        setUser(null);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        syncFromSession(session);
      } else {
        // Handles SIGNED_OUT, TOKEN_REFRESH_FAILED, dll
        clearToken();
        setUser(null);
      }
    });

    return () => {
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  const historyKeyForUser = (targetUser) => {
    // Gunakan email sebagai identitas utama (konsisten antara login Supabase & email/password).
    const keyId = targetUser?.email || targetUser?.profile?.email || targetUser?.id || targetUser?.profile?.id || "guest";
    return `${HISTORY_KEY}_${keyId}`;
  };

  useEffect(() => {
    // Bersihkan legacy global history key satu kali agar tidak bocor antar akun.
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    const userHistoryKey = historyKeyForUser(user);
    const perUserHistory = readStorage(userHistoryKey, null);

    if (Array.isArray(perUserHistory)) {
      setHistory(perUserHistory);
    } else {
      setHistory([]);
      writeStorage(userHistoryKey, []);
    }
  }, [user]);

  const handleLogin = (nextUser) => {
    setUser(nextUser);
    setPage("home");
    setRole(readStorage(ROLE_KEY, "solution"));
  };

  const handleLogout = async () => {
    try {
      await supabase?.auth?.signOut?.();
    } catch {
      // ignore
    }
    clearToken();
    localStorage.removeItem(ROLE_KEY);
    setUser(null);
    setPage("dashboard");
    setRole(null);
    setStep(0);
    setResult(null);
    setRecos(null);
  };

  const persistHistory = (nextResult) => {
    if (!user) return;
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      user: user?.profile?.full_name || user?.email || "User AKI",
      role: "solution",
      form,
      products,
      capex,
      result: nextResult,
    };
    const nextHistory = [entry, ...history].slice(0, 30);
    setHistory(nextHistory);
    writeStorage(historyKeyForUser(user), nextHistory);
  };

  const setRolePersist = (nextRole) => {
    if (!nextRole) {
      localStorage.removeItem(ROLE_KEY);
    } else {
      writeStorage(ROLE_KEY, nextRole);
    }
    setRole(nextRole);
  };

  const handleUseHistory = (item) => {
    setRolePersist(item.role || "solution");
    setForm(item.form || form);
    setProducts(item.products?.length ? item.products : [{ product: null, qty: 1, tipe: "Butuh JT" }]);
    setCapex(item.capex || { material: "", jasa: "", lifetime_years: 5 });
    setResult(item.result || null);
    setRecos(null);
    setStep(3);
    setCameFromHistory(true);
    setPage("dashboard");
  };

  const clearHistory = () => {
    setHistory([]);
    if (user) writeStorage(historyKeyForUser(user), []);
  };

  const updateProduct = (i, key, val) => {
    const next = [...products];
    next[i] = { ...next[i], [key]: val };
    setProducts(next);
  };

  const buildPayload = () => ({
    ...form,
    products: products.filter(p => p.product).map(p => ({
      name: p.product.value, qty: p.qty,
      monthly_price: p.product.bulanan, otc_price: p.product.otc,
      is_hsi: p.product.isHSI, satuan: p.product.satuan, tipe: p.tipe,
      evp: p.product.evp,
    })),
    capex: capex.material || capex.jasa ? {
      material: parseFloat(capex.material) || 0,
      jasa: parseFloat(capex.jasa) || 0,
      lifetime_years: capex.lifetime_years,
    } : null,
  });

  const handleCalculate = async () => {
    setLoading(true);
    setResult(null);
    setRecos(null);
    try {
      const data = await apiFetch("/calculate", {
        method: "POST",
        body: JSON.stringify(buildPayload()),
      });

      if (data?.ok) {
        setResult(data.result);
        persistHistory(data.result);
        return;
      }

      if (data?.error === "Unauthorized") {
        handleLogout();
        return;
      }

      if (data?.error) {
        alert(`Perhitungan gagal. Silakan cek input/koneksi. Detail: ${data.error}`);
        return;
      }

      throw new Error("API calculate tidak merespons sesuai format");
    } catch {
      const prev = calcPreview(products, kontrakBulan, capex, form.om_pct, form.start_month);
      const previewResult = {
        total_revenue: prev.total_revenue, total_cogs: prev.total_cogs,
        total_gross_profit: prev.total_gross_profit, total_opex: prev.total_opex,
        total_ebitda: prev.total_ebitda, total_dep: prev.total_dep, total_tax: prev.total_tax,
        total_ebit: prev.total_ebit, total_ni: prev.total_ni,
        gpm_ok: prev.gpm_ok, nim_ok: prev.nim_ok, npv_ok: prev.npv_ok,
        irr_ok: prev.irr_ok, pp_ok: prev.pp_ok, npv: prev.npv, mirr: prev.mirr,
        payback: prev.payback, payback_str: prev.payback_str, layak: prev.layak,
        gpm: prev.gpm, nim: prev.nim, capex_total: prev.capex_total,
        rev_by_year: prev.rev_by_year, dir_by_year: prev.dir_by_year, opx_by_year: prev.opx_by_year,
        ni_by_year: prev.ni_by_year, dep_by_year: prev.dep_by_year, fcf_by_year: prev.fcf_by_year,
      };
      setResult(previewResult);
      persistHistory(previewResult);
      setCalcWarning("Menampilkan hasil estimasi (offline), bukan hasil final AKI.");
    } finally { setLoading(false); }
  };

  const handleGetRecos = async () => {
    setRecoLoading(true);
    try {
      if (apiAvailable) {
        const data = await apiFetch("/recommend", {
          method: "POST",
          body: JSON.stringify(buildPayload()),
        });
        if (data?.ok && data.recommendations) setRecos(data.recommendations);
        if (data?.error === "Unauthorized") handleLogout();
      }
    } finally { setRecoLoading(false); }
  };

  const handleExportPdf = async () => {
    setPdfLoading(true);
    try {
      const res = await apiFetchRaw("/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err?.error === "Unauthorized") handleLogout();
        alert(`Gagal generate PDF: ${err.error || res.statusText}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `AKI_${form.nama_customer || "output"}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Error: ${e.message}`);
    } finally { setPdfLoading(false); }
  };

  const hasProducts = products.some(p => p.product);
  const steps = ["Info Program", "Produk", "CAPEX & Biaya", "Hasil AKI"];
  const isLastStep = step === steps.length - 1;
  const isDirty = Boolean(role) && (
    step > 0 ||
    Boolean(form.nama_program || form.nama_customer || form.lokasi) ||
    hasProducts ||
    Boolean(capex.material || capex.jasa)
  );

  useEffect(() => {
    if (!user || !isDirty) return;
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [user, isDirty]);

  // ── Modal Keluar ──────────────────────────────────────────────────────────
  const exitModalUI = showExitModal && (
    (() => {
      const title = !role ? "Keluar aplikasi?" : (isDirty ? "Keluar dari halaman?" : "Keluar aplikasi?");
      const desc = !role ? "Anda akan keluar dari aplikasi dan harus login kembali." : (isDirty ? "Perubahan yang belum disimpan akan hilang." : "Anda akan keluar dari aplikasi dan harus login kembali.");
      return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn pointer-events-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowExitModal(false); }}
        >
          <div className="w-[90%] max-w-md rounded-2xl bg-[#1a1030] border border-white/10 p-6 shadow-2xl animate-scaleIn pointer-events-auto">
            <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
            <p className="text-sm text-white/50 mb-6">{desc}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowExitModal(false)}
                className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition">
                Batal
              </button>
              <button onClick={() => { setShowExitModal(false); handleLogout(); }}
                className="px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-500 transition">
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      );
    })()
  );

  // ── Routing ───────────────────────────────────────────────────────────────
  if (!user) return <LoginPage onLogin={handleLogin} initialError={authCallbackError} onErrorClear={() => setAuthCallbackError("")} />;

  if (page === "history") return (
    <HalamanRiwayat
      user={user}
      history={history}
      page={page}
      setPage={setPage}
      setShowExitModal={setShowExitModal}
      handleUseHistory={handleUseHistory}
      clearHistory={clearHistory}
      exitModalUI={exitModalUI}
    />
  );

  const handleStartNew = () => {
    setForm({ nama_program: "", nama_customer: "", cust_group: "", lokasi: "", kontrak_tahun: 1, start_month: 1, om_pct: 0.12 });
    setProducts([{ product: null, qty: 1, tipe: "Butuh JT" }]);
    setCapex({ material: "", jasa: "", lifetime_years: 5 });
    setResult(null);
    setRecos(null);
    setStep(0);
    setCameFromHistory(false);
    setPage("dashboard");
  };

  const handleBackToFirstStep = () => {
    setResult(null);
    setRecos(null);
    setCalcWarning("");
    setStep(0);
    setCameFromHistory(false);
    setPage("dashboard");
  };

  const handleFinishToHome = () => {
    setCameFromHistory(false);
    setPage("home");
  };

  if (page === "home") return (
    <HalamanBeranda
      user={user}
      history={history}
      page={page}
      setPage={setPage}
      setShowExitModal={setShowExitModal}
      onStartNew={handleStartNew}
      exitModalUI={exitModalUI}
    />
  );

  // Jika role belum ada, arahkan ke beranda dulu
  if (!role) {
    setRolePersist("solution");
  }

  return (
    <HalamanInput
      user={user}
      page={page}
      setPage={setPage}
      setShowExitModal={setShowExitModal}
      form={form}
      setForm={setForm}
      products={products}
      setProducts={setProducts}
      capex={capex}
      setCapex={setCapex}
      result={result}
      recos={recos}
      recoLoading={recoLoading}
      pdfLoading={pdfLoading}
      loading={loading}
      hasProducts={hasProducts}
      steps={steps}
      step={step}
      setStep={setStep}
      isLastStep={isLastStep}
      kontrakBulan={kontrakBulan}
      handleCalculate={handleCalculate}
      handleGetRecos={handleGetRecos}
      handleExportPdf={handleExportPdf}
      updateProduct={updateProduct}
      exitModalUI={exitModalUI}
      apiAvailable={apiAvailable}
      calcWarning={calcWarning}
      cameFromHistory={cameFromHistory}
      setCameFromHistory={setCameFromHistory}
      handleBackToFirstStep={handleBackToFirstStep}
      handleFinishToHome={handleFinishToHome}
    />
  );
}
