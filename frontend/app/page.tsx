"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredAccessToken, refreshKey } from "@/lib/session";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = getStoredAccessToken();
    const refreshToken = localStorage.getItem(refreshKey);
    if (token || refreshToken) {
      router.replace("/dashboard");
      return;
    }
    router.replace("/auth");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-slate-500">
      Loading...
    </div>
  );
}
