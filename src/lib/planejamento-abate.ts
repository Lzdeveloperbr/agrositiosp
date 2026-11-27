import { refCA, type Linhagem, type Sexo } from "@/lib/silo";
import { planoVentilacaoMinima } from "@/lib/linhagens";

/**
 * Planejamento de abate: simula cada dia possível de carregamento com a mesma previsão
 * de peso da granja (ancorada nas pesagens), estima ração pela CA de referência da
 * linhagem e calcula margem sobre ração, margem por dia de ocupação do galpão e IEP.
 */

export type ParametrosAbate = {
  idadeAtual: number;
  avesVivas: number;
  avesAlojadas: number;
  linhagem: Linhagem;
  sexo: Sexo;
  /** Previsão de peso compartilhada (g) por idade. */
  projetarPesoG: (idade: number) => number;
  precoKgVivo: number;
  precoRacaoKg: number;
  /** Custos fixos do lote (pintinho, gás, mão de obra…), em R$. */
  outrosCustos: number;
  /** Dias de vazio sanitário entre lotes. */
  vazioDias: number;
  /** Área útil do galpão em m² (0 = desconhecida). */
  areaM2: number;
  /** Limite de densidade em kg/m² (ex.: 39 em galpão climatizado). */
  limiteKgM2: number;
  /** Mortalidade diária futura esperada, % das alojadas (referência operacional). */
  mortDiariaPct?: number;
  diaMin?: number;
  diaMax?: number;
};

export type DiaSimulado = {
  idade: number;
  pesoG: number;
  aves: number;
  kgVivo: number;
  kgM2: number | null;
  acimaDensidade: boolean;
  ca: number;
  racaoKg: number;
  receita: number;
  custoRacao: number;
  margem: number;
  margemPorDia: number;
  iep: number;
};

export function simularAbate(p: ParametrosAbate) {
  const mortDia = (p.mortDiariaPct ?? 0.08) / 100;
  const inicio = Math.max(p.idadeAtual, p.diaMin ?? 28);
  const fim = Math.max(inicio, p.diaMax ?? 56);
  const dias: DiaSimulado[] = [];
  for (let d = inicio; d <= fim; d++) {
    const aves = Math.max(
      0,
      Math.round(p.avesVivas - p.avesAlojadas * mortDia * (d - p.idadeAtual)),
    );
    const pesoG = p.projetarPesoG(d);
    const kgVivo = (aves * pesoG) / 1000;
    const ca = refCA(d, p.linhagem, p.sexo);
    const racaoKg = kgVivo * ca;
    const receita = kgVivo * p.precoKgVivo;
    const custoRacao = racaoKg * p.precoRacaoKg;
    const margem = receita - custoRacao - p.outrosCustos;
    const kgM2 = p.areaM2 > 0 ? kgVivo / p.areaM2 : null;
    const viab = p.avesAlojadas > 0 ? (aves / p.avesAlojadas) * 100 : 0;
    dias.push({
      idade: d,
      pesoG,
      aves,
      kgVivo,
      kgM2,
      acimaDensidade: kgM2 !== null && kgM2 > p.limiteKgM2,
      ca,
      racaoKg,
      receita,
      custoRacao,
      margem,
      margemPorDia: margem / Math.max(1, d + p.vazioDias),
      iep: d > 0 && ca > 0 ? Math.round((viab * (pesoG / 1000) * 100) / (d * ca)) : 0,
    });
  }
  const validos = dias.filter((x) => !x.acimaDensidade);
  const base = validos.length ? validos : dias;
  const melhor = <K extends "margemPorDia" | "iep" | "margem">(k: K) =>
    base.reduce<DiaSimulado | null>((m, x) => (!m || x[k] > m[k] ? x : m), null);
  const limiteDensidade = dias.find((x) => x.acimaDensidade)?.idade ?? null;
  return {
    dias,
    melhorMargemDia: melhor("margemPorDia"),
    melhorIEP: melhor("iep"),
    melhorMargemTotal: melhor("margem"),
    /** Primeira idade em que a densidade passa do limite (null = nunca ou área desconhecida). */
    limiteDensidade,
  };
}

// ── Carregamento ────────────────────────────────────────────────

export type ParametrosCarregamento = {
  inicioApanha: Date;
  aves: number;
  pesoG: number;
  /** Jejum total (retirada da ração até o abate), em horas. */
  jejumH: number;
  /** Transporte + espera no frigorífico, em horas. */
  transporteEsperaH: number;
  avesPorHora: number;
  maxAvesCaixa: number;
  maxKgCaixa: number;
  caixasPorCaminhao: number;
};

export function planejarCarregamento(p: ParametrosCarregamento) {
  const h = 3600_000;
  const duracaoH = p.avesPorHora > 0 ? p.aves / p.avesPorHora : 0;
  const pesoKg = p.pesoG / 1000;
  const avesPorCaixa = Math.max(
    1,
    Math.min(p.maxAvesCaixa, pesoKg > 0 ? Math.floor(p.maxKgCaixa / pesoKg) : p.maxAvesCaixa),
  );
  const caixas = Math.ceil(p.aves / avesPorCaixa);
  const caminhoes = Math.max(1, Math.ceil(caixas / Math.max(1, p.caixasPorCaminhao)));
  // A ração sai do alcance das aves de forma que o jejum total (galpão + apanha + viagem + espera)
  // feche no valor pedido para a ave apanhada no meio da operação.
  const horasNoGalpao = Math.max(0, p.jejumH - p.transporteEsperaH - duracaoH / 2);
  // Arredonda para baixo em múltiplos de 15 min: horário prático para a equipe.
  const q = 15 * 60_000;
  const retiradaRacao = new Date(Math.floor((p.inicioApanha.getTime() - horasNoGalpao * h) / q) * q);
  const fimApanha = new Date(p.inicioApanha.getTime() + duracaoH * h);
  const etapas = [
    {
      quando: new Date(retiradaRacao.getTime() - 2 * h),
      titulo: "Última conferência",
      detalhe: "Confirmar horário e equipe de apanha com a integradora; cama seca nos corredores.",
    },
    {
      quando: retiradaRacao,
      titulo: "Retirar a ração",
      detalhe: "Esvaziar e erguer os comedouros. Água continua disponível.",
    },
    {
      quando: new Date(p.inicioApanha.getTime() - 0.5 * h),
      titulo: "Preparar a apanha",
      detalhe:
        "Reduzir a luz (azul/baixa), recolher equipamentos do caminho, dividir o galpão em boxes.",
    },
    {
      quando: p.inicioApanha,
      titulo: "Início da apanha",
      detalhe: "Erguer as linhas de bebedouro conforme o avanço da equipe.",
    },
    {
      quando: fimApanha,
      titulo: "Fim previsto da apanha",
      detalhe: `${caminhoes} caminhão(ões), ${caixas.toLocaleString("pt-BR")} caixas.`,
    },
  ];
  return {
    duracaoH,
    avesPorCaixa,
    caixas,
    caminhoes,
    kgPorCaixa: avesPorCaixa * pesoKg,
    retiradaRacao,
    fimApanha,
    etapas,
    horasNoGalpao,
  };
}

// ── Dimensionamento ─────────────────────────────────────────────

export type ParametrosDimensionamento = {
  idade: number;
  aves: number;
  pesoG: number;
  areaM2: number;
  comedouros: number;
  bebedouros: number;
  exaustores: number;
  cfmExaustor: number;
};

export type Checagem = { item: string; valor: string; referencia: string; ok: boolean | null };

export function dimensionar(p: ParametrosDimensionamento): Checagem[] {
  const fmt = (v: number, d = 1) => v.toLocaleString("pt-BR", { maximumFractionDigits: d });
  const out: Checagem[] = [];
  if (p.areaM2 > 0) {
    const avesM2 = p.aves / p.areaM2;
    const kgM2 = (p.aves * p.pesoG) / 1000 / p.areaM2;
    out.push({
      item: "Aves por m²",
      valor: fmt(avesM2),
      referencia: "até 14–16 aves/m² (climatizado)",
      ok: avesM2 <= 16,
    });
    out.push({
      item: "Densidade atual",
      valor: `${fmt(kgM2)} kg/m²`,
      referencia: "até 39 kg/m² (climatizado) / 30 (convencional)",
      ok: kgM2 <= 39,
    });
  } else {
    out.push({ item: "Densidade", valor: "—", referencia: "Informe a área do galpão", ok: null });
  }
  const limitePrato = p.idade <= 14 ? 70 : 55;
  out.push(
    p.comedouros > 0
      ? {
          item: "Aves por comedouro (prato)",
          valor: fmt(p.aves / p.comedouros, 0),
          referencia: `até ${limitePrato} aves/prato`,
          ok: p.aves / p.comedouros <= limitePrato,
        }
      : {
          item: "Aves por comedouro",
          valor: "—",
          referencia: "Informe a quantidade de pratos",
          ok: null,
        },
  );
  const limiteNipple = p.idade <= 14 ? 16 : 12;
  out.push(
    p.bebedouros > 0
      ? {
          item: "Aves por nipple",
          valor: fmt(p.aves / p.bebedouros, 0),
          referencia: `até ${limiteNipple} aves/nipple`,
          ok: p.aves / p.bebedouros <= limiteNipple,
        }
      : {
          item: "Aves por nipple",
          valor: "—",
          referencia: "Informe a quantidade de nipples",
          ok: null,
        },
  );
  if (p.exaustores > 0 && p.cfmExaustor > 0) {
    const v = planoVentilacaoMinima({
      idadeDias: Math.max(1, p.idade),
      numeroAves: p.aves,
      capacidadeExaustorCfm: p.cfmExaustor,
      totalExaustores: p.exaustores,
    });
    out.push({
      item: "Ventilação mínima",
      valor: `${v.exaustoresNecessarios} exaustor(es) · ${v.segundosLigado1Exaustor}s a cada ${v.cicloSegundos}s`,
      referencia: `${v.cfmTotalNecessario.toLocaleString("pt-BR")} CFM necessários`,
      ok: v.capacidadeOk,
    });
  } else {
    out.push({
      item: "Ventilação mínima",
      valor: "—",
      referencia: "Informe exaustores e CFM",
      ok: null,
    });
  }
  return out;
}
