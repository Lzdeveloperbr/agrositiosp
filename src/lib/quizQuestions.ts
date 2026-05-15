// Banco de perguntas diárias do AgroSítio.
// Sorteia ~10 perguntas por dia (semente baseada na data) cobrindo granja, gado, plantio, clima, finanças.

export type Pergunta = {
  id: string;
  area: "Granja" | "Gado" | "Plantio" | "Clima" | "Estoque" | "Financeiro" | "Geral";
  texto: string;
  tipo: "texto" | "numero" | "sim_nao" | "escala";
  unidade?: string;
  placeholder?: string;
};

export const BANCO: Pergunta[] = [
  // Granja
  { id: "g_mort", area: "Granja", tipo: "numero", texto: "Quantas aves morreram hoje no(s) lote(s)?", unidade: "aves" },
  { id: "g_temp", area: "Granja", tipo: "numero", texto: "Temperatura média dentro do galpão hoje?", unidade: "°C" },
  { id: "g_consumo_racao", area: "Granja", tipo: "numero", texto: "Quanto de ração foi consumida hoje?", unidade: "kg" },
  { id: "g_agua", area: "Granja", tipo: "sim_nao", texto: "Bebedouros estão limpos e com água corrente?" },
  { id: "g_cama", area: "Granja", tipo: "escala", texto: "Estado da cama do aviário (1 ruim · 5 ótima)?" },
  { id: "g_ventilacao", area: "Granja", tipo: "sim_nao", texto: "Ventiladores e exaustores funcionando bem?" },
  { id: "g_obs", area: "Granja", tipo: "texto", texto: "Observações sobre o lote (comportamento, sintomas, problemas)?", placeholder: "Ex: aves ofegantes no fim da tarde" },

  // Gado
  { id: "b_pasto", area: "Gado", tipo: "escala", texto: "Condição do pasto hoje (1 baixo · 5 excelente)?" },
  { id: "b_agua", area: "Gado", tipo: "sim_nao", texto: "Cochos e bebedouros do gado abastecidos?" },
  { id: "b_doente", area: "Gado", tipo: "numero", texto: "Quantos animais apresentaram sinais de doença?", unidade: "cabeças" },
  { id: "b_sal", area: "Gado", tipo: "sim_nao", texto: "Sal mineral foi reposto onde necessário?" },
  { id: "b_obs", area: "Gado", tipo: "texto", texto: "Algum animal precisa de atenção especial?", placeholder: "Brinco, sintoma…" },

  // Plantio
  { id: "p_irrigacao", area: "Plantio", tipo: "sim_nao", texto: "Irrigação foi realizada conforme planejado?" },
  { id: "p_pragas", area: "Plantio", tipo: "sim_nao", texto: "Sinais de pragas ou doenças nas plantas hoje?" },
  { id: "p_estagio", area: "Plantio", tipo: "texto", texto: "Como está o desenvolvimento das culturas?", placeholder: "Ex: milho em V6, soja florando" },

  // Clima
  { id: "c_chuva", area: "Clima", tipo: "numero", texto: "Quanto choveu hoje no sítio?", unidade: "mm" },
  { id: "c_vento", area: "Clima", tipo: "escala", texto: "Intensidade do vento (1 calmo · 5 forte)?" },
  { id: "c_temp_max", area: "Clima", tipo: "numero", texto: "Temperatura máxima sentida hoje?", unidade: "°C" },

  // Estoque
  { id: "e_racao", area: "Estoque", tipo: "numero", texto: "Quantos dias de ração ainda restam em estoque?", unidade: "dias" },
  { id: "e_falta", area: "Estoque", tipo: "texto", texto: "Algum insumo está acabando? Qual?", placeholder: "Ex: sal mineral, vacina…" },

  // Financeiro
  { id: "f_despesa", area: "Financeiro", tipo: "numero", texto: "Quanto foi gasto hoje (despesas)?", unidade: "R$" },
  { id: "f_receita", area: "Financeiro", tipo: "numero", texto: "Houve alguma receita / venda hoje?", unidade: "R$" },
  { id: "f_pagto", area: "Financeiro", tipo: "sim_nao", texto: "Tem conta vencendo nos próximos 7 dias?" },

  // Geral
  { id: "ger_seg", area: "Geral", tipo: "sim_nao", texto: "Tudo seguro nas cercas, portões e maquinário?" },
  { id: "ger_func", area: "Geral", tipo: "sim_nao", texto: "Equipe trabalhou normalmente hoje?" },
  { id: "ger_destaque", area: "Geral", tipo: "texto", texto: "Qual foi o destaque positivo do dia?", placeholder: "Ex: finalizamos a colheita do talhão 2" },
  { id: "ger_problema", area: "Geral", tipo: "texto", texto: "Maior problema enfrentado hoje?", placeholder: "Descreva brevemente" },
];

// Hash determinístico simples por data → embaralha mantendo cobertura por área
function hashDia(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function perguntasDoDia(dataISO: string, qtd = 10): Pergunta[] {
  const seed = hashDia(dataISO);
  const areas = Array.from(new Set(BANCO.map((p) => p.area)));
  const escolhidas: Pergunta[] = [];

  // 1 pergunta de cada área (garante cobertura)
  areas.forEach((a, i) => {
    const pool = BANCO.filter((p) => p.area === a);
    if (pool.length) escolhidas.push(pool[(seed + i) % pool.length]);
  });

  // completa até qtd com perguntas pseudo-aleatórias do banco
  const restante = BANCO.filter((p) => !escolhidas.includes(p));
  let i = 0;
  while (escolhidas.length < qtd && restante.length) {
    const idx = (seed + i * 7) % restante.length;
    escolhidas.push(restante.splice(idx, 1)[0]);
    i++;
  }
  return escolhidas.slice(0, qtd);
}

export type RespostasQuiz = Record<string, string>;

export type QuizDia = {
  data: string; // YYYY-MM-DD
  respostas: RespostasQuiz;
  perguntas: Pergunta[];
  analise?: string; // markdown gerado pela IA
  geradoEm?: string;
};

const KEY = "quiz-diario-v1";

export function carregarQuiz(data: string): QuizDia | null {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, QuizDia>;
    return all[data] ?? null;
  } catch { return null; }
}

export function salvarQuiz(q: QuizDia) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, QuizDia>;
    all[q.data] = q;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}

export function listarQuizzes(): QuizDia[] {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, QuizDia>;
    return Object.values(all).sort((a, b) => b.data.localeCompare(a.data));
  } catch { return []; }
}

export function rotuloResposta(p: Pergunta, v: string): string {
  if (!v && v !== "0") return "—";
  if (p.tipo === "sim_nao") return v === "sim" ? "Sim" : v === "nao" ? "Não" : "—";
  if (p.tipo === "escala") return `${v}/5`;
  if (p.unidade) return `${v} ${p.unidade}`;
  return v;
}
