import { addDias, diffDias } from "@/lib/data";
import { temperaturaIdealC } from "@/lib/linhagens";
import { refCA } from "@/lib/silo";
import type { ResumoZootecnico } from "@/lib/granja";
import { waterFeedRatio } from "@/lib/automation-checks";
import type { Lote } from "@/lib/types";

/**
 * Piloto automático do lote: transforma os lançamentos internos (diário, pesagens,
 * medições do galpão e motor do silo) em um índice de desempenho e em um plano de ação
 * priorizado. Componentes sem dado ficam fora do índice — nunca assumimos zero.
 */

export type MedicaoGalpao = {
  data: string;
  temperatura_c: number | null;
  umidade_pct: number | null;
  consumo_agua_l: number | null;
  consumo_racao_kg: number | null;
  uniformidade_pct: number | null;
};

export type SiloResumo = {
  estoqueAtualKg: number;
  espacoSiloKg: number;
  autonomiaDias: number;
  alertas: {
    nivel: "critico" | "alto" | "medio" | "info" | "ok";
    titulo: string;
    detalhe: string;
  }[];
};

export type Prioridade = "critica" | "alta" | "media" | "baixa";
export type Acao = {
  id: string;
  prioridade: Prioridade;
  titulo: string;
  detalhe: string;
  to: string;
  label: string;
};

export type Componente = {
  id: "peso" | "viabilidade" | "ambiencia" | "registros" | "silo";
  label: string;
  peso: number;
  nota: number | null;
  detalhe: string;
};

export type Termico = "frio_critico" | "frio" | "conforto" | "calor" | "estresse" | "sem_dado";

export type EstadoGalpao = {
  temperaturaC: number | null;
  umidadePct: number | null;
  idealC: number;
  termico: Termico;
  /** 0..1 — intensidade sugerida de exaustão a partir da temperatura medida. */
  ventilacao: number;
  /** 0..1 — fração do silo ocupada, ou null sem motor do silo. */
  siloFracao: number | null;
  medicaoData: string | null;
  medicaoHoje: boolean;
};

export type Autopilot = {
  indice: number | null;
  classe: "Excelente" | "Bom" | "Atenção" | "Crítico" | "Sem dados";
  componentes: Componente[];
  iepProjetado: number | null;
  acoes: Acao[];
  galpao: EstadoGalpao;
};

const clamp = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v));
const ORDEM: Record<Prioridade, number> = { critica: 0, alta: 1, media: 2, baixa: 3 };
const fmt1 = (v: number) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

/** Referência operacional de mortalidade acumulada (%): ~1% na 1ª semana, +0,08%/dia depois. */
export function refMortalidadeAcumPct(idade: number): number {
  if (idade <= 0) return 0;
  return idade <= 7 ? (idade / 7) * 1 : 1 + (idade - 7) * 0.08;
}

export function classificarTermico(tempC: number | null, idade: number): Termico {
  if (tempC === null || !Number.isFinite(tempC)) return "sem_dado";
  const diff = tempC - temperaturaIdealC(idade);
  if (diff > 4) return "estresse";
  if (diff > 1.5) return "calor";
  if (diff < -4) return "frio_critico";
  if (diff < -1.5) return "frio";
  return "conforto";
}

/** IEP = (viabilidade% × peso kg × 100) / (idade × CA). */
export function calcularIEP(
  viabPct: number,
  pesoKg: number,
  idade: number,
  ca: number,
): number | null {
  if (idade <= 0 || ca <= 0 || pesoKg <= 0) return null;
  return Math.round((viabPct * pesoKg * 100) / (idade * ca));
}

export function ultimaMedicao(medicoes: MedicaoGalpao[], hoje: string): MedicaoGalpao | null {
  return (
    [...medicoes].filter((m) => m.data <= hoje).sort((a, b) => b.data.localeCompare(a.data))[0] ??
    null
  );
}

export function calcularAutopilot(input: {
  lote: Lote;
  resumo: ResumoZootecnico;
  medicoes: MedicaoGalpao[];
  silo: SiloResumo | null;
  hoje: string;
}): Autopilot {
  const { lote, resumo, silo, hoje } = input;
  const idade = resumo.idade;
  const linhagem = lote.linhagem ?? "ross_ap95";
  const sexo = lote.sexo ?? "misto";
  const entries = (lote.entries ?? []).filter((e) => e.date <= hoje);
  const registroHoje = entries.some((e) => e.date === hoje);
  const med = ultimaMedicao(input.medicoes, hoje);
  // Condições do galpão só valem como "atuais" se medidas hoje ou ontem.
  const medRecente = med && diffDias(med.data, hoje) <= 1 ? med : null;
  const tempC = medRecente?.temperatura_c ?? null;
  const umid = medRecente?.umidade_pct ?? null;
  const idealC = temperaturaIdealC(idade);
  const termico = classificarTermico(tempC, idade);
  const acoes: Acao[] = [];
  const add = (a: Acao) => acoes.push(a);
  const diarioTo = `/granja/${lote.id}`;

  // ── Componentes do índice ────────────────────────────────────────
  const componentes: Componente[] = [];

  const diff = resumo.diferencaPesoPct;
  componentes.push({
    id: "peso",
    label: "Peso × referência",
    peso: 0.3,
    nota: diff === null ? null : diff >= 0 ? 100 : clamp(100 + diff * 6),
    detalhe:
      diff === null
        ? "Sem pesagem registrada"
        : `${diff > 0 ? "+" : ""}${fmt1(diff)}% na última pesagem`,
  });

  const refMort = refMortalidadeAcumPct(idade);
  const excessoMort = resumo.mortalidadePct - refMort;
  componentes.push({
    id: "viabilidade",
    label: "Viabilidade",
    peso: 0.3,
    nota: idade > 0 ? clamp(100 - Math.max(0, excessoMort) * 25) : null,
    detalhe: `${fmt1(resumo.mortalidadePct)}% de baixas · ref. ${fmt1(refMort)}%`,
  });

  let notaAmb: number | null = null;
  if (tempC !== null) {
    notaAmb = clamp(100 - Math.max(0, Math.abs(tempC - idealC) - 1.5) * 15);
    if (umid !== null) notaAmb = clamp(notaAmb - Math.max(0, umid - 70, 50 - umid) * 2);
  }
  componentes.push({
    id: "ambiencia",
    label: "Ambiência interna",
    peso: 0.2,
    nota: notaAmb,
    detalhe:
      tempC === null
        ? "Sem medição interna recente"
        : `${fmt1(tempC)} °C · ideal ${idealC} °C${umid !== null ? ` · ${Math.round(umid)}% UR` : ""}`,
  });

  const pesagemRecente = resumo.ultimaPesagem
    ? resumo.diasSemPesar <= 3
      ? 50
      : resumo.diasSemPesar <= 7
        ? 25
        : 0
    : 0;
  componentes.push({
    id: "registros",
    label: "Disciplina de registros",
    peso: 0.1,
    nota:
      idade > 0
        ? (registroHoje ? 50 : 0) + (idade < 3 && !resumo.ultimaPesagem ? 50 : pesagemRecente)
        : null,
    detalhe: `${registroHoje ? "Diário de hoje lançado" : "Diário de hoje pendente"} · ${resumo.ultimaPesagem ? `pesagem há ${resumo.diasSemPesar} d` : "sem pesagem"}`,
  });

  componentes.push({
    id: "silo",
    label: "Autonomia do silo",
    peso: 0.1,
    nota: silo ? clamp((silo.autonomiaDias / 3) * 100) : null,
    detalhe: silo
      ? `${fmt1(silo.autonomiaDias)} dias de ração`
      : "Sem entregas ou pesagens do silo",
  });

  const disponiveis = componentes.filter((c) => c.nota !== null);
  const somaPesos = disponiveis.reduce((s, c) => s + c.peso, 0);
  const indice =
    somaPesos > 0
      ? Math.round(disponiveis.reduce((s, c) => s + (c.nota as number) * c.peso, 0) / somaPesos)
      : null;
  const classe: Autopilot["classe"] =
    indice === null
      ? "Sem dados"
      : indice >= 85
        ? "Excelente"
        : indice >= 70
          ? "Bom"
          : indice >= 55
            ? "Atenção"
            : "Crítico";

  const idadeAbate = Math.max(idade, lote.previsaoAbateDias || 42);
  const viabPct = lote.quantidadeInicial > 0 ? (resumo.vivas / lote.quantidadeInicial) * 100 : 0;
  const iepProjetado =
    idade > 0 && lote.quantidadeInicial > 0
      ? calcularIEP(
          viabPct,
          resumo.pesoProjetadoAbateG / 1000,
          idadeAbate,
          refCA(idadeAbate, linhagem, sexo),
        )
      : null;

  // ── Plano de ação ────────────────────────────────────────────────
  if (idade > 0 && !registroHoje) {
    add({
      id: "diario",
      prioridade: "alta",
      titulo: "Lançar o diário de hoje",
      detalhe: "Mortalidade e eliminados do dia mantêm aves vivas, viabilidade e silo calibrados.",
      to: diarioTo,
      label: "Lançar agora",
    });
  }

  if (resumo.situacao === "critico" && diff !== null) {
    add({
      id: "peso-critico",
      prioridade: "critica",
      titulo: `Peso ${fmt1(Math.abs(diff))}% abaixo da referência`,
      detalhe:
        "Confira altura e quantidade de comedouros, vazão dos bebedouros, temperatura na altura das aves e densidade. Repita a pesagem em 3 pontos do galpão.",
      to: "/pesagem-pro",
      label: "Nova pesagem",
    });
  } else if (resumo.situacao === "atencao" && diff !== null) {
    add({
      id: "peso-atencao",
      prioridade: "media",
      titulo: `Peso ${fmt1(Math.abs(diff))}% abaixo da referência`,
      detalhe:
        "Acompanhe consumo de ração e água nas próximas 48 h e revise o manejo de comedouros.",
      to: "/manejo",
      label: "Ver manejo",
    });
  }

  if (idade >= 3 && (!resumo.ultimaPesagem || resumo.diasSemPesar > 3)) {
    add({
      id: "pesar",
      prioridade: resumo.diasSemPesar > 7 || !resumo.ultimaPesagem ? "alta" : "media",
      titulo: resumo.ultimaPesagem
        ? `Pesagem há ${resumo.diasSemPesar} dias`
        : "Lote ainda sem pesagem",
      detalhe:
        "Uma amostra de 1% das aves (mín. 50) recalibra a previsão de peso, o IEP e o consumo do silo.",
      to: "/pesagem-pro",
      label: "Pesar amostra",
    });
  }

  const ontem = addDias(hoje, -1);
  const diaRef = entries.find((e) => e.date === hoje) ?? entries.find((e) => e.date === ontem);
  if (diaRef && lote.quantidadeInicial > 0) {
    const baixasDia =
      Math.max(0, Number(diaRef.mortalidade) || 0) + Math.max(0, Number(diaRef.eliminados) || 0);
    const pctDia = (baixasDia / lote.quantidadeInicial) * 100;
    const limite = idade <= 7 ? 0.3 : 0.15;
    if (pctDia > limite) {
      add({
        id: "mortalidade-dia",
        prioridade: "critica",
        titulo: `Baixas de ${fmt1(pctDia)}% em ${diaRef.date === hoje ? "hoje" : "ontem"}`,
        detalhe:
          "Acima do limite diário esperado. Faça necropsia de amostra, verifique água, ambiência e comunique o técnico da integradora.",
        to: diarioTo,
        label: "Abrir diário",
      });
    }
  }
  if (idade > 0 && excessoMort > 0.5) {
    add({
      id: "mortalidade-acum",
      prioridade: "alta",
      titulo: "Mortalidade acumulada acima da referência",
      detalhe: `${fmt1(resumo.mortalidadePct)}% contra ${fmt1(refMort)}% esperados no D${idade}. Revise biosseguridade e calendário sanitário.`,
      to: "/calendario-sanitario",
      label: "Sanidade",
    });
  }

  if (termico === "estresse") {
    add({
      id: "calor-critico",
      prioridade: "critica",
      titulo: `Estresse calórico: ${fmt1(tempC as number)} °C medidos`,
      detalhe: `Ideal no D${idade}: ${idealC} °C. Acione toda a exaustão e nebulização, confira água fresca e evite manejo nas horas quentes.`,
      to: "/ambiencia",
      label: "Ambiência",
    });
  } else if (termico === "calor") {
    add({
      id: "calor",
      prioridade: "media",
      titulo: `Galpão acima do conforto (${fmt1(tempC as number)} °C)`,
      detalhe: `Aumente a exaustão ou abra mais inlets. Ideal no D${idade}: ${idealC} °C.`,
      to: "/ambiencia",
      label: "Ambiência",
    });
  } else if (termico === "frio_critico") {
    add({
      id: "frio-critico",
      prioridade: "critica",
      titulo: `Frio crítico: ${fmt1(tempC as number)} °C medidos`,
      detalhe: `Ideal no D${idade}: ${idealC} °C. Acione aquecimento e reduza a ventilação ao mínimo — risco de aglomeração.`,
      to: "/ambiencia",
      label: "Ambiência",
    });
  } else if (termico === "frio") {
    add({
      id: "frio",
      prioridade: "media",
      titulo: `Galpão abaixo do conforto (${fmt1(tempC as number)} °C)`,
      detalhe: `Reduza a exaustão e revise cortinas. Ideal no D${idade}: ${idealC} °C.`,
      to: "/ambiencia",
      label: "Ambiência",
    });
  } else if (termico === "sem_dado" && idade >= 0) {
    add({
      id: "medir",
      prioridade: "media",
      titulo: "Registrar ambiência do galpão",
      detalhe: med
        ? `Última medição interna em ${med.data.split("-").reverse().join("/")}. Temperatura e umidade de hoje alimentam o gêmeo digital e o índice.`
        : "Sem medição interna. Temperatura e umidade alimentam o gêmeo digital e o índice. O clima externo não substitui a medição do galpão.",
      to: "/ambiencia",
      label: "Medir agora",
    });
  }
  if (umid !== null && umid > 75) {
    add({
      id: "umidade",
      prioridade: "media",
      titulo: `Umidade alta (${Math.round(umid)}%)`,
      detalhe:
        "Risco de cama molhada e amônia. Aumente a ventilação mínima e revise vazamentos nos bebedouros.",
      to: "/ambiencia",
      label: "Ambiência",
    });
  }

  const ratio = waterFeedRatio(
    medRecente?.consumo_agua_l ?? null,
    medRecente?.consumo_racao_kg ?? null,
  );
  if (ratio !== null && ratio < 1.5) {
    add({
      id: "agua-baixa",
      prioridade: "alta",
      titulo: `Relação água:ração baixa (${fmt1(ratio)})`,
      detalhe:
        "Esperado entre 1,6 e 2,2. Confira pressão das linhas, nipples entupidos e altura dos bebedouros.",
      to: "/ambiencia",
      label: "Conferir",
    });
  } else if (ratio !== null && ratio > 2.5) {
    add({
      id: "agua-alta",
      prioridade: "media",
      titulo: `Relação água:ração alta (${fmt1(ratio)})`,
      detalhe: "Pode indicar calor, vazamento ou problema entérico. Verifique cama e fezes.",
      to: "/ambiencia",
      label: "Conferir",
    });
  }
  const unif = medRecente?.uniformidade_pct ?? null;
  if (unif !== null && unif < 80) {
    add({
      id: "uniformidade",
      prioridade: "media",
      titulo: `Uniformidade de ${Math.round(unif)}%`,
      detalhe: "Abaixo de 80%. Revise espaço de comedouro por ave e distribuição de ração.",
      to: "/excelencia-lote",
      label: "Excelência",
    });
  }

  if (silo) {
    const grave = silo.alertas.find((a) => a.nivel === "critico" || a.nivel === "alto");
    if (grave)
      add({
        id: "silo",
        prioridade: grave.nivel === "critico" ? "critica" : "alta",
        titulo: grave.titulo.replace(/^\S+\s/, ""),
        detalhe: grave.detalhe,
        to: "/silo",
        label: "Abrir silo",
      });
    else if (silo.autonomiaDias < 2)
      add({
        id: "silo-autonomia",
        prioridade: "alta",
        titulo: `Ração para ${fmt1(silo.autonomiaDias)} dias`,
        detalhe: "Programe a próxima entrega considerando o prazo da fábrica.",
        to: "/silo",
        label: "Abrir silo",
      });
  }

  const faltam = (lote.previsaoAbateDias || 42) - idade;
  if (faltam >= 0 && faltam <= 3) {
    add({
      id: "abate",
      prioridade: "media",
      titulo: faltam === 0 ? "Dia previsto de carregamento" : `Carregamento em ${faltam} dia(s)`,
      detalhe:
        "Confirme horário com a integradora, programe jejum de 8–12 h e retirada dos comedouros.",
      to: "/excelencia-lote",
      label: "Pré-abate",
    });
  }

  acoes.sort((a, b) => ORDEM[a.prioridade] - ORDEM[b.prioridade]);

  const ventilacao = tempC === null ? 0 : clamp((tempC - idealC + 3) / 8, 0.08, 1);
  const capacidade = silo ? silo.estoqueAtualKg + silo.espacoSiloKg : 0;

  return {
    indice,
    classe,
    componentes,
    iepProjetado,
    acoes,
    galpao: {
      temperaturaC: tempC,
      umidadePct: umid,
      idealC,
      termico,
      ventilacao,
      siloFracao: silo && capacidade > 0 ? clamp(silo.estoqueAtualKg / capacidade, 0, 1) : null,
      medicaoData: med?.data ?? null,
      medicaoHoje: med?.data === hoje,
    },
  };
}
