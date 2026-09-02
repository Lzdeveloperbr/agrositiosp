import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wheat, TrendingDown, Activity, AlertTriangle, Timer, Package, Bird, CalendarClock, Gauge } from "lucide-react";
import type { ItemEstoque, Lote } from "@/lib/types";
import { useLotes } from "@/lib/state";
import { CURVAS, LINHAGEM_LABEL, type Linhagem } from "@/lib/linhagens";
import { parseData, isoLocal, diffDias, fmtData } from "@/lib/data";

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

/** Consumo do DIA de idade `dia` (g/ave) = acumulado(dia) - acumulado(dia-1). */
function consumoGPorAveDia(linhagem: Linhagem, dia: number): number {
  if (dia < 0) return 0;
  return Math.max(0, consumoAcumG(linhagem, dia + 1) - consumoAcumG(linhagem, dia));
}

// ===== Perfil intradiário de consumo (24h) =====
// Aves não comem de forma uniforme: picos após acender a luz e no fim da tarde,
// consumo baixo no escuro (programa de luz padrão 23h → 18h).
const PERFIL_HORA = [
  0.5, 0.4, 0.4, 0.5, 1.0, 2.5, 5.5, 7.0, 7.5, 6.5, 5.5, 5.0,
  4.5, 4.5, 5.0, 6.0, 7.5, 8.5, 7.5, 5.5, 3.5, 2.0, 1.2, 0.8,
];
const PERFIL_TOTAL = PERFIL_HORA.reduce((s, v) => s + v, 0);
/** Fração (0..1) do consumo do dia já realizada até a hora decimal `h`. */
function fracaoDia(h: number): number {
  const hh = Math.max(0, Math.min(24, h));
  let acc = 0;
  for (let i = 0; i < 24; i++) {
    if (hh >= i + 1) acc += PERFIL_HORA[i];
    else if (hh > i) acc += PERFIL_HORA[i] * (hh - i);
  }
  return acc / PERFIL_TOTAL;
}
const horaDecimal = (d: Date) => d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600 + d.getMilliseconds() / 3.6e6;

// ===== Kg de ração no estoque =====
function paraKg(q: number, unidade?: string) {
  const u = (unidade || "").toLowerCase().trim();
  if (u === "t" || u === "ton" || u === "tonelada" || u === "toneladas") return q * 1000;
  if (u === "g") return q * 0.001;
  if (u === "sc" || u === "saca" || u === "sacas") return q * 40;
  return q;
}
function estoqueKg(itens: ItemEstoque[]): number {
  return itens.filter((i) => i.categoria === "racao").reduce((s, i) => s + paraKg(i.quantidade, i.unidade), 0);
}

/** Data/hora da última movimentação registrada de ração (âncora do cálculo). */
function ultimaMovimentacao(itens: ItemEstoque[]): Date | null {
  let melhor: Date | null = null;
  itens.filter((i) => i.categoria === "racao").forEach((i) => {
    (i.movimentacoes || []).forEach((m) => {
      const d = parseData(m.data);
      if (d && (!melhor || d.getTime() > melhor.getTime())) melhor = d;
    });
  });
  return melhor;
}

// ===== Lote ativo com dados derivados =====
type LoteAtivo = {
  lote: Lote;
  linhagem: Linhagem;
  idadeDias: number;
  avesVivas: number;
  consumoDiaKg: number;
  consumoGPorAve: number;
  diasRestantes: number;
  /** aves vivas em uma data ISO passada (desconta só as perdas até lá) */
  avesEm: (iso: string) => number;
};

function calcularLote(l: Lote, linhagem: Linhagem, agora: Date): LoteAtivo {
  const idadeDias = Math.max(0, diffDias(l.dataEntrada, agora));
  const entries = l.entries || [];
  const perdasTotais = entries.reduce((s, e) => s + (e.mortalidade || 0) + (e.eliminados || 0), 0);
  const avesVivas = Math.max(0, l.quantidadeInicial - perdasTotais);
  const avesEm = (iso: string) => {
    const perdas = entries
      .filter((e) => isoLocal(e.date) <= iso)
      .reduce((s, e) => s + (e.mortalidade || 0) + (e.eliminados || 0), 0);
    return Math.max(0, l.quantidadeInicial - perdas);
  };
  const gAve = consumoGPorAveDia(linhagem, idadeDias);
  return {
    lote: l,
    linhagem,
    idadeDias,
    avesVivas,
    consumoDiaKg: (avesVivas * gAve) / 1000,
    consumoGPorAve: gAve,
    diasRestantes: Math.max(0, l.previsaoAbateDias - idadeDias),
    avesEm,
  };
}

/** Consumo (kg) previsto para um dia de calendário específico. */
function consumoDoDia(lotes: LoteAtivo[], data: Date): number {
  const iso = isoLocal(data);
  let total = 0;
  lotes.forEach((la) => {
    const idade = diffDias(la.lote.dataEntrada, data);
    if (idade < 0 || idade > la.lote.previsaoAbateDias) return;
    const aves = la.avesEm(iso);
    total += (aves * consumoGPorAveDia(la.linhagem, idade)) / 1000;
  });
  return total;
}

/** Consumo (kg) entre dois instantes, respeitando o perfil intradiário. */
function consumidoEntre(inicio: Date, fim: Date, lotes: LoteAtivo[]): number {
  if (fim.getTime() <= inicio.getTime()) return 0;
  let total = 0;
  const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const limite = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate());
  let guarda = 0;
  while (cursor.getTime() <= limite.getTime() && guarda++ < 200) {
    const mesmoDiaInicio = isoLocal(cursor) === isoLocal(inicio);
    const mesmoDiaFim = isoLocal(cursor) === isoLocal(fim);
    const h0 = mesmoDiaInicio ? horaDecimal(inicio) : 0;
    const h1 = mesmoDiaFim ? horaDecimal(fim) : 24;
    const fracao = Math.max(0, fracaoDia(h1) - fracaoDia(h0));
    total += consumoDoDia(lotes, cursor) * fracao;
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
}

/** Autonomia em dias a partir de `agora`, com o estoque já descontado. */
function simularAutonomia(estoqueKgAgora: number, lotes: LoteAtivo[], agora: Date): { dias: number; fim: Date | null } {
  let restante = estoqueKgAgora;
  if (restante <= 0) return { dias: 0, fim: agora };
  const cursor = new Date(agora);
  for (let d = 0; d < 120; d++) {
    const dia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + d);
    const consumoDia = consumoDoDia(lotes, dia);
    if (consumoDia <= 0) {
      if (d === 0) continue;
      continue;
    }
    const h0 = d === 0 ? horaDecimal(agora) : 0;
    const disponivelNoDia = consumoDia * (1 - fracaoDia(h0));
    if (restante <= disponivelNoDia) {
      // resolve a hora exata dentro do dia
      const alvo = fracaoDia(h0) + restante / consumoDia;
      let h = h0;
      for (let step = 0; step < 1440; step++) {
        h = h0 + ((24 - h0) * step) / 1440;
        if (fracaoDia(h) >= alvo) break;
      }
      const fim = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate());
      fim.setSeconds(Math.round(h * 3600));
      return { dias: (fim.getTime() - agora.getTime()) / 86400000, fim };
    }
    restante -= disponivelNoDia;
    cursor.setDate(cursor.getDate() + 1);
  }
  return { dias: Infinity, fim: null };
}

const LS_KEY = "racao:linhagem:";
const getLinhagem = (loteId: string): Linhagem =>
  (typeof window !== "undefined" && (localStorage.getItem(LS_KEY + loteId) as Linhagem)) || "cobb500";

export function LiveRacaoBanner({ itens }: { itens: ItemEstoque[] }) {
  const [lotes] = useLotes();
  const [now, setNow] = useState(() => new Date());
  const [linhagens, setLinhagens] = useState<Record<string, Linhagem>>({});

  useEffect(() => {
    const map: Record<string, Linhagem> = {};
    lotes.forEach((l) => { map[l.id] = getLinhagem(l.id); });
    setLinhagens(map);
  }, [lotes]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const diaAtual = isoLocal(now);

  const lotesAtivos = useMemo(
    () => lotes.filter((l) => !l.encerrado).map((l) => calcularLote(l, linhagens[l.id] || "cobb500", now)),
    // idade só muda quando o dia muda
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lotes, linhagens, diaAtual],
  );

  const totalKgBase = useMemo(() => estoqueKg(itens), [itens]);

  // Âncora: instante do último registro real de estoque. O saldo salvo já reflete
  // tudo até ali, então só estimamos o consumo DEPOIS desse ponto.
  const ancora = useMemo(() => {
    const ult = ultimaMovimentacao(itens);
    const inicioHoje = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (!ult) return inicioHoje;
    // movimentação é registrada por data (sem hora) → considera início daquele dia
    const base = new Date(ult.getFullYear(), ult.getMonth(), ult.getDate());
    // nunca projetar mais de 45 dias para trás
    const limite = new Date(now.getTime() - 45 * 86400000);
    return base.getTime() < limite.getTime() ? limite : base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itens, diaAtual]);

  // Valor "ao vivo" — recalculado a cada segundo (barato)
  const consumidoDesdeAncora = consumidoEntre(ancora, now, lotesAtivos);
  const estoqueAgora = Math.max(0, totalKgBase - consumidoDesdeAncora);

  const stats = useMemo(() => {
    const abaixoMin = itens.filter((i) => i.categoria === "racao" && i.minimo !== undefined && i.quantidade <= (i.minimo ?? 0)).length;
    const avesTotal = lotesAtivos.reduce((s, la) => s + la.avesVivas, 0);
    const consumoDiaKg = consumoDoDia(lotesAtivos, now);
    // taxa instantânea real (kg/s) segundo o perfil intradiário
    const intensidade = (PERFIL_HORA[Math.min(23, now.getHours())] / PERFIL_TOTAL) * 24;
    const consumoSegKg = (consumoDiaKg / 86400) * intensidade;

    const sim = simularAutonomia(estoqueAgora, lotesAtivos, now);

    let totalAteAbate = 0;
    lotesAtivos.forEach((la) => {
      const acumHoje = (consumoAcumG(la.linhagem, la.idadeDias) / 1000) * la.avesVivas;
      const acumFim = (consumoAcumG(la.linhagem, la.lote.previsaoAbateDias) / 1000) * la.avesVivas;
      totalAteAbate += Math.max(0, acumFim - acumHoje);
    });

    return {
      abaixoMin, avesTotal, consumoDiaKg, consumoSegKg,
      autonomiaDias: sim.dias, previsaoFim: sim.fim,
      totalAteAbate, faltaAbate: Math.max(0, totalAteAbate - estoqueAgora),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itens, lotesAtivos, estoqueAgora, now.getMinutes(), diaAtual]);

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
        <h2 className="font-display font-bold text-xl">Ração no silo — cálculo ao vivo</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        {semLote
          ? "Sem lote ativo — cadastre um lote em Granja para o cálculo por ave/idade/linhagem."
          : `${fmt(stats.avesTotal)} aves vivas · curva ${lotesAtivos.map(l => LINHAGEM_LABEL[l.linhagem]).join(" + ")} · descontando desde o último registro (${fmtData(ancora)}) com perfil de consumo por hora.`}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric icon={<Package className="h-4 w-4" />} label="Estimado no silo (kg)">
          <span className="tabular-nums">{fmt(estoqueAgora, 2)}</span>
          <span className="block text-xs text-muted-foreground font-normal mt-0.5">
            {fmt(estoqueAgora / 1000, 3)} t · registrado {fmt(totalKgBase)} kg − {fmt(consumidoDesdeAncora, 1)} kg estimados
          </span>
        </Metric>

        <Metric icon={<TrendingDown className="h-4 w-4" />} label="Consumo / dia">
          <span className="tabular-nums">{fmt(stats.consumoDiaKg, 1)} <small className="text-sm font-normal">kg</small></span>
          <span className="block text-xs text-muted-foreground font-normal mt-0.5">
            agora ≈ {fmt(stats.consumoSegKg * 1000, 2)} g/s ({fmt(stats.consumoSegKg * 3600, 1)} kg/h)
          </span>
        </Metric>

        <Metric icon={<Timer className="h-4 w-4" />} label="Autonomia real">
          <span className="tabular-nums">
            {Number.isFinite(stats.autonomiaDias)
              ? `${Math.floor(stats.autonomiaDias)}d ${Math.round((stats.autonomiaDias % 1) * 24)}h`
              : "—"}
          </span>
          <span className="block text-xs text-muted-foreground font-normal mt-0.5">
            {stats.previsaoFim
              ? `acaba em ${stats.previsaoFim.toLocaleDateString("pt-BR")} ${stats.previsaoFim.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}`
              : "sem consumo previsto"}
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
                      <Badge variant="outline" className="text-[10px]">D{la.idadeDias}</Badge>
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
