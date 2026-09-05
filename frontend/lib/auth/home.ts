export type AccountRole = "guide" | "tourist" | "admin";

export function homeForRole(role: AccountRole): string {
  if (role === "admin") return "/admin";
  if (role === "guide") return "/guide/dashboard";
  return "/explore";
}
