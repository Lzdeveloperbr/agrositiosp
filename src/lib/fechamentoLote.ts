import type { Lote } from "./types";
import { CURVAS, resolveLinhagem, type Linhagem } from "./linhagens";
import { diffDias } from "./data";

function interp(curva: { dia: number; peso: number; consumoAcum: number; ca: number }[], dia: number, key: "peso" | "consumoAcum" | "ca"): number {
  if (dia <= curva[0].dia) return curva[0][key];
  if (dia >= curva[curva.length - 1].dia) return curva[curva.length - 1][key];
  for (let i = 0; i < curva.length - 1; i++) {
    const a = curva[i], b = curva[i + 1];
    if (dia >= a.dia && dia <= b.dia) {
      const t = (dia - a.dia) / (b.dia - a.dia);
      return a[key] + (b[key] - a[key]) * t;
    }
  }
  return curva[curva.length - 1][key];
}

export type FechamentoLote = {
  loteId: string;
  numero: string;
  idade: number;
  diasPrevistos: number;
  encerrado: boolean;
  inicial: number;
  baixas: number;
  vivas: number;
  mortPct: number;
  viabilidade: number;
  pesoMedioG: number | null;
  pesoMetaG: number;
  pesoVsMetaPct: number;
  pesoVivoKg: number;
  caEstimado: number;
  racaoConsumidaKg: number;
  racaoTotalKg: number;
  racaoRestanteKg: number;
  receitaEstimada: number;
  custoPintinhos: number;
  custoRacao: number;
  custoOutros: number;
  custoTotal: number;
  lucroLiquido: number;
  lucroPorAve: number;
  margemPct: number;
};

export type CustosLote = {
  precoPintinho?: number;     // R$ por pintinho
  precoRacaoKg?: number;      // R$ por kg de ração
  outrosCustos?: number;      // medicamento, energia, etc.
};

const DEFAULTS: Required<CustosLote> = {
  precoPintinho: 2.8,
  precoRacaoKg: 2.5,
  outrosCustos: 0,
};

export function fechamentoLote(lote: Lote, linhagem: Linhagem = resolveLinhagem(lote.linhagem), custos: CustosLote = {}): FechamentoLote {
  const c = { ...DEFAULTS, ...custos };
  const curva = CURVAS[linhagem];
  const previsao = lote.previsaoAbateDias || 42;
  const idade = Math.max(0, diffDias(lote.dataEntrada));
  const diasRef = lote.encerrado ? Math.min(idade, previsao) : idade;

  const entries = [...lote.entries].sort((a, b) => a.date.localeCompare(b.date));
  const totalMort = entries.reduce((s, e) => s + (e.mortalidade || 0), 0);
  const totalElim = entries.reduce((s, e) => s + (e.eliminados || 0), 0);
  const baixas = totalMort + totalElim;
  const vivas = Math.max(0, lote.quantidadeInicial - baixas);
  const mortPct = lote.quantidadeInicial > 0 ? (baixas / lote.quantidadeInicial) * 100 : 0;
  const viabilidade = 100 - mortPct;

  const ultPesagem = [...entries].reverse().find((e) => e.pesoMedioG && e.pesoMedioG > 0)?.pesoMedioG ?? null;
  const pesoMetaG = interp(curva, diasRef, "peso");
  const pesoFinalG = ultPesagem ?? (lote.encerrado ? interp(curva, previsao, "peso") : pesoMetaG);
  const pesoVsMetaPct = ultPesagem ? ((ultPesagem - pesoMetaG) / pesoMetaG) * 100 : 0;
  const pesoVivoKg = (vivas * pesoFinalG) / 1000;

  const consumoPorAve = interp(curva, diasRef, "consumoAcum") / 1000; // kg/ave
  const consumoTotalPorAve = interp(curva, previsao, "consumoAcum") / 1000;
  const racaoConsumidaKg = consumoPorAve * vivas;
  const racaoTotalKg = consumoTotalPorAve * lote.quantidadeInicial;
  const racaoRestanteKg = Math.max(0, racaoTotalKg - racaoConsumidaKg);
  const caEstimado = interp(curva, diasRef, "ca");

  const precoKg = lote.precoKgVivo ?? 5.5;
  const pesoVivoFinalKg = lote.encerrado
    ? pesoVivoKg
    : (vivas * interp(curva, previsao, "peso")) / 1000;
  const receitaEstimada = pesoVivoFinalKg * precoKg;

  const racaoFinalKg = lote.encerrado ? racaoConsumidaKg : racaoTotalKg;
  const custoPintinhos = lote.quantidadeInicial * c.precoPintinho;
  const custoRacao = racaoFinalKg * c.precoRacaoKg;
  const custoOutros = c.outrosCustos;
  const custoTotal = custoPintinhos + custoRacao + custoOutros;
  const lucroLiquido = receitaEstimada - custoTotal;
  const lucroPorAve = vivas > 0 ? lucroLiquido / vivas : 0;
  const margemPct = receitaEstimada > 0 ? (lucroLiquido / receitaEstimada) * 100 : 0;

  return {
    loteId: lote.id,
    numero: lote.numero,
    idade,
    diasPrevistos: previsao,
    encerrado: !!lote.encerrado,
    inicial: lote.quantidadeInicial,
    baixas,
    vivas,
    mortPct,
    viabilidade,
    pesoMedioG: ultPesagem,
    pesoMetaG,
    pesoVsMetaPct,
    pesoVivoKg,
    caEstimado,
    racaoConsumidaKg,
    racaoTotalKg,
    racaoRestanteKg,
    receitaEstimada,
    custoPintinhos,
    custoRacao,
    custoOutros,
    custoTotal,
    lucroLiquido,
    lucroPorAve,
    margemPct,
  };
}

// Curva de ração por fase (kg/ave) — padrão indústria
export type FaseRacao = { nome: string; diaInicio: number; diaFim: number; gPorAve: number };

export function curvaRacaoPorFase(linhagem: Linhagem = "ross_ap95"): FaseRacao[] {
  const c = CURVAS[linhagem];
  const fases = [
    { nome: "Pré-inicial", diaInicio: 1, diaFim: 10 },
    { nome: "Inicial", diaInicio: 11, diaFim: 21 },
    { nome: "Crescimento", diaInicio: 22, diaFim: 35 },
    { nome: "Final / abate", diaInicio: 36, diaFim: 42 },
  ];
  return fases.map((f) => {
    const consumoIni = interp(c, f.diaInicio - 1, "consumoAcum");
    const consumoFim = interp(c, f.diaFim, "consumoAcum");
    return { ...f, gPorAve: Math.round(consumoFim - consumoIni) };
  });
}
