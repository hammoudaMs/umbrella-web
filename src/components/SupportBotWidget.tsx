"use client";

import { FormEvent, useEffect, useRef, useState, type ReactNode } from "react";
import { Bot, Loader2, Send, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/cn";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type BotResponse = {
  reply: string;
  suggestions?: string[];
};

function formatLine(line: string): ReactNode[] {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

export function SupportBotWidget() {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([
    "Où est mon colis ?",
    "Comment ouvrir une relance ?",
    "Changement de prix",
  ]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Bonjour — assistant Umbrella. Connecté : je peux retrouver vos colis, expliquer les statuts, et guider relance / prix.\nDonnez un code (UMB-…) ou posez une question.",
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const token = session?.accessToken;

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, busy]);

  if (!token) return null;

  async function send(text: string) {
    const message = text.trim();
    if (!message || !token || busy) return;
    const history = messages.slice(-10);
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    setBusy(true);
    try {
      const res = await apiFetch<BotResponse>("/support-bot/chat", {
        method: "POST",
        token,
        body: JSON.stringify({ message, history }),
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.reply },
      ]);
      if (res.suggestions?.length) setSuggestions(res.suggestions);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Assistant indisponible";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            msg.includes("401") || /auth|token|session/i.test(msg)
              ? "Session expirée — reconnectez-vous pour utiliser l’assistant."
              : `Je n’ai pas pu répondre (${msg}). Réessayez.`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <div className="pointer-events-none fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-3 z-[55] flex flex-col items-end gap-2 lg:bottom-5 lg:right-5">
      {open ? (
        <div
          className="pointer-events-auto flex h-[min(32rem,70vh)] w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-ops-card bg-ops-surface shadow-[0_16px_48px_rgba(0,0,0,0.28)]"
          role="dialog"
          aria-label="Assistant Umbrella"
        >
          <header className="flex items-center justify-between gap-2 border-b border-ops-card bg-ops-accent px-3 py-2.5 text-white">
            <div className="flex min-w-0 items-center gap-2">
              <Bot className="h-5 w-5 shrink-0" aria-hidden />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">Assistant</p>
                <p className="truncate text-[11px] text-white/75">
                  Session authentifiée
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-white/90 transition hover:bg-white/15"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={cn(
                  "max-w-[92%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap",
                  m.role === "user"
                    ? "ml-auto bg-ops-accent text-white"
                    : "mr-auto bg-ops-page text-ops-ink",
                )}
              >
                {m.content.split("\n").map((line, li) => (
                  <span key={li} className="block">
                    {formatLine(line)}
                    {line === "" ? <span className="block h-2" /> : null}
                  </span>
                ))}
              </div>
            ))}
            {busy ? (
              <p className="inline-flex items-center gap-1.5 text-xs text-ops-ink/45">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Réflexion…
              </p>
            ) : null}
            <div ref={bottomRef} />
          </div>

          {!busy && suggestions.length ? (
            <div className="flex flex-wrap gap-1.5 border-t border-ops-card px-3 py-2">
              {suggestions.slice(0, 4).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="rounded-full border border-ops-card bg-ops-page px-2.5 py-1 text-[11px] font-semibold text-ops-ink/70 transition hover:border-ops-accent/40 hover:text-ops-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}

          <form
            onSubmit={onSubmit}
            className="flex items-end gap-2 border-t border-ops-card p-2.5"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Votre question…"
              maxLength={2000}
              disabled={busy}
              className="min-h-10 flex-1 rounded-xl border border-ops-card bg-ops-page px-3 py-2 text-sm text-ops-ink outline-none ring-ops-accent focus:ring-2 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ops-accent text-white transition hover:bg-ops-accent-soft disabled:opacity-40"
              aria-label="Envoyer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto inline-flex h-12 items-center gap-2 rounded-full bg-ops-accent px-4 text-sm font-bold text-white shadow-[0_10px_28px_rgba(153,18,17,0.4)] transition hover:bg-ops-accent-soft"
        aria-expanded={open}
        aria-label={open ? "Fermer l’assistant" : "Ouvrir l’assistant"}
      >
        {open ? <X className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
        <span className="hidden sm:inline">{open ? "Fermer" : "Aide"}</span>
      </button>
    </div>
  );
}
