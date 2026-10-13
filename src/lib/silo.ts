// ============================================================================
// MOTOR DE ESTOQUE DE RAÇÃO DO SILO — modelo híbrido em tempo real
// ----------------------------------------------------------------------------
// Nunca usa apenas "entregue - teórico". Combina:
//  A) consumo REAL medido por balanço de massa entre pesagens físicas do silo
//  B) consumo estimado pelo PESO REAL das aves (escala metabólica ^0,75)
//  C) curva oficial da linhagem (referência)
// com pesos dinâmicos conforme a qualidade/quantidade dos dados disponíveis,
// perfil de consumo por hora, mortalidade/descartes por data e calibração
// bayesiana simples pela última pesagem física do silo.
// ============================================================================
import { diffDias, isoLocal, parseData } from "@/lib/data";
import { criarProjecaoPeso } from "@/lib/projecaoPeso";
import { dailyTable, ROSS_AP95_WEIGHTS, ROSS_AP95_FEED } from "./ross-ap95";

// ---------- Curvas de referência (g/ave) ----------
export type Linhagem = "cobb500" | "ross308" | "ross_ap95";
export type Sexo = "macho" | "femea" | "misto";

export const CURVAS_SILO: Record<Linhagem, { consumo: Record<number, number>; peso: Record<number, number> }> = {
  cobb500: {
    consumo: { 0: 0, 1: 13, 7: 165, 14: 565, 21: 1240, 28: 2185, 35: 3415, 42: 4905, 49: 6510, 56: 8200 },
    peso: { 0: 42, 1: 50, 7: 185, 14: 470, 21: 925, 28: 1520, 35: 2230, 42: 2980, 49: 3680, 56: 4300 },
  },
  ross308: {
    consumo: { 0: 0, 1: 13, 7: 170, 14: 580, 21: 1265, 28: 2230, 35: 3490, 42: 5010, 49: 6640, 56: 8350 },
    peso: { 0: 43, 1: 52, 7: 192, 14: 485, 21: 950, 28: 1560, 35: 2290, 42: 3050, 49: 3750, 56: 4380 },
  },
  ross_ap95: {
    consumo: dailyTable(ROSS_AP95_FEED),
    peso: dailyTable(ROSS_AP95_WEIGHTS),
  },
};

export const LINHAGEM_SILO_LABEL: Record<Linhagem, string> = {
  cobb500: "Cobb 500",
  ross308: "Ross 308",
  ross_ap95: "Ross AP95 (Ross 308 AP)",
};

const SEXO_MULT: Record<Sexo, { peso: number; consumo: number }> = {
  macho: { peso: 1.06, consumo: 1.05 },
  misto: { peso: 1.0, consumo: 1.0 },
  femea: { peso: 0.94, consumo: 0.95 },
};

function interp(tbl: Record<number, number>, x: number): number {
  const keys = Object.keys(tbl).map(Number).sort((a, b) => a - b);
  if (x <= keys[0]) return tbl[keys[0]];
  const last = keys[keys.length - 1];
  // sem extrapolação: acima da última idade tabelada, mantém o último valor
  if (x >= last) return tbl[last];

  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (x >= a && x <= b) return tbl[a] + ((tbl[b] - tbl[a]) * (x - a)) / (b - a);
  }
  return tbl[last];
}

export const refConsumoAcumG = (d: number, l: Linhagem, s: Sexo) => interp(CURVAS_SILO[l].consumo, d) * SEXO_MULT[s].consumo;
export const refConsumoDiaG = (d: number, l: Linhagem, s: Sexo) =>
  Math.max(0, refConsumoAcumG(d + 1, l, s) - refConsumoAcumG(d, l, s));
export const refPesoG = (d: number, l: Linhagem, s: Sexo) => interp(CURVAS_SILO[l].peso, d) * SEXO_MULT[s].peso;
export const refCA = (d: number, l: Linhagem, s: Sexo) => {
  const p = refPesoG(d, l, s);
  return p > 0 ? refConsumoAcumG(d, l, s) / p : 0;
};

// ---------- Perfil intradiário ----------
export const PERFIL_HORA_PADRAO = [
  1.4, 1.1, 0.9, 0.9, 1.4, 3.0, 5.6, 7.1, 7.5, 6.5, 5.5, 5.0,
  4.5, 4.5, 5.0, 5.6, 6.6, 7.5, 7.0, 5.5, 4.0, 2.8, 1.9, 1.2,
];
const somaPerfil = (p: number[]) => p.reduce((a, b) => a + b, 0);
/** fração (0..1) do consumo do dia já realizada até a hora decimal h */
export function fracaoDia(h: number, perfil = PERFIL_HORA_PADRAO): number {
  const hh = Math.max(0, Math.min(24, h));
  let acc = 0;
  for (let i = 0; i < 24; i++) {
    if (hh >= i + 1) acc += perfil[i];
    else if (hh > i) acc += perfil[i] * (hh - i);
  }
  return acc / somaPerfil(perfil);
}
export const horaDecimal = (d: Date) => d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;

// ---------- Entradas do motor ----------
export type EntregaSilo = { id?: string; data: string; kg: number; hora?: string };
export type PesagemSilo = { id?: string; medidoEm: string; kg: number };
export type DiaLote = { date: string; mortalidade?: number; eliminados?: number; pesoMedioG?: number };

export type SiloCfg = {
  capacidadeKg: number;
  capacidadeOperacionalKg?: number | null;
  estoqueMinimoKg: number;
  margemSegurancaKg: number;
  cargaPadraoKg: number;
  leadTimeHoras: number;
  erroBalancaKg: number;
  perdaPct: number;
};

export const CFG_PADRAO: SiloCfg = {
  capacidadeKg: 20000,
  capacidadeOperacionalKg: null,
  estoqueMinimoKg: 3000,
  margemSegurancaKg: 1000,
  cargaPadraoKg: 8000,
  leadTimeHoras: 24,
  erroBalancaKg: 100,
  perdaPct: 0,
};

export type SiloInput = {
  agora: Date;
  alojamento: string;
  qtdInicial: number;
  previsaoAbateDias: number;
  linhagem: Linhagem;
  sexo: Sexo;
  entries: DiaLote[];
  entregas: EntregaSilo[];
  pesagens: PesagemSilo[];
  cfg: SiloCfg;
  perfilHora?: number[];
};

export type Alerta = { nivel: "critico" | "alto" | "medio" | "info" | "ok"; titulo: string; detalhe: string };

// ---------- Motor ----------
export function calcularSilo(inp: SiloInput) {
  const { agora, linhagem: lin, sexo: sx, cfg } = inp;
  const perfil = inp.perfilHora?.length === 24 ? inp.perfilHora : PERFIL_HORA_PADRAO;
  const aloj = parseData(inp.alojamento) ?? agora;
  const idade = Math.max(0, diffDias(aloj, agora));

  const entries = [...(inp.entries || [])].filter((e) => e.date && parseData(e.date) && e.date <= isoLocal(agora)).sort((a, b) => a.date.localeCompare(b.date));
  const entregas = [...(inp.entregas || [])].filter((e) => Number(e.kg) > 0 && parseData(e.data) && e.data <= isoLocal(agora)).sort((a, b) => a.data.localeCompare(b.data));
  const pesagens = [...(inp.pesagens || [])].filter((p) => parseData(p.medidoEm) && Number(p.kg) >= 0 && (parseData(p.medidoEm)?.getTime() ?? Infinity) <= agora.getTime()).sort((a, b) => a.medidoEm.localeCompare(b.medidoEm));

  // ----- aves -----
  const perdasAte = (iso: string) =>
    entries.filter((e) => e.date <= iso).reduce((s, e) => s + (e.mortalidade || 0) + (e.eliminados || 0), 0);
  const mortAcum = entries.reduce((s, e) => s + (e.mortalidade || 0), 0);
  const elimAcum = entries.reduce((s, e) => s + (e.eliminados || 0), 0);
  const avesVivas = Math.max(0, inp.qtdInicial - mortAcum - elimAcum);
  const mortalidadePct = inp.qtdInicial > 0 ? ((mortAcum + elimAcum) / inp.qtdInicial) * 100 : 0;

  // média diária de baixas nos últimos 7 dias → projeção futura de aves
  const ult7 = entries.slice(-7);
  const baixasDia7 = ult7.length ? ult7.reduce((s, e) => s + (e.mortalidade || 0) + (e.eliminados || 0), 0) / ult7.length : 0;

  const avesNaData = (d: Date): number => {
    const iso = isoLocal(d);
    if (iso <= isoLocal(agora)) return Math.max(0, inp.qtdInicial - perdasAte(iso));
    const dias = diffDias(agora, d);
    return Math.max(0, avesVivas - baixasDia7 * dias);
  };

  // ----- pesagens das aves (peso médio real) -----
  const pesagensAves = entries
    .filter((e) => Number(e.pesoMedioG) > 0)
    .map((e) => ({ iso: e.date, idade: Math.max(0, diffDias(aloj, e.date)), g: Number(e.pesoMedioG) }))
    .sort((a, b) => a.idade - b.idade);
  const ultPesagem = pesagensAves[pesagensAves.length - 1] || null;

  const gpdEntre = (a: typeof pesagensAves[number], b: typeof pesagensAves[number]) =>
    b.idade > a.idade ? (b.g - a.g) / (b.idade - a.idade) : 0;
  const gpdRecente = pesagensAves.length >= 2 && ultPesagem ? gpdEntre(pesagensAves[pesagensAves.length - 2], ultPesagem) : null;
  const gpdMedio = ultPesagem && ultPesagem.idade > 0 ? (ultPesagem.g - refPesoG(0, lin, sx)) / ultPesagem.idade : null;
  const janelaGpd = (dias: number) => {
    if (!ultPesagem) return null;
    const alvo = ultPesagem.idade - dias;
    const ant = [...pesagensAves].reverse().find((p) => p.idade <= alvo);
    return ant ? gpdEntre(ant, ultPesagem) : null;
  };
  const gpd3 = janelaGpd(3);
  const gpd7 = janelaGpd(7);

  const pesoPrevistoG = criarProjecaoPeso(pesagensAves.map((p) => ({ idade: p.idade, pesoG: p.g })), (d) => refPesoG(d, lin, sx));
  const fatorPesoNoDia = (d: number) => pesoPrevistoG(d) / Math.max(1, refPesoG(d, lin, sx));
  const pesoAtualG = ultPesagem && ultPesagem.idade === idade ? ultPesagem.g : pesoPrevistoG(idade);

  // ----- entregas -----
  const dataHoraEntrega = (e: EntregaSilo) => {
    const d = parseData(e.data) ?? agora;
    const [h, m] = (e.hora || "08:00").split(":").map(Number);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), Number.isFinite(h) ? h : 8, Number.isFinite(m) ? m : 0, 0, 0);
  };
  const totalEntregueKg = entregas.reduce((s, e) => s + Number(e.kg), 0);
  const entregasEntre = (t0: Date, t1: Date) =>
    entregas.reduce((s, e) => {
      const t = dataHoraEntrega(e).getTime();
      return t > t0.getTime() && t <= t1.getTime() ? s + Number(e.kg) : s;
    }, 0);

  // intervalos entre entregas
  const intervalos: number[] = [];
  for (let i = 1; i < entregas.length; i++) {
    intervalos.push((dataHoraEntrega(entregas[i]).getTime() - dataHoraEntrega(entregas[i - 1]).getTime()) / 86400000);
  }
  const media = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
  const mediana = (a: number[]) => {
    if (!a.length) return 0;
    const s = [...a].sort((x, y) => x - y);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const desvio = (a: number[]) => {
    if (a.length < 2) return 0;
    const m = media(a);
    return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
  };
  const intervaloEntregas = {
    medio: media(intervalos),
    mediano: mediana(intervalos),
    min: intervalos.length ? Math.min(...intervalos) : 0,
    max: intervalos.length ? Math.max(...intervalos) : 0,
    desvio: desvio(intervalos),
    n: intervalos.length,
  };

  // ----- modelo de consumo por dia de idade (g/ave/dia) -----
  const modeloC = (d: number) => refConsumoDiaG(d, lin, sx);
  const modeloB = (d: number) => refConsumoDiaG(d, lin, sx) * Math.pow(fatorPesoNoDia(d), 0.75);

  // ----- MODELO D: consumo derivado do PESO REAL das aves, dia a dia -----
  // Peso observado (interpolação linear entre as pesagens do lote; fora da série usa a curva ajustada)
  const pesoObsG = (d: number): number => {
    if (!pesagensAves.length) return pesoPrevistoG(d);
    if (d <= pesagensAves[0].idade) {
      const p0 = pesagensAves[0];
      const inicial = refPesoG(0, lin, sx);
      return p0.idade > 0 ? inicial + ((p0.g - inicial) * d) / p0.idade : p0.g;
    }
    for (let i = 0; i < pesagensAves.length - 1; i++) {
      const a = pesagensAves[i], b = pesagensAves[i + 1];
      if (d >= a.idade && d <= b.idade) return a.g + ((b.g - a.g) * (d - a.idade)) / Math.max(1, b.idade - a.idade);
    }
    // após a última pesagem: mantém o desvio observado sobre a curva
    return pesoPrevistoG(d);
  };
  /** ganho de peso (g/ave/dia) medido/estimado no dia d */
  const gpdNoDia = (d: number) => Math.max(0, pesoObsG(d + 1) - pesoObsG(d));
  /** conversão alimentar incremental da linhagem no dia d (kg ração / kg ganho) */
  const caIncremental = (d: number) => {
    const dg = refPesoG(d + 1, lin, sx) - refPesoG(d, lin, sx);
    const dc = refConsumoAcumG(d + 1, lin, sx) - refConsumoAcumG(d, lin, sx);
    if (dg <= 0) return 0;
    const ca = dc / dg;
    return ca > 0.8 && ca < 5 ? ca : 0;
  };
  /** consumo do dia = ganho real do dia × CA incremental + manutenção metabólica */
  const modeloD = (d: number) => {
    const ca = caIncremental(d);
    if (!ca) return modeloB(d);
    const ganho = gpdNoDia(d);
    const crescimento = ganho * ca;
    // manutenção proporcional ao peso metabólico quando o ganho cai (fim de lote/estresse)
    const manutencao = 0.09 * Math.pow(pesoObsG(d) / 1000, 0.75) * 1000 * 0.35;
    const est = crescimento * 0.85 + manutencao;
    const ref = modeloC(d);
    // trava de sanidade: nunca sai de 55%..170% da referência da linhagem
    return Math.max(ref * 0.55, Math.min(ref * 1.7, est));
  };

  // fator real: balanço de massa entre a 1ª e a última pesagem física do silo
  let fatorReal: number | null = null;
  let consumoRealKgPeriodo = 0;
  let diasCobertosReal = 0;
  if (pesagens.length >= 2) {
    const p0 = pesagens[0], p1 = pesagens[pesagens.length - 1];
    const t0 = parseData(p0.medidoEm) ?? agora, t1 = parseData(p1.medidoEm) ?? agora;
    const entradas = entregasEntre(t0, t1);
    const consumoReal = p0.kg + entradas - p1.kg;
    const dias = (t1.getTime() - t0.getTime()) / 86400000;
    if (dias > 0.4 && consumoReal > 0) {
      // consumo teórico no mesmo período (modelo B)
      const teorico = integrarConsumo(t0, t1, (d) => modeloB(d));
      if (teorico > 0) {
        const f = consumoReal / teorico;
        if (f > 0.4 && f < 2.5) {
          fatorReal = f;
          consumoRealKgPeriodo = consumoReal;
          diasCobertosReal = dias;
        }
      }
    }
  }
  const modeloA = (d: number) => modeloB(d) * (fatorReal ?? 1);

  // pesos dinâmicos — sem balança no silo, o peso real das aves manda no cálculo
  const diasDesdePesagemAve = ultPesagem ? Math.max(0, idade - ultPesagem.idade) : null;
  const pesoA = fatorReal ? Math.min(0.6, 0.2 + Math.min(diasCobertosReal, 14) * 0.03) : 0;
  const pesoD = ultPesagem
    ? Math.min(0.55, 0.3 + Math.min(pesagensAves.length, 6) * 0.04 - Math.min(0.2, (diasDesdePesagemAve ?? 0) * 0.03))
    : 0;
  const pesoB = ultPesagem ? Math.min(0.4, 0.2 + Math.max(0, 7 - (diasDesdePesagemAve ?? 0)) * 0.025) : 0;
  const somaABD = pesoA + pesoB + pesoD;
  const wA = pesoA, wB = pesoB, wD = pesoD, wC = Math.max(0.1, 1 - somaABD);
  const norm = wA + wB + wC + wD;
  const pesosModelo = { A: wA / norm, B: wB / norm, C: wC / norm, D: wD / norm };



  const consumoGAveDia = (d: number) =>
    pesosModelo.A * modeloA(d) + pesosModelo.B * modeloB(d) + pesosModelo.C * modeloC(d) + pesosModelo.D * modeloD(d);

  /** consumo (kg) previsto para um dia de calendário */
  function consumoDoDiaKg(dia: Date): number {
    const d = diffDias(aloj, dia);
    if (d < 0 || d > inp.previsaoAbateDias + 10) return 0;
    const base = (consumoGAveDia(d) * avesNaData(dia)) / 1000;
    return base * (1 + (cfg.perdaPct || 0) / 100);
  }

  /** integra o consumo (kg) entre dois instantes usando o perfil horário */
  function integrarConsumo(t0: Date, t1: Date, gAveDia?: (d: number) => number): number {
    if (t1.getTime() <= t0.getTime()) return 0;
    let total = 0;
    const cur = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate());
    const fim = new Date(t1.getFullYear(), t1.getMonth(), t1.getDate());
    let guarda = 0;
    while (cur.getTime() <= fim.getTime() && guarda++ < 400) {
      const h0 = isoLocal(cur) === isoLocal(t0) ? horaDecimal(t0) : 0;
      const h1 = isoLocal(cur) === isoLocal(t1) ? horaDecimal(t1) : 24;
      const frac = Math.max(0, fracaoDia(h1, perfil) - fracaoDia(h0, perfil));
      const d = diffDias(aloj, cur);
      const kgDia = gAveDia
        ? d >= 0 && d <= inp.previsaoAbateDias + 10
          ? (gAveDia(d) * avesNaData(cur)) / 1000
          : 0
        : consumoDoDiaKg(cur);
      total += kgDia * frac;
      cur.setDate(cur.getDate() + 1);
    }
    return total;
  }

  // ----- âncora: última pesagem física, senão balanço desde o alojamento -----
  const ultAncora = pesagens[pesagens.length - 1] || null;
  const ancoraData = ultAncora ? (parseData(ultAncora.medidoEm) ?? aloj) : new Date(aloj.getFullYear(), aloj.getMonth(), aloj.getDate());
  const ancoraKg = ultAncora ? Number(ultAncora.kg) : 0;
  const horasDesdeAncora = Math.max(0, (agora.getTime() - ancoraData.getTime()) / 3600000);

  const entradasDesdeAncora = entregasEntre(ancoraData, agora);
  const consumoDesdeAncora = integrarConsumo(ancoraData, agora);
  const estoqueAtualKg = Math.max(0, ancoraKg + entradasDesdeAncora - consumoDesdeAncora);

  // estoque puro pelo balanço "entregue - teórico" (para comparação/diagnóstico)
  const consumoAcumTeoricoKg = integrarConsumo(new Date(aloj.getFullYear(), aloj.getMonth(), aloj.getDate()), agora, modeloC);
  const estoqueBalancoSimplesKg = totalEntregueKg - consumoAcumTeoricoKg;

  // ----- incerteza / confiança -----
  const sigmaKg = Math.sqrt(
    Math.pow(ultAncora ? cfg.erroBalancaKg : Math.max(200, totalEntregueKg * 0.02), 2) +
      Math.pow(consumoDesdeAncora * 0.06 + (horasDesdeAncora / 24) * 40, 2),
  );
  // Confiança sem balança de silo: sustentada pelas pesagens das aves e pelo histórico de entregas
  let confianca = 25;
  if (ultAncora) {
    confianca = horasDesdeAncora <= 12 ? 95 : horasDesdeAncora <= 48 ? 85 : horasDesdeAncora <= 120 ? 70 : 55;
  } else if (fatorReal) {
    confianca = 65;
  } else if (ultPesagem) {
    // base 55% + 4% por pesagem de ave (máx 6) − penalidade por pesagem antiga
    const bonus = Math.min(6, pesagensAves.length) * 4;
    const penal = Math.min(20, Math.max(0, (diasDesdePesagemAve ?? 0) - 3) * 3);
    confianca = Math.max(35, Math.min(88, 55 + bonus - penal));
  }
  if (entregas.length === 0) confianca = Math.min(confianca, 30);
  const modoEstimativa: "balanca" | "peso_ave" | "curva" = ultAncora ? "balanca" : ultPesagem ? "peso_ave" : "curva";

  // ----- consumo diário -----
  const consumoHojeKg = consumoDoDiaKg(agora);
  const amanha = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1);
  const consumoAmanhaKg = consumoDoDiaKg(amanha);
  const consumoHoraAtualKgH = (consumoHojeKg * (perfil[agora.getHours()] / somaPerfil(perfil))) as number;
  const consumoSegKg = consumoHoraAtualKgH / 3600;

  // médias móveis do consumo (kg/dia)
  const mediaMovel = (dias: number) => {
    let s = 0;
    for (let i = 1; i <= dias; i++) {
      const d = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - i);
      s += consumoDoDiaKg(d);
    }
    return dias ? s / dias : 0;
  };
  const mm3 = mediaMovel(3), mm7 = mediaMovel(7), mm14 = mediaMovel(14);
  const tendencia: "subindo" | "caindo" | "estavel" =
    mm3 > mm7 * 1.03 ? "subindo" : mm3 < mm7 * 0.97 ? "caindo" : "estavel";

  // ----- projeção horária (7 dias) -----
  type Ponto = { t: Date; label: string; estoque: number; consumoAcum: number };
  const projecao: Ponto[] = [];
  let saldo = estoqueAtualKg;
  let acum = 0;
  const marcos: Record<string, number> = {};
  const horizontes = [6, 12, 24, 48, 72, 168];
  let tRuptura: Date | null = null;
  const limiares: { pct: number; kg: number; quando: Date | null }[] = [
    { pct: 50, kg: estoqueAtualKg * 0.5, quando: null },
    { pct: 25, kg: estoqueAtualKg * 0.25, quando: null },
    { pct: 10, kg: estoqueAtualKg * 0.1, quando: null },
    { pct: -1, kg: cfg.estoqueMinimoKg, quando: null },
    { pct: 0, kg: 0, quando: null },
  ];
  for (let h = 1; h <= 168; h++) {
    const t0 = new Date(agora.getTime() + (h - 1) * 3600000);
    const t1 = new Date(agora.getTime() + h * 3600000);
    const c = integrarConsumo(t0, t1);
    acum += c;
    saldo = Math.max(0, saldo - c);
    limiares.forEach((l) => {
      if (!l.quando && saldo <= l.kg) l.quando = t1;
    });
    if (!tRuptura && saldo <= 0) tRuptura = t1;
    if (horizontes.includes(h)) marcos[`h${h}`] = saldo;
    if (h % 6 === 0 || h <= 24) {
      projecao.push({
        t: t1,
        label: `${t1.getDate().toString().padStart(2, "0")}/${(t1.getMonth() + 1).toString().padStart(2, "0")} ${t1.getHours()}h`,
        estoque: Math.round(saldo),
        consumoAcum: Math.round(acum),
      });
    }
  }

  const consumoDiaPrevisto = Math.max(consumoHojeKg, consumoAmanhaKg);
  const autonomiaHoras = tRuptura ? (tRuptura.getTime() - agora.getTime()) / 3600000 : estoqueAtualKg > 0 ? 168 : 0;
  const autonomiaDias = autonomiaHoras / 24;

  // ----- necessidade de pedido -----
  const proximaEntregaEm = Math.max(cfg.leadTimeHoras, intervaloEntregas.mediano * 24 || cfg.leadTimeHoras);
  const consumoAtePedido = integrarConsumo(agora, new Date(agora.getTime() + proximaEntregaEm * 3600000));
  const necessidadeBrutaKg = Math.max(0, consumoAtePedido + cfg.estoqueMinimoKg + cfg.margemSegurancaKg - estoqueAtualKg);
  const espacoSiloKg = Math.max(0, (cfg.capacidadeOperacionalKg || cfg.capacidadeKg) - estoqueAtualKg);
  const pedidoRecomendadoKg = Math.min(
    espacoSiloKg,
    Math.ceil(necessidadeBrutaKg / Math.max(500, cfg.cargaPadraoKg / 4)) * Math.max(500, cfg.cargaPadraoKg / 4),
  );
  const dataPedido = limiares.find((l) => l.pct === -1)?.quando ?? null;

  // ----- zootecnia -----
  // Consumo não é limitado às entregas: o silo pode começar o lote com ração já existente.
  const consumoAcumKg = integrarConsumo(new Date(aloj.getFullYear(), aloj.getMonth(), aloj.getDate()), agora);
  const consumoAcumRefKg = (refConsumoAcumG(idade, lin, sx) * avesVivas) / 1000;
  const consumoPorAveG = avesVivas > 0 ? (consumoAcumKg * 1000) / avesVivas : 0;
  const consumoKgPor1000Dia = avesVivas > 0 ? (consumoHojeKg / avesVivas) * 1000 : 0;
  const pesoTotalVivoKg = (pesoAtualG / 1000) * avesVivas;
  // Conversão estimada: ração estimada / ganho de biomassa das aves vivas; não é CA física medida.
  const ganhoBiomassaKg = Math.max(0, (pesoAtualG - refPesoG(0, lin, sx)) * avesVivas / 1000);
  const fcrReal = ganhoBiomassaKg > 0 ? consumoAcumKg / ganhoBiomassaKg : 0;
  const fcrRef = refCA(idade, lin, sx);
  const difConsumoKg = consumoAcumKg - consumoAcumRefKg;
  const difConsumoPct = consumoAcumRefKg > 0 ? (difConsumoKg / consumoAcumRefKg) * 100 : 0;
  const classeConsumo =
    Math.abs(difConsumoPct) <= 3 ? "dentro do esperado"
    : difConsumoPct > 10 ? "muito acima"
    : difConsumoPct > 3 ? "acima"
    : difConsumoPct < -10 ? "muito abaixo"
    : "abaixo";

  // ----- previsão de crescimento -----
  const previsaoPeso = [1, 3, 7, inp.previsaoAbateDias - idade].filter((n) => n > 0).map((n) => ({
    dias: n,
    idade: idade + n,
    pesoG: Math.round(pesoPrevistoG(idade + n)),
    refG: Math.round(refPesoG(idade + n, lin, sx)),
  }));

  // ----- erro da última pesagem (calibração) -----
  const historicoErros = pesagens.map((p, i) => {
    if (i === 0) return { medidoEm: p.medidoEm, real: Number(p.kg), estimado: null as number | null, erro: null as number | null, erroPct: null as number | null };
    const ant = pesagens[i - 1];
    const t0 = parseData(ant.medidoEm) ?? agora, t1 = parseData(p.medidoEm) ?? agora;
    const est = Number(ant.kg) + entregasEntre(t0, t1) - integrarConsumo(t0, t1);
    const erro = Number(p.kg) - est;
    return { medidoEm: p.medidoEm, real: Number(p.kg), estimado: est, erro, erroPct: p.kg ? (erro / Number(p.kg)) * 100 : null };
  });
  const ultimoErro = [...historicoErros].reverse().find((h) => h.erro !== null) || null;

  // ----- anomalias -----
  const anomalias: string[] = [];
  if (estoqueAtualKg <= 0 && totalEntregueKg > 0) anomalias.push("Estoque estimado zerado — confira as entregas e registre a pesagem das aves de hoje para recalibrar.");
  if (avesVivas > inp.qtdInicial) anomalias.push("Aves vivas maiores que o alojamento — revisar mortalidade.");
  if (mortalidadePct > 8) anomalias.push(`Mortalidade acumulada alta (${mortalidadePct.toFixed(1)}%).`);
  if (ultimoErro && ultimoErro.erroPct !== null && Math.abs(ultimoErro.erroPct) > 10)
    anomalias.push(`Divergência de ${Number(ultimoErro.erro).toFixed(0)} kg entre estimativa e pesagem física.`);
  if (consumoPorAveG > refConsumoAcumG(idade, lin, sx) * 1.4 && idade > 5)
    anomalias.push("Consumo por ave muito acima da referência — verificar desperdício ou vazamento.");
  if (estoqueAtualKg > (cfg.capacidadeOperacionalKg || cfg.capacidadeKg) * 1.02)
    anomalias.push("Estoque estimado acima da capacidade do silo — conferir entregas duplicadas.");
  const dupes = new Map<string, number>();
  entregas.forEach((e) => {
    const k = `${e.data}|${e.kg}`;
    dupes.set(k, (dupes.get(k) || 0) + 1);
  });
  if ([...dupes.values()].some((v) => v > 1)) anomalias.push("Possível entrega duplicada (mesma data e quantidade).");
  if (Math.abs(difConsumoPct) > 15 && idade > 7)
    anomalias.push(`Consumo ${classeConsumo} (${difConsumoPct.toFixed(1)}% vs referência) — investigar ração, água, ambiência ou manejo.`);

  // ----- alertas -----
  const alertas: Alerta[] = [];
  if (estoqueAtualKg <= cfg.estoqueMinimoKg * 0.5)
    alertas.push({ nivel: "critico", titulo: "🔴 Estoque crítico", detalhe: `Restam ${Math.round(estoqueAtualKg)} kg. Pedir ração imediatamente.` });
  else if (estoqueAtualKg <= cfg.estoqueMinimoKg)
    alertas.push({ nivel: "alto", titulo: "🟠 Estoque baixo", detalhe: `Abaixo do mínimo de ${cfg.estoqueMinimoKg} kg. Pedido recomendado.` });
  else if (dataPedido && (dataPedido.getTime() - agora.getTime()) / 3600000 <= proximaEntregaEm)
    alertas.push({ nivel: "medio", titulo: "🟡 Pedido se aproximando", detalhe: `Estoque mínimo previsto para ${dataPedido.toLocaleString("pt-BR")}.` });
  else alertas.push({ nivel: "ok", titulo: "🟢 Estoque normal", detalhe: `Autonomia de ${autonomiaDias.toFixed(1)} dias.` });

  if (!ultAncora)
    alertas.push({
      nivel: "info",
      titulo: "🔵 Estimativa pelo peso das aves",
      detalhe: ultPesagem
        ? `Sem balança no silo: o cálculo usa a pesagem das aves (${ultPesagem.g} g no D${ultPesagem.idade}), mortalidade, idade e a curva da linhagem. Pese as aves a cada 2–3 dias para manter a precisão.`
        : "Sem balança no silo e sem pesagem das aves: o cálculo está só na curva da linhagem. Registre o peso médio das aves na granja para calibrar.",
    });
  else if (horasDesdeAncora > 96)
    alertas.push({ nivel: "info", titulo: "🔵 Pesagem do silo antiga", detalhe: `Última pesagem física há ${(horasDesdeAncora / 24).toFixed(1)} dias.` });
  if (!ultAncora && ultPesagem && (diasDesdePesagemAve ?? 0) > 3)
    alertas.push({ nivel: "medio", titulo: "⚖️ Pesagem das aves atrasada", detalhe: `Última pesagem há ${diasDesdePesagemAve} dias — a estimativa do silo perde precisão.` });
  if (Math.abs(difConsumoPct) > 10 && idade > 7)
    alertas.push({ nivel: "medio", titulo: "⚠️ Consumo fora do padrão", detalhe: `Acumulado ${classeConsumo}: ${difConsumoPct.toFixed(1)}% vs referência.` });
  if (ultimoErro && ultimoErro.erro !== null && Math.abs(ultimoErro.erro) > cfg.erroBalancaKg * 3)
    alertas.push({ nivel: "medio", titulo: "⚠️ Divergência estimado × físico", detalhe: `${ultimoErro.erro > 0 ? "+" : ""}${ultimoErro.erro.toFixed(0)} kg na última pesagem.` });
  if (confianca < 45)
    alertas.push({ nivel: "info", titulo: "⚠️ Dados insuficientes", detalhe: "Registre o peso médio das aves e as entregas de ração para melhorar a precisão." });

  return {
    idade, avesVivas, mortAcum, elimAcum, mortalidadePct, baixasDia7,
    pesoAtualG, gpdRecente, gpdMedio, gpd3, gpd7, ultPesagem, previsaoPeso,
    totalEntregueKg, entregasCount: entregas.length, intervaloEntregas,
    ancora: ultAncora ? { data: ancoraData, kg: ancoraKg } : null,
    horasDesdeAncora, entradasDesdeAncora, consumoDesdeAncora,
    estoqueAtualKg, estoqueBalancoSimplesKg, sigmaKg,
    faixa: { min: Math.max(0, estoqueAtualKg - 1.28 * sigmaKg), max: estoqueAtualKg + 1.28 * sigmaKg },
    confianca, modoEstimativa, pesosModelo, fatorReal, diasDesdePesagemAve, pesagensAves, consumoRealKgPeriodo, diasCobertosReal,
    consumoHojeKg, consumoAmanhaKg, consumoHoraAtualKgH, consumoSegKg,
    mm3, mm7, mm14, tendencia,
    projecao, marcos, autonomiaHoras, autonomiaDias, tRuptura,
    limiares, dataPedido, pedidoRecomendadoKg, espacoSiloKg, consumoAtePedido, proximaEntregaEm,
    consumoAcumKg, consumoAcumRefKg, consumoPorAveG, consumoKgPor1000Dia,
    fcrReal, fcrRef, difConsumoKg, difConsumoPct, classeConsumo,
    pesoTotalVivoKg, historicoErros, ultimoErro, anomalias, alertas,
    consumoDoDiaKg, integrarConsumo, pesoPrevistoG, consumoGAveDia, pesoObsG, gpdNoDia, caIncremental,
  };
}

export type SiloCalc = ReturnType<typeof calcularSilo>;
