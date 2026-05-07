import { useEffect, useState } from "react";
import { apiFetch, apiFetchRaw, clearToken } from "./authClient.js";
import { HISTORY_KEY, ROLE_KEY, calcPreview, readStorage, writeStorage } from "./utils/calc.js";
import HalamanRiwayat from "./pages/HalamanRiwayat.jsx";
import HalamanBeranda from "./pages/HalamanBeranda.jsx";
import HalamanInput from "./pages/HalamanInput.jsx";

const PUBLIC_HISTORY_KEY = `${HISTORY_KEY}_public`;
const PUBLIC_USER = Object.freeze({
  id: "public-user",
  email: "public@aki.local",
  profile: {
    id: "public-user",
    full_name: "Pengguna Publik",
  },
});

const createEmptyForm = () => ({
  nama_program: "",
  nama_customer: "",
  cust_group: "",
  lokasi: "",
  kontrak_tahun: 1,
  start_month: 1,
  om_pct: 0.12,
});

const createEmptyProducts = () => [{ product: null, qty: 1, tipe: "Butuh JT" }];

const createEmptyCapex = () => ({ material: "", jasa: "", lifetime_years: 5 });

export default function AKIApp() {
  const [showExitModal, setShowExitModal] = useState(false);
  const [page, setPage] = useState("home");
  const [history, setHistory] = useState(() => {
    const storedHistory = readStorage(PUBLIC_HISTORY_KEY, []);
    return Array.isArray(storedHistory) ? storedHistory : [];
  });
  const [cameFromHistory, setCameFromHistory] = useState(false);
  const [role, setRole] = useState(() => readStorage(ROLE_KEY, "solution"));
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(false);
  const [calcWarning, setCalcWarning] = useState("");
  const [form, setForm] = useState(createEmptyForm);
  const [products, setProducts] = useState(createEmptyProducts);
  const [capex, setCapex] = useState(createEmptyCapex);
  const [result, setResult] = useState(null);
  const [recos, setRecos] = useState(null);
  const [recoLoading, setRecoLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const user = PUBLIC_USER;
  const kontrakBulan = form.kontrak_tahun * 12;

  useEffect(() => {
    clearToken();
    apiFetchRaw("/health").then((r) => r.ok && setApiAvailable(true)).catch(() => {});
  }, []);

  useEffect(() => {
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      // ignore legacy key cleanup
    }

    const storedHistory = readStorage(PUBLIC_HISTORY_KEY, []);
    if (!Array.isArray(storedHistory)) writeStorage(PUBLIC_HISTORY_KEY, []);
  }, []);

  const setRolePersist = (nextRole) => {
    if (!nextRole) {
      localStorage.removeItem(ROLE_KEY);
    } else {
      writeStorage(ROLE_KEY, nextRole);
    }
    setRole(nextRole);
  };

  const resetDraftState = () => {
    setForm(createEmptyForm());
    setProducts(createEmptyProducts());
    setCapex(createEmptyCapex());
    setResult(null);
    setRecos(null);
    setStep(0);
    setCalcWarning("");
    setCameFromHistory(false);
  };

  const handleResetCalculator = () => {
    setShowExitModal(false);
    resetDraftState();
    setRolePersist("solution");
    setPage("home");
  };

  const persistHistory = (nextResult) => {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      user: "Pengguna Publik",
      role: "solution",
      form,
      products,
      capex,
      result: nextResult,
    };
    const nextHistory = [entry, ...history].slice(0, 30);
    setHistory(nextHistory);
    writeStorage(PUBLIC_HISTORY_KEY, nextHistory);
  };

  const handleUseHistory = (item) => {
    setRolePersist(item.role || "solution");
    setForm(item.form || createEmptyForm());
    setProducts(item.products?.length ? item.products : createEmptyProducts());
    setCapex(item.capex || createEmptyCapex());
    setResult(item.result || null);
    setRecos(null);
    setCalcWarning("");
    setStep(3);
    setCameFromHistory(true);
    setPage("dashboard");
  };

  const clearHistory = () => {
    setHistory([]);
    writeStorage(PUBLIC_HISTORY_KEY, []);
  };

  const updateProduct = (i, key, val) => {
    const next = [...products];
    next[i] = { ...next[i], [key]: val };
    setProducts(next);
  };

  const buildPayload = () => ({
    ...form,
    products: products.filter((p) => p.product).map((p) => ({
      name: p.product.value,
      qty: p.qty,
      monthly_price: p.product.bulanan,
      otc_price: p.product.otc,
      charge_type: p.product.chargeType,
      info: p.product.info,
      is_hsi: p.product.isHSI,
      tipe: p.tipe,
      evp: p.product.evp,
      cogs_bulanan_pct: p.product.cogsBulananPct,
      cogs_bulanan_nominal: p.product.cogsBulananNominal,
      cogs_otc_pct: p.product.cogsOtcPct,
      cogs_otc_nominal: p.product.cogsOtcNominal,
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
    setCalcWarning("");

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

      if (data?.error) {
        alert(`Perhitungan gagal. Silakan cek input/koneksi. Detail: ${data.error}`);
        return;
      }

      throw new Error("API calculate tidak merespons sesuai format");
    } catch {
      const prev = calcPreview(products, kontrakBulan, capex, form.om_pct, form.start_month);
      const previewResult = {
        total_revenue: prev.total_revenue,
        total_cogs: prev.total_cogs,
        total_gross_profit: prev.total_gross_profit,
        total_opex: prev.total_opex,
        total_ebitda: prev.total_ebitda,
        total_dep: prev.total_dep,
        total_tax: prev.total_tax,
        total_ebit: prev.total_ebit,
        total_ni: prev.total_ni,
        gpm_ok: prev.gpm_ok,
        nim_ok: prev.nim_ok,
        npv_ok: prev.npv_ok,
        irr_ok: prev.irr_ok,
        pp_ok: prev.pp_ok,
        npv: prev.npv,
        mirr: prev.mirr,
        payback: prev.payback,
        payback_str: prev.payback_str,
        layak: prev.layak,
        gpm: prev.gpm,
        nim: prev.nim,
        capex_total: prev.capex_total,
        rev_by_year: prev.rev_by_year,
        dir_by_year: prev.dir_by_year,
        opx_by_year: prev.opx_by_year,
        ni_by_year: prev.ni_by_year,
        dep_by_year: prev.dep_by_year,
        fcf_by_year: prev.fcf_by_year,
      };
      setResult(previewResult);
      persistHistory(previewResult);
      setCalcWarning("Menampilkan hasil estimasi (offline), bukan hasil final AKI.");
    } finally {
      setLoading(false);
    }
  };

  const handleGetRecos = async () => {
    setRecoLoading(true);
    try {
      if (!apiAvailable) return;

      const data = await apiFetch("/recommend", {
        method: "POST",
        body: JSON.stringify(buildPayload()),
      });

      if (data?.ok && data.recommendations) {
        setRecos(data.recommendations);
      }
    } finally {
      setRecoLoading(false);
    }
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
        alert(`Gagal generate PDF: ${err.error || res.statusText}`);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AKI_${form.nama_customer || "output"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Error: ${e.message}`);
    } finally {
      setPdfLoading(false);
    }
  };

  const hasProducts = products.some((p) => p.product);
  const steps = ["Info Program", "Produk", "CAPEX & Biaya", "Hasil AKI"];
  const isLastStep = step === steps.length - 1;
  const isDirty = Boolean(role) && (
    step > 0 ||
    Boolean(form.nama_program || form.nama_customer || form.lokasi) ||
    hasProducts ||
    Boolean(capex.material || capex.jasa)
  );

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const exitModalUI = showExitModal && (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn pointer-events-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) setShowExitModal(false);
      }}
    >
      <div className="w-[90%] max-w-md rounded-2xl bg-[#1a1030] border border-white/10 p-6 shadow-2xl animate-scaleIn pointer-events-auto">
        <h2 className="text-xl font-bold text-white mb-2">
          {isDirty ? "Reset perhitungan?" : "Kembali ke beranda?"}
        </h2>
        <p className="text-sm text-white/50 mb-6">
          {isDirty
            ? "Data yang sedang Anda isi akan dihapus dan kalkulator kembali ke kondisi awal."
            : "Anda akan kembali ke beranda kalkulator publik."}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setShowExitModal(false)}
            className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition"
          >
            Batal
          </button>
          <button
            onClick={handleResetCalculator}
            className="px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-500 transition"
          >
            Ya, Reset
          </button>
        </div>
      </div>
    </div>
  );

  if (page === "history") {
    return (
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
  }

  const handleStartNew = () => {
    resetDraftState();
    setRolePersist("solution");
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

  if (page === "home") {
    return (
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
