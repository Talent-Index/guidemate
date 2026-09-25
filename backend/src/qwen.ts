import OpenAI from "openai";

/**
 * Qwen (via ModelScope, OpenAI-compatible endpoint) client for Guidemate.
 * Configured with QWEN_API_KEY / QWEN_BASE_URL / QWEN_MODEL in the environment.
 */
let client: OpenAI | null = null;

export function qwenEnabled(): boolean {
  return Boolean(process.env.QWEN_API_KEY?.trim());
}

function getClient(): OpenAI | null {
  if (!qwenEnabled()) return null;
  if (!client) {
    client = new OpenAI({
      baseURL: process.env.QWEN_BASE_URL?.trim() || "https://api-inference.modelscope.ai/v1",
      apiKey: process.env.QWEN_API_KEY?.trim(),
    });
  }
  return client;
}

function qwenModel(): string {
  return process.env.QWEN_MODEL?.trim() || "Qwen-Ambassador/Qwen3.8-Max";
}

/** Strips markdown code fences that some models wrap JSON in. */
function stripJsonFences(raw: string): string {
  return raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

/**
 * Generic chat helper. Returns the raw assistant text, or null on any failure
 * so callers can fall back to a deterministic path.
 */
export async function qwenChat(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  opts?: { temperature?: number; maxTokens?: number }
): Promise<string | null> {
  const c = getClient();
  if (!c) return null;
  try {
    const res = await c.chat.completions.create({
      model: qwenModel(),
      messages,
      temperature: opts?.temperature ?? 0.3,
      max_tokens: opts?.maxTokens,
    });
    return res.choices[0]?.message?.content?.trim() ?? null;
  } catch (err) {
    console.warn("[qwen] chat failed:", (err as Error).message);
    return null;
  }
}

/** Chat helper that parses a JSON object out of the response. */
export async function qwenChatJson<T>(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  opts?: { temperature?: number; maxTokens?: number }
): Promise<T | null> {
  const raw = await qwenChat(messages, opts);
  if (!raw) return null;
  try {
    return JSON.parse(stripJsonFences(raw)) as T;
  } catch (err) {
    console.warn("[qwen] JSON parse failed:", (err as Error).message);
    return null;
  }
}

export interface QwenMatchParsed {
  experienceId: string;
  alternativeIds: string[];
  exactMatch: boolean;
  reason: string;
}

/**
 * Asks Qwen to pick the best experience for a traveler's request.
 * Returns the parsed selection, or null so the caller can fall back.
 */
export async function qwenMatchExperience(
  request: string,
  catalogue: Array<Record<string, unknown>>
): Promise<QwenMatchParsed | null> {
  const systemPrompt =
    "You are Guidemate's AI travel concierge. Given a traveler's request and a JSON list of vetted " +
    "local guide experiences, pick exactly one best-fit experience id, up to three alternative experience " +
    "ids (all different from the best), whether the best is an exact fit, and a warm one-sentence reason. " +
    'Respond ONLY with a valid JSON object: {"experienceId": string, "alternativeIds": string[], ' +
    '"exactMatch": boolean, "reason": string}. Use only ids from the provided list.';

  const userContent = `Traveler request: "${request}"\n\nAvailable experiences:\n${JSON.stringify(catalogue)}`;

  return qwenChatJson<QwenMatchParsed>(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    { temperature: 0.2 }
  );
}
