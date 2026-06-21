import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLotes } from "@/lib/state";
import { fechamentoLote } from "@/lib/fechamentoLote";
import { History, Trophy, TrendingUp, TrendingDown, Bird, ArrowRight, Award } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export const Route = createFileRoute("/historico-lotes")({
  head: () => ({
    meta: [
      { title: "Histórico & Benchmark — AgroSítio" },
      { name: "description", content: "Evolução histórica dos lotes da granja com média móvel, recorde de melhor lote e comparação contra o benchmark da fazenda." },
      { property: "og:title", content: "Histórico & Benchmark — AgroSítio" },
      { property: "og:description", content: "Evolução histórica dos lotes da granja com média móvel, recorde de melhor lote e comparação contra o benchmark da fazenda." },
    ],
  }),
  component: HistoricoLotes;
});

function HistoricoLotes() {
  const [lotes] = useLotes();

  const dados = useMemo(() => {
    const calc = lotes.map((l) => ({ lote: l, f: fechamentoLote(l) }));
    // ordem cronológica
    return calc.sort((a, b) => a.lote.dataEntrada.localeCompare(b.lote.dataEntrada));
  }, [lotes]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  if (dados.length === 0) {
    return (
      <AppShell>
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-display font-bold flex items-center gap-2"><History className="h-7 w-7 text-primary" /> Histórico & Benchmark</h1>
          <Card className="p-8 text-center border-dashed">
            <Bird className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum lote registrado ainda.</p>
            <Button asChild className="mt-3"><Link to="/granja">Cadastrar lote</Link></Button>
          </Card>
        </div>
      </AppShell>
    );
  }

  // Benchmark = média histórica
  const n = dados.length;
  const media = {
    mort: dados.reduce((s, d) => s + d.f.mortPct, 0) / n,
    viab: dados.reduce((s, d) => s + d.f.viabilidade, 0) / n,
    ca: dados.reduce((s, d) => s + d.f.caEstimado, 0) / n,
    peso: dados.reduce((s, d) => s + (d.f.pesoMedioG ?? 0), 0) / n,
    lucroAve: dados.reduce((s, d) => s + d.f.lucroPorAve, 0) / n,
    receita: dados.reduce((s, d) => s + d.f.receitaEstimada, 0) / n,
  };

  // Melhores (recordes)
  const melhorLucro = [...dados].sort((a, b) => b.f.lucroLiquido - a.f.lucroLiquido)[0];
  const melhorMort = [...dados].sort((a, b) => a.f.mortPct - b.f.mortPct)[0];
  const melhorCA = [...dados].sort((a, b) => a.f.caEstimado - b.f.caEstimado)[0];

  const chartData = dados.map((d, i) => {
    // média móvel últimos 3
    const slice = dados.slice(Math.max(0, i - 2), i + 1);
    const m3 = slice.reduce((s, x) => s + x.f.mortPct, 0) / slice.length;
    return {
      lote: d.lote.numero,
      Mortalidade: Number(d.f.mortPct.toFixed(2)),
      Media3: Number(m3.toFixed(2)),
      CA: Number(d.f.caEstimado.toFixed(2)),
      Lucro: Math.round(d.f.lucroLiquido / 100) / 10, // em milhares
    };
  });

  function badgeBenchmark(valor: number, benchmark: number, menorMelhor = false) {
    const diff = menorMelhor ? benchmark - valor : valor - benchmark;
    const pct = benchmark !== 0 ? (diff / Math.abs(benchmark)) * 100 : 0;
    if (Math.abs(pct) < 2) return <Badge variant="outline" className="text-[10px]">na média</Badge>;
    if (pct > 0) return <Badge className="text-[10px] bg-primary/20 text-primary border-primary/40">+{pct.toFixed(1)}% acima</Badge>;
    return <Badge variant="destructive" className="text-[10px]">{pct.toFixed(1)}% abaixo</Badge>;
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl md:text-4xl font-display font-bold flex items-center gap-2"><History className="h-7 w-7 text-primary" /> Histórico & Benchmark</h1>
          <p className="text-muted-foreground mt-1">{n} lote(s) na sua granja. Cada um comparado contra a média histórica.</p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4" style={{ background: "var(--gradient-surface)" }}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Mortalidade média</p>
            <p className="font-display font-bold text-2xl text-destructive">{media.mort.toFixed(2)}%</p>
          </Card>
          <Card className="p-4" style={{ background: "var(--gradient-surface)" }}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Viabilidade média</p>
            <p className="font-display font-bold text-2xl text-primary">{media.viab.toFixed(2)}%</p>
          </Card>
          <Card className="p-4" style={{ background: "var(--gradient-surface)" }}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">CA médio</p>
            <p className="font-display font-bold text-2xl text-accent">{media.ca.toFixed(2)}</p>
          </Card>
          <Card className="p-4" style={{ background: "var(--gradient-surface)" }}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Lucro/ave médio</p>
            <p className="font-display font-bold text-2xl text-primary">{fmt(media.lucroAve)}</p>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <Recorde icon={Trophy} label="🥇 Maior lucro" lote={melhorLucro.lote.numero} valor={fmt(melhorLucro.f.lucroLiquido)} id={melhorLucro.lote.id} />
          <Recorde icon={Award} label="✨ Menor mortalidade" lote={melhorMort.lote.numero} valor={`${melhorMort.f.mortPct.toFixed(2)}%`} id={melhorMort.lote.id} />
          <Recorde icon={TrendingDown} label="🎯 Melhor CA" lote={melhorCA.lote.numero} valor={melhorCA.f.caEstimado.toFixed(2)} id={melhorCA.lote.id} />
        </div>

        <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
          <h2 className="font-display font-semibold text-lg mb-3">Evolução com média móvel (3 lotes)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
              <XAxis dataKey="lote" fontSize={11} stroke="var(--muted-foreground)" />
              <YAxis fontSize={11} stroke="var(--muted-foreground)" />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Mortalidade" stroke="var(--destructive)" strokeWidth={2} dot />
              <Line type="monotone" dataKey="Media3" stroke="var(--muted-foreground)" strokeWidth={1.5} strokeDasharray="5 5" name="Média 3" />
              <Line type="monotone" dataKey="CA" stroke="var(--accent)" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-0 overflow-hidden" style={{ background: "var(--gradient-surface)" }}>
          <div className="p-4 border-b border-border/60">
            <h2 className="font-display font-semibold text-lg">Lote a lote vs benchmark</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Comparado contra a média histórica da sua granja</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase tracking-wider bg-muted/30">
                <tr>
                  <th className="text-left py-3 px-4">Lote</th>
                  <th className="text-left py-3">Entrada</th>
                  <th className="text-right py-3">Mort. vs média</th>
                  <th className="text-right py-3 pr-2">CA vs média</th>
                  <th className="text-right py-3 pr-2">Lucro vs média</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...dados].reverse().map((d) => (
                  <tr key={d.lote.id} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="py-3 px-4 font-semibold">{d.lote.numero} {d.lote.encerrado && <Badge variant="secondary" className="ml-1 text-[10px]">encerrado</Badge>}</td>
                    <td className="py-3 text-muted-foreground text-xs">{new Date(d.lote.dataEntrada).toLocaleDateString("pt-BR")}</td>
                    <td className="py-3 text-right">
                      <div className="tabular-nums">{d.f.mortPct.toFixed(2)}%</div>
                      <div className="mt-0.5">{badgeBenchmark(d.f.mortPct, media.mort, true)}</div>
                    </td>
                    <td className="py-3 text-right pr-2">
                      <div className="tabular-nums">{d.f.caEstimado.toFixed(2)}</div>
                      <div className="mt-0.5">{badgeBenchmark(d.f.caEstimado, media.ca, true)}</div>
                    </td>
                    <td className="py-3 text-right pr-2">
                      <div className={`tabular-nums font-semibold ${d.f.lucroLiquido >= 0 ? "text-primary" : "text-destructive"}`}>{fmt(d.f.lucroLiquido)}</div>
                      <div className="mt-0.5">{badgeBenchmark(d.f.lucroLiquido, dados.reduce((s, x) => s + x.f.lucroLiquido, 0) / n)}</div>
                    </td>
                    <td className="py-3 pr-3">
                      <Button asChild size="icon" variant="ghost" className="h-7 w-7"><Link to={`/granja/${d.lote.id}`}><ArrowRight className="h-3.5 w-3.5" /></Link></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Recorde({ icon: Icon, label, lote, valor, id }: { icon: any; label: string; lote: string; valor: string; id: string }) {
  return (
    <Card className="p-4 border-primary/30 bg-primary/5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wide text-primary">{label}</span>
      </div>
      <p className="font-display font-bold text-2xl">{valor}</p>
      <Link to={`/granja/${id}`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mt-1">
        Lote {lote} <ArrowRight className="h-3 w-3" />
      </Link>
    </Card>
  );
}
