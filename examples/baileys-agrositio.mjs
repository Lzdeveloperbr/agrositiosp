/**
 * Integração para um bot Baileys existente.
 * Defina no Termux: AGROSITIO_API_URL, AGROSITIO_API_KEY,
 * AGROSITIO_FAZENDA_CODIGO e GROQ_API_KEY (somente no Termux).
 */

const API_URL = process.env.AGROSITIO_API_URL || "https://agrositiosp.lovable.app/api/public/whatsapp";

async function chamarAgroSitio(payload) {
  const apiKey = process.env.AGROSITIO_API_KEY;
  const codigo = process.env.AGROSITIO_FAZENDA_CODIGO;
  if (!apiKey || !codigo) throw new Error("Configure AGROSITIO_API_KEY e AGROSITIO_FAZENDA_CODIGO no Termux.");

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "x-fazenda-codigo": codigo,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.message || `Erro ${response.status}`);
  return result;
}

// Restrinja cada remetente à fazenda previamente associada a ele no SEU bot.
// Não aceite um código de fazenda enviado pelo próprio contato como autorização.
export async function analisarPerguntaDoLote(pergunta, numeroLote) {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error("Configure GROQ_API_KEY apenas no Termux.");
  const resposta = await chamarAgroSitio({ acao: "dados_lote", numero_lote: numeroLote });
  const analise = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      messages: [
        { role: "system", content: "Você é um assistente técnico de avicultura. Use apenas os dados recebidos. Diferencie valores medidos de estimados. Se faltar informação, informe exatamente qual dado falta. Não invente medições nem diagnósticos." },
        { role: "user", content: JSON.stringify({ pergunta, dados: resposta.data }) },
      ],
    }),
  });
  if (!analise.ok) throw new Error(`Falha na análise (${analise.status}).`);
  const conteudo = await analise.json();
  return conteudo.choices?.[0]?.message?.content || "Não foi possível gerar a análise.";
}

export async function responderComDadosDaGranja(sock, mensagem) {
  const jid = mensagem.key.remoteJid;
  const texto = mensagem.message?.conversation ?? mensagem.message?.extendedTextMessage?.text ?? "";
  const comando = texto.trim().toLowerCase();
  if (!jid) return false;

  try {
    if (comando === "lotes") {
      const resposta = await chamarAgroSitio({ acao: "listar_lotes" });
      const linhas = resposta.data.map((lote) => `${lote.encerrado ? "⚪" : "🟢"} Lote ${lote.numero} — entrada ${lote.data_entrada}`);
      await sock.sendMessage(jid, { text: linhas.join("\n") || "Nenhum lote encontrado." });
      return true;
    }

    if (comando === "lote" || comando === "resumo") {
      const resposta = await chamarAgroSitio({ acao: "resumo_lote" });
      const lote = resposta.data;
      const peso = lote.ultima_pesagem ? `${lote.ultima_pesagem.peso_medio_g} g` : "sem pesagem";
      await sock.sendMessage(jid, { text: [
        `🐔 *Lote ${lote.numero} — D${lote.dia}*`,
        `Aves vivas: ${lote.aves_vivas.toLocaleString("pt-BR")}`,
        `Baixas: ${lote.baixas_percentual}%`,
        `Peso: ${peso} | Meta: ${lote.peso_esperado_g} g`,
        `Projeção de abate: ${(lote.peso_projetado_abate_g / 1000).toFixed(2)} kg`,
        ...(lote.alertas.length ? ["", `⚠️ ${lote.alertas.join("\n⚠️ ")}`] : ["", "✅ Operação dentro dos parâmetros."]),
      ].join("\n") });
      return true;
    }

    // Exemplo: lançar 2026-09-24 mort 4 elim 1 peso 2350 obs pesagem semanal
    const match = texto.match(/^lançar\s+(\d{4}-\d{2}-\d{2})\s+mort\s+(\d+)\s+elim\s+(\d+)(?:\s+peso\s+(\d+(?:[.,]\d+)?))?(?:\s+obs\s+(.+))?$/i);
    if (match) {
      const resposta = await chamarAgroSitio({
        acao: "lancar_dia",
        data: match[1],
        mortalidade: Number(match[2]),
        eliminados: Number(match[3]),
        peso_medio_g: match[4] ? Number(match[4].replace(",", ".")) : null,
        observacoes: match[5] ?? null,
        autor: "Assistente WhatsApp",
      });
      await sock.sendMessage(jid, { text: `✅ ${resposta.message}\nAves vivas: ${resposta.data.aves_vivas.toLocaleString("pt-BR")}` });
      return true;
    }
  } catch (error) {
    await sock.sendMessage(jid, { text: `Não consegui concluir: ${error instanceof Error ? error.message : "erro desconhecido"}` });
    return true;
  }

  return false;
}

// No messages.upsert do seu bot, chame:
// await responderComDadosDaGranja(sock, messages[0]);