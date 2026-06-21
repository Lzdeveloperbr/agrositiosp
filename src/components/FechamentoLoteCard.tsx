import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wheat, Calculator, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { fechamentoLote, curvaRacaoPorFase, type CustosLote } from "@/lib/fechamentoLote";
import { gerarFechamentoPDF } from "@/lib/pdf";
import type { Lote } from "@/lib/types";

interface Props { lote: Lote; estoqueRacaoKg?: number }

export function FechamentoLoteCard({ lote, estoqueRacaoKg = 0 }: Props) {
  const [custos, setCustos] = useState<CustosLote>({ precoPintinho: 2.8, precoRacaoKg: 2.5, outrosCustos: 0 });
  const f = fechamentoLote(lote, "cobb500", custos);
  const fases = curvaRacaoPorFase("cobb500");
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  const racaoTotalLote = (fases.reduce((s, fa) => s + fa.gPorAve, 0) / 1000) * lote.quantidadeInicial;
  const faltaRacao = Math.max(0, f.racaoRestanteKg - estoqueRacaoKg);

  return (
    <div className="space-y-4">
      {/* Fechamento financeiro */}
      <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-display font-semibold text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" /> Fechamento financeiro
          </h2>
          <Button size="sm" variant="outline" onClick={() => gerarFechamentoPDF(lote, f, fases)}>
            <FileText className="h-4 w-4 mr-1" /> Exportar PDF
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <Field label="R$ por pintinho">
            <Input type="number" step="0.01" value={custos.precoPintinho}
              onChange={(e) => setCustos({ ...custos, precoPintinho: Number(e.target.value) || 0 })} />
          </Field>
          <Field label="R$ por kg de ração">
            <Input type="number" step="0.01" value={custos.precoRacaoKg}
              onChange={(e) => setCustos({ ...custos, precoRacaoKg: Number(e.target.value) || 0 })} />
          </Field>
          <Field label="Outros custos (R$)">
            <Input type="number" step="0.01" value={custos.outrosCustos}
              onChange={(e) => setCustos({ ...custos, outrosCustos: Number(e.target.value) || 0 })} />
          </Field>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Linha label="Receita estimada" valor={fmt(f.receitaEstimada)} tom="primary" />
          <Linha label="Custo pintinhos" valor={fmt(f.custoPintinhos)} />
          <Linha label="Custo ração" valor={fmt(f.custoRacao)} />
          <Linha label="Outros custos" valor={fmt(f.custoOutros)} />
          <Linha label="Custo total" valor={fmt(f.custoTotal)} tom="destructive" />
          <Linha label={f.lucroLiquido >= 0 ? "Lucro líquido" : "Prejuízo"} valor={fmt(f.lucroLiquido)} tom={f.lucroLiquido >= 0 ? "accent" : "destructive"} grande />
          <Linha label="Margem" valor={`${f.margemPct.toFixed(1)}%`} tom={f.margemPct >= 0 ? "accent" : "destructive"} />
          <Linha label="R$ por ave viva" valor={fmt(f.lucroPorAve)} tom={f.lucroPorAve >= 0 ? "primary" : "destructive"} />
        </div>
      </Card>

      {/* Curva de ração */}
      <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-display font-semibold text-lg flex items-center gap-2">
            <Wheat className="h-5 w-5 text-primary" /> Curva de ração automática
          </h2>
          <Badge variant="outline">Total ~{(racaoTotalLote / 1000).toFixed(1)} t no lote</Badge>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {fases.map((fa) => {
            const totalKg = (fa.gPorAve / 1000) * lote.quantidadeInicial;
            return (
              <div key={fa.nome} className="rounded-lg p-3 border border-border/60 bg-card/40">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{fa.nome}</p>
                <p className="text-xs text-muted-foreground">D{fa.diaInicio}–D{fa.diaFim}</p>
                <p className="font-display font-bold text-lg mt-1">{fa.gPorAve} g/ave</p>
                <p className="text-xs text-muted-foreground">{(totalKg / 1000).toFixed(2)} t no lote</p>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg p-3 border border-border/60 bg-muted/30 grid sm:grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Consumido até hoje</p>
            <p className="font-semibold tabular-nums">{f.racaoConsumidaKg.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Restante até abate</p>
            <p className="font-semibold tabular-nums">{f.racaoRestanteKg.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Em estoque</p>
            <p className="font-semibold tabular-nums">{estoqueRacaoKg.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg</p>
          </div>
        </div>

        {!lote.encerrado && (
          faltaRacao > 0 ? (
            <div className="mt-3 rounded-lg p-3 bg-destructive/10 border border-destructive/40 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm"><strong>Faltam {faltaRacao.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg</strong> de ração para chegar ao abate. Programe próxima entrega.</p>
            </div>
          ) : (
            <div className="mt-3 rounded-lg p-3 bg-success/10 border border-success/30 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
              <p className="text-sm">Estoque suficiente para chegar ao abate.</p>
            </div>
          )
        )}
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}

function Linha({ label, valor, tom, grande }: { label: string; valor: string; tom?: "primary" | "accent" | "destructive"; grande?: boolean }) {
  const cor = tom === "destructive" ? "text-destructive" : tom === "accent" ? "text-accent" : tom === "primary" ? "text-primary" : "text-foreground";
  return (
    <div className={`rounded-lg p-3 border border-border/60 ${grande ? "bg-primary/5 col-span-2" : "bg-card/40"}`}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`font-display font-bold tabular-nums ${grande ? "text-2xl" : "text-lg"} ${cor}`}>{valor}</p>
    </div>
  );
}
