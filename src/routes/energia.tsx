import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useMedidores } from "@/lib/state";
import { Zap, Plus, Trash2, FileText } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { gerarRelatorioEnergia } from "@/lib/pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/energia")({
  head: () => ({
    meta: [
      { title: "Consumo de Energia — AgroSítio" },
      { name: "description", content: "Auto-leitura mensal dos relógios de energia com cálculo de consumo por instalação." },
      { property: "og:title", content: "Consumo de Energia — AgroSítio" },
      { property: "og:description", content: "Auto-leitura mensal dos relógios de energia com cálculo de consumo por instalação." },
    ],
  }),
  component: EnergiaPage,
});

function EnergiaPage() {
  const [medidores, setMedidores] = useMedidores();
  const [forms, setForms] = useState<Record<string, { data: string; valor: string }>>({});

  const addLeitura = (mid: string) => {
    const f = forms[mid];
    if (!f?.data || !f?.valor) { toast.error("Informe data e valor"); return; }
    setMedidores((prev) => prev.map((m) => m.id === mid ? { ...m, leituras: [...m.leituras, { data: f.data, valor: +f.valor }] } : m));
    setForms((p) => ({ ...p, [mid]: { data: new Date().toISOString().slice(0, 10), valor: "" } }));
    toast.success("Leitura registrada");
  };

  const removerLeitura = (mid: string, idx: number) => {
    setMedidores((prev) => prev.map((m) => m.id === mid ? { ...m, leituras: m.leituras.filter((_, i) => i !== idx) } : m));
  };

  const today = new Date();
  const isDay30 = today.getDate() === 30;

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold">Energia</h1>
            <p className="text-muted-foreground mt-1">Auto-leitura mensal dos 3 relógios · lembrete dia 30</p>
          </div>
          <Button variant="outline" onClick={() => gerarRelatorioEnergia(medidores)}><FileText className="h-4 w-4 mr-1" /> Relatório PDF</Button>
        </header>

        {isDay30 && (
          <Card className="p-4 border-accent/40 bg-accent/10">
            <p className="font-medium">Hoje é dia 30 — registre as leituras dos relógios.</p>
          </Card>
        )}

        <div className="space-y-4">
          {medidores.map((m) => {
            const sorted = [...m.leituras].sort((a, b) => a.data.localeCompare(b.data));
            const chartData = sorted.map((l, i) => ({
              mes: new Date(l.data).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
              consumo: i > 0 ? l.valor - sorted[i - 1].valor : 0,
            })).filter((d, i) => i > 0);
            const f = forms[m.id] ?? { data: new Date().toISOString().slice(0, 10), valor: "" };
            const ult = sorted[sorted.length - 1];

            return (
              <Card key={m.id} className="p-5" style={{ background: "var(--gradient-surface)", boxShadow: "var(--shadow-card)" }}>
                <div className="grid lg:grid-cols-3 gap-5">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-10 w-10 rounded-lg bg-accent/20 text-accent flex items-center justify-center"><Zap className="h-5 w-5" /></div>
                      <div>
                        <h3 className="font-display font-bold text-lg">{m.nome}</h3>
                        <p className="text-[11px] text-muted-foreground font-mono">Inst. {m.codigoInstalacao}</p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1 mb-4">
                      <p>Relógio: <span className="font-mono text-foreground">{m.codigoRelogio}</span></p>
                      {ult && <p>Última: <Badge variant="secondary">{ult.valor.toLocaleString("pt-BR")} kWh em {new Date(ult.data).toLocaleDateString("pt-BR")}</Badge></p>}
                    </div>
                    <div className="space-y-2">
                      <Field label="Data"><Input type="date" value={f.data} onChange={(e) => setForms((p) => ({ ...p, [m.id]: { ...f, data: e.target.value } }))} /></Field>
                      <Field label="Leitura (kWh)"><Input type="number" placeholder="Ex: 12345" value={f.valor} onChange={(e) => setForms((p) => ({ ...p, [m.id]: { ...f, valor: e.target.value } }))} /></Field>
                      <Button size="sm" className="w-full" onClick={() => addLeitura(m.id)}><Plus className="h-4 w-4 mr-1" /> Adicionar leitura</Button>
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Consumo mensal (kWh)</p>
                    {chartData.length ? (
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                          <XAxis dataKey="mes" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                          <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                          <Bar dataKey="consumo" fill="var(--accent)" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[180px] border border-dashed border-border rounded-lg flex items-center justify-center text-sm text-muted-foreground">
                        Adicione 2 leituras para ver o consumo
                      </div>
                    )}

                    {sorted.length > 0 && (
                      <div className="mt-3 max-h-32 overflow-auto">
                        <table className="w-full text-xs">
                          <tbody>
                            {[...sorted].reverse().map((l, idx) => {
                              const realIdx = m.leituras.indexOf(l);
                              return (
                                <tr key={idx} className="border-b border-border/40">
                                  <td className="py-1.5">{new Date(l.data).toLocaleDateString("pt-BR")}</td>
                                  <td className="py-1.5 text-right tabular-nums">{l.valor.toLocaleString("pt-BR")} kWh</td>
                                  <td className="py-1.5 text-right"><Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removerLeitura(m.id, realIdx)}><Trash2 className="h-3 w-3" /></Button></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
