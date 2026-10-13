// Integração com o AVI Smart Config (consultor IA do controlador Inobram SMAAI-03).
// O AgroSítio monta o contexto do lote ativo (idade, aves, peso, clima, galpão)
// e abre o AVI Smart já com todos os parâmetros preenchidos via query string.
import type { Lote } from "./types";
import { diffDias } from "./data";
import { metaPeso, LINHAGEM_LABEL, resolveLinhagem, type Linhagem } from "./linhagens";

export const AVI_SMART_URL = "https://avi-smart-config.lovable.app";

export type AviContexto = {
  loteNumero: string;
  idadeDias: number;
  avesVivas: number;
  pesoMedioG: number;
  pesoFonte: "pesagem" | "curva";
  linhagem: Linhagem;
  larguraM: number;
  comprimentoM: number;
  alturaM: number;
  exaustores: number;
  tempC?: number;
  umidade?: number;
  ventoMs?: number;
  cidade?: string;
};

export type GalpaoCfg = {
  larguraM: number;
  comprimentoM: number;
  alturaM: number;
  totalExaustores: number;
  linhagem: Linhagem;
};

export const AMBIENCIA_CFG_KEY = "agro:ambiencia:cfg";

export function lerGalpaoCfg(): GalpaoCfg {
  const fallback: GalpaoCfg = { larguraM: 14, comprimentoM: 120, alturaM: 3, totalExaustores: 10, linhagem: "ross_ap95" };
  try {
    const raw = localStorage.getItem(AMBIENCIA_CFG_KEY);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

export function montarContexto(
  lote: Lote,
  cfg: GalpaoCfg,
  clima?: { tempC: number; umidade: number; vento: number; cidade?: string },
): AviContexto {
  const idade = Math.max(0, diffDias(lote.dataEntrada));
  const linhagem = resolveLinhagem(lote.linhagem ?? cfg.linhagem);
  const mortas = lote.entries.reduce((s, e) => s + e.mortalidade + (e.eliminados ?? 0), 0);
  const ultPeso = [...lote.entries].reverse().find((e) => e.pesoMedioG)?.pesoMedioG;
  return {
    loteNumero: lote.numero,
    idadeDias: idade,
    avesVivas: Math.max(0, lote.quantidadeInicial - mortas),
    pesoMedioG: ultPeso ?? metaPeso(linhagem, idade),
    pesoFonte: ultPeso ? "pesagem" : "curva",
    linhagem,
    larguraM: cfg.larguraM,
    comprimentoM: cfg.comprimentoM,
    alturaM: cfg.alturaM,
    exaustores: cfg.totalExaustores,
    tempC: clima?.tempC,
    umidade: clima?.umidade,
    ventoMs: clima?.vento,
    cidade: clima?.cidade,
  };
}

export function aviSmartUrl(ctx: AviContexto): string {
  const u = new URL(AVI_SMART_URL);
  const p = u.searchParams;
  p.set("origem", "agrositio");
  p.set("lote", ctx.loteNumero);
  p.set("idade", String(ctx.idadeDias));
  p.set("aves", String(ctx.avesVivas));
  p.set("peso", String(Math.round(ctx.pesoMedioG)));
  p.set("linhagem", ctx.linhagem);
  p.set("largura", String(ctx.larguraM));
  p.set("comprimento", String(ctx.comprimentoM));
  p.set("altura", String(ctx.alturaM));
  p.set("exaustores", String(ctx.exaustores));
  if (ctx.tempC !== undefined) p.set("temp", String(ctx.tempC));
  if (ctx.umidade !== undefined) p.set("umidade", String(ctx.umidade));
  if (ctx.ventoMs !== undefined) p.set("vento", String(ctx.ventoMs));
  if (ctx.cidade) p.set("cidade", ctx.cidade);
  return u.toString();
}

// Resumo em texto para colar no consultor caso o site não leia a query string.
export function resumoTexto(ctx: AviContexto): string {
  return [
    `Lote ${ctx.loteNumero} — ${ctx.idadeDias} dias de idade`,
    `Linhagem: ${LINHAGEM_LABEL[ctx.linhagem]}`,
    `Aves vivas: ${ctx.avesVivas.toLocaleString("pt-BR")}`,
    `Peso médio: ${Math.round(ctx.pesoMedioG)} g (${ctx.pesoFonte === "pesagem" ? "pesagem real" : "estimado pela curva"})`,
    `Galpão: ${ctx.larguraM} x ${ctx.comprimentoM} x ${ctx.alturaM} m · ${ctx.exaustores} exaustores`,
    ctx.tempC !== undefined ? `Clima agora: ${ctx.tempC}ºC · ${ctx.umidade}% UR · vento ${ctx.ventoMs} m/s${ctx.cidade ? ` (${ctx.cidade})` : ""}` : "",
    "Gerar a melhor configuração do SMAAI-03 para esta condição.",
  ].filter(Boolean).join("\n");
}
