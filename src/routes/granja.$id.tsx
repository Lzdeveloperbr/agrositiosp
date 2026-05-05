import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useLotes } from "@/lib/state";
import { ArrowLeft, Plus, FileText, Trash2 } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { gerarRelatorioLote } from "@/lib/pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/granja/$id")({
  head: () => ({ meta: [{ title: "Lote — AgroSítio" }] }),
  component: LoteDetalhe,
  notFoundComponent: () => <AppShell><p>Lote não encontrado.</p></AppShell>,
});

function LoteDetalhe() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [lotes, setLotes] = useLotes();
  const lote = lotes.find((l) => l.id === id);

  const [entry, setEntry] = useState({
    date: new Date().toISOString().slice(0, 10),
    mortalidade: 0,
    pesoMedioG: undefined as number | undefined,
    observacoes: "",
  });

  if (!lote) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Lote não encontrado.</p>
        <Button asChild variant="link"><Link to="/granja">Voltar</Link></Button>
      </AppShell>
    );
  }

  const totalMort = lote.entries.reduce((s, e) => s + e.mortalidade, 0);
  const vivas = lote.quantidadeInicial - totalMort;
  const dias = Math.floor((Date.now() - new Date(lote.dataEntrada).getTime()) / 86400000);
  const ultPeso = [...lote.entries].reverse().find((e) => e.pesoMedioG)?.pesoMedioG ?? 0;
  const pesoTotalKg = (vivas * ultPeso) / 1000;
  const previsao = new Date(new Date(lote.dataEntrada).getTime() + lote.previsaoAbateDias * 86400000);

  const adicionar = () => {
    setLotes((prev) => prev.map((l) => l.id === id ? { ...l, entries: [...l.entries, { ...entry }] } : l));
    setEntry({ ...entry, mortalidade: 0, pesoMedioG: undefined, observacoes: "" });
    toast.success("Lançamento registrado");
  };

  const removerEntry = (idx: number) => {
    setLotes((prev) => prev.map((l) => l.id === id ? { ...l, entries: l.entries.filter((_, i) => i !== idx) } : l));
  };

  const encerrar = () => {
    if (!confirm("Encerrar este lote?")) return;
    setLotes((prev) => prev.map((l) => l.id === id ? { ...l, encerrado: !l.encerrado } : l));
  };

  const removerLote = () => {
    if (!confirm("Excluir este lote?")) return;
    setLotes((prev) => prev.filter((l) => l.id !== id));
    navigate({ to: "/granja" });
  };

  const chartData = [...lote.entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e, i) => ({ dia: `D${i + 1}`, peso: e.pesoMedioG ?? null, mort: e.mortalidade }));

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2"><Link to="/granja"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link></Button>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-display font-bold">Lote {lote.numero}</h1>
                {lote.encerrado ? <Badge variant="secondary">Encerrado</Badge> : <Badge>Ativo</Badge>}
              </div>
              <p className="text-muted-foreground mt-1">Entrada {new Date(lote.dataEntrada).toLocaleDateString("pt-BR")} · {dias} dias · {lote.integradora}</p>
              <p className="text-xs text-muted-foreground">Previsão de abate: {previsao.toLocaleDateString("pt-BR")}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => gerarRelatorioLote(lote)}><FileText className="h-4 w-4 mr-1" /> PDF</Button>
              <Button variant="outline" onClick={encerrar}>{lote.encerrado ? "Reabrir" : "Encerrar"}</Button>
              <Button variant="ghost" size="icon" onClick={removerLote}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI label="Inicial" value={lote.quantidadeInicial.toLocaleString("pt-BR")} />
          <KPI label="Vivas" value={vivas.toLocaleString("pt-BR")} />
          <KPI label="Mort. %" value={`${((totalMort / lote.quantidadeInicial) * 100).toFixed(2)}%`} />
          <KPI label="Peso vivo" value={`${pesoTotalKg.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg`} />
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="p-5 lg:col-span-2" style={{ background: "var(--gradient-surface)" }}>
            <h2 className="font-display font-semibold text-lg mb-3">Linha do tempo</h2>
            {chartData.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="dia" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="peso" stroke="var(--primary)" strokeWidth={2.5} name="Peso (g)" />
                  <Line type="monotone" dataKey="mort" stroke="var(--destructive)" strokeWidth={2} name="Mortalidade" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-12 text-center">Sem lançamentos ainda.</p>
            )}
          </Card>

          <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
            <h2 className="font-display font-semibold text-lg mb-3">Lançamento diário</h2>
            <div className="space-y-3">
              <Field label="Data"><Input type="date" value={entry.date} onChange={(e) => setEntry({ ...entry, date: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Mortalidade"><Input type="number" value={entry.mortalidade} onChange={(e) => setEntry({ ...entry, mortalidade: +e.target.value })} /></Field>
                <Field label="Peso médio (g)"><Input type="number" value={entry.pesoMedioG ?? ""} onChange={(e) => setEntry({ ...entry, pesoMedioG: e.target.value ? +e.target.value : undefined })} /></Field>
              </div>
              <Field label="Observações"><Textarea rows={2} value={entry.observacoes} onChange={(e) => setEntry({ ...entry, observacoes: e.target.value })} /></Field>
              <Button onClick={adicionar} className="w-full"><Plus className="h-4 w-4 mr-1" /> Lançar</Button>
            </div>
          </Card>
        </div>

        <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
          <h2 className="font-display font-semibold text-lg mb-3">Histórico</h2>
          {lote.entries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhum lançamento.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase tracking-wider">
                  <tr className="border-b border-border">
                    <th className="text-left py-2">Data</th>
                    <th className="text-right py-2">Mort.</th>
                    <th className="text-right py-2">Peso (g)</th>
                    <th className="text-left py-2 pl-4">Obs</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {[...lote.entries].sort((a, b) => b.date.localeCompare(a.date)).map((e, idx) => {
                    const realIdx = lote.entries.indexOf(e);
                    return (
                      <tr key={idx} className="border-b border-border/50">
                        <td className="py-2">{new Date(e.date).toLocaleDateString("pt-BR")}</td>
                        <td className="py-2 text-right tabular-nums">{e.mortalidade}</td>
                        <td className="py-2 text-right tabular-nums">{e.pesoMedioG ?? "—"}</td>
                        <td className="py-2 pl-4 text-muted-foreground">{e.observacoes ?? ""}</td>
                        <td className="py-2 text-right"><Button size="icon" variant="ghost" onClick={() => removerEntry(realIdx)}><Trash2 className="h-3.5 w-3.5" /></Button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3" style={{ background: "var(--gradient-surface)" }}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display font-bold text-xl tabular-nums">{value}</p>
    </Card>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
