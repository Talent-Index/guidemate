"use client";

import { useState } from "react";
import { aiTranslate } from "@/lib/api";

/** Maps the viewer's browser locale to a language name Qwen understands. */
function browserLanguageName(): string {
  if (typeof navigator === "undefined") return "English";
  const code = (navigator.language || "en").split("-")[0].toLowerCase();
  const names: Record<string, string> = {
    en: "English",
    sw: "Swahili",
    fr: "French",
    es: "Spanish",
    de: "German",
    pt: "Portuguese",
    ar: "Arabic",
    zh: "Chinese",
    hi: "Hindi",
    it: "Italian",
    ja: "Japanese",
    ko: "Korean",
    ru: "Russian",
    nl: "Dutch",
    tr: "Turkish",
  };
  return names[code] ?? "English";
}

/**
 * Inline "Translate" control. Requires a signed-in access token (the AI
 * endpoint is authenticated). Shows translated text with a toggle back to
 * the original.
 */
export function TranslateText({
  text,
  accessToken,
  targetLang,
  className = "",
  linkClassName = "text-xs font-semibold text-brand-accent hover:underline",
}: {
  text: string;
  accessToken?: string;
  targetLang?: string;
  className?: string;
  linkClassName?: string;
}) {
  const [translated, setTranslated] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!accessToken) return null;

  async function handleTranslate() {
    if (translated) {
      setShowOriginal((v) => !v);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const lang = targetLang || browserLanguageName();
      const res = await aiTranslate(text, lang, accessToken!);
      setTranslated(res.translated);
      setShowOriginal(false);
    } catch (err) {
      setError((err as Error).message ?? "Translation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className={className}>
      {translated && !showOriginal && (
        <span className="mb-1 block whitespace-pre-wrap">{translated}</span>
      )}
      <button type="button" onClick={handleTranslate} disabled={loading} className={linkClassName}>
        {loading
          ? "Translating…"
          : translated
            ? showOriginal
              ? "Show translation"
              : "Show original"
            : "Translate"}
      </button>
      {error && <span className="ml-2 text-xs text-red-600">{error}</span>}
    </span>
  );
}
