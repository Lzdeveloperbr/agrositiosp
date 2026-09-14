# Manejo por lote — evolução operacional

## Objetivo
Transformar a tela de manejo em um painel diário que diga não apenas o protocolo, mas se o lote tem ração suficiente e quais ações exigem atenção.

## Implementação
- Mostrar a fase atual e a próxima troca de ração no protocolo D0–D42.
- Calcular a ração necessária até o fim da fase usando aves vivas, mortalidade e peso real/projetado.
- Comparar essa necessidade com o saldo estimado do silo e indicar sobra, falta ou margem segura.
- Exibir peso real versus meta, consumo previsto e confiabilidade da estimativa em linguagem simples.
- Sincronizar linhagem escolhida entre Manejo e Silo ao Vivo.
- Melhorar o uso no celular, mantendo os indicadores mais importantes visíveis primeiro.

## Validação
- Testar lotes com e sem pesagem de aves e com saldo suficiente/insuficiente.
- Conferir D0, trocas de fase e D42.
- Validar computador e celular sem erros ou rolagem lateral.
