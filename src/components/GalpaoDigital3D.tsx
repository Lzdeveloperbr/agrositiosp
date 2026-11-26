import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { Eye, EyeOff, RotateCcw } from "lucide-react";
import type { EstadoGalpao, Termico } from "@/lib/lote-autopilot";

const L = 300; // comprimento do galpão (px na cena)
const W = 110; // largura
const H = 40; // pé-direito
const R = 24; // altura da cumeeira
const ROOF_SLOPE = Math.sqrt((W / 2) ** 2 + R ** 2);
const ROOF_ANGLE = (Math.atan2(R, W / 2) * 180) / Math.PI;

const TERMICO: Record<Termico, { label: string; floor: string; glow: string }> = {
  frio_critico: {
    label: "Frio crítico",
    floor: "oklch(0.62 0.13 250)",
    glow: "oklch(0.62 0.16 250 / 0.55)",
  },
  frio: { label: "Frio leve", floor: "oklch(0.74 0.09 230)", glow: "oklch(0.7 0.12 230 / 0.45)" },
  conforto: { label: "Conforto", floor: "oklch(0.8 0.1 145)", glow: "oklch(0.7 0.15 150 / 0.4)" },
  calor: { label: "Calor leve", floor: "oklch(0.82 0.12 80)", glow: "oklch(0.78 0.16 70 / 0.5)" },
  estresse: {
    label: "Estresse calórico",
    floor: "oklch(0.7 0.17 35)",
    glow: "oklch(0.65 0.21 30 / 0.6)",
  },
  sem_dado: { label: "Sem medição", floor: "oklch(0.88 0.02 90)", glow: "transparent" },
};

// Pseudoaleatório determinístico (mesmo resultado no servidor e no navegador).
function seeded(n: number) {
  let s = 1234567;
  return Array.from({ length: n }, () => {
    s = (s * 16807) % 2147483647;
    const a = s / 2147483647;
    s = (s * 16807) % 2147483647;
    const b = s / 2147483647;
    s = (s * 16807) % 2147483647;
    return { x: 8 + a * (L - 16), y: 8 + b * (W - 16), d: (s / 2147483647) * -6 };
  });
}

export function GalpaoDigital3D({
  estado,
  avesVivas,
  pesoG,
  idade,
}: {
  estado: EstadoGalpao;
  avesVivas: number;
  pesoG: number | null;
  idade: number;
}) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; rz: number; rx: number } | null>(null);
  const rot = useRef({ rz: -32, rx: 58 });
  const [xray, setXray] = useState(true);
  const termico = TERMICO[estado.termico];
  const birdCount = avesVivas > 0 ? Math.min(90, Math.max(14, Math.round(avesVivas / 250))) : 0;
  const birds = useMemo(() => seeded(90).slice(0, birdCount), [birdCount]);
  // Aves maiores com a idade: D0 ≈ 3px, D42 ≈ 7px.
  const birdSize = 3 + Math.min(4, idade / 10);
  const fanSpeed = estado.ventilacao > 0 ? `${(1.6 - estado.ventilacao * 1.35).toFixed(2)}s` : "0s";

  const apply = () => {
    const el = sceneRef.current;
    if (!el) return;
    el.style.setProperty("--rz", `${rot.current.rz}deg`);
    el.style.setProperty("--rx", `${rot.current.rx}deg`);
  };
  useEffect(apply, []);

  // Pausa todas as animações quando o galpão sai da tela ou o app vai para segundo plano.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let visivel = true;
    const sync = () => {
      if (visivel && !document.hidden) delete el.dataset.paused;
      else el.dataset.paused = "true";
    };
    const io = new IntersectionObserver(([e]) => {
      visivel = e.isIntersecting;
      sync();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = { x: e.clientX, y: e.clientY, ...rot.current };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.dataset.dragging = "true";
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    rot.current = {
      rz: d.rz + (e.clientX - d.x) * 0.4,
      rx: Math.min(75, Math.max(35, d.rx - (e.clientY - d.y) * 0.25)),
    };
    apply();
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    delete e.currentTarget.dataset.dragging;
  };
  const reset = () => {
    rot.current = { rz: -32, rx: 58 };
    apply();
  };

  const style = {
    "--floor": termico.floor,
    "--glow": termico.glow,
    "--fan-speed": fanSpeed,
    "--bird": `${birdSize}px`,
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      className="galpao3d relative overflow-hidden rounded-xl border border-border"
      style={style}
    >
      <div className="absolute inset-0 galpao3d-sky" aria-hidden />
      <div
        className="galpao3d-stage relative h-[300px] sm:h-[340px] touch-none select-none cursor-grab"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        role="img"
        aria-label={`Gêmeo digital do galpão: ${termico.label}${estado.temperaturaC !== null ? `, ${estado.temperaturaC} graus` : ""}, ${avesVivas} aves vivas estimadas. Arraste para girar.`}
      >
        <div ref={sceneRef} className="galpao3d-scene" style={{ width: L, height: W }}>
          <div className="galpao3d-sway">
            {/* terreno */}
            <div
              className="g3-face g3-ground"
              style={{
                width: L + 160,
                height: W + 120,
                transform: "translate3d(-50px,-60px,-1px)",
              }}
            />
            {/* piso / cama com mapa térmico */}
            <div className="g3-face g3-floor" style={{ width: L, height: W }}>
              {/* 3 grupos animados em vez de uma animação por ave (bem mais leve). */}
              {[0, 1, 2].map((g) => (
                <div key={g} className={`g3-flock g3-flock-${g}`}>
                  {birds.map((b, i) =>
                    i % 3 === g ? <span key={i} className="g3-bird" style={{ left: b.x, top: b.y }} /> : null,
                  )}
                </div>
              ))}
              <div className="g3-heat" />
            </div>
            {/* paredes laterais (cortinas) */}
            <div
              className="g3-face g3-wall g3-curtain"
              style={{ width: L, height: H, transform: "rotateX(90deg)" }}
            />
            <div
              className="g3-face g3-wall g3-curtain"
              style={{ width: L, height: H, transform: `translateY(${W}px) rotateX(90deg)` }}
            />
            {/* oitões */}
            <div
              className="g3-face g3-wall g3-end"
              style={{ width: H, height: W, transform: "rotateY(-90deg)" }}
            >
              <span className="g3-door" />
            </div>
            <div
              className="g3-face g3-wall g3-end"
              style={{ width: H, height: W, transform: `translateX(${L}px) rotateY(-90deg)` }}
            >
              {[0.2, 0.5, 0.8].map((p) => (
                <span
                  key={p}
                  className={`g3-fan ${estado.ventilacao > 0 ? "is-on" : ""}`}
                  style={{ top: `${p * 100}%` }}
                />
              ))}
            </div>
            {/* telhado */}
            <div
              className={`g3-face g3-roof ${xray ? "is-xray" : ""}`}
              style={{
                width: L,
                height: ROOF_SLOPE,
                transform: `translateZ(${H}px) rotateX(${ROOF_ANGLE}deg)`,
              }}
            />
            <div
              className={`g3-face g3-roof g3-roof-b ${xray ? "is-xray" : ""}`}
              style={{
                width: L,
                height: ROOF_SLOPE,
                transform: `translateY(${W}px) translateZ(${H}px) rotateX(${180 - ROOF_ANGLE}deg)`,
              }}
            />
            {/* silo */}
            <div className="g3-billboard" style={{ left: L + 52, top: W * 0.35 }}>
              <div className="g3-silo">
                <div
                  className="g3-silo-fill"
                  style={{ height: `${Math.round((estado.siloFracao ?? 0) * 100)}%` }}
                />
                <span className="g3-silo-label">
                  {estado.siloFracao === null ? "Silo" : `${Math.round(estado.siloFracao * 100)}%`}
                </span>
              </div>
            </div>
            {/* marcador de temperatura */}
            <div
              className="g3-billboard"
              style={{ left: L / 2, top: W / 2, "--lift": `${H + R + 8}px` } as CSSProperties}
            >
              <div className="g3-pin">
                <strong>
                  {estado.temperaturaC !== null
                    ? `${estado.temperaturaC.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} °C`
                    : "— °C"}
                </strong>
                <span>{termico.label}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HUD */}
      <div className="pointer-events-none absolute left-3 right-24 top-3 flex flex-wrap gap-1.5">
        <Hud label="Aves vivas" value={avesVivas.toLocaleString("pt-BR")} />
        <Hud
          label="Peso previsto"
          value={pesoG ? `${Math.round(pesoG).toLocaleString("pt-BR")} g` : "—"}
        />
        <Hud label={`Ideal D${idade}`} value={`${estado.idealC} °C`} />
        {estado.umidadePct !== null && (
          <Hud label="Umidade" value={`${Math.round(estado.umidadePct)}%`} />
        )}
      </div>
      <div className="absolute right-3 top-3 flex gap-1.5">
        <button
          type="button"
          onClick={() => setXray((v) => !v)}
          className="g3-btn"
          aria-pressed={xray}
          title={xray ? "Mostrar telhado" : "Ver interior"}
        >
          {xray ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
        <button type="button" onClick={reset} className="g3-btn" title="Recentralizar">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
      <p className="pointer-events-none absolute inset-x-3 bottom-2 text-[11px] text-foreground/70">
        {estado.temperaturaC === null
          ? estado.medicaoData
            ? `Sem medição interna recente (última em ${estado.medicaoData.split("-").reverse().join("/")}). Exaustores parados na simulação.`
            : "Sem medição interna. Registre a ambiência para ativar o mapa térmico."
          : `Medição interna de ${estado.medicaoHoje ? "hoje" : "ontem"} · exaustão sugerida ${Math.round(estado.ventilacao * 100)}% · arraste para girar`}
      </p>
    </div>
  );
}

function Hud({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/60 bg-white/90 px-2 py-1 shadow-sm">
      <p className="text-[9px] font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="text-xs font-bold tabular-nums">{value}</p>
    </div>
  );
}
