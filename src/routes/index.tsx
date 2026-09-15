import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLotes, useAnimais, useTarefas, useEstoque, useFinanceiro, usePlantios } from "@/lib/state";
import { Beef, Zap, AlertTriangle, ArrowRight, Calendar, BookOpen, ListChecks, PackageX, Wallet, Sprout, BellRing, TrendingUp, TrendingDown, Sun, Moon, Sunrise, FileText } from "lucide-react";
import { WeatherWidget } from "@/components/WeatherWidget";
import { AIInsightsCard } from "@/components/AIInsightsCard";
import { InstallAppButton } from "@/components/InstallAppButton";
import { NoticiasAgro } from "@/components/NoticiasAgro";
import { PainelLoteAtivo } from "@/components/PainelLoteAtivo";
import { NotificationsManager } from "@/components/NotificationsManager";
import { AlertasInteligentes } from "@/components/AlertasInteligentes";
import { useFazenda } from "@/lib/cloud/fazenda";
import { useLembretes, lembretesDoDia, proximosLembretes, verificarENotificar } from "@/lib/lembretes";
import { ALL_NAV_ITEMS, type NavItem } from "@/lib/nav";
import { diffDias, isoLocal } from "@/lib/data";

const ATALHOS: NavItem[] = ["/granja", "/pesagem-pro", "/entregas-racao", "/estoque", "/gado", "/financeiro", "/chat", "/agro-ia"]
  .map((to) => ALL_NAV_ITEMS.find((i) => i.to === to)!)
  .filter(Boolean);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgroSítio — Painel de Gestão Rural" },
      { name: "description", content: "Painel do sítio com clima ao vivo, IA agrícola, alertas, lembretes e indicadores de granja, gado e plantios." },
      { property: "og:title", content: "AgroSítio — Painel de Gestão Rural" },
      { property: "og:description", content: "Painel do sítio com clima ao vivo, IA agrícola, alertas, lembretes e indicadores de granja, gado e plantios." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  const hojeStr = today ? isoLocal(today) : "";
  const em7 = today ? isoLocal(new Date(today.getTime() + 7 * 86400000)) : "";
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
  const PeriodIcon = hora < 12 ? Sunrise : hora < 18 ? Sun : Moon;
  const nomeOperador = operador?.split(" ")[0] || "granjeiro";

  const totalMort = ativo?.entries.reduce((s, e) => s + e.mortalidade, 0) ?? 0;
  const vivas = ativo ? ativo.quantidadeInicial - totalMort : 0;
  const mortPct = ativo ? (totalMort / ativo.quantidadeInicial) * 100 : 0;


  return (
    <AppShell>
      <div className="space-y-7 md:space-y-10">
        <header
          className="reveal grain relative overflow-hidden rounded-lg border border-primary/15 px-5 py-7 md:px-8 md:py-9"
          style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-elevated)" }}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent pointer-events-none" />
          <div className="relative flex flex-col gap-8 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="eyebrow min-h-[16px]">
                {today ? today.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : ""}
              </p>
              <h1 className="mt-3 flex items-center gap-2 text-[clamp(1.75rem,6vw,3rem)] font-display font-bold leading-[1.08]">
                <span className="min-w-0 truncate">{saudacao}, <span className="text-gradient">{nomeOperador}</span></span>
                <PeriodIcon className="h-6 w-6 md:h-8 md:w-8 shrink-0 text-primary" strokeWidth={1.7} />
              </h1>
              <p className="mt-3 max-w-xl text-sm md:text-base leading-relaxed text-muted-foreground truncate">
                {fazendaNome ? `${fazendaNome} · Resumo de hoje no sítio` : "Resumo de hoje no sítio"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:shrink-0">
              <InstallAppButton />
              <Button asChild variant="outline" size="sm" className="w-full sm:w-auto"><Link to="/lembretes"><BellRing className="h-4 w-4" />Lembretes</Link></Button>
              <Button asChild variant="outline" size="sm" className="w-full sm:w-auto"><Link to="/diario"><BookOpen className="h-4 w-4" />Diário</Link></Button>
              <Button asChild size="sm" className="w-full sm:w-auto"><Link to="/relatorios"><FileText className="h-4 w-4" />Relatórios</Link></Button>
            </div>
          </div>
        </header>

        <section aria-label="Acesso rápido" className="reveal" style={{ "--reveal-delay": "80ms" } as React.CSSProperties}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="eyebrow">Acesso rápido</h2>
            <Link to="/modulos" className="group text-xs font-medium text-primary inline-flex items-center gap-1.5">
              Todos os módulos
              <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-3">
            {ATALHOS.map((a, i) => (
              <Link
                key={a.to}
                to={a.to}
                style={{ "--reveal-delay": `${120 + i * 40}ms` } as React.CSSProperties}
                className="reveal operational-surface lift sheen group flex flex-col items-center justify-center gap-2 py-4 px-1.5 text-center rounded-lg"
              >
                <a.icon className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-110" />
                <span className="text-[10px] leading-tight tracking-tight text-muted-foreground line-clamp-2 transition-colors group-hover:text-foreground">{a.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section aria-label="Lote atual" className="reveal" style={{ "--reveal-delay": "160ms" } as React.CSSProperties}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="eyebrow">Operação avícola</h2>
            <Link to="/manejo" className="group text-xs font-medium text-primary inline-flex items-center gap-1.5">
              Abrir manejo
              <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
          <PainelLoteAtivo />
        </section>



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
            plantios_ativos: plantiosAtivos.map((p) => ({ cultura: p.cultura, area_ha: p.areaHa, dias_para_colheita: p.previsaoColheita ? diffDias(new Date(), p.previsaoColheita) : null })),
            estoque_baixo: estoqueBaixo.map((i) => ({ nome: i.nome, qtd: i.quantidade, min: i.minimo })),
            financeiro: { contas_a_vencer: contasVencendo.length, saldo_previsto: -totalAVencer },
            tarefas_pendentes: tarefasPend.length,
          })} />
        </div>

        <NotificationsManager />

        <AlertasInteligentes />

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
    <Card className="reveal lift p-4 border-accent/40 bg-accent/10 flex items-center gap-3">
       <div className="h-9 w-9 shrink-0 rounded-md bg-accent/15 text-accent grid place-items-center">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm leading-snug truncate">{title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground truncate">{desc}</p>
      </div>
      <Button asChild size="sm" variant="secondary"><Link to={to}>Ver</Link></Button>
    </Card>
  );
}

function Step({ icon: Icon, text, to }: { icon: any; text: string; to: string }) {
  return (
    <li>
      <Link
        to={to}
         className="group flex items-center gap-3 p-3 rounded-md border border-transparent transition-all duration-300 hover:border-border hover:bg-muted/60"
      >
        <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm leading-snug flex-1">{text}</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary" />
      </Link>
    </li>
  );
}

