import { GoogleGenAI, Type } from "@google/genai";
import { listActiveExperiences, type Experience } from "./experiences.js";

export interface MatchResult {
  experience: Experience;
  reason: string;
  source: "gemini" | "local";
}

function localKeywordMatch(request: string, experiences: Experience[]): { experience: Experience; reason: string } {
  const text = request.toLowerCase();

  let best = experiences[0];
  let bestScore = -Infinity;

  for (const exp of experiences) {
    const tagHits = exp.tags.filter((tag) => text.includes(tag.toLowerCase())).length;
    const titleHit = text.includes(exp.title.toLowerCase()) ? 1 : 0;
    const categoryHit = exp.category && text.includes(exp.category.toLowerCase()) ? 1 : 0;
    // Weight tag relevance heavily, then break ties with a title/category match.
    const score = tagHits * 10 + titleHit + categoryHit;
    if (score > bestScore) {
      bestScore = score;
      best = exp;
    }
  }

  const matchedTags = best.tags.filter((tag) => text.includes(tag.toLowerCase()));
  const reason =
    matchedTags.length > 0
      ? `Matched on "${matchedTags.join(", ")}" - "${best.title}" with ${best.guide.fullName}.`
      : `Closest available experience: "${best.title}" with ${best.guide.fullName}.`;

  return { experience: best, reason };
}

export async function matchExperience(request: string): Promise<MatchResult> {
  const experiences = await listActiveExperiences();
  if (experiences.length === 0) {
    throw new Error("no active experiences available to match against");
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const { experience, reason } = localKeywordMatch(request, experiences);
    return { experience, reason, source: "local" };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

    const catalogue = experiences.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      tags: e.tags,
      category: e.category,
      priceUsdc: e.priceUsdc,
      durationMinutes: e.durationMinutes,
      location: e.location,
      guideName: e.guide.fullName,
      languages: e.guide.languages,
    }));

    const response = await ai.models.generateContent({
      model,
      contents:
        "You are Guidemate's matching agent. Given a tourist's request and a JSON list of vetted local " +
        "guide experiences, pick exactly one best-fit experience id and a one-sentence reason.\n\n" +
        `Tourist request: "${request}"\n\nExperiences: ${JSON.stringify(catalogue)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            experienceId: { type: Type.STRING },
            reason: { type: Type.STRING },
          },
          required: ["experienceId", "reason"],
        },
      },
    });

    const parsed = JSON.parse(response.text ?? "{}") as { experienceId?: string; reason?: string };
    const experience = experiences.find((e) => e.id === parsed.experienceId);

    if (!experience) {
      throw new Error("Gemini returned an unknown experienceId");
    }

    return { experience, reason: parsed.reason ?? "Matched by Guidemate AI agent.", source: "gemini" };
  } catch (err) {
    console.warn("[match] Gemini matching failed, falling back to local matcher:", (err as Error).message);
    const { experience, reason } = localKeywordMatch(request, experiences);
    return { experience, reason, source: "local" };
  }
}
