// Motor de alertas inteligentes — analisa os dados da fazenda e devolve avisos priorizados.
import type { Lote, ItemEstoque, Lancamento, Tarefa, Animal } from "./types";
import { fechamentoLote } from "./fechamentoLote";
import { diffDias, fmtData, hojeISO, isoLocal } from "@/lib/data";

export type Severidade = "critico" | "atencao" | "info";

export type Alerta = {
  id: string;
  severidade: Severidade;
  titulo: string;
  detalhe: string;
  to: string;
  modulo: "granja" | "estoque" | "financeiro" | "gado" | "tarefas";
};

const hoje = () => hojeISO();
const dias = (a: string, b: string) => diffDias(b, a);
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const ORDEM: Record<Severidade, number> = { critico: 0, atencao: 1, info: 2 };

export type DadosAlertas = {
  lotes: Lote[];
  estoque: ItemEstoque[];
  financeiro: Lancamento[];
  tarefas: Tarefa[];
  animais: Animal[];
};

export function gerarAlertas({ lotes, estoque, financeiro, tarefas, animais }: DadosAlertas): Alerta[] {
  const out: Alerta[] = [];
  const hj = hoje();

  // ===== Granja: lote ativo =====
  const ativo = lotes.find((l) => !l.encerrado);
  if (ativo) {
    const f = fechamentoLote(ativo);
    const idade = f.idade;

    // Mortalidade acumulada acima do aceitável (referência: ~0,12%/dia + 1% na 1ª semana)
    const limite = idade <= 7 ? 1.2 : 1 + (idade - 7) * 0.12;
    if (f.mortPct > limite * 1.5) {
      out.push({
        id: "mort-critica", severidade: "critico", modulo: "granja", to: "/granja",
        titulo: `Mortalidade alta no lote ${ativo.numero}`,
        detalhe: `${f.mortPct.toFixed(2)}% acumulado (referência até ${limite.toFixed(2)}% no dia ${idade}). Verifique água, ambiência e sanidade.`,
      });
    } else if (f.mortPct > limite) {
      out.push({
        id: "mort-atencao", severidade: "atencao", modulo: "granja", to: "/granja",
        titulo: `Mortalidade acima da meta`,
        detalhe: `${f.mortPct.toFixed(2)}% no dia ${idade} — meta ${limite.toFixed(2)}%.`,
      });
    }

    // Peso vs meta da linhagem
    if (f.pesoMedioG != null && f.pesoVsMetaPct < -5) {
      out.push({
        id: "peso-abaixo", severidade: f.pesoVsMetaPct < -10 ? "critico" : "atencao", modulo: "granja", to: "/pesagem-pro",
        titulo: "Peso abaixo da curva",
        detalhe: `${Math.round(f.pesoMedioG)} g contra meta de ${Math.round(f.pesoMetaG)} g (${f.pesoVsMetaPct.toFixed(1)}%). Revise ração, comedouros e densidade.`,
      });
    }

    // Sem lançamento diário
    const ultimo = [...ativo.entries].sort((a, b) => a.date.localeCompare(b.date)).pop();
    const atraso = ultimo ? dias(hj, ultimo.date) : idade;
    if (atraso >= 2) {
      out.push({
        id: "sem-lancamento", severidade: atraso >= 4 ? "critico" : "atencao", modulo: "granja", to: "/granja",
        titulo: "Lançamentos diários atrasados",
        detalhe: `Sem registro há ${atraso} dia(s). O cálculo de conversão e peso fica impreciso.`,
      });
    }

    // Sem pesagem recente
    const ultPeso = [...ativo.entries].filter((e) => e.pesoMedioG).sort((a, b) => a.date.localeCompare(b.date)).pop();
    if (idade >= 7 && (!ultPeso || dias(hj, ultPeso.date) >= 7)) {
      out.push({
        id: "sem-pesagem", severidade: "atencao", modulo: "granja", to: "/pesagem-pro",
        titulo: "Pesagem semanal pendente",
        detalhe: ultPeso ? `Última pesagem há ${dias(hj, ultPeso.date)} dias.` : "Nenhuma pesagem registrada neste lote.",
      });
    }

    // Abate próximo
    const faltam = f.diasPrevistos - idade;
    if (faltam >= 0 && faltam <= 7) {
      out.push({
        id: "abate-proximo", severidade: "info", modulo: "granja", to: "/ficha-lote",
        titulo: `Abate em ${faltam} dia(s)`,
        detalhe: `Programe jejum, apanha e o fechamento do lote ${ativo.numero}.`,
      });
    }

    // Ração do lote
    const racaoLote = estoque.filter((i) => i.categoria === "racao" && (!i.loteId || i.loteId === ativo.id));
    const kg = racaoLote.reduce((s, i) => s + i.quantidade, 0);
    const consumoDia = f.vivas > 0 && idade > 0 ? f.racaoConsumidaKg / Math.max(1, idade) : 0;
    if (kg > 0 && consumoDia > 0) {
      const autonomia = kg / consumoDia;
      if (autonomia < 1.5) {
        out.push({
          id: "racao-critica", severidade: "critico", modulo: "estoque", to: "/entregas-racao",
          titulo: "Ração acabando",
          detalhe: `${kg.toLocaleString("pt-BR")} kg em estoque — autonomia de ~${autonomia.toFixed(1)} dia(s). Peça carga agora.`,
        });
      } else if (autonomia < 3) {
        out.push({
          id: "racao-baixa", severidade: "atencao", modulo: "estoque", to: "/entregas-racao",
          titulo: "Estoque de ração baixo",
          detalhe: `Autonomia estimada de ${autonomia.toFixed(1)} dias (${Math.round(consumoDia).toLocaleString("pt-BR")} kg/dia).`,
        });
      }
    }
  } else if (lotes.length > 0) {
    out.push({
      id: "sem-lote", severidade: "info", modulo: "granja", to: "/granja",
      titulo: "Nenhum lote ativo",
      detalhe: "Cadastre o próximo lote para acompanhar o alojamento desde o dia 0.",
    });
  }

  // ===== Estoque geral =====
  estoque
    .filter((i) => i.minimo != null && i.quantidade <= (i.minimo ?? 0))
    .slice(0, 5)
    .forEach((i) => out.push({
      id: `estoque-${i.id}`, severidade: i.quantidade <= 0 ? "critico" : "atencao", modulo: "estoque", to: "/estoque",
      titulo: `${i.nome} ${i.quantidade <= 0 ? "zerado" : "abaixo do mínimo"}`,
      detalhe: `${i.quantidade.toLocaleString("pt-BR")} ${i.unidade} em estoque (mínimo ${i.minimo} ${i.unidade}).`,
    }));

  // ===== Financeiro =====
  const atrasadas = financeiro.filter((l) => l.status !== "pago" && l.vencimento && l.vencimento < hj);
  if (atrasadas.length) {
    const total = atrasadas.reduce((s, l) => s + (l.tipo === "despesa" ? l.valor : 0), 0);
    out.push({
      id: "contas-atrasadas", severidade: "critico", modulo: "financeiro", to: "/financeiro",
      titulo: `${atrasadas.length} conta(s) atrasada(s)`,
      detalhe: `${brl(total)} vencidos. Regularize para evitar juros.`,
    });
  }
  const em7 = isoLocal(new Date(Date.now() + 7 * 86400000));
  const aVencer = financeiro.filter((l) => l.status !== "pago" && l.vencimento && l.vencimento >= hj && l.vencimento <= em7);
  if (aVencer.length) {
    out.push({
      id: "contas-vencendo", severidade: "atencao", modulo: "financeiro", to: "/financeiro",
      titulo: `${aVencer.length} conta(s) vencem em 7 dias`,
      detalhe: `Total de ${brl(aVencer.reduce((s, l) => s + l.valor, 0))} programado.`,
    });
  }

  // ===== Gado: vacinas e reforços =====
  const em30 = isoLocal(new Date(Date.now() + 30 * 86400000));
  const vac = animais
    .filter((a) => a.status === "ativo")
    .flatMap((a) => (a.sanidade ?? []).filter((s) => s.proximaData && s.proximaData <= em30).map((s) => ({ a, s })));
  const vencidas = vac.filter((v) => v.s.proximaData! < hj);
  if (vencidas.length) {
    out.push({
      id: "vacina-vencida", severidade: "critico", modulo: "gado", to: "/gado",
      titulo: `${vencidas.length} vacina(s)/reforço(s) vencido(s)`,
      detalhe: `Ex.: brinco ${vencidas[0]!.a.brinco} — ${vencidas[0]!.s.produto}.`,
    });
  } else if (vac.length) {
    out.push({
      id: "vacina-proxima", severidade: "atencao", modulo: "gado", to: "/gado",
      titulo: `${vac.length} manejo(s) sanitário(s) em 30 dias`,
      detalhe: `Próximo: brinco ${vac[0]!.a.brinco} — ${vac[0]!.s.produto} em ${fmtData(vac[0]!.s.proximaData!)}.`,
    });
  }

  // ===== Tarefas =====
  const atrasadasT = tarefas.filter((t) => !t.concluida && t.vencimento && t.vencimento < hj);
  if (atrasadasT.length) {
    out.push({
      id: "tarefas-atrasadas", severidade: "atencao", modulo: "tarefas", to: "/tarefas",
      titulo: `${atrasadasT.length} tarefa(s) atrasada(s)`,
      detalhe: `Mais antiga: ${atrasadasT[0]!.titulo}.`,
    });
  }

  return out.sort((a, b) => ORDEM[a.severidade] - ORDEM[b.severidade]);
}
