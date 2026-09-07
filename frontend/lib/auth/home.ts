export type AccountRole = "guide" | "tourist" | "admin" | "staff";

export function homeForRole(role: AccountRole): string {
  if (role === "admin") return "/admin/applications";
  if (role === "staff") return "/admin";
  if (role === "guide") return "/guide/dashboard";
  return "/explore";
}
