export type AccountRole = "guide" | "tourist" | "admin" | "staff";

export function isSuperAdmin(role: AccountRole | undefined | null) {
  return role === "admin";
}

export function canAccessAnalytics(role: AccountRole | undefined | null) {
  return role === "admin" || role === "staff";
}

export function isInternalUser(role: AccountRole | undefined | null) {
  return role === "admin" || role === "staff";
}
