import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAnimais } from "@/lib/state";
import { Stethoscope, Syringe, AlertTriangle, Calendar } from "lucide-react";

export const Route = createFileRoute("/veterinario")({
  head: () => ({
    meta: [
      { title: "Veterinário — AgroSítio" },
      { name: "description", content: "Painel veterinário: vacinas e medicamentos aplicados, próximas aplicações, histórico sanitário do rebanho e alertas." },
    ],
  }),
  component: VetPage,
});

type Evt = { id: string; brinco: string; nome?: string; data: string; tipo: string; produto: string; dose?: string; proximaData?: string; observacoes?: string; animalId: string };

function VetPage() {
  const [animais] = useAnimais();
  const hoje = new Date().toISOString().slice(0, 10);
  const em30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const eventos: Evt[] = useMemo(() =>
    animais.flatMap((a) => a.sanidade.map((s) => ({ ...s, brinco: a.brinco, nome: a.nome, animalId: a.id }))),
    [animais]
  );

  const proximas = eventos.filter((e) => e.proximaData && e.proximaData >= hoje && e.proximaData <= em30).sort((a, b) => a.proximaData!.localeCompare(b.proximaData!));
  const atrasadas = eventos.filter((e) => e.proximaData && e.proximaData < hoje).sort((a, b) => a.proximaData!.localeCompare(b.proximaData!));
  const recentes = [...eventos].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 30);

  // Resumo por produto
  const porProduto = eventos.reduce<Record<string, number>>((acc, e) => { acc[e.produto] = (acc[e.produto] || 0) + 1; return acc; }, {});
  const topProdutos = Object.entries(porProduto).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2"><Stethoscope className="h-6 w-6 text-primary" /> Veterinário</h1>
            <p className="text-muted-foreground text-sm">Calendário sanitário, próximas aplicações e histórico do rebanho.</p>
          </div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4"><div className="text-xs text-muted-foreground">Animais ativos</div><div className="text-2xl font-bold">{animais.filter((a) => a.status === "ativo").length}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Eventos totais</div><div className="text-2xl font-bold">{eventos.length}</div></Card>
          <Card className="p-4 border-accent/40"><div className="text-xs text-muted-foreground">Próximos 30d</div><div className="text-2xl font-bold text-accent">{proximas.length}</div></Card>
          <Card className="p-4 border-destructive/40"><div className="text-xs text-muted-foreground">Atrasadas</div><div className="text-2xl font-bold text-destructive">{atrasadas.length}</div></Card>
        </div>

        {atrasadas.length > 0 && (
          <Card className="p-4 border-destructive/40 bg-destructive/5">
            <h3 className="font-semibold flex items-center gap-2 mb-3"><AlertTriangle className="h-4 w-4 text-destructive" /> Aplicações atrasadas</h3>
            <div className="space-y-2">
              {atrasadas.map((e) => (
                <RowEvento key={e.id} e={e} dest />
              ))}
            </div>
          </Card>
        )}

        <Card className="p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><Calendar className="h-4 w-4 text-accent" /> Próximas 30 dias</h3>
          {proximas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma aplicação agendada.</p>
          ) : (
            <div className="space-y-2">{proximas.map((e) => <RowEvento key={e.id} e={e} />)}</div>
          )}
        </Card>

        {topProdutos.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Produtos mais usados</h3>
            <div className="flex flex-wrap gap-2">
              {topProdutos.map(([p, n]) => (
                <Badge key={p} variant="secondary" className="text-sm">{p} <span className="ml-1.5 opacity-70">×{n}</span></Badge>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Histórico recente</h3>
          {recentes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem eventos. Adicione vacinas/medicamentos no cadastro do animal.</p>
          ) : (
            <div className="space-y-2">{recentes.map((e) => <RowEvento key={e.id} e={e} hist />)}</div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function RowEvento({ e, dest, hist }: { e: Evt; dest?: boolean; hist?: boolean }) {
  return (
    <Link to="/gado/$id" params={{ id: e.animalId }} className="flex items-center gap-3 p-2.5 rounded-md hover:bg-muted/60 border border-border/60">
      <div className={`h-9 w-9 rounded-md flex items-center justify-center ${dest ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>
        <Syringe className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{e.produto} <span className="text-xs text-muted-foreground">({e.tipo})</span></div>
        <div className="text-xs text-muted-foreground truncate">Brinco {e.brinco}{e.nome ? ` · ${e.nome}` : ""}{e.dose ? ` · ${e.dose}` : ""}</div>
      </div>
      <div className="text-right text-xs">
        {hist ? <span>{e.data}</span> : <span className={dest ? "text-destructive font-semibold" : "text-accent font-semibold"}>{e.proximaData}</span>}
      </div>
    </Link>
  );
}
