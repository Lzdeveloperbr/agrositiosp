import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCloudCollection } from "@/lib/cloud/useCloudCollection";
import { useFinanceiro } from "@/lib/state";
import { useFazenda } from "@/lib/cloud/fazenda";
import { Target, Wallet, TrendingUp, TrendingDown, Plus, Trash2, Copy } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/orcamento")({
  head: () => ({
    meta: [
      { title: "Orçamento e Metas Anuais — AgroSítio" },
      { name: "description", content: "Planejamento financeiro anual por atividade com metas mensais e comparativo previsto x realizado." },
      { property: "og:title", content: "Orçamento e Metas Anuais — AgroSítio" },
      { property: "og:description", content: "Metas mensais por categoria e desvio de previsto x realizado da fazenda." },
    ],
  }),
  component: OrcamentoPage,
});

type Meta = {
  id: string; ano: number; mes: number; atividade: string; categoria: string;
  tipo: "receita" | "despesa"; previsto: number; observacoes?: string | null; autor?: string | null;
};

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const ATIVIDADES = ["geral", "granja", "gado de corte", "gado de leite", "lavoura", "maquinário", "estrutura"];
const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function OrcamentoPage() {
  const { operador } = useFazenda();
  const { items: metas, add, update, remove, loading } = useCloudCollection<Meta>("orcamento_metas");
  const [financ] = useFinanceiro();
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [form, setForm] = useState({
    mes: new Date().getMonth() + 1, atividade: "geral", categoria: "", tipo: "despesa" as "receita" | "despesa", previsto: 0,
  });

  const metasAno = useMemo(() => metas.filter((m) => m.ano === ano), [metas, ano]);

  const realizado = useMemo(() => {
    const map = new Map<string, number>();
    financ.filter((l) => (l.data ?? "").startsWith(String(ano))).forEach((l) => {
      const mes = Number((l.data ?? "").slice(5, 7));
      const k = `${mes}|${l.tipo}|${(l.categoria || "").toLowerCase().trim()}`;
      map.set(k, (map.get(k) ?? 0) + l.valor);
      const kt = `${mes}|${l.tipo}`;
      map.set(kt, (map.get(kt) ?? 0) + l.valor);
    });
    return map;
  }, [financ, ano]);

  const linhas = useMemo(() =>
    [...metasAno]
      .sort((a, b) => a.mes - b.mes || a.categoria.localeCompare(b.categoria))
      .map((m) => {
        const real = realizado.get(`${m.mes}|${m.tipo}|${(m.categoria || "").toLowerCase().trim()}`) ?? 0;
        const desvio = m.tipo === "despesa" ? real - Number(m.previsto) : Number(m.previsto) - real;
        const pct = Number(m.previsto) > 0 ? (real / Number(m.previsto)) * 100 : 0;
        return { ...m, real, desvio, pct };
      }), [metasAno, realizado]);

  const serie = useMemo(() => MESES.map((nome, i) => {
    const mes = i + 1;
    const metasMes = metasAno.filter((m) => m.mes === mes);
    return {
      mes: nome,
      "Receita prevista": metasMes.filter((m) => m.tipo === "receita").reduce((s, m) => s + Number(m.previsto), 0),
      "Receita real": realizado.get(`${mes}|receita`) ?? 0,
      "Despesa prevista": metasMes.filter((m) => m.tipo === "despesa").reduce((s, m) => s + Number(m.previsto), 0),
      "Despesa real": realizado.get(`${mes}|despesa`) ?? 0,
    };
  }), [metasAno, realizado]);

  const totPrevRec = metasAno.filter((m) => m.tipo === "receita").reduce((s, m) => s + Number(m.previsto), 0);
  const totPrevDesp = metasAno.filter((m) => m.tipo === "despesa").reduce((s, m) => s + Number(m.previsto), 0);
  const totRealRec = serie.reduce((s, m) => s + m["Receita real"], 0);
  const totRealDesp = serie.reduce((s, m) => s + m["Despesa real"], 0);
  const execucao = totPrevDesp > 0 ? (totRealDesp / totPrevDesp) * 100 : 0;

  async function salvar() {
    if (!form.categoria.trim()) { toast.error("Informe a categoria"); return; }
    const r = await add({ ...form, ano, categoria: form.categoria.trim(), autor: operador ?? null } as Partial<Meta>);
    if (r) { toast.success("Meta cadastrada"); setForm((f) => ({ ...f, categoria: "", previsto: 0 })); }
    else toast.error("Não foi possível salvar");
  }

  async function replicarAno() {
    const base = metasAno.filter((m) => m.mes === form.mes);
    if (base.length === 0) { toast.error("Cadastre metas nesse mês primeiro"); return; }
    for (let mes = 1; mes <= 12; mes++) {
      if (mes === form.mes) continue;
      for (const m of base) {
        const existe = metasAno.some((x) => x.mes === mes && x.categoria === m.categoria && x.tipo === m.tipo && x.atividade === m.atividade);
        if (!existe) await add({ ano, mes, atividade: m.atividade, categoria: m.categoria, tipo: m.tipo, previsto: m.previsto, autor: operador ?? null } as Partial<Meta>);
      }
    }
    toast.success("Metas replicadas para o ano todo");
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Financeiro</p>
            <h1 className="text-2xl md:text-3xl font-display font-bold tracking-[-0.03em]">Orçamento e Metas</h1>
            <p className="text-sm text-muted-foreground mt-1">Planeje o ano por atividade e acompanhe previsto x realizado.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setAno((a) => a - 1)}>◀</Button>
            <Badge variant="secondary" className="text-base px-3 py-1">{ano}</Badge>
            <Button size="sm" variant="outline" onClick={() => setAno((a) => a + 1)}>▶</Button>
          </div>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Receita prevista" value={fmtBRL(totPrevRec)} hint={`Realizado ${fmtBRL(totRealRec)}`} icon={TrendingUp} tone="primary" />
          <StatCard label="Despesa prevista" value={fmtBRL(totPrevDesp)} hint={`Realizado ${fmtBRL(totRealDesp)}`} icon={TrendingDown} tone="destructive" />
          <StatCard label="Resultado previsto" value={fmtBRL(totPrevRec - totPrevDesp)} hint={`Real ${fmtBRL(totRealRec - totRealDesp)}`} icon={Wallet} tone="accent" />
          <StatCard label="Execução do orçamento" value={`${execucao.toFixed(0)}%`} hint="Despesa realizada / prevista" icon={Target} tone={execucao > 100 ? "destructive" : "primary"} />
        </div>

        <Tabs defaultValue="acompanhar">
          <TabsList>
            <TabsTrigger value="acompanhar">Acompanhamento</TabsTrigger>
            <TabsTrigger value="planejar">Planejar</TabsTrigger>
          </TabsList>

          <TabsContent value="acompanhar" className="space-y-4 mt-4">
            <Card className="p-4">
              <h2 className="font-semibold mb-3">Previsto x Realizado por mês</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serie}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="mes" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip formatter={(v: any) => fmtBRL(Number(v))} />
                    <Legend />
                    <Bar dataKey="Despesa prevista" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Despesa real" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Receita real" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4 overflow-x-auto">
              <h2 className="font-semibold mb-3">Metas do ano</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead>Atividade</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Previsto</TableHead>
                    <TableHead className="text-right">Realizado</TableHead>
                    <TableHead className="w-40">Execução</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhas.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{MESES[l.mes - 1]}</TableCell>
                      <TableCell className="capitalize text-muted-foreground">{l.atividade}</TableCell>
                      <TableCell className="font-medium">{l.categoria}</TableCell>
                      <TableCell><Badge variant={l.tipo === "receita" ? "secondary" : "outline"}>{l.tipo}</Badge></TableCell>
                      <TableCell className="text-right tabular-nums">
                        <Input
                          className="h-8 w-28 text-right"
                          type="number"
                          defaultValue={Number(l.previsto)}
                          onBlur={(e) => {
                            const v = Number(e.target.value) || 0;
                            if (v !== Number(l.previsto)) update(l.id, { previsto: v } as Partial<Meta>);
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtBRL(l.real)}</TableCell>
                      <TableCell>
                        <Progress value={Math.min(l.pct, 100)} className="h-2" />
                        <span className={`text-[11px] ${l.desvio > 0 && l.tipo === "despesa" ? "text-destructive" : "text-muted-foreground"}`}>
                          {l.pct.toFixed(0)}% · desvio {fmtBRL(l.desvio)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => remove(l.id)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && linhas.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma meta cadastrada para {ano}.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="planejar" className="mt-4">
            <Card className="p-4 space-y-4">
              <h2 className="font-semibold">Nova meta</h2>
              <div className="grid md:grid-cols-5 gap-3">
                <div>
                  <Label>Mês</Label>
                  <Select value={String(form.mes)} onValueChange={(v) => setForm({ ...form, mes: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MESES.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Atividade</Label>
                  <Select value={form.atividade} onValueChange={(v) => setForm({ ...form, atividade: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ATIVIDADES.map((a) => <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Ex.: Ração, Energia, Venda de aves" />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="despesa">Despesa</SelectItem>
                      <SelectItem value="receita">Receita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valor previsto (R$)</Label>
                  <Input type="number" value={form.previsto} onChange={(e) => setForm({ ...form, previsto: Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={salvar}><Plus className="h-4 w-4 mr-1" /> Adicionar meta</Button>
                <Button variant="outline" onClick={replicarAno}><Copy className="h-4 w-4 mr-1" /> Replicar mês para o ano</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                O realizado é somado automaticamente do módulo Financeiro, casando a categoria escrita aqui com a categoria do lançamento.
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
