import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mic, MicOff, PhoneOff, Trash2, Zap, Volume2 } from "lucide-react";

import { useFazenda } from "@/lib/cloud/fazenda";
import { useLotes } from "@/lib/state";
import { useLiveVoice, type LiveEvent } from "@/hooks/use-live-voice";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageAction,
  MessageActions,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import logo from "@/assets/logo-aviario-pro.png";

export const Route = createFileRoute("/agro-ia")({
  head: () => ({
    meta: [
      { title: "Assistente por voz e texto — Aviário Pro" },
      {
        name: "description",
        content:
          "Converse com o assistente avícola sobre peso, ração, mortalidade e manejo da sua granja.",
      },
      { property: "og:title", content: "Assistente por voz e texto — Aviário Pro" },
      {
        property: "og:description",
        content: "Orientação avícola com dados reais dos lotes e conversa por voz.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgroIAPage,
});
const suggestions = [
  "Como está o lote? Priorize os riscos de hoje.",
  "Compare as últimas pesagens e o ganho diário.",
  "Quanto tempo a ração deve durar?",
  "Monte as três prioridades de manejo desta semana.",
];
type Caption = { role: "user" | "assistant"; text: string; start: number; end: number };
const labels = {
  idle: "Pronto para conversar",
  connecting: "Conectando…",
  connected: "Conversa em andamento",
  stopping: "Encerrando…",
  closed: "Conversa encerrada",
};
function AgroIAPage() {
  const { codigo, fazendaId, fazendaNome } = useFazenda();
  const [lotes] = useLotes();
  const [selected, setSelected] = useState("ativo");

  const [input, setInput] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [seconds, setSeconds] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const storageKey = `aviario:ia:${fazendaId ?? "sem-acesso"}`;
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/poultry-chat",
        body: { codigo, ...(selected !== "ativo" ? { numeroLote: selected } : {}) },
      }),
    [codigo, selected],
  );
  const { messages, setMessages, sendMessage, status, stop } = useChat({
    id: storageKey,
    transport,
    onError: (err) => setError(err.message),
    onFinish: () => inputRef.current?.focus(),
  });
  const loading = status === "submitted" || status === "streaming";
  useEffect(() => {
    setReady(false);
    setMessages([]);
    setError(null);
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      if (Array.isArray(stored))
        setMessages(
          stored
            .map((m, i) =>
              m.parts
                ? m
                : { id: `legacy-${i}`, role: m.role, parts: [{ type: "text", text: m.content }] },
            )
            .filter((m) => ["user", "assistant"].includes(m.role) && Array.isArray(m.parts)),
        );
    } catch {
      /* empty history */
    }
    setReady(true);
  }, [storageKey, setMessages]);
  useEffect(() => {
    if (ready && !loading) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages));
      } catch {
        /* unavailable */
      }
    }
  }, [messages, ready, loading, storageKey]);
  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);
  function onEvent(event: LiveEvent) {
    if (event.type === "app.delegation.pending") setPending(true);
    if (
      event.type === "app.poultry.facts" ||
      event.type === "app.closed" ||
      event.type === "app.error"
    )
      setPending(false);
    if (event.type === "gateway.session.created") setSeconds(15);
    if (
      (event.type === "session.usage.updated" || event.type === "session.closed") &&
      typeof event.usage?.seconds === "number"
    )
      setSeconds(Math.max(15, event.usage.seconds));
    if (
      event.type !== "session.input_transcript.delta" &&
      event.type !== "session.output_transcript.delta"
    )
      return;
    if (typeof event.delta !== "string") return;
    const delta = event.delta;
    const role = event.type === "session.input_transcript.delta" ? "user" : "assistant";
    const start = typeof event.start_ms === "number" ? event.start_ms : 0;
    const end = typeof event.end_ms === "number" ? event.end_ms : start;
    setCaptions((prev) => {
      const rows = prev.map((r) => ({ ...r }));
      let index = rows.findIndex(
        (r) => r.role === role && start >= r.start && start <= r.end + 1800,
      );
      if (index < 0 && rows.at(-1)?.role === role) index = rows.length - 1;
      if (index >= 0) {
        rows[index].text += delta;
        rows[index].end = Math.max(end, rows[index].end);
      } else rows.push({ role, text: delta, start, end });
      return rows;
    });
  }
  const voice = useLiveVoice({
    codigo: codigo ?? undefined,
    numeroLote: selected === "ativo" ? undefined : selected,
    onEvent,
  });
  const canStart = voice.status === "idle" || voice.status === "closed";
  async function send(text: string) {
    const t = text.trim();
    if (!t || loading || !codigo) return;
    setInput("");
    setError(null);
    inputRef.current?.focus();
    await sendMessage({ text: t });
  }
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Aviário Pro" className="size-12 rounded-lg object-contain" />
            <div>
              <h1 className="font-display text-3xl">Assistente avícola</h1>
              <p className="text-sm text-muted-foreground">{fazendaNome ?? "Sua granja"}</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/automacoes">
              <Zap /> Automações
            </Link>
          </Button>
        </header>
        <section className="border-y border-primary/30 py-5" aria-label="Conversa por voz">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl flex items-center gap-2">
                <Mic className="size-5 text-primary" /> Conversar por voz
              </h2>
              <p role="status" className="mt-1 text-sm text-muted-foreground">
                {labels[voice.status]}
                {pending ? " · Consultando o lote…" : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canStart ? (
                <Button
                  disabled={!codigo || loading}
                  onClick={() => {
                    setCaptions([]);
                    setSeconds(null);
                    voice.start();
                  }}
                >
                  <Mic /> Iniciar conversa
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    disabled={voice.status !== "connected"}
                    aria-label={voice.muted ? "Ativar microfone" : "Silenciar microfone"}
                    title={voice.muted ? "Ativar microfone" : "Silenciar microfone"}
                    onClick={() => voice.setMuted(!voice.muted)}
                  >
                    {voice.muted ? <MicOff /> : <Mic />}
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={voice.status === "stopping"}
                    onClick={voice.stop}
                  >
                    <PhoneOff /> Encerrar
                  </Button>
                </>
              )}
              {voice.playbackBlocked && (
                <Button onClick={voice.resumePlayback}>
                  <Volume2 /> Ouvir voz
                </Button>
              )}
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            O microfone é usado para ouvir sua fala. A conversa utiliza créditos de IA, com cobrança
            mínima de 15 segundos.
          </p>
          <audio
            ref={voice.audioRef}
            controls
            className="mt-3 h-9 w-full max-w-sm"
            aria-label="Áudio do assistente"
          />
          {seconds !== null && (
            <p className="mt-2 text-xs text-muted-foreground">
              Uso de voz informado: {Math.ceil(seconds)} s
              {voice.finalized === false ? " · Total final não confirmado" : ""}
            </p>
          )}
          {voice.error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {voice.error}
            </p>
          )}
          {captions.length > 0 && (
            <Conversation className="mt-4 h-52">
              <ConversationContent className="gap-3 p-0">
                {captions.map((c, i) => (
                  <Message key={i} from={c.role}>
                    <MessageContent>
                      <span className="text-xs text-muted-foreground">
                        {c.role === "user" ? "Você" : "Assistente"}
                      </span>
                      <MessageResponse>{c.text}</MessageResponse>
                    </MessageContent>
                  </Message>
                ))}
              </ConversationContent>
              <ConversationScrollButton aria-label="Última fala" />
            </Conversation>
          )}
        </section>
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Select value={selected} onValueChange={setSelected} disabled={loading || !canStart}>
              <SelectTrigger className="w-56" aria-label="Lote consultado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Lote ativo</SelectItem>
                {lotes.map((l) => (
                  <SelectItem key={l.id} value={l.numero}>
                    Lote {l.numero}
                    {l.encerrado ? " · Encerrado" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="icon"
              variant="ghost"
              title="Limpar conversa"
              aria-label="Limpar conversa"
              disabled={loading}
              onClick={() => {
                if (confirm("Limpar a conversa de texto?")) {
                  setMessages([]);
                  setError(null);
                }
              }}
            >
              <Trash2 />
            </Button>
          </div>
          <Conversation className="h-[440px] border-y border-border">
            <ConversationContent className="gap-5 py-5">
              {!messages.length && (
                <div className="py-8">
                  <h2 className="font-display text-2xl mb-5">O que vamos conferir no lote?</h2>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {suggestions.map((s) => (
                      <Button
                        key={s}
                        variant="outline"
                        className="h-auto min-h-14 whitespace-normal justify-start text-left"
                        disabled={!codigo || loading}
                        onClick={() => void send(s)}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <Message key={i} from={m.role}>
                  <MessageContent className="group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground">
                    {m.parts.map((part, j) =>
                      part.type === "text" ? (
                        <MessageResponse key={j}>{part.text}</MessageResponse>
                      ) : part.type === "reasoning" ? (
                        <details key={j} className="text-sm text-muted-foreground">
                          <summary>Raciocínio</summary>
                          <MessageResponse>{part.text}</MessageResponse>
                        </details>
                      ) : null,
                    )}
                  </MessageContent>
                  {m.role === "assistant" && (
                    <MessageActions>
                      <MessageAction
                        tooltip="Copiar resposta"
                        onClick={() =>
                          void navigator.clipboard.writeText(
                            m.parts
                              .filter((p) => p.type === "text")
                              .map((p) => p.text)
                              .join("\n"),
                          )
                        }
                      >
                        Copiar
                      </MessageAction>
                    </MessageActions>
                  )}
                </Message>
              ))}
              {loading && <Shimmer>Consultando os dados da granja…</Shimmer>}
            </ConversationContent>
            <ConversationScrollButton aria-label="Última mensagem" />
          </Conversation>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <PromptInput onSubmit={({ text }) => send(text)}>
            <PromptInputTextarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!codigo}
              placeholder="Pergunte sobre peso, ração, água ou manejo…"
              aria-label="Pergunta para o assistente"
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit
                aria-label={loading ? "Interromper resposta" : "Enviar pergunta"}
                status={status}
                onClick={
                  loading
                    ? (e) => {
                        e.preventDefault();
                        stop();
                      }
                    : undefined
                }
                disabled={!codigo || (!loading && !input.trim())}
              />
            </PromptInputFooter>
          </PromptInput>
          <p className="text-xs text-muted-foreground">
            Decisões sanitárias devem ser confirmadas com o veterinário responsável.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
