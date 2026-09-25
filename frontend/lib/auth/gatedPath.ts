export function signInReturnTo(path: string): string {
  return `/auth/sign-in?returnTo=${encodeURIComponent(path)}`;
}

/** Signed-in users go straight to `path`; guests are sent to sign-in (then return). */
export function destinationIfSignedIn(path: string, signedIn: boolean): string {
  return signedIn ? path : signInReturnTo(path);
}
