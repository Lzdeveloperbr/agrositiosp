import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState, type CSSProperties } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLotes, useTarefas } from "@/lib/state";
import { ArrowRight, ClipboardCheck, Scale, Boxes, Syringe, Wind, BookOpen, FileText, ListChecks, Plus, GraduationCap, Target } from "lucide-react";
import { WeatherWidget } from "@/components/WeatherWidget";
import { AIInsightsCard } from "@/components/AIInsightsCard";
import { InstallAppButton } from "@/components/InstallAppButton";
import { NotificationsManager } from "@/components/NotificationsManager";
import { AlertasInteligentes } from "@/components/AlertasInteligentes";
import { useFazenda } from "@/lib/cloud/fazenda";
import { verificarENotificar } from "@/lib/lembretes";
import { calcularResumoLote } from "@/lib/granja";
import { OperationalOverview } from "@/components/OperationalOverview";
import { AvicultureCommandCenter } from "@/components/AvicultureCommandCenter";
import { AvicultureRecordQuality } from "@/components/AvicultureRecordQuality";
import { LoteAutopilotPanel } from "@/components/LoteAutopilotPanel";
import { LancamentoRapido, abrirLancamentoRapido } from "@/components/LancamentoRapido";

// Gráficos (recharts) carregam depois da primeira pintura, para a central abrir rápido.
const PainelLoteAtivo = lazy(() => import("@/components/PainelLoteAtivo").then((m) => ({ default: m.PainelLoteAtivo })));
const AvicultureCharts = lazy(() => import("@/components/AvicultureCharts").then((m) => ({ default: m.AvicultureCharts })));

function ChartSkeleton({ h = 320 }: { h?: number }) {
  return <div className="skeleton-shimmer rounded-xl border border-border" style={{ height: h }} aria-hidden />;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Central da Granja — Aviário Pro" },
      { name: "description", content: "Central operacional do frango de corte: lote ativo, peso previsto, mortalidade, silo, manejo e alertas do dia." },
      { property: "og:title", content: "Central da Granja — Aviário Pro" },
      { property: "og:description", content: "Lote ativo, peso, mortalidade, silo e manejo do dia em um só painel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Central,
});

const ACOES = [
  { to: "/granja", label: "Lançar dia", icon: Plus },
  { to: "/checklist-granja", label: "Checklist", icon: ClipboardCheck },
  { to: "/pesagem-pro", label: "Pesagem", icon: Scale },
  { to: "/silo", label: "Silo", icon: Boxes },
  { to: "/manejo", label: "Manejo", icon: BookOpen },
  { to: "/ambiencia", label: "Ambiência", icon: Wind },
  { to: "/calendario-sanitario", label: "Sanidade", icon: Syringe },
  { to: "/planejamento-abate", label: "Abate", icon: Target },
  { to: "/relatorios", label: "Relatórios", icon: FileText },
  { to: "/curso-avicultura", label: "Academia", icon: GraduationCap },
] as const;

function Central() {
  const [lotes] = useLotes();
  const [tarefas] = useTarefas();
  const { fazendaId, fazendaNome, operador } = useFazenda();
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => { setToday(new Date()); }, []);
  useEffect(() => { if (fazendaId) verificarENotificar(fazendaId); }, [fazendaId]);

  const ativo = lotes.find((l) => !l.encerrado);
  const resumo = ativo && today ? calcularResumoLote(ativo, "ross_ap95", "misto", today) : null;
  const pendentes = tarefas.filter((t) => !t.concluida);
  const nome = operador?.split(" ")[0] || "granjeiro";

  return (
    <AppShell>
      <div className="space-y-6 md:space-y-8">
        <header className="hero-central reveal relative overflow-hidden rounded-2xl border border-border px-5 py-6 md:px-7 md:py-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow min-h-4">
              {today ? today.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }) : ""}
            </p>
            <h1 className="mt-1 text-4xl md:text-5xl leading-none text-gradient">Central da granja</h1>
            <p className="mt-2 text-sm text-muted-foreground truncate">
              {nome} · {fazendaNome ?? "Aviário"}{ativo ? ` · Lote ${ativo.numero} em D${resumo?.idade ?? 0}` : " · nenhum lote ativo"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 [&>*:last-child]:max-sm:flex-1">
            <InstallAppButton />
            <Button asChild variant="outline"><Link to="/painel-analitico">Análises</Link></Button>
            {ativo ? <Button onClick={() => abrirLancamentoRapido()}><Plus className="h-4 w-4" />Lançar dados de hoje</Button> : <Button asChild><Link to="/granja"><Plus className="h-4 w-4" />Cadastrar lote</Link></Button>}
          </div>
        </header>

        <section aria-label="Ações rápidas" className="quick-actions -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 snap-x sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0 lg:grid-cols-10">
          {ACOES.map((a, i) => (
            <Link key={a.to} to={a.to} onClick={(e) => { if (a.label === "Lançar dia" && ativo) { e.preventDefault(); abrirLancamentoRapido(); } }} style={{ "--reveal-delay": `${i * 35}ms` } as CSSProperties} className="reveal lift sheen group flex w-[5.5rem] shrink-0 snap-start flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-1 py-2.5 text-center sm:w-auto sm:gap-2 sm:py-3.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                <a.icon className="h-5 w-5 text-primary" />
              </span>
              <span className="text-xs font-semibold leading-tight">{a.label}</span>
            </Link>
          ))}
        </section>

        <LancamentoRapido />
        <LoteAutopilotPanel />

        <section aria-label="Lote ativo">
          <SectionTitle title="Lote ativo" to="/granja" link="Todos os lotes" />
          <Suspense fallback={<ChartSkeleton h={420} />}>
            <PainelLoteAtivo />
          </Suspense>
        </section>

        <div className="cv-auto"><AvicultureCommandCenter /></div>

        <div className="cv-auto">
          <Suspense fallback={<ChartSkeleton />}>
            <AvicultureCharts />
          </Suspense>
        </div>

        <div className="cv-auto"><AvicultureRecordQuality /></div>

        <div className="cv-auto"><OperationalOverview /></div>

        <AlertasInteligentes />
        <NotificationsManager />

        <div className="cv-auto grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2"><WeatherWidget /></div>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-2xl">Rotina</h2>
              <ListChecks className="h-5 w-5 text-primary" />
            </div>
            {pendentes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma tarefa pendente.</p>
            ) : (
              <ul className="space-y-2">
                {pendentes.slice(0, 5).map((t) => (
                  <li key={t.id} className="flex items-center gap-2 text-sm border-b border-border/60 pb-2 last:border-0">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${t.prioridade === "alta" ? "bg-destructive" : t.prioridade === "media" ? "bg-warning" : "bg-muted-foreground"}`} />
                    <span className="truncate">{t.titulo}</span>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="outline" size="sm" className="mt-4 w-full"><Link to="/tarefas">Abrir tarefas</Link></Button>
          </Card>
        </div>

        <AIInsightsCard context={JSON.stringify(resumo && ativo ? {
          lote: ativo.numero, idade_dias: resumo.idade, aves_vivas: resumo.vivas,
          mortalidade_pct: Number(resumo.mortalidadePct.toFixed(2)),
          peso_medido_g: resumo.ultimaPesagem?.pesoG ?? null, peso_previsto_hoje_g: Math.round(resumo.pesoProjetadoHojeG),
          peso_referencia_g: Math.round(resumo.pesoEsperadoHojeG), dias_sem_pesar: resumo.diasSemPesar,
          tarefas_pendentes: pendentes.length,
        } : { lote: null, tarefas_pendentes: pendentes.length })} />
      </div>
    </AppShell>
  );
}

function SectionTitle({ title, to, link }: { title: string; to: string; link: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-2xl">{title}</h2>
      <Link to={to} className="text-xs font-semibold text-primary inline-flex items-center gap-1">{link}<ArrowRight className="h-3 w-3" /></Link>
    </div>
  );
}
