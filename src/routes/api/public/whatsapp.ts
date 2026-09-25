import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { Database, Json } from "@/integrations/supabase/types";
import { calcularResumoLote } from "@/lib/granja";
import type { DailyEntry, Lote } from "@/lib/types";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, x-fazenda-codigo",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

const requestSchema = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("listar_lotes") }).strict(),
  z.object({
    acao: z.literal("resumo_lote"),
    lote_id: z.string().uuid().nullable().optional(),
    numero_lote: z.string().trim().min(1).max(80).nullable().optional(),
  }).strict(),
  z.object({
    acao: z.literal("lancar_dia"),
    lote_id: z.string().uuid().nullable().optional(),
    numero_lote: z.string().trim().min(1).max(80).nullable().optional(),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    mortalidade: z.number().int().min(0).max(1_000_000),
    eliminados: z.number().int().min(0).max(1_000_000).default(0),
    peso_medio_g: z.number().min(20).max(10_000).nullable().optional(),
    observacoes: z.string().trim().max(500).nullable().optional(),
    autor: z.string().trim().min(1).max(80).default("Assistente WhatsApp"),
  }).strict(),
]);

type LoteRow = Database["public"]["Tables"]["lotes"]["Row"];

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

function todayInSaoPaulo() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function authorized(request: Request, expected: string) {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes);
}

function mapLote(row: LoteRow): Lote {
  return {
    id: row.id,
    numero: row.numero,
    dataEntrada: row.data_entrada,
    quantidadeInicial: row.quantidade_inicial,
    integradora: row.integradora ?? "",
    previsaoAbateDias: row.previsao_abate_dias,
    percentualLucro: Number(row.percentual_lucro),
    precoKgVivo: row.preco_kg_vivo == null ? undefined : Number(row.preco_kg_vivo),
    entries: Array.isArray(row.entries) ? row.entries as DailyEntry[] : [],
    encerrado: row.encerrado,
  };
}

function createFarmClient(code: string) {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) throw new Error("Banco de dados indisponível");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      headers: { "x-fazenda-codigo": code },
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        headers.set("x-fazenda-codigo", code);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

async function findLote(client: ReturnType<typeof createFarmClient>, loteId?: string | null, numero?: string | null) {
  let query = client.from("lotes").select("*");
  if (loteId) query = query.eq("id", loteId);
  else if (numero) query = query.ilike("numero", numero);
  else query = query.eq("encerrado", false).order("data_entrada", { ascending: false });
  const { data, error } = await query.limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

function loteSummary(row: LoteRow) {
  const lote = mapLote(row);
  const resumo = calcularResumoLote(lote);
  const ultima = resumo.ultimaPesagem;
  const alertas: string[] = [];
  if (resumo.diasSemPesar >= 7) alertas.push(`Pesagem atrasada há ${resumo.diasSemPesar} dias.`);
  if (resumo.diferencaPesoPct != null && resumo.diferencaPesoPct <= -7) alertas.push(`Peso ${Math.abs(resumo.diferencaPesoPct).toFixed(1)}% abaixo da meta.`);
  if (resumo.mortalidadePct >= 5) alertas.push(`Baixas acumuladas em ${resumo.mortalidadePct.toFixed(2)}%.`);
  return {
    id: lote.id,
    numero: lote.numero,
    ativo: !lote.encerrado,
    dia: resumo.idade,
    previsao_abate_dias: lote.previsaoAbateDias,
    aves_iniciais: lote.quantidadeInicial,
    aves_vivas: resumo.vivas,
    mortalidade: resumo.mortalidade,
    eliminados: resumo.eliminados,
    baixas_percentual: Number(resumo.mortalidadePct.toFixed(2)),
    ultima_pesagem: ultima ? { data: ultima.data, peso_medio_g: Math.round(ultima.pesoG) } : null,
    peso_esperado_g: Math.round(resumo.pesoEsperadoHojeG),
    diferenca_peso_percentual: resumo.diferencaPesoPct == null ? null : Number(resumo.diferencaPesoPct.toFixed(1)),
    peso_projetado_abate_g: Math.round(resumo.pesoProjetadoAbateG),
    situacao: resumo.situacao,
    alertas,
  };
}

export const Route = createFileRoute("/api/public/whatsapp")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const expectedKey = process.env['WHATSAPP_BOT_API_KEY'];
        if (!expectedKey) return json({ ok: false, message: "Integração do WhatsApp ainda não configurada." }, 503);
        if (!authorized(request, expectedKey)) return json({ ok: false, message: "Chave da integração inválida." }, 401);

        const farmCode = request.headers.get("x-fazenda-codigo")?.trim().toUpperCase();
        if (!farmCode || farmCode.length > 80) return json({ ok: false, message: "Informe o código da fazenda." }, 400);

        const parsed = requestSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json({ ok: false, message: "Pedido inválido.", details: parsed.error.flatten().fieldErrors }, 400);

        try {
          const client = createFarmClient(farmCode);
          const body = parsed.data;

          if (body.acao === "listar_lotes") {
            const { data, error } = await client.from("lotes")
              .select("id, numero, data_entrada, quantidade_inicial, encerrado, updated_at")
              .order("data_entrada", { ascending: false });
            if (error) throw new Error(error.message);
            return json({ ok: true, data: data ?? [], message: `${data?.length ?? 0} lote(s) encontrado(s).` });
          }

          const row = await findLote(client, body.lote_id, body.numero_lote);
          if (!row) return json({ ok: false, message: "Lote não encontrado para esta fazenda." }, 404);

          if (body.acao === "resumo_lote") {
            return json({ ok: true, data: loteSummary(row), message: `Resumo do lote ${row.numero}.` });
          }

          if (row.encerrado) return json({ ok: false, message: "Não é possível lançar dados em um lote encerrado." }, 409);
          if (body.data < row.data_entrada) return json({ ok: false, message: "A data é anterior à entrada do lote." }, 400);
          if (body.data > todayInSaoPaulo()) return json({ ok: false, message: "Não é permitido fazer lançamento em data futura." }, 400);

          const entries = Array.isArray(row.entries) ? row.entries as DailyEntry[] : [];
          const previous = entries.find((entry) => entry.date === body.data);
          const nextEntry: DailyEntry = {
            date: body.data,
            mortalidade: body.mortalidade,
            eliminados: body.eliminados,
            ...(body.peso_medio_g == null ? {} : { pesoMedioG: body.peso_medio_g }),
            ...(body.observacoes ? { observacoes: body.observacoes } : {}),
          };
          const nextEntries = [...entries.filter((entry) => entry.date !== body.data), nextEntry]
            .sort((a, b) => a.date.localeCompare(b.date));
          const totalBaixas = nextEntries.reduce((sum, entry) => sum + Number(entry.mortalidade || 0) + Number(entry.eliminados || 0), 0);
          if (totalBaixas > row.quantidade_inicial) return json({ ok: false, message: "As baixas ultrapassam a quantidade inicial do lote." }, 400);

          const { data: updated, error } = await client.from("lotes")
            .update({ entries: nextEntries as unknown as Json, autor: body.autor, updated_at: new Date().toISOString() })
            .eq("id", row.id)
            .select("*")
            .single();
          if (error) throw new Error(error.message);

          return json({
            ok: true,
            data: loteSummary(updated),
            message: previous ? `Lançamento de ${body.data} corrigido no lote ${row.numero}.` : `Lançamento de ${body.data} salvo no lote ${row.numero}.`,
          });
        } catch (error) {
          console.error("WhatsApp farm API error", error instanceof Error ? error.message : error);
          return json({ ok: false, message: "Não foi possível acessar os dados da fazenda agora." }, 500);
        }
      },
    },
  },
});