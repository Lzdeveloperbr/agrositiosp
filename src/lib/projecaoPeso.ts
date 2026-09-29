/** Projeção operacional: cada pesagem ancora a curva a partir daquele dia.
 * A referência genética permanece intacta, para comparação com a meta. */
export type PesagemPeso = { idade: number; pesoG: number };

export function criarProjecaoPeso(pesagens: PesagemPeso[], referencia: (idade: number) => number) {
  const validas = pesagens
    .filter((p) => Number.isFinite(p.idade) && p.idade >= 0 && Number.isFinite(p.pesoG) && p.pesoG > 0)
    .sort((a, b) => a.idade - b.idade);

  return (idade: number): number => {
    const base = referencia(idade);
    if (!Number.isFinite(idade) || idade < 0) return base;
    // Uma nova pesagem não altera o histórico anterior a ela.
    const ancora = [...validas].reverse().find((p) => p.idade <= idade);
    if (!ancora) return base;
    if (idade === ancora.idade) return ancora.pesoG;
    const baseAncora = referencia(ancora.idade);
    if (baseAncora <= 0) return base;
    const desvio = ancora.pesoG / baseAncora - 1;
    // O desvio observado perde força aos poucos; não é uma meta genética nova.
    const previsto = base * (1 + desvio * Math.exp(-(idade - ancora.idade) / 21));
    return Math.max(ancora.pesoG, previsto);
  };
}