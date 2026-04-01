"use client";

import { useEffect, useState } from "react";
import { getToastEventName, type AppToastPayload } from "@/lib/toast";

type ToastItem = AppToastPayload & { id: number };

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    let seed = 1;
    const onToast = (event: Event) => {
      const custom = event as CustomEvent<AppToastPayload>;
      const payload = custom.detail;
      if (!payload?.message) return;
      const id = seed++;
      setToasts((prev) => [...prev, { ...payload, id }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 2600);
    };

    window.addEventListener(getToastEventName(), onToast as EventListener);
    return () => window.removeEventListener(getToastEventName(), onToast as EventListener);
  }, []);

  return (
    <div className="fixed right-4 top-4 z-[100] flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-xl border px-4 py-3 text-sm shadow-xl backdrop-blur ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : toast.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-sky-200 bg-sky-50 text-sky-800"
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
