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
import { useCloudCollection } from "@/lib/cloud/useCloudCollection";
import { useFazenda } from "@/lib/cloud/fazenda";
import { StatCard } from "@/components/StatCard";
import { baixarCSV } from "@/lib/exportar";
import { Milk, Plus, Trash2, Droplets, HeartPulse, Baby, Download, CalendarDays } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/leite")({
  head: () => ({
    meta: [
      { title: "Gado de Leite — AgroSítio" },
      { name: "description", content: "Gestão completa do gado de leite: rebanho, controle leiteiro por ordenha, lactações, reprodução, sanidade e indicadores por vaca." },
      { property: "og:title", content: "Gado de Leite — AgroSítio" },
      { property: "og:description", content: "Rebanho leiteiro, controle leiteiro diário, lactações, reprodução e indicadores em tempo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeitePage,
});

type Animal = {
  id: string; brinco: string; nome: string | null; raca: string | null; categoria: string;
  nascimento: string | null; pai: string | null; mae: string | null; origem: string | null;
  data_entrada: string; valor_aquisicao: number | null; peso_kg: number | null;
  status: string; local: string | null; observacoes: string | null;
};
type Producao = {
  id: string; animal_id: string | null; data: string; manha: number; tarde: number; noite: number;
  total: number; ordenhas: number; observacoes: string | null;
};
type Lactacao = {
  id: string; animal_id: string; numero: number; data_parto: string; data_secagem_prevista: string | null;
  data_secagem: string | null; pico_litros: number | null; status: string; observacoes: string | null;
};
type Evento = {
  id: string; animal_id: string | null; tipo: string; data: string; touro_semen: string | null;
  resultado: string | null; data_prevista: string | null; problema: string | null; medicamento: string | null;
  dosagem: string | null; responsavel: string | null; custo: number | null; observacoes: string | null;
};

const CATEGORIAS = [
  { v: "vaca_lactacao", l: "Vaca em lactação" },
  { v: "vaca_seca", l: "Vaca seca" },
  { v: "novilha", l: "Novilha" },
  { v: "bezerra", l: "Bezerra" },
  { v: "touro", l: "Touro" },
];
const CAT_LABEL = Object.fromEntries(CATEGORIAS.map((c) => [c.v, c.l]));
const hoje = () => new Date().toISOString().slice(0, 10);
const fmt = (n: number, d = 1) => n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dias = (de: string) => Math.max(0, Math.floor((Date.now() - new Date(de).getTime()) / 86400000));

function LeitePage() {
  const { operador } = useFazenda();
  const animais = useCloudCollection<Animal>("leite_animais", { col: "brinco", asc: true });
  const producao = useCloudCollection<Producao>("leite_producao", { col: "data", asc: false });
  const lactacoes = useCloudCollection<Lactacao>("leite_lactacoes", { col: "data_parto", asc: false });
  const eventos = useCloudCollection<Evento>("leite_eventos", { col: "data", asc: false });

  const ativos = animais.items.filter((a) => a.status === "ativo");
  const emLactacao = ativos.filter((a) => a.categoria === "vaca_lactacao");
  const secas = ativos.filter((a) => a.categoria === "vaca_seca");

  const hj = hoje();
  const mes = hj.slice(0, 7);
  const litrosHoje = producao.items.filter((p) => p.data === hj).reduce((s, p) => s + Number(p.total || 0), 0);
  const litrosMes = producao.items.filter((p) => p.data.startsWith(mes)).reduce((s, p) => s + Number(p.total || 0), 0);
  const diasComRegistro = new Set(producao.items.filter((p) => p.data.startsWith(mes)).map((p) => p.data)).size || 1;
  const mediaDia = litrosMes / diasComRegistro;
  const mediaVaca = emLactacao.length ? mediaDia / emLactacao.length : 0;

  const precoLitro = 2.4;

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
              <Milk className="h-6 w-6 text-primary" /> Gado de Leite
            </h1>
            <p className="text-sm text-muted-foreground">Rebanho, controle leiteiro, lactações, reprodução e sanidade.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => baixarCSV("controle-leiteiro", producao.items as any)}>
            <Download className="h-4 w-4 mr-1" /> Exportar CSV
          </Button>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Vacas em lactação" value={String(emLactacao.length)} hint={`${secas.length} secas · ${ativos.length} no rebanho`} icon={Milk} tone="primary" />
          <StatCard label="Litros hoje" value={fmt(litrosHoje)} hint={`${fmt(mediaDia)} L/dia no mês`} icon={Droplets} tone="accent" />
          <StatCard label="Média por vaca" value={`${fmt(mediaVaca)} L`} hint="Litros/vaca/dia" icon={HeartPulse} tone="primary" />
          <StatCard label="Receita do mês" value={brl(litrosMes * precoLitro)} hint={`${fmt(litrosMes, 0)} L × ${brl(precoLitro)}`} icon={CalendarDays} tone="accent" />
        </div>

        <Tabs defaultValue="ordenha">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="ordenha">Controle leiteiro</TabsTrigger>
            <TabsTrigger value="rebanho">Rebanho</TabsTrigger>
            <TabsTrigger value="lactacao">Lactações</TabsTrigger>
            <TabsTrigger value="reproducao">Reprodução & Sanidade</TabsTrigger>
          </TabsList>

          <TabsContent value="ordenha" className="mt-4">
            <Ordenhas producao={producao} animais={ativos} operador={operador} />
          </TabsContent>
          <TabsContent value="rebanho" className="mt-4">
            <Rebanho animais={animais} producao={producao.items} operador={operador} />
          </TabsContent>
          <TabsContent value="lactacao" className="mt-4">
            <Lactacoes lactacoes={lactacoes} animais={ativos} />
          </TabsContent>
          <TabsContent value="reproducao" className="mt-4">
            <Eventos eventos={eventos} animais={ativos} operador={operador} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

/* ================= Controle leiteiro ================= */
function Ordenhas({ producao, animais, operador }: any) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ data: hoje(), animal_id: "geral", manha: "", tarde: "", noite: "", observacoes: "" });

  const salvar = async () => {
    const manha = Number(f.manha) || 0, tarde = Number(f.tarde) || 0, noite = Number(f.noite) || 0;
    const total = manha + tarde + noite;
    if (total <= 0) return toast.error("Informe pelo menos uma ordenha");
    await producao.add({
      data: f.data, animal_id: f.animal_id === "geral" ? null : f.animal_id,
      manha, tarde, noite, total, ordenhas: [manha, tarde, noite].filter((v) => v > 0).length,
      observacoes: f.observacoes || null, autor: operador ?? null,
    });
    toast.success(`${fmt(total)} L registrados`);
    setF({ ...f, manha: "", tarde: "", noite: "", observacoes: "" });
    setOpen(false);
  };

  const nome = (id: string | null) => (id ? animais.find((a: Animal) => a.id === id)?.brinco ?? "—" : "Total do rebanho");

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Ordenhas registradas</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Lançar ordenha</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Lançar ordenha</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data</Label><Input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></div>
                <div>
                  <Label>Vaca</Label>
                  <Select value={f.animal_id} onValueChange={(v) => setF({ ...f, animal_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="geral">Total do rebanho</SelectItem>
                      {animais.map((a: Animal) => <SelectItem key={a.id} value={a.id}>{a.brinco} {a.nome ? `· ${a.nome}` : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Manhã (L)</Label><Input inputMode="decimal" value={f.manha} onChange={(e) => setF({ ...f, manha: e.target.value })} /></div>
                <div><Label>Tarde (L)</Label><Input inputMode="decimal" value={f.tarde} onChange={(e) => setF({ ...f, tarde: e.target.value })} /></div>
                <div><Label>Noite (L)</Label><Input inputMode="decimal" value={f.noite} onChange={(e) => setF({ ...f, noite: e.target.value })} /></div>
              </div>
              <div><Label>Observações</Label><Input value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={salvar}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Vaca</TableHead><TableHead className="text-right">Manhã</TableHead><TableHead className="text-right">Tarde</TableHead><TableHead className="text-right">Noite</TableHead><TableHead className="text-right">Total</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {producao.items.slice(0, 60).map((p: Producao) => (
              <TableRow key={p.id}>
                <TableCell>{new Date(p.data + "T12:00").toLocaleDateString("pt-BR")}</TableCell>
                <TableCell className="text-muted-foreground">{nome(p.animal_id)}</TableCell>
                <TableCell className="text-right">{fmt(Number(p.manha))}</TableCell>
                <TableCell className="text-right">{fmt(Number(p.tarde))}</TableCell>
                <TableCell className="text-right">{fmt(Number(p.noite))}</TableCell>
                <TableCell className="text-right font-semibold">{fmt(Number(p.total))} L</TableCell>
                <TableCell className="text-right"><Button size="icon" variant="ghost" onClick={() => producao.remove(p.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
            {producao.items.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma ordenha registrada ainda.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

/* ================= Rebanho ================= */
function Rebanho({ animais, producao, operador }: any) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [f, setF] = useState({ brinco: "", nome: "", raca: "", categoria: "vaca_lactacao", nascimento: "", pai: "", mae: "", origem: "nascido", valor_aquisicao: "", peso_kg: "", local: "" });

  const salvar = async () => {
    if (!f.brinco.trim()) return toast.error("Informe o brinco");
    await animais.add({
      brinco: f.brinco.trim(), nome: f.nome || null, raca: f.raca || null, categoria: f.categoria,
      nascimento: f.nascimento || null, pai: f.pai || null, mae: f.mae || null, origem: f.origem,
      valor_aquisicao: f.valor_aquisicao ? Number(f.valor_aquisicao) : null,
      peso_kg: f.peso_kg ? Number(f.peso_kg) : null, local: f.local || null,
      data_entrada: hoje(), status: "ativo", autor: operador ?? null,
    });
    toast.success("Animal cadastrado");
    setF({ ...f, brinco: "", nome: "", nascimento: "", pai: "", mae: "", valor_aquisicao: "", peso_kg: "" });
    setOpen(false);
  };

  const lista = animais.items.filter((a: Animal) =>
    !busca || `${a.brinco} ${a.nome ?? ""} ${a.raca ?? ""}`.toLowerCase().includes(busca.toLowerCase()));

  const mediaDaVaca = (id: string) => {
    const regs = producao.filter((p: Producao) => p.animal_id === id);
    if (!regs.length) return 0;
    return regs.reduce((s: number, p: Producao) => s + Number(p.total || 0), 0) / regs.length;
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <Input placeholder="Buscar por brinco, nome ou raça…" value={busca} onChange={(e) => setBusca(e.target.value)} className="max-w-xs" />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo animal</Button></DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Cadastrar animal leiteiro</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Brinco *</Label><Input value={f.brinco} onChange={(e) => setF({ ...f, brinco: e.target.value })} /></div>
                <div><Label>Nome</Label><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
                <div><Label>Raça</Label><Input value={f.raca} onChange={(e) => setF({ ...f, raca: e.target.value })} placeholder="Girolando, Holandesa…" /></div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={f.categoria} onValueChange={(v) => setF({ ...f, categoria: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Nascimento</Label><Input type="date" value={f.nascimento} onChange={(e) => setF({ ...f, nascimento: e.target.value })} /></div>
                <div>
                  <Label>Origem</Label>
                  <Select value={f.origem} onValueChange={(v) => setF({ ...f, origem: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="nascido">Nascido na fazenda</SelectItem><SelectItem value="comprado">Comprado</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Pai</Label><Input value={f.pai} onChange={(e) => setF({ ...f, pai: e.target.value })} /></div>
                <div><Label>Mãe</Label><Input value={f.mae} onChange={(e) => setF({ ...f, mae: e.target.value })} /></div>
                <div><Label>Valor de aquisição</Label><Input inputMode="decimal" value={f.valor_aquisicao} onChange={(e) => setF({ ...f, valor_aquisicao: e.target.value })} /></div>
                <div><Label>Peso (kg)</Label><Input inputMode="decimal" value={f.peso_kg} onChange={(e) => setF({ ...f, peso_kg: e.target.value })} /></div>
                <div className="col-span-2"><Label>Lote / piquete</Label><Input value={f.local} onChange={(e) => setF({ ...f, local: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter><Button onClick={salvar}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Brinco</TableHead><TableHead>Nome</TableHead><TableHead>Categoria</TableHead><TableHead>Raça</TableHead><TableHead className="text-right">Idade</TableHead><TableHead className="text-right">Média L/dia</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {lista.map((a: Animal) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.brinco}</TableCell>
                <TableCell>{a.nome ?? "—"}</TableCell>
                <TableCell><Badge variant="secondary">{CAT_LABEL[a.categoria] ?? a.categoria}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{a.raca ?? "—"}</TableCell>
                <TableCell className="text-right">{a.nascimento ? `${Math.floor(dias(a.nascimento) / 30)} m` : "—"}</TableCell>
                <TableCell className="text-right">{fmt(mediaDaVaca(a.id))}</TableCell>
                <TableCell className="text-right"><Button size="icon" variant="ghost" onClick={() => animais.remove(a.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
            {lista.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum animal cadastrado.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

/* ================= Lactações ================= */
function Lactacoes({ lactacoes, animais }: any) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ animal_id: "", numero: "1", data_parto: hoje(), pico_litros: "" });

  const salvar = async () => {
    if (!f.animal_id) return toast.error("Escolha a vaca");
    const parto = new Date(f.data_parto + "T12:00");
    const secagem = new Date(parto.getTime() + 305 * 86400000).toISOString().slice(0, 10);
    await lactacoes.add({
      animal_id: f.animal_id, numero: Number(f.numero) || 1, data_parto: f.data_parto,
      data_secagem_prevista: secagem, pico_litros: f.pico_litros ? Number(f.pico_litros) : null, status: "ativa",
    });
    toast.success("Lactação registrada (secagem prevista em 305 dias)");
    setOpen(false);
  };

  const brinco = (id: string) => animais.find((a: Animal) => a.id === id)?.brinco ?? "—";

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold flex items-center gap-2"><Baby className="h-4 w-4 text-primary" /> Lactações</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova lactação</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar lactação</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Vaca</Label>
                <Select value={f.animal_id} onValueChange={(v) => setF({ ...f, animal_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{animais.map((a: Animal) => <SelectItem key={a.id} value={a.id}>{a.brinco}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Nº lactação</Label><Input inputMode="numeric" value={f.numero} onChange={(e) => setF({ ...f, numero: e.target.value })} /></div>
                <div><Label>Data do parto</Label><Input type="date" value={f.data_parto} onChange={(e) => setF({ ...f, data_parto: e.target.value })} /></div>
                <div><Label>Pico (L)</Label><Input inputMode="decimal" value={f.pico_litros} onChange={(e) => setF({ ...f, pico_litros: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter><Button onClick={salvar}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Vaca</TableHead><TableHead>Nº</TableHead><TableHead>Parto</TableHead><TableHead className="text-right">DEL</TableHead><TableHead>Secagem prevista</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {lactacoes.items.map((l: Lactacao) => {
              const del = dias(l.data_parto);
              return (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{brinco(l.animal_id)}</TableCell>
                  <TableCell>{l.numero}</TableCell>
                  <TableCell>{new Date(l.data_parto + "T12:00").toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="text-right">{del} dias</TableCell>
                  <TableCell>{l.data_secagem_prevista ? new Date(l.data_secagem_prevista + "T12:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell><Badge variant={del > 305 ? "destructive" : "secondary"}>{del > 305 ? "Secar agora" : l.status}</Badge></TableCell>
                  <TableCell className="text-right"><Button size="icon" variant="ghost" onClick={() => lactacoes.remove(l.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              );
            })}
            {lactacoes.items.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma lactação registrada.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

/* ================= Reprodução & Sanidade ================= */
const TIPOS = [
  { v: "cio", l: "Cio detectado" },
  { v: "ia", l: "Inseminação / cobertura" },
  { v: "diagnostico", l: "Diagnóstico de gestação" },
  { v: "parto", l: "Parto" },
  { v: "vacina", l: "Vacina" },
  { v: "tratamento", l: "Tratamento / doença" },
  { v: "mastite", l: "Mastite" },
  { v: "casco", l: "Casco" },
];
const TIPO_LABEL = Object.fromEntries(TIPOS.map((t) => [t.v, t.l]));

function Eventos({ eventos, animais, operador }: any) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ animal_id: "", tipo: "ia", data: hoje(), touro_semen: "", resultado: "", problema: "", medicamento: "", dosagem: "", responsavel: "", custo: "", observacoes: "" });

  const salvar = async () => {
    if (!f.animal_id) return toast.error("Escolha o animal");
    let prevista: string | null = null;
    if (f.tipo === "ia") prevista = new Date(new Date(f.data + "T12:00").getTime() + 283 * 86400000).toISOString().slice(0, 10);
    if (f.tipo === "cio") prevista = new Date(new Date(f.data + "T12:00").getTime() + 21 * 86400000).toISOString().slice(0, 10);
    await eventos.add({
      animal_id: f.animal_id, tipo: f.tipo, data: f.data, touro_semen: f.touro_semen || null,
      resultado: f.resultado || null, data_prevista: prevista, problema: f.problema || null,
      medicamento: f.medicamento || null, dosagem: f.dosagem || null, responsavel: f.responsavel || null,
      custo: f.custo ? Number(f.custo) : null, observacoes: f.observacoes || null, autor: operador ?? null,
    });
    toast.success("Evento registrado");
    setOpen(false);
  };

  const brinco = (id: string | null) => animais.find((a: Animal) => a.id === id)?.brinco ?? "—";
  const proximos = eventos.items.filter((e: Evento) => e.data_prevista && e.data_prevista >= hoje()).slice(0, 6);

  return (
    <div className="space-y-4">
      {proximos.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-2 text-sm">Próximas datas</h3>
          <div className="grid md:grid-cols-3 gap-2">
            {proximos.map((e: Evento) => (
              <div key={e.id} className="rounded-lg border border-border/60 p-2 text-sm">
                <div className="font-medium">{brinco(e.animal_id)} · {TIPO_LABEL[e.tipo] ?? e.tipo}</div>
                <div className="text-xs text-muted-foreground">
                  {e.tipo === "ia" ? "Parto previsto" : "Retorno previsto"}: {new Date(e.data_prevista! + "T12:00").toLocaleDateString("pt-BR")}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Reprodução & Sanidade</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo evento</Button></DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Registrar evento</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Animal</Label>
                    <Select value={f.animal_id} onValueChange={(v) => setF({ ...f, animal_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{animais.map((a: Animal) => <SelectItem key={a.id} value={a.id}>{a.brinco}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TIPOS.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Data</Label><Input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></div>
                  <div><Label>Touro / sêmen</Label><Input value={f.touro_semen} onChange={(e) => setF({ ...f, touro_semen: e.target.value })} /></div>
                  <div><Label>Resultado</Label><Input value={f.resultado} onChange={(e) => setF({ ...f, resultado: e.target.value })} placeholder="prenhe, vazia…" /></div>
                  <div><Label>Problema</Label><Input value={f.problema} onChange={(e) => setF({ ...f, problema: e.target.value })} /></div>
                  <div><Label>Medicamento</Label><Input value={f.medicamento} onChange={(e) => setF({ ...f, medicamento: e.target.value })} /></div>
                  <div><Label>Dosagem</Label><Input value={f.dosagem} onChange={(e) => setF({ ...f, dosagem: e.target.value })} /></div>
                  <div><Label>Responsável</Label><Input value={f.responsavel} onChange={(e) => setF({ ...f, responsavel: e.target.value })} /></div>
                  <div><Label>Custo (R$)</Label><Input inputMode="decimal" value={f.custo} onChange={(e) => setF({ ...f, custo: e.target.value })} /></div>
                </div>
                <div><Label>Observações</Label><Input value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={salvar}>Salvar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Animal</TableHead><TableHead>Tipo</TableHead><TableHead>Detalhe</TableHead><TableHead className="text-right">Custo</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {eventos.items.map((e: Evento) => (
                <TableRow key={e.id}>
                  <TableCell>{new Date(e.data + "T12:00").toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="font-medium">{brinco(e.animal_id)}</TableCell>
                  <TableCell><Badge variant="secondary">{TIPO_LABEL[e.tipo] ?? e.tipo}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-sm">{e.touro_semen || e.medicamento || e.problema || e.resultado || "—"}</TableCell>
                  <TableCell className="text-right">{e.custo ? brl(Number(e.custo)) : "—"}</TableCell>
                  <TableCell className="text-right"><Button size="icon" variant="ghost" onClick={() => eventos.remove(e.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
              {eventos.items.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum evento registrado.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
