// Variáveis vivas do sistema (@leite.*, @engorda.*, @granja.*, @financeiro.*, @mercado.*)
// usadas pelas Planilhas Inteligentes e pelo painel unificado da propriedade.
import { useEffect, useState, useCallback } from "react";
import { useFazenda } from "@/lib/cloud/fazenda";
import { diffDias, hojeISO } from "@/lib/data";

export type ResumoPropriedade = {
  leite: {
    litrosHoje: number;
    litrosMes: number;
    vacasLactacao: number;
    rebanho: number;
    mediaVaca: number;
  };
  engorda: {
    cabecas: number;
    lotes: number;
    pesoMedio: number;
    pesoEntrada: number;
    gmd: number;
    arrobasTotais: number;
  };
  granja: {
    lote: string | null;
    alojadas: number;
    vivas: number;
    dias: number;
    pesoMedio: number;
    mortalidadePct: number;
  };
  financeiro: { receitasMes: number; despesasMes: number; saldoMes: number };
  mercado: { arroba: number; leite: number };
};

export const RESUMO_VAZIO: ResumoPropriedade = {
  leite: { litrosHoje: 0, litrosMes: 0, vacasLactacao: 0, rebanho: 0, mediaVaca: 0 },
  engorda: { cabecas: 0, lotes: 0, pesoMedio: 0, pesoEntrada: 0, gmd: 0, arrobasTotais: 0 },
  granja: { lote: null, alojadas: 0, vivas: 0, dias: 0, pesoMedio: 0, mortalidadePct: 0 },
  financeiro: { receitasMes: 0, despesasMes: 0, saldoMes: 0 },
  mercado: { arroba: 0, leite: 0 },
};

const hoje = () => hojeISO();
const inicioMes = () => `${new Date().toISOString().slice(0, 7)}-01`;
const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function resumoParaVars(r: ResumoPropriedade): Record<string, number> {
  return {
    "@leite.litros_mes": r.leite.litrosMes,
    "@leite.litros_hoje": r.leite.litrosHoje,
    "@leite.vacas_lactacao": r.leite.vacasLactacao,
    "@leite.rebanho": r.leite.rebanho,
    "@leite.media_vaca": r.leite.mediaVaca,
    "@engorda.cabecas": r.engorda.cabecas,
    "@engorda.lotes": r.engorda.lotes,
    "@engorda.peso_medio": r.engorda.pesoMedio,
    "@engorda.peso_entrada": r.engorda.pesoEntrada,
    "@engorda.gmd": r.engorda.gmd,
    "@engorda.arrobas": r.engorda.arrobasTotais,
    "@granja.alojadas": r.granja.alojadas,
    "@granja.vivas": r.granja.vivas,
    "@granja.dias": r.granja.dias,
    "@granja.peso_medio": r.granja.pesoMedio,
    "@granja.mortalidade": r.granja.mortalidadePct,
    "@financeiro.receitas_mes": r.financeiro.receitasMes,
    "@financeiro.despesas_mes": r.financeiro.despesasMes,
    "@financeiro.saldo_mes": r.financeiro.saldoMes,
    "@mercado.arroba": r.mercado.arroba,
    "@mercado.leite": r.mercado.leite,
  };
}

export function useResumoPropriedade(intervaloMs = 60_000) {
  const { client, fazendaId, codigo } = useFazenda();
  const [resumo, setResumo] = useState<ResumoPropriedade>(RESUMO_VAZIO);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    if (!fazendaId || !codigo) { setResumo(RESUMO_VAZIO); setLoading(false); return; }
    const d0 = inicioMes();
    const [prod, vacas, lotesEng, animEng, pesEng, fin, cot, lotes] = await Promise.all([
      client.from("leite_producao").select("data,total").gte("data", d0),
      client.from("leite_animais").select("categoria,status"),
      client.from("engorda_lotes").select("id,quantidade,peso_medio_inicial_kg,data_entrada,meta_gmd,encerrado"),
      client.from("engorda_animais").select("id,status,peso_entrada_kg"),
      client.from("engorda_pesagens").select("data,peso_medio_kg,quantidade").order("data", { ascending: false }).limit(50),
      client.from("financeiro").select("tipo,valor,data").gte("data", d0),
      client.from("cotacoes").select("produto,valor,data").order("data", { ascending: false }).limit(50),
      client.from("lotes").select("*").eq("encerrado", false).order("data_entrada", { ascending: false }).limit(1),
    ]);

    const r: ResumoPropriedade = JSON.parse(JSON.stringify(RESUMO_VAZIO));

    // Leite
    const linhasProd = (prod.data as any[]) ?? [];
    r.leite.litrosMes = linhasProd.reduce((s, l) => s + num(l.total), 0);
    r.leite.litrosHoje = linhasProd.filter((l) => l.data === hoje()).reduce((s, l) => s + num(l.total), 0);
    const rebanho = ((vacas.data as any[]) ?? []).filter((a) => a.status === "ativo");
    r.leite.rebanho = rebanho.length;
    r.leite.vacasLactacao = rebanho.filter((a) => String(a.categoria).toLowerCase().includes("lacta")).length;
    r.leite.mediaVaca = r.leite.vacasLactacao ? r.leite.litrosHoje / r.leite.vacasLactacao : 0;

    // Engorda
    const lotesE = ((lotesEng.data as any[]) ?? []).filter((l) => !l.encerrado);
    r.engorda.lotes = lotesE.length;
    const animais = ((animEng.data as any[]) ?? []).filter((a) => a.status === "ativo");
    r.engorda.cabecas = animais.length || lotesE.reduce((s, l) => s + num(l.quantidade), 0);
    const pesagens = (pesEng.data as any[]) ?? [];
    r.engorda.pesoMedio = pesagens.length ? num(pesagens[0].peso_medio_kg) : 0;
    const entradas = animais.map((a) => num(a.peso_entrada_kg)).filter(Boolean);
    r.engorda.pesoEntrada = entradas.length
      ? entradas.reduce((s, v) => s + v, 0) / entradas.length
      : (lotesE.length ? lotesE.reduce((s, l) => s + num(l.peso_medio_inicial_kg), 0) / lotesE.length : 0);
    const loteRef = lotesE[0];
    if (loteRef && r.engorda.pesoMedio && r.engorda.pesoEntrada) {
      const dias = Math.max(1, diffDias(loteRef.data_entrada));
      r.engorda.gmd = (r.engorda.pesoMedio - r.engorda.pesoEntrada) / dias;
    }
    r.engorda.arrobasTotais = (r.engorda.pesoMedio * 0.52 / 15) * r.engorda.cabecas;

    // Granja (lote ativo)
    const lote = ((lotes.data as any[]) ?? [])[0];
    if (lote) {
      const entries: any[] = lote.entries ?? [];
      const mortos = entries.reduce((s, e) => s + num(e.mortalidade) + num(e.eliminados), 0);
      r.granja.lote = lote.numero;
      r.granja.alojadas = num(lote.quantidade_inicial);
      r.granja.vivas = Math.max(0, r.granja.alojadas - mortos);
      r.granja.dias = Math.max(0, diffDias(lote.data_entrada));
      const comPeso = entries.filter((e) => num(e.pesoMedioG) > 0).sort((a, b) => (a.date < b.date ? 1 : -1));
      r.granja.pesoMedio = comPeso.length ? num(comPeso[0].pesoMedioG) / 1000 : 0;
      r.granja.mortalidadePct = r.granja.alojadas ? (mortos / r.granja.alojadas) * 100 : 0;
    }

    // Financeiro
    for (const l of ((fin.data as any[]) ?? [])) {
      if (l.tipo === "receita") r.financeiro.receitasMes += num(l.valor);
      else r.financeiro.despesasMes += num(l.valor);
    }
    r.financeiro.saldoMes = r.financeiro.receitasMes - r.financeiro.despesasMes;

    // Mercado
    for (const c of ((cot.data as any[]) ?? [])) {
      const p = String(c.produto).toLowerCase();
      if (!r.mercado.arroba && (p.includes("boi") || p.includes("arroba"))) r.mercado.arroba = num(c.valor);
      if (!r.mercado.leite && p.includes("leite")) r.mercado.leite = num(c.valor);
    }

    setResumo(r);
    setLoading(false);
  }, [client, fazendaId, codigo]);

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, intervaloMs);
    return () => clearInterval(t);
  }, [carregar, intervaloMs]);

  return { resumo, loading, recarregar: carregar, vars: resumoParaVars(resumo) };
}
