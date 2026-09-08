export interface PublishDraftInput {
  title: string;
  priceUsdc: number;
  meetingLat: number | null;
  meetingLng: number | null;
  futureSlotCount: number;
}

const HINTS: Record<string, string> = {
  title: "Add a title",
  price: "Add a price",
  "meeting point": "Add meeting point",
  "a future time slot": "Add a future time slot",
};

export function missingPublishPieces(draft: PublishDraftInput): string[] {
  const missing: string[] = [];
  if (!draft.title.trim()) missing.push("title");
  if (!(draft.priceUsdc > 0)) missing.push("price");
  if (draft.meetingLat == null || draft.meetingLng == null) missing.push("meeting point");
  if (draft.futureSlotCount < 1) missing.push("a future time slot");
  return missing;
}

export function canPublish(draft: PublishDraftInput): boolean {
  return missingPublishPieces(draft).length === 0;
}

export function nextGapHint(draft: PublishDraftInput): string {
  const first = missingPublishPieces(draft)[0];
  return first ? HINTS[first] ?? `Add ${first}` : "Continue setup";
}

export function compareExperiencesForDashboard(
  a: { status: string; created_at?: string },
  b: { status: string; created_at?: string }
): number {
  if (a.status === "draft" && b.status !== "draft") return -1;
  if (a.status !== "draft" && b.status === "draft") return 1;
  return (b.created_at ?? "").localeCompare(a.created_at ?? "");
}
