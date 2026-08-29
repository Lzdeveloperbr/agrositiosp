import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAnimais, usePastos, useFinanceiro } from "@/lib/state";
import { uid } from "@/lib/storage";
import type { Animal, Pasto } from "@/lib/types";
import {
  Beef, Plus, Trash2, ArrowRight, MapPin, Search, FileText, Syringe,
  Users, TrendingUp, TrendingDown, ShoppingCart, DollarSign, AlertTriangle, Baby, Skull, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { gerarRelatorioRebanho } from "@/lib/pdf";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { hojeISO, isoLocal } from "@/lib/data";

export const Route = createFileRoute("/gado/")({
  head: () => ({
    meta: [
      { title: "Gado — AgroSítio" },
      { name: "description", content: "Painel completo do rebanho: dashboard, animais, vacinas, brucelose e pastos." },
    ],
  }),
  component: GadoPage,
});

// ===== util =====
function idadeMeses(nascimento?: string): number | null {
  if (!nascimento) return null;
  const n = new Date(nascimento);
  const hoje = new Date();
  return (hoje.getFullYear() - n.getFullYear()) * 12 + (hoje.getMonth() - n.getMonth());
}
function idadeLabel(meses: number | null): string {
  if (meses === null) return "—";
  if (meses < 12) return `${meses} m`;
  const a = Math.floor(meses / 12);
  const m = meses % 12;
  return m ? `${a}a ${m}m` : `${a}a`;
}
function faixaEtaria(meses: number | null): string {
  if (meses === null) return "Sem idade";
  if (meses < 8) return "0-8m (Bezerro)";
  if (meses < 18) return "8-18m";
  if (meses < 36) return "18-36m";
  if (meses < 60) return "36-60m";
  return "+60m";
}
function mesAtual(date: string): boolean {
  const d = new Date(date);
  const h = new Date();
  return d.getFullYear() === h.getFullYear() && d.getMonth() === h.getMonth();
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function GadoPage() {
  const [animais, setAnimais] = useAnimais();
  const [pastos, setPastos] = usePastos();
  const [, setFinanc] = useFinanceiro();
  const [open, setOpen] = useState(false);
  const [pastoOpen, setPastoOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "ativo" | "vendido" | "morto" | "abatido">("ativo");
  const [filtroSexo, setFiltroSexo] = useState<"todos" | "macho" | "femea">("todos");
  const [filtroFaixa, setFiltroFaixa] = useState<string>("todos");

  const [form, setForm] = useState<Partial<Animal>>({
    brinco: "", sexo: "macho", categoria: "bezerro", raca: "",
    dataEntrada: hojeISO(),
    origem: "nascido", status: "ativo", pesoEntradaKg: undefined,
    pastoId: "", nascimento: "", precoCompra: undefined,
  });
  const [pastoForm, setPastoForm] = useState<Partial<Pasto>>({ nome: "", areaHa: undefined, capacidade: undefined });

  // ===== KPIs =====
  const kpis = useMemo(() => {
    const ativos = animais.filter((a) => a.status === "ativo");
    const machos = ativos.filter((a) => a.sexo === "macho").length;
    const femeas = ativos.filter((a) => a.sexo === "femea").length;
    const nascimentosMes = animais.filter((a) => a.origem === "nascido" && mesAtual(a.dataEntrada)).length;
    const mortesMes = animais.filter((a) => a.status === "morto" && a.saidaData && mesAtual(a.saidaData)).length;
    const comprasMes = animais.filter((a) => a.origem === "comprado" && mesAtual(a.dataEntrada)).length;
    const vendasMes = animais.filter((a) => (a.status === "vendido" || a.status === "abatido") && a.saidaData && mesAtual(a.saidaData)).length;
    const hoje = hojeISO();
    let vacPend = 0, vacFeitas = 0;
    ativos.forEach((a) => a.sanidade.forEach((s) => {
      if (s.tipo === "vacina") {
        vacFeitas++;
        if (s.proximaData && s.proximaData <= hoje) vacPend++;
      }
    }));
    const valorVendas = animais.filter((a) => a.status === "vendido" && a.saidaData && mesAtual(a.saidaData))
      .reduce((s, a) => s + (a.precoVenda || 0), 0);
    return { total: ativos.length, machos, femeas, nascimentosMes, mortesMes, comprasMes, vendasMes, vacPend, vacFeitas, valorVendas };
  }, [animais]);

  // ===== charts =====
  const dataFaixa = useMemo(() => {
    const map = new Map<string, number>();
    animais.filter((a) => a.status === "ativo").forEach((a) => {
      const f = faixaEtaria(idadeMeses(a.nascimento));
      map.set(f, (map.get(f) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([faixa, qtd]) => ({ faixa, qtd }));
  }, [animais]);

  const dataSexo = [
    { name: "Machos", value: kpis.machos },
    { name: "Fêmeas", value: kpis.femeas },
  ];

  const dataVac = useMemo(() => {
    const ativos = animais.filter((a) => a.status === "ativo");
    const vac = ativos.filter((a) => a.sanidade.some((s) => s.tipo === "vacina")).length;
    return [
      { name: "Vacinados", value: vac },
      { name: "Sem vacina", value: ativos.length - vac },
    ];
  }, [animais]);

  const dataEvolucao = useMemo(() => {
    // Últimos 12 meses: saldo do rebanho
    const meses: { mes: string; rebanho: number }[] = [];
    const hoje = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const fim = new isoLocal(Date(hoje.getFullYear(), hoje.getMonth() - i + 1, 0));
      const ini = isoLocal(d);
      const total = animais.filter((a) => a.dataEntrada <= fim && (!a.saidaData || a.saidaData > fim)).length;
      meses.push({ mes: ini.slice(2, 7), rebanho: total });
    }
    return meses;
  }, [animais]);

  // ===== brucelose =====
  const brucelose = useMemo(() => {
    return animais
      .filter((a) => a.sexo === "femea" && a.status === "ativo")
      .map((a) => {
        const m = idadeMeses(a.nascimento);
        const elegivel = m !== null && m >= 3 && m <= 8;
        const vacBruc = a.sanidade.find((s) => s.tipo === "vacina" && /bruc/i.test(s.produto));
        return { a, meses: m, elegivel, vacBruc };
      })
      .filter((x) => x.elegivel || x.vacBruc);
  }, [animais]);

  // ===== vacinações flat =====
  const todasVacinas = useMemo(() => {
    const hoje = hojeISO();
    return animais.flatMap((a) => a.sanidade
      .filter((s) => s.tipo === "vacina")
      .map((s) => ({ ...s, brinco: a.brinco, animalId: a.id, vencida: !!s.proximaData && s.proximaData <= hoje })))
      .sort((x, y) => (y.data).localeCompare(x.data));
  }, [animais]);

  const criar = () => {
    if (!form.brinco) { toast.error("Informe o brinco"); return; }
    if (animais.some((a) => a.brinco === form.brinco)) { toast.error("Brinco já existe"); return; }
    const novo: Animal = {
      id: uid(), brinco: form.brinco!, nome: form.nome, sexo: form.sexo as any, raca: form.raca,
      categoria: form.categoria as any, nascimento: form.nascimento || undefined, dataEntrada: form.dataEntrada!,
      origem: form.origem as any, pastoId: form.pastoId || undefined, pesoEntradaKg: form.pesoEntradaKg,
      precoCompra: form.precoCompra,
      pesagens: form.pesoEntradaKg ? [{ data: form.dataEntrada!, pesoKg: form.pesoEntradaKg }] : [],
      sanidade: [], reproducao: [], status: "ativo",
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

  const racasUnicas = useMemo(() => Array.from(new Set(animais.map((a) => a.raca).filter(Boolean) as string[])), [animais]);

  const filtrados = useMemo(() => {
    return animais.filter((a) => {
      if (filtro !== "todos" && a.status !== filtro) return false;
      if (filtroSexo !== "todos" && a.sexo !== filtroSexo) return false;
      if (filtroFaixa !== "todos" && faixaEtaria(idadeMeses(a.nascimento)) !== filtroFaixa) return false;
      if (busca && !`${a.brinco} ${a.nome ?? ""} ${a.raca ?? ""}`.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [animais, filtro, filtroSexo, filtroFaixa, busca]);

  const ultimoPeso = (a: Animal) => [...a.pesagens].sort((x, y) => y.data.localeCompare(x.data))[0]?.pesoKg;

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold flex items-center gap-2"><Beef className="h-8 w-8 text-primary" /> Gado</h1>
            <p className="text-muted-foreground mt-1">Painel completo do rebanho — dashboard, animais, vacinas e pastos.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => gerarRelatorioRebanho(animais)}><FileText className="h-4 w-4 mr-1" /> Relatório PDF</Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="lg"><Plus className="h-4 w-4 mr-1" /> Novo animal</Button></DialogTrigger>
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

        <Tabs defaultValue="painel">
          <TabsList className="grid grid-cols-5 w-full md:w-auto">
            <TabsTrigger value="painel">Painel</TabsTrigger>
            <TabsTrigger value="rebanho">Rebanho</TabsTrigger>
            <TabsTrigger value="vacinas">Vacinas</TabsTrigger>
            <TabsTrigger value="brucelose">Brucelose</TabsTrigger>
            <TabsTrigger value="pastos">Pastos</TabsTrigger>
          </TabsList>

          {/* ===== PAINEL ===== */}
          <TabsContent value="painel" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi label="Total rebanho" value={kpis.total} icon={Users} tone="primary" />
              <Kpi label="Machos" value={kpis.machos} icon={Beef} tone="info" />
              <Kpi label="Fêmeas" value={kpis.femeas} icon={Beef} tone="accent" />
              <Kpi label="Nascimentos (mês)" value={kpis.nascimentosMes} icon={Baby} tone="success" />
              <Kpi label="Mortes (mês)" value={kpis.mortesMes} icon={Skull} tone="danger" />
              <Kpi label="Compras (mês)" value={kpis.comprasMes} icon={ShoppingCart} tone="info" />
              <Kpi label="Vendas (mês)" value={kpis.vendasMes} icon={DollarSign} tone="success" hint={kpis.valorVendas ? `R$ ${kpis.valorVendas.toLocaleString("pt-BR")}` : undefined} />
              <Kpi label="Vacinas pendentes" value={kpis.vacPend} icon={AlertTriangle} tone={kpis.vacPend ? "danger" : "muted"} />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Rebanho por faixa etária</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dataFaixa}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="faixa" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="qtd" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-4">
                <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Evolução (12 meses)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={dataEvolucao}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="mes" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Line type="monotone" dataKey="rebanho" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-4">
                <h3 className="font-display font-semibold mb-3">Machos x Fêmeas</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={dataSexo} dataKey="value" nameKey="name" outerRadius={80} label>
                      {dataSexo.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-4">
                <h3 className="font-display font-semibold mb-3">Vacinados x Sem vacina</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={dataVac} dataKey="value" nameKey="name" outerRadius={80} label>
                      <Cell fill="hsl(var(--primary))" /><Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </TabsContent>

          {/* ===== REBANHO ===== */}
          <TabsContent value="rebanho" className="space-y-4 mt-4">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Brinco, nome, raça..." value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
              <Select value={filtro} onValueChange={(v) => setFiltro(v as any)}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="vendido">Vendidos</SelectItem>
                  <SelectItem value="morto">Mortos</SelectItem>
                  <SelectItem value="abatido">Abatidos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroSexo} onValueChange={(v) => setFiltroSexo(v as any)}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Sexo</SelectItem>
                  <SelectItem value="macho">Machos</SelectItem>
                  <SelectItem value="femea">Fêmeas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroFaixa} onValueChange={setFiltroFaixa}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Idade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas idades</SelectItem>
                  <SelectItem value="0-8m (Bezerro)">0-8m (Bezerro)</SelectItem>
                  <SelectItem value="8-18m">8-18m</SelectItem>
                  <SelectItem value="18-36m">18-36m</SelectItem>
                  <SelectItem value="36-60m">36-60m</SelectItem>
                  <SelectItem value="+60m">+60m</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-muted-foreground">{filtrados.length} animal(is)</p>

            {filtrados.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <Beef className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-lg font-medium">Sem animais</p>
                <Button onClick={() => setOpen(true)} className="mt-3"><Plus className="h-4 w-4 mr-1" /> Cadastrar</Button>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtrados.map((a) => {
                  const peso = ultimoPeso(a);
                  const pasto = pastos.find((p) => p.id === a.pastoId);
                  const idade = idadeMeses(a.nascimento);
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
                        <p>Idade: <span className="text-foreground font-medium">{idadeLabel(idade)}</span></p>
                        {peso && <p>Peso: <span className="text-foreground font-medium">{peso} kg</span></p>}
                        {pasto && <p className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {pasto.nome}</p>}
                      </div>
                      <Button asChild size="sm" variant="outline" className="w-full"><Link to="/gado/$id" params={{ id: a.id }}>Abrir <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ===== VACINAS ===== */}
          <TabsContent value="vacinas" className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-3">
              <Kpi label="Aplicadas" value={kpis.vacFeitas} icon={Syringe} tone="success" />
              <Kpi label="Pendentes" value={kpis.vacPend} icon={AlertTriangle} tone={kpis.vacPend ? "danger" : "muted"} />
              <Kpi label="Animais ativos" value={kpis.total} icon={Users} tone="primary" />
            </div>
            <Card className="p-0 overflow-hidden">
              <div className="p-3 border-b text-sm font-semibold flex items-center gap-2"><Syringe className="h-4 w-4 text-primary" /> Histórico de vacinações</div>
              {todasVacinas.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma vacinação registrada. Abra um animal para registrar.</div>
              ) : (
                <div className="divide-y max-h-[60vh] overflow-y-auto">
                  {todasVacinas.map((v) => (
                    <Link key={v.id} to="/gado/$id" params={{ id: v.animalId }} className="flex items-center gap-3 p-3 hover:bg-accent/40">
                      <Syringe className={`h-4 w-4 shrink-0 ${v.vencida ? "text-destructive" : "text-primary"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{v.produto || "Vacina"} <span className="text-muted-foreground">· #{v.brinco}</span></div>
                        <div className="text-[11px] text-muted-foreground">{v.data}{v.proximaData ? ` · próxima: ${v.proximaData}` : ""}{v.dose ? ` · ${v.dose}` : ""}</div>
                      </div>
                      {v.vencida && <Badge variant="destructive" className="text-[10px]">vencida</Badge>}
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* ===== BRUCELOSE ===== */}
          <TabsContent value="brucelose" className="space-y-4 mt-4">
            <Card className="p-4 border-primary/30 bg-primary/5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold">Vacinação B19 — obrigatória</p>
                  <p className="text-muted-foreground">Fêmeas bovinas entre <b>3 e 8 meses</b> devem ser vacinadas contra brucelose (B19). Cadastre a vacina como produto contendo "brucelose" no histórico de sanidade do animal.</p>
                </div>
              </div>
            </Card>

            {brucelose.length === 0 ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">Nenhuma fêmea elegível ou vacinada no momento.</Card>
            ) : (
              <Card className="p-0 overflow-hidden">
                <div className="grid grid-cols-[80px_1fr_80px_120px_100px] text-[11px] uppercase tracking-wider font-semibold bg-muted/40 p-2 border-b">
                  <div>Brinco</div><div>Nome / Raça</div><div>Idade</div><div>Vacinação</div><div>Status</div>
                </div>
                <div className="divide-y">
                  {brucelose.map(({ a, meses, vacBruc }) => (
                    <Link key={a.id} to="/gado/$id" params={{ id: a.id }} className="grid grid-cols-[80px_1fr_80px_120px_100px] items-center p-2 text-sm hover:bg-accent/40">
                      <div className="font-bold">#{a.brinco}</div>
                      <div className="truncate">{a.nome ?? "—"} <span className="text-muted-foreground text-xs">{a.raca ?? ""}</span></div>
                      <div>{idadeLabel(meses)}</div>
                      <div className="text-xs">{vacBruc?.data ?? "—"}</div>
                      <div>
                        {vacBruc
                          ? <Badge className="text-[10px] bg-emerald-600 hover:bg-emerald-600">vacinada</Badge>
                          : <Badge variant="destructive" className="text-[10px]">pendente</Badge>}
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ===== PASTOS ===== */}
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

function Kpi({ label, value, icon: Icon, tone, hint }: { label: string; value: number | string; icon: any; tone: "primary" | "accent" | "success" | "danger" | "info" | "muted"; hint?: string }) {
  const tones: Record<string, string> = {
    primary: "from-primary/20 to-primary/5 text-primary",
    accent: "from-pink-500/20 to-pink-500/5 text-pink-500",
    success: "from-emerald-500/20 to-emerald-500/5 text-emerald-500",
    danger: "from-destructive/20 to-destructive/5 text-destructive",
    info: "from-blue-500/20 to-blue-500/5 text-blue-500",
    muted: "from-muted to-muted/50 text-muted-foreground",
  };
  return (
    <Card className="p-3 md:p-4 relative overflow-hidden" style={{ background: "var(--gradient-surface)" }}>
      <div className={`absolute -top-6 -right-6 h-20 w-20 rounded-full bg-gradient-to-br ${tones[tone]} opacity-60 blur-2xl`} />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{label}</p>
          <p className="text-2xl md:text-3xl font-display font-bold tabular-nums">{value}</p>
          {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
        </div>
        <div className={`h-8 w-8 md:h-10 md:w-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${tones[tone]} shrink-0`}>
          <Icon className="h-4 w-4 md:h-5 md:w-5" />
        </div>
      </div>
    </Card>
  );
}
