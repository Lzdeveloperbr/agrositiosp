import { diffDias, isoLocal, parseData } from "@/lib/data";
import { refCA, refConsumoAcumG, refPesoG, type Linhagem, type Sexo } from "@/lib/silo";
import type { Lote } from "@/lib/types";
import { criarProjecaoPeso } from "@/lib/projecaoPeso";

export type ResumoZootecnico = ReturnType<typeof calcularResumoLote>;

export function calcularResumoLote(
  lote: Lote,
  linhagem: Linhagem = "ross_ap95",
  sexo: Sexo = "misto",
  hoje = new Date(),
) {
  const entries = [...(lote.entries || [])].filter((e) => e.date && e.date >= lote.dataEntrada && e.date <= isoLocal(hoje)).sort((a, b) => a.date.localeCompare(b.date));
  const idade = Math.max(0, diffDias(lote.dataEntrada, hoje));
  const mortalidade = entries.reduce((s, e) => s + Math.max(0, Number(e.mortalidade) || 0), 0);
  const eliminados = entries.reduce((s, e) => s + Math.max(0, Number(e.eliminados) || 0), 0);
  const baixas = mortalidade + eliminados;
  const vivas = Math.max(0, lote.quantidadeInicial - baixas);
  const mortalidadePct = lote.quantidadeInicial > 0 ? (baixas / lote.quantidadeInicial) * 100 : 0;

  const pesagens = entries
    .filter((e) => Number(e.pesoMedioG) > 0)
    .map((e) => ({ data: e.date, idade: Math.max(0, diffDias(lote.dataEntrada, parseData(e.date))), pesoG: Number(e.pesoMedioG) }))
    .sort((a, b) => a.data.localeCompare(b.data));
  const ultimaPesagem = pesagens.at(-1) ?? null;
  const penultimaPesagem = pesagens.at(-2) ?? null;
  const diasSemPesar = ultimaPesagem ? Math.max(0, diffDias(ultimaPesagem.data, hoje)) : idade;
  const pesoEsperadoHojeG = refPesoG(idade, linhagem, sexo);
  const projetarPesoG = criarProjecaoPeso(pesagens, (dia) => refPesoG(dia, linhagem, sexo));
  const pesoProjetadoHojeG = projetarPesoG(idade);
  const diferencaPesoPct = ultimaPesagem
    ? ((ultimaPesagem.pesoG - refPesoG(ultimaPesagem.idade, linhagem, sexo)) / Math.max(1, refPesoG(ultimaPesagem.idade, linhagem, sexo))) * 100
    : null;
  const gpdRecente = ultimaPesagem && penultimaPesagem && ultimaPesagem.idade > penultimaPesagem.idade
    ? (ultimaPesagem.pesoG - penultimaPesagem.pesoG) / (ultimaPesagem.idade - penultimaPesagem.idade)
    : null;
  const idadeAbate = Math.max(idade, lote.previsaoAbateDias || 42);
  const pesoProjetadoAbateG = projetarPesoG(idadeAbate);
  const consumoEsperadoKg = (refConsumoAcumG(idade, linhagem, sexo) * vivas) / 1000;
  const caEsperada = refCA(idade, linhagem, sexo);

  const situacao = diferencaPesoPct === null
    ? "sem_pesagem"
    : diferencaPesoPct < -7 ? "critico"
    : diferencaPesoPct < -3 ? "atencao"
    : "meta";

  return {
    idade, mortalidade, eliminados, baixas, vivas, mortalidadePct,
    pesagens, ultimaPesagem, diasSemPesar,
    pesoEsperadoHojeG, pesoProjetadoHojeG, pesoProjetadoAbateG,
    diferencaPesoPct, gpdRecente, consumoEsperadoKg, caEsperada, situacao, projetarPesoG,
  };
}