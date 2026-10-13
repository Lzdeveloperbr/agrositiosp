import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { DailyEntry, Lote } from "@/lib/types";
import { calcularResumoLote } from "@/lib/granja";
import { calcularSilo, CFG_PADRAO, type Linhagem, type Sexo } from "@/lib/silo";

export async function getPoultryContext(
  code: string,
  numero: string | null = null,
  signal?: AbortSignal,
) {
  if (!code.trim() || code.length > 80)
    throw new Error("Entre na granja para consultar o assistente.");
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Não foi possível conectar aos dados da granja.");
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`)
          headers.delete("Authorization");
        headers.set("apikey", key);
        headers.set("x-fazenda-codigo", code.trim().toUpperCase());
        return fetch(input, { ...init, headers, signal });
      },
    },
  });
  const farm = await client.rpc("entrar_fazenda", { p_codigo: code.trim().toUpperCase() });
  if (farm.error) throw new Error("Não foi possível verificar o acesso à granja.");
  if (!farm.data?.length) throw new Error("Código da granja inválido.");
  const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
  let query = client.from("lotes").select("*").lte("data_entrada", date).order("data_entrada", { ascending: false });
  query = numero ? query.eq("numero", numero) : query.eq("encerrado", false);
  const lots = await query.limit(1).maybeSingle();
  if (lots.error) throw new Error("Não foi possível ler o lote.");
  const row = lots.data;
  if (!row)
    return {
      granja: farm.data[0].nome,
      lote: null,
      dados_ausentes: [numero ? `Lote ${numero} não encontrado nesta granja` : "Nenhum lote ativo"],
    };
  const [med, ent, pes, conf, tasks] = await Promise.all([
    client
      .from("lote_medicoes")
      .select(
        "data,consumo_agua_l,consumo_racao_kg,temperatura_c,umidade_pct,cama,horas_luz,iluminacao_lux,uniformidade_pct,ventilacao,observacoes",
      )
      .eq("lote_id", row.id)
      .order("data", { ascending: false })
      .limit(30),
    client
      .from("entregas_racao")
      .select("id,data,quantidade_kg")
      .eq("lote_id", row.id)
      .order("data"),
    client
      .from("silo_pesagens")
      .select("id,medido_em,estoque_kg")
      .eq("lote_id", row.id)
      .order("medido_em"),
    client
      .from("silo_config")
      .select("*")
      .eq("lote_id", row.id)
      .order("updated_at", { ascending: false })
      .limit(1),
    client.from("tarefas").select("titulo,vencimento,prioridade").eq("concluida", false).limit(20),
  ]);
  if ([med, ent, pes, conf, tasks].some((r) => r.error))
    throw new Error(
      "A consulta dos dados do lote falhou. Nenhuma estimativa foi apresentada como medição.",
    );
  const now = new Date();
  const lote: Lote = {
    id: row.id,
    numero: row.numero,
    dataEntrada: row.data_entrada,
    quantidadeInicial: row.quantidade_inicial,
    integradora: row.integradora ?? "",
    previsaoAbateDias: row.previsao_abate_dias,
    percentualLucro: Number(row.percentual_lucro),
    entries: Array.isArray(row.entries) ? (row.entries as DailyEntry[]) : [],
    encerrado: row.encerrado,
  };
  const linhagem: Linhagem =
    row.linhagem === "ross308" || row.linhagem === "cobb500" ? row.linhagem : "ross_ap95";
  const sexo: Sexo = row.sexo === "macho" || row.sexo === "femea" ? row.sexo : "misto";
  const resumo = calcularResumoLote(lote, linhagem, sexo, now);
  const c = conf.data?.[0];
  const cfg = c
    ? {
        capacidadeKg: Number(c.capacidade_kg),
        capacidadeOperacionalKg: c.capacidade_operacional_kg,
        estoqueMinimoKg: Number(c.estoque_minimo_kg),
        margemSegurancaKg: Number(c.margem_seguranca_kg),
        cargaPadraoKg: Number(c.carga_padrao_kg),
        leadTimeHoras: Number(c.lead_time_horas),
        erroBalancaKg: Number(c.erro_balanca_kg),
        perdaPct: Number(c.perda_pct),
      }
    : CFG_PADRAO;
  const silo = calcularSilo({
    agora: now,
    alojamento: lote.dataEntrada,
    qtdInicial: lote.quantidadeInicial,
    previsaoAbateDias: lote.previsaoAbateDias,
    linhagem,
    sexo,
    entries: lote.entries,
    entregas: (ent.data ?? []).map((e) => ({
      id: e.id,
      data: e.data,
      kg: Number(e.quantidade_kg),
    })),
    pesagens: (pes.data ?? []).map((p) => ({
      id: p.id,
      medidoEm: p.medido_em,
      kg: Number(p.estoque_kg),
    })),
    cfg,
  });
  return {
    consultado_em: new Date().toISOString(),
    data_granja: date,
    granja: farm.data[0].nome,
    lote: {
      numero: row.numero,
      galpao: row.galpao,
      linhagem: row.linhagem,
      sexo: row.sexo,
      referencia_assumida: !row.linhagem || !row.sexo,
      idade_d0: resumo.idade,
      aves_vivas: resumo.vivas,
      baixas_pct: resumo.mortalidadePct,
      ultima_pesagem_real: resumo.ultimaPesagem,
      dias_sem_pesar: resumo.diasSemPesar,
      peso_referencia_g: resumo.pesoEsperadoHojeG,
      peso_projetado_hoje_g: resumo.pesoProjetadoHojeG,
      desvio_na_idade_da_pesagem_pct: resumo.diferencaPesoPct,
      gpd_medido_g: resumo.gpdRecente,
      previsao_abate_dias: lote.previsaoAbateDias,
      peso_projetado_abate_g: resumo.pesoProjetadoAbateG,
      ca_referencia: resumo.caEsperada,
      previsoes: [1, 3, 7].map((d) => ({
        dia: resumo.idade + d,
        peso_estimado_g: Math.round(resumo.projetarPesoG(resumo.idade + d)),
      })),
    },
    historico_diario: lote.entries
      .filter((e) => e.date <= date)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30)
      .map((e) => ({
        data: e.date,
        mortalidade: e.mortalidade,
        eliminados: e.eliminados ?? 0,
        peso_medio_g: e.pesoMedioG ?? null,
        observacoes: e.observacoes ?? null,
      })),
    medicoes_internas: (med.data ?? []).filter((m) => m.data <= date),
    silo:
      ent.data?.length || pes.data?.length
        ? {
            estoque_estimado_kg: silo.estoqueAtualKg,
            consumo_estimado_hoje_kg: silo.consumoHojeKg,
            autonomia_estimada_dias: Number.isFinite(silo.autonomiaDias)
              ? silo.autonomiaDias
              : null,
            pedido_recomendado_kg: silo.pedidoRecomendadoKg,
            confianca_pct: silo.confianca,
            modo: silo.modoEstimativa,
            ca_estimada_nao_medida: silo.fcrReal,
            alertas: silo.alertas,
          }
        : null,
    tarefas_pendentes: tasks.data,
    dados_ausentes: [
      !row.linhagem ? "linhagem cadastrada" : null,
      !row.sexo ? "sexo cadastrado" : null,
      !resumo.ultimaPesagem ? "pesagem real das aves" : null,
      !pes.data?.length ? "pesagem física do silo" : null,
      !med.data?.some((m) => m.consumo_agua_l !== null) ? "consumo de água medido" : null,
      !med.data?.some((m) => m.temperatura_c !== null) ? "temperatura interna do galpão" : null,
    ].filter(Boolean),
  };
}
