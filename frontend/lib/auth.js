import jwt from "jsonwebtoken";

const TOKEN_KEY = "ttm_token";
const ROLE_KEY = "ttm_role";

export function saveAuth(token) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  const decoded = jwt.decode(token);
  if (decoded?.role) {
    localStorage.setItem(ROLE_KEY, decoded.role);
  }
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRole() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ROLE_KEY);
}

/** Numeric user id embedded in JWT (client-side decode). */
export function getUserId() {
  const token = getToken();
  if (!token) return null;
  const decoded = jwt.decode(token);
  return decoded?.id ?? null;
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
}
