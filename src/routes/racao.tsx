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
import { Textarea } from "@/components/ui/textarea";
import { useLocalStorage, uid } from "@/lib/storage";
import { Factory, Plus, Trash2, Calculator, Beaker } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/racao")({
  head: () => ({
    meta: [
      { title: "Fábrica de Ração — AgroSítio" },
      { name: "description", content: "Formulação, custo e produção de ração: milho, soja, ureia, farelo de algodão, núcleo." },
    ],
  }),
  component: RacaoPage,
});

type Ingrediente = {
  id: string;
  nome: string;
  unidade: "kg" | "saca";
  precoKg: number;
  estoqueKg: number;
  pb?: number; // % proteína bruta
  em?: number; // energia metabolizável kcal/kg (opcional)
  observacoes?: string;
};

type FormulaItem = { ingredienteId: string; percentual: number };
type Formula = {
  id: string;
  nome: string;
  destino: "frango_inicial" | "frango_crescimento" | "frango_engorda" | "gado_engorda" | "gado_leite" | "bezerro" | "outro";
  itens: FormulaItem[];
  observacoes?: string;
};

type Producao = {
  id: string;
  data: string;
  formulaId: string;
  totalKg: number;
  custoTotal: number;
  destino?: string;
  observacoes?: string;
};

const INGREDIENTES_PADRAO: Ingrediente[] = [
  { id: uid(), nome: "Milho moído", unidade: "kg", precoKg: 1.2, estoqueKg: 0, pb: 8.5, em: 3380 },
  { id: uid(), nome: "Farelo de soja", unidade: "kg", precoKg: 2.4, estoqueKg: 0, pb: 46, em: 2230 },
  { id: uid(), nome: "Farelo de algodão", unidade: "kg", precoKg: 1.9, estoqueKg: 0, pb: 38 },
  { id: uid(), nome: "Ureia pecuária", unidade: "kg", precoKg: 4.5, estoqueKg: 0, pb: 281 },
  { id: uid(), nome: "Núcleo mineral", unidade: "kg", precoKg: 6.0, estoqueKg: 0 },
  { id: uid(), nome: "Calcário", unidade: "kg", precoKg: 0.5, estoqueKg: 0 },
  { id: uid(), nome: "Sal comum", unidade: "kg", precoKg: 1.0, estoqueKg: 0 },
];

function RacaoPage() {
  const [ingredientes, setIngredientes] = useLocalStorage<Ingrediente[]>("agro:racao:ingredientes", INGREDIENTES_PADRAO);
  const [formulas, setFormulas] = useLocalStorage<Formula[]>("agro:racao:formulas", []);
  const [producoes, setProducoes] = useLocalStorage<Producao[]>("agro:racao:producoes", []);

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold flex items-center gap-2">
              <Factory className="h-7 w-7 text-primary" /> Fábrica de Ração
            </h1>
            <p className="text-muted-foreground mt-1">Ingredientes, fórmulas e custo por batida</p>
          </div>
        </header>

        <Tabs defaultValue="formulas">
          <TabsList className="grid grid-cols-3 w-full md:w-auto">
            <TabsTrigger value="formulas">Fórmulas</TabsTrigger>
            <TabsTrigger value="ingredientes">Ingredientes</TabsTrigger>
            <TabsTrigger value="producao">Produção</TabsTrigger>
          </TabsList>

          <TabsContent value="formulas" className="space-y-4 mt-4">
            <FormulasTab ingredientes={ingredientes} formulas={formulas} setFormulas={setFormulas} setProducoes={setProducoes} setIngredientes={setIngredientes} />
          </TabsContent>
          <TabsContent value="ingredientes" className="space-y-4 mt-4">
            <IngredientesTab ingredientes={ingredientes} setIngredientes={setIngredientes} />
          </TabsContent>
          <TabsContent value="producao" className="space-y-4 mt-4">
            <ProducaoTab producoes={producoes} setProducoes={setProducoes} formulas={formulas} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function calcularCustoKg(formula: Formula, ingredientes: Ingrediente[]) {
  let custo = 0;
  let pbTotal = 0;
  let percentTotal = 0;
  for (const it of formula.itens) {
    const ing = ingredientes.find((i) => i.id === it.ingredienteId);
    if (!ing) continue;
    custo += (it.percentual / 100) * ing.precoKg;
    pbTotal += (it.percentual / 100) * (ing.pb ?? 0);
    percentTotal += it.percentual;
  }
  return { custoKg: custo, pb: pbTotal, percentTotal };
}

function IngredientesTab({ ingredientes, setIngredientes }: { ingredientes: Ingrediente[]; setIngredientes: (v: Ingrediente[] | ((p: Ingrediente[]) => Ingrediente[])) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Ingrediente>>({ nome: "", unidade: "kg", precoKg: 0, estoqueKg: 0 });

  const adicionar = () => {
    if (!form.nome) { toast.error("Informe o nome"); return; }
    setIngredientes((prev) => [...prev, { id: uid(), nome: form.nome!, unidade: (form.unidade as any) || "kg", precoKg: Number(form.precoKg) || 0, estoqueKg: Number(form.estoqueKg) || 0, pb: form.pb ? Number(form.pb) : undefined, em: form.em ? Number(form.em) : undefined }]);
    setForm({ nome: "", unidade: "kg", precoKg: 0, estoqueKg: 0 });
    setOpen(false);
    toast.success("Ingrediente adicionado");
  };

  const atualizar = (id: string, patch: Partial<Ingrediente>) => {
    setIngredientes((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const remover = (id: string) => {
    if (!confirm("Remover este ingrediente?")) return;
    setIngredientes((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-muted-foreground">Cadastre os ingredientes que entram nas fórmulas e mantenha o preço por kg atualizado.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Ingrediente</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo ingrediente</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome" full><Input value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
              <Field label="Preço/kg (R$)"><Input type="number" step="0.01" value={form.precoKg ?? 0} onChange={(e) => setForm({ ...form, precoKg: +e.target.value })} /></Field>
              <Field label="Estoque (kg)"><Input type="number" value={form.estoqueKg ?? 0} onChange={(e) => setForm({ ...form, estoqueKg: +e.target.value })} /></Field>
              <Field label="PB (%)"><Input type="number" step="0.1" value={form.pb ?? ""} onChange={(e) => setForm({ ...form, pb: +e.target.value })} /></Field>
              <Field label="EM (kcal/kg)"><Input type="number" value={form.em ?? ""} onChange={(e) => setForm({ ...form, em: +e.target.value })} /></Field>
            </div>
            <DialogFooter><Button onClick={adicionar}>Adicionar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ingrediente</TableHead>
              <TableHead className="text-right">Preço/kg</TableHead>
              <TableHead className="text-right">Estoque (kg)</TableHead>
              <TableHead className="text-right">PB %</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ingredientes.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.nome}</TableCell>
                <TableCell className="text-right"><Input className="h-8 text-right w-24 ml-auto" type="number" step="0.01" value={i.precoKg} onChange={(e) => atualizar(i.id, { precoKg: +e.target.value })} /></TableCell>
                <TableCell className="text-right"><Input className="h-8 text-right w-24 ml-auto" type="number" value={i.estoqueKg} onChange={(e) => atualizar(i.id, { estoqueKg: +e.target.value })} /></TableCell>
                <TableCell className="text-right">{i.pb ?? "—"}</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => remover(i.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
            {ingredientes.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nenhum ingrediente</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function FormulasTab({ ingredientes, formulas, setFormulas, setProducoes, setIngredientes }: {
  ingredientes: Ingrediente[];
  formulas: Formula[];
  setFormulas: (v: Formula[] | ((p: Formula[]) => Formula[])) => void;
  setProducoes: (v: Producao[] | ((p: Producao[]) => Producao[])) => void;
  setIngredientes: (v: Ingrediente[] | ((p: Ingrediente[]) => Ingrediente[])) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Formula | null>(null);
  const [produzir, setProduzir] = useState<{ formula: Formula; kg: number } | null>(null);

  const novaFormula = () => {
    setEditing({ id: uid(), nome: "", destino: "frango_engorda", itens: [] });
    setOpen(true);
  };

  const salvar = () => {
    if (!editing) return;
    if (!editing.nome) { toast.error("Nome obrigatório"); return; }
    const total = editing.itens.reduce((s, i) => s + i.percentual, 0);
    if (Math.abs(total - 100) > 0.5) { toast.error(`A soma dos percentuais deve ser 100% (atual ${total.toFixed(1)}%)`); return; }
    setFormulas((prev) => {
      const exists = prev.some((f) => f.id === editing.id);
      return exists ? prev.map((f) => (f.id === editing.id ? editing : f)) : [editing, ...prev];
    });
    setOpen(false); setEditing(null);
    toast.success("Fórmula salva");
  };

  const remover = (id: string) => {
    if (!confirm("Remover fórmula?")) return;
    setFormulas((prev) => prev.filter((f) => f.id !== id));
  };

  const confirmarProducao = () => {
    if (!produzir) return;
    const { formula, kg } = produzir;
    if (kg <= 0) { toast.error("Informe o total em kg"); return; }
    const { custoKg } = calcularCustoKg(formula, ingredientes);
    // descontar estoque
    setIngredientes((prev) => prev.map((ing) => {
      const it = formula.itens.find((x) => x.ingredienteId === ing.id);
      if (!it) return ing;
      const consumo = (it.percentual / 100) * kg;
      return { ...ing, estoqueKg: Math.max(0, ing.estoqueKg - consumo) };
    }));
    setProducoes((prev) => [{ id: uid(), data: new Date().toISOString().slice(0, 10), formulaId: formula.id, totalKg: kg, custoTotal: custoKg * kg }, ...prev]);
    setProduzir(null);
    toast.success(`Batida de ${kg}kg registrada — custo R$ ${(custoKg * kg).toFixed(2)}`);
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Crie fórmulas com percentuais. O sistema calcula custo/kg, PB% e desconta estoque.</p>
        <Button size="sm" onClick={novaFormula}><Plus className="h-4 w-4 mr-1" /> Nova fórmula</Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {formulas.map((f) => {
          const { custoKg, pb, percentTotal } = calcularCustoKg(f, ingredientes);
          return (
            <Card key={f.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-display font-bold text-lg">{f.nome}</div>
                  <Badge variant="secondary" className="text-[10px] mt-1">{f.destino.replace(/_/g, " ")}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(f); setOpen(true); }}><Calculator className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remover(f.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Mini label="Custo/kg" value={`R$ ${custoKg.toFixed(2)}`} />
                <Mini label="PB %" value={pb.toFixed(1)} />
                <Mini label="Soma" value={`${percentTotal.toFixed(0)}%`} />
              </div>
              <ul className="text-xs space-y-0.5">
                {f.itens.map((it) => {
                  const ing = ingredientes.find((i) => i.id === it.ingredienteId);
                  return <li key={it.ingredienteId} className="flex justify-between"><span>{ing?.nome ?? "?"}</span><span className="tabular-nums">{it.percentual}%</span></li>;
                })}
              </ul>
              <Button size="sm" className="w-full" onClick={() => setProduzir({ formula: f, kg: 1000 })}>
                <Beaker className="h-4 w-4 mr-1" /> Produzir batida
              </Button>
            </Card>
          );
        })}
        {formulas.length === 0 && (
          <Card className="p-10 text-center border-dashed col-span-full">
            <Factory className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="font-medium">Nenhuma fórmula cadastrada</p>
            <p className="text-xs text-muted-foreground mt-1">Crie uma fórmula para começar a calcular custos.</p>
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing && formulas.some((f) => f.id === editing.id) ? "Editar fórmula" : "Nova fórmula"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nome"><Input value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} placeholder="Ex: Engorda Frango 21–35d" /></Field>
                <Field label="Destino">
                  <Select value={editing.destino} onValueChange={(v) => setEditing({ ...editing, destino: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="frango_inicial">Frango — inicial</SelectItem>
                      <SelectItem value="frango_crescimento">Frango — crescimento</SelectItem>
                      <SelectItem value="frango_engorda">Frango — engorda</SelectItem>
                      <SelectItem value="gado_engorda">Gado — engorda</SelectItem>
                      <SelectItem value="gado_leite">Vaca leiteira</SelectItem>
                      <SelectItem value="bezerro">Bezerro</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Composição (%)</span>
                  <Button size="sm" variant="outline" onClick={() => setEditing({ ...editing, itens: [...editing.itens, { ingredienteId: ingredientes[0]?.id ?? "", percentual: 0 }] })}>
                    <Plus className="h-3 w-3 mr-1" /> Linha
                  </Button>
                </div>
                {editing.itens.map((it, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Select value={it.ingredienteId} onValueChange={(v) => {
                      const itens = [...editing.itens]; itens[idx] = { ...it, ingredienteId: v }; setEditing({ ...editing, itens });
                    }}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Ingrediente" /></SelectTrigger>
                      <SelectContent>
                        {ingredientes.map((i) => <SelectItem key={i.id} value={i.id}>{i.nome} — R$ {i.precoKg.toFixed(2)}/kg</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input className="w-24" type="number" step="0.1" value={it.percentual} onChange={(e) => {
                      const itens = [...editing.itens]; itens[idx] = { ...it, percentual: +e.target.value }; setEditing({ ...editing, itens });
                    }} />
                    <span className="text-xs text-muted-foreground">%</span>
                    <Button size="icon" variant="ghost" onClick={() => setEditing({ ...editing, itens: editing.itens.filter((_, i) => i !== idx) })}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                {(() => {
                  const { custoKg, pb, percentTotal } = calcularCustoKg(editing, ingredientes);
                  return (
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                      <Mini label="Custo/kg" value={`R$ ${custoKg.toFixed(2)}`} />
                      <Mini label="PB %" value={pb.toFixed(1)} />
                      <Mini label="Soma" value={`${percentTotal.toFixed(0)}%`} />
                    </div>
                  );
                })()}
              </div>

              <Textarea placeholder="Observações" value={editing.observacoes ?? ""} onChange={(e) => setEditing({ ...editing, observacoes: e.target.value })} />
            </div>
          )}
          <DialogFooter><Button onClick={salvar}>Salvar fórmula</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!produzir} onOpenChange={(v) => { if (!v) setProduzir(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Produzir batida — {produzir?.formula.nome}</DialogTitle></DialogHeader>
          {produzir && (
            <div className="space-y-3">
              <Field label="Total a produzir (kg)">
                <Input type="number" value={produzir.kg} onChange={(e) => setProduzir({ ...produzir, kg: +e.target.value })} />
              </Field>
              <div className="border rounded-lg p-3 space-y-1 text-sm">
                <p className="font-semibold mb-2">Consumo de ingredientes:</p>
                {produzir.formula.itens.map((it) => {
                  const ing = ingredientes.find((i) => i.id === it.ingredienteId);
                  const consumo = (it.percentual / 100) * produzir.kg;
                  const falta = ing && consumo > ing.estoqueKg;
                  return (
                    <div key={it.ingredienteId} className="flex justify-between">
                      <span>{ing?.nome}</span>
                      <span className={`tabular-nums ${falta ? "text-destructive font-bold" : ""}`}>{consumo.toFixed(1)} kg {falta && `(estoque: ${ing?.estoqueKg.toFixed(1)})`}</span>
                    </div>
                  );
                })}
                <div className="pt-2 mt-2 border-t flex justify-between font-bold">
                  <span>Custo total</span>
                  <span>R$ {(calcularCustoKg(produzir.formula, ingredientes).custoKg * produzir.kg).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter><Button onClick={confirmarProducao}>Confirmar batida</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProducaoTab({ producoes, setProducoes, formulas }: { producoes: Producao[]; setProducoes: (v: Producao[] | ((p: Producao[]) => Producao[])) => void; formulas: Formula[] }) {
  const totais = useMemo(() => {
    const kg = producoes.reduce((s, p) => s + p.totalKg, 0);
    const custo = producoes.reduce((s, p) => s + p.custoTotal, 0);
    return { kg, custo, mediaKg: kg > 0 ? custo / kg : 0 };
  }, [producoes]);

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Total produzido</p><p className="text-2xl font-bold tabular-nums">{totais.kg.toFixed(0)} kg</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Custo total</p><p className="text-2xl font-bold tabular-nums">R$ {totais.custo.toFixed(2)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Custo médio/kg</p><p className="text-2xl font-bold tabular-nums">R$ {totais.mediaKg.toFixed(2)}</p></Card>
      </div>

      <Card className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Fórmula</TableHead>
              <TableHead className="text-right">Kg</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {producoes.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{new Date(p.data).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell>{formulas.find((f) => f.id === p.formulaId)?.nome ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{p.totalKg.toFixed(0)}</TableCell>
                <TableCell className="text-right tabular-nums">R$ {p.custoTotal.toFixed(2)}</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir registro?")) setProducoes((prev) => prev.filter((x) => x.id !== p.id)); }}><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
            {producoes.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nenhuma batida registrada</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return <div className={`space-y-1.5 ${full ? "col-span-2" : ""}`}><Label className="text-xs">{label}</Label>{children}</div>;
}
function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded-md p-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display font-bold text-base tabular-nums">{value}</p>
    </div>
  );
}
