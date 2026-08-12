// Motor das Planilhas Inteligentes: fórmulas estilo Excel + variáveis vivas do sistema (@).
export type Celulas = Record<string, string>; // "A1" -> "10" ou "=SOMA(A1:A5)"
export type Coluna = { key: string; label: string; largura?: number };

export const COL_LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function colIndex(letra: string) {
  return COL_LETRAS.indexOf(letra.toUpperCase());
}

export function refToKey(col: number, row: number) {
  return `${COL_LETRAS[col]}${row}`;
}

const FUNCOES: Record<string, (n: number[]) => number> = {
  SOMA: (n) => n.reduce((s, v) => s + v, 0),
  SUM: (n) => n.reduce((s, v) => s + v, 0),
  MEDIA: (n) => (n.length ? n.reduce((s, v) => s + v, 0) / n.length : 0),
  AVG: (n) => (n.length ? n.reduce((s, v) => s + v, 0) / n.length : 0),
  MIN: (n) => (n.length ? Math.min(...n) : 0),
  MAX: (n) => (n.length ? Math.max(...n) : 0),
  CONT: (n) => n.filter((v) => v !== 0).length,
  COUNT: (n) => n.length,
};

function expandRange(a: string, b: string): string[] {
  const m1 = /^([A-Z]+)(\d+)$/i.exec(a);
  const m2 = /^([A-Z]+)(\d+)$/i.exec(b);
  if (!m1 || !m2) return [];
  const c1 = colIndex(m1[1]!), c2 = colIndex(m2[1]!);
  const r1 = parseInt(m1[2]!, 10), r2 = parseInt(m2[2]!, 10);
  const out: string[] = [];
  for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++)
    for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) out.push(refToKey(c, r));
  return out;
}

export function numeroDe(valor: string | number | undefined): number {
  if (valor === undefined || valor === null || valor === "") return 0;
  if (typeof valor === "number") return valor;
  const n = Number(String(valor).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** Avalia uma célula (com cache e proteção contra referência circular). */
export function avaliar(
  key: string,
  celulas: Celulas,
  vars: Record<string, number>,
  cache: Record<string, number | string> = {},
  visitando: Set<string> = new Set(),
): number | string {
  if (key in cache) return cache[key]!;
  const bruto = celulas[key] ?? "";
  if (!bruto.startsWith("=")) {
    cache[key] = bruto;
    return bruto;
  }
  if (visitando.has(key)) return "#CIRC";
  visitando.add(key);

  let expr = bruto.slice(1);

  // Variáveis do sistema: @granja.vivas
  expr = expr.replace(/@[a-z_]+\.[a-z_0-9]+/gi, (v) => String(vars[v.toLowerCase()] ?? 0));

  // Funções com intervalo ou lista
  expr = expr.replace(/([A-Z]+)\(([^()]*)\)/gi, (_m, fn: string, args: string) => {
    const f = FUNCOES[fn.toUpperCase()];
    if (!f) return "0";
    const nums: number[] = [];
    for (const parte of args.split(";").flatMap((p) => p.split(","))) {
      const t = parte.trim();
      if (!t) continue;
      const range = /^([A-Z]+\d+):([A-Z]+\d+)$/i.exec(t);
      if (range) {
        for (const k of expandRange(range[1]!, range[2]!)) {
          nums.push(numeroDe(avaliar(k, celulas, vars, cache, visitando) as any));
        }
      } else if (/^[A-Z]+\d+$/i.test(t)) {
        nums.push(numeroDe(avaliar(t.toUpperCase(), celulas, vars, cache, visitando) as any));
      } else {
        nums.push(numeroDe(t));
      }
    }
    return String(f(nums));
  });

  // Referências simples
  expr = expr.replace(/\b([A-Z]+\d+)\b/gi, (ref) =>
    String(numeroDe(avaliar(ref.toUpperCase(), celulas, vars, cache, visitando) as any)),
  );

  visitando.delete(key);

  if (!/^[-+*/().,%\d\s]*$/.test(expr)) {
    cache[key] = "#ERRO";
    return "#ERRO";
  }
  try {
    // eslint-disable-next-line no-new-func
    const r = Function(`"use strict";return (${expr.replace(/,/g, ".") || 0})`)();
    const val = Number.isFinite(r) ? Math.round(r * 10000) / 10000 : "#ERRO";
    cache[key] = val;
    return val;
  } catch {
    cache[key] = "#ERRO";
    return "#ERRO";
  }
}

export function avaliarTudo(celulas: Celulas, vars: Record<string, number>) {
  const cache: Record<string, number | string> = {};
  const out: Record<string, number | string> = {};
  for (const k of Object.keys(celulas)) out[k] = avaliar(k, celulas, vars, cache);
  return out;
}

export type ModeloPlanilha = {
  id: string;
  nome: string;
  atividade: string;
  descricao: string;
  colunas: string[];
  celulas: Celulas;
  linhas: number;
};

export const MODELOS: ModeloPlanilha[] = [
  {
    id: "branco",
    nome: "Planilha em branco",
    atividade: "geral",
    descricao: "Comece do zero com fórmulas livres.",
    colunas: ["A", "B", "C", "D", "E", "F"],
    celulas: {},
    linhas: 30,
  },
  {
    id: "custo_leite",
    nome: "Custo de produção do leite",
    atividade: "leite",
    descricao: "Litros, preço, custos e margem por litro com dados vivos do módulo Leite.",
    colunas: ["A", "B", "C", "D"],
    celulas: {
      A1: "Item", B1: "Valor", C1: "Unidade", D1: "Observação",
      A2: "Litros do mês", B2: "=@leite.litros_mes", C2: "L", D2: "Automático",
      A3: "Preço por litro", B3: "2.40", C3: "R$/L",
      A4: "Receita", B4: "=B2*B3", C4: "R$",
      A5: "Custo ração", B5: "0", C5: "R$",
      A6: "Custo mão de obra", B6: "0", C6: "R$",
      A7: "Outros custos", B7: "0", C7: "R$",
      A8: "Custo total", B8: "=SOMA(B5:B7)", C8: "R$",
      A9: "Custo por litro", B9: "=B8/B2", C9: "R$/L",
      A10: "Margem por litro", B10: "=B3-B9", C10: "R$/L",
      A11: "Lucro do mês", B11: "=B4-B8", C11: "R$",
    },
    linhas: 20,
  },
  {
    id: "engorda",
    nome: "Fechamento de engorda",
    atividade: "engorda",
    descricao: "Compra, GMD, arrobas e lucro por cabeça.",
    colunas: ["A", "B", "C", "D"],
    celulas: {
      A1: "Item", B1: "Valor", C1: "Unidade",
      A2: "Cabeças", B2: "=@engorda.cabecas", C2: "cab",
      A3: "Peso médio atual", B3: "=@engorda.peso_medio", C3: "kg",
      A4: "Peso médio entrada", B4: "=@engorda.peso_entrada", C4: "kg",
      A5: "Ganho por cabeça", B5: "=B3-B4", C5: "kg",
      A6: "Rendimento carcaça", B6: "52", C6: "%",
      A7: "Arrobas por cabeça", B7: "=B3*B6/100/15", C7: "@",
      A8: "Preço da arroba", B8: "=@mercado.arroba", C8: "R$",
      A9: "Receita por cabeça", B9: "=B7*B8", C9: "R$",
      A10: "Custo por cabeça", B10: "0", C10: "R$",
      A11: "Lucro por cabeça", B11: "=B9-B10", C11: "R$",
      A12: "Lucro do lote", B12: "=B11*B2", C12: "R$",
    },
    linhas: 20,
  },
  {
    id: "frango",
    nome: "Fechamento do lote de frango",
    atividade: "frango",
    descricao: "Viabilidade, conversão e IEP com dados vivos da granja.",
    colunas: ["A", "B", "C", "D"],
    celulas: {
      A1: "Indicador", B1: "Valor", C1: "Unidade",
      A2: "Aves alojadas", B2: "=@granja.alojadas", C2: "aves",
      A3: "Aves vivas", B3: "=@granja.vivas", C3: "aves",
      A4: "Mortalidade", B4: "=B2-B3", C4: "aves",
      A5: "Viabilidade", B5: "=B3/B2*100", C5: "%",
      A6: "Idade", B6: "=@granja.dias", C6: "dias",
      A7: "Peso médio", B7: "=@granja.peso_medio", C7: "kg",
      A8: "GPD", B8: "=B7*1000/B6", C8: "g/dia",
      A9: "Conversão alimentar", B9: "1.65", C9: "kg/kg",
      A10: "IEP", B10: "=B5*B7/(B6*B9)*100", C10: "índice",
    },
    linhas: 20,
  },
  {
    id: "fluxo_caixa",
    nome: "Fluxo de caixa da propriedade",
    atividade: "geral",
    descricao: "Entradas e saídas mês a mês com saldo acumulado.",
    colunas: ["A", "B", "C", "D", "E"],
    celulas: {
      A1: "Mês", B1: "Entradas", C1: "Saídas", D1: "Saldo", E1: "Acumulado",
      A2: "Janeiro", B2: "0", C2: "0", D2: "=B2-C2", E2: "=D2",
      A3: "Fevereiro", B3: "0", C3: "0", D3: "=B3-C3", E3: "=E2+D3",
      A4: "Março", B4: "0", C4: "0", D4: "=B4-C4", E4: "=E3+D4",
      A5: "Abril", B5: "0", C5: "0", D5: "=B5-C5", E5: "=E4+D5",
      A6: "Maio", B6: "0", C6: "0", D6: "=B6-C6", E6: "=E5+D6",
      A7: "Junho", B7: "0", C7: "0", D7: "=B7-C7", E7: "=E6+D7",
    },
    linhas: 20,
  },
];

export const VARIAVEIS_DOC: { chave: string; desc: string }[] = [
  { chave: "@leite.litros_mes", desc: "Litros produzidos no mês atual" },
  { chave: "@leite.litros_hoje", desc: "Litros de hoje" },
  { chave: "@leite.vacas_lactacao", desc: "Vacas em lactação" },
  { chave: "@leite.media_vaca", desc: "Média de litros por vaca/dia" },
  { chave: "@engorda.cabecas", desc: "Cabeças em engorda" },
  { chave: "@engorda.peso_medio", desc: "Peso médio atual (kg)" },
  { chave: "@engorda.peso_entrada", desc: "Peso médio de entrada (kg)" },
  { chave: "@engorda.gmd", desc: "Ganho médio diário (kg/dia)" },
  { chave: "@granja.alojadas", desc: "Aves alojadas no lote ativo" },
  { chave: "@granja.vivas", desc: "Aves vivas agora" },
  { chave: "@granja.dias", desc: "Idade do lote em dias" },
  { chave: "@granja.peso_medio", desc: "Peso médio das aves (kg)" },
  { chave: "@financeiro.receitas_mes", desc: "Receitas do mês" },
  { chave: "@financeiro.despesas_mes", desc: "Despesas do mês" },
  { chave: "@financeiro.saldo_mes", desc: "Saldo do mês" },
  { chave: "@mercado.arroba", desc: "Preço de referência da arroba" },
];
