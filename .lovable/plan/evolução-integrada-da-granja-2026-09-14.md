# Evolução integrada da granja

## Objetivo
Tornar manejo, peso esperado e estoque de ração uma operação única: o lote ativo alimenta todos os cálculos, sem duplicidade de dados e com referências coerentes por idade e linhagem.

## O que será melhorado
- **Painel da granja:** corrigir aves vivas e mortalidade para considerar também eliminados; mostrar peso esperado, diferença do peso real, GPD e situação do lote.
- **Lançamento diário:** ordenar os registros por data, impedir lançamentos incoerentes e usar a data real para definir o dia do lote nos gráficos.
- **Manejo:** corrigir definitivamente D0–D42, alinhar peso e consumo às mesmas curvas técnicas usadas pelo silo, selecionar automaticamente o lote ativo e substituir a falsa “CA real” por um indicador claramente estimado.
- **Peso esperado:** centralizar a curva por linhagem e sexo, comparar real × esperado e projetar peso de abate com base nas pesagens recentes.
- **Estoque ao vivo:** usar somente entregas do lote correto, aves vivas por dia, mortalidade, eliminados, peso medido, ganho diário e conversão incremental; manter a balança do silo apenas como calibração opcional.
- **Automação:** criar alertas práticos para pesagem atrasada, peso fora da curva, mortalidade elevada, estoque baixo e prazo de novo pedido, com atalhos para a ação correta.

## Validação
- Conferir cálculos compartilhados e datas em D0, D7, D14, D28 e D42.
- Testar o fluxo no celular: abrir lote, lançar mortalidade/peso e confirmar atualização de manejo, peso esperado e silo.
- Validar compilação, erros da tela e ausência de dados misturados entre lotes.

## Detalhes técnicos
- Reaproveitar um único motor zootécnico para curvas de peso/consumo e evitar números diferentes entre telas.
- Preservar todos os dados atuais; nenhuma migração destrutiva será feita.
- Manter o modelo sem balança física como padrão, com confiança calculada pela frequência e qualidade dos registros do lote.
