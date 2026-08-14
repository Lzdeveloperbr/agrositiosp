// Ponte inteligente Google Drive -> AgroSítio.
// Lê arquivos da pasta monitorada no Drive, classifica com IA e grava nos módulos existentes.
import { createServerFn } from "@tanstack/react-start";

const GATEWAY = "https://connector-gateway.lovable.dev/google_drive/drive/v3";
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

export type ArquivoDrive = {
  id: string;
  nome: string;
  pasta: boolean;
  tamanho: number;
  modificado: string | null;
  mime: string | null;
};

function creds() {
  const lovable = process.env["LOVABLE_API_KEY"];
  const conn = process.env["GOOGLE_DRIVE_API_KEY"];
  return { lovable, conn, ok: !!lovable && !!conn };
}

async function drive(path: string, init?: RequestInit) {
  const { lovable, conn } = creds();
  return fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${lovable}`,
      "X-Connection-Api-Key": conn!,
      ...(init?.headers ?? {}),
    },
  });
}

async function driveJson(path: string) {
  const res = await drive(path);
  const text = await res.text();
  if (!res.ok) throw new Error(`Google Drive [${res.status}]: ${text.slice(0, 400)}`);
  return JSON.parse(text);
}

const GOOGLE_FOLDER = "application/vnd.google-apps.folder";

function mapItem(it: any): ArquivoDrive {
  return {
    id: it.id,
    nome: it.name,
    pasta: it.mimeType === GOOGLE_FOLDER,
    tamanho: Number(it.size ?? 0),
    modificado: it.modifiedTime ?? null,
    mime: it.mimeType ?? null,
  };
}

async function listarPasta(pastaId: string | null) {
  const q = encodeURIComponent(`'${(pastaId ?? "root").replace(/'/g, "")}' in parents and trashed = false`);
  const fields = encodeURIComponent("files(id,name,mimeType,size,modifiedTime)");
  const json = await driveJson(`/files?q=${q}&fields=${fields}&pageSize=300&orderBy=folder,name&supportsAllDrives=true&includeItemsFromAllDrives=true`);
  return (json.files ?? []).map(mapItem) as ArquivoDrive[];
}

async function fazendaPorCodigo(codigo: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("fazendas").select("id, nome").eq("codigo_acesso", codigo.trim().toUpperCase()).maybeSingle();
  if (error || !data) throw new Error("Código de fazenda inválido");
  return data as { id: string; nome: string };
}

/** Status da conexão com o Google Drive. */
export const gdriveStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { ok } = creds();
  if (!ok) return { conectado: false, conta: null as string | null, erro: "Conector do Google Drive não está ligado." };
  try {
    const about = await driveJson("/about?fields=user(displayName,emailAddress),storageQuota");
    return {
      conectado: true,
      conta: about?.user?.emailAddress ?? about?.user?.displayName ?? "Google Drive",
      erro: null as string | null,
    };
  } catch (e: any) {
    return { conectado: false, conta: null, erro: String(e?.message ?? e) };
  }
});

/** Lista pastas/arquivos para escolher a pasta monitorada. */
export const gdriveListar = createServerFn({ method: "POST" })
  .inputValidator((d: { pastaId?: string | null }) => ({ pastaId: d?.pastaId ?? null }))
  .handler(async ({ data }) => {
    if (!creds().ok) throw new Error("Conector do Google Drive não está ligado.");
    return { itens: await listarPasta(data.pastaId) };
  });

// ---------- IA ----------

const SCHEMA_PROMPT = `Você é o motor de importação do AgroSítio, sistema de gestão de uma fazenda brasileira.
Analise o conteúdo do arquivo e devolva SOMENTE um JSON válido (sem markdown) neste formato:

{
  "destino": "prioridades" | "financeiro" | "estoque" | "chuvas" | "tarefas" | "diario" | "ignorar",
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
- diario: { "data": "AAAA-MM-DD", "titulo": "", "categoria": "granja|gado|lavoura|maquinas|clima|geral", "texto": "" }

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
  if (res.status === 429) throw new Error("Limite de IA atingido — tente de novo em alguns minutos.");
  if (res.status === 402) throw new Error("Créditos de IA esgotados.");
  if (!res.ok) throw new Error(`IA [${res.status}]: ${body.slice(0, 300)}`);
  const json = JSON.parse(body);
  const raw = json?.choices?.[0]?.message?.content ?? "{}";
  const limpo = String(raw).replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(limpo) as { destino: string; confianca: number; resumo: string; registros: any[] };
}

const TEXTO_EXT = /\.(csv|txt|md|json|tsv|log)$/i;
const IMG_EXT = /\.(png|jpe?g|webp|gif|heic)$/i;

function b64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Baixa (ou exporta) o conteúdo do arquivo em formato que a IA consegue ler. */
async function baixarConteudo(item: ArquivoDrive) {
  const mime = item.mime ?? "";

  // Documentos nativos do Google -> exporta.
  if (mime.startsWith("application/vnd.google-apps.")) {
    const exportar = mime === "application/vnd.google-apps.spreadsheet" ? "text/csv" : "application/pdf";
    const res = await drive(`/files/${item.id}/export?mimeType=${encodeURIComponent(exportar)}&supportsAllDrives=true`);
    if (!res.ok) throw new Error(`Exportação falhou [${res.status}]`);
    return exportar === "text/csv"
      ? { texto: await res.text(), mime: "text/plain" }
      : { base64: b64(await res.arrayBuffer()), mime: "application/pdf" };
  }

  const res = await drive(`/files/${item.id}?alt=media&supportsAllDrives=true`);
  if (!res.ok) throw new Error(`Download [${res.status}]`);

  if (TEXTO_EXT.test(item.nome) || mime.startsWith("text/") || mime === "application/json") {
    return { texto: await res.text(), mime: "text/plain" };
  }
  if (IMG_EXT.test(item.nome) || mime.startsWith("image/")) {
    return { base64: b64(await res.arrayBuffer()), mime: mime || "image/jpeg" };
  }
  if (/\.pdf$/i.test(item.nome) || mime === "application/pdf") {
    return { base64: b64(await res.arrayBuffer()), mime: "application/pdf" };
  }
  if (/\.(xlsx|xls|docx|doc|pptx|ppt|ods|odt)$/i.test(item.nome)) {
    // Office fora do Drive nativo: manda como PDF-like não funciona; tenta texto bruto.
    throw new Error("Converta para Google Planilhas/Docs (ou PDF) para a IA ler este arquivo");
  }
  throw new Error("Formato não suportado");
}

// ---------- aplicação nos módulos ----------

async function aplicar(admin: any, fazendaId: string, destino: string, registros: any[], arquivoNome: string) {
  const criados: { tabela: string; id: string; dados: any }[] = [];
  const hojeMes = new Date().toISOString().slice(0, 7);
  const hoje = new Date().toISOString().slice(0, 10);

  for (const r of registros.slice(0, 200)) {
    let tabela = "";
    let row: any = null;
    if (destino === "prioridades") {
      tabela = "prioridades";
      row = {
        fazenda_id: fazendaId, mes: r.mes || hojeMes, titulo: r.titulo, descricao: r.descricao ?? null,
        categoria: r.categoria ?? "geral", prioridade: r.prioridade ?? "media", status: "pendente",
        responsavel: r.responsavel ?? null, prazo: r.prazo ?? null,
        custo_estimado: r.custo_estimado ?? null, fonte_arquivo: arquivoNome, autor: "IA Google Drive",
      };
    } else if (destino === "financeiro") {
      tabela = "financeiro";
      row = {
        fazenda_id: fazendaId, data: r.data ?? hoje, tipo: r.tipo, categoria: r.categoria ?? "geral",
        descricao: r.descricao ?? arquivoNome, valor: Number(r.valor),
        vencimento: r.vencimento ?? null, status: r.status ?? "pendente", autor: "IA Google Drive",
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
      row = { fazenda_id: fazendaId, data: r.data ?? hoje, mm: Number(r.mm) || 0, local: r.local ?? null, autor: "IA Google Drive" };
    } else if (destino === "tarefas") {
      tabela = "tarefas";
      row = {
        fazenda_id: fazendaId, titulo: r.titulo, descricao: r.descricao ?? null,
        prioridade: r.prioridade ?? "media", categoria: r.categoria ?? "geral",
        vencimento: r.vencimento ?? null, concluida: false, autor: "IA Google Drive",
      };
    } else if (destino === "diario") {
      tabela = "diario";
      row = {
        fazenda_id: fazendaId, data: r.data ?? hoje, titulo: r.titulo ?? arquivoNome,
        categoria: r.categoria ?? "geral", texto: r.texto ?? null, fotos: [], autor: "IA Google Drive",
      };
    } else continue;

    if (!row?.titulo && !row?.nome && !row?.descricao && !row?.data) continue;
    const { data, error } = await admin.from(tabela).insert(row).select("id").single();
    if (error) continue;
    criados.push({ tabela, id: data.id, dados: row });
  }
  return criados;
}

/** Sincroniza a pasta monitorada do Drive: detecta novos/alterados, lê com IA e grava nos módulos. */
export const gdriveSincronizar = createServerFn({ method: "POST" })
  .inputValidator((d: { codigo: string; pastaId?: string | null; limite?: number }) => ({
    codigo: String(d.codigo ?? "").trim(),
    pastaId: d?.pastaId ?? null,
    limite: Math.min(Math.max(Number(d?.limite ?? 8), 1), 20),
  }))
  .handler(async ({ data }) => {
    if (!data.codigo) throw new Error("Fazenda não identificada");
    if (!creds().ok) throw new Error("Conector do Google Drive não está ligado.");
    const fazenda = await fazendaPorCodigo(data.codigo);
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");

    const itens = (await listarPasta(data.pastaId)).filter((i) => !i.pasta);

    const { data: jaVistos } = await admin
      .from("gdrive_arquivos").select("id, item_id, versao, status").eq("fazenda_id", fazenda.id);
    const mapa = new Map((jaVistos ?? []).map((r: any) => [r.item_id, r]));

    let novos = 0, processados = 0, registrosTotal = 0, erros = 0;

    for (const it of itens) {
      const anterior = mapa.get(it.id) as any;
      const versao = `${it.modificado ?? ""}|${it.tamanho}`;
      if (anterior && anterior.versao === versao && (anterior.status === "processado" || anterior.status === "ignorado")) continue;

      let linhaId = anterior?.id as string | undefined;
      const base = {
        fazenda_id: fazenda.id, item_id: it.id, nome: it.nome, caminho: null,
        mime: it.mime, tamanho: it.tamanho, versao, modificado_em: it.modificado, status: "pendente",
      };
      if (!linhaId) {
        const { data: ins } = await admin.from("gdrive_arquivos").insert(base).select("id").single();
        linhaId = ins?.id;
        novos++;
      } else {
        await admin.from("gdrive_arquivos").update(base).eq("id", linhaId);
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
            fazenda_id: fazenda.id, arquivo_nome: `Drive · ${it.nome}`,
            tabela: c.tabela, registro_id: c.id, acao: "inserido",
            confianca: r.confianca ?? null, dados: c.dados,
          })));
        }
        await admin.from("gdrive_arquivos").update({
          status: destino === "ignorar" ? "ignorado" : "processado",
          destino, confianca: r.confianca ?? null, resumo: r.resumo ?? null,
          registros: criados.length, erro: null, processado_em: new Date().toISOString(),
        }).eq("id", linhaId);
      } catch (e: any) {
        erros++;
        await admin.from("gdrive_arquivos").update({
          status: "erro", erro: String(e?.message ?? e).slice(0, 500), processado_em: new Date().toISOString(),
        }).eq("id", linhaId);
      }
    }

    const idsAtuais = itens.map((i) => i.id);
    const obsoletos = (jaVistos ?? []).filter((r: any) => !idsAtuais.includes(r.item_id)).map((r: any) => r.id);
    if (obsoletos.length) await admin.from("gdrive_arquivos").delete().in("id", obsoletos);

    await admin.from("gdrive_config").upsert({
      fazenda_id: fazenda.id,
      pasta_id: data.pastaId,
      ultima_verificacao: new Date().toISOString(),
    }, { onConflict: "fazenda_id" });

    return { arquivos: itens.length, novos, processados, registros: registrosTotal, erros };
  });

/** Reprocessa um arquivo específico do Drive. */
export const gdriveReprocessar = createServerFn({ method: "POST" })
  .inputValidator((d: { codigo: string; arquivoId: string }) => ({ codigo: String(d.codigo), arquivoId: String(d.arquivoId) }))
  .handler(async ({ data }) => {
    const fazenda = await fazendaPorCodigo(data.codigo);
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    await admin.from("gdrive_arquivos").update({ status: "pendente", versao: null })
      .eq("id", data.arquivoId).eq("fazenda_id", fazenda.id);
    return { ok: true };
  });
