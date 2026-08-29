import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { usePlantios } from "@/lib/state";
import { CULTURAS, MESES, recomendacoesDoMes, type Plantio } from "@/lib/agro";
import { Sprout, Plus, Calendar, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { diffDias, fmtData, hojeISO, isoLocal } from "@/lib/data";

export const Route = createFileRoute("/plantios")({
  head: () => ({
    meta: [
      { title: "Plantios e Calendário de Safras — AgroSítio" },
      { name: "description", content: "Gestão de plantios, safras e calendário agrícola brasileiro por cultura." },
      { property: "og:title", content: "Plantios e Calendário de Safras — AgroSítio" },
      { property: "og:description", content: "Gestão de plantios, safras e calendário agrícola brasileiro por cultura." },
    ],
  }),
  component: PlantiosPage,
});

function PlantiosPage() {
  const [plantios, setPlantios] = usePlantios();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Plantio>>({ cultura: "Milho", areaHa: 1, dataPlantio: hojeISO(), status: "plantado", tratos: [] });

  const ativos = plantios.filter((p) => p.status !== "encerrado");
  const colhidos = plantios.filter((p) => p.status === "encerrado");
  const mesAtual = new Date().getMonth() + 1;
  const recs = recomendacoesDoMes(mesAtual);

  function salvar() {
    if (!form.cultura || !form.dataPlantio) return toast.error("Preencha cultura e data");
    const cultInfo = CULTURAS.find((c) => c.nome === form.cultura);
    const ciclo = cultInfo?.cicloDias[0] ?? 100;
    const prev = new Date(form.dataPlantio);
    prev.setDate(prev.getDate() + ciclo);
    const novo: Plantio = {
      id: crypto.randomUUID(),
      cultura: form.cultura!,
      variedade: form.variedade,
      areaHa: Number(form.areaHa) || 0,
      quantidadeSementes: form.quantidadeSementes,
      unidadeSementes: form.unidadeSementes,
      tipoSolo: form.tipoSolo,
      local: form.local,
      dataPlantio: form.dataPlantio!,
      previsaoColheita: form.previsaoColheita ?? isoLocal(prev),
      status: "plantado",
      tratos: [],
      observacoes: form.observacoes,
    };
    setPlantios([novo, ...plantios]);
    setOpen(false);
    setForm({ cultura: "Milho", areaHa: 1, dataPlantio: hojeISO(), status: "plantado", tratos: [] });
    toast.success("Plantio registrado");
  }

  function diasRestantes(p: Plantio): number | null {
    if (!p.previsaoColheita) return null;
    return diffDias(new Date(), p.previsaoColheita);
  }

  function encerrar(p: Plantio) {
    setPlantios(plantios.map((x) => x.id === p.id ? { ...x, status: "encerrado", dataColheita: hojeISO() } : x));
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2"><Sprout className="h-7 w-7 text-primary" /> Plantios & Safras</h1>
            <p className="text-muted-foreground text-sm">Gestão completa das culturas com calendário agrícola.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Novo plantio</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Registrar plantio</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Cultura</Label>
                  <Select value={form.cultura} onValueChange={(v) => setForm({ ...form, cultura: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CULTURAS.map((c) => <SelectItem key={c.nome} value={c.nome}>{c.emoji} {c.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Variedade</Label><Input value={form.variedade ?? ""} onChange={(e) => setForm({ ...form, variedade: e.target.value })} /></div>
                  <div><Label>Área (ha)</Label><Input type="number" step="0.1" value={form.areaHa ?? 0} onChange={(e) => setForm({ ...form, areaHa: Number(e.target.value) })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Data plantio</Label><Input type="date" value={form.dataPlantio ?? ""} onChange={(e) => setForm({ ...form, dataPlantio: e.target.value })} /></div>
                  <div><Label>Previsão colheita</Label><Input type="date" value={form.previsaoColheita ?? ""} onChange={(e) => setForm({ ...form, previsaoColheita: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Tipo de solo</Label><Input value={form.tipoSolo ?? ""} onChange={(e) => setForm({ ...form, tipoSolo: e.target.value })} /></div>
                  <div><Label>Talhão / local</Label><Input value={form.local ?? ""} onChange={(e) => setForm({ ...form, local: e.target.value })} /></div>
                </div>
                <Button className="w-full" onClick={salvar}>Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </header>

        <Tabs defaultValue="ativos">
          <TabsList><TabsTrigger value="ativos">Ativos ({ativos.length})</TabsTrigger><TabsTrigger value="calendario">Calendário</TabsTrigger><TabsTrigger value="colhidos">Colhidos ({colhidos.length})</TabsTrigger></TabsList>

          <TabsContent value="ativos" className="space-y-3 mt-4">
            {ativos.length === 0 && <Card className="p-8 text-center text-muted-foreground"><Sprout className="h-12 w-12 mx-auto mb-2 opacity-30" /><p>Nenhum plantio ativo. Cadastre o primeiro.</p></Card>}
            {ativos.map((p) => {
              const dias = diasRestantes(p);
              const ci = CULTURAS.find((c) => c.nome === p.cultura);
              return (
                <Card key={p.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2"><span className="text-2xl">{ci?.emoji ?? "🌱"}</span><h3 className="font-display font-semibold text-lg">{p.cultura}</h3>{p.variedade && <Badge variant="outline">{p.variedade}</Badge>}</div>
                      <p className="text-xs text-muted-foreground mt-0.5">Plantado {fmtData(p.dataPlantio)} · {p.areaHa} ha {p.local ? `· ${p.local}` : ""}</p>
                    </div>
                    <div className="text-right">
                      {dias !== null && <Badge variant={dias < 0 ? "destructive" : dias < 14 ? "default" : "secondary"}>{dias < 0 ? `Atrasado ${Math.abs(dias)}d` : `Faltam ${dias}d`}</Badge>}
                      <p className="text-[10px] text-muted-foreground mt-1">Colheita {p.previsaoColheita ? fmtData(p.previsaoColheita) : "—"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => encerrar(p)}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Encerrar/Colher</Button>
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm("Excluir?")) setPlantios(plantios.filter((x) => x.id !== p.id)); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="calendario" className="space-y-4 mt-4">
            <Card className="p-4" style={{ background: "var(--gradient-surface)" }}>
              <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Recomendado para {MESES[mesAtual - 1]}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {recs.map((c) => (
                  <div key={c.nome} className="p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="text-2xl">{c.emoji}</div>
                    <div className="font-semibold mt-1">{c.nome}</div>
                    <p className="text-[11px] text-muted-foreground">Ciclo: {c.cicloDias[0]}-{c.cicloDias[1]}d</p>
                    <p className="text-[11px] text-muted-foreground">Água: {c.agua} · Solo: {c.solo}</p>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="font-display font-semibold mb-3">Janelas de plantio (mês × cultura)</h3>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead><tr><th className="text-left p-1.5">Cultura</th>{MESES.map((m) => <th key={m} className="p-1.5">{m}</th>)}</tr></thead>
                  <tbody>
                    {CULTURAS.map((c) => (
                      <tr key={c.nome} className="border-t border-border/50">
                        <td className="p-1.5 font-medium">{c.emoji} {c.nome}</td>
                        {MESES.map((_, i) => (
                          <td key={i} className="p-1 text-center">
                            {c.janela.includes(i + 1) ? <span className="inline-block h-3 w-3 rounded-sm bg-primary" /> : <span className="inline-block h-3 w-3 rounded-sm bg-muted/40" />}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="colhidos" className="space-y-2 mt-4">
            {colhidos.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">Nenhuma safra colhida ainda.</Card>}
            {colhidos.map((p) => {
              const ci = CULTURAS.find((c) => c.nome === p.cultura);
              return (
                <Card key={p.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2"><span className="text-xl">{ci?.emoji}</span><div><div className="font-semibold text-sm">{p.cultura}</div><div className="text-[11px] text-muted-foreground">{p.areaHa} ha · colhido {p.dataColheita ? fmtData(p.dataColheita) : "—"}</div></div></div>
                  {p.produtividadeKg && <Badge>{p.produtividadeKg} kg</Badge>}
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
