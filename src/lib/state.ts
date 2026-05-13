// Camada de sync: useLocalStorage virou useCloud — mesma assinatura [items, setItems],
// mas guarda no Supabase com realtime e mapeia camelCase <-> snake_case.
import { useEffect, useState, useCallback, useRef } from "react";
import { useFazenda } from "@/lib/cloud/fazenda";
import type {
  Lote, Medidor, Animal, Pasto, DiarioEntry, Tarefa, ItemEstoque, Lancamento,
  Maquina, Chuva, Monitoramento, Compra,
} from "@/lib/types";
import type { Plantio } from "@/lib/agro";

// ====== mapeamento por tabela ======
type Mapper<T> = { toRow: (v: T) => any; fromRow: (r: any) => T };

const passthrough = <T extends Record<string, any>>(): Mapper<T> => ({
  toRow: (v) => v,
  fromRow: (r) => r as T,
});

// Lote: campos camelCase no app, snake_case no DB
const loteMap: Mapper<Lote> = {
  toRow: (l) => ({
    id: l.id, numero: l.numero, data_entrada: l.dataEntrada, quantidade_inicial: l.quantidadeInicial,
    integradora: l.integradora, previsao_abate_dias: l.previsaoAbateDias, percentual_lucro: l.percentualLucro,
    preco_kg_vivo: l.precoKgVivo ?? null, encerrado: !!l.encerrado, entries: l.entries,
  }),
  fromRow: (r) => ({
    id: r.id, numero: r.numero, dataEntrada: r.data_entrada, quantidadeInicial: r.quantidade_inicial,
    integradora: r.integradora ?? "", previsaoAbateDias: r.previsao_abate_dias, percentualLucro: Number(r.percentual_lucro),
    precoKgVivo: r.preco_kg_vivo ?? undefined, encerrado: !!r.encerrado, entries: r.entries ?? [],
  }),
};

const medidorMap: Mapper<Medidor> = {
  toRow: (m) => ({ id: m.id, nome: m.nome, codigo_instalacao: m.codigoInstalacao, codigo_relogio: m.codigoRelogio, leituras: m.leituras }),
  fromRow: (r) => ({ id: r.id, nome: r.nome, codigoInstalacao: r.codigo_instalacao ?? "", codigoRelogio: r.codigo_relogio ?? "", leituras: r.leituras ?? [] }),
};

const animalMap: Mapper<Animal> = {
  toRow: (a) => ({
    id: a.id, brinco: a.brinco, nome: a.nome ?? null, sexo: a.sexo, raca: a.raca ?? null,
    categoria: a.categoria ?? null, nascimento: a.nascimento ?? null, peso_entrada_kg: a.pesoEntradaKg ?? null,
    data_entrada: a.dataEntrada, origem: a.origem ?? null, preco_compra: a.precoCompra ?? null,
    pasto_id: a.pastoId ?? null, status: a.status, saida_data: a.saidaData ?? null, saida_motivo: a.saidaMotivo ?? null,
    preco_venda: a.precoVenda ?? null, peso_venda_kg: a.pesoVendaKg ?? null, observacoes: a.observacoes ?? null,
    pesagens: a.pesagens, sanidade: a.sanidade,
  }),
  fromRow: (r) => ({
    id: r.id, brinco: r.brinco, nome: r.nome ?? undefined, sexo: r.sexo, raca: r.raca ?? undefined,
    categoria: r.categoria ?? undefined, nascimento: r.nascimento ?? undefined, pesoEntradaKg: r.peso_entrada_kg ?? undefined,
    dataEntrada: r.data_entrada, origem: r.origem ?? undefined, precoCompra: r.preco_compra ?? undefined,
    pastoId: r.pasto_id ?? undefined, status: r.status, saidaData: r.saida_data ?? undefined, saidaMotivo: r.saida_motivo ?? undefined,
    precoVenda: r.preco_venda ?? undefined, pesoVendaKg: r.peso_venda_kg ?? undefined, observacoes: r.observacoes ?? undefined,
    pesagens: r.pesagens ?? [], sanidade: r.sanidade ?? [], reproducao: r.reproducao ?? [],
  }),
};
// Adiciona reproducao no toRow do animal
const _origAnimalToRow = animalMap.toRow;
animalMap.toRow = (a: Animal) => ({ ..._origAnimalToRow(a), reproducao: a.reproducao ?? [] });

const pastoMap: Mapper<Pasto> = {
  toRow: (p) => ({ id: p.id, nome: p.nome, area_ha: p.areaHa ?? null, capacidade: p.capacidade ?? null, observacoes: p.observacoes ?? null }),
  fromRow: (r) => ({ id: r.id, nome: r.nome, areaHa: r.area_ha ?? undefined, capacidade: r.capacidade ?? undefined, observacoes: r.observacoes ?? undefined }),
};

const diarioMap: Mapper<DiarioEntry> = {
  toRow: (d) => ({ id: d.id, data: d.data, titulo: d.titulo, categoria: d.categoria, texto: d.texto, clima: d.clima ?? null, gps: d.gps ?? null, fotos: d.fotos }),
  fromRow: (r) => ({ id: r.id, data: r.data, titulo: r.titulo, categoria: r.categoria, texto: r.texto ?? "", clima: r.clima ?? undefined, gps: r.gps ?? undefined, fotos: r.fotos ?? [] }),
};

const tarefaMap: Mapper<Tarefa> = {
  toRow: (t) => ({ id: t.id, titulo: t.titulo, descricao: t.descricao ?? null, vencimento: t.vencimento ?? null, prioridade: t.prioridade, categoria: t.categoria, concluida: t.concluida }),
  fromRow: (r) => ({ id: r.id, titulo: r.titulo, descricao: r.descricao ?? undefined, vencimento: r.vencimento ?? undefined, prioridade: r.prioridade, categoria: r.categoria, concluida: !!r.concluida, criadaEm: r.created_at }),
};

const estoqueMap: Mapper<ItemEstoque> = {
  toRow: (i) => ({ id: i.id, nome: i.nome, categoria: i.categoria, unidade: i.unidade, quantidade: i.quantidade, minimo: i.minimo ?? null, observacoes: i.observacoes ?? null, movimentacoes: i.movimentacoes }),
  fromRow: (r) => ({ id: r.id, nome: r.nome, categoria: r.categoria, unidade: r.unidade, quantidade: Number(r.quantidade), minimo: r.minimo ?? undefined, observacoes: r.observacoes ?? undefined, movimentacoes: r.movimentacoes ?? [] }),
};

const finMap: Mapper<Lancamento> = {
  toRow: (l) => ({ id: l.id, data: l.data, tipo: l.tipo, categoria: l.categoria, descricao: l.descricao, valor: l.valor, modulo: l.modulo ?? null, vencimento: l.vencimento ?? null, status: l.status ?? "pago", data_pagamento: l.dataPagamento ?? null }),
  fromRow: (r) => ({ id: r.id, data: r.data, tipo: r.tipo, categoria: r.categoria, descricao: r.descricao, valor: Number(r.valor), modulo: r.modulo ?? undefined, vencimento: r.vencimento ?? undefined, status: (r.status ?? "pago") as any, dataPagamento: r.data_pagamento ?? undefined }),
};

const maquinaMap: Mapper<Maquina> = {
  toRow: (m) => ({ id: m.id, nome: m.nome, tipo: m.tipo, marca: m.marca ?? null, modelo: m.modelo ?? null, ano: m.ano ?? null, placa: m.placa ?? null, horimetro: m.horimetro, observacoes: m.observacoes ?? null, abastecimentos: m.abastecimentos, manutencoes: m.manutencoes }),
  fromRow: (r) => ({ id: r.id, nome: r.nome, tipo: r.tipo, marca: r.marca ?? undefined, modelo: r.modelo ?? undefined, ano: r.ano ?? undefined, placa: r.placa ?? undefined, horimetro: Number(r.horimetro ?? 0), observacoes: r.observacoes ?? undefined, abastecimentos: r.abastecimentos ?? [], manutencoes: r.manutencoes ?? [] }),
};
const chuvaMap: Mapper<Chuva> = {
  toRow: (c) => ({ id: c.id, data: c.data, mm: c.mm, local: c.local ?? null, observacoes: c.observacoes ?? null }),
  fromRow: (r) => ({ id: r.id, data: r.data, mm: Number(r.mm), local: r.local ?? undefined, observacoes: r.observacoes ?? undefined }),
};
const monitMap: Mapper<Monitoramento> = {
  toRow: (m) => ({ id: m.id, data: m.data, modulo: m.modulo, alvo: m.alvo, severidade: m.severidade, acao: m.acao ?? null, produto: m.produto ?? null, dose: m.dose ?? null, local: m.local ?? null, gps: m.gps ?? null, fotos: m.fotos, observacoes: m.observacoes ?? null }),
  fromRow: (r) => ({ id: r.id, data: r.data, modulo: r.modulo, alvo: r.alvo, severidade: r.severidade, acao: r.acao ?? undefined, produto: r.produto ?? undefined, dose: r.dose ?? undefined, local: r.local ?? undefined, gps: r.gps ?? undefined, fotos: r.fotos ?? [], observacoes: r.observacoes ?? undefined }),
};
const compraMap: Mapper<Compra> = {
  toRow: (c) => ({ id: c.id, data: c.data, fornecedor: c.fornecedor ?? null, status: c.status, solicitante: c.solicitante ?? null, itens: c.itens, total: c.total, data_pedido: c.dataPedido ?? null, data_recebimento: c.dataRecebimento ?? null, observacoes: c.observacoes ?? null }),
  fromRow: (r) => ({ id: r.id, data: r.data, fornecedor: r.fornecedor ?? undefined, status: r.status, solicitante: r.solicitante ?? undefined, itens: r.itens ?? [], total: Number(r.total ?? 0), dataPedido: r.data_pedido ?? undefined, dataRecebimento: r.data_recebimento ?? undefined, observacoes: r.observacoes ?? undefined }),
};

// ====== hook genérico ======
function useCloud<T extends { id: string }>(table: string, mapper: Mapper<T>) {
  const { client, fazendaId, codigo, operador } = useFazenda();
  const [items, setLocal] = useState<T[]>([]);
  const prevRef = useRef<T[]>([]);

  useEffect(() => { prevRef.current = items; }, [items]);

  // Carregar + realtime
  useEffect(() => {
    if (!fazendaId || !codigo) { setLocal([]); return; }
    let cancel = false;
    client.from(table).select("*").order("created_at", { ascending: false }).then(({ data, error }) => {
      if (cancel) return;
      if (error) { console.error(`[${table}]`, error); return; }
      setLocal(((data as any[]) || []).map(mapper.fromRow));
    });

    const ch = client.channel(`rt:${table}:${fazendaId}`)
      .on("postgres_changes", { event: "*", schema: "public", table, filter: `fazenda_id=eq.${fazendaId}` }, (payload) => {
        setLocal((prev) => {
          if (payload.eventType === "INSERT") {
            const it = mapper.fromRow(payload.new);
            if (prev.some((p) => p.id === it.id)) return prev;
            return [it, ...prev];
          }
          if (payload.eventType === "UPDATE") {
            const it = mapper.fromRow(payload.new);
            return prev.map((p) => (p.id === it.id ? it : p));
          }
          if (payload.eventType === "DELETE") {
            return prev.filter((p) => p.id !== (payload.old as any).id);
          }
          return prev;
        });
      }).subscribe();

    return () => { cancel = true; client.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fazendaId, codigo, table]);

  // setter compatível com [items, setItems]: faz diff e sincroniza
  const setItems = useCallback((v: T[] | ((prev: T[]) => T[])) => {
    setLocal((prev) => {
      const next = typeof v === "function" ? (v as any)(prev) : v;
      // diff
      const prevMap = new Map<string, T>(prev.map((p) => [p.id, p]));
      const nextMap = new Map<string, T>((next as T[]).map((p) => [p.id, p]));

      // adicionados / atualizados
      nextMap.forEach((item, id) => {
        if (!prevMap.has(id)) {
          const row = { ...mapper.toRow(item), fazenda_id: fazendaId, autor: operador || null };
          client.from(table).insert(row).then(({ error }) => { if (error) console.error(`[${table}] insert`, error); });
        } else if (JSON.stringify(prevMap.get(id)) !== JSON.stringify(item)) {
          const row: any = mapper.toRow(item);
          delete row.id;
          client.from(table).update(row).eq("id", id).then(({ error }) => { if (error) console.error(`[${table}] update`, error); });
        }
      });
      // removidos
      prevMap.forEach((_v, id) => {
        if (!nextMap.has(id)) {
          client.from(table).delete().eq("id", id).then(({ error }) => { if (error) console.error(`[${table}] delete`, error); });
        }
      });
      return next;
    });
  }, [client, fazendaId, table, operador, mapper]);

  return [items, setItems] as const;
}

// ====== hooks usados pelo app ======
export const useLotes = () => useCloud<Lote>("lotes", loteMap);
export const useMedidores = () => useCloud<Medidor>("medidores", medidorMap);
export const useAnimais = () => useCloud<Animal>("animais", animalMap);
export const usePastos = () => useCloud<Pasto>("pastos", pastoMap);
export const useDiario = () => useCloud<DiarioEntry>("diario", diarioMap);
export const useTarefas = () => useCloud<Tarefa>("tarefas", tarefaMap);
export const useEstoque = () => useCloud<ItemEstoque>("estoque", estoqueMap);
export const useFinanceiro = () => useCloud<Lancamento>("financeiro", finMap);
export const useMaquinas = () => useCloud<Maquina>("maquinas", maquinaMap);
export const useChuvas = () => useCloud<Chuva>("chuvas", chuvaMap);
export const useMonitoramentos = () => useCloud<Monitoramento>("monitoramentos", monitMap);
export const useCompras = () => useCloud<Compra>("compras", compraMap);

const plantioMap: Mapper<Plantio> = {
  toRow: (p) => ({ id: p.id, cultura: p.cultura, variedade: p.variedade ?? null, area_ha: p.areaHa, quantidade_sementes: p.quantidadeSementes ?? null, unidade_sementes: p.unidadeSementes ?? null, tipo_solo: p.tipoSolo ?? null, local: p.local ?? null, data_plantio: p.dataPlantio, previsao_colheita: p.previsaoColheita ?? null, data_colheita: p.dataColheita ?? null, produtividade_kg: p.produtividadeKg ?? null, preco_kg: p.precoKg ?? null, status: p.status, tratos: p.tratos, observacoes: p.observacoes ?? null }),
  fromRow: (r) => ({ id: r.id, cultura: r.cultura, variedade: r.variedade ?? undefined, areaHa: Number(r.area_ha), quantidadeSementes: r.quantidade_sementes ?? undefined, unidadeSementes: r.unidade_sementes ?? undefined, tipoSolo: r.tipo_solo ?? undefined, local: r.local ?? undefined, dataPlantio: r.data_plantio, previsaoColheita: r.previsao_colheita ?? undefined, dataColheita: r.data_colheita ?? undefined, produtividadeKg: r.produtividade_kg ?? undefined, precoKg: r.preco_kg ?? undefined, status: r.status, tratos: r.tratos ?? [], observacoes: r.observacoes ?? undefined }),
};
export const usePlantios = () => useCloud<Plantio>("plantios", plantioMap);

// Mantido para compatibilidade do botão de Backup (agora apaga local apenas).
export const STORAGE_KEYS = ["agro:lotes","agro:medidores","agro:animais","agro:pastos","agro:diario","agro:tarefas","agro:estoque","agro:financeiro"];

// Suprimir aviso TS sobre passthrough não usado
void passthrough;
