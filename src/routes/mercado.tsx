import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCloudCollection } from "@/lib/cloud/useCloudCollection";
import { TrendingUp, TrendingDown, Plus, Trash2, BarChart3, MapPin } from "lucide-react";

export const Route = createFileRoute("/mercado")({
  head: () => ({
    meta: [
      { title: "Mercado Agro — AgroSítio" },
      { name: "description", content: "Cotações regionais, dólar ao vivo e notícias do agro." },
    ],
  }),
  component: MercadoPage,
});

type Cotacao = {
  id: string;
  produto: string;
  praca: string | null;
  unidade: string;
  valor: number;
  variacao_pct: number | null;
  fonte: string | null;
  data: string;
  observacao: string | null;
  created_at?: string;
};

const PRODUTOS = ["Boi Gordo", "Bezerro", "Vaca Gorda", "Milho", "Soja", "Café", "Açúcar", "Algodão", "Frango Vivo", "Suíno", "Leite", "Trigo", "Sorgo"];
const UNIDADES = ["@", "sc 60kg", "kg", "L", "ton"];

function MercadoPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Inteligência de mercado</p>
            <h1 className="text-2xl md:text-3xl font-display font-bold mt-1">Mercado Agro</h1>
            <p className="text-sm text-muted-foreground">Cotações, dólar e notícias do agronegócio.</p>
          </div>
        </header>

        <CotacoesTab />
      </div>
    </AppShell>
  );
}

function CotacoesTab() {
  const { items, loading, add, remove } = useCloudCollection<Cotacao>("cotacoes", { col: "data", asc: false });
  const [form, setForm] = useState({ produto: "Boi Gordo", praca: "", unidade: "@", valor: "", variacao_pct: "", fonte: "", observacao: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.valor) return;
    await add({
      produto: form.produto,
      praca: form.praca || null,
      unidade: form.unidade,
      valor: Number(form.valor),
      variacao_pct: form.variacao_pct ? Number(form.variacao_pct) : null,
      fonte: form.fonte || null,
      observacao: form.observacao || null,
      data: new Date().toISOString().slice(0, 10),
    } as Partial<Cotacao>);
    setForm({ ...form, valor: "", variacao_pct: "", observacao: "" });
  };

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-4">
      <div className="space-y-3">
        {loading ? (
          <div className="grid sm:grid-cols-2 gap-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}</div>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhuma cotação cadastrada ainda.</p>
            <p className="text-xs mt-1">Adicione a primeira no formulário ao lado.</p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {items.map((c) => <CotacaoCard key={c.id} cot={c} onRemove={() => remove(c.id)} />)}
          </div>
        )}
      </div>

      <Card className="p-4 h-fit lg:sticky lg:top-4" style={{ background: "var(--gradient-surface)" }}>
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> Nova cotação</h3>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Produto</Label>
            <Select value={form.produto} onValueChange={(v) => setForm({ ...form, produto: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PRODUTOS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Valor (R$)</Label>
              <Input type="number" step="0.01" required value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="320,50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Unidade</Label>
              <Select value={form.unidade} onValueChange={(v) => setForm({ ...form, unidade: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Variação (%)</Label>
            <Input type="number" step="0.01" value={form.variacao_pct} onChange={(e) => setForm({ ...form, variacao_pct: e.target.value })} placeholder="+1,5 ou -0,8" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Praça</Label>
            <Input value={form.praca} onChange={(e) => setForm({ ...form, praca: e.target.value })} placeholder="Ex.: S. J. do Rio Preto/SP" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Fonte (opcional)</Label>
            <Input value={form.fonte} onChange={(e) => setForm({ ...form, fonte: e.target.value })} placeholder="Cepea, Scot, frigorífico…" />
          </div>
          <Button type="submit" className="w-full">Salvar cotação</Button>
        </form>
      </Card>
    </div>
  );
}

function CotacaoCard({ cot, onRemove }: { cot: Cotacao; onRemove: () => void }) {
  const up = (cot.variacao_pct ?? 0) >= 0;
  return (
    <Card className="p-4 relative overflow-hidden border-border/60" style={{ background: "var(--gradient-surface)", boxShadow: "var(--shadow-soft)" }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{cot.produto}</p>
          {cot.praca && <p className="text-xs text-muted-foreground flex items-center gap-1 truncate"><MapPin className="h-3 w-3 shrink-0" /> {cot.praca}</p>}
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={onRemove}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
      <p className="text-2xl font-display font-bold tabular-nums">
        R$ {cot.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        <span className="text-xs text-muted-foreground font-normal ml-1">/{cot.unidade}</span>
      </p>
      <div className="flex items-center justify-between mt-2">
        {cot.variacao_pct !== null && cot.variacao_pct !== undefined ? (
          <Badge variant="secondary" className={up ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}>
            {up ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {up ? "+" : ""}{cot.variacao_pct.toFixed(2)}%
          </Badge>
        ) : <span />}
        <span className="text-[10px] text-muted-foreground">{new Date(cot.data).toLocaleDateString("pt-BR")}</span>
      </div>
      {cot.fonte && <p className="text-[10px] text-muted-foreground mt-1">Fonte: {cot.fonte}</p>}
    </Card>
  );
}

