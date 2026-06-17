## Atualização Premium AgroSítio SP

Vou preservar **100% dos dados e funcionalidades existentes**. Nada será apagado, nem o banco alterado de forma destrutiva. Apenas melhorias visuais e novos módulos serão adicionados sobre o que já existe.

O escopo enviado é gigantesco (equivalente a várias semanas de desenvolvimento). Para entregar com qualidade premium — e não uma versão superficial de tudo — proponho dividir em **fases**. Cada fase fica completa, testada e funcional antes da próxima.

---

### Fase 1 — Identidade visual premium + Dashboard
- Nova paleta (verde #16A34A / #166534, bege #F8F7F2, etc.) aplicada via tokens em `src/styles.css` (sem quebrar dark mode atual).
- Cards modernos, sombras suaves, skeleton loading, transições.
- **Dashboard novo na home (`/`)**: saudação personalizada + data + clima + KPIs (lotes, aves, mortalidade, ração, água, gastos, receita, lucro) puxando dos dados já existentes no Supabase.
- Menu lateral/inferior refinado, sem remover itens atuais.

### Fase 2 — Inteligência de mercado (Cotações + Notícias + Clima 7 dias)
- Nova rota `/mercado` com:
  - **Cotações regionais** (Boi Gordo, Bezerro, Milho, Soja, Café, Frango Vivo, Dólar, etc.) com variação diária/semanal e mini-gráficos.
  - **Alertas de preço** configuráveis (nova tabela `alertas_mercado`).
  - **Feed de notícias agro** por categoria, com favoritar/filtrar.
- Clima rural expandido para 7 dias com alertas.
- ⚠️ **Requer fontes de dados externas.** Preciso definir com você antes de implementar (ver perguntas abaixo).

### Fase 3 — Gráficos profissionais + Financeiro Premium + Relatórios PDF
- Gráficos (mortalidade, consumo, gastos, lucro) com filtros 7/30/90/365 dias.
- Fluxo de caixa, receitas/despesas categorizadas, dashboard financeiro.
- PDFs corporativos (diário, semanal, mensal, por lote, financeiro, estoque).

### Fase 4 — Assistente Agro IA + Extras
- Chat IA (Lovable AI Gateway, sem custo de chave) que lê os indicadores do sítio e responde dúvidas, detecta anomalias, gera insights.
- Pesquisa global, central de notificações, histórico/auditoria.

---

### Perguntas antes de começar (Fase 2 depende disso):

1. **Cotações agro em tempo real** — não existe API pública gratuita confiável de cotações regionais SP. Opções:
   - (a) Você fornece uma chave de API paga (ex.: Cepea/Scot Consultoria/AgriPoint).
   - (b) Eu faço web scraping diário do site público do **Cepea/Esalq-USP** (gratuito, mas valores nacionais, não por município).
   - (c) Cadastro manual: você/operador insere cotações da praça local diariamente.

2. **Notícias agro** — usar RSS gratuito (Canal Rural, Globo Rural, Notícias Agrícolas) agregado, ou você prefere uma fonte específica?

3. **Mapa de preços por município** — depende da fonte de cotações acima. Posso fazer ele em Fase 2 se a fonte permitir, ou marcar como "futuro".

4. **Posso começar pela Fase 1 agora** (visual + dashboard, 100% sem dependências externas), enquanto você responde as perguntas acima para a Fase 2?

Me confirme as respostas e eu sigo imediatamente com a Fase 1.
