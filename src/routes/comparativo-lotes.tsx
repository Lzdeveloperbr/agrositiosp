import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLotes } from "@/lib/state";
import { fechamentoLote, type FechamentoLote } from "@/lib/fechamentoLote";
import { gerarComparativoLotesPDF } from "@/lib/pdf";
import { Trophy, ArrowRight, TrendingUp, TrendingDown, Bird, Scale, Skull, Target, Wheat, FileText } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export const Route = createFileRoute("/comparativo-lotes")({
  head: () => ({
    meta: [
      { title: "Comparativo de Lotes — AgroSítio" },
      { name: "description", content: "Compare mortalidade, peso, conversão e rentabilidade de todos os lotes da granja com ranking automático." },
      { property: "og:title", content: "Comparativo de Lotes — AgroSítio" },
      { property: "og:description", content: "Compare mortalidade, peso, conversão e rentabilidade de todos os lotes da granja com ranking automático." },
    ],
  }),
  component: Comparativo,
});

type Ord = "lucro" | "mort" | "peso" | "ca" | "viab" | "data";

function Comparativo() {
  const [lotes] = useLotes();
  const [ord, setOrd] = useState<Ord>("lucro");
  const [filtro, setFiltro] = useState<"todos" | "ativos" | "encerrados">("todos");

  const dados = useMemo<FechamentoLote[]>(() => {
    return lotes.map((l) => fechamentoLote(l));
  }, [lotes]);

  const filtrados = dados.filter((d) => {
    if (filtro === "ativos") return !d.encerrado;
    if (filtro === "encerrados") return d.encerrado;
    return true;
  });

  const sorted = [...filtrados].sort((a, b) => {
    if (ord === "lucro") return b.lucroLiquido - a.lucroLiquido;
    if (ord === "mort") return a.mortPct - b.mortPct;
    if (ord === "peso") return (b.pesoMedioG ?? 0) - (a.pesoMedioG ?? 0);
    if (ord === "ca") return a.caEstimado - b.caEstimado;
    if (ord === "viab") return b.viabilidade - a.viabilidade;
    return b.numero.localeCompare(a.numero);
  });

  const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  // KPIs agregados
  const totReceita = filtrados.reduce((s, d) => s + d.receitaEstimada, 0);
  const totCusto = filtrados.reduce((s, d) => s + d.custoTotal, 0);
  const totLucro = totReceita - totCusto;
  const mediaMort = filtrados.length ? filtrados.reduce((s, d) => s + d.mortPct, 0) / filtrados.length : 0;
  const mediaCA = filtrados.length ? filtrados.reduce((s, d) => s + d.caEstimado, 0) / filtrados.length : 0;

  const chartData = sorted.slice(0, 12).map((d) => ({
    lote: d.numero,
    Mortalidade: Number(d.mortPct.toFixed(2)),
    CA: Number(d.caEstimado.toFixed(2)),
    Viabilidade: Number(d.viabilidade.toFixed(2)),
  }));

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold flex items-center gap-2"><Trophy className="h-7 w-7 text-primary" /> Comparativo de Lotes</h1>
            <p className="text-muted-foreground mt-1">Ranking automático de desempenho e rentabilidade.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => gerarComparativoLotesPDF(sorted)} disabled={!sorted.length}>
              <FileText className="h-4 w-4 mr-1" /> PDF
            </Button>
            <select value={filtro} onChange={(e) => setFiltro(e.target.value as any)} className="rounded-md border border-border bg-background px-3 py-1.5 text-sm">
              <option value="todos">Todos os lotes</option>
              <option value="ativos">Apenas ativos</option>
              <option value="encerrados">Apenas encerrados</option>
            </select>
            <select value={ord} onChange={(e) => setOrd(e.target.value as Ord)} className="rounded-md border border-border bg-background px-3 py-1.5 text-sm">
              <option value="lucro">↓ Lucro</option>
              <option value="mort">↑ Menor mortalidade</option>
              <option value="peso">↓ Maior peso</option>
              <option value="ca">↑ Melhor CA</option>
              <option value="viab">↓ Maior viabilidade</option>
              <option value="data">↓ Mais recente</option>
            </select>
          </div>
        </div>

        {filtrados.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <Bird className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum lote para comparar ainda.</p>
            <Button asChild className="mt-3"><Link to="/granja">Cadastrar lote</Link></Button>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi icon={TrendingUp} label="Receita total" value={fmtBRL(totReceita)} tone="primary" />
              <Kpi icon={TrendingDown} label="Custo total" value={fmtBRL(totCusto)} tone="destructive" />
              <Kpi icon={Trophy} label={totLucro >= 0 ? "Lucro acumulado" : "Prejuízo acumulado"} value={fmtBRL(totLucro)} tone={totLucro >= 0 ? "accent" : "destructive"} />
              <Kpi icon={Target} label="Médias" value={`${mediaMort.toFixed(2)}% · CA ${mediaCA.toFixed(2)}`} tone="muted" />
            </div>

            <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
              <h2 className="font-display font-semibold text-lg mb-3">Desempenho por lote</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                  <XAxis dataKey="lote" fontSize={11} stroke="var(--muted-foreground)" />
                  <YAxis fontSize={11} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Mortalidade" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="CA" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Viabilidade" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-0 overflow-hidden" style={{ background: "var(--gradient-surface)" }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground uppercase tracking-wider bg-muted/30">
                    <tr>
                      <th className="text-left py-3 px-4">#</th>
                      <th className="text-left py-3">Lote</th>
                      <th className="text-right py-3"><Skull className="h-3 w-3 inline" /> Mort.</th>
                      <th className="text-right py-3"><Bird className="h-3 w-3 inline" /> Viab.</th>
                      <th className="text-right py-3"><Scale className="h-3 w-3 inline" /> Peso</th>
                      <th className="text-right py-3"><Target className="h-3 w-3 inline" /> CA</th>
                      <th className="text-right py-3"><Wheat className="h-3 w-3 inline" /> Ração</th>
                      <th className="text-right py-3 pr-2">Receita</th>
                      <th className="text-right py-3 pr-2">Custo</th>
                      <th className="text-right py-3 pr-2">Lucro</th>
                      <th className="text-right py-3 pr-4">R$/ave</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((d, i) => (
                      <tr key={d.loteId} className="border-t border-border/40 hover:bg-muted/20">
                        <td className="py-3 px-4">
                          {i === 0 && ord === "lucro" ? <Badge>🥇 #1</Badge> : <span className="text-muted-foreground">{i + 1}</span>}
                        </td>
                        <td className="py-3">
                          <div className="font-semibold">{d.numero}</div>
                          <div className="text-xs text-muted-foreground">{d.encerrado ? "Encerrado" : `D${d.idade}/${d.diasPrevistos}`}</div>
                        </td>
                        <td className="py-3 text-right tabular-nums">{d.mortPct.toFixed(2)}%</td>
                        <td className="py-3 text-right tabular-nums">{d.viabilidade.toFixed(2)}%</td>
                        <td className="py-3 text-right tabular-nums">{d.pesoMedioG ? `${d.pesoMedioG} g` : "—"}</td>
                        <td className="py-3 text-right tabular-nums">{d.caEstimado.toFixed(2)}</td>
                        <td className="py-3 text-right tabular-nums">{(d.racaoConsumidaKg / 1000).toFixed(1)} t</td>
                        <td className="py-3 text-right tabular-nums pr-2">{fmtBRL(d.receitaEstimada)}</td>
                        <td className="py-3 text-right tabular-nums pr-2 text-destructive">{fmtBRL(d.custoTotal)}</td>
                        <td className={`py-3 text-right tabular-nums pr-2 font-semibold ${d.lucroLiquido >= 0 ? "text-primary" : "text-destructive"}`}>{fmtBRL(d.lucroLiquido)}</td>
                        <td className="py-3 text-right tabular-nums pr-4">{d.lucroPorAve.toFixed(2)}</td>
                        <td className="py-3 pr-3 text-right">
                          <Button asChild size="icon" variant="ghost" className="h-7 w-7"><Link to={`/granja/${d.loteId}`}><ArrowRight className="h-3.5 w-3.5" /></Link></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <p className="text-xs text-muted-foreground text-center">
              Custos calculados com referência: pintinho R$ 2,80 · ração R$ 2,50/kg. Ajuste no detalhe do lote (fechamento financeiro).
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: "primary" | "accent" | "destructive" | "muted" }) {
  const color = tone === "destructive" ? "text-destructive" : tone === "accent" ? "text-accent" : tone === "muted" ? "text-muted-foreground" : "text-primary";
  return (
    <Card className="p-4 flex items-center gap-3" style={{ background: "var(--gradient-surface)" }}>
      <div className={`h-9 w-9 rounded-lg bg-muted/60 flex items-center justify-center ${color}`}><Icon className="h-4 w-4" /></div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`font-display font-bold text-lg truncate ${color}`}>{value}</p>
      </div>
    </Card>
  );
}
