"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveSession } from "@/lib/session";

const googleRememberKey = "teamflow_google_remember_me";

export default function GoogleCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) {
      router.replace("/auth");
      return;
    }
    const rememberValue = sessionStorage.getItem(googleRememberKey);
    const rememberMe = rememberValue !== "0";
    sessionStorage.removeItem(googleRememberKey);
    saveSession(accessToken, refreshToken, rememberMe);
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-slate-500">
      Signing in with Google...
    </div>
  );
}
