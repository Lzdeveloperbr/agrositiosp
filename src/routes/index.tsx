import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLotes, useAnimais, useTarefas, useEstoque, useFinanceiro, usePlantios } from "@/lib/state";
import { Beef, Zap, AlertTriangle, ArrowRight, Calendar, BookOpen, ListChecks, PackageX, Wallet, Sprout, BellRing, TrendingUp, TrendingDown } from "lucide-react";
import { WeatherWidget } from "@/components/WeatherWidget";
import { AIInsightsCard } from "@/components/AIInsightsCard";
import { InstallAppButton } from "@/components/InstallAppButton";
import { NoticiasAgro } from "@/components/NoticiasAgro";
import { PainelLoteAtivo } from "@/components/PainelLoteAtivo";
import { useFazenda } from "@/lib/cloud/fazenda";
import { useLembretes, lembretesDoDia, proximosLembretes, verificarENotificar } from "@/lib/lembretes";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgroSítio — Painel de Gestão Rural" },
      { name: "description", content: "Painel do sítio com clima ao vivo, IA agrícola, alertas, lembretes e indicadores de granja, gado e plantios." },
      { property: "og:title", content: "AgroSítio — Painel de Gestão Rural" },
      { property: "og:description", content: "Painel do sítio com clima ao vivo, IA agrícola, alertas, lembretes e indicadores de granja, gado e plantios." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [lotes] = useLotes();
  
  const [animais] = useAnimais();
  const [tarefas] = useTarefas();
  const [estoque] = useEstoque();
  const [financ] = useFinanceiro();
  const [plantios] = usePlantios();
  const { fazendaId, fazendaNome, operador } = useFazenda();
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
  const lembretesHoje = today ? lembretesDoDia(lembretes, today) : [];
  const lembretesProximos = today ? proximosLembretes(lembretes, 7, today) : [];

  const tarefasPend = tarefas.filter((t) => !t.concluida);
  const estoqueBaixo = estoque.filter((i) => i.minimo !== undefined && i.quantidade <= (i.minimo ?? 0));
  const hojeStr = today?.toISOString().slice(0, 10) ?? "";
  const em7 = today ? new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10) : "";
  const contasVencendo = financ.filter((l) => l.status !== "pago" && l.vencimento && l.vencimento <= em7);
  const contasAtrasadas = contasVencendo.filter((l) => l.vencimento! < hojeStr);
  const totalAVencer = contasVencendo.reduce((s, l) => s + (l.tipo === "despesa" ? l.valor : -l.valor), 0);

  // Resumo financeiro mensal
  const mesAtual = today ? today.toISOString().slice(0, 7) : "";
  const lancMes = financ.filter((l) => (l.data ?? l.vencimento ?? "").startsWith(mesAtual));
  const receitas = lancMes.filter((l) => l.tipo === "receita").reduce((s, l) => s + l.valor, 0);
  const despesas = lancMes.filter((l) => l.tipo === "despesa").reduce((s, l) => s + l.valor, 0);
  const lucro = receitas - despesas;
  const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  const hora = today?.getHours() ?? 12;
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const emoji = hora < 12 ? "🌅" : hora < 18 ? "☀️" : "🌙";
  const nomeOperador = operador?.split(" ")[0] || "granjeiro";

  const chartData = ativo
    ? [...ativo.entries]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((e, i) => ({ dia: `D${i + 1}`, peso: e.pesoMedioG ?? null, mortalidade: e.mortalidade }))
    : [];

  return (
    <AppShell>
      <div className="space-y-6 md:space-y-8">
        <header
          className="relative overflow-hidden rounded-2xl border border-border/60 p-5 md:p-7"
          style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-soft)" }}
        >
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs md:text-sm text-muted-foreground capitalize min-h-[18px]">
                {today ? today.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : ""}
              </p>
              <h1 className="text-2xl md:text-4xl font-display font-bold mt-1 truncate">
                {saudacao}, {nomeOperador} {emoji}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground mt-1 truncate">
                {fazendaNome ? `${fazendaNome} · Resumo de hoje no sítio` : "Resumo de hoje no sítio"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <InstallAppButton />
              <Button asChild variant="outline" size="sm"><Link to="/lembretes">Lembretes</Link></Button>
              <Button asChild variant="outline" size="sm"><Link to="/diario">+ Diário</Link></Button>
              <Button asChild size="sm"><Link to="/relatorios">Relatórios</Link></Button>
            </div>
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

        <PainelLoteAtivo />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard label="Cabeças de gado" value={ativosGado.length.toLocaleString("pt-BR")} hint={`${animais.length} no histórico`} icon={Beef} tone="accent" />
          <StatCard label="Plantios ativos" value={plantiosAtivos.length.toString()} hint={`${plantiosAtivos.reduce((s, p) => s + p.areaHa, 0).toFixed(1)} ha`} icon={Sprout} tone="primary" />
          <StatCard label="Receitas (mês)" value={fmtBRL(receitas)} hint={`${lancMes.filter(l => l.tipo === "receita").length} lançamentos`} icon={TrendingUp} tone="primary" />
          <StatCard label="Despesas (mês)" value={fmtBRL(despesas)} hint={`${lancMes.filter(l => l.tipo === "despesa").length} lançamentos`} icon={TrendingDown} tone="destructive" />
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 p-6" style={{ background: "var(--gradient-surface)" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display font-semibold text-lg">Lucro do mês</h2>
                <p className="text-sm text-muted-foreground">Receitas menos despesas em {mesAtual}</p>
              </div>
              <Badge variant={lucro >= 0 ? "secondary" : "destructive"}>{fmtBRL(lucro)}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg p-3 bg-primary/10 border border-primary/30">
                <p className="text-xs text-muted-foreground">Receitas</p>
                <p className="font-display text-lg font-bold text-primary">{fmtBRL(receitas)}</p>
              </div>
              <div className="rounded-lg p-3 bg-destructive/10 border border-destructive/30">
                <p className="text-xs text-muted-foreground">Despesas</p>
                <p className="font-display text-lg font-bold text-destructive">{fmtBRL(despesas)}</p>
              </div>
              <div className={`rounded-lg p-3 border ${lucro >= 0 ? "bg-accent/10 border-accent/30" : "bg-muted border-border"}`}>
                <p className="text-xs text-muted-foreground">Lucro</p>
                <p className={`font-display text-lg font-bold ${lucro >= 0 ? "text-accent" : "text-destructive"}`}>{fmtBRL(lucro)}</p>
              </div>
            </div>
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


        <NoticiasAgro limit={6} />
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
