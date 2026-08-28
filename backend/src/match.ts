import OpenAI from "openai";
import guides from "./data/guides.json" with { type: "json" };

export interface Guide {
  id: string;
  name: string;
  wallet: string;
  phone: string;
  tags: string[];
  languages: string[];
  reputationScore: number;
  completedTours: number;
  priceUsdc: number;
  bio: string;
}

export interface MatchResult {
  guide: Guide;
  reason: string;
  source: "openai" | "local";
}

const allGuides = guides as Guide[];

function localKeywordMatch(request: string): { guide: Guide; reason: string } {
  const text = request.toLowerCase();

  let best = allGuides[0];
  let bestScore = -Infinity;

  for (const guide of allGuides) {
    const tagHits = guide.tags.filter((tag) => text.includes(tag.toLowerCase())).length;
    // Weight tag relevance heavily, then break ties with reputation.
    const score = tagHits * 10 + guide.reputationScore;
    if (score > bestScore) {
      bestScore = score;
      best = guide;
    }
  }

  const matchedTags = best.tags.filter((tag) => text.includes(tag.toLowerCase()));
  const reason =
    matchedTags.length > 0
      ? `Matched on "${matchedTags.join(", ")}" - ${best.reputationScore}/5 rating over ${best.completedTours} tours.`
      : `Highest-rated available guide (${best.reputationScore}/5 over ${best.completedTours} tours).`;

  return { guide: best, reason };
}

export async function matchGuide(request: string): Promise<MatchResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    const { guide, reason } = localKeywordMatch(request);
    return { guide, reason, source: "local" };
  }

  try {
    const client = new OpenAI({ apiKey });
    const catalogue = allGuides.map(({ id, name, tags, languages, reputationScore, completedTours, priceUsdc, bio }) => ({
      id,
      name,
      tags,
      languages,
      reputationScore,
      completedTours,
      priceUsdc,
      bio,
    }));

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are Guidemate's matching agent. Given a hotel guest's request and a JSON list of vetted local guides, " +
            'pick exactly one best-fit guide id and a one-sentence reason. Respond ONLY as JSON: {"guideId": string, "reason": string}.',
        },
        {
          role: "user",
          content: `Guest request: "${request}"\n\nGuides: ${JSON.stringify(catalogue)}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { guideId?: string; reason?: string };
    const guide = allGuides.find((g) => g.id === parsed.guideId);

    if (!guide) {
      throw new Error("OpenAI returned an unknown guideId");
    }

    return { guide, reason: parsed.reason ?? "Matched by Guidemate AI agent.", source: "openai" };
  } catch (err) {
    console.warn("[match] OpenAI matching failed, falling back to local matcher:", (err as Error).message);
    const { guide, reason } = localKeywordMatch(request);
    return { guide, reason, source: "local" };
  }
}

export function getGuideById(id: string): Guide | undefined {
  return allGuides.find((g) => g.id === id);
}

export function listGuides(): Guide[] {
  return allGuides;
}
