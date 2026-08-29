import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChuvas } from "@/lib/state";
import { uid } from "@/lib/storage";
import { CloudRain, Plus, Trash2 } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { toast } from "sonner";
import { fmtData, hojeISO } from "@/lib/data";

export const Route = createFileRoute("/chuvas")({
  head: () => ({
    meta: [
      { title: "Pluviometria — AgroSítio" },
      { name: "description", content: "Registre e acompanhe o índice de chuvas (mm) por local na fazenda." },
      { property: "og:title", content: "Pluviometria — AgroSítio" },
      { property: "og:description", content: "Registre e acompanhe o índice de chuvas (mm) por local na fazenda." },
    ],
  }),
  component: ChuvasPage,
});

function ChuvasPage() {
  const [chuvas, setChuvas] = useChuvas();
  const [form, setForm] = useState({ data: hojeISO(), mm: 0, local: "", observacoes: "" });
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));

  const add = () => {
    if (form.mm <= 0) { toast.error("Informe os mm"); return; }
    setChuvas((p) => [{ id: uid(), ...form }, ...p]);
    setForm({ ...form, mm: 0, observacoes: "" });
    toast.success("Chuva registrada");
  };

  const visiveis = useMemo(() => chuvas.filter((c) => c.data.startsWith(mes)).sort((a, b) => a.data.localeCompare(b.data)), [chuvas, mes]);
  const total = visiveis.reduce((s, c) => s + c.mm, 0);
  const dias = new Set(visiveis.map((c) => c.data)).size;
  const acumAno = chuvas.filter((c) => c.data.startsWith(mes.slice(0, 4))).reduce((s, c) => s + c.mm, 0);

  const grafico = useMemo(() => {
    const byDay: Record<string, number> = {};
    visiveis.forEach((c) => { byDay[c.data] = (byDay[c.data] ?? 0) + c.mm; });
    return Object.entries(byDay).map(([data, mm]) => ({ data: fmtData(data, { day: "2-digit", month: "short" }), mm }));
  }, [visiveis]);

  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl md:text-4xl font-display font-bold flex items-center gap-2"><CloudRain className="h-8 w-8 text-primary" /> Pluviometria</h1>
          <p className="text-muted-foreground mt-1">Registro diário de chuva e acumulado mensal/anual.</p>
        </header>

        <div className="grid sm:grid-cols-3 gap-3">
          <Card className="p-4" style={{ background: "var(--gradient-surface)" }}><p className="text-xs uppercase text-muted-foreground">Acumulado do mês</p><p className="font-display font-bold text-2xl">{total.toFixed(1)} mm</p></Card>
          <Card className="p-4" style={{ background: "var(--gradient-surface)" }}><p className="text-xs uppercase text-muted-foreground">Dias com chuva</p><p className="font-display font-bold text-2xl">{dias}</p></Card>
          <Card className="p-4" style={{ background: "var(--gradient-surface)" }}><p className="text-xs uppercase text-muted-foreground">Ano ({mes.slice(0, 4)})</p><p className="font-display font-bold text-2xl">{acumAno.toFixed(0)} mm</p></Card>
        </div>

        <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
          <h3 className="font-semibold mb-3">Registrar chuva</h3>
          <div className="grid md:grid-cols-4 gap-3">
            <F label="Data"><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></F>
            <F label="mm *"><Input type="number" step="0.1" value={form.mm || ""} onChange={(e) => setForm({ ...form, mm: +e.target.value })} /></F>
            <F label="Local"><Input value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} placeholder="Pluviômetro 1" /></F>
            <F label="Obs"><Input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></F>
          </div>
          <Button onClick={add} className="mt-3"><Plus className="h-4 w-4 mr-1" /> Registrar</Button>
        </Card>

        <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Histórico</h3>
            <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-44" />
          </div>
          {grafico.length > 0 && (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={grafico}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="data" fontSize={11} />
                <YAxis fontSize={11} unit="mm" />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="mm" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          {visiveis.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">Sem registros no período.</p> : (
            <div className="mt-4 space-y-1">
              {[...visiveis].reverse().map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-2 rounded border border-border/40">
                  <span className="text-sm w-28 text-muted-foreground">{fmtData(c.data)}</span>
                  <span className="font-bold tabular-nums">{c.mm.toFixed(1)} mm</span>
                  {c.local && <span className="text-xs text-muted-foreground">{c.local}</span>}
                  <span className="flex-1 text-xs text-muted-foreground">{c.observacoes}</span>
                  <Button size="icon" variant="ghost" onClick={() => setChuvas((p) => p.filter((x) => x.id !== c.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
