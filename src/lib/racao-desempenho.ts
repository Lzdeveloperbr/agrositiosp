/**
 * Programa de ração por fase e diagnóstico de conversão/peso.
 * O consumo vem sempre do motor do silo (integrarConsumo), para que fases, pedido e
 * estoque usem o mesmo número. Consumo só é tratado como "medido" quando o silo foi
 * pesado fisicamente (fator real calibrado); caso contrário é estimativa e o
 * diagnóstico não tira conclusões de consumo.
 */

export type FaseRacao = { id: string; nome: string; ate: number };

/** Cortes padrão (dia final de cada fase, inclusivo). Ajustáveis conforme a integradora. */
export const CORTES_PADRAO = { pre: 7, ini: 21, cre: 35 };
export type Cortes = typeof CORTES_PADRAO;

export function fasesDe(c: Cortes): FaseRacao[] {
  return [
    { id: "pre", nome: "Pré-inicial", ate: c.pre },
    { id: "ini", nome: "Inicial", ate: Math.max(c.pre + 1, c.ini) },
    { id: "cre", nome: "Crescimento", ate: Math.max(c.ini + 1, c.cre) },
    { id: "ter", nome: "Terminação", ate: Number.POSITIVE_INFINITY },
  ];
}

export type FaseCalculada = {
  id: string;
  nome: string;
  inicioDia: number;
  fimDia: number;
  inicio: Date;
  fim: Date;
  status: "concluida" | "atual" | "futura";
  kgTotal: number;
  kgRestante: number;
};

const DIA = 86400000;

function meiaNoite(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function calcularFases(inp: {
  alojamento: string;
  agora: Date;
  abateDias: number;
  cortes: Cortes;
  estoqueAtualKg: number;
  /** Momento em que o estoque atual acaba (motor do silo), se previsto. */
  tRuptura: Date | null;
  integrarConsumo: (t0: Date, t1: Date) => number;
}) {
  const base = meiaNoite(inp.alojamento);
  const idade = Math.max(0, Math.floor((inp.agora.getTime() - base.getTime()) / DIA));
  const abate = Math.max(1, inp.abateDias);
  const fases: FaseCalculada[] = [];
  let inicioDia = 0;
  for (const f of fasesDe(inp.cortes)) {
    if (inicioDia > abate) break;
    const fimDia = Math.min(f.ate, abate);
    const inicio = new Date(base.getTime() + inicioDia * DIA);
    const fim = new Date(base.getTime() + (fimDia + 1) * DIA);
    const status = idade > fimDia ? "concluida" : idade >= inicioDia ? "atual" : "futura";
    const t0 = inp.agora > inicio ? inp.agora : inicio;
    fases.push({
      id: f.id,
      nome: f.nome,
      inicioDia,
      fimDia,
      inicio,
      fim,
      status,
      kgTotal: Math.max(0, inp.integrarConsumo(inicio, fim)),
      kgRestante: fim > t0 ? Math.max(0, inp.integrarConsumo(t0, fim)) : 0,
    });
    inicioDia = fimDia + 1;
  }
  const atual = fases.find((f) => f.status === "atual") ?? null;
  const proxima = atual
    ? (fases[fases.indexOf(atual) + 1] ?? null)
    : (fases.find((f) => f.status === "futura") ?? null);
  const diasParaTroca =
    atual && proxima
      ? Math.max(0, Math.ceil((atual.fim.getTime() - inp.agora.getTime()) / DIA))
      : null;
  // Sobra: ração da fase atual no silo além do que as aves comem até a troca.
  const sobraFaseAtualKg = atual && proxima ? inp.estoqueAtualKg - atual.kgRestante : 0;
  // Fase em vigor quando o estoque atual acabar: é a ração da próxima carga.
  const quandoAcaba = inp.tRuptura ?? inp.agora;
  const faseProximaCarga =
    fases.find((f) => quandoAcaba >= f.inicio && quandoAcaba < f.fim) ?? fases.at(-1) ?? null;
  const restanteLoteKg = fases.reduce((s, f) => s + f.kgRestante, 0);
  return {
    fases,
    atual,
    proxima,
    diasParaTroca,
    faseProximaCarga,
    sobraFaseAtualKg,
    restanteLoteKg,
    /** Ração que ainda precisa chegar até o abate, descontando o silo. */
    aComprarKg: Math.max(0, restanteLoteKg - inp.estoqueAtualKg),
  };
}

// ── Diagnóstico de conversão e peso ─────────────────────────────

export type Causa = {
  id: string;
  gravidade: "alta" | "media" | "ok";
  titulo: string;
  detalhe: string;
  acoes: string[];
};

export function diagnosticarDesempenho(inp: {
  /** % do peso medido contra a referência na idade da pesagem; null sem pesagem. */
  difPesoPct: number | null;
  /** true só quando o consumo foi calibrado com pesagens físicas do silo. */
  consumoMedido: boolean;
  difConsumoPct: number;
  caEstimada: number;
  caRef: number;
  gpd7: number | null;
  gpdRef: number;
  mortalidadePct: number;
  mortalidadeRefPct: number;
  kgVivoAbate: number;
  precoRacaoKg: number;
}) {
  const causas: Causa[] = [];
  const peso = inp.difPesoPct;
  const consumo = inp.consumoMedido ? inp.difConsumoPct : null;

  if (peso === null) {
    causas.push({
      id: "sem-peso",
      gravidade: "media",
      titulo: "Sem pesagem para avaliar o peso",
      detalhe: "Sem peso medido não dá para separar falta de consumo de má conversão.",
      acoes: [
        "Pesar 1% das aves (mín. 50) em 3 pontos do galpão",
        "Repetir a cada 3–4 dias no mesmo horário",
      ],
    });
  } else if (peso < -3 && consumo !== null && consumo < -5) {
    causas.push({
      id: "baixo-consumo",
      gravidade: peso < -7 ? "alta" : "media",
      titulo: "Peso baixo por falta de consumo",
      detalhe: `Peso ${peso.toFixed(1)}% e consumo medido ${consumo.toFixed(1)}% abaixo da referência: as aves estão comendo pouco.`,
      acoes: [
        "Conferir água: vazão dos nipples, pressão das linhas, temperatura e cloro",
        "Ajustar altura dos comedouros ao dorso e garantir comedouro nunca vazio",
        "Checar temperatura na altura das aves: calor derruba o consumo",
        "Revisar programa de luz (escuro excessivo reduz consumo)",
        "Conferir densidade e espaço de comedouro por ave",
      ],
    });
  } else if (peso < -3 && consumo !== null && consumo >= -3) {
    causas.push({
      id: "ma-conversao",
      gravidade: "alta",
      titulo: "Comendo normal, mas convertendo mal",
      detalhe: `Consumo medido dentro/acima do esperado e peso ${peso.toFixed(1)}% abaixo: a ração não está virando carne.`,
      acoes: [
        "Avaliar saúde intestinal (fezes, necropsia de amostra): coccidiose e enterite",
        "Checar qualidade da ração: pelete com muito fino, troca de fórmula recente",
        "Reduzir estresse térmico: frio e calor gastam energia de mantença",
        "Procurar desperdício: comedouro cheio demais, prato baixo, roscas e silo vazando",
        "Comunicar o técnico da integradora com os dados de consumo e peso",
      ],
    });
  } else if (peso < -3) {
    causas.push({
      id: "peso-baixo",
      gravidade: peso < -7 ? "alta" : "media",
      titulo: `Peso ${peso.toFixed(1)}% abaixo da referência`,
      detalhe:
        "O consumo ainda é estimado. Pese o silo (ou registre as entregas e uma pesagem física) para saber se é falta de consumo ou má conversão.",
      acoes: [
        "Pesar o silo ou registrar o saldo físico hoje e daqui a 2–3 dias",
        "Conferir água, altura de comedouros e temperatura na altura das aves",
        "Repetir a pesagem das aves em 3 pontos",
      ],
    });
  }

  if (consumo !== null && consumo > 5 && (peso === null || peso >= -3)) {
    causas.push({
      id: "consumo-alto",
      gravidade: consumo > 10 ? "alta" : "media",
      titulo: `Consumo ${consumo.toFixed(1)}% acima da referência`,
      detalhe: "Ração acima do esperado sem ganho de peso equivalente piora a CA.",
      acoes: [
        "Procurar desperdício: regulagem dos pratos, comedouro cheio além de 1/3",
        "Conferir vazamentos no silo, roscas e transportadores",
        "Checar frio: aves gastam ração para se aquecer",
        "Confirmar se todas as entregas foram lançadas na data certa",
      ],
    });
  }

  if (inp.gpd7 !== null && inp.gpdRef > 0 && inp.gpd7 < inp.gpdRef * 0.85) {
    causas.push({
      id: "gpd",
      gravidade: "media",
      titulo: "Ganho diário em queda",
      detalhe: `GPD dos últimos dias ${Math.round(inp.gpd7)} g contra ~${Math.round(inp.gpdRef)} g esperados.`,
      acoes: [
        "Rever o que mudou nos últimos 7 dias: fase de ração, vacina, clima, manejo",
        "Verificar consumo de água do dia (queda antecede problema)",
      ],
    });
  }

  if (inp.mortalidadePct > inp.mortalidadeRefPct + 0.5) {
    causas.push({
      id: "mortalidade",
      gravidade: "media",
      titulo: "Mortalidade acima da referência piora a CA",
      detalhe: `${inp.mortalidadePct.toFixed(2)}% contra ~${inp.mortalidadeRefPct.toFixed(2)}%: ração consumida por aves que morrem não vira kg vendido.`,
      acoes: [
        "Recolher mortas 2× ao dia e registrar causa provável",
        "Revisar biosseguridade e calendário sanitário",
      ],
    });
  }

  if (causas.length === 0) {
    causas.push({
      id: "ok",
      gravidade: "ok",
      titulo: "Peso e consumo dentro do esperado",
      detalhe: inp.consumoMedido
        ? "Mantenha a rotina: as referências da linhagem estão sendo atingidas."
        : "Peso no alvo. Para confirmar a conversão, faça pesagens físicas do silo.",
      acoes: [
        "Manter pesagens a cada 3–4 dias",
        "Manter comedouros regulados e água fresca",
        "Registrar o diário todos os dias",
      ],
    });
  }

  const deltaCA =
    inp.consumoMedido && inp.caEstimada > 0 && inp.caRef > 0 ? inp.caEstimada - inp.caRef : null;
  // Sensibilidade: quanto vale 0,01 de CA no lote inteiro, no abate.
  const kgPorCentesimo = inp.kgVivoAbate * 0.01;
  return {
    causas: causas.sort(
      (a, b) =>
        ({ alta: 0, media: 1, ok: 2 })[a.gravidade] - { alta: 0, media: 1, ok: 2 }[b.gravidade],
    ),
    deltaCA,
    custoDesvioCA: deltaCA !== null ? deltaCA * inp.kgVivoAbate * inp.precoRacaoKg : null,
    kgPorCentesimo,
    reaisPorCentesimo: kgPorCentesimo * inp.precoRacaoKg,
  };
}
