import { Link } from "@tanstack/react-router";
import {
  AlertOctagon,
  ArrowRight,
  CheckCircle2,
  Info,
  Layers,
  Scale,
  TriangleAlert,
  Wheat,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Cortes, calcularFases, diagnosticarDesempenho } from "@/lib/racao-desempenho";

const kg = (n: number) => `${Math.max(0, Math.round(n)).toLocaleString("pt-BR")} kg`;
const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const dataCurta = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

export function FasesRacaoPanel({
  fases,
  cortes,
  onCortes,
  estoqueKg,
}: {
  fases: ReturnType<typeof calcularFases>;
  cortes: Cortes;
  onCortes: (c: Cortes) => void;
  estoqueKg: number;
}) {
  const maxKg = Math.max(1, ...fases.fases.map((f) => f.kgTotal));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Resumo
          titulo="Fase atual"
          valor={fases.atual?.nome ?? "—"}
          sub={fases.atual ? `D${fases.atual.inicioDia}–D${fases.atual.fimDia}` : ""}
        />
        <Resumo
          titulo="Troca de ração em"
          valor={fases.diasParaTroca === null ? "—" : `${fases.diasParaTroca} dia(s)`}
          sub={
            fases.proxima
              ? `para ${fases.proxima.nome} em ${dataCurta(fases.proxima.inicio)}`
              : "última fase"
          }
        />
        <Resumo
          titulo="Próxima carga deve ser"
          valor={fases.faseProximaCarga?.nome ?? "—"}
          sub="fase em vigor quando o silo esvaziar"
          destaque
        />
        <Resumo
          titulo="Ainda a comprar até o abate"
          valor={kg(fases.aComprarKg)}
          sub={`${kg(fases.restanteLoteKg)} a consumir − ${kg(estoqueKg)} no silo`}
        />
      </div>

      {fases.proxima && fases.sobraFaseAtualKg > 500 && (
        <Card className="flex items-start gap-3 border-warning/50 bg-warning/10 p-4 text-sm">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning-foreground" />
          <div>
            <p className="font-semibold">
              Sobra prevista de {kg(fases.sobraFaseAtualKg)} de ração{" "}
              {fases.atual?.nome.toLowerCase()}
            </p>
            <p className="text-muted-foreground">
              O silo tem mais ração do que as aves comem até a troca. Ela será consumida no começo
              da fase {fases.proxima.nome.toLowerCase()}: combine com a integradora e evite pedir
              mais desta fase.
            </p>
          </div>
        </Card>
      )}
      {fases.proxima && fases.sobraFaseAtualKg < 0 && (
        <Card className="flex items-start gap-3 border-primary/30 bg-primary/5 p-4 text-sm">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p>
            Faltam <strong>{kg(-fases.sobraFaseAtualKg)}</strong> de ração{" "}
            {fases.atual?.nome.toLowerCase()} para chegar até a troca em{" "}
            {dataCurta(fases.atual!.fim)}.
          </p>
        </Card>
      )}

      <Card className="p-4 md:p-5">
        <h3 className="mb-4 flex items-center gap-2 font-semibold">
          <Layers className="h-4 w-4 text-primary" /> Programa de ração do lote
        </h3>
        <ol className="space-y-3">
          {fases.fases.map((f) => (
            <li
              key={f.id}
              className={`rounded-xl border p-3 ${f.status === "atual" ? "border-primary/40 bg-primary/5" : "border-border"}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">
                  {f.nome}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    D{f.inicioDia}–D{f.fimDia} · {dataCurta(f.inicio)} a{" "}
                    {dataCurta(new Date(f.fim.getTime() - 1))}
                  </span>
                </p>
                <span
                  className={`text-[11px] font-bold uppercase ${f.status === "atual" ? "text-primary" : f.status === "concluida" ? "text-muted-foreground" : "text-foreground/70"}`}
                >
                  {f.status === "atual"
                    ? "Em andamento"
                    : f.status === "concluida"
                      ? "Concluída"
                      : "Próxima"}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/30"
                  style={{ width: `${(f.kgTotal / maxKg) * 100}%` }}
                >
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${f.kgTotal > 0 ? ((f.kgTotal - f.kgRestante) / f.kgTotal) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
                Total estimado {kg(f.kgTotal)}
                {f.kgRestante > 0 ? ` · faltam ${kg(f.kgRestante)}` : ""}
              </p>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="p-4">
        <p className="mb-3 text-sm font-semibold">
          Dia final de cada fase (conforme a integradora)
        </p>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ["pre", "Pré-inicial até"],
              ["ini", "Inicial até"],
              ["cre", "Crescimento até"],
            ] as const
          ).map(([k, l]) => (
            <div key={k} className="space-y-1.5">
              <Label className="text-xs">{l}</Label>
              <Input
                type="number"
                min={1}
                value={cortes[k]}
                onChange={(e) =>
                  onCortes({ ...cortes, [k]: Math.max(1, Number(e.target.value) || 1) })
                }
              />
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Quilos pelo mesmo modelo de consumo do silo (peso das aves, mortalidade e pesagens do
          silo). Terminação vai até a previsão de abate do lote.
        </p>
      </Card>
    </div>
  );
}

export function ConversaoPesoPanel({
  diag,
  caEstimada,
  caRef,
  consumoMedido,
  difPesoPct,
  precoRacaoKg,
  onPreco,
}: {
  diag: ReturnType<typeof diagnosticarDesempenho>;
  caEstimada: number;
  caRef: number;
  consumoMedido: boolean;
  difPesoPct: number | null;
  precoRacaoKg: number;
  onPreco: (v: number) => void;
}) {
  const icone = { alta: AlertOctagon, media: TriangleAlert, ok: CheckCircle2 };
  const tom = {
    alta: "border-destructive/40 bg-destructive/5",
    media: "border-warning/50 bg-warning/10",
    ok: "border-success/40 bg-success/5",
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Resumo
          titulo={consumoMedido ? "CA (silo calibrado)" : "CA estimada"}
          valor={caEstimada > 0 ? caEstimada.toFixed(3).replace(".", ",") : "—"}
          sub={`referência ${caRef.toFixed(3).replace(".", ",")}${consumoMedido ? "" : " · não medida"}`}
        />
        <Resumo
          titulo="Peso × referência"
          valor={
            difPesoPct === null
              ? "—"
              : `${difPesoPct > 0 ? "+" : ""}${difPesoPct.toFixed(1).replace(".", ",")}%`
          }
          sub="na última pesagem"
        />
        <Resumo
          titulo="Cada 0,01 de CA vale"
          valor={brl(diag.reaisPorCentesimo)}
          sub={`${kg(diag.kgPorCentesimo)} de ração no lote`}
          destaque
        />
        <Resumo
          titulo="Desvio de CA hoje"
          valor={
            diag.custoDesvioCA === null
              ? "—"
              : `${diag.custoDesvioCA > 0 ? "+" : ""}${brl(diag.custoDesvioCA)}`
          }
          sub={
            diag.deltaCA === null
              ? "pese o silo para medir o consumo"
              : `${diag.deltaCA > 0 ? "+" : ""}${diag.deltaCA.toFixed(3).replace(".", ",")} vs referência`
          }
        />
      </div>

      <div className="space-y-3">
        {diag.causas.map((c) => {
          const Icon = icone[c.gravidade];
          return (
            <Card key={c.id} className={`p-4 ${tom[c.gravidade]}`}>
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold">{c.titulo}</p>
                  <p className="text-sm text-muted-foreground">{c.detalhe}</p>
                  <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {c.acoes.map((a) => (
                      <li key={a} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {a}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="grid gap-3 p-4 sm:grid-cols-[200px_1fr] sm:items-end">
        <div className="space-y-1.5">
          <Label className="text-xs">Preço da ração (R$/kg)</Label>
          <Input
            type="number"
            step={0.01}
            min={0}
            value={precoRacaoKg}
            onChange={(e) => onPreco(Math.max(0, Number(e.target.value) || 0))}
          />
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            to="/pesagem-pro"
            className="inline-flex items-center gap-1 font-semibold text-primary"
          >
            <Scale className="h-4 w-4" /> Pesar aves <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            to="/entregas-racao"
            className="inline-flex items-center gap-1 font-semibold text-primary"
          >
            <Wheat className="h-4 w-4" /> Lançar entrega <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </Card>
      <p className="text-[11px] text-muted-foreground">
        A CA só é tratada como real quando o silo tem pesagens físicas calibrando o consumo. Sem
        isso, o diagnóstico usa o peso medido das aves e pede a pesagem do silo antes de concluir
        sobre consumo. O preço é compartilhado com o Planejamento de abate.
      </p>
    </div>
  );
}

function Resumo({
  titulo,
  valor,
  sub,
  destaque = false,
}: {
  titulo: string;
  valor: string;
  sub: string;
  destaque?: boolean;
}) {
  return (
    <Card className={`avi-metric-3d p-4 ${destaque ? "border-primary/30 bg-primary/5" : ""}`}>
      <p className="text-[11px] font-semibold uppercase text-muted-foreground">{titulo}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{valor}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </Card>
  );
}
