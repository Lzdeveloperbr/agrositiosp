# Roadmap

- [x] Corrigir esgotamento de memória na compilação com catálogo de formatação reduzido; compilação automática OK, 2 testes aprovados e entrada do app sem erros de execução.

- [x] Melhorar contexto e respostas do assistente avícola e corrigir regras das automações.
- [x] Adicionar conversa por voz com abertura, legendas e encerramento seguro.
- [x] Verificar regras das automações (3 testes), resposta real do serviço de IA, proteção da entrada e compilação.
- [ ] Validar conversa de texto com dados reais e troca de áudio por voz na granja. Bloqueado: não há código/sessão da granja disponível para teste; áudio e publicação não foram verificados.

- [x] Criar API segura para o bot Baileys consultar lotes e resumo operacional.
- [x] Permitir lançamento diário e correção do mesmo dia com validações.
- [ ] Configurar a chave privada compartilhada da integração. Bloqueado: o usuário fechou o campo seguro sem salvar.
- [ ] Entregar exemplo Node.js/Baileys e validar o fluxo autenticado completo. Exemplo e documentação prontos; a validação depende da chave compartilhada.
- [x] Ampliar API do bot com dados reais do lote, histórico e registros idempotentes, sem provedor de WhatsApp.
- [x] Revisar projeção de peso pelas pesagens e isolamento das pesagens do silo por lote; separar CA estimada de leitura real.
- [x] Recalibrar a previsão de peso dos próximos dias a cada pesagem real, mantendo a referência genética separada e consistente entre granja, manejo e silo.

- [x] Reconstruir o app exclusivamente para granja: nova marca, interface, navegação e remoção dos módulos alheios à avicultura.
- [ ] Validar lançamento de pesagem, leitura no lote, manejo e silo com dados reais. Bloqueado: acesso à granja indisponível na sessão de teste. Auditoria, correções, compilação e entrada pública verificadas.
- [ ] Confirmar a logo final. Bloqueado: escolha do usuário ainda pendente; conceito galo/desempenho aplicado provisoriamente.
