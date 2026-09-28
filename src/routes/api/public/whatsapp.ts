import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { Database, Json } from "@/integrations/supabase/types";
import { calcularResumoLote } from "@/lib/granja";
import { calcularSilo, CFG_PADRAO, type Linhagem, type Sexo } from "@/lib/silo";
import { diffDias } from "@/lib/data";
import type { DailyEntry, Lote } from "@/lib/types";

const headers = { "Cache-Control": "no-store" };
const selector = { lote_id: z.string().uuid().optional(), numero_lote: z.string().trim().min(1).max(80).optional() };
const fields = {
  consumo_racao_kg: z.number().min(0).max(1_000_000).optional(),
  consumo_agua_l: z.number().min(0).max(10_000_000).optional(),
  temperatura_c: z.number().min(-20).max(70).optional(),
  umidade_pct: z.number().min(0).max(100).optional(),
  ventilacao: z.string().trim().max(250).optional(),
  cama: z.string().trim().max(250).optional(),
  iluminacao_lux: z.number().min(0).max(100_000).optional(),
  horas_luz: z.number().min(0).max(24).optional(),
  uniformidade_pct: z.number().min(0).max(100).optional(),
  observacoes: z.string().trim().max(500).optional(),
};
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const schema = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("listar_lotes") }).strict(),
  z.object({ acao: z.literal("resumo_lote"), ...selector }).strict(),
  z.object({ acao: z.literal("dados_lote"), ...selector }).strict(),
  z.object({ acao: z.literal("historico_lote"), ...selector, limite: z.number().int().min(1).max(120).default(30) }).strict(),
  z.object({ acao: z.literal("registrar_dados"), ...selector, data: date, mortalidade: z.number().int().min(0).max(1_000_000).optional(), eliminados: z.number().int().min(0).max(1_000_000).optional(), peso_medio_g: z.number().min(20).max(10_000).optional(), ...fields, autor: z.string().trim().min(1).max(80).default("Assistente WhatsApp") }).strict(),
  z.object({ acao: z.literal("lancar_dia"), ...selector, data: date, mortalidade: z.number().int().min(0).max(1_000_000), eliminados: z.number().int().min(0).max(1_000_000).default(0), peso_medio_g: z.number().min(20).max(10_000).nullable().optional(), observacoes: z.string().trim().max(500).nullable().optional(), autor: z.string().trim().min(1).max(80).default("Assistente WhatsApp") }).strict(),
  z.object({ acao: z.literal("atualizar_lote"), ...selector, galpao: z.string().trim().min(1).max(80).optional(), linhagem: z.enum(["ross_ap95", "ross308", "cobb500"]).optional(), sexo: z.enum(["macho", "femea", "misto"]).optional() }).strict(),
]);

type LoteRow = Database["public"]["Tables"]["lotes"]["Row"];
type FarmClient = ReturnType<typeof createFarmClient>;
const json = (body: unknown, status = 200) => Response.json(body, { status, headers });

function today() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
function validDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
function authorized(request: Request, expected: string) {
  const supplied = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? "";
  const a = Buffer.from(supplied), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
function createFarmClient(code: string) {
  const url = process.env['SUPABASE_URL'], key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) throw new Error("Banco indisponível");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: { headers: { "x-fazenda-codigo": code }, fetch: (input, init) => {
      const h = new Headers(init?.headers);
      if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
      h.set("apikey", key); h.set("x-fazenda-codigo", code);
      return fetch(input, { ...init, headers: h });
    } },
  });
}
async function findLote(client: FarmClient, loteId?: string, numero?: string) {
  let query = client.from("lotes").select("*");
  if (loteId) query = query.eq("id", loteId);
  else if (numero) query = query.eq("numero", numero);
  else query = query.eq("encerrado", false).order("data_entrada", { ascending: false });
  const { data, error } = await query.limit(1).maybeSingle();
  if (error) throw error;
  return data;
}
function mapLote(row: LoteRow): Lote {
  return { id: row.id, numero: row.numero, dataEntrada: row.data_entrada, quantidadeInicial: row.quantidade_inicial, integradora: row.integradora ?? "", previsaoAbateDias: row.previsao_abate_dias, percentualLucro: Number(row.percentual_lucro), entries: Array.isArray(row.entries) ? row.entries as DailyEntry[] : [], encerrado: row.encerrado };
}
function breed(row: LoteRow): Linhagem { return row.linhagem === "cobb500" || row.linhagem === "ross308" ? row.linhagem : "ross_ap95"; }
function sex(row: LoteRow): Sexo { return row.sexo === "macho" || row.sexo === "femea" ? row.sexo : "misto"; }
function summary(row: LoteRow) {
  const s = calcularResumoLote(mapLote(row), breed(row), sex(row), new Date(`${today()}T12:00:00`));
  const alertas: string[] = [];
  if (s.diasSemPesar >= 7) alertas.push(`Pesagem atrasada há ${s.diasSemPesar} dias.`);
  if (s.diferencaPesoPct != null && s.diferencaPesoPct <= -7) alertas.push(`Peso ${Math.abs(s.diferencaPesoPct).toFixed(1)}% abaixo da meta.`);
  if (s.mortalidadePct >= 5) alertas.push(`Baixas acumuladas em ${s.mortalidadePct.toFixed(2)}%.`);
  return { id: row.id, numero: row.numero, galpao: row.galpao, linhagem: row.linhagem, sexo: row.sexo, ativo: !row.encerrado, dia: s.idade, aves_iniciais: row.quantidade_inicial, aves_vivas: s.vivas, mortalidade: s.mortalidade, eliminados: s.eliminados, baixas_percentual: Number(s.mortalidadePct.toFixed(2)), ultima_pesagem: s.ultimaPesagem ? { data: s.ultimaPesagem.data, peso_medio_g: s.ultimaPesagem.pesoG } : null, pesagens: s.pesagens.map(p => ({ data: p.data, peso_medio_g: p.pesoG })), ganho_diario_g: s.gpdRecente, peso_esperado_g: Math.round(s.pesoEsperadoHojeG), peso_projetado_hoje_g: Math.round(s.pesoProjetadoHojeG), diferenca_peso_percentual: s.diferencaPesoPct, peso_projetado_abate_g: Math.round(s.pesoProjetadoAbateG), conversao_referencia: s.caEsperada, situacao: s.situacao, alertas };
}
async function context(client: FarmClient, row: LoteRow, limit = 30) {
  const [measurements, deliveries, weighings, config] = await Promise.all([
    client.from("lote_medicoes").select("*").eq("lote_id", row.id).order("data", { ascending: false }).limit(limit),
    client.from("entregas_racao").select("id,data,quantidade_kg,tipo_racao,galpao,created_at").eq("lote_id", row.id).order("data", { ascending: true }).limit(500),
    client.from("silo_pesagens").select("id,medido_em,estoque_kg").eq("lote_id", row.id).order("medido_em", { ascending: true }).limit(200),
    client.from("silo_config").select("*").eq("lote_id", row.id).order("updated_at", { ascending: false }).limit(1),
  ]);
  for (const result of [measurements, deliveries, weighings, config]) if (result.error) throw result.error;
  const c = config.data?.[0];
  const cfg = c ? { capacidadeKg: Number(c.capacidade_kg), capacidadeOperacionalKg: c.capacidade_operacional_kg, estoqueMinimoKg: Number(c.estoque_minimo_kg), margemSegurancaKg: Number(c.margem_seguranca_kg), cargaPadraoKg: Number(c.carga_padrao_kg), leadTimeHoras: Number(c.lead_time_horas), erroBalancaKg: Number(c.erro_balanca_kg), perdaPct: Number(c.perda_pct) } : CFG_PADRAO;
  // A entrega possui apenas data; created_at indica quando o registro foi salvo, não a chegada do caminhão.
  const silo = calcularSilo({ agora: new Date(), alojamento: row.data_entrada, qtdInicial: row.quantidade_inicial, previsaoAbateDias: row.previsao_abate_dias, linhagem: breed(row), sexo: sex(row), entries: mapLote(row).entries, entregas: (deliveries.data ?? []).map(d => ({ id: d.id, data: d.data, kg: Number(d.quantidade_kg) })), pesagens: (weighings.data ?? []).map(p => ({ id: p.id, medidoEm: p.medido_em, kg: Number(p.estoque_kg) })), cfg });
  const med = measurements.data ?? [];
  const registros = (Array.isArray(row.entries) ? row.entries as DailyEntry[] : []).filter(e => e.date <= today()).map(e => ({ data: e.date, mortalidade: e.mortalidade, eliminados: e.eliminados ?? 0, peso_medio_g: e.pesoMedioG ?? null, observacoes: e.observacoes ?? null }));
  return { resumo: summary(row), historico: { diarios: registros.sort((a,b) => b.data.localeCompare(a.data)).slice(0, limit), medicoes: med }, racao: { entregas: (deliveries.data ?? []).map(d => ({ data: d.data, quantidade_kg: Number(d.quantidade_kg), tipo: d.tipo_racao, galpao: d.galpao })), total_entregue_kg: silo.totalEntregueKg, saldo_silo_estimado_kg: Math.round(silo.estoqueAtualKg), consumo_estimado_hoje_kg: Math.round(silo.consumoHojeKg), consumo_estimado_acumulado_kg: Math.round(silo.consumoAcumKg), confianca_pct: silo.confianca, modo: silo.modoEstimativa, conversao_estimada: silo.fcrReal || null }, ultimas_medicoes: med[0] ?? null, dados_ausentes: [row.galpao ? null : "galpão", row.linhagem ? null : "linhagem", registros.some(e => e.peso_medio_g != null) ? null : "pesagem de peso médio", med.some(e => e.consumo_agua_l != null) ? null : "consumo de água medido", med.some(e => e.consumo_racao_kg != null) ? null : "consumo de ração medido", med.some(e => e.temperatura_c != null) ? null : "temperatura do galpão", med.some(e => e.umidade_pct != null) ? null : "umidade do galpão", med.some(e => e.ventilacao != null) ? null : "ventilação", med.some(e => e.cama != null) ? null : "estado da cama", med.some(e => e.iluminacao_lux != null) ? null : "iluminação medida", med.some(e => e.uniformidade_pct != null) ? null : "uniformidade medida"].filter(Boolean) };
}

export const Route = createFileRoute("/api/public/whatsapp")({
  server: { handlers: {
    POST: async ({ request }) => {
      const key = process.env['WHATSAPP_BOT_API_KEY'];
      if (!key) return json({ ok: false, message: "Integração do bot ainda não configurada." }, 503);
      if (!authorized(request, key)) return json({ ok: false, message: "Chave da integração inválida." }, 401);
      const code = request.headers.get("x-fazenda-codigo")?.trim();
      if (!code || code.length > 80) return json({ ok: false, message: "Informe o código da fazenda." }, 400);
      const parsed = schema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) return json({ ok: false, message: "Pedido inválido.", details: parsed.error.flatten().fieldErrors }, 400);
      try {
        const client = createFarmClient(code);
        // Confirma explicitamente o código, inclusive quando a fazenda não tem lotes.
        const { data: farm, error: farmError } = await client.rpc("entrar_fazenda", { p_codigo: code });
        if (farmError) throw farmError;
        if (!farm?.length) return json({ ok: false, message: "Código da fazenda inválido." }, 403);
        const body = parsed.data;
        if (body.acao === "listar_lotes") {
          const { data, error } = await client.from("lotes").select("id,numero,galpao,linhagem,data_entrada,quantidade_inicial,encerrado,updated_at").order("data_entrada", { ascending: false }).limit(100);
          if (error) throw error;
          return json({ ok: true, data, message: `${data?.length ?? 0} lote(s) encontrado(s).` });
        }
        const row = await findLote(client, body.lote_id, body.numero_lote);
        if (!row) return json({ ok: false, message: "Lote não encontrado nesta fazenda. Informe o número do lote se não houver lote ativo." }, 404);
        if (body.acao === "resumo_lote") return json({ ok: true, data: summary(row), message: `Resumo do lote ${row.numero}.` });
        if (body.acao === "dados_lote" || body.acao === "historico_lote") {
          const data = await context(client, row, body.acao === "historico_lote" ? body.limite : 30);
          return json({ ok: true, data: body.acao === "historico_lote" ? { numero: row.numero, ...data.historico } : data, message: `Dados do lote ${row.numero}.` });
        }
        if (row.encerrado) return json({ ok: false, message: "Lote encerrado: alterações bloqueadas." }, 409);
        if (body.acao === "atualizar_lote") {
          const patch = { ...(body.galpao !== undefined && { galpao: body.galpao }), ...(body.linhagem !== undefined && { linhagem: body.linhagem }), ...(body.sexo !== undefined && { sexo: body.sexo }) };
          if (!Object.keys(patch).length) return json({ ok: false, message: "Informe ao menos uma informação para atualizar." }, 400);
          const { data, error } = await client.from("lotes").update(patch).eq("id", row.id).select("id,numero,galpao,linhagem,sexo").single();
          if (error) throw error;
          return json({ ok: true, data, message: "Dados do lote atualizados." });
        }
        if (!validDate(body.data) || body.data < row.data_entrada || body.data > today()) return json({ ok: false, message: "A data deve existir e estar entre o alojamento e hoje (horário de São Paulo)." }, 400);
        if (body.acao === "registrar_dados" && Object.keys(fields).every(k => body[k as keyof typeof body] === undefined) && body.mortalidade === undefined && body.eliminados === undefined && body.peso_medio_g === undefined) return json({ ok: false, message: "Informe ao menos um dado para registrar." }, 400);
        // Nunca substitui silenciosamente os campos não mencionados, inclusive mortalidade.
        const entries = Array.isArray(row.entries) ? row.entries as DailyEntry[] : [];
        const prev = entries.find(e => e.date === body.data);
        const entryPatch = { ...(body.mortalidade !== undefined && { mortalidade: body.mortalidade }), ...(body.eliminados !== undefined && { eliminados: body.eliminados }), ...(body.peso_medio_g != null && { pesoMedioG: body.peso_medio_g }), ...(body.observacoes != null && { observacoes: body.observacoes }) };
        const next: DailyEntry = { ...(prev ?? { date: body.data, mortalidade: 0 }), ...entryPatch, date: body.data };
        const changedEntry = body.acao === "lancar_dia" || body.mortalidade !== undefined || body.eliminados !== undefined || body.peso_medio_g !== undefined || body.observacoes !== undefined;
        let updated = row;
        if (changedEntry && JSON.stringify(next) !== JSON.stringify(prev)) {
          const nextEntries = [...entries.filter(e => e.date !== body.data), next].sort((a,b) => a.date.localeCompare(b.date));
          const total = nextEntries.reduce((sum,e) => sum + Number(e.mortalidade || 0) + Number(e.eliminados || 0), 0);
          if (total > row.quantidade_inicial) return json({ ok: false, message: "Baixas ultrapassam as aves alojadas." }, 400);
          const { data, error } = await client.from("lotes").update({ entries: nextEntries as unknown as Json, autor: body.autor, updated_at: new Date().toISOString() }).eq("id", row.id).eq("updated_at", row.updated_at).select("*").maybeSingle();
          if (error) throw error;
          if (!data) return json({ ok: false, message: "Outro lançamento atualizou o lote. Consulte novamente e repita o pedido." }, 409);
          updated = data;
        }
        const measurePatch: Database["public"]["Tables"]["lote_medicoes"]["Update"] = {};
        if (body.acao === "registrar_dados") for (const name of Object.keys(fields) as (keyof typeof fields)[]) {
          const value = body[name];
          if (value !== undefined) (measurePatch as Record<string, unknown>)[name] = value;
        }
        if (Object.keys(measurePatch).length) {
          const { data: existing, error: readError } = await client.from("lote_medicoes").select("*").eq("lote_id", row.id).eq("data", body.data).maybeSingle();
          if (readError) throw readError;
          const hasChange = !existing || Object.entries(measurePatch).some(([k,v]) => existing[k as keyof typeof existing] !== v);
          if (hasChange) {
            const { error } = await client.from("lote_medicoes").upsert({ fazenda_id: row.fazenda_id, lote_id: row.id, data: body.data, ...measurePatch, autor: body.autor, atualizado_em: new Date().toISOString() }, { onConflict: "lote_id,data" });
            if (error) throw error;
          }
        }
        return json({ ok: true, data: summary(updated), message: `Dados de ${body.data} registrados no lote ${row.numero} (D${diffDias(row.data_entrada, body.data)}), sem duplicidade.` });
      } catch (error) {
        console.error("Bot farm API", error instanceof Error ? error.message : error);
        return json({ ok: false, message: "Não foi possível acessar os dados da fazenda agora." }, 500);
      }
    },
  } },
});
