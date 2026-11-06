import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEstoque, useFinanceiro, useLotes, useTarefas } from "@/lib/state";
import { calcularResumoLote } from "@/lib/granja";
import { hojeISO, diffDias } from "@/lib/data";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, Bird,
  CalendarRange, CircleDollarSign, ClipboardList, Package, Scale, TrendingUp,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line,
  LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export const Route = createFileRoute("/painel-analitico")({
  head: () => ({
    meta: [
      { title: "Painel Analítico — Aviário Pro" },
      { name: "description", content: "Análise visual de produção, pesagens, mortalidade, financeiro e estoque com dados reais da fazenda." },
    ],
  }),
  component: PainelAnalitico,
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const num = (v: number, digits = 1) => Number.isFinite(v) ? v.toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits }) : "—";
const PALETTE = ["#16845b", "#58a985", "#8fc8a9", "#d2a64a", "#7195c7", "#b17caa"];

function PainelAnalitico() {
  const [lotes] = useLotes();
  const [financeiro] = useFinanceiro();
  const [estoque] = useEstoque();
  const [tarefas] = useTarefas();
  const [periodo, setPeriodo] = useState(90);
  const [loteId, setLoteId] = useState("todos");
  const hoje = hojeISO();

  const lotesAtivos = useMemo(() => lotes.filter((l) => !l.encerrado), [lotes]);
  const loteSelecionado = lotes.find((l) => l.id === loteId);
  const lotesVisiveis = loteId === "todos" ? lotes : loteSelecionado ? [loteSelecionado] : lotes;

  const producao = useMemo(() => {
    const limite = new Date();
    limite.setDate(limite.getDate() - periodo);
    const inicio = limite.toISOString().slice(0, 10);
    const pesagens = lotesVisiveis.flatMap((l) => (l.entries ?? [])
      .filter((e) => e.date >= inicio && e.date <= hoje && Number(e.pesoMedioG) > 0)
      .map((e) => ({ data: e.date, lote: l.numero, peso: Number(e.pesoMedioG), idade: Math.max(0, diffDias(l.dataEntrada, e.date)) })))
      .sort((a, b) => a.data.localeCompare(b.data));
    const mortalidadePorDia = new Map<string, number>();
    lotesVisiveis.forEach((l) => (l.entries ?? []).filter((e) => e.date >= inicio && e.date <= hoje)
      .forEach((e) => mortalidadePorDia.set(e.date, (mortalidadePorDia.get(e.date) ?? 0) + Math.max(0, Number(e.mortalidade) || 0) + Math.max(0, Number(e.eliminados) || 0))));
    const mortalidade = [...mortalidadePorDia.entries()].sort(([a], [b]) => a.localeCompare(b))
      .map(([data, aves]) => ({ data: data.slice(5).split("-").reverse().join("/"), aves }));
    const pesos = pesagens.map((p) => ({ data: p.data.slice(5).split("-").reverse().join("/"), peso: p.peso, lote: p.lote }));
    return { pesagens, pesos, mortalidade };
  }, [lotesVisiveis, periodo, hoje]);

  const resumo = useMemo(() => lotesAtivos.map((l) => ({ lote: l, dados: calcularResumoLote(l) })), [lotesAtivos]);
  const totalAlojadas = resumo.reduce((s, x) => s + x.lote.quantidadeInicial, 0);
  const totalVivas = resumo.reduce((s, x) => s + x.dados.vivas, 0);
  const baixas = resumo.reduce((s, x) => s + x.dados.baixas, 0);
  const viabilidade = totalAlojadas > 0 ? (totalVivas / totalAlojadas) * 100 : null;
  const pendentes = tarefas.filter((t) => !t.concluida).length;
  const atrasadas = tarefas.filter((t) => !t.concluida && t.vencimento && t.vencimento < hoje).length;

  const financeiroMensal = useMemo(() => {
    const base = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const d = new Date(base.getFullYear(), base.getMonth() - (5 - index), 1);
      const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const rows = financeiro.filter((l) => (l.data ?? "").startsWith(chave));
      const receita = rows.filter((l) => l.tipo === "receita").reduce((s, l) => s + Math.max(0, Number(l.valor) || 0), 0);
      const despesa = rows.filter((l) => l.tipo === "despesa").reduce((s, l) => s + Math.max(0, Number(l.valor) || 0), 0);
      return { mes: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""), receita, despesa, saldo: receita - despesa };
    });
  }, [financeiro]);

  const estoqueCritico = estoque.filter((i) => i.minimo !== undefined && i.quantidade <= (i.minimo ?? 0));
  const estoqueChart = estoque.filter((i) => Number.isFinite(i.quantidade) && i.quantidade >= 0)
    .slice().sort((a, b) => a.quantidade - b.quantidade).slice(0, 7)
    .map((i) => ({ item: i.nome.length > 18 ? i.nome.slice(0, 18) + "…" : i.nome, atual: i.quantidade, minimo: i.minimo ?? 0, unidade: i.unidade }));
  const totalReceitas = financeiroMensal.reduce((s, x) => s + x.receita, 0);
  const totalDespesas = financeiroMensal.reduce((s, x) => s + x.despesa, 0);
  const distribuicao = [
    { name: "Receitas", value: totalReceitas },
    { name: "Despesas", value: totalDespesas },
  ].filter((x) => x.value > 0);

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Inteligência da fazenda</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Painel analítico</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Indicadores e gráficos construídos a partir dos lançamentos reais da propriedade. Dados ausentes não são preenchidos artificialmente.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[30, 90, 180, 365].map((dias) => <Button key={dias} size="sm" variant={periodo === dias ? "default" : "outline"} onClick={() => setPeriodo(dias)}>{dias} dias</Button>)}
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Kpi icon={Bird} label="Lotes ativos" value={String(lotesAtivos.length)} note={`${totalAlojadas.toLocaleString("pt-BR")} aves alojadas`} />
          <Kpi icon={Activity} label="Aves vivas estimadas" value={totalAlojadas ? totalVivas.toLocaleString("pt-BR") : "—"} note={viabilidade === null ? "Sem lote ativo" : `${num(viabilidade)}% de viabilidade`} />
          <Kpi icon={Scale} label="Baixas acumuladas" value={totalAlojadas ? baixas.toLocaleString("pt-BR") : "—"} note="Mortalidade + eliminados dos lotes ativos" />
          <Kpi icon={ClipboardList} label="Tarefas pendentes" value={String(pendentes)} note={atrasadas ? `${atrasadas} atrasada(s) — revisar` : "Nenhuma tarefa atrasada"} warning={atrasadas > 0} />
        </div>

        <section className="grid gap-4 xl:grid-cols-5">
          <Card className="overflow-hidden p-4 sm:p-5 xl:col-span-3">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div><div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /><h2 className="text-lg font-semibold">Evolução das pesagens</h2></div><p className="mt-1 text-xs text-muted-foreground">Peso médio registrado (gramas) por data</p></div>
              <select aria-label="Filtrar lote" value={loteId} onChange={(e) => setLoteId(e.target.value)} className="h-9 max-w-44 rounded-lg border border-input bg-background px-3 text-xs">
                <option value="todos">Todos os lotes</option>
                {lotes.map((l) => <option key={l.id} value={l.id}>Lote {l.numero}</option>)}
              </select>
            </div>
            {producao.pesos.length ? <div className="h-72 rounded-xl bg-gradient-to-br from-primary/[0.07] via-transparent to-emerald-500/[0.04] p-2 [filter:drop-shadow(0_12px_14px_rgb(20_90_60/0.08))]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={producao.pesos} margin={{ top: 12, right: 12, left: -16, bottom: 4 }}>
                  <defs><linearGradient id="pesoGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#16845b" stopOpacity={0.28} /><stop offset="100%" stopColor="#16845b" stopOpacity={0.02} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.65} />
                  <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={48} />
                  <Tooltip formatter={(v) => [`${Number(v).toLocaleString("pt-BR")} g`, "Peso médio"]} labelFormatter={(v) => `Data: ${v}`} />
                  <Line type="monotone" dataKey="peso" name="Peso médio" stroke="#16845b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            </div> : <Empty text="Ainda não há pesagens registradas neste período para os lotes selecionados." link="/pesagem-pro" label="Registrar pesagem" />}
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground"><span>{producao.pesagens.length} pesagem(ns) encontradas</span><Link to="/pesagem-pro" className="font-semibold text-primary">Abrir pesagem →</Link></div>
          </Card>

          <Card className="p-4 sm:p-5 xl:col-span-2">
            <div className="mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /><h2 className="text-lg font-semibold">Baixas por dia</h2></div>
            <p className="mb-4 text-xs text-muted-foreground">Mortalidade e eliminados registrados por data</p>
            {producao.mortalidade.length ? <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={producao.mortalidade} margin={{ top: 10, right: 6, left: -18, bottom: 4 }}>
                  <defs><linearGradient id="mortGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d97736" /><stop offset="100%" stopColor="#f1c28a" /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.65} />
                  <XAxis dataKey="data" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                  <Tooltip formatter={(v) => [Number(v).toLocaleString("pt-BR"), "Aves"]} />
                  <Bar dataKey="aves" name="Baixas" fill="url(#mortGradient)" radius={[7, 7, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div> : <Empty text="Sem registros de mortalidade ou eliminados no período." link="/granja" label="Abrir lotes" />}
            <div className="mt-3 text-xs text-muted-foreground">{producao.mortalidade.reduce((s, x) => s + x.aves, 0).toLocaleString("pt-BR")} baixa(s) registradas no período</div>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-5">
          <Card className="p-4 sm:p-5 xl:col-span-3">
            <div className="mb-1 flex items-center gap-2"><CircleDollarSign className="h-4 w-4 text-primary" /><h2 className="text-lg font-semibold">Fluxo financeiro</h2></div>
            <p className="mb-4 text-xs text-muted-foreground">Receitas e despesas lançadas nos últimos seis meses</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl border border-emerald-700/15 bg-emerald-500/[0.06] p-3"><p className="text-xs text-muted-foreground">Receitas</p><p className="mt-1 text-lg font-bold tabular-nums">{brl(totalReceitas)}</p></div>
              <div className="rounded-xl border border-rose-700/15 bg-rose-500/[0.06] p-3"><p className="text-xs text-muted-foreground">Despesas</p><p className="mt-1 text-lg font-bold tabular-nums">{brl(totalDespesas)}</p></div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financeiroMensal} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="receitaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#16845b" stopOpacity={0.3} /><stop offset="100%" stopColor="#16845b" stopOpacity={0.02} /></linearGradient>
                    <linearGradient id="despesaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d97736" stopOpacity={0.24} /><stop offset="100%" stopColor="#d97736" stopOpacity={0.02} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.65} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} width={42} />
                  <Tooltip formatter={(v) => [brl(Number(v)), ""]} />
                  <Legend />
                  <Area type="monotone" dataKey="receita" name="Receitas" stroke="#16845b" fill="url(#receitaFill)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="despesa" name="Despesas" stroke="#d97736" fill="url(#despesaFill)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex justify-end"><Link to="/financeiro" className="text-xs font-semibold text-primary">Abrir financeiro →</Link></div>
          </Card>

          <Card className="p-4 sm:p-5 xl:col-span-2">
            <div className="mb-1 flex items-center gap-2"><Package className="h-4 w-4 text-primary" /><h2 className="text-lg font-semibold">Situação do estoque</h2></div>
            <p className="mb-4 text-xs text-muted-foreground">Itens com menor quantidade cadastrada</p>
            {estoqueChart.length ? <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={estoqueChart} layout="vertical" margin={{ top: 4, right: 18, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="item" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v, name, item) => [`${Number(v).toLocaleString("pt-BR")} ${item.payload.unidade}`, name === "atual" ? "Quantidade atual" : "Mínimo"]} />
                  <Bar dataKey="atual" name="Atual" radius={[0, 6, 6, 0]}>{estoqueChart.map((entry, index) => <Cell key={entry.item + index} fill={entry.atual <= entry.minimo ? "#d97736" : PALETTE[index % PALETTE.length]} />)}</Bar>
                  <Bar dataKey="minimo" name="Mínimo" fill="#9ca3af" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div> : <Empty text="Cadastre itens no estoque para visualizar este gráfico." link="/estoque" label="Abrir estoque" />}
            <div className="mt-3 flex items-center justify-between gap-2"><Badge variant={estoqueCritico.length ? "destructive" : "secondary"}>{estoqueCritico.length} abaixo do mínimo</Badge><Link to="/estoque" className="text-xs font-semibold text-primary">Gerenciar →</Link></div>
          </Card>
        </section>

        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-semibold">Resumo por lote</h2><p className="text-xs text-muted-foreground">Indicadores calculados com os registros disponíveis até hoje</p></div><Link to="/indicadores" className="text-xs font-semibold text-primary">Indicadores completos →</Link></div>
          {resumo.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {resumo.map(({ lote, dados }) => <div key={lote.id} className="rounded-xl border border-border bg-gradient-to-br from-card to-primary/[0.035] p-4 shadow-[0_8px_24px_-20px_rgba(20,90,60,0.45)]">
              <div className="flex items-center justify-between gap-2"><span className="font-semibold">Lote {lote.numero}</span><Badge variant={dados.situacao === "critico" ? "destructive" : dados.situacao === "atencao" ? "outline" : "secondary"}>{dados.situacao === "sem_pesagem" ? "Sem pesagem" : dados.situacao === "critico" ? "Atenção crítica" : dados.situacao === "atencao" ? "Acompanhar" : "Dentro da referência"}</Badge></div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Mini label="Idade" value={`D${dados.idade}`} />
                <Mini label="Aves vivas" value={dados.vivas.toLocaleString("pt-BR")} />
                <Mini label="Mortalidade + eliminados" value={`${num(dados.mortalidadePct)}%`} />
                <Mini label="Último peso" value={dados.ultimaPesagem ? `${num(dados.ultimaPesagem.pesoG / 1000, 3)} kg` : "Sem dado"} />
              </div>
              <div className="mt-4 flex justify-end"><Link to="/granja/$id" params={{ id: lote.id }} className="text-xs font-semibold text-primary">Abrir lote →</Link></div>
            </div>)}
          </div> : <Empty text="Cadastre um lote para acompanhar os indicadores de produção." link="/granja" label="Cadastrar lote" />}
          <p className="mt-4 text-[11px] leading-5 text-muted-foreground">Observação: aves vivas e mortalidade são calculadas a partir dos lançamentos existentes. O gráfico de peso mostra somente pesagens registradas; não representa projeções. Valores financeiros consideram os lançamentos por data e não substituem conciliação bancária.</p>
        </Card>

        {distribuicao.length > 0 && <Card className="p-4 sm:p-5">
          <div className="mb-2 flex items-center gap-2"><CalendarRange className="h-4 w-4 text-primary" /><h2 className="text-lg font-semibold">Composição financeira do semestre</h2></div>
          <div className="grid items-center gap-4 md:grid-cols-2">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={distribuicao} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={4}>{distribuicao.map((entry, index) => <Cell key={entry.name} fill={index === 0 ? "#16845b" : "#d97736"} />)}</Pie><Tooltip formatter={(v) => brl(Number(v))} /></PieChart>
            </div>
            <div className="space-y-3">
              {distribuicao.map((item, index) => <div key={item.name} className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm"><span className="h-3 w-3 rounded-sm" style={{ background: index === 0 ? "#16845b" : "#d97736" }} />{item.name}</span><strong className="tabular-nums">{brl(item.value)}</strong></div>)}
              <div className="border-t border-border pt-3"><p className="text-xs text-muted-foreground">Saldo do período</p><p className="text-2xl font-bold tabular-nums">{brl(totalReceitas - totalDespesas)}</p></div>
            </div>
          </div>
        </Card>}
      </div>
    </AppShell>
  );
}

function Kpi({ icon: Icon, label, value, note, warning = false }: { icon: typeof Bird; label: string; value: string; note: string; warning?: boolean }) {
  return <Card className="relative overflow-hidden p-4 shadow-[0_10px_28px_-22px_rgba(20,90,60,0.55)]">
    <div className="absolute -right-4 -top-5 h-20 w-20 rounded-full bg-primary/[0.06] blur-xl" />
    <div className="relative flex items-center justify-between gap-2"><span className="text-xs font-medium text-muted-foreground">{label}</span><Icon className={`h-4 w-4 ${warning ? "text-amber-600" : "text-primary"}`} /></div>
    <p className="relative mt-2 text-2xl font-bold tabular-nums sm:text-3xl">{value}</p>
    <p className={`relative mt-1 text-[11px] ${warning ? "text-amber-700" : "text-muted-foreground"}`}>{note}</p>
  </Card>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p></div>;
}

function Empty({ text, link, label }: { text: string; link: "/pesagem-pro" | "/granja" | "/estoque"; label: string }) {
  return <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-5 text-center"><AlertTriangle className="h-6 w-6 text-muted-foreground/60" /><p className="mt-3 max-w-sm text-sm text-muted-foreground">{text}</p><Button asChild variant="outline" size="sm" className="mt-4"><Link to={link}>{label}</Link></Button></div>;
}
