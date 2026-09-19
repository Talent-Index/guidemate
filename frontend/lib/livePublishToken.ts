const KEY = "guidemate-live-publish-token";

type Draft = { streamId: string; token: string; savedAt: number };

export function storeLivePublishToken(streamId: string, token: string) {
  if (typeof sessionStorage === "undefined") return;
  const draft: Draft = { streamId, token, savedAt: Date.now() };
  sessionStorage.setItem(KEY, JSON.stringify(draft));
}

/// One-time read after navigating from Go live / Start stream.
export function consumeLivePublishToken(streamId: string): string | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as Draft;
    if (draft.streamId !== streamId) return null;
    if (Date.now() - draft.savedAt > 30 * 60 * 1000) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    sessionStorage.removeItem(KEY);
    return draft.token;
  } catch {
    sessionStorage.removeItem(KEY);
    return null;
  }
}
