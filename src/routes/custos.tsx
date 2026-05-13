import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLotes, useFinanceiro, useEstoque } from "@/lib/state";
import { TrendingUp, TrendingDown, Bird, Wallet, Percent, Scale, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

export const Route = createFileRoute("/custos")({
  head: () => ({
    meta: [
      { title: "Custos por Lote — AgroSítio" },
      { name: "description", content: "Análise de custo, receita prevista, margem real e projeção de lucro de cada lote da granja com indicadores zootécnicos." },
    ],
  }),
  component: CustosPage,
});

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtPct = (v: number) => `${v.toFixed(2)}%`;

function CustosPage() {
  const [lotes] = useLotes();
  const [fin] = useFinanceiro();
  const [estoque] = useEstoque();
  const [loteId, setLoteId] = useState<string>(() => lotes.find((l) => !l.encerrado)?.id ?? lotes[0]?.id ?? "");
  const lote = lotes.find((l) => l.id === loteId);

  const analise = useMemo(() => {
    if (!lote) return null;
    const inicio = lote.dataEntrada;
    const ents = [...lote.entries].sort((a, b) => a.date.localeCompare(b.date));
    const fim = ents[ents.length - 1]?.date ?? new Date().toISOString().slice(0, 10);
    const mort = ents.reduce((s, e) => s + e.mortalidade, 0);
    const vivas = lote.quantidadeInicial - mort;
    const mortPct = (mort / lote.quantidadeInicial) * 100;
    const pesoG = ents[ents.length - 1]?.pesoMedioG ?? 0;
    const pesoKg = pesoG / 1000;
    const dias = ents.length;
    const ganhoDiario = dias > 1 ? pesoG / dias : 0;

    // Despesas reais lançadas no período (módulo granja)
    const despesas = fin.filter((l) => l.tipo === "despesa" && (l.modulo === "granja" || !l.modulo) && l.data >= inicio && l.data <= fim);
    const receitas = fin.filter((l) => l.tipo === "receita" && l.modulo === "granja" && l.data >= inicio && l.data <= fim);
    const totalDesp = despesas.reduce((s, l) => s + l.valor, 0);
    const totalRec = receitas.reduce((s, l) => s + l.valor, 0);

    // Quebra por categoria
    const porCat: Record<string, number> = {};
    despesas.forEach((d) => { porCat[d.categoria || "outros"] = (porCat[d.categoria || "outros"] || 0) + d.valor; });
    const catData = Object.entries(porCat).map(([k, v]) => ({ name: k, valor: v })).sort((a, b) => b.valor - a.valor);

    // Estoque ração consumida no período (estimativa)
    const racao = estoque.filter((i) => i.categoria === "racao");
    const kgRacao = racao.reduce((s, r) => s + r.movimentacoes.filter((m) => m.tipo === "saida" && m.data >= inicio && m.data <= fim).reduce((a, m) => a + m.quantidade, 0), 0);

    // Projeção
    const precoKg = lote.precoKgVivo ?? 0;
    const receitaPrevista = vivas * pesoKg * precoKg;
    const margemPrevista = receitaPrevista - totalDesp;
    const margemPct = receitaPrevista > 0 ? (margemPrevista / receitaPrevista) * 100 : 0;

    // Conversão alimentar (kg ração / kg ganho)
    const kgGanhoTotal = vivas * pesoKg;
    const ca = kgGanhoTotal > 0 && kgRacao > 0 ? kgRacao / kgGanhoTotal : 0;

    // Custo por ave / por kg
    const custoPorAve = vivas > 0 ? totalDesp / vivas : 0;
    const custoPorKg = kgGanhoTotal > 0 ? totalDesp / kgGanhoTotal : 0;

    return { mort, vivas, mortPct, pesoKg, pesoG, dias, ganhoDiario, totalDesp, totalRec, catData, kgRacao, precoKg, receitaPrevista, margemPrevista, margemPct, ca, custoPorAve, custoPorKg };
  }, [lote, fin, estoque]);

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Custos por Lote</h1>
            <p className="text-muted-foreground text-sm">Receita prevista, margem real e indicadores zootécnicos.</p>
          </div>
          <div className="min-w-[220px]">
            <Label className="text-xs">Lote</Label>
            <Select value={loteId} onValueChange={setLoteId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {lotes.map((l) => (
                  <SelectItem key={l.id} value={l.id}>Lote {l.numero} {l.encerrado ? "(encerrado)" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </header>

        {!lote ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Bird className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>Cadastre um lote para ver os custos.</p>
            <Button asChild size="sm" className="mt-3"><Link to="/granja">Ir para Granja</Link></Button>
          </Card>
        ) : analise && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi label="Aves vivas" value={analise.vivas.toLocaleString("pt-BR")} hint={`${fmtPct(analise.mortPct)} mort.`} icon={Bird} tone="primary" />
              <Kpi label="Peso médio" value={`${analise.pesoKg.toFixed(2)} kg`} hint={`${analise.ganhoDiario.toFixed(0)} g/dia`} icon={Scale} tone="accent" />
              <Kpi label="Custo / kg vivo" value={fmt(analise.custoPorKg)} hint={`Custo/ave ${fmt(analise.custoPorAve)}`} icon={Wallet} tone={analise.custoPorKg > 5 ? "destructive" : "muted"} />
              <Kpi label="Conversão alimentar" value={analise.ca > 0 ? analise.ca.toFixed(2) : "—"} hint={`${analise.kgRacao.toFixed(0)} kg ração`} icon={Percent} tone={analise.ca > 0 && analise.ca < 1.7 ? "primary" : "muted"} />
            </div>

            <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display font-semibold">Projeção financeira</h2>
                  <p className="text-xs text-muted-foreground">Baseada em peso atual × aves vivas × R$/kg.</p>
                </div>
                <Badge variant={analise.margemPct >= 15 ? "default" : analise.margemPct >= 0 ? "secondary" : "destructive"}>
                  Margem {fmtPct(analise.margemPct)}
                </Badge>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <Box label="Receita prevista" value={fmt(analise.receitaPrevista)} sub={`R$ ${analise.precoKg.toFixed(2)}/kg`} icon={TrendingUp} positive />
                <Box label="Custo total no período" value={fmt(analise.totalDesp)} sub={`${analise.dias} dias`} icon={TrendingDown} />
                <Box label="Lucro previsto" value={fmt(analise.margemPrevista)} sub={analise.margemPrevista >= 0 ? "no positivo" : "atenção"} icon={Wallet} positive={analise.margemPrevista >= 0} />
              </div>
              {analise.precoKg === 0 && (
                <p className="text-xs text-muted-foreground mt-3">Defina o <strong>preço do kg vivo</strong> no lote para projeção precisa.</p>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold mb-3">Despesas por categoria</h3>
              {analise.catData.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem despesas lançadas no período do lote. <Link to="/financeiro" className="text-primary underline">Lançar uma despesa</Link>.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={analise.catData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`} fontSize={11} />
                    <YAxis dataKey="name" type="category" fontSize={12} width={110} />
                    <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
                      {analise.catData.map((_, i) => <Cell key={i} fill={i === 0 ? "var(--primary)" : "var(--accent)"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold mb-3">Indicadores zootécnicos</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <Mini label="Dias do lote" v={`${analise.dias}`} />
                <Mini label="Mortalidade" v={fmtPct(analise.mortPct)} />
                <Mini label="GPD" v={`${analise.ganhoDiario.toFixed(0)} g`} />
                <Mini label="IEP" v={analise.ca > 0 ? ((100 - analise.mortPct) * (analise.pesoKg) / (analise.ca * analise.dias) * 100).toFixed(0) : "—"} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">IEP = (Viabilidade × Peso) / (CA × Idade) × 100. Alvo &gt; 350.</p>
            </Card>

            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm"><Link to="/granja">Editar lote</Link></Button>
              <Button asChild size="sm"><Link to="/relatorios">Ver relatórios <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Kpi({ label, value, hint, icon: Icon, tone }: any) {
  const toneCls = tone === "destructive" ? "text-destructive" : tone === "primary" ? "text-primary" : tone === "accent" ? "text-accent" : "text-muted-foreground";
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${toneCls}`} />
      </div>
      <div className="text-xl font-display font-bold">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </Card>
  );
}
function Box({ label, value, sub, icon: Icon, positive }: any) {
  return (
    <div className="p-3 rounded-lg border border-border/60 bg-background/40">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className={`h-3.5 w-3.5 ${positive ? "text-primary" : "text-destructive"}`} /> {label}</div>
      <div className={`text-lg font-bold mt-1 ${positive ? "text-primary" : "text-destructive"}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}
function Mini({ label, v }: { label: string; v: string }) {
  return <div className="p-2.5 rounded-md bg-muted/40"><div className="text-[11px] text-muted-foreground">{label}</div><div className="font-semibold">{v}</div></div>;
}
