"use client";

import { useI18n } from "@/components/i18n-provider";

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 p-1 shadow-sm">
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`ui-btn rounded-full px-3 py-1 text-xs font-semibold ${
          locale === "en" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("vi")}
        className={`ui-btn rounded-full px-3 py-1 text-xs font-semibold ${
          locale === "vi" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        VI
      </button>
    </div>
  );
}
