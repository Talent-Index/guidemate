export function authConfirmUrl(origin: string, next?: string) {
  const url = new URL("/auth/callback", origin);
  if (next) url.searchParams.set("next", next);
  return url.toString();
}
