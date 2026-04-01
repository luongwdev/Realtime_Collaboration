export const tokenKey = "teamflow_access_token";
export const refreshKey = "teamflow_refresh_token";

export function saveSession(accessToken: string, refreshToken: string, rememberMe: boolean) {
  if (rememberMe) {
    localStorage.setItem(tokenKey, accessToken);
    localStorage.setItem(refreshKey, refreshToken);
    sessionStorage.removeItem(tokenKey);
    sessionStorage.removeItem(refreshKey);
    return;
  }

  sessionStorage.setItem(tokenKey, accessToken);
  sessionStorage.setItem(refreshKey, refreshToken);
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(refreshKey);
}

export function clearSession() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(refreshKey);
  sessionStorage.removeItem(tokenKey);
  sessionStorage.removeItem(refreshKey);
}

export function getStoredAccessToken() {
  return localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey) || "";
}

export function getStoredRefreshToken() {
  return localStorage.getItem(refreshKey) || sessionStorage.getItem(refreshKey) || "";
}

export function isRememberedSession() {
  return Boolean(localStorage.getItem(refreshKey));
}

