import { Router } from "express";
import { z } from "zod";
import { getUserIdFromAuthHeader } from "../supabase.js";
import { qwenChat, qwenChatJson, qwenEnabled } from "../qwen.js";

export const aiRouter = Router();

function requireQwen(res: import("express").Response): boolean {
  if (!qwenEnabled()) {
    res.status(503).json({ error: "AI is not configured right now. Please try again later." });
    return false;
  }
  return true;
}

const draftSchema = z.object({
  notes: z.string().min(3, "Tell us a little about the experience").max(2000),
  category: z.string().max(80).optional(),
  location: z.string().max(120).optional(),
});

/** Turn a guide's rough notes into a polished title, description and tags. */
aiRouter.post("/experience-draft", async (req, res) => {
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "sign in required" });
  if (!requireQwen(res)) return;

  const parsed = draftSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { notes, category, location } = parsed.data;

  const result = await qwenChatJson<{ title: string; description: string; tags: string[] }>(
    [
      {
        role: "system",
        content:
          "You are Guidemate's listing copywriter for local tour guides. Turn rough notes into an appealing " +
          "experience listing. Keep it authentic, concrete and warm. Description should be 2-4 short paragraphs. " +
          'Respond ONLY with JSON: {"title": string (max 70 chars), "description": string, "tags": string[] (3-6 lowercase tags)}.',
      },
      {
        role: "user",
        content: `Rough notes: "${notes}"${category ? `\nCategory: ${category}` : ""}${location ? `\nLocation: ${location}` : ""}`,
      },
    ],
    { temperature: 0.6 }
  );

  if (!result?.title || !result?.description) {
    return res.status(502).json({ error: "AI could not draft this listing. Try again." });
  }
  return res.json({
    title: result.title.slice(0, 90),
    description: result.description,
    tags: Array.isArray(result.tags) ? result.tags.slice(0, 6) : [],
  });
});

const streamTitleSchema = z.object({
  topic: z.string().min(2, "What's the stream about?").max(300),
});

/** Suggest a catchy live-stream title and one-line summary from a topic. */
aiRouter.post("/stream-title", async (req, res) => {
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "sign in required" });
  if (!requireQwen(res)) return;

  const parsed = streamTitleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const result = await qwenChatJson<{ title: string; summary: string }>(
    [
      {
        role: "system",
        content:
          "You name live travel streams for Guidemate. Given a topic, write one punchy, specific title (max 60 " +
          'chars, no emojis unless natural) and a one-line summary. Respond ONLY with JSON: {"title": string, "summary": string}.',
      },
      { role: "user", content: `Topic: "${parsed.data.topic}"` },
    ],
    { temperature: 0.7 }
  );

  if (!result?.title) {
    return res.status(502).json({ error: "AI could not suggest a title. Try again." });
  }
  return res.json({ title: result.title.slice(0, 80), summary: result.summary ?? "" });
});

const translateSchema = z.object({
  text: z.string().min(1).max(5000),
  targetLang: z.string().min(2).max(40).default("English"),
});

/** Translate arbitrary text (listing copy or chat messages) to a target language. */
aiRouter.post("/translate", async (req, res) => {
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "sign in required" });
  if (!requireQwen(res)) return;

  const parsed = translateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { text, targetLang } = parsed.data;

  const translated = await qwenChat(
    [
      {
        role: "system",
        content:
          `Translate the user's text into ${targetLang}. Preserve meaning and tone. ` +
          "Return ONLY the translated text, with no quotes, notes or explanations.",
      },
      { role: "user", content: text },
    ],
    { temperature: 0.2 }
  );

  if (!translated) return res.status(502).json({ error: "Translation failed. Try again." });
  return res.json({ translated, targetLang });
});
