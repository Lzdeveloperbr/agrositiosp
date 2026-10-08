import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useFinanceiro } from "@/lib/state";
import { uid } from "@/lib/storage";
import { Wallet, Plus, Trash2, TrendingUp, TrendingDown, Banknote } from "lucide-react";
import { toast } from "sonner";
import { fmtData, hojeISO } from "@/lib/data";

export const Route = createFileRoute("/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — Aviário Pro" },
      { name: "description", content: "Receitas, despesas, contas a vencer e livro caixa do avicultor." },
      { property: "og:title", content: "Financeiro — Aviário Pro" },
      { property: "og:description", content: "Receitas, despesas, contas a vencer e livro caixa do avicultor." },
    ],
  }),
  component: FinanceiroPage,
});

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function FinanceiroPage() {
  const [lancamentos, setLan] = useFinanceiro();
  const [open, setOpen] = useState(false);
  const [filtro, setFiltro] = useState<"todos" | "receita" | "despesa">("todos");
  const [mes, setMes] = useState(hojeISO().slice(0, 7));

  const [form, setForm] = useState({
    data: hojeISO(),
    tipo: "despesa" as "receita" | "despesa",
    categoria: "",
    descricao: "",
    valor: 0,
    modulo: "geral" as any,
    vencimento: "",
    status: "pago" as "pago" | "pendente" | "atrasado",
  });

  const criar = () => {
    if (!form.descricao || !form.valor) { toast.error("Descrição e valor são obrigatórios"); return; }
    setLan((p) => [{ id: uid(), ...form, vencimento: form.vencimento || undefined }, ...p]);
    setOpen(false);
    setForm({ ...form, descricao: "", valor: 0, categoria: "", vencimento: "" });
    toast.success("Lançamento registrado");
  };

  const togglePago = (id: string) => setLan((p) => p.map((l) => l.id === id ? { ...l, status: l.status === "pago" ? "pendente" : "pago", dataPagamento: l.status === "pago" ? undefined : hojeISO() } : l));

  const remover = (id: string) => setLan((p) => p.filter((l) => l.id !== id));

  const visiveis = useMemo(() => lancamentos
    .filter((l) => (filtro === "todos" || l.tipo === filtro) && l.data.startsWith(mes))
    .sort((a, b) => b.data.localeCompare(a.data)), [lancamentos, filtro, mes]);

  const receitas = visiveis.filter((l) => l.tipo === "receita").reduce((s, l) => s + l.valor, 0);
  const despesas = visiveis.filter((l) => l.tipo === "despesa").reduce((s, l) => s + l.valor, 0);
  const saldo = receitas - despesas;

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold flex items-center gap-2"><Wallet className="h-8 w-8 text-primary" /> Financeiro</h1>
            <p className="text-muted-foreground mt-1">Receitas e despesas da granja com fluxo mensal.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Novo lançamento</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo lançamento</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tipo">
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="receita">Receita</SelectItem><SelectItem value="despesa">Despesa</SelectItem></SelectContent>
                  </Select>
                </Field>
                <Field label="Data"><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></Field>
                <div className="col-span-2"><Field label="Descrição *"><Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></Field></div>
                <Field label="Categoria"><Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Ex: Ração, Energia..." /></Field>
                <Field label="Módulo">
                  <Select value={form.modulo} onValueChange={(v) => setForm({ ...form, modulo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="geral">Geral</SelectItem>
                      <SelectItem value="granja">Granja</SelectItem>
                      <SelectItem value="energia">Energia</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Vencimento (opcional)"><Input type="date" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} /></Field>
                <Field label="Status">
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="atrasado">Atrasado</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <div className="col-span-2"><Field label="Valor (R$) *"><Input type="number" step="0.01" value={form.valor || ""} onChange={(e) => setForm({ ...form, valor: +e.target.value })} /></Field></div>
              </div>
              <DialogFooter><Button onClick={criar}>Lançar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <div className="flex flex-wrap gap-2 items-center">
          <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-44" />
          <div className="flex gap-1">
            <Button size="sm" variant={filtro === "todos" ? "default" : "outline"} onClick={() => setFiltro("todos")}>Todos</Button>
            <Button size="sm" variant={filtro === "receita" ? "default" : "outline"} onClick={() => setFiltro("receita")}>Receitas</Button>
            <Button size="sm" variant={filtro === "despesa" ? "default" : "outline"} onClick={() => setFiltro("despesa")}>Despesas</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-4" style={{ background: "var(--gradient-surface)" }}>
            <div className="flex items-center gap-2 text-primary mb-1"><TrendingUp className="h-4 w-4" /><p className="text-xs uppercase tracking-wider text-muted-foreground">Receitas</p></div>
            <p className="font-display font-bold text-2xl">{fmt(receitas)}</p>
          </Card>
          <Card className="p-4" style={{ background: "var(--gradient-surface)" }}>
            <div className="flex items-center gap-2 text-destructive mb-1"><TrendingDown className="h-4 w-4" /><p className="text-xs uppercase tracking-wider text-muted-foreground">Despesas</p></div>
            <p className="font-display font-bold text-2xl">{fmt(despesas)}</p>
          </Card>
          <Card className="p-4" style={{ background: "var(--gradient-surface)" }}>
            <div className="flex items-center gap-2 mb-1"><Banknote className={`h-4 w-4 ${saldo >= 0 ? "text-primary" : "text-destructive"}`} /><p className="text-xs uppercase tracking-wider text-muted-foreground">Saldo</p></div>
            <p className={`font-display font-bold text-2xl ${saldo >= 0 ? "text-primary" : "text-destructive"}`}>{fmt(saldo)}</p>
          </Card>
        </div>

        <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
          {visiveis.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sem lançamentos no período.</p>
          ) : (
            <div className="space-y-2">
              {visiveis.map((l) => (
                <div key={l.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card/40">
                  <div className={`h-9 w-9 rounded-md flex items-center justify-center ${l.tipo === "receita" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>
                    {l.tipo === "receita" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{l.descricao}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      <span className="text-[11px] text-muted-foreground">{fmtData(l.data)}</span>
                      {l.categoria && <Badge variant="outline" className="text-[10px]">{l.categoria}</Badge>}
                      {l.modulo && <Badge variant="secondary" className="text-[10px] capitalize">{l.modulo}</Badge>}
                      {l.vencimento && <Badge variant="outline" className="text-[10px]">venc. {fmtData(l.vencimento)}</Badge>}
                      <Badge variant={l.status === "pago" ? "default" : l.status === "atrasado" ? "destructive" : "secondary"} className="text-[10px] cursor-pointer" onClick={() => togglePago(l.id)}>{l.status}</Badge>
                    </div>
                  </div>
                  <p className={`font-display font-bold tabular-nums ${l.tipo === "receita" ? "text-primary" : "text-destructive"}`}>{l.tipo === "receita" ? "+" : "-"}{fmt(l.valor)}</p>
                  <Button size="icon" variant="ghost" onClick={() => remover(l.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
