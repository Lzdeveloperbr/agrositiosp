import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocalStorage, uid } from "@/lib/storage";
import { Milk, Plus, Trash2, Droplets } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/leite")({
  head: () => ({
    meta: [
      { title: "Leite — AgroSítio" },
      { name: "description", content: "Controle de produção de leite, vacas em lactação, qualidade e vendas." },
    ],
  }),
  component: LeitePage,
});

type VacaLeite = {
  id: string;
  brinco: string;
  nome?: string;
  raca?: string;
  dataParto?: string;
  status: "lactacao" | "seca" | "vendida";
  observacoes?: string;
};

type ProducaoLeite = {
  id: string;
  data: string;
  vacaId?: string; // se não, total geral
  ordenha: "manha" | "tarde" | "noite";
  litros: number;
  observacoes?: string;
};

type Qualidade = {
  id: string;
  data: string;
  ccs?: number; // céls/ml x1000
  cbt?: number; // x1000 ufc/ml
  gordura?: number;
  proteina?: number;
  observacoes?: string;
};

type VendaLeite = {
  id: string;
  data: string;
  litros: number;
  precoLitro: number;
  comprador?: string;
  observacoes?: string;
};

function LeitePage() {
  const [vacas, setVacas] = useLocalStorage<VacaLeite[]>("agro:leite:vacas", []);
  const [producoes, setProducoes] = useLocalStorage<ProducaoLeite[]>("agro:leite:producoes", []);
  const [qualidades, setQualidades] = useLocalStorage<Qualidade[]>("agro:leite:qualidades", []);
  const [vendas, setVendas] = useLocalStorage<VendaLeite[]>("agro:leite:vendas", []);

  const stats = useMemo(() => {
    const lact = vacas.filter((v) => v.status === "lactacao").length;
    const hoje = new Date().toISOString().slice(0, 10);
    const litrosHoje = producoes.filter((p) => p.data === hoje).reduce((s, p) => s + p.litros, 0);
    const last30 = producoes.filter((p) => Date.now() - new Date(p.data).getTime() < 30 * 86400000);
    const mediaDia = last30.length ? last30.reduce((s, p) => s + p.litros, 0) / Math.max(1, new Set(last30.map((p) => p.data)).size) : 0;
    const receita30 = vendas.filter((v) => Date.now() - new Date(v.data).getTime() < 30 * 86400000).reduce((s, v) => s + v.litros * v.precoLitro, 0);
    return { lact, litrosHoje, mediaDia, receita30 };
  }, [vacas, producoes, vendas]);

  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl md:text-4xl font-display font-bold flex items-center gap-2">
            <Milk className="h-7 w-7 text-primary" /> Leite
          </h1>
          <p className="text-muted-foreground mt-1">Produção, qualidade, vacas em lactação e vendas</p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Vacas em lactação" value={stats.lact.toString()} />
          <Stat label="Litros hoje" value={`${stats.litrosHoje.toFixed(1)} L`} />
          <Stat label="Média/dia (30d)" value={`${stats.mediaDia.toFixed(1)} L`} />
          <Stat label="Receita 30d" value={`R$ ${stats.receita30.toFixed(2)}`} />
        </div>

        <Tabs defaultValue="producao">
          <TabsList className="grid grid-cols-4 w-full md:w-auto">
            <TabsTrigger value="producao">Produção</TabsTrigger>
            <TabsTrigger value="vacas">Vacas</TabsTrigger>
            <TabsTrigger value="qualidade">Qualidade</TabsTrigger>
            <TabsTrigger value="vendas">Vendas</TabsTrigger>
          </TabsList>

          <TabsContent value="producao" className="mt-4">
            <ProducaoTab producoes={producoes} setProducoes={setProducoes} vacas={vacas} />
          </TabsContent>
          <TabsContent value="vacas" className="mt-4">
            <VacasTab vacas={vacas} setVacas={setVacas} />
          </TabsContent>
          <TabsContent value="qualidade" className="mt-4">
            <QualidadeTab qualidades={qualidades} setQualidades={setQualidades} />
          </TabsContent>
          <TabsContent value="vendas" className="mt-4">
            <VendasTab vendas={vendas} setVendas={setVendas} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function ProducaoTab({ producoes, setProducoes, vacas }: { producoes: ProducaoLeite[]; setProducoes: (v: ProducaoLeite[] | ((p: ProducaoLeite[]) => ProducaoLeite[])) => void; vacas: VacaLeite[] }) {
  const [form, setForm] = useState<Partial<ProducaoLeite>>({ data: new Date().toISOString().slice(0, 10), ordenha: "manha", litros: 0 });
  const adicionar = () => {
    if (!form.litros) { toast.error("Informe os litros"); return; }
    setProducoes((prev) => [{ id: uid(), data: form.data!, ordenha: form.ordenha as any, litros: Number(form.litros), vacaId: form.vacaId, observacoes: form.observacoes }, ...prev]);
    setForm({ ...form, litros: 0, observacoes: "" });
    toast.success("Produção registrada");
  };
  return (
    <Card className="p-4 space-y-4">
      <div className="grid md:grid-cols-5 gap-2">
        <Field label="Data"><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></Field>
        <Field label="Ordenha">
          <Select value={form.ordenha} onValueChange={(v) => setForm({ ...form, ordenha: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="manha">Manhã</SelectItem>
              <SelectItem value="tarde">Tarde</SelectItem>
              <SelectItem value="noite">Noite</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Vaca (opcional)">
          <Select value={form.vacaId ?? "todas"} onValueChange={(v) => setForm({ ...form, vacaId: v === "todas" ? undefined : v })}>
            <SelectTrigger><SelectValue placeholder="Total geral" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Total geral</SelectItem>
              {vacas.filter((v) => v.status === "lactacao").map((v) => <SelectItem key={v.id} value={v.id}>{v.brinco} {v.nome ? `- ${v.nome}` : ""}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Litros"><Input type="number" step="0.1" value={form.litros} onChange={(e) => setForm({ ...form, litros: +e.target.value })} /></Field>
        <div className="flex items-end"><Button className="w-full" onClick={adicionar}><Plus className="h-4 w-4 mr-1" /> Registrar</Button></div>
      </div>

      <Table>
        <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Ordenha</TableHead><TableHead>Vaca</TableHead><TableHead className="text-right">Litros</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {producoes.slice(0, 50).map((p) => (
            <TableRow key={p.id}>
              <TableCell>{new Date(p.data).toLocaleDateString("pt-BR")}</TableCell>
              <TableCell className="capitalize">{p.ordenha}</TableCell>
              <TableCell>{p.vacaId ? vacas.find((v) => v.id === p.vacaId)?.brinco ?? "—" : <Badge variant="secondary">Total</Badge>}</TableCell>
              <TableCell className="text-right tabular-nums">{p.litros.toFixed(1)}</TableCell>
              <TableCell><Button size="icon" variant="ghost" onClick={() => setProducoes((prev) => prev.filter((x) => x.id !== p.id))}><Trash2 className="h-4 w-4" /></Button></TableCell>
            </TableRow>
          ))}
          {producoes.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nenhum registro</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Card>
  );
}

function VacasTab({ vacas, setVacas }: { vacas: VacaLeite[]; setVacas: (v: VacaLeite[] | ((p: VacaLeite[]) => VacaLeite[])) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<VacaLeite>>({ brinco: "", status: "lactacao" });
  const adicionar = () => {
    if (!form.brinco) { toast.error("Informe o brinco"); return; }
    setVacas((prev) => [{ id: uid(), brinco: form.brinco!, nome: form.nome, raca: form.raca, dataParto: form.dataParto, status: form.status as any, observacoes: form.observacoes }, ...prev]);
    setForm({ brinco: "", status: "lactacao" });
    setOpen(false);
    toast.success("Vaca cadastrada");
  };
  return (
    <Card className="p-4 space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Cadastro das vacas leiteiras com status de lactação.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Vaca</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova vaca</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Brinco"><Input value={form.brinco ?? ""} onChange={(e) => setForm({ ...form, brinco: e.target.value })} /></Field>
              <Field label="Nome"><Input value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
              <Field label="Raça"><Input value={form.raca ?? ""} onChange={(e) => setForm({ ...form, raca: e.target.value })} placeholder="Girolando, Holandesa..." /></Field>
              <Field label="Data do parto"><Input type="date" value={form.dataParto ?? ""} onChange={(e) => setForm({ ...form, dataParto: e.target.value })} /></Field>
              <Field label="Status">
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lactacao">Em lactação</SelectItem>
                    <SelectItem value="seca">Seca</SelectItem>
                    <SelectItem value="vendida">Vendida</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <DialogFooter><Button onClick={adicionar}>Cadastrar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Brinco</TableHead><TableHead>Nome</TableHead><TableHead>Raça</TableHead><TableHead>Parto</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {vacas.map((v) => (
            <TableRow key={v.id}>
              <TableCell className="font-medium">{v.brinco}</TableCell>
              <TableCell>{v.nome ?? "—"}</TableCell>
              <TableCell>{v.raca ?? "—"}</TableCell>
              <TableCell>{v.dataParto ? new Date(v.dataParto).toLocaleDateString("pt-BR") : "—"}</TableCell>
              <TableCell>
                <Select value={v.status} onValueChange={(s) => setVacas((prev) => prev.map((x) => x.id === v.id ? { ...x, status: s as any } : x))}>
                  <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lactacao">Lactação</SelectItem>
                    <SelectItem value="seca">Seca</SelectItem>
                    <SelectItem value="vendida">Vendida</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell><Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover?")) setVacas((prev) => prev.filter((x) => x.id !== v.id)); }}><Trash2 className="h-4 w-4" /></Button></TableCell>
            </TableRow>
          ))}
          {vacas.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nenhuma vaca cadastrada</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Card>
  );
}

function QualidadeTab({ qualidades, setQualidades }: { qualidades: Qualidade[]; setQualidades: (v: Qualidade[] | ((p: Qualidade[]) => Qualidade[])) => void }) {
  const [form, setForm] = useState<Partial<Qualidade>>({ data: new Date().toISOString().slice(0, 10) });
  const adicionar = () => {
    setQualidades((prev) => [{ id: uid(), data: form.data!, ccs: form.ccs, cbt: form.cbt, gordura: form.gordura, proteina: form.proteina, observacoes: form.observacoes }, ...prev]);
    setForm({ data: new Date().toISOString().slice(0, 10) });
    toast.success("Análise registrada");
  };
  return (
    <Card className="p-4 space-y-4">
      <div className="grid md:grid-cols-6 gap-2">
        <Field label="Data"><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></Field>
        <Field label="CCS (x1000)"><Input type="number" value={form.ccs ?? ""} onChange={(e) => setForm({ ...form, ccs: +e.target.value })} /></Field>
        <Field label="CBT (x1000)"><Input type="number" value={form.cbt ?? ""} onChange={(e) => setForm({ ...form, cbt: +e.target.value })} /></Field>
        <Field label="Gordura %"><Input type="number" step="0.1" value={form.gordura ?? ""} onChange={(e) => setForm({ ...form, gordura: +e.target.value })} /></Field>
        <Field label="Proteína %"><Input type="number" step="0.1" value={form.proteina ?? ""} onChange={(e) => setForm({ ...form, proteina: +e.target.value })} /></Field>
        <div className="flex items-end"><Button className="w-full" onClick={adicionar}><Droplets className="h-4 w-4 mr-1" /> Registrar</Button></div>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>CCS</TableHead><TableHead>CBT</TableHead><TableHead>Gord.</TableHead><TableHead>Prot.</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {qualidades.map((q) => (
            <TableRow key={q.id}>
              <TableCell>{new Date(q.data).toLocaleDateString("pt-BR")}</TableCell>
              <TableCell className="tabular-nums">{q.ccs ?? "—"}</TableCell>
              <TableCell className="tabular-nums">{q.cbt ?? "—"}</TableCell>
              <TableCell className="tabular-nums">{q.gordura ?? "—"}</TableCell>
              <TableCell className="tabular-nums">{q.proteina ?? "—"}</TableCell>
              <TableCell><Button size="icon" variant="ghost" onClick={() => setQualidades((prev) => prev.filter((x) => x.id !== q.id))}><Trash2 className="h-4 w-4" /></Button></TableCell>
            </TableRow>
          ))}
          {qualidades.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Sem análises</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Card>
  );
}

function VendasTab({ vendas, setVendas }: { vendas: VendaLeite[]; setVendas: (v: VendaLeite[] | ((p: VendaLeite[]) => VendaLeite[])) => void }) {
  const [form, setForm] = useState<Partial<VendaLeite>>({ data: new Date().toISOString().slice(0, 10), litros: 0, precoLitro: 0 });
  const adicionar = () => {
    if (!form.litros || !form.precoLitro) { toast.error("Informe litros e preço"); return; }
    setVendas((prev) => [{ id: uid(), data: form.data!, litros: Number(form.litros), precoLitro: Number(form.precoLitro), comprador: form.comprador, observacoes: form.observacoes }, ...prev]);
    setForm({ data: new Date().toISOString().slice(0, 10), litros: 0, precoLitro: 0 });
    toast.success("Venda registrada");
  };
  const total = vendas.reduce((s, v) => s + v.litros * v.precoLitro, 0);
  return (
    <Card className="p-4 space-y-4">
      <div className="grid md:grid-cols-5 gap-2">
        <Field label="Data"><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></Field>
        <Field label="Litros"><Input type="number" step="0.1" value={form.litros} onChange={(e) => setForm({ ...form, litros: +e.target.value })} /></Field>
        <Field label="Preço/L"><Input type="number" step="0.01" value={form.precoLitro} onChange={(e) => setForm({ ...form, precoLitro: +e.target.value })} /></Field>
        <Field label="Comprador"><Input value={form.comprador ?? ""} onChange={(e) => setForm({ ...form, comprador: e.target.value })} /></Field>
        <div className="flex items-end"><Button className="w-full" onClick={adicionar}><Plus className="h-4 w-4 mr-1" /> Venda</Button></div>
      </div>
      <p className="text-sm text-muted-foreground">Total acumulado: <span className="font-bold text-foreground">R$ {total.toFixed(2)}</span></p>
      <Table>
        <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Comprador</TableHead><TableHead className="text-right">Litros</TableHead><TableHead className="text-right">Preço/L</TableHead><TableHead className="text-right">Total</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {vendas.map((v) => (
            <TableRow key={v.id}>
              <TableCell>{new Date(v.data).toLocaleDateString("pt-BR")}</TableCell>
              <TableCell>{v.comprador ?? "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{v.litros.toFixed(1)}</TableCell>
              <TableCell className="text-right tabular-nums">R$ {v.precoLitro.toFixed(2)}</TableCell>
              <TableCell className="text-right tabular-nums font-semibold">R$ {(v.litros * v.precoLitro).toFixed(2)}</TableCell>
              <TableCell><Button size="icon" variant="ghost" onClick={() => setVendas((prev) => prev.filter((x) => x.id !== v.id))}><Trash2 className="h-4 w-4" /></Button></TableCell>
            </TableRow>
          ))}
          {vendas.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Sem vendas</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </Card>
  );
}
