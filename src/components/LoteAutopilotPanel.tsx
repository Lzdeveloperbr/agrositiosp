import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  AlertOctagon,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Gauge,
  Info,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GalpaoDigital3D } from "@/components/GalpaoDigital3D";
import { usePoultryOperation } from "@/hooks/use-poultry-operation";
import { useLotes } from "@/lib/state";
import { calcularResumoLote } from "@/lib/granja";
import { hojeISO } from "@/lib/data";
import { calcularAutopilot, type Acao, type Prioridade } from "@/lib/lote-autopilot";
import { calcularFases, CORTES_PADRAO } from "@/lib/racao-desempenho";
import { abrirLancamentoRapido, EVENTO_SALVO } from "@/components/LancamentoRapido";
import { notificar } from "@/lib/notifications";
import { fetchWeather } from "@/lib/weather";
import { useFazenda } from "@/lib/cloud/fazenda";

// Ações resolvidas no próprio painel de lançamento, sem sair da Central.
const LANCAVEIS = new Set(["diario", "medir", "agua-queda"]);
import type { SiloCalc } from "@/lib/silo";
import type { Lote } from "@/lib/types";

function faseRacao(lote: Lote, silo: SiloCalc | null) {
  if (!silo) return null;
  let cortes = CORTES_PADRAO;
  try {
    cortes = {
      ...CORTES_PADRAO,
      ...JSON.parse(localStorage.getItem(`racao-fases:${lote.id}`) || "{}"),
    };
  } catch {
    /* ignora */
  }
  const f = calcularFases({
    alojamento: lote.dataEntrada,
    agora: new Date(),
    abateDias: lote.previsaoAbateDias || 42,
    cortes,
    estoqueAtualKg: silo.estoqueAtualKg,
    tRuptura: silo.tRuptura,
    integrarConsumo: (a, b) => silo.integrarConsumo(a, b),
  });
  return {
    diasParaTroca: f.diasParaTroca,
    proxima: f.proxima?.nome ?? null,
    sobraKg: f.sobraFaseAtualKg,
  };
}

const REFRESH_MS = 5 * 60 * 1000;

const PRIO: Record<Prioridade, { label: string; cls: string; icon: typeof Info }> = {
  critica: {
    label: "Crítica",
    cls: "border-destructive/40 bg-destructive/5 text-destructive",
    icon: AlertOctagon,
  },
  alta: {
    label: "Alta",
    cls: "border-warning/50 bg-warning/10 text-warning-foreground",
    icon: TriangleAlert,
  },
  media: { label: "Média", cls: "border-primary/30 bg-primary/5 text-primary", icon: Info },
  baixa: { label: "Baixa", cls: "border-border bg-muted/40 text-muted-foreground", icon: Info },
};

function useCountUp(target: number | null, ms = 1200) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (target === null) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setV(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export function LoteAutopilotPanel() {
  const [lotes] = useLotes();
  const ativo = useMemo(() => lotes.find((l) => !l.encerrado) ?? null, [lotes]);
  const [tick, setTick] = useState(0);
  const [atualizado, setAtualizado] = useState<Date | null>(null);
  // Monitoramento só enquanto a página está aberta.
  useEffect(() => {
    setAtualizado(new Date());
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
      setAtualizado(new Date());
    }, REFRESH_MS);
    // Recalcula na hora quando um lançamento rápido é salvo.
    const salvo = () => {
      setTick((t) => t + 1);
      setAtualizado(new Date());
    };
    window.addEventListener(EVENTO_SALVO, salvo);
    return () => {
      window.clearInterval(id);
      window.removeEventListener(EVENTO_SALVO, salvo);
    };
  }, []);
  const op = usePoultryOperation(ativo, tick);
  // Previsão do tempo externa só para alertas de preparo (nunca como medição do galpão).
  const { coords } = useFazenda();
  const [previsao, setPrevisao] = useState<{ data: string; tMaxC: number }[]>([]);
  useEffect(() => {
    if (!coords) return;
    let cancel = false;
    fetchWeather(coords.lat, coords.lon)
      .then((w) => !cancel && setPrevisao(w.daily.map((d) => ({ data: d.date, tMaxC: d.tMax }))))
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, [coords, tick]);

  const data = useMemo(() => {
    if (!ativo || !atualizado) return null;
    const hoje = hojeISO();
    const resumo = calcularResumoLote(ativo);
    const auto = calcularAutopilot({
      lote: ativo,
      resumo,
      medicoes: op.medicoes,
      silo: op.silo,
      hoje,
      racao: faseRacao(ativo, op.silo),
      previsaoExterna: previsao,
    });
    return { resumo, auto };
  }, [ativo, op.medicoes, op.silo, atualizado, previsao]);

  // Notifica no aparelho as ações críticas/altas novas (uma vez por dia cada).
  useEffect(() => {
    if (!ativo || !data) return;
    for (const a of data.auto.acoes) {
      if (a.prioridade !== "critica" && a.prioridade !== "alta") continue;
      notificar(
        `auto-${ativo.id}-${a.id}`,
        `${a.prioridade === "critica" ? "🚨" : "⚠️"} Lote ${ativo.numero}: ${a.titulo}`,
        a.detalhe,
      );
    }
  }, [ativo, data]);

  if (!ativo || !data) return null;
  const { resumo, auto } = data;

  return (
    <section aria-label="Piloto automático do lote" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow inline-flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-primary" /> Piloto automático · Lote {ativo.numero}
          </p>
          <h2 className="text-2xl md:text-3xl">Gêmeo digital do galpão</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Leitura dos seus lançamentos, medições internas e silo, recalculada a cada 5 minutos
            enquanto esta página estiver aberta.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setTick((t) => t + 1);
            setAtualizado(new Date());
          }}
        >
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 reveal">
          <GalpaoDigital3D
            estado={auto.galpao}
            avesVivas={resumo.vivas}
            pesoG={resumo.pesoProjetadoHojeG || null}
            idade={resumo.idade}
          />
        </div>
        <Card
          className="avi-card-3d p-4 md:p-5 lg:col-span-2 reveal"
          style={{ "--reveal-delay": "80ms" } as CSSProperties}
        >
          <ScoreBlock indice={auto.indice} classe={auto.classe} iep={auto.iepProjetado} />
          <ul className="mt-4 space-y-2.5">
            {auto.componentes.map((c) => (
              <li key={c.id}>
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-semibold">{c.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {c.nota === null ? "sem dado" : Math.round(c.nota)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-[width] duration-1000 ease-out ${c.nota === null ? "" : c.nota >= 85 ? "bg-success" : c.nota >= 60 ? "bg-warning" : "bg-destructive"}`}
                    style={{ width: `${c.nota ?? 0}%` }}
                  />
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{c.detalhe}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">Plano de ação de hoje</h3>
          <Badge variant="outline">{auto.acoes.length} ação(ões)</Badge>
        </div>
        {auto.acoes.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" /> Tudo em dia. Mantenha os lançamentos e a próxima
            pesagem programada.
          </p>
        ) : (
          <ol className="grid gap-2 md:grid-cols-2">
            {auto.acoes.map((a, i) => (
              <AcaoItem key={a.id} acao={a} delay={i * 50} />
            ))}
          </ol>
        )}
        {op.error && <p className="mt-3 text-xs text-destructive">{op.error}</p>}
        <p className="mt-3 text-[11px] text-muted-foreground">
          Índice e IEP são estimativas a partir dos registros; componentes sem dado ficam fora do
          cálculo. O IEP projetado usa o peso previsto ao abate, a viabilidade atual e a CA de
          referência da linhagem. Não substitui a avaliação do técnico.
        </p>
      </Card>
    </section>
  );
}

function ScoreBlock({
  indice,
  classe,
  iep,
}: {
  indice: number | null;
  classe: string;
  iep: number | null;
}) {
  const shown = useCountUp(indice);
  const iepShown = useCountUp(iep);
  const r = 44;
  const c = 2 * Math.PI * r;
  const pct = indice === null ? 0 : indice / 100;
  const color =
    indice === null
      ? "var(--color-muted-foreground)"
      : indice >= 85
        ? "var(--color-success)"
        : indice >= 70
          ? "var(--color-chart-2)"
          : indice >= 55
            ? "var(--color-warning)"
            : "var(--color-destructive)";
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0 -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" className="score-ring-track" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="score-ring-value"
        />
        <text
          x="50"
          y="50"
          transform="rotate(90 50 50)"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-foreground"
          style={{ font: "800 26px Manrope, sans-serif" }}
        >
          {indice === null ? "—" : shown}
        </text>
      </svg>
      <div className="min-w-0">
        <p className="eyebrow inline-flex items-center gap-1">
          <Gauge className="h-3.5 w-3.5" /> Índice do lote
        </p>
        <p className="text-2xl font-bold" style={{ color }}>
          {classe}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">IEP projetado ao abate</p>
        <p className="text-xl font-bold tabular-nums">{iep === null ? "—" : iepShown}</p>
      </div>
    </div>
  );
}

function AcaoItem({ acao, delay }: { acao: Acao; delay: number }) {
  const p = PRIO[acao.prioridade];
  return (
    <li
      className={`reveal lift flex items-start gap-3 rounded-lg border p-3 ${p.cls}`}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      <p.icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1 text-foreground">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">{acao.titulo}</p>
          <span className="text-[10px] font-bold uppercase opacity-70">{p.label}</span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{acao.detalhe}</p>
        {LANCAVEIS.has(acao.id) ? (
          <button
            type="button"
            onClick={() => abrirLancamentoRapido()}
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary"
          >
            {acao.label} <ArrowRight className="h-3 w-3" />
          </button>
        ) : (
          <Link
            to={acao.to as never}
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary"
          >
            {acao.label} <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </li>
  );
}
