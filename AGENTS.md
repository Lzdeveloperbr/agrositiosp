# Decisões técnicas do projeto

- O bot WhatsApp permanece no Node.js/Baileys no Termux; a API HTTP pública sob `/api/public/whatsapp` apenas fornece dados e recebe lançamentos, para evitar dependência de provedores de WhatsApp.
- Cada chamada do bot usa um segredo compartilhado de servidor mais `x-fazenda-codigo` e cliente publishable sujeito ao RLS da fazenda, para manter o acesso restrito ao código informado.
- As medições ambientais e de consumo usam uma linha por lote e dia em `lote_medicoes`, enquanto mortalidade e pesagens de aves continuam em `lotes.entries`, preservando os fluxos existentes.
- Projeções de peso usam as curvas comuns da granja e o silo usa o motor compartilhado, para evitar números divergentes entre consultas.
- Toda pesagem ancora a previsão de peso a partir de sua idade, preservando a referência genética e o histórico anterior; granja e silo compartilham esse cálculo para manter a mesma previsão.
- Poultry navigation is curated centrally; unrelated legacy data is retained without exposing its modules, to avoid destructive loss.
- Individual bird samples live in the lot's daily entry alongside their mean weight, so weighing, management and silo projections use the same persisted measurement.
- Text chat uses the AI SDK UI-message stream and browser-held history; its server verifies the farm code and reads RLS-scoped facts, so responses never trust browser-supplied farm figures.
- Chat syntax highlighting imports individual Shiki grammars and two themes through the shared message-code plugin, never the full registry, to keep client/server compilation within memory limits; unknown languages retain plain code rendering.
- Voice uses the shared Live hook and server relay with client delegation; farm queries use the same calculation engines as the app and cannot write records or control equipment.
- Poultry automation rules use internal measurements and the shared silo engine; monitoring runs only while the page is open, so external weather cannot be presented as measured house conditions.
- Lineage and sex are persisted on each lot and drive shared calculations; official daily performance objectives and integrator photo targets remain distinct to avoid misrepresenting either as measured weight.
- Weekly losses derive from lot daily entries through weekly-flock (seven dates, D0-D6 first week); UI, PDF and assistant reuse it and mark missing records instead of assuming zero.