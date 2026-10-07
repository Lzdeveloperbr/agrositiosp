import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useEstoque, useLotes } from "@/lib/state";
import { uid } from "@/lib/storage";
import { Boxes, Plus, Trash2, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, Bird, Archive } from "lucide-react";
import { toast } from "sonner";
import { LiveRacaoBanner } from "@/components/LiveRacaoBanner";
import { fmtData, hojeISO } from "@/lib/data";

export const Route = createFileRoute("/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque — Aviário Pro" },
      { name: "description", content: "Controle de ração, vacinas, medicamentos e insumos com alerta de mínimo." },
      { property: "og:title", content: "Estoque — Aviário Pro" },
      { property: "og:description", content: "Controle de ração, vacinas, medicamentos e insumos com alerta de mínimo." },
    ],
  }),
  component: EstoquePage,
});

const CATS = [
  { v: "racao", l: "Ração" },
  { v: "vacina", l: "Vacina" },
  { v: "sal", l: "Sal mineral" },
  { v: "remedio", l: "Remédio" },
  { v: "insumo", l: "Insumo" },
  { v: "outro", l: "Outro" },
];

function EstoquePage() {
  const [itens, setItens] = useEstoque();
  const [lotes] = useLotes();
  const [open, setOpen] = useState(false);
  const [movItem, setMovItem] = useState<string | null>(null);
  const [movTipo, setMovTipo] = useState<"entrada" | "saida">("entrada");
  const [movQtd, setMovQtd] = useState(0);
  const [movNota, setMovNota] = useState("");

  // Lote ativo (mais recente não encerrado) — a ração é sempre por lote
  const loteAtivo = useMemo(() => {
    const ativos = lotes.filter((l) => !l.encerrado);
    return [...ativos].sort((a, b) => b.dataEntrada.localeCompare(a.dataEntrada))[0] || null;
  }, [lotes]);

  // Itens visíveis: ração apenas do lote ativo; demais categorias sempre
  const visiveis = useMemo(
    () => itens.filter((i) => i.categoria !== "racao" || (loteAtivo ? i.loteId === loteAtivo.id : !i.loteId)),
    [itens, loteAtivo]
  );
  const racaoOutrosLotes = useMemo(
    () => itens.filter((i) => i.categoria === "racao" && !visiveis.includes(i)),
    [itens, visiveis]
  );

  const [form, setForm] = useState({ nome: "", categoria: "racao" as any, unidade: "kg", quantidade: 0, minimo: undefined as number | undefined });

  const criar = () => {
    if (!form.nome) { toast.error("Nome obrigatório"); return; }
    if (form.categoria === "racao" && !loteAtivo) { toast.error("Cadastre um lote ativo na Granja antes de lançar ração"); return; }
    const loteId = form.categoria === "racao" ? loteAtivo?.id : undefined;
    setItens((p) => [{ id: uid(), ...form, loteId, movimentacoes: [] }, ...p]);
    setOpen(false);
    setForm({ nome: "", categoria: "racao", unidade: "kg", quantidade: 0, minimo: undefined });
    toast.success("Item adicionado");
  };

  const remover = (id: string) => { if (confirm("Remover item?")) setItens((p) => p.filter((i) => i.id !== id)); };

  const movimentar = () => {
    if (!movItem || !movQtd) { toast.error("Informe a quantidade"); return; }
    setItens((p) => p.map((i) => {
      if (i.id !== movItem) return i;
      const delta = movTipo === "entrada" ? movQtd : -movQtd;
      return {
        ...i,
        quantidade: i.quantidade + delta,
        movimentacoes: [{ id: uid(), data: hojeISO(), tipo: movTipo, quantidade: movQtd, nota: movNota }, ...i.movimentacoes],
      };
    }));
    setMovItem(null); setMovQtd(0); setMovNota("");
    toast.success("Movimentação registrada");
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold flex items-center gap-2"><Boxes className="h-8 w-8 text-primary" /> Estoque</h1>
            <p className="text-muted-foreground mt-1">Ração, vacinas, sal, remédios e insumos com alerta de mínimo.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Novo item</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo item de estoque</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Field label="Nome *"><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Ração inicial" /></Field></div>
                <Field label="Categoria">
                  <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATS.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Unidade"><Input value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} placeholder="kg, L, un" /></Field>
                <Field label="Qtd. inicial"><Input type="number" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: +e.target.value })} /></Field>
                <Field label="Mínimo (alerta)"><Input type="number" value={form.minimo ?? ""} onChange={(e) => setForm({ ...form, minimo: e.target.value ? +e.target.value : undefined })} /></Field>
              </div>
              <DialogFooter><Button onClick={criar}>Adicionar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <Card className="p-3 flex flex-wrap items-center gap-2 text-sm">
          <Bird className="h-4 w-4 text-primary" />
          {loteAtivo ? (
            <>
              <span className="font-semibold">Ração do Lote {loteAtivo.numero}</span>
              <Badge variant="outline" className="text-[10px]">entrada {fmtData(loteAtivo.dataEntrada + "T00:00:00")}</Badge>
              <span className="text-xs text-muted-foreground">O estoque de ração é exclusivo deste lote — ao iniciar um novo lote ele começa zerado.</span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Nenhum lote ativo — cadastre um lote na Granja para controlar a ração.</span>
          )}
        </Card>

        <LiveRacaoBanner itens={visiveis} />

        {visiveis.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <Boxes className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">Sem itens</p>
            <p className="text-sm text-muted-foreground mb-4">Cadastre os insumos do sítio.</p>
            <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Cadastrar</Button>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visiveis.map((i) => {
              const baixo = i.minimo !== undefined && i.quantidade <= i.minimo;
              return (
                <Card key={i.id} className={`p-4 ${baixo ? "border-destructive/40" : ""}`} style={{ background: "var(--gradient-surface)" }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-display font-bold">{i.nome}</h3>
                      <Badge variant="outline" className="text-[10px] mt-1 capitalize">{CATS.find((c) => c.v === i.categoria)?.l}</Badge>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => remover(i.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <div className="my-3">
                    <p className="font-display font-bold text-2xl tabular-nums">{i.quantidade.toLocaleString("pt-BR")} <span className="text-sm text-muted-foreground font-normal">{i.unidade}</span></p>
                    {i.minimo !== undefined && <p className="text-xs text-muted-foreground">mínimo: {i.minimo}</p>}
                    {baixo && <Badge variant="destructive" className="mt-1 text-[10px] flex gap-1 items-center w-fit"><AlertTriangle className="h-3 w-3" /> Estoque baixo</Badge>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { setMovItem(i.id); setMovTipo("entrada"); }}><ArrowDownToLine className="h-3.5 w-3.5 mr-1" /> Entrada</Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { setMovItem(i.id); setMovTipo("saida"); }}><ArrowUpFromLine className="h-3.5 w-3.5 mr-1" /> Saída</Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {racaoOutrosLotes.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Archive className="h-3.5 w-3.5" /> Ração de lotes anteriores (histórico)
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {racaoOutrosLotes.map((i) => {
                const lote = lotes.find((l) => l.id === i.loteId);
                return (
                  <Card key={i.id} className="p-4 opacity-70">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-sm">{i.nome}</h3>
                        <p className="text-[11px] text-muted-foreground">{lote ? `Lote ${lote.numero}` : "sem lote"}</p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => remover(i.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <p className="font-display font-bold text-xl tabular-nums mt-2">{i.quantidade.toLocaleString("pt-BR")} <span className="text-xs text-muted-foreground font-normal">{i.unidade}</span></p>
                    {loteAtivo && (
                      <Button size="sm" variant="outline" className="w-full mt-2"
                        onClick={() => setItens((p) => p.map((x) => x.id === i.id ? { ...x, loteId: loteAtivo.id } : x))}>
                        Transferir para o Lote {loteAtivo.numero}
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <Dialog open={!!movItem} onOpenChange={(o) => !o && setMovItem(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{movTipo === "entrada" ? "Entrada" : "Saída"} de estoque</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Field label="Quantidade"><Input type="number" value={movQtd || ""} onChange={(e) => setMovQtd(+e.target.value)} autoFocus /></Field>
              <Field label="Observação"><Input value={movNota} onChange={(e) => setMovNota(e.target.value)} placeholder="Compra fornecedor X..." /></Field>
            </div>
            <DialogFooter><Button onClick={movimentar}>Confirmar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
