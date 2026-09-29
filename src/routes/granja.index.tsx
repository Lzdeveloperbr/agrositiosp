import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useLotes } from "@/lib/state";
import { uid } from "@/lib/storage";
import { Bird, Plus, FileText, Trash2, ArrowRight, Scale, Trophy, ClipboardCheck, Syringe, BarChart3, BookOpen, Wind, History, Stethoscope, Activity, Target, Droplets, Wheat, Zap, Boxes, AlertTriangle, CheckCircle2, Clock3, Gauge, CalendarDays } from "lucide-react";
import { gerarRelatorioLote } from "@/lib/pdf";
import { toast } from "sonner";
import { diffDias, fmtData, hojeISO } from "@/lib/data";
import { calcularResumoLote } from "@/lib/granja";
import { refPesoG } from "@/lib/silo";

export const Route = createFileRoute("/granja/")({
  head: () => ({
    meta: [
      { title: "Granja de Frango — AgroSítio" },
      { name: "description", content: "Gestão de lotes de frango de corte: mortalidade, ração, água, peso e CA." },
      { property: "og:title", content: "Granja de Frango — AgroSítio" },
      { property: "og:description", content: "Gestão de lotes de frango de corte: mortalidade, ração, água, peso e CA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GranjaPage,
});

function GranjaPage() {
  const [lotes, setLotes] = useLotes();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    numero: "",
    dataEntrada: hojeISO(),
    quantidadeInicial: 28000,
    integradora: "Bello Alimentos",
    previsaoAbateDias: 42,
    percentualLucro: 10,
  });

  const criar = () => {
    if (!form.numero.trim()) { toast.error("Informe o número do lote"); return; }
    if (form.dataEntrada > hojeISO()) { toast.error("A entrada do lote não pode estar no futuro"); return; }
    if (!Number.isFinite(form.quantidadeInicial) || form.quantidadeInicial <= 0) { toast.error("Informe uma quantidade de aves válida"); return; }
    if (form.previsaoAbateDias < 28 || form.previsaoAbateDias > 60) { toast.error("A previsão de abate deve ficar entre 28 e 60 dias"); return; }
    if (form.percentualLucro < 0 || form.percentualLucro > 100) { toast.error("O percentual deve ficar entre 0% e 100%"); return; }
    setLotes((prev) => [
      { id: uid(), ...form, numero: form.numero.trim(), entries: [] },
      ...prev,
    ]);
    setOpen(false);
    setForm({ ...form, numero: "" });
    toast.success("Lote criado");
  };

  const remover = (id: string) => {
    if (!confirm("Remover este lote?")) return;
    setLotes((prev) => prev.filter((l) => l.id !== id));
  };

  const ativos = lotes.filter((l) => !l.encerrado);
  const lotePrincipal = ativos[0] ?? null;
  const resumoPrincipal = useMemo(() => lotePrincipal ? calcularResumoLote(lotePrincipal) : null, [lotePrincipal]);
  const kpis = useMemo(() => {
    let totalAves = 0, vivas = 0, baixas = 0, somaPesoPonderado = 0, avesComPeso = 0, diasSoma = 0;
    for (const l of ativos) {
      const resumo = calcularResumoLote(l);
      totalAves += l.quantidadeInicial;
      baixas += resumo.baixas;
      vivas += resumo.vivas;
      if (resumo.ultimaPesagem) {
        somaPesoPonderado += resumo.ultimaPesagem.pesoG * resumo.vivas;
        avesComPeso += resumo.vivas;
      }
      diasSoma += resumo.idade;
    }
    return {
      ativos: ativos.length,
      vivas,
      totalAves,
      mortalidade: totalAves ? (baixas / totalAves) * 100 : 0,
      pesoMedio: avesComPeso ? somaPesoPonderado / avesComPeso : 0,
      idadeMedia: ativos.length ? diasSoma / ativos.length : 0,
    };
  }, [ativos]);

  const operacaoHoje = useMemo(() => {
    if (!lotePrincipal || !resumoPrincipal) return null;
    const lancouHoje = lotePrincipal.entries.some((entry) => entry.date === hojeISO());
    const fase = resumoPrincipal.idade <= 7 ? "Pré-inicial" : resumoPrincipal.idade <= 14 ? "Inicial" : resumoPrincipal.idade <= 25 ? "Crescimento" : resumoPrincipal.idade <= 35 ? "Final" : "Retirada";
    const diasParaAbate = Math.max(0, lotePrincipal.previsaoAbateDias - resumoPrincipal.idade);
    const tarefas = [
      !lancouHoje ? { label: "Fazer lançamento diário", detalhe: "Mortalidade, eliminados e observações", to: `/granja/${lotePrincipal.id}`, tone: "warn" as const } : null,
      resumoPrincipal.diasSemPesar > 3 ? { label: "Atualizar pesagem", detalhe: `Última medição há ${resumoPrincipal.diasSemPesar} dias`, to: "/pesagem-pro", tone: resumoPrincipal.diasSemPesar > 7 ? "bad" as const : "warn" as const } : null,
      resumoPrincipal.situacao === "critico" || resumoPrincipal.situacao === "atencao" ? { label: "Revisar desempenho", detalhe: `Peso ${Math.abs(resumoPrincipal.diferencaPesoPct ?? 0).toFixed(1)}% abaixo da meta`, to: "/manejo", tone: resumoPrincipal.situacao === "critico" ? "bad" as const : "warn" as const } : null,
    ].filter((item): item is NonNullable<typeof item> => Boolean(item));
    return { fase, diasParaAbate, lancouHoje, tarefas };
  }, [lotePrincipal, resumoPrincipal]);

  const atalhos = [
    { to: "/pesagem-pro", label: "Pesagem Pro", icon: Scale },
    { to: "/excelencia-lote", label: "Excelência", icon: Trophy },
    { to: "/checklist-granja", label: "Checklist", icon: ClipboardCheck },
    { to: "/calendario-sanitario", label: "Sanitário", icon: Syringe },
    { to: "/manejo", label: "Manejo", icon: BookOpen },
    { to: "/ambiencia", label: "Ambiência", icon: Wind },
    { to: "/automacoes", label: "Automação", icon: Zap },
    { to: "/analise-aves", label: "IA Aves", icon: Stethoscope },
    { to: "/comparativo-lotes", label: "Comparativo", icon: BarChart3 },
    { to: "/historico-lotes", label: "Histórico", icon: History },
    { to: "/entregas-racao", label: "Ração", icon: Wheat },
    { to: "/silo", label: "Silo ao Vivo", icon: Boxes },
  ];


  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-primary/80 font-semibold mb-1">Avicultura de Corte</div>
            <h1 className="text-3xl md:text-4xl font-display font-bold">Granja</h1>
            <p className="text-muted-foreground mt-1">Manejo · Nutrição · Sanidade · Resultados</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Novo lote</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Cadastrar novo lote</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Número do lote"><Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} placeholder="Ex: 045" /></Field>
                <Field label="Data de entrada"><Input type="date" value={form.dataEntrada} onChange={(e) => setForm({ ...form, dataEntrada: e.target.value })} /></Field>
                <Field label="Qtd. inicial (aves)"><Input type="number" value={form.quantidadeInicial} onChange={(e) => setForm({ ...form, quantidadeInicial: +e.target.value })} /></Field>
                <Field label="Integradora"><Input value={form.integradora} onChange={(e) => setForm({ ...form, integradora: e.target.value })} /></Field>
                <Field label="Previsão abate (dias)"><Input type="number" value={form.previsaoAbateDias} onChange={(e) => setForm({ ...form, previsaoAbateDias: +e.target.value })} /></Field>
                <Field label="% lucro granjeiro"><Input type="number" value={form.percentualLucro} onChange={(e) => setForm({ ...form, percentualLucro: +e.target.value })} /></Field>
              </div>
              <DialogFooter><Button onClick={criar}>Criar lote</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        {lotePrincipal && resumoPrincipal && operacaoHoje && (
          <section aria-labelledby="operacao-hoje" className="overflow-hidden rounded-lg border border-primary/25 operational-surface">
            <div className="flex flex-col gap-4 border-b border-border/70 p-4 md:flex-row md:items-center md:justify-between md:p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
                  <Gauge className="h-5 w-5" />
                </div>
                <div>
                  <p className="eyebrow">Operação de hoje</p>
                  <h2 id="operacao-hoje" className="font-display text-xl font-bold">Lote {lotePrincipal.numero} · D{resumoPrincipal.idade}</h2>
                  <p className="text-xs text-muted-foreground">{operacaoHoje.fase} · {operacaoHoje.diasParaAbate} dias para o abate previsto</p>
                </div>
              </div>
              <Button asChild className="w-full md:w-auto">
                <Link to="/granja/$id" params={{ id: lotePrincipal.id }}>Lançar dados de hoje <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>

            <div className="grid grid-cols-2 divide-x divide-y divide-border/60 md:grid-cols-4 md:divide-y-0">
              <OperationalMetric label="Aves vivas" value={resumoPrincipal.vivas.toLocaleString("pt-BR")} detail={`${resumoPrincipal.baixas.toLocaleString("pt-BR")} baixas`} />
              <OperationalMetric label="Peso atual" value={resumoPrincipal.ultimaPesagem ? `${Math.round(resumoPrincipal.pesoProjetadoHojeG).toLocaleString("pt-BR")} g est.` : "Sem pesagem"} detail={`Padrão ${resumoPrincipal.pesoEsperadoHojeG.toFixed(0)} g · pesagem ${resumoPrincipal.ultimaPesagem ? fmtData(resumoPrincipal.ultimaPesagem.data) : "pendente"}`} tone={resumoPrincipal.situacao === "critico" ? "bad" : resumoPrincipal.situacao === "atencao" ? "warn" : "ok"} />
              <OperationalMetric label="Mortalidade" value={`${resumoPrincipal.mortalidadePct.toFixed(2)}%`} detail={`${resumoPrincipal.mortalidade} mortes · ${resumoPrincipal.eliminados} eliminados`} tone={resumoPrincipal.mortalidadePct > 5 ? "bad" : resumoPrincipal.mortalidadePct > 3 ? "warn" : "ok"} />
              <OperationalMetric label="Projeção abate" value={`${(resumoPrincipal.pesoProjetadoAbateG / 1000).toFixed(2)} kg`} detail={`em D${lotePrincipal.previsaoAbateDias}`} />
            </div>

            <div className="grid gap-0 border-t border-border/70 md:grid-cols-[1.3fr_1fr]">
              <div className="p-4 md:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Prioridades</h3>
                  <Badge variant={operacaoHoje.tarefas.length ? "outline" : "secondary"}>{operacaoHoje.tarefas.length ? `${operacaoHoje.tarefas.length} pendente${operacaoHoje.tarefas.length > 1 ? "s" : ""}` : "Em dia"}</Badge>
                </div>
                {operacaoHoje.tarefas.length ? (
                  <div className="space-y-2">
                    {operacaoHoje.tarefas.map((tarefa) => (
                      <Link key={tarefa.label} to={tarefa.to} className="flex min-h-14 items-center gap-3 rounded-md border border-border/70 bg-secondary/25 px-3 py-2.5 transition-colors hover:border-primary/45 hover:bg-secondary/45">
                        <AlertTriangle className={`h-4 w-4 shrink-0 ${tarefa.tone === "bad" ? "text-destructive" : "text-warning"}`} />
                        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{tarefa.label}</span><span className="block truncate text-xs text-muted-foreground">{tarefa.detalhe}</span></span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-16 items-center gap-3 rounded-md border border-success/30 bg-success/10 px-3">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <div><p className="text-sm font-semibold">Rotina em dia</p><p className="text-xs text-muted-foreground">Lançamento e pesagem estão atualizados.</p></div>
                  </div>
                )}
              </div>
              <div className="border-t border-border/70 p-4 md:border-l md:border-t-0 md:p-5">
                <h3 className="mb-3 text-sm font-semibold">Acesso rápido</h3>
                <div className="grid grid-cols-2 gap-2">
                  <QuickAction to="/manejo" icon={BookOpen} label="Manejo" />
                  <QuickAction to="/silo" icon={Boxes} label="Silo ao vivo" />
                  <QuickAction to="/pesagem-pro" icon={Scale} label="Pesagem" />
                  <QuickAction to="/sanidade" icon={Syringe} label="Sanidade" />
                </div>
              </div>
            </div>
          </section>
        )}

        {ativos.length > 0 && (
          <Card className="p-5" style={{ background: "var(--gradient-surface)", boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                 <div className="h-8 w-8 rounded-md grid place-items-center bg-primary">
                  <Activity className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-base leading-tight">Painel Operacional</h2>
                  <p className="text-[11px] text-muted-foreground">{kpis.ativos} lote{kpis.ativos > 1 ? "s" : ""} em produção · idade média {kpis.idadeMedia.toFixed(0)}d</p>
                </div>
              </div>
              <Badge variant="outline" className="border-primary/40 text-primary">Ao vivo</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiTile icon={Bird} label="Aves vivas" value={kpis.vivas.toLocaleString("pt-BR")} sub={`de ${kpis.totalAves.toLocaleString("pt-BR")}`} />
              <KpiTile icon={Target} label="Mortalidade" value={`${kpis.mortalidade.toFixed(2)}%`} sub={kpis.mortalidade < 3 ? "Excelente" : kpis.mortalidade < 5 ? "Bom" : "Atenção"} tone={kpis.mortalidade < 3 ? "ok" : kpis.mortalidade < 5 ? "warn" : "bad"} />
              <KpiTile icon={Scale} label="Peso médio" value={kpis.pesoMedio ? `${kpis.pesoMedio.toFixed(0)} g` : "—"} sub="última pesagem" />
              <KpiTile icon={Droplets} label="Idade média" value={`${kpis.idadeMedia.toFixed(0)} d`} sub="dias de vida" />
            </div>
          </Card>
        )}

        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 font-semibold mb-2 px-1">Módulos técnicos</div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {atalhos.map((a) => {
              const Icon = a.icon;
              return (
                <Link key={a.to} to={a.to} className="group flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg operational-surface hover:border-primary/50 transition-all">
                   <div className="h-9 w-9 rounded-md grid place-items-center bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-[11px] font-medium text-center leading-tight">{a.label}</span>
                </Link>
              );
            })}
          </div>
        </div>


        {lotes.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <Bird className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">Nenhum lote cadastrado</p>
            <p className="text-sm text-muted-foreground mb-4">Comece criando o primeiro lote da sua granja.</p>
            <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Criar primeiro lote</Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {lotes.map((l) => {
              const resumo = calcularResumoLote(l);
              const dias = resumo.idade;
              const progresso = Math.min(100, (dias / Math.max(1, l.previsaoAbateDias)) * 100);
              const lancouHoje = l.entries.some((e) => e.date === hojeISO());
              const ultimaAtualizacao = [...l.entries].sort((a, b) => b.date.localeCompare(a.date))[0]?.date;
              const alertas = [
                !l.encerrado && !lancouHoje ? "Lançamento diário pendente" : null,
                !l.encerrado && resumo.diasSemPesar > 3 ? `Pesagem atrasada (${resumo.diasSemPesar} dias)` : null,
                resumo.situacao === "critico" ? `Peso ${Math.abs(resumo.diferencaPesoPct ?? 0).toFixed(1)}% abaixo da meta` : null,
                resumo.mortalidadePct > 5 ? `Baixas elevadas (${resumo.mortalidadePct.toFixed(1)}%)` : null,
              ].filter((item): item is string => Boolean(item));
              return (
                <Card key={l.id} className="p-5" style={{ background: "var(--gradient-surface)", boxShadow: "var(--shadow-card)" }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-xl font-bold">Lote {l.numero}</h3>
                        {l.encerrado ? <Badge variant="secondary">Encerrado</Badge> : <Badge>Ativo</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Entrada: {fmtData(l.dataEntrada)} · {dias}d</p>
                    </div>
                    <Button size="icon" variant="ghost" aria-label={`Remover lote ${l.numero}`} title="Remover lote" onClick={() => remover(l.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <Mini label="Vivas" value={resumo.vivas.toLocaleString("pt-BR")} />
                    <Mini label="Baixas" value={`${resumo.mortalidadePct.toFixed(1)}%`} />
                     <Mini label="Peso" value={resumo.ultimaPesagem ? `${Math.round(resumo.pesoProjetadoHojeG)}g est.` : `${refPesoG(dias, "ross_ap95", "misto").toFixed(0)}g est.`} />
                  </div>
                  <div className="mb-4 rounded-md border border-border/60 bg-muted/30 p-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Meta Ross AP D{dias}</span>
                      <span className="font-semibold tabular-nums">{resumo.pesoEsperadoHojeG.toFixed(0)} g</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-muted-foreground">Situação</span>
                      <span className={resumo.situacao === "critico" ? "text-destructive font-semibold" : resumo.situacao === "atencao" ? "text-warning font-semibold" : "text-success font-semibold"}>
                        {resumo.diferencaPesoPct === null ? "Pesar para calibrar" : `${resumo.diferencaPesoPct > 0 ? "+" : ""}${resumo.diferencaPesoPct.toFixed(1)}% da meta`}
                      </span>
                    </div>
                  </div>
                  {alertas.length > 0 && (
                    <div className="mb-4 space-y-1.5 rounded-md border border-warning/40 bg-warning/10 p-2.5">
                      {alertas.slice(0, 3).map((alerta) => (
                        <div key={alerta} className="flex items-center gap-2 text-xs text-warning-foreground">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>{alerta}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-1 mb-4">
                    <div className="flex justify-between text-xs text-muted-foreground"><span>Ciclo produtivo</span><span>{dias}/{l.previsaoAbateDias} dias</span></div>
                    <Progress value={progresso} />
                    <div className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground"><Clock3 className="h-3 w-3" />{ultimaAtualizacao ? `Atualizado em ${fmtData(ultimaAtualizacao)}` : "Ainda sem lançamento diário"}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" className="flex-1"><Link to="/granja/$id" params={{ id: l.id }}>Abrir <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
                    <Button size="sm" variant="outline" onClick={() => gerarRelatorioLote(l)}><FileText className="h-4 w-4" /></Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded-md p-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display font-bold text-lg tabular-nums">{value}</p>
    </div>
  );
}

function KpiTile({ icon: Icon, label, value, sub, tone }: { icon: any; label: string; value: string; sub?: string; tone?: "ok" | "warn" | "bad" }) {
  const toneColor = tone === "ok" ? "text-success" : tone === "warn" ? "text-warning" : tone === "bad" ? "text-destructive" : "text-primary";
  return (
     <div className="relative overflow-hidden rounded-lg operational-surface p-3.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
        <Icon className={`h-3.5 w-3.5 ${toneColor}`} />
      </div>
      <div className="font-display font-bold text-2xl tabular-nums leading-none">{value}</div>
      {sub && <div className={`text-[10px] mt-1 ${toneColor}`}>{sub}</div>}
    </div>
  );
}

function OperationalMetric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone?: "ok" | "warn" | "bad" }) {
  const toneColor = tone === "bad" ? "text-destructive" : tone === "warn" ? "text-warning" : tone === "ok" ? "text-success" : "text-primary";
  return (
    <div className="min-w-0 p-3.5 md:p-4">
      <p className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</p>
      <p className={`mt-1 truncate font-display text-xl font-bold tabular-nums ${toneColor}`}>{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{detail}</p>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: typeof CalendarDays; label: string }) {
  return (
    <Link to={to} className="flex min-h-12 items-center gap-2 rounded-md border border-border/70 bg-secondary/25 px-3 text-xs font-semibold transition-colors hover:border-primary/45 hover:text-primary">
      <Icon className="h-4 w-4 text-primary" />
      <span>{label}</span>
    </Link>
  );
}
