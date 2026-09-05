"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { getChat, sendChatMessage, type ChatMessage } from "@/lib/api";

export function ChatPanel({
  bookingId,
  accessToken,
  currentUserId,
  variant = "embedded",
}: {
  bookingId: string;
  accessToken: string;
  currentUserId: string;
  variant?: "embedded" | "page";
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastScrolledIdRef = useRef<string | null>(null);
  const isPage = variant === "page";

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      getChat(bookingId, accessToken)
        .then(({ messages: latest }) => {
          if (!cancelled) {
            setMessages((prev) => {
              if (
                prev.length === latest.length &&
                prev.every((m, i) => m.id === latest[i]?.id && m.body === latest[i]?.body)
              ) {
                return prev;
              }
              return latest;
            });
            setLoading(false);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError((err as Error).message);
            setLoading(false);
          }
        });
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [bookingId, accessToken]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.id === lastScrolledIdRef.current) return;
    lastScrolledIdRef.current = last.id;
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setSending(true);
    setError(null);
    try {
      const { message } = await sendChatMessage(bookingId, trimmed, accessToken);
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      setBody("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  const shellClass = isPage
    ? "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-brand-border bg-brand-bg/50"
    : "mt-4 rounded-xl border border-brand-border bg-brand-bg/50";

  const listClass = isPage
    ? "min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4"
    : "max-h-56 space-y-2 overflow-y-auto px-4 py-3";

  if (loading) {
    return (
      <div className={shellClass}>
        {!isPage && (
          <div className="border-b border-brand-border px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">In-app messages</p>
          </div>
        )}
        <p className={`text-center text-sm text-brand-muted ${isPage ? "flex flex-1 items-center justify-center py-16" : "px-4 py-8"}`}>
          Loading chat…
        </p>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      {!isPage && (
        <div className="border-b border-brand-border px-4 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">In-app messages</p>
        </div>
      )}
      <div ref={listRef} className={listClass}>
        {messages.length === 0 && (
          <p className="text-center text-sm text-brand-muted">Say hello — coordinate your meetup here.</p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.senderId === currentUserId ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                msg.senderId === currentUserId
                  ? "bg-brand-accent text-white"
                  : "bg-white text-brand-blueDark shadow-sm"
              }`}
            >
              {msg.body}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} className="flex gap-2 border-t border-brand-border p-3">
        <input
          className="form-input-light flex-1 text-sm"
          placeholder="Type a message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
        />
        <Button type="submit" variant="primary" disabled={sending || !body.trim()}>
          Send
        </Button>
      </form>
      {error && <p className="px-3 pb-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
