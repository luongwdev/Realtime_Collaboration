"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { api, ApiError, getApiBaseUrl } from "@/lib/api";
import { useI18n } from "@/components/i18n-provider";
import {
  clearSession,
  getStoredAccessToken,
  getStoredRefreshToken,
  isRememberedSession,
  saveSession,
} from "@/lib/session";
import { toastError, toastSuccess } from "@/lib/toast";

const googleRememberKey = "teamflow_google_remember_me";

export default function AuthPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = getStoredAccessToken();
    const refreshToken = getStoredRefreshToken();
    if (!token && !refreshToken) return;

    let cancelled = false;
    const validateSession = async () => {
      try {
        if (token) {
          await api.me(token);
          if (!cancelled) router.replace("/dashboard");
          return;
        }
        if (refreshToken) {
          const refreshed = await api.refresh(refreshToken);
          saveSession(
            refreshed.data.access_token,
            refreshed.data.refresh_token,
            isRememberedSession(),
          );
          if (!cancelled) router.replace("/dashboard");
        }
      } catch {
        clearSession();
      }
    };
    void validateSession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function login() {
    if (!email.trim() || !password.trim()) {
      toastError(t("auth.loginRequired"));
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await api.login({ email, password });
      saveSession(res.data.access_token, res.data.refresh_token, rememberMe);
      toastSuccess(t("auth.loginSuccess"));
      router.replace("/dashboard");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("auth.loginFail");
      setMessage(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function register() {
    if (!email.trim() || !password.trim() || !fullName.trim() || !displayName.trim()) {
      toastError(t("auth.registerRequired"));
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await api.register({
        email,
        password,
        fullName,
        displayName,
        timezone: "Asia/Ho_Chi_Minh",
      });
      saveSession(res.data.access_token, res.data.refresh_token, rememberMe);
      toastSuccess(t("auth.registerSuccess"));
      router.replace("/dashboard");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("auth.registerFail");
      setMessage(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  }

  function loginWithGoogle() {
    sessionStorage.setItem(googleRememberKey, rememberMe ? "1" : "0");
    window.location.href = `${getApiBaseUrl()}/auth/google`;
  }

  return (
    <div className="auth-bg min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-6xl grid items-stretch gap-8 md:grid-cols-2">
        <div className="auth-hero rounded-3xl p-10 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300/90">
            TeamFlow
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-tight md:text-5xl">
            Realtime Collaboration
            <br />
            Platform
          </h1>
          <p className="mt-6 max-w-md text-slate-200">
            {t("auth.subtitle")}
          </p>
        </div>

        <div className="auth-card rounded-3xl bg-white p-7 text-slate-900 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold">{t("auth.heading")}</h2>
            <LanguageSwitcher />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {t("auth.description")}
          </p>

          <div className="mt-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            <button
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                authMode === "login"
                  ? "bg-white shadow text-slate-900"
                  : "text-slate-500"
              }`}
              onClick={() => setAuthMode("login")}
            >
              {t("auth.loginTab")}
            </button>
            <button
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                authMode === "register"
                  ? "bg-white shadow text-slate-900"
                  : "text-slate-500"
              }`}
              onClick={() => setAuthMode("register")}
            >
              {t("auth.registerTab")}
            </button>
          </div>

          <div className="mt-5 grid gap-3">
            <input
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
            />
            <div className="relative">
              <input
                className="auth-input w-full pr-20"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.password")}
                type={showPassword ? "text" : "password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
              >
                {showPassword ? t("auth.hide") : t("auth.show")}
              </button>
            </div>
            {authMode === "register" && (
              <>
                <input
                  className="auth-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t("auth.fullName")}
                />
                <input
                  className="auth-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("auth.displayName")}
                />
              </>
            )}
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              {t("auth.rememberMe")}
            </label>
            <button
              onClick={authMode === "login" ? login : register}
              disabled={loading}
              className="auth-cta mt-1 rounded-xl px-4 py-2.5 text-white"
            >
              {loading
                ? t("common.processing")
                : authMode === "login"
                  ? t("auth.signIn")
                  : t("auth.createAccount")}
            </button>
            <button
              type="button"
              onClick={loginWithGoogle}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t("auth.continueGoogle")}
            </button>
          </div>

          {message && (
            <p className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
