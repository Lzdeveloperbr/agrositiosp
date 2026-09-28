# Decisões técnicas do projeto

- O bot WhatsApp permanece no Node.js/Baileys no Termux; a API HTTP pública sob `/api/public/whatsapp` apenas fornece dados e recebe lançamentos, para evitar dependência de provedores de WhatsApp.
- Cada chamada do bot usa um segredo compartilhado de servidor mais `x-fazenda-codigo` e cliente publishable sujeito ao RLS da fazenda, para manter o acesso restrito ao código informado.
- As medições ambientais e de consumo usam uma linha por lote e dia em `lote_medicoes`, enquanto mortalidade e pesagens de aves continuam em `lotes.entries`, preservando os fluxos existentes.
- Projeções de peso usam as curvas comuns da granja e o silo usa o motor compartilhado, para evitar números divergentes entre consultas.