import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Loader2, Trash2, RefreshCw, Bot, User } from "lucide-react";
import { toast } from "sonner";
import { chatAgroIA, type ChatMsg } from "@/lib/agroChat.functions";
import { useLotes, useEstoque, useFinanceiro, useTarefas } from "@/lib/state";
import { hojeISO, diffDias } from "@/lib/data";

export const Route = createFileRoute("/agro-ia")({
  head: () => ({
    meta: [
      { property: "og:title", content: "Assistente avícola — Assistente Especialista | Aviário Pro" },
      { property: "og:description", content: "Chat IA especialista em frango de corte com contexto real da sua fazenda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Assistente avícola — Assistente Especialista | Aviário Pro" },
      { name: "description", content: "Chat IA especialista em frango de corte com contexto real da sua fazenda." },
    ],
  }),
  component: AgroIAPage,
});

const SUGESTOES = [
  "Como está meu lote ativo? Algum alerta?",
  "Qual o consumo de ração esperado pros próximos 7 dias?",
  "Calcula a CA atual e compara com a meta da linhagem",
  "Quais cuidados sanitários preciso conferir no lote?",
  "Sugere um plano de manejo pra esta semana",
  "Meu lote está pronto para o abate?",
];

function AgroIAPage() {
  const fn = useServerFn(chatAgroIA);
  const [lotes] = useLotes();
  const [estoque] = useEstoque();
  const [fin] = useFinanceiro();
  const [tarefas] = useTarefas();

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try { localStorage.setItem("agro:ia:chat", JSON.stringify(messages.slice(-30))); } catch {}
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const context = useMemo(() => {
    const ativo = lotes.find((l) => !l.encerrado) ?? lotes[0];
    const mortAcum = ativo ? ativo.entries.reduce((s, e) => s + (e.mortalidade ?? 0) + (e.eliminados ?? 0), 0) : 0;
    const vivas = ativo ? Math.max(0, ativo.quantidadeInicial - mortAcum) : 0;
    const dias = ativo ? Math.max(0, diffDias(ativo.dataEntrada)) : 0;
    const pesoUlt = ativo?.entries.slice().sort((a,b) => a.date.localeCompare(b.date)).reverse().find((e) => e.pesoMedioG)?.pesoMedioG ?? null;
    const lancMes = fin.filter((l) => l.data?.startsWith(new Date().toISOString().slice(0, 7)));
    return JSON.stringify({
      data: hojeISO(),
      granja_lote_ativo: ativo ? {
        numero: ativo.numero,
        integradora: ativo.integradora ?? null,
        alojadas: ativo.quantidadeInicial,
        vivas, mortalidade_acum: mortAcum,
        mortalidade_pct: ativo.quantidadeInicial ? +(mortAcum / ativo.quantidadeInicial * 100).toFixed(2) : 0,
        dias_de_vida: dias,
        peso_ultimo_g: pesoUlt,
        previsao_abate_dias: ativo.previsaoAbateDias,
        data_alojamento: ativo.dataEntrada,
      } : null,
      estoque_baixo: estoque.filter((i) => i.minimo != null && i.quantidade <= (i.minimo ?? 0)).map((i) => ({ nome: i.nome, qtd: i.quantidade, un: i.unidade })),
      financeiro_mes: {
        receitas: lancMes.filter((l) => l.tipo === "receita").reduce((s, l) => s + l.valor, 0),
        despesas: lancMes.filter((l) => l.tipo === "despesa").reduce((s, l) => s + l.valor, 0),
      },
      tarefas_pendentes: tarefas.filter((t) => !t.concluida).length,
    });
  }, [lotes, estoque, fin, tarefas]);

  async function enviar(texto?: string) {
    const t = (texto ?? input).trim();
    if (!t || loading) return;
    const next: ChatMsg[] = [...messages, { role: "user", content: t }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const r = await fn({ data: { messages: next.slice(-12), context } });
      setMessages((m) => [...m, { role: "assistant", content: r.texto || "(sem resposta)" }]);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao consultar IA");
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${e.message ?? "Erro"}` }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function limpar() {
    if (!confirm("Limpar toda a conversa?")) return;
    setMessages([]);
    try { localStorage.removeItem("agro:ia:chat"); } catch {}
  }

  return (
    <AppShell>
      <div className="space-y-4 max-w-4xl mx-auto">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-accent" /> Assistente avícola
            </h1>
            <p className="text-muted-foreground mt-1">Consultor especialista 24/7 com acesso aos dados da sua fazenda.</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-[10px]"><Bot className="h-3 w-3 mr-1" /> Gemini 2.5 · contexto ao vivo</Badge>
            {messages.length > 0 && (
              <Button variant="outline" size="sm" onClick={limpar}><Trash2 className="h-4 w-4 mr-1" /> Limpar</Button>
            )}
          </div>
        </header>

        <Card className="p-0 overflow-hidden flex flex-col" style={{ minHeight: "60vh", background: "var(--gradient-surface)" }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: "65vh" }}>
            {messages.length === 0 && (
              <div className="text-center py-8 space-y-4">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl mx-auto" style={{ background: "var(--gradient-accent)" }}>
                  <Sparkles className="h-8 w-8 text-accent-foreground" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-xl">Olá! Pergunte qualquer coisa sobre sua fazenda</h2>
                  <p className="text-sm text-muted-foreground mt-1">Peso, mortalidade, manejo e ração do lote.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-2 max-w-2xl mx-auto pt-2">
                  {SUGESTOES.map((s) => (
                    <button
                      key={s}
                      onClick={() => enviar(s)}
                      className="text-left text-sm p-3 rounded-lg border border-border hover:border-accent/50 hover:bg-accent/5 transition-colors"
                    >
                      <RefreshCw className="h-3.5 w-3.5 inline mr-2 text-accent" />{s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>
                  {m.role === "user" ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                </div>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-border rounded-tl-sm"}`}>
                  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMd(m.content) }} />
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center bg-accent text-accent-foreground">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 text-sm flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> pensando...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-border p-3 bg-background/50">
            <div className="flex gap-2 items-end">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                placeholder="Pergunta sobre manejo, ração, sanidade, finanças, clima..."
                rows={1}
                className="min-h-[44px] max-h-32 resize-none"
                disabled={loading}
              />
              <Button onClick={() => enviar()} disabled={loading || !input.trim()} size="lg" className="shrink-0">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
              Enter envia · Shift+Enter quebra linha · IA pode errar — confirme decisões críticas com seu veterinário.
            </p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function renderMd(s: string): string {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code class='px-1 py-0.5 rounded bg-muted text-xs'>$1</code>")
    .replace(/^### (.+)$/gm, "<h4 class='font-semibold mt-2'>$1</h4>")
    .replace(/^## (.+)$/gm, "<h3 class='font-semibold mt-2'>$1</h3>")
    .replace(/^\d+\.\s(.+)$/gm, "<li>$1</li>")
    .replace(/^[-•]\s(.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]+?<\/li>)/g, "<ul class='list-disc pl-5 my-1.5 space-y-0.5'>$1</ul>")
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}
