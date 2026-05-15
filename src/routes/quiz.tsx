import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ClipboardList, Sparkles, FileText, RefreshCw, History, Calendar, Camera, X,
  CloudSun, Zap,
} from "lucide-react";
import {
  perguntasDoDia, carregarQuiz, salvarQuiz, listarQuizzes, rotuloResposta,
  type Pergunta, type QuizDia, type RespostasQuiz, type FotoQuiz,
  type ClimaResumo, type EnergiaResumo,
} from "@/lib/quizQuestions";
import { gerarRelatorioDiarioIA } from "@/lib/ai.functions";
import { gerarPdfQuizDiario } from "@/lib/quizPdf";
import { useFazenda } from "@/lib/cloud/fazenda";
import { useMedidores } from "@/lib/state";
import { fetchWeather, wmoLabel } from "@/lib/weather";
import { compressFile } from "@/lib/cloud/uploadFoto";

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [
      { title: "Quiz Diário com IA — AgroSítio" },
      { name: "description", content: "Quiz diário com fotos, clima e energia. A IA analisa tudo e gera um relatório PDF profissional do sítio." },
      { property: "og:title", content: "Quiz Diário com IA — AgroSítio" },
      { property: "og:description", content: "Quiz inteligente com análise de fotos, clima e consumo. PDF profissional pronto para imprimir." },
    ],
  }),
  component: QuizPage,
});

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const MAX_FOTOS = 6;

async function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(b);
  });
}

function calcEnergiaHoje(medidores: ReturnType<typeof useMedidores>[0], dia: string): EnergiaResumo {
  const porMedidor = medidores.map((m) => {
    const sorted = [...m.leituras].sort((a, b) => a.data.localeCompare(b.data));
    const hoje = sorted.filter((l) => l.data.startsWith(dia));
    const ultimaHoje = hoje[hoje.length - 1];
    const anterior = sorted.filter((l) => l.data < (ultimaHoje?.data ?? `${dia}T99`)).pop();
    const consumo = ultimaHoje && anterior ? Math.max(0, ultimaHoje.valor - anterior.valor) : 0;
    return {
      nome: m.nome,
      consumoKwh: consumo,
      ultimaLeitura: ultimaHoje?.valor ?? sorted[sorted.length - 1]?.valor,
      dataUltima: ultimaHoje?.data ?? sorted[sorted.length - 1]?.data,
    };
  });
  return {
    consumoTotalDiaKwh: porMedidor.reduce((s, x) => s + x.consumoKwh, 0),
    porMedidor,
  };
}

function QuizPage() {
  const [data, setData] = useState(hojeISO());
  const perguntas = useMemo(() => perguntasDoDia(data, 10), [data]);
  const [respostas, setRespostas] = useState<RespostasQuiz>({});
  const [fotos, setFotos] = useState<FotoQuiz[]>([]);
  const [analise, setAnalise] = useState<string>("");
  const [carregando, setCarregando] = useState(false);
  const [historico, setHistorico] = useState<QuizDia[]>([]);
  const [clima, setClima] = useState<ClimaResumo | null>(null);
  const [climaLoading, setClimaLoading] = useState(false);

  const { coords, fazendaNome } = useFazenda();
  const [medidores] = useMedidores();
  const energia = useMemo(() => calcEnergiaHoje(medidores, data), [medidores, data]);
  const chamarIA = useServerFn(gerarRelatorioDiarioIA);

  useEffect(() => {
    const q = carregarQuiz(data);
    setRespostas(q?.respostas ?? {});
    setAnalise(q?.analise ?? "");
    setFotos(q?.fotos ?? []);
    setClima(q?.clima ?? null);
  }, [data]);

  useEffect(() => { setHistorico(listarQuizzes()); }, [analise, data]);

  // Carrega clima atual quando há GPS e ainda não temos snapshot
  useEffect(() => {
    if (!coords || clima || data !== hojeISO()) return;
    setClimaLoading(true);
    fetchWeather(coords.lat, coords.lon)
      .then((w) => {
        const snap: ClimaResumo = {
          cidade: coords.cidade ?? fazendaNome ?? undefined,
          tempC: w.current.tempC,
          feelsC: w.current.feelsC,
          umidade: w.current.umidade,
          vento: w.current.vento,
          chuvaProb: w.current.chuvaProb,
          condicao: wmoLabel[w.current.code] ?? "—",
          alertas: w.alertas,
          proximosDias: w.daily.slice(0, 3).map((d) => ({
            data: d.date, tMax: d.tMax, tMin: d.tMin, chuvaMm: d.chuvaMm, chuvaProb: d.chuvaProb,
            condicao: wmoLabel[d.code] ?? "—",
          })),
        };
        setClima(snap);
      })
      .catch(() => {})
      .finally(() => setClimaLoading(false));
  }, [coords, data, clima, fazendaNome]);

  const respondidas = perguntas.filter((p) => (respostas[p.id] ?? "").toString().trim() !== "").length;
  const progresso = Math.round((respondidas / perguntas.length) * 100);
  const setResp = (id: string, v: string) => setRespostas((r) => ({ ...r, [id]: v }));

  async function adicionarFotos(files: FileList | null) {
    if (!files || !files.length) return;
    if (fotos.length + files.length > MAX_FOTOS) {
      toast.error(`Máximo de ${MAX_FOTOS} fotos por relatório.`);
      return;
    }
    const novas: FotoQuiz[] = [];
    for (const f of Array.from(files)) {
      try {
        const blob = await compressFile(f, 1100, 0.72);
        const url = await blobToDataUrl(blob);
        novas.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, dataUrl: url });
      } catch {
        toast.error(`Falha ao processar ${f.name}`);
      }
    }
    setFotos((p) => [...p, ...novas]);
  }

  function removerFoto(id: string) {
    setFotos((p) => p.filter((x) => x.id !== id));
  }

  function legendaFoto(id: string, leg: string) {
    setFotos((p) => p.map((x) => (x.id === id ? { ...x, legenda: leg } : x)));
  }

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
        clima,
        energia,
        respostas: perguntas.map((p) => ({
          area: p.area, pergunta: p.texto, resposta: rotuloResposta(p, respostas[p.id] ?? ""),
        })),
        fotos: fotos.map((f, i) => ({ indice: i + 1, legenda: f.legenda ?? "" })),
      };
      const r = await chamarIA({
        data: { context: JSON.stringify(contexto), fotos: fotos.map((f) => f.dataUrl) },
      });
      const texto = (r as any)?.texto ?? "";
      setAnalise(texto);
      const quiz: QuizDia = {
        data, respostas, perguntas, fotos, clima: clima ?? undefined, energia,
        analise: texto, geradoEm: new Date().toISOString(),
      };
      salvarQuiz(quiz);
      gerarPdfQuizDiario(quiz);
      toast.success("Relatório profissional gerado e salvo no histórico.");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao gerar relatório.");
    } finally {
      setCarregando(false);
    }
  }

  function salvarRascunho() {
    salvarQuiz({ data, respostas, perguntas, fotos, clima: clima ?? undefined, energia, analise, geradoEm: analise ? new Date().toISOString() : undefined });
    toast.success("Respostas e fotos salvas.");
  }

  function quizParaPdf(): QuizDia {
    return { data, respostas, perguntas, fotos, clima: clima ?? undefined, energia, analise, geradoEm: new Date().toISOString() };
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <ClipboardList className="h-5 w-5" />
              <span className="text-xs uppercase tracking-wider font-semibold">Quiz Diário Pro · com fotos & IA</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold mt-1">Diagnóstico do dia com IA</h1>
            <p className="text-muted-foreground mt-1">Responda, envie fotos do sítio e a IA gera um relatório PDF profissional com clima e energia inclusos.</p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="w-44" />
          </div>
        </header>

        {/* Clima + Energia */}
        <div className="grid md:grid-cols-2 gap-3">
          <Card className="p-4" style={{ background: "var(--gradient-surface)" }}>
            <div className="flex items-center gap-2 mb-2">
              <CloudSun className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Clima de hoje</h3>
            </div>
            {climaLoading ? (
              <p className="text-xs text-muted-foreground">Carregando…</p>
            ) : clima ? (
              <div className="text-sm">
                <p className="font-display text-2xl font-bold">{clima.tempC.toFixed(1)}°C <span className="text-xs font-normal text-muted-foreground">sensação {clima.feelsC.toFixed(1)}°C</span></p>
                <p className="text-muted-foreground">{clima.condicao} · {clima.umidade.toFixed(0)}% umidade · vento {clima.vento.toFixed(0)} km/h</p>
                {clima.alertas.length > 0 && (
                  <p className="text-destructive text-xs mt-1">{clima.alertas[0]}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Configure o GPS da fazenda no widget de clima da home.</p>
            )}
          </Card>

          <Card className="p-4" style={{ background: "var(--gradient-surface)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Energia de hoje</h3>
            </div>
            {medidores.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum medidor cadastrado.</p>
            ) : (
              <div className="text-sm">
                <p className="font-display text-2xl font-bold">{energia.consumoTotalDiaKwh.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kWh</p>
                <p className="text-muted-foreground text-xs">
                  {energia.porMedidor.map((m) => `${m.nome}: ${m.consumoKwh.toFixed(1)}`).join(" · ")}
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Progresso */}
        <Card className="p-4" style={{ background: "var(--gradient-surface)" }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">{respondidas} de {perguntas.length} respondidas · {fotos.length}/{MAX_FOTOS} fotos</p>
            <span className="text-sm font-semibold">{progresso}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${progresso}%` }} />
          </div>
        </Card>

        {/* Fotos */}
        <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              <h2 className="font-display font-semibold text-lg">Fotos do dia</h2>
            </div>
            <label className="cursor-pointer">
              <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={(e) => { adicionarFotos(e.target.files); e.target.value = ""; }} />
              <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                <Camera className="h-4 w-4" /> Adicionar fotos
              </span>
            </label>
          </div>
          <p className="text-xs text-muted-foreground mb-3">A IA analisa cada foto: galpão, animais, pasto, plantio, equipamentos. Máx {MAX_FOTOS} fotos por dia.</p>
          {fotos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma foto enviada ainda.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {fotos.map((f, i) => (
                <div key={f.id} className="relative group rounded-lg overflow-hidden border border-border bg-card">
                  <img src={f.dataUrl} alt={`Foto ${i + 1}`} className="w-full h-40 object-cover" />
                  <button onClick={() => removerFoto(f.id)} className="absolute top-1 right-1 h-7 w-7 rounded-full bg-background/80 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground" aria-label="Remover">
                    <X className="h-4 w-4" />
                  </button>
                  <Input
                    placeholder={`Legenda foto ${i + 1} (opcional)`}
                    value={f.legenda ?? ""}
                    onChange={(e) => legendaFoto(f.id, e.target.value)}
                    className="rounded-none border-0 border-t text-xs h-8"
                  />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Perguntas */}
        <div className="grid gap-3">
          {perguntas.map((p, i) => (
            <PerguntaCard key={p.id} index={i + 1} pergunta={p} valor={respostas[p.id] ?? ""} onChange={(v) => setResp(p.id, v)} />
          ))}
        </div>

        <div className="flex flex-wrap gap-2 sticky bottom-20 md:bottom-4 z-20">
          <Button onClick={gerarRelatorio} disabled={carregando} size="lg" className="flex-1 min-w-[200px]">
            {carregando ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {carregando ? "IA analisando fotos & respostas…" : "Gerar relatório profissional com IA"}
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
              <Button size="sm" variant="outline" onClick={() => gerarPdfQuizDiario(quizParaPdf())}>
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
                      {Object.keys(q.respostas).length} respostas · {q.fotos?.length ?? 0} fotos {q.analise ? "· com IA" : "· rascunho"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setData(q.data)}>Abrir</Button>
                    {q.analise && (
                      <Button size="sm" variant="outline" onClick={() => gerarPdfQuizDiario(q)}>
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
