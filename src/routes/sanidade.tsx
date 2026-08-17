import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCloudCollection } from "@/lib/cloud/useCloudCollection";
import { useFazenda } from "@/lib/cloud/fazenda";
import { ShieldCheck, Syringe, AlertTriangle, Search, Plus, Trash2, ClipboardList } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/sanidade")({
  head: () => ({
    meta: [
      { title: "Rastreabilidade e Sanidade — AgroSítio" },
      { name: "description", content: "Registro sanitário com vacinas, medicamentos, período de carência e rastreabilidade por brinco ou lote." },
      { property: "og:title", content: "Rastreabilidade e Sanidade — AgroSítio" },
      { property: "og:description", content: "Controle de vacinas, carência de medicamentos e histórico rastreável por animal ou lote." },
    ],
  }),
  component: SanidadePage,
});

type Registro = {
  id: string; data: string; tipo: string; especie: string; alvo?: string | null; brincos?: string | null;
  quantidade?: number | null; produto?: string | null; lote_produto?: string | null; fabricante?: string | null;
  dose?: string | null; via?: string | null; carencia_dias?: number | null; carencia_ate?: string | null;
  responsavel?: string | null; crmv?: string | null; custo?: number | null; documento?: string | null; observacoes?: string | null;
};

const TIPOS = ["vacina", "medicamento", "vermífugo", "exame", "carrapaticida", "mosquicida", "suplemento", "outro"];
const ESPECIES = ["aves", "bovino de corte", "bovino de leite", "suíno", "outro"];
const VIAS = ["oral", "intramuscular", "subcutânea", "intravenosa", "tópica", "spray", "água de bebida", "ração"];
const hoje = () => new Date().toISOString().slice(0, 10);
const addDias = (d: string, n: number) => new Date(new Date(d).getTime() + n * 86400000).toISOString().slice(0, 10);
const fmtD = (d?: string | null) => (d ? d.split("-").reverse().join("/") : "—");

function SanidadePage() {
  const { operador } = useFazenda();
  const { items, add, remove, loading } = useCloudCollection<Registro>("sanidade_registros", { col: "data", asc: false });
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [form, setForm] = useState({
    data: hoje(), tipo: "vacina", especie: "aves", alvo: "", brincos: "", quantidade: 0,
    produto: "", lote_produto: "", fabricante: "", dose: "", via: "intramuscular",
    carencia_dias: 0, responsavel: "", crmv: "", custo: 0, observacoes: "",
  });

  const comCarencia = useMemo(() =>
    items.filter((r) => r.carencia_ate && r.carencia_ate >= hoje()), [items]);

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim();
    return items.filter((r) => {
      if (filtroTipo !== "todos" && r.tipo !== filtroTipo) return false;
      if (!q) return true;
      return [r.produto, r.alvo, r.brincos, r.responsavel, r.lote_produto, r.especie]
        .some((v) => (v ?? "").toLowerCase().includes(q));
    });
  }, [items, busca, filtroTipo]);

  const custo12m = useMemo(() => {
    const limite = addDias(hoje(), -365);
    return items.filter((r) => r.data >= limite).reduce((s, r) => s + Number(r.custo ?? 0), 0);
  }, [items]);

  const vacinas30 = items.filter((r) => r.tipo === "vacina" && r.data >= addDias(hoje(), -30)).length;

  async function salvar() {
    if (!form.produto.trim() && form.tipo !== "exame") { toast.error("Informe o produto"); return; }
    const carencia_ate = form.carencia_dias > 0 ? addDias(form.data, form.carencia_dias) : null;
    const r = await add({
      ...form,
      produto: form.produto.trim() || null,
      quantidade: form.quantidade || null,
      custo: form.custo || null,
      carencia_dias: form.carencia_dias || null,
      carencia_ate,
      autor: operador ?? null,
    } as any);
    if (r) {
      toast.success(carencia_ate ? `Registrado — carência até ${fmtD(carencia_ate)}` : "Registro salvo");
      setForm((f) => ({ ...f, produto: "", lote_produto: "", dose: "", brincos: "", quantidade: 0, custo: 0, observacoes: "" }));
    } else toast.error("Erro ao salvar");
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <p className="eyebrow">Sanidade</p>
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-[-0.03em]">Rastreabilidade e Sanidade</h1>
          <p className="text-sm text-muted-foreground mt-1">Vacinas, medicamentos, carência e histórico rastreável por brinco ou lote.</p>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Registros" value={items.length.toString()} hint="histórico completo" icon={ClipboardList} tone="primary" />
          <StatCard label="Vacinas (30 dias)" value={vacinas30.toString()} hint="aplicações recentes" icon={Syringe} tone="accent" />
          <StatCard label="Em carência" value={comCarencia.length.toString()} hint="não abater/comercializar" icon={AlertTriangle} tone={comCarencia.length ? "destructive" : "primary"} />
          <StatCard label="Custo sanitário (12m)" value={custo12m.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })} hint="produtos + serviços" icon={ShieldCheck} tone="primary" />
        </div>

        {comCarencia.length > 0 && (
          <Card className="p-4 border-destructive/40 bg-destructive/10">
            <h2 className="font-semibold flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Períodos de carência ativos</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
              {comCarencia.map((r) => (
                <div key={r.id} className="rounded-lg border border-border/60 p-2 text-sm">
                  <div className="font-medium truncate">{r.produto ?? r.tipo}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.especie} {r.brincos ? `· ${r.brincos}` : ""} · liberado em {fmtD(r.carencia_ate)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Tabs defaultValue="historico">
          <TabsList>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            <TabsTrigger value="novo">Novo registro</TabsTrigger>
          </TabsList>

          <TabsContent value="historico" className="space-y-4 mt-4">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar por produto, brinco, responsável..." value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  {TIPOS.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Card className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Espécie / Alvo</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Lote / Dose</TableHead>
                    <TableHead>Animais</TableHead>
                    <TableHead>Carência</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((r) => {
                    const emCarencia = !!r.carencia_ate && r.carencia_ate >= hoje();
                    return (
                      <TableRow key={r.id}>
                        <TableCell>{fmtD(r.data)}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{r.tipo}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{r.especie}{r.alvo ? ` · ${r.alvo}` : ""}</TableCell>
                        <TableCell className="font-medium">{r.produto ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{[r.lote_produto, r.dose, r.via].filter(Boolean).join(" · ") || "—"}</TableCell>
                        <TableCell className="text-xs">{r.brincos || (r.quantidade ? `${r.quantidade} un.` : "—")}</TableCell>
                        <TableCell>
                          {r.carencia_ate
                            ? <Badge variant={emCarencia ? "destructive" : "secondary"}>{emCarencia ? `até ${fmtD(r.carencia_ate)}` : "liberado"}</Badge>
                            : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{r.custo ? Number(r.custo).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</TableCell>
                        <TableCell><Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    );
                  })}
                  {!loading && filtrados.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum registro encontrado.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="novo" className="mt-4">
            <Card className="p-4 space-y-4">
              <div className="grid md:grid-cols-4 gap-3">
                <div><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Espécie</Label>
                  <Select value={form.especie} onValueChange={(v) => setForm({ ...form, especie: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ESPECIES.map((e) => <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Alvo / doença</Label><Input value={form.alvo} onChange={(e) => setForm({ ...form, alvo: e.target.value })} placeholder="Ex.: Gumboro, Aftosa, verminose" /></div>

                <div><Label>Produto</Label><Input value={form.produto} onChange={(e) => setForm({ ...form, produto: e.target.value })} /></div>
                <div><Label>Lote do produto</Label><Input value={form.lote_produto} onChange={(e) => setForm({ ...form, lote_produto: e.target.value })} /></div>
                <div><Label>Fabricante</Label><Input value={form.fabricante} onChange={(e) => setForm({ ...form, fabricante: e.target.value })} /></div>
                <div><Label>Dose</Label><Input value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} placeholder="Ex.: 5 ml/animal" /></div>

                <div>
                  <Label>Via de aplicação</Label>
                  <Select value={form.via} onValueChange={(v) => setForm({ ...form, via: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{VIAS.map((v) => <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Brincos / lote animal</Label><Input value={form.brincos} onChange={(e) => setForm({ ...form, brincos: e.target.value })} placeholder="Ex.: 0231, 0245 ou Lote 12" /></div>
                <div><Label>Quantidade de animais</Label><Input type="number" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })} /></div>
                <div>
                  <Label>Carência (dias)</Label>
                  <Input type="number" value={form.carencia_dias} onChange={(e) => setForm({ ...form, carencia_dias: Number(e.target.value) })} />
                  {form.carencia_dias > 0 && <p className="text-[11px] text-muted-foreground mt-1">Liberado em {fmtD(addDias(form.data, form.carencia_dias))}</p>}
                </div>

                <div><Label>Responsável</Label><Input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></div>
                <div><Label>CRMV</Label><Input value={form.crmv} onChange={(e) => setForm({ ...form, crmv: e.target.value })} /></div>
                <div><Label>Custo (R$)</Label><Input type="number" value={form.custo} onChange={(e) => setForm({ ...form, custo: Number(e.target.value) })} /></div>
              </div>
              <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2} /></div>
              <Button onClick={salvar}><Plus className="h-4 w-4 mr-1" /> Registrar</Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
