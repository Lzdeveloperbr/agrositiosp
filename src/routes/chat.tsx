import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, MessagesSquare, Users } from "lucide-react";
import { toast } from "sonner";
import { useFazenda } from "@/lib/cloud/fazenda";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat da Equipe — AgroSítio" },
      { name: "description", content: "Converse em tempo real com toda a equipe da fazenda. Histórico permanente, sem apagar mensagens." },
      { property: "og:title", content: "Chat da Equipe — AgroSítio" },
      { property: "og:description", content: "Converse em tempo real com toda a equipe da fazenda. Histórico permanente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChatPage,
});

type Mensagem = { id: string; autor: string; texto: string; created_at: string };

function iniciais(n: string) {
  const p = n.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "?") + (p[1]?.[0] ?? "")).toUpperCase();
}

function corDe(n: string) {
  let h = 0;
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % 360;
  return `oklch(0.72 0.14 ${h})`;
}

function diaLabel(iso: string) {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date(Date.now() - 864e5);
  const eq = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (eq(d, hoje)) return "Hoje";
  if (eq(d, ontem)) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function ChatPage() {
  const { client, fazendaId, fazendaNome, operador, setOperador } = useFazenda();
  const [msgs, setMsgs] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [nome, setNome] = useState(operador);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setNome(operador), [operador]);

  useEffect(() => {
    if (!fazendaId) { setCarregando(false); return; }
    let cancel = false;
    setCarregando(true);
    client
      .from("mensagens")
      .select("id, autor, texto, created_at")
      .order("created_at", { ascending: true })
      .limit(500)
      .then(({ data, error }) => {
        if (cancel) return;
        setCarregando(false);
        if (error) { console.error("[mensagens]", error); return; }
        setMsgs((data as Mensagem[]) ?? []);
      });

    const ch = client
      .channel(`rt:mensagens:${fazendaId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensagens", filter: `fazenda_id=eq.${fazendaId}` },
        (payload) => {
          const m = payload.new as Mensagem;
          setMsgs((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
        },
      )
      .subscribe();

    return () => { cancel = true; client.removeChannel(ch); };
  }, [client, fazendaId]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs.length]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const participantes = useMemo(
    () => Array.from(new Set(msgs.map((m) => m.autor))).filter(Boolean),
    [msgs],
  );

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    const autor = (nome || operador).trim();
    if (!t) return;
    if (!autor) { toast.error("Informe seu nome antes de enviar."); return; }
    if (t.length > 2000) { toast.error("Mensagem muito longa (máx. 2000 caracteres)."); return; }
    if (!fazendaId) { toast.error("Entre em uma fazenda para usar o chat."); return; }

    if (autor !== operador) setOperador(autor);
    setEnviando(true);
    setTexto("");
    const { error } = await client.from("mensagens").insert({ fazenda_id: fazendaId, autor, texto: t });
    setEnviando(false);
    if (error) {
      console.error("[mensagens] insert", error);
      toast.error("Não foi possível enviar a mensagem.");
      setTexto(t);
    }
    inputRef.current?.focus();
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <MessagesSquare className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Chat da Equipe</h1>
              <p className="text-xs text-muted-foreground">
                {fazendaNome ? `${fazendaNome} · ` : ""}tempo real · histórico permanente
              </p>
            </div>
          </div>
          {participantes.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Users className="size-3" /> {participantes.length} participante{participantes.length > 1 ? "s" : ""}
            </Badge>
          )}
        </header>

        <Card className="flex h-[calc(100dvh-16rem)] min-h-[420px] flex-col overflow-hidden">
          <div className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
            {carregando && <p className="py-8 text-center text-sm text-muted-foreground">Carregando mensagens…</p>}
            {!carregando && msgs.length === 0 && (
              <div className="py-12 text-center">
                <MessagesSquare className="mx-auto mb-3 size-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda. Comece a conversa!</p>
              </div>
            )}
            {msgs.map((m, i) => {
              const meu = m.autor === (nome || operador);
              const novoDia = i === 0 || diaLabel(msgs[i - 1].created_at) !== diaLabel(m.created_at);
              const mesmoAutor = !novoDia && i > 0 && msgs[i - 1].autor === m.autor;
              return (
                <div key={m.id}>
                  {novoDia && (
                    <div className="my-4 flex items-center gap-3">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {diaLabel(m.created_at)}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  <div className={`flex items-end gap-2 ${meu ? "flex-row-reverse" : ""}`}>
                    <div
                      className={`grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-background ${mesmoAutor ? "invisible" : ""}`}
                      style={{ background: corDe(m.autor) }}
                      aria-hidden={mesmoAutor}
                    >
                      {iniciais(m.autor)}
                    </div>
                    <div className={`max-w-[78%] ${meu ? "text-right" : ""}`}>
                      {!mesmoAutor && (
                        <p className="mb-1 px-1 text-[11px] font-semibold text-muted-foreground">{m.autor}</p>
                      )}
                      <div
                        className={`inline-block whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                          meu
                            ? "rounded-br-sm bg-primary text-primary-foreground"
                            : "rounded-bl-sm bg-muted text-foreground"
                        }`}
                      >
                        {m.texto}
                      </div>
                      <p className="mt-1 px-1 text-[10px] text-muted-foreground">
                        {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={fimRef} />
          </div>

          <form onSubmit={enviar} className="space-y-2 border-t bg-card/60 p-3">
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
              maxLength={40}
              className="h-9 max-w-[220px] text-xs"
            />
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Escreva uma mensagem…"
                maxLength={2000}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={enviando || !texto.trim()} aria-label="Enviar mensagem">
                <Send className="size-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              As mensagens ficam salvas para sempre e são visíveis para todos da fazenda.
            </p>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
