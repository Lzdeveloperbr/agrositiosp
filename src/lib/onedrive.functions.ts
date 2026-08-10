// Ponte inteligente OneDrive -> AgroSítio.
// Lê arquivos da pasta monitorada, classifica com IA e grava nos módulos existentes.
import { createServerFn } from "@tanstack/react-start";

const GATEWAY = "https://connector-gateway.lovable.dev/microsoft_onedrive";
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

export type ArquivoOneDrive = {
  id: string;
  nome: string;
  pasta: boolean;
  tamanho: number;
  modificado: string | null;
  mime: string | null;
  caminho: string | null;
};

function creds() {
  const lovable = process.env["LOVABLE_API_KEY"];
  const conn = process.env["MICROSOFT_ONEDRIVE_API_KEY"];
  return { lovable, conn, ok: !!lovable && !!conn };
}

async function graph(path: string, init?: RequestInit) {
  const { lovable, conn } = creds();
  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${lovable}`,
      "X-Connection-Api-Key": conn!,
      ...(init?.headers ?? {}),
    },
  });
  return res;
}

async function graphJson(path: string) {
  const res = await graph(path);
  const text = await res.text();
  if (!res.ok) throw new Error(`OneDrive [${res.status}]: ${text.slice(0, 400)}`);
  return JSON.parse(text);
}

function mapItem(it: any): ArquivoOneDrive {
  return {
    id: it.id,
    nome: it.name,
    pasta: !!it.folder,
    tamanho: it.size ?? 0,
    modificado: it.lastModifiedDateTime ?? null,
    mime: it.file?.mimeType ?? null,
    caminho: it.parentReference?.path ?? null,
  };
}

let driveIdCache: string | null = null;
async function driveId() {
  if (driveIdCache) return driveIdCache;
  const d = await graphJson("/me/drive");
  driveIdCache = d.id as string;
  return driveIdCache;
}
/** OneDrive pessoal exige /drives/{id}/... — /me/drive/root retorna 404. */
async function drivePath(sufixo: string) {
  return `/drives/${await driveId()}${sufixo}`;
}

async function fazendaPorCodigo(codigo: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("fazendas").select("id, nome").eq("codigo_acesso", codigo.trim().toUpperCase()).maybeSingle();
  if (error || !data) throw new Error("Código de fazenda inválido");
  return data as { id: string; nome: string };
}

/** Status da conexão OneDrive. */
export const onedriveStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { ok } = creds();
  if (!ok) return { conectado: false, conta: null as string | null, erro: "Conector do OneDrive não está ligado." };
  try {
    const me = await graphJson("/me/drive");
    driveIdCache = me?.id ?? null;
    return { conectado: true, conta: me?.owner?.user?.email ?? me?.owner?.user?.displayName ?? "OneDrive", erro: null as string | null };
  } catch (e: any) {
    return { conectado: false, conta: null, erro: String(e?.message ?? e) };
  }
});

/** Lista pastas/arquivos para o usuário escolher a pasta monitorada. */
export const onedriveListar = createServerFn({ method: "POST" })
  .inputValidator((d: { pastaId?: string | null }) => ({ pastaId: d?.pastaId ?? null }))
  .handler(async ({ data }) => {
    if (!creds().ok) throw new Error("Conector do OneDrive não está ligado.");
    const path = await drivePath(data.pastaId ? `/items/${data.pastaId}/children?$top=200` : `/root/children?$top=200`);
    const json = await graphJson(path);
    return { itens: (json.value ?? []).map(mapItem) as ArquivoOneDrive[] };
  });

// ---------- IA ----------

const SCHEMA_PROMPT = `Você é o motor de importação do AgroSítio, sistema de gestão de uma fazenda brasileira.
Analise o conteúdo do arquivo e devolva SOMENTE um JSON válido (sem markdown) neste formato:

{
  "destino": "prioridades" | "financeiro" | "estoque" | "chuvas" | "tarefas" | "ignorar",
  "confianca": 0.0 a 1.0,
  "resumo": "1 a 2 frases em português sobre o que é o arquivo",
  "registros": [ ... ]
}

Formato de cada registro conforme o destino:
- prioridades: { "mes": "AAAA-MM", "titulo": "", "descricao": "", "categoria": "granja|gado|lavoura|estrutura|financeiro|maquinas|equipe|geral", "prioridade": "alta|media|baixa", "prazo": "AAAA-MM-DD" ou null, "custo_estimado": número ou null, "responsavel": "" ou null }
- financeiro: { "data": "AAAA-MM-DD", "tipo": "receita|despesa", "categoria": "", "descricao": "", "valor": número positivo, "vencimento": "AAAA-MM-DD" ou null, "status": "pago|pendente" }
- estoque: { "nome": "", "categoria": "racao|vacina|sal|remedio|insumo|outro", "unidade": "kg|sc|L|un", "quantidade": número, "minimo": número ou null }
- chuvas: { "data": "AAAA-MM-DD", "mm": número, "local": "" ou null }
- tarefas: { "titulo": "", "descricao": "", "prioridade": "alta|media|baixa", "categoria": "granja|gado|cerca|maquina|geral", "vencimento": "AAAA-MM-DD" ou null }

Regras: valores em reais sem símbolo; datas sempre AAAA-MM-DD; se não tiver certeza do destino ou não houver dados úteis, use "ignorar" com registros vazios; nunca invente números que não estão no arquivo.`;

async function classificar(nome: string, mime: string, conteudo: { texto?: string; base64?: string }) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("IA indisponível");
  const hoje = new Date().toISOString().slice(0, 10);
  const content: any[] = [{ type: "text", text: `Arquivo: ${nome}\nData de hoje: ${hoje}` }];
  if (conteudo.texto) content.push({ type: "text", text: `Conteúdo:\n${conteudo.texto.slice(0, 60000)}` });
  if (conteudo.base64) {
    content.push(
      mime === "application/pdf"
        ? { type: "file", file: { filename: nome, file_data: `data:application/pdf;base64,${conteudo.base64}` } }
        : { type: "image_url", image_url: { url: `data:${mime};base64,${conteudo.base64}` } },
    );
  }

  const res = await fetch(AI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: SCHEMA_PROMPT }, { role: "user", content }],
      response_format: { type: "json_object" },
    }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`IA [${res.status}]: ${body.slice(0, 300)}`);
  const json = JSON.parse(body);
  const raw = json?.choices?.[0]?.message?.content ?? "{}";
  const limpo = String(raw).replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(limpo) as { destino: string; confianca: number; resumo: string; registros: any[] };
}

const TEXTO_EXT = /\.(csv|txt|md|json|tsv|log)$/i;
const IMG_EXT = /\.(png|jpe?g|webp|gif|heic)$/i;
const PDF_EXT = /\.pdf$/i;
const DOC_EXT = /\.(xlsx|xls|docx|doc|pptx|ppt|odt|ods)$/i;

function b64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

async function baixarConteudo(item: ArquivoOneDrive) {
  if (TEXTO_EXT.test(item.nome)) {
    const res = await graph(await drivePath(`/items/${item.id}/content`));
    if (!res.ok) throw new Error(`Download [${res.status}]`);
    return { texto: await res.text(), mime: "text/plain" };
  }
  if (IMG_EXT.test(item.nome)) {
    const res = await graph(await drivePath(`/items/${item.id}/content`));
    if (!res.ok) throw new Error(`Download [${res.status}]`);
    return { base64: b64(await res.arrayBuffer()), mime: item.mime ?? "image/jpeg" };
  }
  if (PDF_EXT.test(item.nome)) {
    const res = await graph(await drivePath(`/items/${item.id}/content`));
    if (!res.ok) throw new Error(`Download [${res.status}]`);
    return { base64: b64(await res.arrayBuffer()), mime: "application/pdf" };
  }
  if (DOC_EXT.test(item.nome)) {
    // Graph converte planilhas/documentos em PDF, que a IA lê nativamente.
    const res = await graph(await drivePath(`/items/${item.id}/content?format=pdf`));
    if (!res.ok) throw new Error(`Conversão para PDF falhou [${res.status}]`);
    return { base64: b64(await res.arrayBuffer()), mime: "application/pdf" };
  }
  throw new Error("Formato não suportado");
}

// ---------- aplicação nos módulos ----------

async function aplicar(admin: any, fazendaId: string, destino: string, registros: any[], arquivoNome: string) {
  const criados: { tabela: string; id: string; dados: any }[] = [];
  const hojeMes = new Date().toISOString().slice(0, 7);

  for (const r of registros.slice(0, 200)) {
    let tabela = "";
    let row: any = null;
    if (destino === "prioridades") {
      tabela = "prioridades";
      row = {
        fazenda_id: fazendaId, mes: r.mes || hojeMes, titulo: r.titulo, descricao: r.descricao ?? null,
        categoria: r.categoria ?? "geral", prioridade: r.prioridade ?? "media", status: "pendente",
        responsavel: r.responsavel ?? null, prazo: r.prazo ?? null,
        custo_estimado: r.custo_estimado ?? null, fonte_arquivo: arquivoNome, autor: "IA OneDrive",
      };
    } else if (destino === "financeiro") {
      tabela = "financeiro";
      row = {
        fazenda_id: fazendaId, data: r.data, tipo: r.tipo, categoria: r.categoria ?? "geral",
        descricao: r.descricao ?? arquivoNome, valor: Number(r.valor),
        vencimento: r.vencimento ?? null, status: r.status ?? "pendente", autor: "IA OneDrive",
      };
    } else if (destino === "estoque") {
      tabela = "estoque";
      row = {
        fazenda_id: fazendaId, nome: r.nome, categoria: r.categoria ?? "outro", unidade: r.unidade ?? "un",
        quantidade: Number(r.quantidade) || 0, minimo: r.minimo ?? null, movimentacoes: [],
        observacoes: `Importado de ${arquivoNome}`,
      };
    } else if (destino === "chuvas") {
      tabela = "chuvas";
      row = { fazenda_id: fazendaId, data: r.data, mm: Number(r.mm) || 0, local: r.local ?? null, autor: "IA OneDrive" };
    } else if (destino === "tarefas") {
      tabela = "tarefas";
      row = {
        fazenda_id: fazendaId, titulo: r.titulo, descricao: r.descricao ?? null,
        prioridade: r.prioridade ?? "media", categoria: r.categoria ?? "geral",
        vencimento: r.vencimento ?? null, concluida: false, autor: "IA OneDrive",
      };
    } else continue;

    if (!row?.titulo && !row?.nome && !row?.descricao && !row?.data) continue;
    const { data, error } = await admin.from(tabela).insert(row).select("id").single();
    if (error) continue;
    criados.push({ tabela, id: data.id, dados: row });
  }
  return criados;
}

/** Sincroniza a pasta monitorada: detecta novos/alterados, processa com IA e grava nos módulos. */
export const onedriveSincronizar = createServerFn({ method: "POST" })
  .inputValidator((d: { codigo: string; pastaId?: string | null; limite?: number }) => ({
    codigo: String(d.codigo ?? "").trim(),
    pastaId: d?.pastaId ?? null,
    limite: Math.min(Math.max(Number(d?.limite ?? 8), 1), 20),
  }))
  .handler(async ({ data }) => {
    if (!data.codigo) throw new Error("Fazenda não identificada");
    if (!creds().ok) throw new Error("Conector do OneDrive não está ligado.");
    const fazenda = await fazendaPorCodigo(data.codigo);
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");

    const path = await drivePath(data.pastaId ? `/items/${data.pastaId}/children?$top=200` : `/root/children?$top=200`);
    const json = await graphJson(path);
    const itens = (json.value ?? []).map(mapItem).filter((i: ArquivoOneDrive) => !i.pasta && !!i.mime);

    const { data: jaVistos } = await admin
      .from("onedrive_arquivos").select("id, item_id, versao, status").eq("fazenda_id", fazenda.id);
    const mapa = new Map((jaVistos ?? []).map((r: any) => [r.item_id, r]));

    let novos = 0, processados = 0, registrosTotal = 0, erros = 0;

    for (const it of itens) {
      const anterior = mapa.get(it.id) as any;
      const versao = `${it.modificado ?? ""}|${it.tamanho}`;
      if (anterior && anterior.versao === versao && (anterior.status === "processado" || anterior.status === "ignorado")) continue;

      let linhaId = anterior?.id as string | undefined;
      const base = {
        fazenda_id: fazenda.id, item_id: it.id, nome: it.nome, caminho: it.caminho,
        mime: it.mime, tamanho: it.tamanho, versao, modificado_em: it.modificado, status: "pendente",
      };
      if (!linhaId) {
        const { data: ins } = await admin.from("onedrive_arquivos").insert(base).select("id").single();
        linhaId = ins?.id;
        novos++;
      } else {
        await admin.from("onedrive_arquivos").update(base).eq("id", linhaId);
      }
      if (!linhaId) continue;
      if (processados >= data.limite) continue;

      try {
        const conteudo = await baixarConteudo(it);
        const r = await classificar(it.nome, conteudo.mime, conteudo);
        const destino = String(r?.destino ?? "ignorar");
        const criados = destino === "ignorar" ? [] : await aplicar(admin, fazenda.id, destino, r.registros ?? [], it.nome);
        registrosTotal += criados.length;
        processados++;

        if (criados.length) {
          await admin.from("importacoes_ia").insert(criados.map((c) => ({
            fazenda_id: fazenda.id, arquivo_id: linhaId, arquivo_nome: it.nome,
            tabela: c.tabela, registro_id: c.id, acao: "inserido",
            confianca: r.confianca ?? null, dados: c.dados,
          })));
        }
        await admin.from("onedrive_arquivos").update({
          status: destino === "ignorar" ? "ignorado" : "processado",
          destino, confianca: r.confianca ?? null, resumo: r.resumo ?? null,
          registros: criados.length, erro: null, processado_em: new Date().toISOString(),
        }).eq("id", linhaId);
      } catch (e: any) {
        erros++;
        await admin.from("onedrive_arquivos").update({
          status: "erro", erro: String(e?.message ?? e).slice(0, 500), processado_em: new Date().toISOString(),
        }).eq("id", linhaId);
      }
    }

    await admin.from("onedrive_config").upsert({
      fazenda_id: fazenda.id,
      pasta_id: data.pastaId,
      ultima_verificacao: new Date().toISOString(),
    }, { onConflict: "fazenda_id" });

    return { arquivos: itens.length, novos, processados, registros: registrosTotal, erros };
  });

/** Reprocessa um arquivo específico (após corrigir a planilha, por exemplo). */
export const onedriveReprocessar = createServerFn({ method: "POST" })
  .inputValidator((d: { codigo: string; arquivoId: string }) => ({ codigo: String(d.codigo), arquivoId: String(d.arquivoId) }))
  .handler(async ({ data }) => {
    const fazenda = await fazendaPorCodigo(data.codigo);
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    await admin.from("onedrive_arquivos").update({ status: "pendente", versao: null })
      .eq("id", data.arquivoId).eq("fazenda_id", fazenda.id);
    return { ok: true };
  });
