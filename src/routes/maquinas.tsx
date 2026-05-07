import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useMaquinas, useFinanceiro } from "@/lib/state";
import { uid } from "@/lib/storage";
import { Tractor, Plus, Trash2, Fuel, Wrench, ArrowLeft, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { Maquina } from "@/lib/types";

export const Route = createFileRoute("/maquinas")({
  head: () => ({ meta: [{ title: "Máquinas — AgroSítio" }] }),
  component: MaquinasPage,
});

const TIPOS = [
  { v: "trator", l: "Trator" }, { v: "caminhao", l: "Caminhão" }, { v: "carro", l: "Carro" },
  { v: "moto", l: "Moto" }, { v: "implemento", l: "Implemento" }, { v: "gerador", l: "Gerador" }, { v: "outro", l: "Outro" },
];

function MaquinasPage() {
  const [maquinas, setMaquinas] = useMaquinas();
  const [, setFin] = useFinanceiro();
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Maquina>>({ nome: "", tipo: "trator", horimetro: 0 });

  const ativa = maquinas.find((m) => m.id === sel) || null;

  const criar = () => {
    if (!form.nome) { toast.error("Nome obrigatório"); return; }
    setMaquinas((p) => [{
      id: uid(), nome: form.nome!, tipo: (form.tipo as any) || "trator", marca: form.marca, modelo: form.modelo,
      ano: form.ano, placa: form.placa, horimetro: form.horimetro || 0, observacoes: form.observacoes,
      abastecimentos: [], manutencoes: [],
    }, ...p]);
    setOpen(false); setForm({ nome: "", tipo: "trator", horimetro: 0 });
    toast.success("Máquina cadastrada");
  };

  const remover = (id: string) => { if (confirm("Remover máquina?")) setMaquinas((p) => p.filter((m) => m.id !== id)); };

  // Tela de detalhe
  if (ativa) {
    return <DetalheMaquina maquina={ativa} setMaquinas={setMaquinas} setFin={setFin} voltar={() => setSel(null)} />;
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold flex items-center gap-2"><Tractor className="h-8 w-8 text-primary" /> Máquinas & Veículos</h1>
            <p className="text-muted-foreground mt-1">Combustível, horímetro e manutenções com alerta.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Nova máquina</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova máquina</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><F label="Nome *"><Input value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Trator MF 275" /></F></div>
                <F label="Tipo">
                  <Select value={form.tipo as string} onValueChange={(v) => setForm({ ...form, tipo: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                  </Select>
                </F>
                <F label="Marca"><Input value={form.marca ?? ""} onChange={(e) => setForm({ ...form, marca: e.target.value })} /></F>
                <F label="Modelo"><Input value={form.modelo ?? ""} onChange={(e) => setForm({ ...form, modelo: e.target.value })} /></F>
                <F label="Ano"><Input type="number" value={form.ano ?? ""} onChange={(e) => setForm({ ...form, ano: +e.target.value })} /></F>
                <F label="Placa"><Input value={form.placa ?? ""} onChange={(e) => setForm({ ...form, placa: e.target.value })} /></F>
                <F label="Horímetro inicial"><Input type="number" value={form.horimetro ?? 0} onChange={(e) => setForm({ ...form, horimetro: +e.target.value })} /></F>
              </div>
              <DialogFooter><Button onClick={criar}>Cadastrar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        {maquinas.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <Tractor className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">Sem máquinas</p>
            <Button onClick={() => setOpen(true)} className="mt-3"><Plus className="h-4 w-4 mr-1" /> Cadastrar</Button>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {maquinas.map((m) => {
              const ultMan = [...m.manutencoes].sort((a, b) => b.data.localeCompare(a.data))[0];
              const alerta = ultMan?.proximoHorimetro && ultMan.proximoHorimetro <= m.horimetro;
              const totalLitros = m.abastecimentos.reduce((s, a) => s + a.litros, 0);
              return (
                <Card key={m.id} className={`p-4 cursor-pointer hover:border-primary/40 transition ${alerta ? "border-destructive/40" : ""}`} style={{ background: "var(--gradient-surface)" }} onClick={() => setSel(m.id)}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-display font-bold">{m.nome}</h3>
                      <Badge variant="outline" className="text-[10px] mt-1 capitalize">{m.tipo}</Badge>
                    </div>
                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); remover(m.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{[m.marca, m.modelo, m.ano].filter(Boolean).join(" · ")}{m.placa && ` · ${m.placa}`}</p>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div><p className="text-muted-foreground">Horímetro</p><p className="font-bold tabular-nums">{m.horimetro.toLocaleString("pt-BR")} h</p></div>
                    <div><p className="text-muted-foreground">Combustível</p><p className="font-bold tabular-nums">{totalLitros.toLocaleString("pt-BR")} L</p></div>
                  </div>
                  {alerta && <Badge variant="destructive" className="mt-2 text-[10px] flex gap-1 items-center w-fit"><AlertTriangle className="h-3 w-3" /> Manutenção atrasada</Badge>}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function DetalheMaquina({ maquina, setMaquinas, setFin, voltar }: any) {
  const m: Maquina = maquina;
  const [ab, setAb] = useState({ data: new Date().toISOString().slice(0, 10), litros: 0, precoLitro: 0, horimetro: 0, posto: "", combustivel: "diesel" as any });
  const [mn, setMn] = useState({ data: new Date().toISOString().slice(0, 10), tipo: "preventiva" as any, descricao: "", custo: 0, horimetro: 0, proximaData: "", proximoHorimetro: 0 });

  const totalLitros = m.abastecimentos.reduce((s, a) => s + a.litros, 0);
  const totalGasto = m.abastecimentos.reduce((s, a) => s + (a.total ?? a.litros * (a.precoLitro || 0)), 0);
  const custoMan = m.manutencoes.reduce((s, mt) => s + (mt.custo || 0), 0);

  const consumoMedio = useMemo(() => {
    const sorted = [...m.abastecimentos].filter((a) => a.horimetro).sort((a, b) => (a.horimetro! - b.horimetro!));
    if (sorted.length < 2) return null;
    const horas = sorted[sorted.length - 1].horimetro! - sorted[0].horimetro!;
    const litros = sorted.slice(1).reduce((s, a) => s + a.litros, 0);
    return horas > 0 ? (litros / horas).toFixed(2) : null;
  }, [m]);

  const addAb = () => {
    if (!ab.litros) { toast.error("Informe os litros"); return; }
    const total = ab.litros * (ab.precoLitro || 0);
    const novo = { id: uid(), data: ab.data, litros: ab.litros, precoLitro: ab.precoLitro || undefined, total, horimetro: ab.horimetro || undefined, posto: ab.posto, combustivel: ab.combustivel };
    setMaquinas((p: Maquina[]) => p.map((x) => x.id === m.id ? { ...x, abastecimentos: [novo, ...x.abastecimentos], horimetro: Math.max(x.horimetro, ab.horimetro || x.horimetro) } : x));
    if (total > 0) {
      setFin((p: any) => [{ id: uid(), data: ab.data, tipo: "despesa", categoria: "Combustível", descricao: `${m.nome} - ${ab.litros}L`, valor: total, modulo: "maquina", status: "pago" }, ...p]);
    }
    setAb({ data: new Date().toISOString().slice(0, 10), litros: 0, precoLitro: 0, horimetro: 0, posto: "", combustivel: "diesel" });
    toast.success("Abastecimento registrado");
  };

  const addMan = () => {
    if (!mn.descricao) { toast.error("Descrição obrigatória"); return; }
    const novo = { id: uid(), data: mn.data, tipo: mn.tipo, descricao: mn.descricao, custo: mn.custo || undefined, horimetro: mn.horimetro || undefined, proximaData: mn.proximaData || undefined, proximoHorimetro: mn.proximoHorimetro || undefined };
    setMaquinas((p: Maquina[]) => p.map((x) => x.id === m.id ? { ...x, manutencoes: [novo, ...x.manutencoes] } : x));
    if (mn.custo > 0) {
      setFin((p: any) => [{ id: uid(), data: mn.data, tipo: "despesa", categoria: "Manutenção", descricao: `${m.nome} - ${mn.descricao}`, valor: mn.custo, modulo: "maquina", status: "pago" }, ...p]);
    }
    setMn({ data: new Date().toISOString().slice(0, 10), tipo: "preventiva", descricao: "", custo: 0, horimetro: 0, proximaData: "", proximoHorimetro: 0 });
    toast.success("Manutenção registrada");
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={voltar}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
        <header>
          <h1 className="text-3xl font-display font-bold">{m.nome}</h1>
          <p className="text-muted-foreground">{m.tipo} · {[m.marca, m.modelo].filter(Boolean).join(" ")} {m.placa && `· ${m.placa}`}</p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI label="Horímetro" value={`${m.horimetro.toLocaleString("pt-BR")} h`} />
          <KPI label="Combustível total" value={`${totalLitros.toLocaleString("pt-BR")} L`} />
          <KPI label="Gasto combustível" value={`R$ ${totalGasto.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} />
          <KPI label="Consumo médio" value={consumoMedio ? `${consumoMedio} L/h` : "—"} />
        </div>

        <Tabs defaultValue="abast">
          <TabsList>
            <TabsTrigger value="abast"><Fuel className="h-4 w-4 mr-1" /> Abastecimentos</TabsTrigger>
            <TabsTrigger value="manut"><Wrench className="h-4 w-4 mr-1" /> Manutenções</TabsTrigger>
          </TabsList>

          <TabsContent value="abast" className="space-y-4 mt-4">
            <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
              <h3 className="font-semibold mb-3">Novo abastecimento</h3>
              <div className="grid md:grid-cols-3 gap-3">
                <F label="Data"><Input type="date" value={ab.data} onChange={(e) => setAb({ ...ab, data: e.target.value })} /></F>
                <F label="Combustível">
                  <Select value={ab.combustivel} onValueChange={(v) => setAb({ ...ab, combustivel: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="diesel">Diesel</SelectItem><SelectItem value="gasolina">Gasolina</SelectItem><SelectItem value="etanol">Etanol</SelectItem><SelectItem value="outro">Outro</SelectItem></SelectContent>
                  </Select>
                </F>
                <F label="Litros *"><Input type="number" step="0.1" value={ab.litros || ""} onChange={(e) => setAb({ ...ab, litros: +e.target.value })} /></F>
                <F label="R$/litro"><Input type="number" step="0.01" value={ab.precoLitro || ""} onChange={(e) => setAb({ ...ab, precoLitro: +e.target.value })} /></F>
                <F label="Horímetro"><Input type="number" value={ab.horimetro || ""} onChange={(e) => setAb({ ...ab, horimetro: +e.target.value })} /></F>
                <F label="Posto"><Input value={ab.posto} onChange={(e) => setAb({ ...ab, posto: e.target.value })} /></F>
              </div>
              <Button onClick={addAb} className="mt-3"><Plus className="h-4 w-4 mr-1" /> Registrar</Button>
            </Card>

            <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
              <h3 className="font-semibold mb-3">Histórico ({m.abastecimentos.length})</h3>
              {m.abastecimentos.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">Sem abastecimentos.</p> : (
                <div className="space-y-2">
                  {m.abastecimentos.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card/40">
                      <Fuel className="h-4 w-4 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{a.litros}L · {a.combustivel}</p>
                        <p className="text-xs text-muted-foreground">{new Date(a.data).toLocaleDateString("pt-BR")}{a.horimetro && ` · ${a.horimetro}h`}{a.posto && ` · ${a.posto}`}</p>
                      </div>
                      {a.total ? <p className="font-bold tabular-nums">R$ {a.total.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</p> : null}
                      <Button size="icon" variant="ghost" onClick={() => setMaquinas((p: Maquina[]) => p.map((x) => x.id === m.id ? { ...x, abastecimentos: x.abastecimentos.filter((z) => z.id !== a.id) } : x))}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="manut" className="space-y-4 mt-4">
            <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
              <h3 className="font-semibold mb-3">Nova manutenção (custo total: R$ {custoMan.toLocaleString("pt-BR")})</h3>
              <div className="grid md:grid-cols-3 gap-3">
                <F label="Data"><Input type="date" value={mn.data} onChange={(e) => setMn({ ...mn, data: e.target.value })} /></F>
                <F label="Tipo">
                  <Select value={mn.tipo} onValueChange={(v) => setMn({ ...mn, tipo: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="preventiva">Preventiva</SelectItem><SelectItem value="corretiva">Corretiva</SelectItem><SelectItem value="troca_oleo">Troca de óleo</SelectItem><SelectItem value="filtro">Filtro</SelectItem><SelectItem value="outro">Outro</SelectItem></SelectContent>
                  </Select>
                </F>
                <F label="Custo (R$)"><Input type="number" step="0.01" value={mn.custo || ""} onChange={(e) => setMn({ ...mn, custo: +e.target.value })} /></F>
                <div className="md:col-span-3"><F label="Descrição *"><Input value={mn.descricao} onChange={(e) => setMn({ ...mn, descricao: e.target.value })} placeholder="Ex: Troca de óleo do motor" /></F></div>
                <F label="Horímetro atual"><Input type="number" value={mn.horimetro || ""} onChange={(e) => setMn({ ...mn, horimetro: +e.target.value })} /></F>
                <F label="Próx. data"><Input type="date" value={mn.proximaData} onChange={(e) => setMn({ ...mn, proximaData: e.target.value })} /></F>
                <F label="Próx. horímetro"><Input type="number" value={mn.proximoHorimetro || ""} onChange={(e) => setMn({ ...mn, proximoHorimetro: +e.target.value })} /></F>
              </div>
              <Button onClick={addMan} className="mt-3"><Plus className="h-4 w-4 mr-1" /> Registrar</Button>
            </Card>

            <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
              <h3 className="font-semibold mb-3">Histórico ({m.manutencoes.length})</h3>
              {m.manutencoes.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">Sem manutenções.</p> : (
                <div className="space-y-2">
                  {m.manutencoes.map((mt) => (
                    <div key={mt.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-card/40">
                      <Wrench className="h-4 w-4 text-primary mt-1" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{mt.descricao}</p>
                        <p className="text-xs text-muted-foreground">{new Date(mt.data).toLocaleDateString("pt-BR")} · {mt.tipo.replace("_", " ")}{mt.proximaData && ` · próx: ${new Date(mt.proximaData).toLocaleDateString("pt-BR")}`}{mt.proximoHorimetro && ` · @${mt.proximoHorimetro}h`}</p>
                      </div>
                      {mt.custo ? <p className="font-bold tabular-nums">R$ {mt.custo.toLocaleString("pt-BR")}</p> : null}
                      <Button size="icon" variant="ghost" onClick={() => setMaquinas((p: Maquina[]) => p.map((x) => x.id === m.id ? { ...x, manutencoes: x.manutencoes.filter((z) => z.id !== mt.id) } : x))}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return <Card className="p-3" style={{ background: "var(--gradient-surface)" }}><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="font-display font-bold text-xl tabular-nums">{value}</p></Card>;
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
// avoid unused import warning
void Link;
