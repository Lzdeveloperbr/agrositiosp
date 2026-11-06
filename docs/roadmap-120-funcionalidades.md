# Plano de expansão — 120 funcionalidades para o Agro Sítio SP

> Este documento é um plano de implementação, não uma afirmação de que os itens já existem. Cada recurso só deve ser marcado como concluído depois de implementado, testado e validado com dados reais. Prioridade: segurança, rastreabilidade, funcionamento no celular e preservação dos dados atuais.

## Regras obrigatórias

- Não apagar nem migrar dados existentes sem migração reversível e backup.
- Reutilizar os motores de cálculo compartilhados de peso, mortalidade, silo e indicadores.
- Distinguir dado medido, dado estimado e dado informado manualmente.
- Toda gravação deve respeitar o isolamento por fazenda/RLS e registrar autor e horário.
- Recursos que dependem de sensores, integradora, WhatsApp, clima ou hardware só podem mostrar integração ativa quando ela estiver realmente configurada.
- Validar fórmulas técnicas com responsável da granja/veterinário/nutricionista; o app não substitui orientação profissional.
- Implementar em etapas pequenas, com testes e revisão antes de publicar em produção.

## 1. Lotes e produção

1. Cadastro de múltiplos galpões por propriedade.
2. Capacidade máxima configurável por galpão.
3. Linha do tempo visual de cada lote.
4. Registro de alojamento com origem e fornecedor dos pintinhos.
5. Registro de uniformidade inicial do lote.
6. Registro de transferência parcial entre galpões.
7. Registro de apanha e retirada por carregamento.
8. Fechamento de lote com conferência de aves alojadas, mortas, descartadas e abatidas.
9. Checklist de pré-alojamento.
10. Comparação de lotes por linhagem, sexo, estação e galpão.
11. Histórico de lotes com filtros avançados.
12. Duplicação de configuração de um lote anterior sem copiar os dados de produção.

## 2. Manejo diário e bem-estar

13. Checklist diário personalizável por horário.
14. Rotinas separadas para manhã, tarde e noite.
15. Registro de inspeção visual do lote.
16. Registro de comportamento e distribuição das aves.
17. Registro de qualidade e condição da cama por área.
18. Mapa do galpão para marcar pontos úmidos/quentes.
19. Registro de altura e regulagem de comedouros.
20. Registro de altura e pressão das linhas de nipple.
21. Registro de vazão de água por linha.
22. Registro de iluminação e programa de luz.
23. Registro de cortinas, entradas de ar e posição de equipamentos.
24. Diário fotográfico com data, lote, área e observação.

## 3. Ambiência e equipamentos

25. Painel de temperatura por zona do galpão.
26. Histórico de umidade relativa.
27. Histórico de pressão negativa.
28. Registro de velocidade do ar, quando medida.
29. Registro de temperatura externa separado da interna.
30. Gráficos de ambiência por hora e por dia.
31. Comparação entre temperatura-alvo e medida.
32. Alertas configuráveis de temperatura e umidade.
33. Registro de alarmes do controlador com horário e resolução.
34. Diário de funcionamento dos grupos de exaustores.
35. Registro de manutenção de ventiladores e motores.
36. Checklist de gerador e teste de transferência.
37. Registro de falta de energia e duração.
38. Registro de calibração de sensores.
39. Histórico de manutenção do controlador e dimmer.
40. Relatório de ambiência por lote.

## 4. Água e ração

41. Leitura diária do hidrômetro.
42. Cálculo de consumo de água por ave viva.
43. Comparação água/ração por dia.
44. Alertas de variação anormal no consumo de água.
45. Registro de limpeza e sanitização de caixas e linhas.
46. Controle de tratamento da água com produto, dose informada e responsável.
47. Registro de pH e qualidade da água, quando medidos.
48. Estoque de ração por tipo e fase.
49. Histórico de cargas recebidas com peso e nota fiscal.
50. Conferência entre ração recebida e ração lançada no silo.
51. Previsão de autonomia do silo com faixa de confiança.
52. Alerta de silo baixo com antecedência configurável.
53. Registro de sobra, descarte e perda de ração.
54. Comparação de conversão alimentar estimada e real, deixando a origem explícita.
55. Relatório de consumo acumulado por ave e por lote.

## 5. Pesagem e desempenho

56. Pesagem por amostra com identificação do ponto do galpão.
57. Histórico de tamanho da amostra.
58. Cálculo de média, mínimo, máximo e desvio padrão.
59. Cálculo de coeficiente de variação (CV%).
60. Indicador de uniformidade com critério configurável.
61. Gráfico de peso real versus curva de referência.
62. Projeção de peso de abate com intervalo estimado.
63. Cálculo de ganho diário de peso entre pesagens.
64. Alertas de pesagem atrasada.
65. Comparativo de desempenho por sexo e linhagem.
66. Histórico de correções de pesagem com justificativa.
67. Relatório de desempenho pronto para PDF.

## 6. Mortalidade e sanidade

68. Lançamento de mortalidade por período e motivo.
69. Registro separado de aves descartadas/condenadas.
70. Curva diária e acumulada de mortalidade.
71. Mortalidade semanal D0–D6 e semanas seguintes.
72. Registro de sintomas observados sem diagnóstico automático conclusivo.
73. Registro de necropsia e achados por profissional responsável.
74. Calendário de vacinação e procedimentos sanitários.
75. Registro de lote, validade e fabricante de vacinas/produtos.
76. Controle de carência e alertas de segurança para medicamentos.
77. Registro de visitas técnicas e recomendações.
78. Controle de biosseguridade e acesso de visitantes.
79. Checklist de limpeza, lavagem e desinfecção entre lotes.
80. Controle de pragas com pontos de inspeção e histórico de iscas.

## 7. Equipe e tarefas

81. Cadastro de usuários por propriedade.
82. Perfis e permissões por função.
83. Atribuição de tarefas por responsável.
84. Prazos, prioridade e recorrência de tarefas.
85. Confirmação de execução com foto e observação.
86. Histórico de quem criou, editou ou concluiu cada registro.
87. Escala de turnos e passagem de serviço.
88. Quadro de avisos da equipe.
89. Comentários vinculados a lote, tarefa ou ocorrência.
90. Notificações internas com confirmação de leitura.

## 8. Custos, energia e manutenção

91. Cadastro de centros de custo por galpão.
92. Lançamento de despesas com comprovante.
93. Rateio de custos entre lotes com regra explícita.
94. Custo estimado por ave alojada.
95. Custo por kg produzido com dados disponíveis.
96. Controle de receitas e acertos por lote.
97. Fluxo de caixa da propriedade.
98. Registro de leitura de energia por medidor.
99. Cálculo de consumo e custo de energia por período.
100. Comparação de consumo elétrico entre lotes.
101. Plano de manutenção preventiva de equipamentos.
102. Controle de peças, materiais e fornecedores de manutenção.

## 9. Relatórios, inteligência e integração

103. Relatório diário automático do lote.
104. Relatório semanal consolidado em PDF.
105. Exportação de tabelas para CSV/Excel.
106. Painel de indicadores com metas configuráveis.
107. Comparação entre resultado atual e histórico da própria granja.
108. Resumo de turno enviado para equipe quando integração estiver configurada.
109. API com chaves individuais, permissões e trilha de auditoria.
110. Integração WhatsApp com confirmação de lançamento e proteção contra duplicidade.
111. Assistente IA que responde citando os dados e datas usados.
112. Resumo por voz com leitura dos indicadores.
113. Busca global por lote, registro, tarefa e relatório.
114. Central de notificações com filtros e histórico.

## 10. Confiabilidade, mobilidade e segurança

115. Modo de rascunho offline com sincronização segura quando a conexão voltar.
116. Indicador de registros pendentes de sincronização.
117. Detecção e resolução assistida de conflitos de sincronização.
118. Backup exportável e teste de restauração.
119. Log de auditoria e histórico de alterações.
120. Central de saúde do sistema com status de sincronização, integrações e última cópia de segurança.

## Ordem sugerida de entrega

- **Fase 1 — Base confiável:** permissões, auditoria, backup/restauração, offline seguro, pesquisa global e qualidade dos registros.
- **Fase 2 — Operação:** rotinas, água, ração, ambiência, manutenção e biosseguridade.
- **Fase 3 — Inteligência produtiva:** pesagem avançada, uniformidade, previsões e comparativos.
- **Fase 4 — Gestão:** equipe, custos, energia, relatórios e integrações.
- **Fase 5 — Automação avançada:** IA contextual, voz, notificações externas e integrações com hardware.

## Critérios para considerar um recurso concluído

1. Interface desktop e celular revisada.
2. Validação dos campos e mensagens de erro claras.
3. Persistência real no banco, com RLS e isolamento por propriedade.
4. Estados de carregamento, vazio, erro e sucesso.
5. Testes unitários/integrados dos cálculos e regras.
6. Teste de regressão dos fluxos existentes.
7. Exportação/relatório coerente quando aplicável.
8. Documentação atualizada e migração reversível quando houver alteração de banco.
