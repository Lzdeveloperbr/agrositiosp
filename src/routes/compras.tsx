import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useCompras, useEstoque, useFinanceiro } from "@/lib/state";
import { uid } from "@/lib/storage";
import { ShoppingCart, Plus, Trash2, Check, Package } from "lucide-react";
import { toast } from "sonner";
import type { CompraItem } from "@/lib/types";
import { fmtData, hojeISO } from "@/lib/data";

export const Route = createFileRoute("/compras")({
  head: () => ({
    meta: [
      { title: "Compras — AgroSítio" },
      { name: "description", content: "Pedidos de compra, fornecedores e controle de recebimento de insumos." },
      { property: "og:title", content: "Compras — AgroSítio" },
      { property: "og:description", content: "Pedidos de compra, fornecedores e controle de recebimento de insumos." },
    ],
  }),
  component: ComprasPage,
});

const STATUS = [
  { v: "solicitado", l: "Solicitado", c: "secondary" },
  { v: "aprovado", l: "Aprovado", c: "default" },
  { v: "pedido", l: "Pedido feito", c: "default" },
  { v: "recebido", l: "Recebido", c: "default" },
  { v: "cancelado", l: "Cancelado", c: "destructive" },
] as const;

function ComprasPage() {
  const [compras, setCompras] = useCompras();
  const [estoque, setEstoque] = useEstoque();
  const [, setFin] = useFinanceiro();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ data: hojeISO(), fornecedor: "", solicitante: "", observacoes: "" });
  const [itens, setItens] = useState<CompraItem[]>([]);
  const [novoItem, setNovoItem] = useState({ nome: "", quantidade: 0, unidade: "un", precoUnit: 0 });

  const total = itens.reduce((s, i) => s + i.quantidade * (i.precoUnit || 0), 0);

  const addItem = () => {
    if (!novoItem.nome || !novoItem.quantidade) { toast.error("Nome e quantidade"); return; }
    setItens((p) => [...p, { id: uid(), ...novoItem }]);
    setNovoItem({ nome: "", quantidade: 0, unidade: "un", precoUnit: 0 });
  };

  const salvar = () => {
    if (itens.length === 0) { toast.error("Adicione pelo menos 1 item"); return; }
    setCompras((p) => [{ id: uid(), ...form, status: "solicitado", itens, total }, ...p]);
    setOpen(false); setForm({ data: hojeISO(), fornecedor: "", solicitante: "", observacoes: "" }); setItens([]);
    toast.success("Solicitação criada");
  };

  const mudarStatus = (id: string, status: any) => {
    setCompras((p) => p.map((c) => {
      if (c.id !== id) return c;
      const updates: any = { status };
      if (status === "pedido") updates.dataPedido = hojeISO();
      if (status === "recebido") updates.dataRecebimento = hojeISO();
      return { ...c, ...updates };
    }));

    if (status === "recebido") {
      const c = compras.find((x) => x.id === id);
      if (!c) return;
      // Adicionar ao estoque
      setEstoque((est) => {
        let updated = [...est];
        c.itens.forEach((it) => {
          const existente = updated.find((e) => e.nome.toLowerCase() === it.nome.toLowerCase());
          if (existente) {
            updated = updated.map((e) => e.id === existente.id ? { ...e, quantidade: e.quantidade + it.quantidade, movimentacoes: [{ id: uid(), data: hojeISO(), tipo: "entrada" as const, quantidade: it.quantidade, nota: `Compra ${c.fornecedor || ""}` }, ...e.movimentacoes] } : e);
          } else {
            updated = [{ id: uid(), nome: it.nome, categoria: "insumo" as const, unidade: it.unidade, quantidade: it.quantidade, movimentacoes: [{ id: uid(), data: hojeISO(), tipo: "entrada" as const, quantidade: it.quantidade, nota: `Compra ${c.fornecedor || ""}` }] }, ...updated];
          }
        });
        return updated;
      });
      // Lançamento financeiro
      if (c.total > 0) {
        setFin((p) => [{ id: uid(), data: hojeISO(), tipo: "despesa", categoria: "Compras", descricao: `Compra ${c.fornecedor || ""}`, valor: c.total, modulo: "geral", status: "pago" }, ...p]);
      }
      toast.success("Estoque e financeiro atualizados");
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold flex items-center gap-2"><ShoppingCart className="h-8 w-8 text-primary" /> Compras</h1>
            <p className="text-muted-foreground mt-1">Solicitação → aprovação → pedido → recebimento (entra no estoque).</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Nova solicitação</Button></DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nova solicitação de compra</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <F label="Data"><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></F>
                <F label="Solicitante"><Input value={form.solicitante} onChange={(e) => setForm({ ...form, solicitante: e.target.value })} /></F>
                <div className="col-span-2"><F label="Fornecedor"><Input value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} /></F></div>
                <div className="col-span-2"><F label="Observações"><Input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></F></div>
              </div>
              <div className="border-t pt-3 mt-2">
                <p className="font-semibold mb-2 text-sm">Itens</p>
                <div className="grid grid-cols-12 gap-2">
                  <Input className="col-span-5" placeholder="Item" value={novoItem.nome} onChange={(e) => setNovoItem({ ...novoItem, nome: e.target.value })} />
                  <Input className="col-span-2" type="number" placeholder="Qtd" value={novoItem.quantidade || ""} onChange={(e) => setNovoItem({ ...novoItem, quantidade: +e.target.value })} />
                  <Input className="col-span-2" placeholder="Un" value={novoItem.unidade} onChange={(e) => setNovoItem({ ...novoItem, unidade: e.target.value })} />
                  <Input className="col-span-2" type="number" step="0.01" placeholder="R$" value={novoItem.precoUnit || ""} onChange={(e) => setNovoItem({ ...novoItem, precoUnit: +e.target.value })} />
                  <Button className="col-span-1" size="icon" onClick={addItem}><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="mt-2 space-y-1">
                  {itens.map((i) => (
                    <div key={i.id} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/30">
                      <span className="flex-1">{i.nome}</span>
                      <span className="tabular-nums">{i.quantidade} {i.unidade}</span>
                      {i.precoUnit ? <span className="tabular-nums w-20 text-right">R$ {(i.quantidade * i.precoUnit).toFixed(2)}</span> : null}
                      <Button size="icon" variant="ghost" onClick={() => setItens((p) => p.filter((x) => x.id !== i.id))}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </div>
                <p className="text-right mt-2 font-bold">Total: R$ {total.toFixed(2)}</p>
              </div>
              <DialogFooter><Button onClick={salvar}>Criar solicitação</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        {compras.length === 0 ? (
          <Card className="p-12 text-center border-dashed"><ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-3" /><p>Nenhuma compra registrada.</p></Card>
        ) : (
          <div className="space-y-3">
            {compras.map((c) => {
              const st = STATUS.find((s) => s.v === c.status)!;
              return (
                <Card key={c.id} className="p-4" style={{ background: "var(--gradient-surface)" }}>
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-display font-bold flex items-center gap-2"><Package className="h-4 w-4" /> {c.fornecedor || "Sem fornecedor"}</h3>
                      <p className="text-xs text-muted-foreground">{fmtData(c.data)}{c.solicitante && ` · solicitou: ${c.solicitante}`}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={st.c as any}>{st.l}</Badge>
                      <p className="font-bold tabular-nums">R$ {c.total.toFixed(2)}</p>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover?")) setCompras((p) => p.filter((x) => x.id !== c.id)); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="space-y-1 mb-3">
                    {c.itens.map((i) => (
                      <div key={i.id} className="flex text-sm gap-2">
                        <span className="flex-1">{i.nome}</span>
                        <span className="tabular-nums text-muted-foreground">{i.quantidade} {i.unidade}</span>
                        {i.precoUnit ? <span className="tabular-nums w-20 text-right">R$ {(i.quantidade * i.precoUnit).toFixed(2)}</span> : null}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Select value={c.status} onValueChange={(v) => mudarStatus(c.id, v)}>
                      <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUS.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
                    </Select>
                    {c.status !== "recebido" && c.status !== "cancelado" && (
                      <Button size="sm" variant="outline" onClick={() => mudarStatus(c.id, "recebido")}><Check className="h-3.5 w-3.5 mr-1" /> Marcar recebido</Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
        <p className="text-xs text-muted-foreground">Itens em estoque atual: {estoque.length}</p>
      </div>
    </AppShell>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
