"use client";

export type AppToastPayload = {
  type: "success" | "error" | "info";
  message: string;
};

const EVENT_NAME = "app-toast";

function emitToast(payload: AppToastPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<AppToastPayload>(EVENT_NAME, { detail: payload }));
}

export function toastSuccess(message: string) {
  emitToast({ type: "success", message });
}

export function toastError(message: string) {
  emitToast({ type: "error", message });
}

export function toastInfo(message: string) {
  emitToast({ type: "info", message });
}

export function getToastEventName() {
  return EVENT_NAME;
}
