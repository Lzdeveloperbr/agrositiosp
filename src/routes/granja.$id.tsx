import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useLotes, useEstoque } from "@/lib/state";
import { ArrowLeft, Plus, FileText, Trash2 } from "lucide-react";
import {
  ComposedChart,
  Bar,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { LancamentoRapido, abrirLancamentoRapido } from "@/components/LancamentoRapido";
import { gerarRelatorioLote } from "@/lib/pdf";
import { FechamentoLoteCard } from "@/components/FechamentoLoteCard";
import { toast } from "sonner";
import { addDias, diffDias, fmtData, hojeISO, parseData } from "@/lib/data";
import { calcularResumoLote } from "@/lib/granja";
import { refPesoG } from "@/lib/silo";

export const Route = createFileRoute("/granja/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes do Lote — Aviário Pro" },
      {
        name: "description",
        content:
          "Lote de frango: mortalidade diária, peso médio, ração, água e conversão alimentar.",
      },
      { property: "og:title", content: "Detalhes do Lote — Aviário Pro" },
      {
        property: "og:description",
        content:
          "Lote de frango: mortalidade diária, peso médio, ração, água e conversão alimentar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoteDetalhe,
  notFoundComponent: () => (
    <AppShell>
      <p>Lote não encontrado.</p>
    </AppShell>
  ),
});

function LoteDetalhe() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [lotes, setLotes] = useLotes();
  const [estoque] = useEstoque();
  const lote = lotes.find((l) => l.id === id);
  const estoqueRacaoKg = estoque
    .filter((i) => i.categoria === "racao" && i.loteId === id)
    .reduce((s, i) => s + (i.quantidade || 0), 0);

  if (!lote) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Lote não encontrado.</p>
        <Button asChild variant="link">
          <Link to="/granja">Voltar</Link>
        </Button>
      </AppShell>
    );
  }

  const resumo = calcularResumoLote(lote);
  const totalMort = resumo.mortalidade;
  const totalElim = resumo.eliminados;
  const vivas = resumo.vivas;
  // Idade começa em D0 (dia do alojamento)
  const dias = Math.max(0, diffDias(lote.dataEntrada));
  const ultPeso = resumo.ultimaPesagem?.pesoG ?? 0;
  const pesoTotalKg = (vivas * ultPeso) / 1000;
  const previsao = addDias(lote.dataEntrada, lote.previsaoAbateDias);

  const removerEntry = (idx: number) => {
    setLotes((prev) =>
      prev.map((l) => (l.id === id ? { ...l, entries: l.entries.filter((_, i) => i !== idx) } : l)),
    );
  };

  const encerrar = () => {
    if (!confirm("Encerrar este lote?")) return;
    setLotes((prev) => prev.map((l) => (l.id === id ? { ...l, encerrado: !l.encerrado } : l)));
  };

  const removerLote = () => {
    if (!confirm("Excluir este lote?")) return;
    setLotes((prev) => prev.filter((l) => l.id !== id));
    navigate({ to: "/granja" });
  };

  const ultimaIdade = Math.max(dias + 7, lote.previsaoAbateDias || 42);
  const chartData = Array.from({ length: Math.min(61, ultimaIdade + 1) }, (_, idade) => {
    const data = addDias(lote.dataEntrada, idade);
    const registro = lote.entries.find((e) => e.date === data);
    const baixas = registro
      ? (Number(registro.mortalidade) || 0) + (Number(registro.eliminados) || 0)
      : null;
    return {
      dia: `D${idade}`,
      peso: registro?.pesoMedioG ?? null,
      esperado: Math.round(refPesoG(idade, lote.linhagem ?? "ross_ap95", lote.sexo ?? "misto")),
      projetado: Math.round(resumo.projetarPesoG(idade)),
      baixas,
    };
  });

  return (
    <AppShell>
      <LancamentoRapido />
      <div className="space-y-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2">
            <Link to="/granja">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Link>
          </Button>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-display font-bold">Lote {lote.numero}</h1>
                {lote.encerrado ? (
                  <Badge variant="secondary">Encerrado</Badge>
                ) : (
                  <Badge>Ativo</Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-1">
                Entrada {fmtData(lote.dataEntrada)} · D{dias} · {lote.integradora}
              </p>
              <p className="text-xs text-muted-foreground">
                Previsão de abate: {fmtData(previsao)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => gerarRelatorioLote(lote)}>
                <FileText className="h-4 w-4 mr-1" /> PDF
              </Button>
              <Button variant="outline" onClick={encerrar}>
                {lote.encerrado ? "Reabrir" : "Encerrar"}
              </Button>
              <Button variant="ghost" size="icon" onClick={removerLote}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI label="Inicial" value={lote.quantidadeInicial.toLocaleString("pt-BR")} />
          <KPI label="Vivas" value={vivas.toLocaleString("pt-BR")} />
          <KPI
            label="Mort.+Elim."
            value={`${resumo.mortalidadePct.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`}
          />
          <KPI
            label="Peso esperado"
            value={`${resumo.pesoEsperadoHojeG.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} g`}
          />
          <KPI
            label="Peso medido"
            value={
              resumo.ultimaPesagem ? `${resumo.ultimaPesagem.pesoG.toLocaleString("pt-BR")} g` : "—"
            }
          />
          <KPI
            label="Diferença da meta"
            value={
              resumo.diferencaPesoPct == null
                ? "—"
                : `${resumo.diferencaPesoPct > 0 ? "+" : ""}${resumo.diferencaPesoPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
            }
          />
          <KPI
            label="GPD recente"
            value={
              resumo.gpdRecente == null
                ? "—"
                : `${resumo.gpdRecente.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} g/dia`
            }
          />
          <KPI
            label="Consumo esperado"
            value={`${resumo.consumoEsperadoKg.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg`}
          />
        </div>

        <section aria-label="Previsão de peso dos próximos dias" className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display font-semibold text-lg">Peso previsto · próximos dias</h2>
            <p className="text-xs text-muted-foreground">
              {resumo.ultimaPesagem
                ? `Atualizado pela pesagem de ${fmtData(resumo.ultimaPesagem.data)}`
                : "Padrão da linhagem até registrar uma pesagem"}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 3, 7].map((avanco) => (
              <div key={avanco} className="border border-border p-3 rounded-md min-w-0">
                <p className="text-xs text-muted-foreground">
                  D{dias + avanco} · +{avanco} {avanco === 1 ? "dia" : "dias"}
                </p>
                <p className="font-display font-bold text-lg tabular-nums">
                  {Math.round(resumo.projetarPesoG(dias + avanco)).toLocaleString("pt-BR")} g
                </p>
                <p className="text-xs text-muted-foreground">
                  Padrão{" "}
                  {Math.round(refPesoG(dias + avanco, "ross_ap95", "misto")).toLocaleString(
                    "pt-BR",
                  )}{" "}
                  g
                </p>
              </div>
            ))}
          </div>
        </section>

        {!lote.encerrado && (resumo.diasSemPesar > 3 || resumo.situacao === "critico") && (
          <Card className="p-4 border-warning/40 bg-warning/10">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm">Ação recomendada para melhorar a precisão</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {resumo.diasSemPesar > 3
                    ? `A última pesagem tem ${resumo.diasSemPesar} dias. Pese uma amostra hoje para atualizar manejo, projeção de abate e silo.`
                    : `O peso está ${Math.abs(resumo.diferencaPesoPct ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% abaixo da curva. Revise água, ração, ambiência e uniformidade.`}
                </p>
              </div>
              <Button asChild size="sm">
                <Link to="/manejo">Abrir manejo</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/silo">Ver silo</Link>
              </Button>
            </div>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="p-5 lg:col-span-2" style={{ background: "var(--gradient-surface)" }}>
            <h2 className="font-display font-semibold text-lg mb-3">Linha do tempo</h2>
            {chartData.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={chartData} margin={{ top: 8, right: 0, left: -12, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    opacity={0.5}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="dia"
                    fontSize={11}
                    stroke="var(--muted-foreground)"
                    interval="preserveStartEnd"
                    minTickGap={18}
                  />
                  <YAxis
                    yAxisId="g"
                    fontSize={11}
                    stroke="var(--muted-foreground)"
                    tickFormatter={(v) => Number(v).toLocaleString("pt-BR")}
                  />
                  <YAxis
                    yAxisId="b"
                    orientation="right"
                    fontSize={11}
                    stroke="var(--destructive)"
                    allowDecimals={false}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                    formatter={(v: number, n: string) => [
                      n === "Baixas do dia"
                        ? `${v} aves`
                        : `${Number(v).toLocaleString("pt-BR")} g`,
                      n,
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    yAxisId="b"
                    dataKey="baixas"
                    name="Baixas do dia"
                    fill="var(--destructive)"
                    fillOpacity={0.55}
                    radius={[2, 2, 0, 0]}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="g"
                    type="monotone"
                    dataKey="esperado"
                    stroke="var(--muted-foreground)"
                    strokeDasharray="5 5"
                    strokeWidth={1.5}
                    dot={false}
                    name="Referência (g)"
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="g"
                    type="monotone"
                    dataKey="projetado"
                    stroke="var(--chart-2)"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    dot={false}
                    name="Previsto (g)"
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="g"
                    type="monotone"
                    dataKey="peso"
                    stroke="var(--primary)"
                    strokeWidth={0}
                    dot={{ r: 4, fill: "var(--primary)" }}
                    connectNulls={false}
                    name="Pesado (g)"
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-12 text-center">
                Sem lançamentos ainda.
              </p>
            )}
          </Card>

          <HojeCard lote={lote} />
        </div>

        <ConfigRemuneracao loteId={lote.id} vivas={vivas} pesoVivoKg={pesoTotalKg} />

        <FechamentoLoteCard lote={lote} estoqueRacaoKg={estoqueRacaoKg} />

        <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
          <h2 className="font-display font-semibold text-lg mb-3">Histórico</h2>
          {lote.entries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhum lançamento.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase tracking-wider">
                  <tr className="border-b border-border">
                    <th className="text-left py-2">Data</th>
                    <th className="text-right py-2">Mort.</th>
                    <th className="text-right py-2">Elim.</th>
                    <th className="text-right py-2">Peso (g)</th>
                    <th className="text-left py-2 pl-4">Obs</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {[...lote.entries]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((e, idx) => {
                      const realIdx = lote.entries.indexOf(e);
                      return (
                        <tr key={idx} className="border-b border-border/50">
                          <td className="py-2">{fmtData(e.date)}</td>
                          <td className="py-2 text-right tabular-nums">{e.mortalidade}</td>
                          <td className="py-2 text-right tabular-nums">{e.eliminados ?? 0}</td>
                          <td className="py-2 text-right tabular-nums">{e.pesoMedioG ?? "—"}</td>
                          <td className="py-2 pl-4 text-muted-foreground">{e.observacoes ?? ""}</td>
                          <td className="py-2 text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removerEntry(realIdx)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3" style={{ background: "var(--gradient-surface)" }}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display font-bold text-xl tabular-nums">{value}</p>
    </Card>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function ConfigRemuneracao({
  loteId,
  vivas,
  pesoVivoKg,
}: {
  loteId: string;
  vivas: number;
  pesoVivoKg: number;
}) {
  const readNum = (k: string, def: number) => {
    if (typeof window === "undefined") return def;
    const v = localStorage.getItem(`granja:${k}:${loteId}`);
    return v !== null && v !== "" ? Number(v) : def;
  };
  const readStr = (k: string) => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(`granja:${k}:${loteId}`) || "";
  };
  const [precoAve, setPrecoAve] = useState(readNum("precoAve", 2.14));
  const [pctIntegrado, setPctIntegrado] = useState(readNum("pctIntegrado", 14));
  const [areaM2, setAreaM2] = useState(readNum("areaM2", 0));
  const [custoEnergia, setCustoEnergia] = useState(readNum("custoEnergia", 0));
  const [custoCama, setCustoCama] = useState(readNum("custoCama", 0));
  const [custoMaoObra, setCustoMaoObra] = useState(readNum("custoMaoObra", 0));
  const [custoOutros, setCustoOutros] = useState(readNum("custoOutros", 0));
  const [abateReal, setAbateReal] = useState(readStr("abateReal"));

  const save = () => {
    const set = (k: string, v: string | number) => {
      if (v === "" || v === 0) localStorage.removeItem(`granja:${k}:${loteId}`);
      else localStorage.setItem(`granja:${k}:${loteId}`, String(v));
    };
    set("precoAve", precoAve);
    set("pctIntegrado", pctIntegrado);
    set("areaM2", areaM2);
    set("custoEnergia", custoEnergia);
    set("custoCama", custoCama);
    set("custoMaoObra", custoMaoObra);
    set("custoOutros", custoOutros);
    if (abateReal) localStorage.setItem(`granja:abateReal:${loteId}`, abateReal);
    else localStorage.removeItem(`granja:abateReal:${loteId}`);
    toast.success("Configurações salvas");
  };

  const ganhoFrig = vivas * precoAve;
  const receita = ganhoFrig * (pctIntegrado / 100);
  const custos = custoEnergia + custoCama + custoMaoObra + custoOutros;
  const lucro = receita - custos;
  const densidade = areaM2 > 0 ? vivas / areaM2 : 0;

  return (
    <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
      <h2 className="font-display font-semibold text-lg mb-1">Configurações & remuneração</h2>
      <p className="text-xs text-muted-foreground mb-4">
        Usado no PDF do lote para calcular sua parte do ganho e recomendações.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Field label="Preço/ave frigorífico (R$)">
          <Input
            type="number"
            step="0.01"
            value={precoAve || ""}
            onChange={(e) => setPrecoAve(Number(e.target.value) || 0)}
            placeholder="2.14"
          />
        </Field>
        <Field label="% do integrado">
          <Input
            type="number"
            step="0.1"
            value={pctIntegrado || ""}
            onChange={(e) => setPctIntegrado(Number(e.target.value) || 0)}
            placeholder="14"
          />
        </Field>
        <Field label="Área útil (m²)">
          <Input
            type="number"
            value={areaM2 || ""}
            onChange={(e) => setAreaM2(Number(e.target.value) || 0)}
            placeholder="1200"
          />
        </Field>
        <Field label="Data real do abate">
          <Input type="date" value={abateReal} onChange={(e) => setAbateReal(e.target.value)} />
        </Field>
      </div>

      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
        Custos do granjeiro (R$)
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Field label="Energia elétrica">
          <Input
            type="number"
            value={custoEnergia || ""}
            onChange={(e) => setCustoEnergia(Number(e.target.value) || 0)}
            placeholder="0"
          />
        </Field>
        <Field label="Cama / maravalha">
          <Input
            type="number"
            value={custoCama || ""}
            onChange={(e) => setCustoCama(Number(e.target.value) || 0)}
            placeholder="0"
          />
        </Field>
        <Field label="Mão de obra">
          <Input
            type="number"
            value={custoMaoObra || ""}
            onChange={(e) => setCustoMaoObra(Number(e.target.value) || 0)}
            placeholder="0"
          />
        </Field>
        <Field label="Outros">
          <Input
            type="number"
            value={custoOutros || ""}
            onChange={(e) => setCustoOutros(Number(e.target.value) || 0)}
            placeholder="0"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <MiniStat
          label="Ganho frigorífico"
          value={`R$ ${ganhoFrig.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`}
          sub={`${vivas.toLocaleString("pt-BR")} × R$ ${precoAve.toFixed(2)}`}
        />
        <MiniStat
          label={`Sua parte (${pctIntegrado.toFixed(1)}%)`}
          value={`R$ ${receita.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`}
          tone="primary"
        />
        <MiniStat
          label="Lucro líquido"
          value={`R$ ${lucro.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`}
          sub={`− R$ ${custos.toLocaleString("pt-BR")} custos`}
          tone={lucro >= 0 ? "ok" : "bad"}
        />
        <MiniStat
          label="Densidade"
          value={
            densidade > 0
              ? `${densidade.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} aves/m²`
              : "—"
          }
          sub={areaM2 > 0 ? `${areaM2} m²` : "cadastre área"}
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={save}>Salvar configurações</Button>
        <span className="text-xs text-muted-foreground self-center">
          Peso vivo atual: {pesoVivoKg.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg ·
          R$/kg estimado: R$ {pesoVivoKg > 0 ? (receita / pesoVivoKg).toFixed(3) : "—"}
        </span>
      </div>
    </Card>
  );
}

function MiniStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "primary" | "ok" | "bad";
}) {
  const color =
    tone === "primary"
      ? "text-primary"
      : tone === "ok"
        ? "text-emerald-500"
        : tone === "bad"
          ? "text-destructive"
          : "";
  return (
    <div className="bg-muted/40 rounded-md p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-display font-bold text-lg tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

/** Resumo do dia do lote com acesso ao lançamento rápido (corrige o mesmo dia sem duplicar). */
function HojeCard({ lote }: { lote: import("@/lib/types").Lote }) {
  const hoje = hojeISO();
  const e = lote.entries.find((x) => x.date === hoje);
  const fechado = !!lote.encerrado;
  return (
    <Card className="flex flex-col p-5" style={{ background: "var(--gradient-surface)" }}>
      <h2 className="font-display font-semibold text-lg">Lançamento de hoje</h2>
      <p className="text-xs text-muted-foreground">
        D{Math.max(0, diffDias(lote.dataEntrada))} · {fmtData(hoje)}
      </p>
      {e ? (
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-muted/50 p-3">
            <dt className="text-xs text-muted-foreground">Mortalidade</dt>
            <dd className="text-2xl font-bold tabular-nums">{e.mortalidade}</dd>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <dt className="text-xs text-muted-foreground">Eliminados</dt>
            <dd className="text-2xl font-bold tabular-nums">{e.eliminados ?? 0}</dd>
          </div>
          {e.pesoMedioG ? (
            <div className="col-span-2 rounded-lg bg-muted/50 p-3">
              <dt className="text-xs text-muted-foreground">Peso médio</dt>
              <dd className="text-xl font-bold tabular-nums">
                {e.pesoMedioG.toLocaleString("pt-BR")} g
              </dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-warning/60 bg-warning/10 p-3 text-sm">
          Ainda não há lançamento hoje.
        </p>
      )}
      <Button
        className="mt-4 h-12 w-full text-base"
        disabled={fechado}
        onClick={() => abrirLancamentoRapido(lote.id)}
      >
        <Plus className="h-5 w-5" /> {e ? "Corrigir ou completar hoje" : "Lançar dados de hoje"}
      </Button>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Baixas, peso, temperatura, umidade, água e ração. Funciona sem sinal: o envio acontece
        quando a conexão voltar.
      </p>
    </Card>
  );
}
