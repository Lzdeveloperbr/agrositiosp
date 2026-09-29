# Roadmap

- [x] Criar API segura para o bot Baileys consultar lotes e resumo operacional.
- [x] Permitir lançamento diário e correção do mesmo dia com validações.
- [ ] Configurar a chave privada compartilhada da integração. Bloqueado: o usuário fechou o campo seguro sem salvar.
- [ ] Entregar exemplo Node.js/Baileys e validar o fluxo autenticado completo. Exemplo e documentação prontos; a validação depende da chave compartilhada.
- [x] Ampliar API do bot com dados reais do lote, histórico e registros idempotentes, sem provedor de WhatsApp.
- [x] Revisar projeção de peso pelas pesagens e isolamento das pesagens do silo por lote; separar CA estimada de leitura real.
- [ ] Recalibrar a previsão de peso dos próximos dias a cada pesagem real, mantendo a referência genética separada e consistente entre granja, manejo e silo.
