import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { Beef, Plus, Trash2, Scale, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";
import { fmtData, hojeISO } from "@/lib/data";

export const Route = createFileRoute("/engorda")({
  head: () => ({
    meta: [
      { title: "Gado de Engorda — AgroSítio" },
      { name: "description", content: "Lotes de engorda com GMD, arrobas, projeção de abate e lucro por cabeça em tempo real." },
      { property: "og:title", content: "Gado de Engorda — AgroSítio" },
      { property: "og:description", content: "Controle de lotes de engorda: pesagens, GMD, arrobas e rentabilidade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EngordaPage,
});

type Lote = {
  id: string; numero: string; data_entrada: string; quantidade: number; raca: string | null;
  categoria: string | null; peso_medio_inicial_kg: number | null; origem: string | null;
  valor_compra: number | null; sistema: string | null; local: string | null;
  previsao_saida: string | null; meta_gmd: number | null; preco_arroba_venda: number | null;
  encerrado: boolean; observacoes: string | null;
};
type Pesagem = {
  id: string; lote_id: string | null; data: string; quantidade: number | null;
  peso_total_kg: number | null; peso_medio_kg: number | null; observacoes: string | null;
};

const hoje = () => hojeISO();
const fmt = (n: number, d = 1) => n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const diasEntre = (a: string, b: string) => Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));

function EngordaPage() {
  const { operador } = useFazenda();
  const lotes = useCloudCollection<Lote>("engorda_lotes", { col: "data_entrada", asc: false });
  const pesagens = useCloudCollection<Pesagem>("engorda_pesagens", { col: "data", asc: false });

  const ativos = lotes.items.filter((l) => !l.encerrado);
  const cabecas = ativos.reduce((s, l) => s + (l.quantidade || 0), 0);

  const resumo = (l: Lote) => {
    const ps = pesagens.items.filter((p) => p.lote_id === l.id).sort((a, b) => a.data.localeCompare(b.data));
    const ultima = ps[ps.length - 1];
    const pesoAtual = Number(ultima?.peso_medio_kg ?? l.peso_medio_inicial_kg ?? 0);
    const pesoIni = Number(l.peso_medio_inicial_kg ?? 0);
    const dias = diasEntre(l.data_entrada, ultima?.data ?? hoje());
    const gmd = pesoIni > 0 ? (pesoAtual - pesoIni) / dias : 0;
    const arrobas = (pesoAtual * 0.52) / 15;
    const receita = arrobas * Number(l.preco_arroba_venda ?? 0);
    const custoCab = l.quantidade ? Number(l.valor_compra ?? 0) / l.quantidade : 0;
    return { pesoAtual, pesoIni, dias, gmd, arrobas, receita, custoCab, lucro: receita - custoCab, pesagens: ps.length };
  };

  const gmdMedio = ativos.length ? ativos.reduce((s, l) => s + resumo(l).gmd, 0) / ativos.length : 0;
  const arrobasTotal = ativos.reduce((s, l) => s + resumo(l).arrobas * l.quantidade, 0);

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
              <Beef className="h-6 w-6 text-primary" /> Gado de Engorda
            </h1>
            <p className="text-sm text-muted-foreground">Lotes, pesagens, GMD, arrobas e rentabilidade por cabeça.</p>
          </div>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Lotes ativos" value={String(ativos.length)} hint={`${lotes.items.length} no histórico`} icon={Beef} tone="primary" />
          <StatCard label="Cabeças" value={String(cabecas)} hint="Em engorda agora" icon={Scale} tone="accent" />
          <StatCard label="GMD médio" value={`${fmt(gmdMedio, 2)} kg`} hint="Ganho médio diário" icon={TrendingUp} tone="primary" />
          <StatCard label="Arrobas no pasto" value={fmt(arrobasTotal, 0)} hint="Rendimento 52%" icon={Wallet} tone="accent" />
        </div>

        <Tabs defaultValue="lotes">
          <TabsList>
            <TabsTrigger value="lotes">Lotes</TabsTrigger>
            <TabsTrigger value="pesagens">Pesagens</TabsTrigger>
          </TabsList>

          <TabsContent value="lotes" className="mt-4">
            <Lotes lotes={lotes} resumo={resumo} operador={operador} />
          </TabsContent>
          <TabsContent value="pesagens" className="mt-4">
            <Pesagens pesagens={pesagens} lotes={lotes.items} operador={operador} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function Lotes({ lotes, resumo, operador }: any) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ numero: "", data_entrada: hoje(), quantidade: "", raca: "", categoria: "boi", peso_medio_inicial_kg: "", origem: "", valor_compra: "", sistema: "pasto", local: "", meta_gmd: "0.8", preco_arroba_venda: "" });

  const salvar = async () => {
    if (!f.numero.trim()) return toast.error("Informe o número do lote");
    await lotes.add({
      numero: f.numero.trim(), data_entrada: f.data_entrada, quantidade: Number(f.quantidade) || 0,
      raca: f.raca || null, categoria: f.categoria,
      peso_medio_inicial_kg: f.peso_medio_inicial_kg ? Number(f.peso_medio_inicial_kg) : null,
      origem: f.origem || null, valor_compra: f.valor_compra ? Number(f.valor_compra) : null,
      sistema: f.sistema, local: f.local || null,
      meta_gmd: f.meta_gmd ? Number(f.meta_gmd) : null,
      preco_arroba_venda: f.preco_arroba_venda ? Number(f.preco_arroba_venda) : null,
      encerrado: false, autor: operador ?? null,
    });
    toast.success("Lote criado");
    setOpen(false);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Lotes de engorda</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo lote</Button></DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Novo lote de engorda</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Número *</Label><Input value={f.numero} onChange={(e) => setF({ ...f, numero: e.target.value })} /></div>
              <div><Label>Entrada</Label><Input type="date" value={f.data_entrada} onChange={(e) => setF({ ...f, data_entrada: e.target.value })} /></div>
              <div><Label>Quantidade</Label><Input inputMode="numeric" value={f.quantidade} onChange={(e) => setF({ ...f, quantidade: e.target.value })} /></div>
              <div><Label>Raça</Label><Input value={f.raca} onChange={(e) => setF({ ...f, raca: e.target.value })} placeholder="Nelore, Angus…" /></div>
              <div>
                <Label>Categoria</Label>
                <Select value={f.categoria} onValueChange={(v) => setF({ ...f, categoria: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bezerro">Bezerro</SelectItem>
                    <SelectItem value="garrote">Garrote</SelectItem>
                    <SelectItem value="novilho">Novilho</SelectItem>
                    <SelectItem value="boi">Boi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sistema</Label>
                <Select value={f.sistema} onValueChange={(v) => setF({ ...f, sistema: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pasto">Pasto</SelectItem>
                    <SelectItem value="semi">Semi-confinamento</SelectItem>
                    <SelectItem value="confinamento">Confinamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Peso médio entrada (kg)</Label><Input inputMode="decimal" value={f.peso_medio_inicial_kg} onChange={(e) => setF({ ...f, peso_medio_inicial_kg: e.target.value })} /></div>
              <div><Label>Valor de compra (R$)</Label><Input inputMode="decimal" value={f.valor_compra} onChange={(e) => setF({ ...f, valor_compra: e.target.value })} /></div>
              <div><Label>Meta GMD (kg/dia)</Label><Input inputMode="decimal" value={f.meta_gmd} onChange={(e) => setF({ ...f, meta_gmd: e.target.value })} /></div>
              <div><Label>Preço da arroba (R$)</Label><Input inputMode="decimal" value={f.preco_arroba_venda} onChange={(e) => setF({ ...f, preco_arroba_venda: e.target.value })} /></div>
              <div><Label>Origem</Label><Input value={f.origem} onChange={(e) => setF({ ...f, origem: e.target.value })} /></div>
              <div><Label>Pasto / piquete</Label><Input value={f.local} onChange={(e) => setF({ ...f, local: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={salvar}>Criar lote</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {lotes.items.map((l: Lote) => {
          const r = resumo(l);
          const meta = Number(l.meta_gmd ?? 0);
          return (
            <div key={l.id} className="rounded-xl border border-border/60 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">Lote {l.numero}</div>
                  <div className="text-xs text-muted-foreground">{l.quantidade} cab · {l.raca ?? "—"} · {l.sistema ?? "—"} · {r.dias} dias</div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={l.encerrado ? "secondary" : meta && r.gmd >= meta ? "default" : "destructive"}>
                    GMD {fmt(r.gmd, 2)} kg
                  </Badge>
                  <Button size="icon" variant="ghost" onClick={() => lotes.remove(l.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <Mini t="Peso atual" v={`${fmt(r.pesoAtual, 0)} kg`} />
                <Mini t="Arrobas/cab" v={fmt(r.arrobas, 1)} />
                <Mini t="Receita/cab" v={brl(r.receita)} />
                <Mini t="Lucro/cab" v={brl(r.lucro)} />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{r.pesagens} pesagem(ns)</span>
                <Button size="sm" variant="ghost" onClick={() => lotes.update(l.id, { encerrado: !l.encerrado })}>
                  {l.encerrado ? "Reabrir" : "Encerrar lote"}
                </Button>
              </div>
            </div>
          );
        })}
        {lotes.items.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center md:col-span-2">Nenhum lote de engorda cadastrado.</p>}
      </div>
    </Card>
  );
}

function Mini({ t, v }: { t: string; v: string }) {
  return (
    <div className="rounded-lg bg-muted/60 p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{t}</div>
      <div className="text-sm font-semibold">{v}</div>
    </div>
  );
}

function Pesagens({ pesagens, lotes, operador }: any) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ lote_id: "", data: hoje(), quantidade: "", peso_total_kg: "", peso_medio_kg: "", observacoes: "" });

  const salvar = async () => {
    if (!f.lote_id) return toast.error("Escolha o lote");
    const qtd = Number(f.quantidade) || 0;
    const total = Number(f.peso_total_kg) || 0;
    const medio = Number(f.peso_medio_kg) || (qtd > 0 ? total / qtd : 0);
    if (!medio) return toast.error("Informe o peso total ou o peso médio");
    await pesagens.add({
      lote_id: f.lote_id, data: f.data, quantidade: qtd || null,
      peso_total_kg: total || (qtd ? medio * qtd : null), peso_medio_kg: medio,
      observacoes: f.observacoes || null, autor: operador ?? null,
    });
    toast.success("Pesagem registrada");
    setOpen(false);
  };

  const numero = (id: string | null) => lotes.find((l: Lote) => l.id === id)?.numero ?? "—";

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Pesagens</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova pesagem</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar pesagem</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Lote</Label>
                <Select value={f.lote_id} onValueChange={(v) => setF({ ...f, lote_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{lotes.map((l: Lote) => <SelectItem key={l.id} value={l.id}>Lote {l.numero}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data</Label><Input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></div>
                <div><Label>Cabeças pesadas</Label><Input inputMode="numeric" value={f.quantidade} onChange={(e) => setF({ ...f, quantidade: e.target.value })} /></div>
                <div><Label>Peso total (kg)</Label><Input inputMode="decimal" value={f.peso_total_kg} onChange={(e) => setF({ ...f, peso_total_kg: e.target.value })} /></div>
                <div><Label>Peso médio (kg)</Label><Input inputMode="decimal" value={f.peso_medio_kg} onChange={(e) => setF({ ...f, peso_medio_kg: e.target.value })} /></div>
              </div>
              <div><Label>Observações</Label><Input value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={salvar}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Lote</TableHead><TableHead className="text-right">Cabeças</TableHead><TableHead className="text-right">Peso total</TableHead><TableHead className="text-right">Peso médio</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {pesagens.items.map((p: Pesagem) => (
              <TableRow key={p.id}>
                <TableCell>{fmtData(p.data + "T12:00")}</TableCell>
                <TableCell className="font-medium">{numero(p.lote_id)}</TableCell>
                <TableCell className="text-right">{p.quantidade ?? "—"}</TableCell>
                <TableCell className="text-right">{p.peso_total_kg ? `${fmt(Number(p.peso_total_kg), 0)} kg` : "—"}</TableCell>
                <TableCell className="text-right font-semibold">{fmt(Number(p.peso_medio_kg ?? 0), 1)} kg</TableCell>
                <TableCell className="text-right"><Button size="icon" variant="ghost" onClick={() => pesagens.remove(p.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
            {pesagens.items.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma pesagem registrada.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
