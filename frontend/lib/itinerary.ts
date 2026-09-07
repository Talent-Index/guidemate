export interface ItineraryStep {
  title: string;
  body: string;
  image_url: string | null;
}

export function emptyItineraryStep(): ItineraryStep {
  return { title: "", body: "", image_url: null };
}

export function normalizeItinerary(raw: unknown, fallbackPhotos: string[] = []): ItineraryStep[] {
  if (!Array.isArray(raw)) return [];
  const steps: ItineraryStep[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const body = typeof row.body === "string" ? row.body.trim() : "";
    const imageUrl = typeof row.image_url === "string" ? row.image_url : null;
    if (!title && !body) continue;
    steps.push({
      title,
      body,
      image_url: imageUrl,
    });
  }
  return steps.map((step, index) => ({
    ...step,
    image_url: step.image_url ?? fallbackPhotos[index % fallbackPhotos.length] ?? null,
  }));
}

export function itineraryForSave(steps: ItineraryStep[]): ItineraryStep[] {
  return steps
    .map((step) => ({
      title: step.title.trim(),
      body: step.body.trim(),
      image_url: step.image_url,
    }))
    .filter((step) => step.title && step.body);
}
