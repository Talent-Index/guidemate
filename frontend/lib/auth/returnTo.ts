export function safeReturnTo(path: string | null | undefined): string | null {
  if (!path) return null;
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  return path;
}

export const AUTH_RETURN_TO_KEY = "auth_return_to";

export function storeAuthReturnTo(path: string | null | undefined) {
  if (typeof window === "undefined") return;
  const safe = safeReturnTo(path);
  if (safe) sessionStorage.setItem(AUTH_RETURN_TO_KEY, safe);
  else sessionStorage.removeItem(AUTH_RETURN_TO_KEY);
}

export function consumeAuthReturnTo(): string | null {
  if (typeof window === "undefined") return null;
  const stored = sessionStorage.getItem(AUTH_RETURN_TO_KEY);
  sessionStorage.removeItem(AUTH_RETURN_TO_KEY);
  return safeReturnTo(stored);
}
