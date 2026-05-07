import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAnimais, usePastos, useFinanceiro } from "@/lib/state";
import { uid } from "@/lib/storage";
import type { Animal, Pasto } from "@/lib/types";
import { Beef, Plus, Trash2, ArrowRight, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import { gerarRelatorioRebanho } from "@/lib/pdf";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/gado/")({
  head: () => ({
    meta: [
      { title: "Gado de Corte — AgroSítio" },
      { name: "description", content: "Cadastro e manejo do rebanho de corte." },
    ],
  }),
  component: GadoPage,
});

function GadoPage() {
  const [animais, setAnimais] = useAnimais();
  const [pastos, setPastos] = usePastos();
  const [, setFinanc] = useFinanceiro();
  const [open, setOpen] = useState(false);
  const [pastoOpen, setPastoOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "ativo" | "vendido" | "morto" | "abatido">("ativo");

  const [form, setForm] = useState<Partial<Animal>>({
    brinco: "",
    sexo: "macho",
    categoria: "bezerro",
    raca: "",
    dataEntrada: new Date().toISOString().slice(0, 10),
    origem: "nascido",
    status: "ativo",
    pesoEntradaKg: undefined,
    pastoId: "",
    nascimento: "",
    precoCompra: undefined,
  });

  const [pastoForm, setPastoForm] = useState<Partial<Pasto>>({ nome: "", areaHa: undefined, capacidade: undefined });

  const criar = () => {
    if (!form.brinco) { toast.error("Informe o brinco"); return; }
    if (animais.some((a) => a.brinco === form.brinco)) { toast.error("Brinco já existe"); return; }
    const novo: Animal = {
      id: uid(),
      brinco: form.brinco!,
      nome: form.nome,
      sexo: form.sexo as any,
      raca: form.raca,
      categoria: form.categoria as any,
      nascimento: form.nascimento || undefined,
      dataEntrada: form.dataEntrada!,
      origem: form.origem as any,
      pastoId: form.pastoId || undefined,
      pesoEntradaKg: form.pesoEntradaKg,
      precoCompra: form.precoCompra,
      pesagens: form.pesoEntradaKg ? [{ data: form.dataEntrada!, pesoKg: form.pesoEntradaKg }] : [],
      sanidade: [],
      reproducao: [],
      status: "ativo",
    };
    setAnimais((p) => [novo, ...p]);
    if (form.origem === "comprado" && form.precoCompra) {
      setFinanc((p) => [{ id: uid(), data: form.dataEntrada!, tipo: "despesa", categoria: "Compra de gado", descricao: `Compra brinco ${form.brinco}`, valor: form.precoCompra!, modulo: "gado", status: "pago" }, ...p]);
    }
    setOpen(false);
    setForm({ ...form, brinco: "", nome: "", pesoEntradaKg: undefined, precoCompra: undefined });
    toast.success("Animal cadastrado");
  };

  const criarPasto = () => {
    if (!pastoForm.nome) { toast.error("Nome do pasto é obrigatório"); return; }
    setPastos((p) => [{ id: uid(), nome: pastoForm.nome!, areaHa: pastoForm.areaHa, capacidade: pastoForm.capacidade }, ...p]);
    setPastoOpen(false);
    setPastoForm({ nome: "", areaHa: undefined, capacidade: undefined });
    toast.success("Pasto criado");
  };

  const removerPasto = (id: string) => {
    if (!confirm("Remover pasto?")) return;
    setPastos((p) => p.filter((x) => x.id !== id));
  };

  const filtrados = useMemo(() => {
    return animais.filter((a) => {
      if (filtro !== "todos" && a.status !== filtro) return false;
      if (busca && !`${a.brinco} ${a.nome ?? ""} ${a.raca ?? ""}`.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [animais, filtro, busca]);

  const ultimoPeso = (a: Animal) => [...a.pesagens].sort((x, y) => y.data.localeCompare(x.data))[0]?.pesoKg;

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold flex items-center gap-2"><Beef className="h-8 w-8 text-primary" /> Gado de corte</h1>
            <p className="text-muted-foreground mt-1">Cadastro, pesagens, sanidade, vendas e pastos.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => gerarRelatorioRebanho(animais)}><FileText className="h-4 w-4 mr-1" /> PDF</Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Novo animal</Button></DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Cadastrar animal</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Brinco *"><Input value={form.brinco} onChange={(e) => setForm({ ...form, brinco: e.target.value })} placeholder="Ex: 1234" /></Field>
                  <Field label="Nome (opcional)"><Input value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
                  <Field label="Sexo">
                    <Select value={form.sexo} onValueChange={(v) => setForm({ ...form, sexo: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="macho">Macho</SelectItem><SelectItem value="femea">Fêmea</SelectItem></SelectContent>
                    </Select>
                  </Field>
                  <Field label="Categoria">
                    <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bezerro">Bezerro</SelectItem>
                        <SelectItem value="novilho">Novilho</SelectItem>
                        <SelectItem value="boi">Boi</SelectItem>
                        <SelectItem value="novilha">Novilha</SelectItem>
                        <SelectItem value="vaca">Vaca</SelectItem>
                        <SelectItem value="touro">Touro</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Raça"><Input value={form.raca ?? ""} onChange={(e) => setForm({ ...form, raca: e.target.value })} placeholder="Nelore..." /></Field>
                  <Field label="Nascimento"><Input type="date" value={form.nascimento ?? ""} onChange={(e) => setForm({ ...form, nascimento: e.target.value })} /></Field>
                  <Field label="Data de entrada"><Input type="date" value={form.dataEntrada} onChange={(e) => setForm({ ...form, dataEntrada: e.target.value })} /></Field>
                  <Field label="Origem">
                    <Select value={form.origem} onValueChange={(v) => setForm({ ...form, origem: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="nascido">Nascido aqui</SelectItem><SelectItem value="comprado">Comprado</SelectItem></SelectContent>
                    </Select>
                  </Field>
                  <Field label="Peso entrada (kg)"><Input type="number" value={form.pesoEntradaKg ?? ""} onChange={(e) => setForm({ ...form, pesoEntradaKg: e.target.value ? +e.target.value : undefined })} /></Field>
                  {form.origem === "comprado" && <Field label="Preço compra (R$)"><Input type="number" value={form.precoCompra ?? ""} onChange={(e) => setForm({ ...form, precoCompra: e.target.value ? +e.target.value : undefined })} /></Field>}
                  <Field label="Pasto">
                    <Select value={form.pastoId || "none"} onValueChange={(v) => setForm({ ...form, pastoId: v === "none" ? "" : v })}>
                      <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {pastos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <DialogFooter><Button onClick={criar}>Cadastrar</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <Tabs defaultValue="rebanho">
          <TabsList>
            <TabsTrigger value="rebanho">Rebanho ({animais.length})</TabsTrigger>
            <TabsTrigger value="pastos">Pastos ({pastos.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="rebanho" className="space-y-4 mt-4">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Buscar brinco, raça..." value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
              <Select value={filtro} onValueChange={(v) => setFiltro(v as any)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="vendido">Vendidos</SelectItem>
                  <SelectItem value="morto">Mortos</SelectItem>
                  <SelectItem value="abatido">Abatidos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filtrados.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <Beef className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-lg font-medium">Sem animais</p>
                <p className="text-sm text-muted-foreground mb-4">Cadastre o primeiro animal do rebanho.</p>
                <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Cadastrar</Button>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtrados.map((a) => {
                  const peso = ultimoPeso(a);
                  const pasto = pastos.find((p) => p.id === a.pastoId);
                  return (
                    <Card key={a.id} className="p-4" style={{ background: "var(--gradient-surface)" }}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-display font-bold text-lg">#{a.brinco}</h3>
                            <Badge variant={a.status === "ativo" ? "default" : "secondary"} className="text-[10px]">{a.status}</Badge>
                          </div>
                          {a.nome && <p className="text-xs text-muted-foreground">{a.nome}</p>}
                        </div>
                        <Badge variant="outline" className="text-[10px]">{a.sexo === "macho" ? "♂" : "♀"} {a.categoria}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5 mb-3">
                        {a.raca && <p>{a.raca}</p>}
                        {peso && <p>Peso atual: <span className="text-foreground font-medium">{peso} kg</span></p>}
                        {pasto && <p className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {pasto.nome}</p>}
                      </div>
                      <Button asChild size="sm" variant="outline" className="w-full"><Link to="/gado/$id" params={{ id: a.id }}>Abrir <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pastos" className="space-y-4 mt-4">
            <Dialog open={pastoOpen} onOpenChange={setPastoOpen}>
              <DialogTrigger asChild><Button variant="outline"><Plus className="h-4 w-4 mr-1" /> Novo pasto</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Cadastrar pasto</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nome *"><Input value={pastoForm.nome} onChange={(e) => setPastoForm({ ...pastoForm, nome: e.target.value })} /></Field>
                  <Field label="Área (ha)"><Input type="number" step="0.1" value={pastoForm.areaHa ?? ""} onChange={(e) => setPastoForm({ ...pastoForm, areaHa: e.target.value ? +e.target.value : undefined })} /></Field>
                  <Field label="Capacidade (cabeças)"><Input type="number" value={pastoForm.capacidade ?? ""} onChange={(e) => setPastoForm({ ...pastoForm, capacidade: e.target.value ? +e.target.value : undefined })} /></Field>
                </div>
                <DialogFooter><Button onClick={criarPasto}>Criar</Button></DialogFooter>
              </DialogContent>
            </Dialog>

            {pastos.length === 0 ? (
              <Card className="p-8 text-center border-dashed text-sm text-muted-foreground">Nenhum pasto cadastrado.</Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {pastos.map((p) => {
                  const lotacao = animais.filter((a) => a.pastoId === p.id && a.status === "ativo").length;
                  return (
                    <Card key={p.id} className="p-4 flex items-start justify-between" style={{ background: "var(--gradient-surface)" }}>
                      <div>
                        <h3 className="font-display font-bold text-lg flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />{p.nome}</h3>
                        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                          {p.areaHa !== undefined && <p>{p.areaHa} ha</p>}
                          <p>{lotacao} animal(is) {p.capacidade ? `/ ${p.capacidade}` : ""}</p>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => removerPasto(p.id)}><Trash2 className="h-4 w-4" /></Button>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
