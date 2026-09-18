import { GoogleGenAI, Type } from "@google/genai";
import { listActiveExperiences, type Experience } from "./experiences.js";

export interface MatchResult {
  experience: Experience;
  reason: string;
  source: "gemini" | "local";
  exactMatch: boolean;
  alternatives: Experience[];
}

function scoreExperience(request: string, exp: Experience): number {
  const text = request.toLowerCase();
  const tagHits = exp.tags.filter((tag) => text.includes(tag.toLowerCase())).length;
  const titleHit = text.includes(exp.title.toLowerCase()) ? 2 : 0;
  const categoryHit = exp.category && text.includes(exp.category.toLowerCase()) ? 2 : 0;
  const descHit = exp.description.toLowerCase().split(/\s+/).filter((w) => w.length > 4 && text.includes(w)).length;
  return tagHits * 10 + titleHit + categoryHit + Math.min(descHit, 3);
}

function rankExperiences(
  request: string,
  experiences: Experience[]
): { experience: Experience; reason: string; exactMatch: boolean; alternatives: Experience[] } {
  const ranked = [...experiences]
    .map((exp) => ({ exp, score: scoreExperience(request, exp) }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0]?.exp ?? experiences[0];
  const bestScore = ranked[0]?.score ?? 0;
  const exactMatch = bestScore >= 10;

  const matchedTags = best.tags.filter((tag) => request.toLowerCase().includes(tag.toLowerCase()));
  const reason = exactMatch
    ? matchedTags.length > 0
      ? `Matched on "${matchedTags.join(", ")}" — "${best.title}" with ${best.guide.fullName}.`
      : `"${best.title}" with ${best.guide.fullName} fits your request.`
    : `We don't have that exact experience listed yet. "${best.title}" is the closest match — see other options below.`;

  const alternatives = ranked
    .slice(1, 4)
    .map((row) => row.exp)
    .filter((exp) => exp.id !== best.id);

  return { experience: best, reason, exactMatch, alternatives };
}

export async function matchExperience(request: string): Promise<MatchResult> {
  const experiences = await listActiveExperiences();
  if (experiences.length === 0) {
    throw new Error("no active experiences available to match against");
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const { experience, reason, exactMatch, alternatives } = rankExperiences(request, experiences);
    return { experience, reason, exactMatch, alternatives, source: "local" };
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
        "guide experiences, pick exactly one best-fit experience id, up to three alternative experience ids " +
        "(different from the best), whether the best is an exact fit (exactMatch boolean), and a one-sentence reason.\n\n" +
        `Tourist request: "${request}"\n\nExperiences: ${JSON.stringify(catalogue)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            experienceId: { type: Type.STRING },
            alternativeIds: { type: Type.ARRAY, items: { type: Type.STRING } },
            exactMatch: { type: Type.BOOLEAN },
            reason: { type: Type.STRING },
          },
          required: ["experienceId", "reason", "exactMatch", "alternativeIds"],
        },
      },
    });

    const parsed = JSON.parse(response.text ?? "{}") as {
      experienceId?: string;
      alternativeIds?: string[];
      exactMatch?: boolean;
      reason?: string;
    };
    const experience = experiences.find((e) => e.id === parsed.experienceId);

    if (!experience) {
      throw new Error("Gemini returned an unknown experienceId");
    }

    const altIds = (parsed.alternativeIds ?? []).filter((id) => id !== experience.id).slice(0, 3);
    let alternatives = altIds
      .map((id) => experiences.find((e) => e.id === id))
      .filter((e): e is Experience => Boolean(e));

    if (alternatives.length < 2) {
      const fallback = rankExperiences(request, experiences);
      const seen = new Set([experience.id, ...alternatives.map((a) => a.id)]);
      for (const alt of fallback.alternatives) {
        if (seen.has(alt.id)) continue;
        alternatives.push(alt);
        seen.add(alt.id);
        if (alternatives.length >= 3) break;
      }
    }

    return {
      experience,
      reason: parsed.reason ?? "Matched by Guidemate AI agent.",
      exactMatch: parsed.exactMatch ?? true,
      alternatives,
      source: "gemini",
    };
  } catch (err) {
    console.warn("[match] Gemini matching failed, falling back to local matcher:", (err as Error).message);
    const { experience, reason, exactMatch, alternatives } = rankExperiences(request, experiences);
    return { experience, reason, exactMatch, alternatives, source: "local" };
  }
}
