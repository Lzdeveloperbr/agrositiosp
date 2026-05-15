import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ClipboardList, Sparkles, FileText, RefreshCw, History, Calendar } from "lucide-react";
import {
  perguntasDoDia, carregarQuiz, salvarQuiz, listarQuizzes, rotuloResposta,
  type Pergunta, type QuizDia, type RespostasQuiz,
} from "@/lib/quizQuestions";
import { gerarInsightAgro } from "@/lib/ai.functions";
import { gerarPdfQuizDiario } from "@/lib/quizPdf";

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [
      { title: "Quiz Diário com IA — AgroSítio" },
      { name: "description", content: "Responda ao quiz diário do sítio e gere automaticamente um relatório profissional em PDF analisado por IA." },
      { property: "og:title", content: "Quiz Diário com IA — AgroSítio" },
      { property: "og:description", content: "Quiz diário inteligente: a IA analisa as respostas e gera um relatório em PDF do dia." },
    ],
  }),
  component: QuizPage,
});

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function QuizPage() {
  const [data, setData] = useState(hojeISO());
  const perguntas = useMemo(() => perguntasDoDia(data, 10), [data]);
  const [respostas, setRespostas] = useState<RespostasQuiz>({});
  const [analise, setAnalise] = useState<string>("");
  const [carregando, setCarregando] = useState(false);
  const [historico, setHistorico] = useState<QuizDia[]>([]);

  useEffect(() => {
    const q = carregarQuiz(data);
    setRespostas(q?.respostas ?? {});
    setAnalise(q?.analise ?? "");
  }, [data]);

  useEffect(() => { setHistorico(listarQuizzes()); }, [analise, data]);

  const respondidas = perguntas.filter((p) => (respostas[p.id] ?? "").toString().trim() !== "").length;
  const progresso = Math.round((respondidas / perguntas.length) * 100);

  const setResp = (id: string, v: string) => setRespostas((r) => ({ ...r, [id]: v }));

  async function gerarRelatorio() {
    if (respondidas < Math.ceil(perguntas.length * 0.6)) {
      toast.error("Responda pelo menos 60% das perguntas para gerar um bom relatório.");
      return;
    }
    setCarregando(true);
    try {
      const contexto = {
        data,
        sitio: "Sítio Santo Antônio (Meridiano-SP)",
        respostas: perguntas.map((p) => ({
          area: p.area,
          pergunta: p.texto,
          resposta: rotuloResposta(p, respostas[p.id] ?? ""),
        })),
      };
      const r = await gerarInsightAgro({
        data: {
          context: JSON.stringify(contexto),
          question: "Com base APENAS nestas respostas do dia, escreva um relatório diário profissional do sítio em PORTUGUÊS, com: (1) Resumo do dia em 2-3 linhas; (2) Pontos de atenção (alertas concretos com base nas respostas); (3) Recomendações práticas para amanhã (3-5 ações); (4) Indicadores que devem ser acompanhados. Use **negrito** e listas. Não invente dados que não estão nas respostas.",
        },
      });
      const texto = (r as any)?.texto ?? "";
      setAnalise(texto);
      const quiz: QuizDia = {
        data, respostas, perguntas, analise: texto, geradoEm: new Date().toISOString(),
      };
      salvarQuiz(quiz);
      gerarPdfQuizDiario(quiz);
      toast.success("Relatório gerado e salvo no histórico de PDFs.");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao gerar relatório.");
    } finally {
      setCarregando(false);
    }
  }

  function salvarRascunho() {
    salvarQuiz({ data, respostas, perguntas, analise, geradoEm: analise ? new Date().toISOString() : undefined });
    toast.success("Respostas salvas.");
  }

  function reimprimir(q: QuizDia) {
    gerarPdfQuizDiario(q);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <ClipboardList className="h-5 w-5" />
              <span className="text-xs uppercase tracking-wider font-semibold">Quiz Diário</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold mt-1">Diagnóstico do dia com IA</h1>
            <p className="text-muted-foreground mt-1">Responda às perguntas e a IA gera um relatório diário profissional em PDF.</p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="w-44" />
          </div>
        </header>

        <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">{respondidas} de {perguntas.length} respondidas</p>
            <span className="text-sm font-semibold">{progresso}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${progresso}%` }} />
          </div>
        </Card>

        <div className="grid gap-3">
          {perguntas.map((p, i) => (
            <PerguntaCard key={p.id} index={i + 1} pergunta={p} valor={respostas[p.id] ?? ""} onChange={(v) => setResp(p.id, v)} />
          ))}
        </div>

        <div className="flex flex-wrap gap-2 sticky bottom-20 md:bottom-4 z-20">
          <Button onClick={gerarRelatorio} disabled={carregando} size="lg" className="flex-1 min-w-[200px]">
            {carregando ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {carregando ? "Analisando com IA…" : "Gerar relatório com IA"}
          </Button>
          <Button variant="outline" size="lg" onClick={salvarRascunho}>Salvar rascunho</Button>
        </div>

        {analise && (
          <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="font-display font-semibold text-lg">Análise da IA</h2>
              </div>
              <Button size="sm" variant="outline" onClick={() => gerarPdfQuizDiario({ data, respostas, perguntas, analise, geradoEm: new Date().toISOString() })}>
                <FileText className="h-4 w-4 mr-1" /> Baixar PDF
              </Button>
            </div>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground/90 text-sm leading-relaxed">
              {analise}
            </div>
          </Card>
        )}

        <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
          <div className="flex items-center gap-2 mb-4">
            <History className="h-5 w-5 text-primary" />
            <h2 className="font-display font-semibold text-lg">Quizzes anteriores</h2>
          </div>
          {historico.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum quiz salvo ainda.</p>
          ) : (
            <div className="space-y-2">
              {historico.slice(0, 15).map((q) => (
                <div key={q.data} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card/50">
                  <div className="min-w-0">
                    <p className="font-medium">{new Date(q.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}</p>
                    <p className="text-xs text-muted-foreground">
                      {Object.keys(q.respostas).length} respostas {q.analise ? "· com IA" : "· rascunho"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setData(q.data)}>Abrir</Button>
                    {q.analise && (
                      <Button size="sm" variant="outline" onClick={() => reimprimir(q)}>
                        <FileText className="h-4 w-4 mr-1" /> PDF
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function PerguntaCard({ index, pergunta, valor, onChange }: { index: number; pergunta: Pergunta; valor: string; onChange: (v: string) => void }) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="h-7 w-7 rounded-full bg-primary/15 text-primary text-xs font-semibold flex items-center justify-center shrink-0">{index}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-wider font-bold text-primary">{pergunta.area}</span>
          </div>
          <p className="font-medium mb-3">{pergunta.texto}</p>
          {pergunta.tipo === "texto" && (
            <Textarea rows={2} placeholder={pergunta.placeholder ?? "Sua resposta…"} value={valor} onChange={(e) => onChange(e.target.value)} />
          )}
          {pergunta.tipo === "numero" && (
            <div className="flex items-center gap-2">
              <Input type="number" inputMode="decimal" value={valor} onChange={(e) => onChange(e.target.value)} className="max-w-[180px]" />
              {pergunta.unidade && <span className="text-sm text-muted-foreground">{pergunta.unidade}</span>}
            </div>
          )}
          {pergunta.tipo === "sim_nao" && (
            <div className="flex gap-2">
              <Button type="button" variant={valor === "sim" ? "default" : "outline"} size="sm" onClick={() => onChange("sim")}>Sim</Button>
              <Button type="button" variant={valor === "nao" ? "default" : "outline"} size="sm" onClick={() => onChange("nao")}>Não</Button>
            </div>
          )}
          {pergunta.tipo === "escala" && (
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Button key={n} type="button" size="sm" variant={valor === String(n) ? "default" : "outline"} onClick={() => onChange(String(n))} className="w-10">
                  {n}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
