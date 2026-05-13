import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useLotes } from "@/lib/state";
import { uid } from "@/lib/storage";
import { Bird, Plus, FileText, Trash2, ArrowRight } from "lucide-react";
import { gerarRelatorioLote } from "@/lib/pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/granja/")({
  head: () => ({
    meta: [
      { title: "Granja de Frango — AgroSítio" },
      { name: "description", content: "Gestão de lotes de frango de corte: mortalidade, ração, água, peso e CA." },
      { property: "og:title", content: "Granja de Frango — AgroSítio" },
      { property: "og:description", content: "Gestão de lotes de frango de corte: mortalidade, ração, água, peso e CA." },
    ],
  }),
  component: GranjaPage,
});

function GranjaPage() {
  const [lotes, setLotes] = useLotes();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    numero: "",
    dataEntrada: new Date().toISOString().slice(0, 10),
    quantidadeInicial: 28000,
    integradora: "Bello Alimentos",
    previsaoAbateDias: 42,
    percentualLucro: 10,
  });

  const criar = () => {
    if (!form.numero) { toast.error("Informe o número do lote"); return; }
    setLotes((prev) => [
      { id: uid(), ...form, entries: [] },
      ...prev,
    ]);
    setOpen(false);
    setForm({ ...form, numero: "" });
    toast.success("Lote criado");
  };

  const remover = (id: string) => {
    if (!confirm("Remover este lote?")) return;
    setLotes((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold">Granja</h1>
            <p className="text-muted-foreground mt-1">Lotes de frango de corte · Bello Alimentos</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Novo lote</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Cadastrar novo lote</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Número do lote"><Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} placeholder="Ex: 045" /></Field>
                <Field label="Data de entrada"><Input type="date" value={form.dataEntrada} onChange={(e) => setForm({ ...form, dataEntrada: e.target.value })} /></Field>
                <Field label="Qtd. inicial (aves)"><Input type="number" value={form.quantidadeInicial} onChange={(e) => setForm({ ...form, quantidadeInicial: +e.target.value })} /></Field>
                <Field label="Integradora"><Input value={form.integradora} onChange={(e) => setForm({ ...form, integradora: e.target.value })} /></Field>
                <Field label="Previsão abate (dias)"><Input type="number" value={form.previsaoAbateDias} onChange={(e) => setForm({ ...form, previsaoAbateDias: +e.target.value })} /></Field>
                <Field label="% lucro granjeiro"><Input type="number" value={form.percentualLucro} onChange={(e) => setForm({ ...form, percentualLucro: +e.target.value })} /></Field>
              </div>
              <DialogFooter><Button onClick={criar}>Criar lote</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        {lotes.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <Bird className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">Nenhum lote cadastrado</p>
            <p className="text-sm text-muted-foreground mb-4">Comece criando o primeiro lote da sua granja.</p>
            <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Criar primeiro lote</Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {lotes.map((l) => {
              const mort = l.entries.reduce((s, e) => s + e.mortalidade, 0);
              const vivas = l.quantidadeInicial - mort;
              const ultPeso = [...l.entries].reverse().find((e) => e.pesoMedioG)?.pesoMedioG ?? 0;
              const dias = Math.floor((Date.now() - new Date(l.dataEntrada).getTime()) / 86400000);
              const progresso = Math.min(100, (dias / l.previsaoAbateDias) * 100);
              return (
                <Card key={l.id} className="p-5" style={{ background: "var(--gradient-surface)", boxShadow: "var(--shadow-card)" }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-xl font-bold">Lote {l.numero}</h3>
                        {l.encerrado ? <Badge variant="secondary">Encerrado</Badge> : <Badge>Ativo</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Entrada: {new Date(l.dataEntrada).toLocaleDateString("pt-BR")} · {dias}d</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => remover(l.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <Mini label="Vivas" value={vivas.toLocaleString("pt-BR")} />
                    <Mini label="Mort." value={`${((mort / l.quantidadeInicial) * 100).toFixed(1)}%`} />
                    <Mini label="Peso" value={ultPeso ? `${ultPeso}g` : "—"} />
                  </div>
                  <div className="space-y-1 mb-4">
                    <div className="flex justify-between text-xs text-muted-foreground"><span>Crescimento</span><span>{dias}/{l.previsaoAbateDias} dias</span></div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full" style={{ width: `${progresso}%`, background: "var(--gradient-primary)" }} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" className="flex-1"><Link to="/granja/$id" params={{ id: l.id }}>Abrir <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
                    <Button size="sm" variant="outline" onClick={() => gerarRelatorioLote(l)}><FileText className="h-4 w-4" /></Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded-md p-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display font-bold text-lg tabular-nums">{value}</p>
    </div>
  );
}
