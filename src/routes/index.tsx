import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLotes, useMedidores, useAnimais, useTarefas, useEstoque, useFinanceiro, usePlantios } from "@/lib/state";
import { Bird, Skull, Beef, Zap, AlertTriangle, ArrowRight, Calendar, BookOpen, ListChecks, PackageX, Wallet, Sprout, BellRing } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { WeatherWidget } from "@/components/WeatherWidget";
import { AIInsightsCard } from "@/components/AIInsightsCard";
import { InstallAppButton } from "@/components/InstallAppButton";
import { useFazenda } from "@/lib/cloud/fazenda";
import { useLembretes, lembretesDoDia, proximosLembretes, verificarENotificar } from "@/lib/lembretes";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgroSítio — Painel de Gestão Rural" },
      { name: "description", content: "Painel de controle do sítio: granja, gado de corte, energia e diário." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [lotes] = useLotes();
  const [medidores] = useMedidores();
  const [animais] = useAnimais();
  const [tarefas] = useTarefas();
  const [estoque] = useEstoque();
  const [financ] = useFinanceiro();
  const [plantios] = usePlantios();
  const { fazendaId } = useFazenda();
  const [lembretes] = useLembretes(fazendaId);
  const plantiosAtivos = plantios.filter((p) => p.status !== "encerrado");

  const ativo = lotes.find((l) => !l.encerrado);
  const totalMort = ativo?.entries.reduce((s, e) => s + e.mortalidade, 0) ?? 0;
  const vivas = ativo ? ativo.quantidadeInicial - totalMort : 0;
  const mortPct = ativo ? (totalMort / ativo.quantidadeInicial) * 100 : 0;

  const ativosGado = animais.filter((a) => a.status === "ativo");
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => { setToday(new Date()); }, []);
  useEffect(() => {
    if (!fazendaId) return;
    verificarENotificar(fazendaId);
  }, [fazendaId]);
  const diaLeitura = today?.getDate() === 30;
  const ultLeitura = medidores.flatMap((m) => m.leituras).sort((a, b) => b.data.localeCompare(a.data))[0];
  const lembretesHoje = today ? lembretesDoDia(lembretes, today) : [];
  const lembretesProximos = today ? proximosLembretes(lembretes, 7, today) : [];

  const tarefasPend = tarefas.filter((t) => !t.concluida);
  const estoqueBaixo = estoque.filter((i) => i.minimo !== undefined && i.quantidade <= (i.minimo ?? 0));
  const hojeStr = today?.toISOString().slice(0, 10) ?? "";
  const em7 = today ? new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10) : "";
  const contasVencendo = financ.filter((l) => l.status !== "pago" && l.vencimento && l.vencimento <= em7);
  const contasAtrasadas = contasVencendo.filter((l) => l.vencimento! < hojeStr);
  const totalAVencer = contasVencendo.reduce((s, l) => s + (l.tipo === "despesa" ? l.valor : -l.valor), 0);

  const chartData = ativo
    ? [...ativo.entries]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((e, i) => ({ dia: `D${i + 1}`, peso: e.pesoMedioG ?? null, mortalidade: e.mortalidade }))
    : [];

  return (
    <AppShell>
      <div className="space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground capitalize min-h-[20px]">
              {today ? today.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : ""}
            </p>
            <h1 className="text-3xl md:text-4xl font-display font-bold mt-1">Bom dia, granjeiro 🌱</h1>
            <p className="text-muted-foreground mt-1">Resumo do dia no sítio.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <InstallAppButton />
            <Button asChild variant="outline" size="sm"><Link to="/lembretes">Lembretes</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/diario">+ Diário</Link></Button>
            <Button asChild size="sm"><Link to="/relatorios">Relatórios</Link></Button>
          </div>
        </header>

        {(diaLeitura || estoqueBaixo.length > 0 || tarefasPend.length > 0 || contasVencendo.length > 0 || lembretesHoje.length > 0) && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {lembretesHoje.map((l) => (
              <Alert key={l.id} icon={BellRing} title={`📌 ${l.titulo}`} desc={l.descricao || "Lembrete de hoje"} to="/lembretes" />
            ))}
            {diaLeitura && (
              <Alert icon={AlertTriangle} title="Dia 30 — leitura dos relógios" desc="Registre as 3 leituras." to="/energia" />
            )}
            {tarefasPend.length > 0 && (
              <Alert icon={ListChecks} title={`${tarefasPend.length} tarefa(s) pendente(s)`} desc="Confira o que falta." to="/tarefas" />
            )}
            {estoqueBaixo.length > 0 && (
              <Alert icon={PackageX} title={`${estoqueBaixo.length} item(ns) em falta`} desc="Estoque abaixo do mínimo." to="/estoque" />
            )}
            {contasVencendo.length > 0 && (
              <Alert
                icon={Wallet}
                title={`${contasVencendo.length} conta(s) ${contasAtrasadas.length > 0 ? "atrasada(s)" : "a vencer"}`}
                desc={`${totalAVencer > 0 ? "Pagar" : "Receber"} ${Math.abs(totalAVencer).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} em 7 dias`}
                to="/financeiro"
              />
            )}
          </div>
        )}

        {lembretesProximos.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center gap-2"><BellRing className="h-4 w-4 text-primary" /> Próximos lembretes</h2>
              <Button asChild variant="ghost" size="sm"><Link to="/lembretes">Ver todos</Link></Button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
              {lembretesProximos.slice(0, 6).map(({ lembrete: l, diasAte }) => (
                <div key={l.id} className="flex items-center gap-3 p-2 rounded-lg border border-border/60">
                  <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex flex-col items-center justify-center text-xs font-semibold">
                    <span className="text-sm leading-none">{l.dia}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{l.titulo}</div>
                    <div className="text-xs text-muted-foreground">{diasAte === 0 ? "Hoje" : `em ${diasAte} dia(s)`}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2"><WeatherWidget /></div>
          <AIInsightsCard context={JSON.stringify({
            granja: { aves_vivas: vivas, mortalidade_pct: Number(mortPct.toFixed(2)), lote: ativo?.numero, dias: ativo ? ativo.entries.length : 0 },
            gado: { cabecas_ativas: ativosGado.length, total_historico: animais.length },
            plantios_ativos: plantiosAtivos.map((p) => ({ cultura: p.cultura, area_ha: p.areaHa, dias_para_colheita: p.previsaoColheita ? Math.ceil((new Date(p.previsaoColheita).getTime() - Date.now()) / 86400000) : null })),
            estoque_baixo: estoqueBaixo.map((i) => ({ nome: i.nome, qtd: i.quantidade, min: i.minimo })),
            financeiro: { contas_a_vencer: contasVencendo.length, saldo_previsto: -totalAVencer },
            tarefas_pendentes: tarefasPend.length,
          })} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Aves vivas" value={vivas.toLocaleString("pt-BR")} hint={ativo ? `Lote ${ativo.numero}` : "Sem lote ativo"} icon={Bird} tone="primary" />
          <StatCard label="Mortalidade" value={`${mortPct.toFixed(2)}%`} hint={`${totalMort.toLocaleString("pt-BR")} aves`} icon={Skull} tone={mortPct > 5 ? "destructive" : "muted"} />
          <StatCard label="Cabeças de gado" value={ativosGado.length.toLocaleString("pt-BR")} hint={`${animais.length} no histórico`} icon={Beef} tone="accent" />
          <StatCard label="Plantios ativos" value={plantiosAtivos.length.toString()} hint={`${plantiosAtivos.reduce((s, p) => s + p.areaHa, 0).toFixed(1)} ha`} icon={Sprout} tone="primary" />
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 p-6" style={{ background: "var(--gradient-surface)" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display font-semibold text-lg">Evolução do lote</h2>
                <p className="text-sm text-muted-foreground">Peso médio (g) e mortalidade diária</p>
              </div>
              <Badge variant="secondary">{ativo ? `Lote ${ativo.numero}` : "—"}</Badge>
            </div>
            {chartData.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="peso" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} name="Peso (g)" />
                  <Line type="monotone" dataKey="mortalidade" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} name="Mortalidade" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </Card>

          <Card className="p-6" style={{ background: "var(--gradient-surface)" }}>
            <h2 className="font-display font-semibold text-lg mb-4">Atalhos rápidos</h2>
            <ul className="space-y-2">
              <Step icon={BookOpen} text="Registrar dia no diário (com foto)" to="/diario" />
              <Step icon={Calendar} text={ativo ? `Lançar dados do lote ${ativo.numero}` : "Cadastrar lote"} to="/granja" />
              <Step icon={Beef} text="Adicionar animal ao rebanho" to="/gado" />
              <Step icon={Zap} text="Atualizar leituras dos relógios" to="/energia" />
            </ul>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Alert({ icon: Icon, title, desc, to }: any) {
  return (
    <Card className="p-3 border-accent/40 bg-accent/10 flex items-center gap-3">
      <Icon className="h-5 w-5 text-accent shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{desc}</p>
      </div>
      <Button asChild size="sm" variant="secondary"><Link to={to}>Ver</Link></Button>
    </Card>
  );
}

function Step({ icon: Icon, text, to }: { icon: any; text: string; to: string }) {
  return (
    <li>
      <Link to={to} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors group">
        <div className="h-8 w-8 rounded-md bg-primary/15 text-primary flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm flex-1">{text}</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-all" />
      </Link>
    </li>
  );
}

function EmptyChart() {
  return (
    <div className="h-[260px] flex flex-col items-center justify-center text-center text-muted-foreground border border-dashed border-border rounded-lg">
      <Bird className="h-10 w-10 mb-2 opacity-40" />
      <p className="text-sm">Cadastre um lote e adicione lançamentos diários</p>
      <Button asChild size="sm" variant="link"><Link to="/granja">Ir para Granja</Link></Button>
    </div>
  );
}
