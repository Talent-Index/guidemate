"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { getChat, sendChatMessage, type ChatMessage } from "@/lib/api";

export function ChatPanel({
  bookingId,
  accessToken,
  currentUserId,
}: {
  bookingId: string;
  accessToken: string;
  currentUserId: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      getChat(bookingId, accessToken)
        .then(({ messages: latest }) => {
          if (!cancelled) {
            setMessages(latest);
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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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

  if (loading) return <p className="text-sm text-brand-muted">Loading chat…</p>;

  return (
    <div className="mt-4 rounded-xl border border-brand-border bg-brand-bg/50">
      <div className="border-b border-brand-border px-4 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">In-app messages</p>
      </div>
      <div className="max-h-56 space-y-2 overflow-y-auto px-4 py-3">
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
        <div ref={bottomRef} />
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
