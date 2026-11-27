import { useEffect, useState } from "react";
import { Copy, MessageCircle, PackageCheck, Timer, Truck } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  /** Estoque calculado no instante `calcAt`. */
  estoqueKg: number;
  calcAt: Date;
  consumoSegKg: number;
  capacidadeKg: number;
  minimoKg: number;
  faixa: { min: number; max: number };
  tRuptura: Date | null;
  dataPedido: Date | null;
  pedidoKg: number;
  autonomiaDias: number;
  loteNumero: string;
  faseAtual: string | null;
  faseProximaCarga: string | null;
  fazendaNome: string | null;
};

const kg = (n: number) => `${Math.max(0, Math.round(n)).toLocaleString("pt-BR")} kg`;

function falta(alvo: Date | null, agora: number) {
  if (!alvo) return null;
  const ms = alvo.getTime() - agora;
  if (ms <= 0) return "agora";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return d > 0
    ? `${d} d ${String(h).padStart(2, "0")} h`
    : `${h} h ${String(m).padStart(2, "0")} min`;
}

const quando = (d: Date | null) =>
  d
    ? d.toLocaleString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

/** Silo animado: o saldo desce em tempo real entre recálculos do motor, sem redesenhar a página. */
export function SiloLiveGauge(p: Props) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    let id: number | undefined;
    const start = () => {
      if (id === undefined) id = window.setInterval(() => setAgora(Date.now()), 1000);
    };
    const stop = () => {
      if (id !== undefined) {
        window.clearInterval(id);
        id = undefined;
      }
    };
    const sync = () => (document.hidden ? stop() : (setAgora(Date.now()), start()));
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  const decorrido = Math.max(0, (agora - p.calcAt.getTime()) / 1000);
  const estoque = Math.max(0, p.estoqueKg - p.consumoSegKg * decorrido);
  const cap = Math.max(1, p.capacidadeKg);
  const pct = Math.min(1, estoque / cap);
  const minPct = Math.min(1, p.minimoKg / cap);
  const nivel = estoque <= p.minimoKg * 0.5 ? "critico" : estoque <= p.minimoKg ? "baixo" : "ok";
  const cor =
    nivel === "critico"
      ? "var(--color-destructive)"
      : nivel === "baixo"
        ? "var(--color-warning)"
        : "var(--color-chart-3)";

  // Geometria do silo (viewBox 120×220): cúpula, corpo e funil.
  const topo = 30,
    base = 170,
    alturaCorpo = base - topo;
  const yNivel = base - pct * alturaCorpo;
  const yMin = base - minPct * alturaCorpo;
  const silhueta = "M20,30 L60,6 L100,30 L100,170 L66,206 L54,206 L20,170 Z";

  const texto = [
    `*Pedido de ração — ${p.fazendaNome ?? "Aviário"} · Lote ${p.loteNumero}*`,
    `Quantidade: ${kg(p.pedidoKg)}`,
    p.faseProximaCarga ? `Ração: ${p.faseProximaCarga}` : null,
    p.tRuptura ? `Entregar antes de: ${quando(p.tRuptura)}` : null,
    `Estoque estimado agora: ${kg(estoque)} (autonomia ${p.autonomiaDias.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias)`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <Card className="silo-live overflow-hidden p-0">
      <div className="grid gap-0 md:grid-cols-[220px_1fr]">
        <div className="silo-live-stage relative flex items-center justify-center p-3 md:p-4">
          <svg
            viewBox="0 0 120 220"
            className="h-36 w-auto drop-shadow-sm md:h-56"
            role="img"
            aria-label={`Silo com ${Math.round(pct * 100)}% da capacidade`}
          >
            <defs>
              <clipPath id="silo-clip">
                <path d={silhueta} />
              </clipPath>
              <linearGradient id="silo-metal" x1="0" x2="1">
                <stop offset="0" stopColor="oklch(0.78 0.01 250)" />
                <stop offset="0.45" stopColor="oklch(0.97 0.004 250)" />
                <stop offset="1" stopColor="oklch(0.74 0.012 250)" />
              </linearGradient>
              <linearGradient id="silo-feed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={cor} stopOpacity="0.95" />
                <stop offset="1" stopColor="oklch(0.55 0.1 65)" stopOpacity="0.95" />
              </linearGradient>
            </defs>
            <path
              d={silhueta}
              fill="url(#silo-metal)"
              stroke="oklch(0.6 0.01 250)"
              strokeWidth="1.5"
            />
            <g clipPath="url(#silo-clip)">
              <rect
                x="0"
                y={yNivel}
                width="120"
                height={220 - yNivel}
                fill="url(#silo-feed)"
                className="silo-fill"
              />
              <path
                className="silo-wave"
                d={`M-60,${yNivel} q15,-4 30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 V220 H-60 Z`}
                fill={cor}
                opacity="0.45"
              />
              {[50, 80, 110, 140].map((y) => (
                <line key={y} x1="20" x2="100" y1={y} y2={y} stroke="oklch(0.5 0.01 250 / 0.18)" />
              ))}
            </g>
            <line
              x1="12"
              x2="108"
              y1={yMin}
              y2={yMin}
              stroke="var(--color-destructive)"
              strokeDasharray="4 3"
              strokeWidth="1.2"
            />
            <text
              x="106"
              y={yMin - 3}
              fontSize="7"
              textAnchor="end"
              fill="var(--color-destructive)"
              fontWeight="700"
            >
              mín.
            </text>
            <rect x="52" y="206" width="16" height="10" rx="2" fill="oklch(0.55 0.01 250)" />
          </svg>
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-success shadow-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> AO VIVO
          </span>
        </div>

        <div className="space-y-4 p-4 md:p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="eyebrow">Ração no silo agora · Lote {p.loteNumero}</p>
              <p
                className="silo-ticker text-4xl font-extrabold tabular-nums md:text-5xl"
                style={{ color: nivel === "ok" ? undefined : cor }}
              >
                {kg(estoque)}
              </p>
              <p className="text-xs text-muted-foreground">
                {Math.round(pct * 100)}% de {kg(cap)} · faixa provável {kg(p.faixa.min)} –{" "}
                {kg(p.faixa.max)} · −
                {(p.consumoSegKg * 3600).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg/h
              </p>
            </div>
            {p.estoqueKg > cap * 1.02 && (
              <p className="w-full rounded-lg border border-warning/50 bg-warning/10 px-3 py-2 text-xs">
                O saldo calculado passa da capacidade do silo. Confira se alguma entrega foi lançada em dobro ou registre uma pesagem física do silo para recalibrar.
              </p>
            )}
            {p.faseAtual && (
              <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Fase: {p.faseAtual}
              </span>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Contador
              icon={Timer}
              titulo="Ração acaba em"
              valor={falta(p.tRuptura, agora) ?? "> 7 dias"}
              sub={quando(p.tRuptura)}
              alerta={nivel !== "ok"}
            />
            <Contador
              icon={Truck}
              titulo="Pedir até"
              valor={falta(p.dataPedido, agora) ?? "sem urgência"}
              sub={quando(p.dataPedido)}
              alerta={!!p.dataPedido && p.dataPedido.getTime() - agora < 24 * 3600000}
            />
            <Contador
              icon={PackageCheck}
              titulo="Próxima carga"
              valor={p.pedidoKg > 0 ? kg(p.pedidoKg) : "não precisa"}
              sub={p.faseProximaCarga ? `Ração ${p.faseProximaCarga.toLowerCase()}` : "—"}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" className="bg-[#1f9d55] hover:bg-[#1a8a4a]">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(texto)}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="h-4 w-4" /> Enviar pedido no WhatsApp
              </a>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                navigator.clipboard?.writeText(texto.replace(/\*/g, "")).then(
                  () => toast.success("Pedido copiado"),
                  () => toast.error("Não foi possível copiar"),
                )
              }
            >
              <Copy className="h-4 w-4" /> Copiar pedido
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Contador({
  icon: Icon,
  titulo,
  valor,
  sub,
  alerta = false,
}: {
  icon: typeof Timer;
  titulo: string;
  valor: string;
  sub: string;
  alerta?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${alerta ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/30"}`}
    >
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {titulo}
      </p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${alerta ? "text-destructive" : ""}`}>
        {valor}
      </p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}
