"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  MessageSquare,
  Phone,
  Plus,
  Search,
  Send,
} from "lucide-react";
import { errorText, useToast } from "@/components/Feedback";
import {
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  PageHeader,
  Panel,
  TextField,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useCall } from "@/lib/call-context";
import type {
  ChatMessage,
  CommsPerson,
  ConversationSummary,
} from "@/lib/comms-types";
import { ROLE_LABEL } from "@/lib/roles";
import { useCommsSocket, COMMS_CHANNEL } from "@/lib/use-comms-socket";
import { USE_MOCK } from "@/lib/mock-mode";
import { cn } from "@/lib/cn";

function formatTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("fr-TN", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function MessagesInbox({
  initialPeerUserId,
  initialParcelId,
  autoStartCall = false,
}: {
  initialPeerUserId?: number;
  initialParcelId?: number;
  autoStartCall?: boolean;
} = {}) {
  const { session } = useAuth();
  const toast = useToast();
  const { startCall, phase } = useCall();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [dirQuery, setDirQuery] = useState("");
  const [directory, setDirectory] = useState<CommsPerson[]>([]);
  const [typingPeer, setTypingPeer] = useState(false);
  const [onlineIds, setOnlineIds] = useState<Set<number>>(new Set());
  const [callArmed, setCallArmed] = useState(autoStartCall);

  const token = session?.accessToken;
  const meId = session?.user.id;
  const role = session?.user.role;
  const peerChatOnly = role === "LIVREUR" || role === "CLIENT";

  const reloadInbox = useCallback(async () => {
    if (!token) return;
    try {
      const list = await apiFetch<ConversationSummary[]>("/conversations", {
        token,
      });
      setConversations(list);
      setError(null);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadMessages = useCallback(
    async (conversationId: number) => {
      if (!token) return;
      const res = await apiFetch<{ items: ChatMessage[] }>(
        `/conversations/${conversationId}/messages`,
        { token },
      );
      setMessages(res.items);
    },
    [token],
  );

  useEffect(() => {
    void reloadInbox();
  }, [reloadInbox]);

  useEffect(() => {
    if (!token || !initialPeerUserId) return;
    void (async () => {
      try {
        const created = await apiFetch<ConversationSummary>("/conversations", {
          method: "POST",
          token,
          body: JSON.stringify({
            peerUserId: initialPeerUserId,
            parcelId: initialParcelId,
          }),
        });
        await reloadInbox();
        setActiveId(created.id);
      } catch (err) {
        toast.error("Conversation impossible", errorText(err));
      }
    })();
  }, [initialPeerUserId, initialParcelId, reloadInbox, toast, token]);

  useEffect(() => {
    if (activeId == null) return;
    void loadMessages(activeId).catch((err) =>
      toast.error("Messages", errorText(err)),
    );
  }, [activeId, loadMessages, toast]);

  useEffect(() => {
    if (!callArmed || activeId == null || phase !== "idle") return;
    setCallArmed(false);
    void startCall(activeId).catch((err) =>
      toast.error("Appel", errorText(err)),
    );
  }, [activeId, callArmed, phase, startCall, toast]);

  const { emit, connected } = useCommsSocket({
    onMessageNew: (payload) => {
      if (payload.conversationId === activeId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.message.id)) return prev;
          return [...prev, payload.message];
        });
      }
      void reloadInbox();
    },
    onTyping: (payload) => {
      if (payload.conversationId === activeId) {
        setTypingPeer(payload.typing);
      }
    },
    onPresence: (payload) => {
      setOnlineIds((prev) => {
        const next = new Set(prev);
        if (payload.online) next.add(payload.userId);
        else next.delete(payload.userId);
        return next;
      });
    },
  });

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  async function searchDirectory(q: string) {
    if (!token) return;
    setDirQuery(q);
    try {
      const rows = await apiFetch<CommsPerson[]>(
        `/users/directory?q=${encodeURIComponent(q)}`,
        { token },
      );
      setDirectory(rows);
    } catch (err) {
      toast.error("Annuaire", errorText(err));
    }
  }

  async function openWith(peer: CommsPerson) {
    if (!token) return;
    try {
      const created = await apiFetch<ConversationSummary>("/conversations", {
        method: "POST",
        token,
        body: JSON.stringify({ peerUserId: peer.id }),
      });
      setDirectoryOpen(false);
      await reloadInbox();
      setActiveId(created.id);
    } catch (err) {
      toast.error("Ouverture impossible", errorText(err));
    }
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!token || activeId == null || !draft.trim()) return;
    setSending(true);
    try {
      const msg = await apiFetch<ChatMessage>(
        `/conversations/${activeId}/messages`,
        {
          method: "POST",
          token,
          body: JSON.stringify({ body: draft.trim() }),
        },
      );
      setDraft("");
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
      );
      if (USE_MOCK) {
        try {
          const ch = new BroadcastChannel(COMMS_CHANNEL);
          ch.postMessage({
            event: "message:new",
            payload: { conversationId: activeId, message: msg },
            fromUserId: meId,
          });
          ch.close();
        } catch {
          /* ignore */
        }
      }
      await reloadInbox();
    } catch (err) {
      toast.error("Envoi impossible", errorText(err));
    } finally {
      setSending(false);
    }
  }

  let typingTimer: ReturnType<typeof setTimeout> | null = null;
  function onDraftChange(value: string) {
    setDraft(value);
    if (activeId == null) return;
    emit("typing", { conversationId: activeId, typing: true });
    if (typingTimer) clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      emit("typing", { conversationId: activeId, typing: false });
    }, 1200);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        description={
          peerChatOnly
            ? role === "LIVREUR"
              ? "Chat et appels directs avec vos clients de livraison."
              : "Chat et appels directs avec votre livreur."
            : "Messagerie temps réel et appels audio Umbrella."
        }
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={connected ? "success" : "warning"}>
              {connected ? "En ligne" : "Hors ligne"}
            </Badge>
            <Button
              icon={Plus}
              onClick={() => {
                setDirectoryOpen(true);
                void searchDirectory("");
              }}
            >
              Nouveau
            </Button>
          </div>
        }
      />

      {error ? (
        <ErrorBanner message={error} onRetry={() => void reloadInbox()} />
      ) : null}
      {loading ? <LoadingBlock rows={3} /> : null}

      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <Panel className="max-h-[70vh] overflow-y-auto p-0">
          {conversations.length === 0 && !loading ? (
            <div className="p-4">
              <EmptyState
                icon={MessageSquare}
                title="Aucune conversation"
                description={
                  peerChatOnly
                    ? "Ouvrez un colis pour contacter l’autre partie, ou créez un fil via Nouveau."
                    : "Démarrez un fil avec un utilisateur Umbrella."
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-ops-card">
              {conversations.map((c) => {
                const online = c.peer ? onlineIds.has(c.peer.id) : false;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(c.id)}
                      className={cn(
                        "flex w-full flex-col gap-0.5 px-4 py-3 text-left transition hover:bg-ops-page/80",
                        activeId === c.id && "bg-ops-accent/10",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold text-ops-ink">
                          {c.peer?.name ?? "Contact"}
                        </span>
                        {c.unread > 0 ? (
                          <Badge tone="brand">{c.unread}</Badge>
                        ) : null}
                      </div>
                      <span className="truncate text-xs text-ops-ink/45">
                        {c.lastMessage?.body ?? "—"}
                      </span>
                      <span className="text-[10px] uppercase tracking-wide text-ops-ink/35">
                        {c.peer ? ROLE_LABEL[c.peer.role] : ""}
                        {online ? " · en ligne" : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel className="flex min-h-[28rem] max-h-[70vh] flex-col p-0">
          {!active ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                icon={MessageSquare}
                title="Sélectionnez une conversation"
                description="Ou créez-en une nouvelle."
              />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-ops-card px-4 py-3">
                <div>
                  <p className="font-semibold text-ops-ink">
                    {active.peer?.name}
                  </p>
                  <p className="text-xs text-ops-ink/45">
                    {active.peer ? ROLE_LABEL[active.peer.role] : ""}
                    {typingPeer ? " · écrit…" : ""}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Phone}
                  disabled={phase !== "idle"}
                  onClick={() => void startCall(active.id).catch((err) => toast.error("Appel", errorText(err)))}
                >
                  Appeler
                </Button>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
                {messages.map((m) => {
                  const mine = m.senderId === meId;
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "flex",
                        mine ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                          mine
                            ? "bg-ops-accent text-white"
                            : "bg-ops-page text-ops-ink",
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        <p
                          className={cn(
                            "mt-1 text-[10px]",
                            mine ? "text-white/70" : "text-ops-ink/40",
                          )}
                        >
                          {formatTime(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form
                onSubmit={(e) => void onSend(e)}
                className="flex gap-2 border-t border-ops-card p-3"
              >
                <input
                  value={draft}
                  onChange={(e) => onDraftChange(e.target.value)}
                  placeholder="Écrire un message…"
                  className="w-full rounded-xl border border-ops-card bg-ops-page px-3 py-2.5 text-sm text-ops-ink outline-none ring-ops-accent focus:ring-2"
                />
                <Button type="submit" icon={Send} loading={sending} disabled={!draft.trim()}>
                  Envoyer
                </Button>
              </form>
            </>
          )}
        </Panel>
      </div>

      {directoryOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <Panel className="w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-ops-ink">
                Nouvelle conversation
              </h2>
              <Button variant="secondary" size="sm" onClick={() => setDirectoryOpen(false)}>
                Fermer
              </Button>
            </div>
            <TextField
              label="Rechercher"
              value={dirQuery}
              onChange={(e) => void searchDirectory(e.target.value)}
              placeholder="Nom, email, téléphone…"
            />
            <ul className="max-h-72 divide-y divide-ops-card overflow-y-auto rounded-xl border border-ops-card">
              {directory.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-ops-page"
                    onClick={() => void openWith(u)}
                  >
                    <span>
                      <span className="block font-medium text-ops-ink">{u.name}</span>
                      <span className="text-xs text-ops-ink/45">
                        {ROLE_LABEL[u.role]} · {u.email}
                      </span>
                    </span>
                    <Search className="h-4 w-4 text-ops-ink/30" aria-hidden />
                  </button>
                </li>
              ))}
              {directory.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-ops-ink/45">
                  Aucun utilisateur
                </li>
              ) : null}
            </ul>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
