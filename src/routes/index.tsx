import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLotes, useMedidores } from "@/lib/state";
import { Bird, Skull, Wheat, Zap, AlertTriangle, ArrowRight, Calendar } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgroSítio — Painel de Gestão Rural" },
      { name: "description", content: "Painel de controle do sítio: granja de frango de corte e consumo de energia." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [lotes] = useLotes();
  const [medidores] = useMedidores();

  const ativo = lotes.find((l) => !l.encerrado);
  const totalMort = ativo?.entries.reduce((s, e) => s + e.mortalidade, 0) ?? 0;
  const vivas = ativo ? ativo.quantidadeInicial - totalMort : 0;
  const mortPct = ativo ? (totalMort / ativo.quantidadeInicial) * 100 : 0;
  const totalRacao = ativo?.entries.reduce((s, e) => s + e.racaoKg, 0) ?? 0;

  const today = new Date();
  const diaLeitura = today.getDate() === 30;
  const ultLeitura = medidores.flatMap((m) => m.leituras).sort((a, b) => b.data.localeCompare(a.data))[0];

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
            <p className="text-sm text-muted-foreground">
              {today.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
            <h1 className="text-3xl md:text-4xl font-display font-bold mt-1">Bom dia, granjeiro 🌱</h1>
            <p className="text-muted-foreground mt-1">Resumo do dia no sítio.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link to="/granja">Granja</Link></Button>
            <Button asChild><Link to="/relatorios">Gerar relatório</Link></Button>
          </div>
        </header>

        {diaLeitura && (
          <Card className="p-4 border-accent/40 bg-accent/10 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-accent mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Dia 30 — hora da leitura dos relógios</p>
              <p className="text-sm text-muted-foreground">Registre as leituras dos 3 medidores para fechar o mês.</p>
            </div>
            <Button asChild size="sm" variant="secondary"><Link to="/energia">Registrar</Link></Button>
          </Card>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Aves vivas" value={vivas.toLocaleString("pt-BR")} hint={ativo ? `Lote ${ativo.numero}` : "Sem lote ativo"} icon={Bird} tone="primary" />
          <StatCard label="Mortalidade" value={`${mortPct.toFixed(2)}%`} hint={`${totalMort.toLocaleString("pt-BR")} aves`} icon={Skull} tone={mortPct > 5 ? "destructive" : "muted"} />
          <StatCard label="Ração consumida" value={`${(totalRacao / 1000).toFixed(1)} t`} hint={`${totalRacao.toLocaleString("pt-BR")} kg`} icon={Wheat} tone="accent" />
          <StatCard label="Última leitura" value={ultLeitura ? `${ultLeitura.valor} kWh` : "—"} hint={ultLeitura ? new Date(ultLeitura.data).toLocaleDateString("pt-BR") : "Sem leituras"} icon={Zap} tone="accent" />
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
            <h2 className="font-display font-semibold text-lg mb-4">Próximos passos</h2>
            <ul className="space-y-3">
              <Step icon={Calendar} text={ativo ? `Lançar dados do dia para o lote ${ativo.numero}` : "Cadastrar primeiro lote"} to="/granja" />
              <Step icon={Zap} text="Atualizar leituras dos relógios" to="/energia" />
              <Step icon={Bird} text="Conferir previsão de abate" to="/granja" />
            </ul>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Step({ icon: Icon, text, to }: { icon: any; text: string; to: string }) {
  return (
    <li>
      <Link to={to} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors group">
        <div className="h-8 w-8 rounded-md bg-primary/15 text-primary flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm flex-1">{text}</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
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
