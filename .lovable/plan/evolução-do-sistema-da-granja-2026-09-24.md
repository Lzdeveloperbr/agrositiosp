# Evolução do sistema da granja

## Objetivo
Transformar a tela da granja em um centro de operação diária, deixando claro o estado de cada lote, o que precisa ser feito agora e quais números exigem atenção.

## Melhorias
- Criar um resumo executivo do lote ativo com fase, dia, aves vivas, peso versus meta, mortalidade e proximidade do abate.
- Organizar pendências por prioridade, com atalhos diretos para lançamento diário, pesagem, manejo, silo e sanidade.
- Melhorar os cartões dos lotes para mostrar saúde operacional, progresso, última atualização e alertas sem abrir os detalhes.
- Tornar o cadastro de lote mais seguro, validando quantidade, data e previsão de abate antes de salvar.
- Refinar a apresentação no celular com indicadores compactos, ações grandes e hierarquia visual Obsidian Gold.

## Validação
- Conferir lotes ativos, encerrados, sem lançamentos e sem pesagens.
- Testar criação e navegação do lote no celular e computador.
- Verificar datas D0–D42, ausência de rolagem lateral e funcionamento dos atalhos.

## Detalhes técnicos
- Reutilizar o cálculo zootécnico central já existente, sem duplicar fórmulas.
- Preservar todos os dados atuais e o isolamento por lote.
- Não criar novas tabelas nem alterar o modelo de acesso da fazenda.
