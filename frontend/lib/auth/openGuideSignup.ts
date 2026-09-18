export type PendingOpenGuideProfile = {
  fullName: string;
  phone: string | null;
  openGuide: true;
};

export function storePendingOpenGuideProfile(opts: { email: string; fullName: string; phone: string | null }) {
  const payload: PendingOpenGuideProfile = {
    fullName: opts.fullName,
    phone: opts.phone,
    openGuide: true,
  };
  const json = JSON.stringify(payload);
  localStorage.setItem(`guidemate_pending_profile_${opts.email}`, json);
  if (opts.email === "google") {
    localStorage.setItem("guidemate_pending_profile_google", json);
  }
}

export function readPendingOpenGuideProfile(email: string): PendingOpenGuideProfile | null {
  const raw =
    localStorage.getItem(`guidemate_pending_profile_${email}`) ??
    localStorage.getItem("guidemate_pending_profile_google");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingOpenGuideProfile;
    return parsed?.openGuide ? parsed : null;
  } catch {
    return null;
  }
}

export function clearPendingOpenGuideProfile(email: string) {
  localStorage.removeItem(`guidemate_pending_profile_${email}`);
  localStorage.removeItem("guidemate_pending_profile_google");
}
