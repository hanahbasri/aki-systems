export function LogoStrip({ compact = false, className = "" }) {
  const logoSize = compact ? "h-7 md:h-8" : "h-10 md:h-12";
  return (
    <div className={`inline-flex items-center gap-4 rounded-2xl border border-white/10 bg-white px-4 py-2 shadow-[0_18px_45px_rgba(0,0,0,0.22)] ${className}`}>
      <img src="/telkomindonesia.png" alt="Telkom Indonesia" className={`${logoSize} object-contain`} />
      <div className="h-8 w-px bg-slate-200" />
      <img src="/danantara.png" alt="Danantara" className={`${logoSize} object-contain`} />
    </div>
  );
}

export function BrandMark({ compact = false, className = "" }) {
  const size = compact ? "h-8 w-8" : "h-10 w-10";
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <img src="/aki_logo.png" alt="AKISystem" className={`${size} rounded-full object-cover shadow-md`} />
      <div className="leading-none">
        <div className="syne truncate text-lg font-800 leading-none tracking-tight text-white md:text-xl">AKI System</div>
        <div className="mt-1 truncate text-xs text-red-200/60">Solution & Offering</div>
      </div>
    </div>
  );
}

export function AppBackground({ children }) {
  return (
    <div className="app-shell text-white">{children}</div>
  );
}
