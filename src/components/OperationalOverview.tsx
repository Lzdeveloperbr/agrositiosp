import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDiario, useEstoque, useFinanceiro, useLotes, useTarefas } from "@/lib/state";
import { hojeISO } from "@/lib/data";
import {
  AlertTriangle, ArrowRight, BookOpen, CheckCircle2, Clock3, Package,
  Receipt, ClipboardList, Wallet,
} from "lucide-react";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function OperationalOverview() {
  const [lotes] = useLotes();
  const [tarefas] = useTarefas();
  const [estoque] = useEstoque();
  const [financeiro] = useFinanceiro();
  const [diario] = useDiario();
  const hoje = hojeISO();

  const data = useMemo(() => {
    const pendentes = tarefas.filter((t) => !t.concluida);
    const atrasadas = pendentes.filter((t) => !!t.vencimento && t.vencimento < hoje);
    const paraHoje = pendentes.filter((t) => t.vencimento === hoje);
    const criticos = estoque.filter((i) => i.minimo !== undefined && i.quantidade <= (i.minimo ?? 0));
    const contasAbertas = financeiro.filter((l) => l.tipo === "despesa" && l.status !== "pago");
    const valorAberto = contasAbertas.reduce((s, l) => s + Number(l.valor || 0), 0);
    const ativas = lotes.filter((l) => !l.encerrado);
    const concluidas = tarefas.filter((t) => t.concluida).length;
    const taxa = tarefas.length ? Math.round((concluidas / tarefas.length) * 100) : 0;
    const recentes = [...diario].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 3);
    const prioridade = (p: string) => p === "alta" ? 0 : p === "media" ? 1 : 2;
    const proximas = [...pendentes].sort((a, b) => {
      const p = prioridade(a.prioridade) - prioridade(b.prioridade);
      if (p) return p;
      return (a.vencimento || "9999-99-99").localeCompare(b.vencimento || "9999-99-99");
    }).slice(0, 4);
    return { pendentes, atrasadas, paraHoje, criticos, contasAbertas, valorAberto, ativas, taxa, recentes, proximas };
  }, [tarefas, estoque, financeiro, lotes, diario, hoje]);

  return (
    <section aria-label="Resumo operacional" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Visão geral</p>
          <h2 className="text-2xl md:text-3xl">Resumo operacional</h2>
        </div>
        <span className="text-xs text-muted-foreground">Atualizado com os registros da fazenda</span>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Link to="/tarefas" className="block">
          <Card className="h-full p-4 hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Tarefas pendentes</span>
              <ClipboardList className="h-4 w-4 text-primary" />
            </div>
            <p className="text-3xl font-bold tabular-nums mt-2">{data.pendentes.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.atrasadas.length} atrasada(s) · {data.paraHoje.length} para hoje</p>
          </Card>
        </Link>
        <Link to="/estoque" className="block">
          <Card className="h-full p-4 hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Estoque no mínimo</span>
              <Package className="h-4 w-4 text-primary" />
            </div>
            <p className="text-3xl font-bold tabular-nums mt-2">{data.criticos.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Itens que precisam de conferência</p>
          </Card>
        </Link>
        <Link to="/financeiro" className="block">
          <Card className="h-full p-4 hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Contas em aberto</span>
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold tabular-nums mt-2">{brl(data.valorAberto)}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.contasAbertas.length} lançamento(s) não pago(s)</p>
          </Card>
        </Link>
        <Link to="/granja" className="block">
          <Card className="h-full p-4 hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Lotes em andamento</span>
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
            <p className="text-3xl font-bold tabular-nums mt-2">{data.ativas.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Produção ativa cadastrada</p>
          </Card>
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4 md:p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" /><h3 className="text-xl">Próximas tarefas</h3></div>
            <Link to="/tarefas" className="text-xs text-primary inline-flex items-center gap-1">Ver todas <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${data.taxa}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mb-3">{data.taxa}% das tarefas cadastradas concluídas</p>
          {data.proximas.length ? <ul className="space-y-2">
            {data.proximas.map((t) => {
              const atrasada = !!t.vencimento && t.vencimento < hoje;
              return <li key={t.id} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                <span className={`h-2 w-2 rounded-full shrink-0 ${atrasada || t.prioridade === "alta" ? "bg-destructive" : t.prioridade === "media" ? "bg-warning" : "bg-muted-foreground"}`} />
                <span className="text-sm min-w-0 flex-1 truncate">{t.titulo}</span>
                {atrasada ? <Badge variant="destructive">Atrasada</Badge> : t.vencimento === hoje ? <Badge variant="secondary">Hoje</Badge> : t.vencimento ? <span className="text-[11px] text-muted-foreground">{t.vencimento.split("-").reverse().join("/")}</span> : null}
              </li>;
            })}
          </ul> : <p className="text-sm text-muted-foreground py-4">Tudo em dia. Nenhuma tarefa pendente.</p>}
          <Button asChild variant="outline" size="sm" className="w-full mt-4"><Link to="/tarefas">Gerenciar tarefas</Link></Button>
        </Card>

        <Card className="p-4 md:p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-primary" /><h3 className="text-xl">Pontos de atenção</h3></div>
            <span className="text-xs text-muted-foreground">{data.atrasadas.length + data.criticos.length} alerta(s)</span>
          </div>
          <div className="space-y-2">
            {data.atrasadas.slice(0, 3).map((t) => <Link key={t.id} to="/tarefas" className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" /><span className="text-sm"><strong className="block">Tarefa atrasada</strong>{t.titulo}</span>
            </Link>)}
            {data.criticos.slice(0, 4).map((i) => <Link key={i.id} to="/estoque" className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
              <Package className="h-4 w-4 text-warning-foreground mt-0.5 shrink-0" /><span className="text-sm min-w-0"><strong className="block">Estoque no mínimo</strong>{i.nome}: {i.quantidade} {i.unidade} (mínimo {i.minimo})</span>
            </Link>)}
            {!data.atrasadas.length && !data.criticos.length && <div className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">Nenhum alerta de tarefa atrasada ou estoque mínimo. Continue registrando as conferências.</div>}
            {data.contasAbertas.length > 0 && <Link to="/financeiro" className="flex items-start gap-2 rounded-lg border border-border p-3">
              <Receipt className="h-4 w-4 text-primary mt-0.5 shrink-0" /><span className="text-sm"><strong className="block">Financeiro</strong>{data.contasAbertas.length} conta(s) em aberto · {brl(data.valorAberto)}</span>
            </Link>}
          </div>
        </Card>
      </div>

      <Card className="p-4 md:p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /><h3 className="text-xl">Diário recente</h3></div>
          <Link to="/diario" className="text-xs text-primary inline-flex items-center gap-1">Abrir diário <ArrowRight className="h-3 w-3" /></Link>
        </div>
        {data.recentes.length ? <div className="grid sm:grid-cols-3 gap-2">
          {data.recentes.map((d) => <Link key={d.id} to="/diario" className="rounded-lg border border-border p-3 hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between gap-2"><Badge variant="outline" className="capitalize">{d.categoria}</Badge><span className="text-[11px] text-muted-foreground">{d.data.split("-").reverse().join("/")}</span></div>
            <p className="font-semibold text-sm mt-2 line-clamp-1">{d.titulo}</p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.texto || "Sem descrição adicional."}</p>
            {d.fotos.length > 0 && <p className="text-[11px] text-primary mt-2">{d.fotos.length} foto(s) anexada(s)</p>}
          </Link>)}
        </div> : <p className="text-sm text-muted-foreground py-3">Nenhum registro no diário ainda. Use o diário para documentar ocorrências, serviços e observações.</p>}
      </Card>
    </section>
  );
}
