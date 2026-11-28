import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleHelp,
  Gauge,
  Package,
  Ruler,
  Target,
  Truck,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLotes } from "@/lib/state";
import { calcularResumoLote } from "@/lib/granja";
import {
  dimensionar,
  planejarCarregamento,
  simularAbate,
  type DiaSimulado,
} from "@/lib/planejamento-abate";
import { addDias } from "@/lib/data";
import type { Lote } from "@/lib/types";

export const Route = createFileRoute("/planejamento-abate")({
  head: () => ({
    meta: [
      { title: "Planejamento de abate — Aviário Pro" },
      {
        name: "description",
        content:
          "Dia ótimo de abate por margem e IEP, densidade, cronograma de jejum, caixas, caminhões e dimensionamento do galpão.",
      },
      { property: "og:title", content: "Planejamento de abate — Aviário Pro" },
      {
        property: "og:description",
        content:
          "Simule o dia de abate, planeje o carregamento e confira o dimensionamento do galpão.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlanejamentoAbate,
});

type Config = {
  areaM2: number;
  limiteKgM2: number;
  precoKgVivo: number;
  precoRacaoKg: number;
  outrosCustos: number;
  vazioDias: number;
  dataApanha: string;
  horaApanha: string;
  jejumH: number;
  transporteEsperaH: number;
  avesPorHora: number;
  maxAvesCaixa: number;
  maxKgCaixa: number;
  caixasPorCaminhao: number;
  comedouros: number;
  bebedouros: number;
  exaustores: number;
  cfmExaustor: number;
};

const padrao = (lote: Lote): Config => ({
  areaM2: 0,
  limiteKgM2: 39,
  precoKgVivo: lote.precoKgVivo ?? 5.5,
  precoRacaoKg: 2.4,
  outrosCustos: 0,
  vazioDias: 14,
  dataApanha: addDias(lote.dataEntrada, lote.previsaoAbateDias || 42),
  horaApanha: "22:00",
  jejumH: 10,
  transporteEsperaH: 3,
  avesPorHora: 4000,
  maxAvesCaixa: 10,
  maxKgCaixa: 22,
  caixasPorCaminhao: 320,
  comedouros: 0,
  bebedouros: 0,
  exaustores: 0,
  cfmExaustor: 24000,
});

// Parâmetros do galpão e de mercado ficam no aparelho, por lote.
function useConfig(lote: Lote | null) {
  const key = lote ? `planejamento-abate:${lote.id}` : null;
  const [cfg, setCfg] = useState<Config | null>(null);
  useEffect(() => {
    if (!lote || !key) return setCfg(null);
    let salvo: Partial<Config> = {};
    try {
      salvo = JSON.parse(localStorage.getItem(key) || "{}");
    } catch {
      /* ignora */
    }
    // Área útil é a mesma cadastrada na página do lote (Configurações & remuneração).
    const areaLote = Number(localStorage.getItem(`granja:areaM2:${lote.id}`)) || 0;
    setCfg({
      ...padrao(lote),
      ...salvo,
      ...(!salvo.areaM2 && areaLote ? { areaM2: areaLote } : {}),
    });
  }, [lote, key]);
  const set = <K extends keyof Config>(k: K, v: Config[K]) =>
    setCfg((c) => {
      if (!c || !key) return c;
      const n = { ...c, [k]: v };
      try {
        localStorage.setItem(key, JSON.stringify(n));
        if (k === "areaM2" && lote) localStorage.setItem(`granja:areaM2:${lote.id}`, String(v));
      } catch {
        /* ignora */
      }
      return n;
    });
  return [cfg, set] as const;
}

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const num = (v: number, d = 0) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: d });
const hora = (d: Date) =>
  d.toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

function PlanejamentoAbate() {
  const [lotes] = useLotes();
  const ativos = useMemo(() => lotes.filter((l) => !l.encerrado), [lotes]);
  const [loteId, setLoteId] = useState<string | null>(null);
  const lote = ativos.find((l) => l.id === loteId) ?? ativos[0] ?? null;
  const [cfg, set] = useConfig(lote);
  const [hoje, setHoje] = useState<Date | null>(null);
  useEffect(() => setHoje(new Date()), []);

  const calc = useMemo(() => {
    if (!lote || !cfg || !hoje) return null;
    const resumo = calcularResumoLote(lote, undefined, undefined, hoje);
    const sim = simularAbate({
      idadeAtual: resumo.idade,
      avesVivas: resumo.vivas,
      avesAlojadas: lote.quantidadeInicial,
      linhagem: lote.linhagem ?? "ross_ap95",
      sexo: lote.sexo ?? "misto",
      projetarPesoG: resumo.projetarPesoG,
      precoKgVivo: cfg.precoKgVivo,
      precoRacaoKg: cfg.precoRacaoKg,
      outrosCustos: cfg.outrosCustos,
      vazioDias: cfg.vazioDias,
      areaM2: cfg.areaM2,
      limiteKgM2: cfg.limiteKgM2,
    });
    const [y, m, d] = cfg.dataApanha.split("-").map(Number);
    const [hh, mm] = cfg.horaApanha.split(":").map(Number);
    const inicioApanha = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0);
    const idadeApanha = Math.max(
      resumo.idade,
      Math.round(
        (new Date(y, (m || 1) - 1, d || 1).getTime() -
          new Date(lote.dataEntrada + "T00:00").getTime()) /
          86400000,
      ),
    );
    const diaApanha = sim.dias.find((x) => x.idade === idadeApanha);
    const avesApanha = diaApanha?.aves ?? resumo.vivas;
    const pesoApanha = resumo.projetarPesoG(idadeApanha);
    const carga = planejarCarregamento({
      inicioApanha,
      aves: avesApanha,
      pesoG: pesoApanha,
      jejumH: cfg.jejumH,
      transporteEsperaH: cfg.transporteEsperaH,
      avesPorHora: cfg.avesPorHora,
      maxAvesCaixa: cfg.maxAvesCaixa,
      maxKgCaixa: cfg.maxKgCaixa,
      caixasPorCaminhao: cfg.caixasPorCaminhao,
    });
    const dim = dimensionar({
      idade: resumo.idade,
      aves: resumo.vivas,
      pesoG: resumo.pesoProjetadoHojeG,
      areaM2: cfg.areaM2,
      comedouros: cfg.comedouros,
      bebedouros: cfg.bebedouros,
      exaustores: cfg.exaustores,
      cfmExaustor: cfg.cfmExaustor,
    });
    return { resumo, sim, carga, dim, idadeApanha, avesApanha, pesoApanha };
  }, [lote, cfg, hoje]);

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="hero-central reveal relative overflow-hidden rounded-2xl border border-border px-5 py-6 md:px-7">
          <p className="eyebrow inline-flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-primary" /> Decisão de abate
          </p>
          <h1 className="mt-1 text-3xl md:text-4xl">Planejamento de abate</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Simule o melhor dia de carregamento pela margem por dia de galpão ocupado e pelo IEP,
            respeitando a densidade. Depois monte o cronograma de jejum, caixas e caminhões.
          </p>
          {ativos.length > 1 && (
            <div className="mt-4 max-w-xs">
              <Select value={lote?.id} onValueChange={setLoteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Lote" />
                </SelectTrigger>
                <SelectContent>
                  {ativos.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      Lote {l.numero}
                      {l.galpao ? ` · ${l.galpao}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </header>

        {!lote ? (
          <Card className="p-6 text-sm text-muted-foreground">
            Nenhum lote ativo.{" "}
            <Link to="/granja" className="font-semibold text-primary">
              Cadastre um lote
            </Link>{" "}
            para planejar o abate.
          </Card>
        ) : !cfg || !calc ? (
          <div className="skeleton-shimmer h-96 rounded-xl border border-border" />
        ) : (
          <Tabs defaultValue="dia">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="dia">
                <Target className="mr-1 h-4 w-4" /> Dia ótimo
              </TabsTrigger>
              <TabsTrigger value="carga">
                <Truck className="mr-1 h-4 w-4" /> Carregamento
              </TabsTrigger>
              <TabsTrigger value="dim">
                <Ruler className="mr-1 h-4 w-4" /> Dimensionamento
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dia" className="mt-4 space-y-4">
              <Card className="p-4 md:p-5">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                  <Campo label="Área útil (m²)" v={cfg.areaM2} on={(v) => set("areaM2", v)} />
                  <Campo label="Limite kg/m²" v={cfg.limiteKgM2} on={(v) => set("limiteKgM2", v)} />
                  <Campo
                    label="R$/kg vivo"
                    v={cfg.precoKgVivo}
                    step={0.01}
                    on={(v) => set("precoKgVivo", v)}
                  />
                  <Campo
                    label="R$/kg ração"
                    v={cfg.precoRacaoKg}
                    step={0.01}
                    on={(v) => set("precoRacaoKg", v)}
                  />
                  <Campo
                    label="Outros custos (R$)"
                    v={cfg.outrosCustos}
                    on={(v) => set("outrosCustos", v)}
                  />
                  <Campo
                    label="Vazio sanitário (dias)"
                    v={cfg.vazioDias}
                    on={(v) => set("vazioDias", v)}
                  />
                </div>
              </Card>
              <Destaques sim={calc.sim} dataEntrada={lote.dataEntrada} />
              <Card className="p-4 md:p-5">
                <h3 className="mb-1 font-semibold">Margem por dia de ocupação × IEP</h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  Barras: margem sobre ração e custos ÷ (idade + vazio sanitário). Linha: IEP. Área
                  vermelha: densidade acima do limite.
                </p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={calc.sim.dias}
                      margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--color-border)"
                        vertical={false}
                      />
                      <XAxis dataKey="idade" tickFormatter={(v) => `D${v}`} fontSize={11} />
                      <YAxis
                        yAxisId="m"
                        fontSize={11}
                        tickFormatter={(v) => `${num(v / 1000, 1)} mil`}
                      />
                      <YAxis
                        yAxisId="i"
                        orientation="right"
                        fontSize={11}
                        domain={["dataMin - 10", "dataMax + 10"]}
                      />
                      <Tooltip
                        formatter={(v: number, n) => (n === "IEP" ? num(v) : brl(v))}
                        labelFormatter={(v) => `Abate no D${v}`}
                      />
                      {calc.sim.limiteDensidade !== null && (
                        <ReferenceArea
                          yAxisId="m"
                          x1={calc.sim.limiteDensidade}
                          x2={calc.sim.dias.at(-1)!.idade}
                          fill="var(--color-destructive)"
                          fillOpacity={0.07}
                        />
                      )}
                      <Bar
                        yAxisId="m"
                        dataKey="margemPorDia"
                        name="Margem/dia"
                        fill="var(--color-chart-1)"
                        radius={[3, 3, 0, 0]}
                        isAnimationActive={false}
                      />
                      <Line
                        yAxisId="i"
                        dataKey="iep"
                        name="IEP"
                        stroke="var(--color-chart-3)"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                      {calc.sim.melhorMargemDia && (
                        <ReferenceLine
                          yAxisId="m"
                          x={calc.sim.melhorMargemDia.idade}
                          stroke="var(--color-primary)"
                          strokeDasharray="4 4"
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60 text-xs text-muted-foreground">
                      <tr>
                        {[
                          "Dia",
                          "Data",
                          "Peso",
                          "Aves",
                          "kg vivo",
                          "kg/m²",
                          "CA ref.",
                          "Margem",
                          "Margem/dia",
                          "IEP",
                        ].map((h) => (
                          <th
                            key={h}
                            className="whitespace-nowrap px-3 py-2 text-left font-semibold"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="tabular-nums whitespace-nowrap">
                      {calc.sim.dias.map((d) => (
                        <tr
                          key={d.idade}
                          className={`border-t border-border ${d.idade === calc.sim.melhorMargemDia?.idade ? "bg-primary/10 font-semibold" : ""} ${d.acimaDensidade ? "text-destructive/80" : ""}`}
                        >
                          <td className="px-3 py-1.5">D{d.idade}</td>
                          <td className="px-3 py-1.5">
                            {addDias(lote.dataEntrada, d.idade)
                              .split("-")
                              .reverse()
                              .slice(0, 2)
                              .join("/")}
                          </td>
                          <td className="px-3 py-1.5">{num(d.pesoG)} g</td>
                          <td className="px-3 py-1.5">{num(d.aves)}</td>
                          <td className="px-3 py-1.5">{num(d.kgVivo)}</td>
                          <td className="px-3 py-1.5">{d.kgM2 === null ? "—" : num(d.kgM2, 1)}</td>
                          <td className="px-3 py-1.5">{num(d.ca, 2)}</td>
                          <td className="px-3 py-1.5">{brl(d.margem)}</td>
                          <td className="px-3 py-1.5">{brl(d.margemPorDia)}</td>
                          <td className="px-3 py-1.5">{d.iep}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
              <Nota>
                Peso pela previsão da granja ancorada nas pesagens; aves futuras com baixa de 0,08%
                ao dia; ração = kg vivo × CA de referência da linhagem. Margem não inclui
                bonificações da integradora. Use como apoio à decisão junto com o técnico.
              </Nota>
            </TabsContent>

            <TabsContent value="carga" className="mt-4 space-y-4">
              <Card className="p-4 md:p-5">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Data da apanha</Label>
                    <Input
                      type="date"
                      value={cfg.dataApanha}
                      onChange={(e) => set("dataApanha", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Início da apanha</Label>
                    <Input
                      type="time"
                      value={cfg.horaApanha}
                      onChange={(e) => set("horaApanha", e.target.value)}
                    />
                  </div>
                  <Campo label="Jejum total (h)" v={cfg.jejumH} on={(v) => set("jejumH", v)} />
                  <Campo
                    label="Viagem + espera (h)"
                    v={cfg.transporteEsperaH}
                    step={0.5}
                    on={(v) => set("transporteEsperaH", v)}
                  />
                  <Campo
                    label="Aves/hora da equipe"
                    v={cfg.avesPorHora}
                    on={(v) => set("avesPorHora", v)}
                  />
                  <Campo
                    label="Máx. aves/caixa"
                    v={cfg.maxAvesCaixa}
                    on={(v) => set("maxAvesCaixa", v)}
                  />
                  <Campo
                    label="Máx. kg/caixa"
                    v={cfg.maxKgCaixa}
                    on={(v) => set("maxKgCaixa", v)}
                  />
                  <Campo
                    label="Caixas/caminhão"
                    v={cfg.caixasPorCaminhao}
                    on={(v) => set("caixasPorCaminhao", v)}
                  />
                </div>
              </Card>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Kpi
                  icon={Gauge}
                  label={`Peso previsto D${calc.idadeApanha}`}
                  value={`${num(calc.pesoApanha)} g`}
                />
                <Kpi
                  icon={Package}
                  label="Aves por caixa"
                  value={`${calc.carga.avesPorCaixa}`}
                  hint={`${num(calc.carga.kgPorCaixa, 1)} kg/caixa`}
                />
                <Kpi
                  icon={Package}
                  label="Caixas"
                  value={num(calc.carga.caixas)}
                  hint={`${num(calc.avesApanha)} aves`}
                />
                <Kpi
                  icon={Truck}
                  label="Caminhões"
                  value={String(calc.carga.caminhoes)}
                  hint={`Apanha de ~${num(calc.carga.duracaoH, 1)} h`}
                />
              </div>
              <Card className="p-4 md:p-5">
                <h3 className="mb-4 flex items-center gap-2 font-semibold">
                  <CalendarClock className="h-4 w-4 text-primary" /> Cronograma
                </h3>
                <ol className="relative space-y-4 border-l-2 border-primary/20 pl-5">
                  {calc.carga.etapas.map((e, i) => (
                    <li
                      key={i}
                      className="reveal relative"
                      style={{ "--reveal-delay": `${i * 60}ms` } as React.CSSProperties}
                    >
                      <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                      <p className="text-xs font-semibold uppercase text-primary">
                        {hora(e.quando)}
                      </p>
                      <p className="font-semibold">{e.titulo}</p>
                      <p className="text-sm text-muted-foreground">{e.detalhe}</p>
                    </li>
                  ))}
                </ol>
                {calc.carga.horasNoGalpao < 4 && (
                  <p className="mt-4 flex items-start gap-2 rounded-lg border border-warning/50 bg-warning/10 p-3 text-xs">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Apenas{" "}
                    {num(calc.carga.horasNoGalpao, 1)} h de jejum no galpão. Confira o tempo de
                    viagem e espera com a integradora.
                  </p>
                )}
              </Card>
              <Nota>
                Jejum total conta da retirada da ração até o abate (galpão + apanha + viagem +
                espera), considerando a ave apanhada no meio da operação. Confirme limites de aves e
                kg por caixa com a integradora e a época do ano.
              </Nota>
            </TabsContent>

            <TabsContent value="dim" className="mt-4 space-y-4">
              <Card className="p-4 md:p-5">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                  <Campo label="Área útil (m²)" v={cfg.areaM2} on={(v) => set("areaM2", v)} />
                  <Campo
                    label="Comedouros (pratos)"
                    v={cfg.comedouros}
                    on={(v) => set("comedouros", v)}
                  />
                  <Campo label="Nipples" v={cfg.bebedouros} on={(v) => set("bebedouros", v)} />
                  <Campo label="Exaustores" v={cfg.exaustores} on={(v) => set("exaustores", v)} />
                  <Campo
                    label="CFM por exaustor"
                    v={cfg.cfmExaustor}
                    on={(v) => set("cfmExaustor", v)}
                  />
                </div>
              </Card>
              <div className="grid gap-3 md:grid-cols-2">
                {calc.dim.map((c) => (
                  <Card key={c.item} className="avi-card-3d flex items-start gap-3 p-4">
                    {c.ok === null ? (
                      <CircleHelp className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    ) : c.ok ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{c.item}</p>
                      <p className="text-lg font-bold tabular-nums">{c.valor}</p>
                      <p className="text-xs text-muted-foreground">Referência: {c.referencia}</p>
                    </div>
                  </Card>
                ))}
              </div>
              <Nota>
                Calculado para D{calc.resumo.idade}, {num(calc.resumo.vivas)} aves estimadas e{" "}
                {num(calc.resumo.pesoProjetadoHojeG)} g previstos hoje. Referências gerais de frango
                de corte; siga o manual da linhagem e da integradora.
              </Nota>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppShell>
  );
}

function Destaques({
  sim,
  dataEntrada,
}: {
  sim: ReturnType<typeof simularAbate>;
  dataEntrada: string;
}) {
  const data = (d: DiaSimulado | null) =>
    d ? addDias(dataEntrada, d.idade).split("-").reverse().join("/") : "—";
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Card className="avi-metric-3d border-primary/30 bg-primary/5 p-4">
        <p className="eyebrow">Melhor margem por dia de galpão</p>
        <p className="mt-1 text-3xl font-bold">
          {sim.melhorMargemDia ? `D${sim.melhorMargemDia.idade}` : "—"}
        </p>
        <p className="text-xs text-muted-foreground">
          {data(sim.melhorMargemDia)} ·{" "}
          {sim.melhorMargemDia
            ? `${brl(sim.melhorMargemDia.margemPorDia)}/dia · ${num(sim.melhorMargemDia.pesoG)} g`
            : ""}
        </p>
      </Card>
      <Card className="avi-metric-3d p-4">
        <p className="eyebrow">Maior IEP</p>
        <p className="mt-1 text-3xl font-bold">{sim.melhorIEP ? `D${sim.melhorIEP.idade}` : "—"}</p>
        <p className="text-xs text-muted-foreground">
          {data(sim.melhorIEP)} · IEP {sim.melhorIEP?.iep ?? "—"}
        </p>
      </Card>
      <Card
        className={`avi-metric-3d p-4 ${sim.limiteDensidade !== null ? "border-destructive/40" : ""}`}
      >
        <p className="eyebrow">Limite de densidade</p>
        <p className="mt-1 text-3xl font-bold">
          {sim.limiteDensidade !== null ? `D${sim.limiteDensidade}` : "OK"}
        </p>
        <p className="text-xs text-muted-foreground">
          {sim.limiteDensidade !== null
            ? "Primeiro dia acima do limite de kg/m²"
            : sim.dias[0]?.kgM2 === null
              ? "Informe a área útil do galpão"
              : "Dentro do limite em todo o período"}
        </p>
      </Card>
    </div>
  );
}

function Campo({
  label,
  v,
  on,
  step = 1,
}: {
  label: string;
  v: number;
  on: (v: number) => void;
  step?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        inputMode="decimal"
        step={step}
        min={0}
        value={Number.isFinite(v) ? v : 0}
        onChange={(e) => on(Math.max(0, Number(e.target.value) || 0))}
      />
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="avi-metric-3d p-4">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        {label}
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

function Nota({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] leading-relaxed text-muted-foreground">{children}</p>;
}
