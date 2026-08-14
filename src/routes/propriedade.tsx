import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useResumoPropriedade } from "@/lib/varsSistema";
import { Bird, Milk, Scale, Wallet, RefreshCw, ArrowRight, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/propriedade")({
  head: () => ({
    meta: [
      { title: "Visão da Propriedade — AgroSítio" },
      { name: "description", content: "Painel unificado das três atividades: frango de corte, gado de leite e gado de engorda, com o resultado financeiro do mês." },
      { property: "og:title", content: "Visão da Propriedade — AgroSítio" },
      { property: "og:description", content: "Frango, leite e engorda em um só painel, com indicadores ao vivo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Propriedade,
});

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const nb = (n: number, d = 1) => n.toLocaleString("pt-BR", { maximumFractionDigits: d });

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{valor}</span>
    </div>
  );
}

function Propriedade() {
  const { resumo, loading, recarregar } = useResumoPropriedade(60_000);
  const { granja, leite, engorda, financeiro } = resumo;

  const atividades = [
    { on: granja.alojadas > 0, label: "Frango de corte" },
    { on: leite.rebanho > 0, label: "Gado de leite" },
    { on: engorda.cabecas > 0, label: "Gado de engorda" },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Visão da Propriedade</h1>
            <p className="text-sm text-muted-foreground mt-1">Três atividades em um só painel, atualizado a cada minuto.</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={recarregar} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </header>

        <div className="flex flex-wrap gap-2">
          {atividades.map((a) => (
            <Badge key={a.label} variant={a.on ? "default" : "secondary"} className="text-[11px]">
              {a.label}{a.on ? "" : " · sem dados"}
            </Badge>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <section className="card-elevated p-4">
            <div className="flex items-center gap-2">
              <Bird className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Frango de corte</h2>
            </div>
            <p className="text-2xl font-display font-bold mt-2 tabular-nums">{nb(granja.vivas, 0)} <span className="text-sm font-normal text-muted-foreground">aves vivas</span></p>
            <div className="mt-3">
              <Linha label="Lote ativo" valor={granja.lote ?? "—"} />
              <Linha label="Alojadas" valor={nb(granja.alojadas, 0)} />
              <Linha label="Idade" valor={`${granja.dias} dias`} />
              <Linha label="Peso médio" valor={`${nb(granja.pesoMedio, 3)} kg`} />
              <Linha label="Mortalidade" valor={`${nb(granja.mortalidadePct, 2)} %`} />
            </div>
            <Button asChild variant="ghost" size="sm" className="mt-3 gap-1 px-0">
              <Link to="/granja">Abrir granja <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </section>

          <section className="card-elevated p-4">
            <div className="flex items-center gap-2">
              <Milk className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Gado de leite</h2>
            </div>
            <p className="text-2xl font-display font-bold mt-2 tabular-nums">{nb(leite.litrosHoje)} <span className="text-sm font-normal text-muted-foreground">L hoje</span></p>
            <div className="mt-3">
              <Linha label="Litros no mês" valor={`${nb(leite.litrosMes)} L`} />
              <Linha label="Rebanho ativo" valor={nb(leite.rebanho, 0)} />
              <Linha label="Em lactação" valor={nb(leite.vacasLactacao, 0)} />
              <Linha label="Média por vaca" valor={`${nb(leite.mediaVaca, 2)} L/dia`} />
            </div>
            <Button asChild variant="ghost" size="sm" className="mt-3 gap-1 px-0">
              <Link to="/leite">Abrir leite <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </section>

          <section className="card-elevated p-4">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Gado de engorda</h2>
            </div>
            <p className="text-2xl font-display font-bold mt-2 tabular-nums">{nb(engorda.cabecas, 0)} <span className="text-sm font-normal text-muted-foreground">cabeças</span></p>
            <div className="mt-3">
              <Linha label="Lotes abertos" valor={nb(engorda.lotes, 0)} />
              <Linha label="Peso médio" valor={`${nb(engorda.pesoMedio)} kg`} />
              <Linha label="GMD" valor={`${nb(engorda.gmd, 3)} kg/dia`} />
              <Linha label="Arrobas no pasto" valor={`${nb(engorda.arrobasTotais)} @`} />
            </div>
            <Button asChild variant="ghost" size="sm" className="mt-3 gap-1 px-0">
              <Link to="/engorda">Abrir engorda <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </section>
        </div>

        <section className="card-elevated p-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Resultado do mês</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 mt-3">
            <div className="rounded-xl border border-border/60 p-3">
              <p className="text-xs text-muted-foreground">Receitas</p>
              <p className="text-lg font-bold tabular-nums text-emerald-500">{brl(financeiro.receitasMes)}</p>
            </div>
            <div className="rounded-xl border border-border/60 p-3">
              <p className="text-xs text-muted-foreground">Despesas</p>
              <p className="text-lg font-bold tabular-nums text-destructive">{brl(financeiro.despesasMes)}</p>
            </div>
            <div className="rounded-xl border border-border/60 p-3">
              <p className="text-xs text-muted-foreground">Saldo</p>
              <p className={`text-lg font-bold tabular-nums ${financeiro.saldoMes >= 0 ? "text-emerald-500" : "text-destructive"}`}>{brl(financeiro.saldoMes)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/financeiro"><Wallet className="h-4 w-4" /> Finanças</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/planilhas"><TrendingUp className="h-4 w-4" /> Planilhas Inteligentes</Link>
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
