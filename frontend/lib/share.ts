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

export function getExperienceSharePath(experienceId: string, slug?: string | null) {
  return slug ? `/e/${encodeURIComponent(slug)}` : `/experiences/${experienceId}`;
}

export function getGuideSharePath(guideId: string, slug?: string | null) {
  return slug ? `/g/${encodeURIComponent(slug)}` : `/guides/${guideId}`;
}

export function getStreamSharePath(streamId: string) {
  return `/live/${streamId}`;
}

export function getExperienceShareUrl(experienceId: string, slug?: string | null) {
  return buildAppUrl(getExperienceSharePath(experienceId, slug));
}

export function getGuideShareUrl(guideId: string, slug?: string | null) {
  return buildAppUrl(getGuideSharePath(guideId, slug));
}

export function getStreamShareUrl(streamId: string) {
  return buildAppUrl(getStreamSharePath(streamId));
}
