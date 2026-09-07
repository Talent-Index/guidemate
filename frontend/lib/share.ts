export function buildAppUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const publicBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (publicBase && !/localhost|127\.0\.0\.1/.test(publicBase)) {
    return `${publicBase}${normalized}`;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}${normalized}`;
  }
  return normalized;
}

export function getExperienceSharePath(experienceId: string) {
  return `/book/${experienceId}`;
}

export function getStreamSharePath(streamId: string) {
  return `/live/${streamId}`;
}

export function getExperienceShareUrl(experienceId: string) {
  return buildAppUrl(getExperienceSharePath(experienceId));
}

export function getStreamShareUrl(streamId: string) {
  return buildAppUrl(getStreamSharePath(streamId));
}
