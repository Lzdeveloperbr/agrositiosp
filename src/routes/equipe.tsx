import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCloudCollection } from "@/lib/cloud/useCloudCollection";
import { useFazenda } from "@/lib/cloud/fazenda";
import { Users, Clock, Wallet, UserPlus, Trash2, Plus, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { hojeISO } from "@/lib/data";

export const Route = createFileRoute("/equipe")({
  head: () => ({
    meta: [
      { title: "Equipe e Ponto — AgroSítio" },
      { name: "description", content: "Cadastro de funcionários, registro de ponto, horas extras e custo de mão de obra da fazenda." },
      { property: "og:title", content: "Equipe e Ponto — AgroSítio" },
      { property: "og:description", content: "Gestão de pessoas, jornada, horas extras e folha estimada da propriedade." },
    ],
  }),
  component: EquipePage,
});

type Funcionario = {
  id: string; nome: string; funcao?: string | null; setor?: string | null; telefone?: string | null;
  cpf?: string | null; admissao?: string | null; demissao?: string | null; salario?: number | null;
  tipo_pagamento?: string | null; valor_hora?: number | null; ativo: boolean; observacoes?: string | null;
};

type Ponto = {
  id: string; funcionario_id: string | null; data: string; entrada?: string | null; saida?: string | null;
  intervalo_min?: number | null; horas?: number | null; extras?: number | null; tipo?: string | null;
  atividade?: string | null; observacoes?: string | null;
};

const SETORES = ["granja", "gado", "lavoura", "manutenção", "administrativo", "geral"];
const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function calcHoras(entrada?: string | null, saida?: string | null, intervalo = 0) {
  if (!entrada || !saida) return 0;
  const [h1, m1] = entrada.split(":").map(Number);
  const [h2, m2] = saida.split(":").map(Number);
  let min = (h2 * 60 + m2) - (h1 * 60 + m1) - (intervalo || 0);
  if (min < 0) min += 24 * 60;
  return Math.round((min / 60) * 100) / 100;
}

function EquipePage() {
  const { operador } = useFazenda();
  const funcs = useCloudCollection<Funcionario>("funcionarios");
  const pontos = useCloudCollection<Ponto>("pontos", { col: "data", asc: false });
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));

  const [novoF, setNovoF] = useState({ nome: "", funcao: "", setor: "geral", telefone: "", admissao: "", salario: 0, tipo_pagamento: "mensal", valor_hora: 0 });
  const [novoP, setNovoP] = useState({
    funcionario_id: "", data: hojeISO(),
    entrada: "07:00", saida: "17:00", intervalo_min: 60, tipo: "normal", atividade: "",
  });

  const ativos = funcs.items.filter((f) => f.ativo !== false && !f.demissao);
  const pontosMes = useMemo(() => pontos.items.filter((p) => (p.data ?? "").startsWith(mes)), [pontos.items, mes]);

  const resumo = useMemo(() => ativos.map((f) => {
    const regs = pontosMes.filter((p) => p.funcionario_id === f.id);
    const horas = regs.reduce((s, p) => s + Number(p.horas ?? 0), 0);
    const extras = regs.reduce((s, p) => s + Number(p.extras ?? 0), 0);
    const custoHora = Number(f.valor_hora ?? 0) || (Number(f.salario ?? 0) / 220);
    const custo = f.tipo_pagamento === "diaria" || f.tipo_pagamento === "hora"
      ? horas * custoHora + extras * custoHora * 1.5
      : Number(f.salario ?? 0) + extras * custoHora * 1.5;
    return { f, dias: regs.length, horas, extras, custo };
  }), [ativos, pontosMes]);

  const totalHoras = resumo.reduce((s, r) => s + r.horas, 0);
  const totalExtras = resumo.reduce((s, r) => s + r.extras, 0);
  const folha = resumo.reduce((s, r) => s + r.custo, 0);

  async function addFunc() {
    if (!novoF.nome.trim()) { toast.error("Informe o nome"); return; }
    const r = await funcs.add({
      ...novoF, nome: novoF.nome.trim(), ativo: true,
      admissao: novoF.admissao || null, salario: novoF.salario || null, valor_hora: novoF.valor_hora || null,
      autor: operador ?? null,
    } as any);
    if (r) { toast.success("Funcionário cadastrado"); setNovoF({ nome: "", funcao: "", setor: "geral", telefone: "", admissao: "", salario: 0, tipo_pagamento: "mensal", valor_hora: 0 }); }
    else toast.error("Erro ao salvar");
  }

  async function addPonto() {
    if (!novoP.funcionario_id) { toast.error("Selecione o funcionário"); return; }
    const horas = calcHoras(novoP.entrada, novoP.saida, novoP.intervalo_min);
    const extras = Math.max(0, horas - 8.8);
    const r = await pontos.add({ ...novoP, horas, extras, autor: operador ?? null } as any);
    if (r) toast.success(`Ponto registrado — ${horas.toFixed(2)}h`);
    else toast.error("Erro ao registrar ponto");
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Gestão</p>
            <h1 className="text-2xl md:text-3xl font-display font-bold tracking-[-0.03em]">Equipe e Ponto</h1>
            <p className="text-sm text-muted-foreground mt-1">Funcionários, jornada, horas extras e custo de mão de obra.</p>
          </div>
          <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-44" />
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Funcionários ativos" value={ativos.length.toString()} hint={`${funcs.items.length} cadastrados`} icon={Users} tone="primary" />
          <StatCard label="Horas no mês" value={totalHoras.toFixed(1)} hint={`${pontosMes.length} registros`} icon={Clock} tone="accent" />
          <StatCard label="Horas extras" value={totalExtras.toFixed(1)} hint="acima de 8h48/dia" icon={CalendarClock} tone="destructive" />
          <StatCard label="Folha estimada" value={fmtBRL(folha)} hint="salários + extras" icon={Wallet} tone="primary" />
        </div>

        <Tabs defaultValue="ponto">
          <TabsList>
            <TabsTrigger value="ponto">Ponto</TabsTrigger>
            <TabsTrigger value="resumo">Resumo do mês</TabsTrigger>
            <TabsTrigger value="equipe">Cadastro</TabsTrigger>
          </TabsList>

          <TabsContent value="ponto" className="space-y-4 mt-4">
            <Card className="p-4 space-y-4">
              <h2 className="font-semibold">Registrar ponto</h2>
              <div className="grid md:grid-cols-6 gap-3">
                <div className="md:col-span-2">
                  <Label>Funcionário</Label>
                  <Select value={novoP.funcionario_id} onValueChange={(v) => setNovoP({ ...novoP, funcionario_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{ativos.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Data</Label><Input type="date" value={novoP.data} onChange={(e) => setNovoP({ ...novoP, data: e.target.value })} /></div>
                <div><Label>Entrada</Label><Input type="time" value={novoP.entrada} onChange={(e) => setNovoP({ ...novoP, entrada: e.target.value })} /></div>
                <div><Label>Saída</Label><Input type="time" value={novoP.saida} onChange={(e) => setNovoP({ ...novoP, saida: e.target.value })} /></div>
                <div><Label>Intervalo (min)</Label><Input type="number" value={novoP.intervalo_min} onChange={(e) => setNovoP({ ...novoP, intervalo_min: Number(e.target.value) })} /></div>
                <div className="md:col-span-3"><Label>Atividade</Label><Input value={novoP.atividade} onChange={(e) => setNovoP({ ...novoP, atividade: e.target.value })} placeholder="Ex.: manejo da granja, bater cama" /></div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={novoP.tipo} onValueChange={(v) => setNovoP({ ...novoP, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="extra">Extra</SelectItem>
                      <SelectItem value="folga">Folga</SelectItem>
                      <SelectItem value="falta">Falta</SelectItem>
                      <SelectItem value="atestado">Atestado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={addPonto}><Plus className="h-4 w-4 mr-1" /> Registrar</Button>
                <span className="text-sm text-muted-foreground">Prévia: <strong>{calcHoras(novoP.entrada, novoP.saida, novoP.intervalo_min).toFixed(2)}h</strong></span>
              </div>
            </Card>

            <Card className="p-4 overflow-x-auto">
              <h2 className="font-semibold mb-3">Registros de {mes}</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Saída</TableHead>
                    <TableHead className="text-right">Horas</TableHead>
                    <TableHead className="text-right">Extras</TableHead>
                    <TableHead>Atividade</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pontosMes.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.data?.split("-").reverse().join("/")}</TableCell>
                      <TableCell className="font-medium">{funcs.items.find((f) => f.id === p.funcionario_id)?.nome ?? "—"}</TableCell>
                      <TableCell>{p.entrada ?? "—"}</TableCell>
                      <TableCell>{p.saida ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(p.horas ?? 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(p.extras ?? 0).toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">{p.atividade ?? "—"}</TableCell>
                      <TableCell><Button size="icon" variant="ghost" onClick={() => pontos.remove(p.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                  {pontosMes.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum ponto neste mês.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="resumo" className="mt-4">
            <Card className="p-4 overflow-x-auto">
              <h2 className="font-semibold mb-3">Fechamento de {mes}</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead className="text-right">Dias</TableHead>
                    <TableHead className="text-right">Horas</TableHead>
                    <TableHead className="text-right">Extras</TableHead>
                    <TableHead className="text-right">Custo estimado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumo.map((r) => (
                    <TableRow key={r.f.id}>
                      <TableCell className="font-medium">{r.f.nome}</TableCell>
                      <TableCell className="capitalize text-muted-foreground">{r.f.setor ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.dias}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.horas.toFixed(1)}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.extras.toFixed(1)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtBRL(r.custo)}</TableCell>
                    </TableRow>
                  ))}
                  {resumo.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Cadastre funcionários para ver o fechamento.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="equipe" className="space-y-4 mt-4">
            <Card className="p-4 space-y-4">
              <h2 className="font-semibold">Novo funcionário</h2>
              <div className="grid md:grid-cols-4 gap-3">
                <div><Label>Nome</Label><Input value={novoF.nome} onChange={(e) => setNovoF({ ...novoF, nome: e.target.value })} /></div>
                <div><Label>Função</Label><Input value={novoF.funcao} onChange={(e) => setNovoF({ ...novoF, funcao: e.target.value })} placeholder="Ex.: Granjeiro" /></div>
                <div>
                  <Label>Setor</Label>
                  <Select value={novoF.setor} onValueChange={(v) => setNovoF({ ...novoF, setor: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SETORES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Telefone</Label><Input value={novoF.telefone} onChange={(e) => setNovoF({ ...novoF, telefone: e.target.value })} /></div>
                <div><Label>Admissão</Label><Input type="date" value={novoF.admissao} onChange={(e) => setNovoF({ ...novoF, admissao: e.target.value })} /></div>
                <div>
                  <Label>Pagamento</Label>
                  <Select value={novoF.tipo_pagamento} onValueChange={(v) => setNovoF({ ...novoF, tipo_pagamento: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensal">Mensalista</SelectItem>
                      <SelectItem value="diaria">Diarista</SelectItem>
                      <SelectItem value="hora">Por hora</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Salário (R$)</Label><Input type="number" value={novoF.salario} onChange={(e) => setNovoF({ ...novoF, salario: Number(e.target.value) })} /></div>
                <div><Label>Valor hora (R$)</Label><Input type="number" value={novoF.valor_hora} onChange={(e) => setNovoF({ ...novoF, valor_hora: Number(e.target.value) })} /></div>
              </div>
              <Button onClick={addFunc}><UserPlus className="h-4 w-4 mr-1" /> Cadastrar</Button>
            </Card>

            <Card className="p-4 overflow-x-auto">
              <h2 className="font-semibold mb-3">Equipe</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Admissão</TableHead>
                    <TableHead className="text-right">Salário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {funcs.items.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.nome}</TableCell>
                      <TableCell>{f.funcao ?? "—"}</TableCell>
                      <TableCell className="capitalize text-muted-foreground">{f.setor ?? "—"}</TableCell>
                      <TableCell>{f.admissao ? f.admissao.split("-").reverse().join("/") : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{f.salario ? fmtBRL(Number(f.salario)) : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={f.ativo !== false ? "secondary" : "outline"}>{f.ativo !== false ? "Ativo" : "Inativo"}</Badge>
                      </TableCell>
                      <TableCell className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => funcs.update(f.id, { ativo: !(f.ativo !== false) } as any)}>
                          {f.ativo !== false ? "Desativar" : "Reativar"}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => funcs.remove(f.id)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {funcs.items.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum funcionário cadastrado.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
