import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCloudCollection } from "@/lib/cloud/useCloudCollection";
import { useFazenda } from "@/lib/cloud/fazenda";
import { baixarCSV } from "@/lib/exportar";
import { toast } from "sonner";
import {
  CATEGORIAS, CATEGORIA_LABEL, sugestoesDoMes, mesLabel, mesAtual, deslocarMes,
} from "@/lib/prioridadesSugestoes";
import {
  ChevronLeft, ChevronRight, Plus, Target, CheckCircle2, Clock, AlertTriangle,
  Wallet, Trash2, Copy, Download, Sparkles, ArrowUp, ArrowDown, Flag,
} from "lucide-react";
import { fmtData, hojeISO } from "@/lib/data";

export const Route = createFileRoute("/prioridades")({
  head: () => ({
    meta: [
      { title: "Prioridades do Mês — AgroSítio" },
      { name: "description", content: "Planejamento mensal profissional do sítio: metas por categoria, prazos, responsáveis, custo previsto e progresso em tempo real." },
      { property: "og:title", content: "Prioridades do Mês — AgroSítio" },
      { property: "og:description", content: "Planejamento mensal profissional do sítio com metas, prazos, responsáveis e progresso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Prioridades,
});

type Prioridade = {
  id: string;
  mes: string;
  titulo: string;
  descricao: string | null;
  categoria: string;
  prioridade: "alta" | "media" | "baixa";
  status: "pendente" | "andamento" | "concluida" | "cancelada";
  responsavel: string | null;
  prazo: string | null;
  custo_estimado: number | null;
  custo_real: number | null;
  progresso: number;
  ordem: number;
  fonte_arquivo: string | null;
};

const PRIO_COR: Record<string, string> = {
  alta: "bg-destructive/15 text-destructive border-destructive/30",
  media: "bg-accent/15 text-accent border-accent/30",
  baixa: "bg-muted text-muted-foreground border-border",
};
const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente", andamento: "Em andamento", concluida: "Concluída", cancelada: "Cancelada",
};

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function Prioridades() {
  const { operador } = useFazenda();
  const { items, add, update, remove, loading } = useCloudCollection<Prioridade>("prioridades", { col: "ordem", asc: true });
  const [mes, setMes] = useState(mesAtual());
  const [filtroCat, setFiltroCat] = useState("todas");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const [form, setForm] = useState({
    titulo: "", descricao: "", categoria: "geral", prioridade: "media",
    responsavel: "", prazo: "", custo_estimado: "",
  });

  const doMes = useMemo(() => items.filter((p) => p.mes === mes), [items, mes]);
  const hoje = hojeISO();

  const kpis = useMemo(() => {
    const total = doMes.length;
    const concl = doMes.filter((p) => p.status === "concluida").length;
    const and = doMes.filter((p) => p.status === "andamento").length;
    const atras = doMes.filter((p) => p.status !== "concluida" && p.status !== "cancelada" && p.prazo && p.prazo < hoje).length;
    const custo = doMes.reduce((s, p) => s + (Number(p.custo_estimado) || 0), 0);
    const gasto = doMes.reduce((s, p) => s + (Number(p.custo_real) || 0), 0);
    const prog = total ? Math.round(doMes.reduce((s, p) => s + (p.status === "concluida" ? 100 : p.progresso || 0), 0) / total) : 0;
    return { total, concl, and, atras, custo, gasto, prog };
  }, [doMes, hoje]);

  const lista = useMemo(() => {
    const ordemPrio = { alta: 0, media: 1, baixa: 2 } as Record<string, number>;
    return doMes
      .filter((p) => filtroCat === "todas" || p.categoria === filtroCat)
      .filter((p) => filtroStatus === "todos" || p.status === filtroStatus)
      .sort((a, b) => (a.ordem - b.ordem) || (ordemPrio[a.prioridade]! - ordemPrio[b.prioridade]!));
  }, [doMes, filtroCat, filtroStatus]);

  async function criar(dados?: Partial<Prioridade>) {
    const titulo = dados?.titulo ?? form.titulo.trim();
    if (!titulo) { toast.error("Informe o título da prioridade"); return; }
    const maxOrdem = doMes.reduce((m, p) => Math.max(m, p.ordem), 0);
    const novo = await add({
      mes,
      titulo,
      descricao: dados?.descricao ?? (form.descricao.trim() || null),
      categoria: dados?.categoria ?? form.categoria,
      prioridade: (dados?.prioridade ?? form.prioridade) as Prioridade["prioridade"],
      status: "pendente",
      responsavel: dados?.responsavel ?? (form.responsavel.trim() || operador || null),
      prazo: dados?.prazo ?? (form.prazo || null),
      custo_estimado: dados?.custo_estimado ?? (form.custo_estimado ? Number(form.custo_estimado) : null),
      progresso: 0,
      ordem: maxOrdem + 1,
      autor: operador || null,
    } as any);
    if (novo && !dados) {
      setForm({ titulo: "", descricao: "", categoria: "geral", prioridade: "media", responsavel: "", prazo: "", custo_estimado: "" });
      toast.success("Prioridade adicionada");
    }
    return novo;
  }

  async function mover(p: Prioridade, dir: -1 | 1) {
    const ordenadas = [...doMes].sort((a, b) => a.ordem - b.ordem);
    const i = ordenadas.findIndex((x) => x.id === p.id);
    const j = i + dir;
    if (j < 0 || j >= ordenadas.length) return;
    const outro = ordenadas[j]!;
    await update(p.id, { ordem: outro.ordem } as any);
    await update(outro.id, { ordem: p.ordem } as any);
  }

  async function copiarPendentes() {
    const anterior = deslocarMes(mes, -1);
    const pend = items.filter((p) => p.mes === anterior && p.status !== "concluida" && p.status !== "cancelada");
    if (!pend.length) { toast.info("Nenhuma pendência no mês anterior"); return; }
    for (const p of pend) {
      await criar({
        titulo: p.titulo, descricao: p.descricao, categoria: p.categoria,
        prioridade: p.prioridade, responsavel: p.responsavel, prazo: null,
        custo_estimado: p.custo_estimado,
      });
    }
    toast.success(`${pend.length} pendência(s) trazida(s) de ${mesLabel(anterior)}`);
  }

  function exportar() {
    if (!doMes.length) { toast.error("Nada para exportar"); return; }
    baixarCSV(`prioridades-${mes}`, doMes.map((p) => ({
      Mês: p.mes, Título: p.titulo, Categoria: CATEGORIA_LABEL[p.categoria] ?? p.categoria,
      Prioridade: p.prioridade, Status: STATUS_LABEL[p.status], Responsável: p.responsavel ?? "",
      Prazo: p.prazo ?? "", "Custo previsto": p.custo_estimado ?? "", "Custo real": p.custo_real ?? "",
      "Progresso %": p.status === "concluida" ? 100 : p.progresso, Origem: p.fonte_arquivo ?? "manual",
    })));
  }

  const sugestoes = useMemo(() => {
    const existentes = new Set(doMes.map((p) => p.titulo.toLowerCase()));
    return sugestoesDoMes(mes).filter((s) => !existentes.has(s.titulo.toLowerCase()));
  }, [mes, doMes]);

  return (
    <AppShell>
      <div className="space-y-5">
        <header className="rounded-2xl border border-border/60 p-5" style={{ background: "var(--gradient-hero)" }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Planejamento mensal</p>
              <h1 className="text-2xl md:text-3xl font-display font-bold mt-1 capitalize">Prioridades — {mesLabel(mes)}</h1>
              <p className="text-sm text-muted-foreground mt-1">Metas do sítio por categoria, prazo, responsável e custo previsto.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setMes(deslocarMes(mes, -1))} aria-label="Mês anterior"><ChevronLeft className="h-4 w-4" /></Button>
              <Input type="month" value={mes} onChange={(e) => setMes(e.target.value || mesAtual())} className="w-[150px]" />
              <Button variant="outline" size="icon" onClick={() => setMes(deslocarMes(mes, 1))} aria-label="Próximo mês"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>Progresso do mês</span><span className="font-semibold text-foreground">{kpis.prog}%</span>
            </div>
            <Progress value={kpis.prog} />
          </div>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Kpi icon={Target} label="Prioridades" value={String(kpis.total)} />
          <Kpi icon={CheckCircle2} label="Concluídas" value={`${kpis.concl}`} tone="text-primary" />
          <Kpi icon={Clock} label="Em andamento" value={`${kpis.and}`} tone="text-accent" />
          <Kpi icon={AlertTriangle} label="Atrasadas" value={`${kpis.atras}`} tone="text-destructive" />
          <Kpi icon={Wallet} label="Custo previsto" value={fmtBRL(kpis.custo)} hint={kpis.gasto ? `Realizado ${fmtBRL(kpis.gasto)}` : undefined} />
        </div>

        <Tabs defaultValue="lista">
          <TabsList>
            <TabsTrigger value="lista">Lista</TabsTrigger>
            <TabsTrigger value="nova">Nova prioridade</TabsTrigger>
            <TabsTrigger value="sugestoes">Sugestões do mês</TabsTrigger>
          </TabsList>

          <TabsContent value="lista" className="space-y-3 mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={filtroCat} onValueChange={setFiltroCat}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas categorias</SelectItem>
                  {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{CATEGORIA_LABEL[c]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos status</SelectItem>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={copiarPendentes}><Copy className="h-4 w-4 mr-1.5" /> Trazer pendências</Button>
              <Button variant="outline" size="sm" onClick={exportar}><Download className="h-4 w-4 mr-1.5" /> Exportar</Button>
            </div>

            {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
            {!loading && !lista.length && (
              <Card className="p-8 text-center">
                <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="font-medium">Nenhuma prioridade em {mesLabel(mes)}</p>
                <p className="text-sm text-muted-foreground">Use a aba "Sugestões do mês" para começar com o calendário técnico.</p>
              </Card>
            )}

            {lista.map((p) => {
              const atrasada = p.status !== "concluida" && p.status !== "cancelada" && !!p.prazo && p.prazo < hoje;
              return (
                <Card key={p.id} className={`p-4 ${atrasada ? "border-destructive/40" : ""}`}>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      className="mt-1"
                      checked={p.status === "concluida"}
                      onCheckedChange={(v) => update(p.id, { status: v ? "concluida" : "pendente", progresso: v ? 100 : 0 } as any)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`font-semibold ${p.status === "concluida" ? "line-through text-muted-foreground" : ""}`}>{p.titulo}</h3>
                        <Badge variant="outline" className={PRIO_COR[p.prioridade]}><Flag className="h-3 w-3 mr-1" />{p.prioridade}</Badge>
                        <Badge variant="secondary">{CATEGORIA_LABEL[p.categoria] ?? p.categoria}</Badge>
                        {p.fonte_arquivo && <Badge variant="outline" className="gap-1"><Sparkles className="h-3 w-3" />IA</Badge>}
                        {atrasada && <Badge variant="destructive">Atrasada</Badge>}
                      </div>
                      {p.descricao && <p className="text-sm text-muted-foreground mt-1">{p.descricao}</p>}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                        {p.responsavel && <span>👤 {p.responsavel}</span>}
                        {p.prazo && <span>📅 {fmtData(p.prazo + "T12:00:00")}</span>}
                        {p.custo_estimado != null && <span>💰 {fmtBRL(Number(p.custo_estimado))}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-3">
                        <input
                          type="range" min={0} max={100} step={10}
                          value={p.status === "concluida" ? 100 : p.progresso}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            update(p.id, { progresso: v, status: v === 100 ? "concluida" : v > 0 ? "andamento" : "pendente" } as any);
                          }}
                          className="flex-1 accent-[hsl(var(--primary))]"
                          aria-label={`Progresso de ${p.titulo}`}
                        />
                        <span className="text-xs font-semibold w-10 text-right">{p.status === "concluida" ? 100 : p.progresso}%</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => mover(p, -1)} aria-label="Subir"><ArrowUp className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => mover(p, 1)} aria-label="Descer"><ArrowDown className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(p.id)} aria-label="Excluir"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="nova" className="mt-4">
            <Card className="p-4 space-y-3">
              <Input placeholder="Título da prioridade" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
              <Textarea placeholder="Descrição / o que precisa ser feito" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{CATEGORIA_LABEL[c]}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.prioridade} onValueChange={(v) => setForm({ ...form, prioridade: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="date" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} />
                <Input type="number" placeholder="Custo previsto (R$)" value={form.custo_estimado} onChange={(e) => setForm({ ...form, custo_estimado: e.target.value })} />
              </div>
              <Input placeholder="Responsável" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} />
              <Button onClick={() => criar()}><Plus className="h-4 w-4 mr-1.5" /> Adicionar em {mesLabel(mes)}</Button>
            </Card>
          </TabsContent>

          <TabsContent value="sugestoes" className="mt-4 space-y-2">
            <p className="text-sm text-muted-foreground">Calendário técnico do mês — toque em adicionar para incluir no plano.</p>
            {sugestoes.map((s) => (
              <Card key={s.titulo} className="p-3 flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{s.titulo}</p>
                  <p className="text-xs text-muted-foreground">{s.descricao}</p>
                </div>
                <Badge variant="outline" className={PRIO_COR[s.prioridade]}>{s.prioridade}</Badge>
                <Button size="sm" variant="secondary" onClick={() => criar({ titulo: s.titulo, descricao: s.descricao, categoria: s.categoria, prioridade: s.prioridade })}>Adicionar</Button>
              </Card>
            ))}
            {!sugestoes.length && <p className="text-sm text-muted-foreground">Todas as sugestões do mês já estão no plano. 👏</p>}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function Kpi({ icon: Icon, label, value, hint, tone }: { icon: any; label: string; value: string; hint?: string; tone?: string }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</div>
      <p className={`font-display text-xl font-bold mt-1 ${tone ?? ""}`}>{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </Card>
  );
}
