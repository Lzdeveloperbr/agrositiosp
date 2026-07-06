import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wheat, TrendingDown, Activity, AlertTriangle, Timer, Package, Bird, CalendarClock, Gauge } from "lucide-react";
import type { ItemEstoque, Lote } from "@/lib/types";
import { useLotes } from "@/lib/state";
import { CURVAS, LINHAGEM_LABEL, type Linhagem } from "@/lib/linhagens";

function fmt(n: number, d = 0) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
}

// ===== Curva de consumo acumulado (g) por ave =====
function consumoAcumG(linhagem: Linhagem, dia: number): number {
  const c = CURVAS[linhagem];
  if (dia <= 0) return 0;
  if (dia <= c[0].dia) return (c[0].consumoAcum * dia) / c[0].dia;
  if (dia >= c[c.length - 1].dia) {
    const a = c[c.length - 2], b = c[c.length - 1];
    const slope = (b.consumoAcum - a.consumoAcum) / (b.dia - a.dia);
    return b.consumoAcum + slope * (dia - b.dia);
  }
  for (let i = 0; i < c.length - 1; i++) {
    const a = c[i], b = c[i + 1];
    if (dia >= a.dia && dia <= b.dia) {
      const t = (dia - a.dia) / (b.dia - a.dia);
      return a.consumoAcum + (b.consumoAcum - a.consumoAcum) * t;
    }
  }
  return 0;
}

// consumo instantâneo em g/ave/dia (derivada central)
function consumoGPorAveDia(linhagem: Linhagem, dia: number): number {
  const d = Math.max(0.5, dia);
  return Math.max(0, consumoAcumG(linhagem, d + 0.5) - consumoAcumG(linhagem, d - 0.5));
}

// ===== Kg de ração no estoque =====
function estoqueKg(itens: ItemEstoque[]): number {
  return itens
    .filter((i) => i.categoria === "racao")
    .reduce((s, i) => {
      const u = (i.unidade || "").toLowerCase();
      const fator = u === "t" || u === "ton" || u === "tonelada" ? 1000 : u === "g" ? 0.001 : 1;
      return s + i.quantidade * fator;
    }, 0);
}

// ===== Lote ativo com dados derivados =====
type LoteAtivo = {
  lote: Lote;
  linhagem: Linhagem;
  idadeDias: number;
  avesVivas: number;
  consumoDiaKg: number;
  consumoGPorAve: number;
  diasRestantes: number; // até previsão de abate
};

function calcularLote(l: Lote, linhagem: Linhagem, agora: Date): LoteAtivo {
  const entrada = new Date(l.dataEntrada + "T00:00:00");
  const idadeDias = Math.max(0, Math.floor((agora.getTime() - entrada.getTime()) / 86400000));
  const perdas = (l.entries || []).reduce((s, e) => s + (e.mortalidade || 0) + (e.eliminados || 0), 0);
  const avesVivas = Math.max(0, l.quantidadeInicial - perdas);
  const gAve = consumoGPorAveDia(linhagem, idadeDias);
  const consumoDiaKg = (avesVivas * gAve) / 1000;
  const diasRestantes = Math.max(0, l.previsaoAbateDias - idadeDias);
  return { lote: l, linhagem, idadeDias, avesVivas, consumoDiaKg, consumoGPorAve: gAve, diasRestantes };
}

// Simula autonomia dia-a-dia (consumo cresce com idade, encerra quando lote atinge abate)
function simularAutonomia(estoqueInicialKg: number, lotes: LoteAtivo[]): { dias: number; suficiente: boolean } {
  let restante = estoqueInicialKg;
  let dia = 0;
  const maxDias = 120;
  while (restante > 0 && dia < maxDias) {
    let consumoHoje = 0;
    lotes.forEach((la) => {
      const idade = la.idadeDias + dia;
      if (idade > la.lote.previsaoAbateDias) return; // lote já abatido
      consumoHoje += (la.avesVivas * consumoGPorAveDia(la.linhagem, idade)) / 1000;
    });
    if (consumoHoje <= 0) return { dias: Infinity, suficiente: true };
    if (restante < consumoHoje) return { dias: dia + restante / consumoHoje, suficiente: dia >= Math.max(...lotes.map(l => l.diasRestantes)) };
    restante -= consumoHoje;
    dia += 1;
  }
  return { dias: dia, suficiente: true };
}

const LS_KEY = "racao:linhagem:";
const getLinhagem = (loteId: string): Linhagem =>
  (typeof window !== "undefined" && (localStorage.getItem(LS_KEY + loteId) as Linhagem)) || "cobb500";

export function LiveRacaoBanner({ itens }: { itens: ItemEstoque[] }) {
  const [lotes] = useLotes();
  const [now, setNow] = useState(() => new Date());
  const [tick, setTick] = useState(0); // recomputa autonomia a cada 60s
  const [linhagens, setLinhagens] = useState<Record<string, Linhagem>>({});

  useEffect(() => {
    // hidrata linhagens do localStorage
    const map: Record<string, Linhagem> = {};
    lotes.forEach((l) => { map[l.id] = getLinhagem(l.id); });
    setLinhagens(map);
  }, [lotes]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    const min = setInterval(() => setTick((t) => t + 1), 60000);
    return () => { clearInterval(id); clearInterval(min); };
  }, []);

  const lotesAtivos = useMemo(
    () => lotes.filter((l) => !l.encerrado).map((l) => calcularLote(l, linhagens[l.id] || "cobb500", now)),
    [lotes, linhagens, now.toDateString()] // recomputa idade apenas quando o dia muda
  );

  const totalKgBase = useMemo(() => estoqueKg(itens), [itens]);

  const stats = useMemo(() => {
    const abaixoMin = itens.filter((i) => i.categoria === "racao" && i.minimo !== undefined && i.quantidade <= (i.minimo ?? 0)).length;
    const avesTotal = lotesAtivos.reduce((s, la) => s + la.avesVivas, 0);
    const consumoDiaKg = lotesAtivos.reduce((s, la) => s + la.consumoDiaKg, 0);
    const consumoSegKg = consumoDiaKg / 86400;

    // Autonomia real (simulada) — recalculada a cada minuto
    const sim = simularAutonomia(totalKgBase, lotesAtivos);
    const previsaoFim = new Date(now.getTime() + sim.dias * 86400000);

    // Consumo desde a meia-noite (para "peso ao vivo")
    const meiaNoite = new Date(now);
    meiaNoite.setHours(0, 0, 0, 0);
    const segHoje = (now.getTime() - meiaNoite.getTime()) / 1000;
    const consumidoHojeKg = consumoSegKg * segHoje;
    const estoqueAgora = Math.max(0, totalKgBase - consumidoHojeKg);

    // Consumo total previsto até o abate
    let totalAteAbate = 0;
    lotesAtivos.forEach((la) => {
      const acumHoje = (consumoAcumG(la.linhagem, la.idadeDias) / 1000) * la.avesVivas;
      const acumFim = (consumoAcumG(la.linhagem, la.lote.previsaoAbateDias) / 1000) * la.avesVivas;
      totalAteAbate += Math.max(0, acumFim - acumHoje);
    });

    return {
      abaixoMin, avesTotal, consumoDiaKg, consumoSegKg, estoqueAgora,
      consumidoHojeKg, autonomiaDias: sim.dias, suficienteAbate: sim.suficiente,
      previsaoFim, totalAteAbate, faltaAbate: Math.max(0, totalAteAbate - totalKgBase),
    };
    // tick força recompute a cada 60s
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itens, lotesAtivos, totalKgBase, tick, now.getMinutes()]);

  const setLinhagemFor = (id: string, v: Linhagem) => {
    localStorage.setItem(LS_KEY + id, v);
    setLinhagens((p) => ({ ...p, [id]: v }));
  };

  if (itens.filter((i) => i.categoria === "racao").length === 0) return null;

  const semLote = lotesAtivos.length === 0 || stats.avesTotal === 0;

  return (
    <Card className="p-5 border-primary/30 relative overflow-hidden" style={{ background: "var(--gradient-surface)" }}>
      <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        AO VIVO · {now.toLocaleTimeString("pt-BR")}
      </div>

      <div className="flex items-center gap-2 mb-1">
        <Wheat className="h-6 w-6 text-primary" />
        <h2 className="font-display font-bold text-xl">Ração em estoque — cálculo preciso</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        {semLote
          ? "Sem lote ativo — cadastre um lote em Granja para o cálculo por ave/idade/linhagem."
          : `Baseado em ${fmt(stats.avesTotal)} aves vivas · curva ${lotesAtivos.map(l => LINHAGEM_LABEL[l.linhagem]).join(" + ")} · atualizado a cada 1 min.`}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric icon={<Package className="h-4 w-4" />} label="Peso ao vivo (kg)">
          <span className="tabular-nums">{fmt(stats.estoqueAgora, 3)}</span>
          <span className="block text-xs text-muted-foreground font-normal mt-0.5">
            {fmt(stats.estoqueAgora / 1000, 3)} t · base do dia {fmt(totalKgBase)} kg
          </span>
        </Metric>

        <Metric icon={<TrendingDown className="h-4 w-4" />} label="Consumo / dia">
          <span className="tabular-nums">{fmt(stats.consumoDiaKg, 1)} <small className="text-sm font-normal">kg</small></span>
          <span className="block text-xs text-muted-foreground font-normal mt-0.5">
            ≈ {fmt(stats.consumoSegKg * 1000, 2)} g/s · hoje {fmt(stats.consumidoHojeKg, 2)} kg
          </span>
        </Metric>

        <Metric icon={<Timer className="h-4 w-4" />} label="Autonomia real">
          <span className="tabular-nums">
            {Number.isFinite(stats.autonomiaDias) ? `${fmt(stats.autonomiaDias, 1)} d` : "—"}
          </span>
          <span className="block text-xs text-muted-foreground font-normal mt-0.5">
            {Number.isFinite(stats.autonomiaDias)
              ? `acaba em ${stats.previsaoFim.toLocaleDateString("pt-BR")} ${stats.previsaoFim.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}`
              : "sem consumo"}
          </span>
        </Metric>

        <Metric icon={<Activity className="h-4 w-4" />} label="Status">
          {semLote ? (
            <Badge variant="outline" className="w-fit">sem lote</Badge>
          ) : stats.faltaAbate > 0 ? (
            <Badge variant="destructive" className="flex items-center gap-1 w-fit">
              <AlertTriangle className="h-3 w-3" /> Faltam {fmt(stats.faltaAbate)} kg
            </Badge>
          ) : (
            <Badge className="bg-emerald-600 hover:bg-emerald-600 w-fit">Suficiente até o abate</Badge>
          )}
          <span className="block text-xs text-muted-foreground font-normal mt-1">
            {stats.abaixoMin > 0 ? `${stats.abaixoMin} item(ns) abaixo do mínimo` : "todos itens acima do mínimo"}
          </span>
        </Metric>
      </div>

      {!semLote && (
        <div className="mt-5 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground uppercase tracking-wide">
            <Gauge className="h-3.5 w-3.5" /> Consumo por lote (ao vivo)
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {lotesAtivos.map((la) => {
              const acumHojeKg = (consumoAcumG(la.linhagem, la.idadeDias) / 1000) * la.avesVivas;
              const acumFimKg = (consumoAcumG(la.linhagem, la.lote.previsaoAbateDias) / 1000) * la.avesVivas;
              const faltamKg = Math.max(0, acumFimKg - acumHojeKg);
              return (
                <div key={la.lote.id} className="rounded-lg border border-border/60 p-3 bg-background/40">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Bird className="h-4 w-4 text-primary" />
                      <span className="font-semibold">Lote {la.lote.numero}</span>
                      <Badge variant="outline" className="text-[10px]">{la.idadeDias}d</Badge>
                    </div>
                    <Select value={la.linhagem} onValueChange={(v) => setLinhagemFor(la.lote.id, v as Linhagem)}>
                      <SelectTrigger className="h-7 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(LINHAGEM_LABEL) as Linhagem[]).map((k) => (
                          <SelectItem key={k} value={k} className="text-xs">{LINHAGEM_LABEL[k]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Aves vivas</span><div className="font-bold tabular-nums text-base">{fmt(la.avesVivas)}</div></div>
                    <div><span className="text-muted-foreground">g/ave/dia</span><div className="font-bold tabular-nums text-base">{fmt(la.consumoGPorAve, 1)}</div></div>
                    <div><span className="text-muted-foreground">Consumo/dia</span><div className="font-bold tabular-nums text-base">{fmt(la.consumoDiaKg, 1)} kg</div></div>
                    <div><span className="text-muted-foreground flex items-center gap-1"><CalendarClock className="h-3 w-3"/>Até abate</span><div className="font-bold tabular-nums text-base">{la.diasRestantes} d</div></div>
                    <div className="col-span-2 pt-1 border-t border-border/40">
                      <span className="text-muted-foreground">Ração restante prevista até o abate</span>
                      <div className="font-bold tabular-nums text-base">{fmt(faltamKg)} kg <span className="text-xs text-muted-foreground font-normal">({fmt(faltamKg/1000, 2)} t)</span></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

function Metric({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">{icon}{label}</div>
      <div className="font-display font-bold text-2xl">{children}</div>
    </div>
  );
}
