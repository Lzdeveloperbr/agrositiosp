# Integração do bot Baileys com AgroSítio

O WhatsApp continua exclusivamente no seu bot Node.js/Baileys no Termux. O bot consulta e registra dados no AgroSítio; a análise com Groq acontece no próprio bot. Nenhum token do WhatsApp ou Groq é enviado ao AgroSítio.

## Configuração

API_URL: `https://agrositiosp.lovable.app/api/public/whatsapp`

Variáveis no bot (Termux):

| Variável | Finalidade |
| --- | --- |
| `AGROSITIO_API_URL` | URL acima |
| `AGROSITIO_API_KEY` | Mesmo segredo compartilhado salvo como `WHATSAPP_BOT_API_KEY` no AgroSítio; nunca publicar ou enviar em chat |
| `AGROSITIO_FAZENDA_CODIGO` | Código de acesso da fazenda, apenas no Termux |
| `GROQ_API_KEY` | Chave Groq, apenas no Termux; opcional para comandos sem análise |

Crie **um único valor aleatório forte** (por exemplo, num gerenciador de senhas ou `openssl rand -hex 32`). Salve-o em **Project Settings → Secrets** sob o nome `WHATSAPP_BOT_API_KEY` e coloque o mesmo valor em `AGROSITIO_API_KEY` no Termux. Não é uma chave do WhatsApp/Baileys; é somente a autenticação privada entre o bot e o AgroSítio. Se houver mais de uma fazenda ou contato, o bot deve associar previamente cada remetente autorizado à fazenda correta; não aceitar o código que o remetente informa em uma mensagem como prova de acesso. O segredo compartilhado concede acesso a todas as fazendas cujo código o bot conhecer; mantenha ambos restritos ao Termux.

## Contrato HTTP

Todas as operações: `POST /api/public/whatsapp`, `Content-Type: application/json`, `Authorization: Bearer <AGROSITIO_API_KEY>`, `x-fazenda-codigo: <AGROSITIO_FAZENDA_CODIGO>`.

Envie `numero_lote` (por exemplo `"001"`) ou `lote_id` (UUID) para escolher o lote; sem seletor usa o lote ativo mais recente. Respostas: `{ "ok": true, "data": ..., "message": "..." }`; erros retornam `{ "ok": false, "message": "..." }` com status 400 (dados inválidos), 401 (segredo inválido), 403 (código inválido), 404 (lote ausente), 409 (lote encerrado ou atualização concorrente), 500 (falha temporária), 503 (segredo ainda não configurado). As consultas ficam limitadas à fazenda pelo código enviado e verificado.

| Operação (`acao`) | Corpo adicional | Resultado |
| --- | --- | --- |
| `listar_lotes` | nenhum | Até 100 lotes, ativos e encerrados |
| `resumo_lote` | seletor opcional | Aves, mortalidade, pesagens, peso versus meta, projeção e alertas |
| `dados_lote` | seletor opcional | Resumo, últimos 30 dias de lançamentos e medições, entregas, estimativa do silo, campos ausentes |
| `historico_lote` | seletor opcional; `limite` de 1 a 120 (padrão 30) | Lançamentos e medições por data |
| `registrar_dados` | seletor, `data` e um ou mais campos abaixo | Registra/atualiza somente os campos informados; dia e lote são únicos |
| `lancar_dia` | seletor, `data`, `mortalidade` e opcionalmente `eliminados`, `peso_medio_g`, `observacoes` | Lançamento diário compatível com versões anteriores do bot |
| `atualizar_lote` | seletor e `galpao`, `linhagem` ou `sexo` | Altera dados cadastrais do lote ativo |

`data` deve ser `AAAA-MM-DD`, existir no calendário, não anteceder o alojamento nem ultrapassar o dia atual em São Paulo. `registrar_dados` aceita `mortalidade`, `eliminados` (contagens diárias), `peso_medio_g` (gramas), `consumo_racao_kg` (quilogramas/dia), `consumo_agua_l` (litros/dia), `temperatura_c`, `umidade_pct`, `ventilacao`, `cama`, `iluminacao_lux`, `horas_luz`, `uniformidade_pct`, `observacoes` e `autor`. `linhagem`: `ross_ap95`, `ross308` ou `cobb500`; `sexo`: `macho`, `femea` ou `misto`. Repetir os mesmos dados não cria nova linha; dados não mencionados permanecem inalterados. Correções no mesmo dia substituem apenas os valores mencionados. Registros devolvem data e horário (`registrado_em` nos lançamentos do bot; `registrado_em` e `atualizado_em` nas medições). Lotes encerrados não aceitam gravações.

Exemplo do corpo de uma medição: `{"acao":"registrar_dados","numero_lote":"001","data":"2026-09-27","peso_medio_g":980,"consumo_racao_kg":2800,"consumo_agua_l":8500}`. **Não grave "21 dias" como dado:** a idade é calculada da data de alojamento; confira o `dia` retornado. Para analisar desempenho, chame `dados_lote`, envie os dados retornados e a pergunta ao Groq no Termux, e mande a resposta ao produtor pelo Baileys. O exemplo de integração está em `examples/baileys-agrositio.mjs`.

Valores como saldo de silo, consumo acumulado e conversão são **estimativas**, não leitura física, salvo pesagem registrada do silo. A ausência de água, ambiente ou uniformidade aparece em `dados_ausentes`; não invente valores. A precisão do estoque depende de entregas vinculadas ao lote e de pesagens reais.