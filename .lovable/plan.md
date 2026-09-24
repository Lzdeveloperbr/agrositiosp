# Integração do assistente WhatsApp com a granja

## Objetivo
Permitir que o bot Baileys no Termux consulte e atualize os dados da fazenda com segurança, sem expor credenciais do banco no celular.

## O que será criado
- Uma API externa do AgroSítio, protegida por uma chave privada e pelo código da fazenda.
- Consultas para listar lotes e obter o resumo operacional do lote ativo ou de um lote específico.
- Resumo com dia do lote, aves vivas, mortalidade, peso medido, peso esperado, diferença da meta, projeção de abate e alertas principais.
- Lançamento diário pelo WhatsApp, incluindo mortalidade, eliminados, peso médio e observações.
- Validações para bloquear datas futuras, números negativos, pesos incoerentes e lotes encerrados.
- Atualização do registro quando já existir lançamento para o mesmo dia, evitando duplicidade.
- Respostas em JSON simples, com mensagens claras para o assistente interpretar.
- Um exemplo pronto em Node.js/Baileys mostrando os cabeçalhos, consultas e lançamentos.

## Segurança
- O bot não receberá nem usará credenciais administrativas do banco.
- A chave da integração ficará armazenada de forma privada no AgroSítio e também será configurada no Termux pelo proprietário.
- Toda operação continuará limitada à fazenda indicada pelo código de acesso, respeitando o isolamento atual entre fazendas.
- A API aceitará apenas ações e campos definidos; não permitirá consultas livres ao banco.

## Validação
- Testar acesso sem chave, com chave inválida e com código de fazenda inválido.
- Testar consulta do lote ativo e de um lote específico.
- Testar novo lançamento, correção no mesmo dia e rejeição de dados inválidos.
- Confirmar que a alteração feita pela API aparece na tela da granja.
- Verificar compilação e erros da aplicação.

## Detalhes técnicos
- Endpoint estável: `/api/public/whatsapp` no domínio publicado do AgroSítio.
- Autenticação por `Authorization: Bearer ...` e `x-fazenda-codigo`.
- Requisições `POST` com ações tipadas; resposta padronizada `{ ok, data, message }`.
- O Termux chamará somente a API do AgroSítio; o acesso ao banco permanece no servidor.
