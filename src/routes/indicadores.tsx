import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLotes, useFinanceiro } from "@/lib/state";
import { BarChart3, Trophy, TrendingUp, Wallet, Sprout } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { isoLocal, diffDias, hojeISO } from "@/lib/data";

export const Route = createFileRoute("/indicadores")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Indicadores Comparativos — Aviário Pro" },
      { name: "description", content: "Compare lotes e períodos com ranking de desempenho, gráficos e evolução financeira da propriedade." },
      { property: "og:title", content: "Indicadores Comparativos — Aviário Pro" },
      { property: "og:description", content: "Ranking de lotes e evolução financeira mês a mês." },
    ],
  }),
  component: IndicadoresPage,
});

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const n2 = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : "—");

type LoteKPI = {
  id: string; numero: string; dias: number; alojadas: number; vivas: number;
  mortPct: number; viab: number; pesoKg: number; gpd: number; iep: number;
};

function IndicadoresPage() {
  const [lotes] = useLotes();
  const [financ] = useFinanceiro();
  const [meses, setMeses] = useState(12);

  const kpis: LoteKPI[] = useMemo(() => {
    return lotes.map((l) => {
      const entries = [...(l.entries ?? [])].sort((a, b) => a.date.localeCompare(b.date));
      const mortos = entries.reduce((s, e) => s + (e.mortalidade || 0) + (e.eliminados || 0), 0);
      const dias = entries.length ? Math.max(0, diffDias(l.dataEntrada, entries.at(-1)?.date ?? hojeISO())) : 0;
      const alojadas = l.quantidadeInicial || 0;
      const vivas = Math.max(alojadas - mortos, 0);
      const viab = alojadas ? (vivas / alojadas) * 100 : 0;
      const ultimoPeso = [...entries].reverse().find((e) => (e.pesoMedioG ?? 0) > 0)?.pesoMedioG ?? 0;
      const pesoKg = ultimoPeso / 1000;
      const gpd = dias > 0 ? (ultimoPeso - 45) / dias : 0;
      const iep = 0; // CA real indisponível: não inventar IEP.
      return {
        id: l.id, numero: l.numero, dias, alojadas, vivas,
        mortPct: alojadas ? (mortos / alojadas) * 100 : 0,
        viab, pesoKg, gpd, iep,
      };
    });
  }, [lotes]);

  const ranking = useMemo(() => [...kpis].sort((a, b) => b.viab - a.viab), [kpis]);
  const melhor = ranking[0];
  const mediaIEP = kpis.length ? kpis.reduce((s, k) => s + k.iep, 0) / kpis.length : 0;
  const mediaViab = kpis.length ? kpis.reduce((s, k) => s + k.viab, 0) / kpis.length : 0;
  const mediaGPD = kpis.length ? kpis.reduce((s, k) => s + k.gpd, 0) / kpis.length : 0;

  const serieFin = useMemo(() => {
    const base = new Date();
    const out: { mes: string; receita: number; despesa: number; lucro: number }[] = [];
    for (let i = meses - 1; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const rows = financ.filter((l) => (l.data ?? "").startsWith(key));
      const receita = rows.filter((l) => l.tipo === "receita").reduce((s, l) => s + l.valor, 0);
      const despesa = rows.filter((l) => l.tipo === "despesa").reduce((s, l) => s + l.valor, 0);
      out.push({ mes: d.toLocaleDateString("pt-BR", { month: "short" }), receita, despesa, lucro: receita - despesa });
    }
    return out;
  }, [financ, meses]);

  const totalReceita = serieFin.reduce((s, m) => s + m.receita, 0);
  const totalDespesa = serieFin.reduce((s, m) => s + m.despesa, 0);

  const porCategoria = useMemo(() => {
    const map = new Map<string, number>();
    const limite = isoLocal(new Date(new Date().setMonth(new Date().getMonth() - meses)));
    financ.filter((l) => l.tipo === "despesa" && (l.data ?? "") >= limite)
      .forEach((l) => map.set(l.categoria || "Outros", (map.get(l.categoria || "Outros") ?? 0) + l.valor));
    return [...map.entries()].map(([categoria, valor]) => ({ categoria, valor })).sort((a, b) => b.valor - a.valor).slice(0, 8);
  }, [financ, meses]);

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Inteligência</p>
            <h1 className="text-2xl md:text-3xl font-display font-bold tracking-[-0.03em]">Indicadores Comparativos</h1>
            <p className="text-sm text-muted-foreground mt-1">Compare lotes e períodos com ranking de desempenho.</p>
          </div>
          <div className="flex gap-2">
            {[3, 6, 12, 24].map((m) => (
              <Button key={m} size="sm" variant={meses === m ? "default" : "outline"} onClick={() => setMeses(m)}>{m}m</Button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Maior viabilidade" value={melhor ? `${n2(melhor.viab)}%` : "—"} hint={melhor ? `Lote ${melhor.numero}` : "sem dados"} icon={Trophy} tone="accent" />
          <StatCard label="Lotes registrados" value={String(kpis.length)} hint={`${kpis.length} lote(s)`} icon={BarChart3} tone="primary" />
          <StatCard label="Viabilidade média" value={`${n2(mediaViab)}%`} hint={`GPD médio ${n2(mediaGPD)} g/dia`} icon={TrendingUp} tone="primary" />
          <StatCard label="Resultado do período" value={fmtBRL(totalReceita - totalDespesa)} hint={`${fmtBRL(totalReceita)} - ${fmtBRL(totalDespesa)}`} icon={Wallet} tone={totalReceita - totalDespesa >= 0 ? "accent" : "destructive"} />
        </div>

        <Tabs defaultValue="lotes">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="lotes">Lotes</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          </TabsList>

          <TabsContent value="lotes" className="space-y-4 mt-4">
            <Card className="p-4">
              <h2 className="font-semibold mb-3">Viabilidade por lote</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ranking.map((r) => ({ nome: r.numero, IEP: Math.round(r.iep), Viabilidade: Number(r.viab.toFixed(1)) }))}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="nome" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Viabilidade" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4 overflow-x-auto">
              <h2 className="font-semibold mb-3">Ranking de desempenho</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead className="text-right">Dias</TableHead>
                    <TableHead className="text-right">Alojadas</TableHead>
                    <TableHead className="text-right">Mort.</TableHead>
                    <TableHead className="text-right">Viab.</TableHead>
                    <TableHead className="text-right">Peso</TableHead>
                    <TableHead className="text-right">GPD</TableHead>
                    <TableHead className="text-right">IEP / CA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.map((r, i) => (
                    <TableRow key={r.id}>
                      <TableCell>{i + 1}º</TableCell>
                      <TableCell className="font-medium">{r.numero}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.dias}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.alojadas.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right tabular-nums">{n2(r.mortPct)}%</TableCell>
                      <TableCell className="text-right tabular-nums">{n2(r.viab)}%</TableCell>
                      <TableCell className="text-right tabular-nums">{n2(r.pesoKg)} kg</TableCell>
                      <TableCell className="text-right tabular-nums">{n2(r.gpd)} g</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={r.iep >= mediaIEP ? "secondary" : "outline"}>—</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {ranking.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum lote cadastrado ainda.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="financeiro" className="space-y-4 mt-4">
            <Card className="p-4">
              <h2 className="font-semibold mb-3">Receita x Despesa x Lucro</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={serieFin}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="mes" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip formatter={(v: any) => fmtBRL(Number(v))} />
                    <Legend />
                    <Line type="monotone" dataKey="receita" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="despesa" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="lucro" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-4">
              <h2 className="font-semibold mb-3">Maiores despesas por categoria</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={porCategoria} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis type="number" fontSize={11} />
                    <YAxis type="category" dataKey="categoria" width={110} fontSize={11} />
                    <Tooltip formatter={(v: any) => fmtBRL(Number(v))} />
                    <Bar dataKey="valor" fill="hsl(var(--destructive))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </AppShell>
  );
}
