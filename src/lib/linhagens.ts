// Curvas oficiais aproximadas de peso vivo (g) por idade (dias) — machos mistos.
// Fonte: manuais de performance Cobb 500 e Ross 308 (uso operacional, valores arredondados).

import { ROSS_AP95_WEIGHTS, ROSS_AP95_FEED } from "./ross-ap95";

export type Linhagem = "cobb500" | "ross308" | "ross_ap95";

export function resolveLinhagem(value?: string): Linhagem {
  return value === "cobb500" || value === "ross308" ? value : "ross_ap95";
}

export const CURVAS: Record<Linhagem, { dia: number; peso: number; consumoAcum: number; ca: number }[]> = {
  ross_ap95: ROSS_AP95_WEIGHTS.map((peso, dia) => ({ dia, peso, consumoAcum: ROSS_AP95_FEED[dia], ca: ROSS_AP95_FEED[dia] / peso })),
  cobb500: [
    { dia: 1, peso: 42, consumoAcum: 13, ca: 0.31 },
    { dia: 7, peso: 185, consumoAcum: 165, ca: 0.89 },
    { dia: 14, peso: 470, consumoAcum: 565, ca: 1.20 },
    { dia: 21, peso: 925, consumoAcum: 1240, ca: 1.34 },
    { dia: 28, peso: 1520, consumoAcum: 2185, ca: 1.44 },
    { dia: 35, peso: 2230, consumoAcum: 3415, ca: 1.53 },
    { dia: 42, peso: 2980, consumoAcum: 4905, ca: 1.65 },
    { dia: 49, peso: 3680, consumoAcum: 6510, ca: 1.77 },
  ],
  ross308: [
    { dia: 1, peso: 43, consumoAcum: 13, ca: 0.30 },
    { dia: 7, peso: 192, consumoAcum: 170, ca: 0.89 },
    { dia: 14, peso: 485, consumoAcum: 580, ca: 1.20 },
    { dia: 21, peso: 950, consumoAcum: 1265, ca: 1.33 },
    { dia: 28, peso: 1560, consumoAcum: 2230, ca: 1.43 },
    { dia: 35, peso: 2290, consumoAcum: 3490, ca: 1.52 },
    { dia: 42, peso: 3050, consumoAcum: 5010, ca: 1.64 },
    { dia: 49, peso: 3750, consumoAcum: 6640, ca: 1.77 },
  ],
};

export const LINHAGEM_LABEL: Record<Linhagem, string> = {
  ross_ap95: "Ross AP95 (Ross 308 AP)",
  cobb500: "Cobb 500",
  ross308: "Ross 308",
};

export function metaPeso(linhagem: Linhagem, dia: number): number {
  const c = CURVAS[linhagem];
  if (dia <= c[0].dia) return c[0].peso;
  if (dia >= c[c.length - 1].dia) return c[c.length - 1].peso;
  for (let i = 0; i < c.length - 1; i++) {
    const a = c[i], b = c[i + 1];
    if (dia >= a.dia && dia <= b.dia) {
      const t = (dia - a.dia) / (b.dia - a.dia);
      return Math.round(a.peso + (b.peso - a.peso) * t);
    }
  }
  return c[c.length - 1].peso;
}

// ===== Sensação térmica das aves (Effective Temperature) =====
// Aproximação: ET = T - (V * fator_vento) - (UR_efeito) — calibrado para faixa 20-35ºC.
// Vento esfria mais quando ave está adulta; umidade alta + calor estressa.
export function sensacaoTermica(tempC: number, umidadeRel: number, ventoMs: number): number {
  // Resfriamento por vento (efeito chill) — válido a partir de 0,3 m/s
  const chill = ventoMs > 0.3 ? Math.min(6, (ventoMs - 0.3) * 2.2) : 0;
  // Estresse por umidade quando T > 26ºC
  const umidExtra = tempC > 26 ? Math.max(0, (umidadeRel - 60) / 100) * (tempC - 26) * 0.5 : 0;
  return Math.round((tempC - chill + umidExtra) * 10) / 10;
}

export function statusTermico(et: number, idadeDias: number): { faixa: string; cor: string; recomendacao: string } {
  // Faixa ideal varia com a idade: pintinho 32ºC → adulto 21ºC
  const ideal = idadeDias <= 7 ? 32 : idadeDias <= 14 ? 29 : idadeDias <= 21 ? 26 : idadeDias <= 28 ? 24 : 21;
  const diff = et - ideal;
  if (Math.abs(diff) <= 1.5) return { faixa: "Conforto", cor: "text-emerald-600", recomendacao: `Ideal para idade (${ideal}ºC). Manter manejo.` };
  if (diff > 1.5 && diff <= 4) return { faixa: "Calor leve", cor: "text-amber-600", recomendacao: "Aumentar exaustão / abrir mais inlets. Verificar nebulização." };
  if (diff > 4) return { faixa: "Estresse calórico", cor: "text-destructive", recomendacao: "Acionar 100% dos exaustores + nebulização. Monitorar consumo de água." };
  if (diff < -1.5 && diff >= -4) return { faixa: "Frio leve", cor: "text-sky-600", recomendacao: "Reduzir exaustão. Acionar aquecimento se houver pintainhos." };
  return { faixa: "Frio crítico", cor: "text-blue-700", recomendacao: "Acionar aquecimento imediatamente. Risco de aglomeração e refugagem." };
}

// ===== Pressão estática negativa =====
// Pressão alvo (Pa) para garantir velocidade de jato pelos inlets:
// V (m/s) = √(2 · ΔP / ρ_ar)  →  ΔP = 0,6 · V²  (ρ_ar ≈ 1,2 kg/m³)
// Para projetar jato cruzando a largura do galpão, V_jato ideal ≈ √(largura) * fator
export function pressaoIdealPa(larguraM: number): { min: number; max: number; recomendada: number } {
  // Tabela prática avicultura BR (Embrapa / integradoras): ΔP em Pa por largura
  // 8m → 10-15 Pa, 12m → 20-25 Pa, 14m → 25-30 Pa, 16m → 30-35 Pa, 20m → 37-45 Pa
  const ref = [
    { l: 8, min: 10, max: 15 },
    { l: 12, min: 20, max: 25 },
    { l: 14, min: 25, max: 30 },
    { l: 16, min: 30, max: 35 },
    { l: 20, min: 37, max: 45 },
  ];
  if (larguraM <= ref[0].l) return { min: ref[0].min, max: ref[0].max, recomendada: (ref[0].min + ref[0].max) / 2 };
  if (larguraM >= ref[ref.length - 1].l) {
    const r = ref[ref.length - 1];
    return { min: r.min, max: r.max, recomendada: (r.min + r.max) / 2 };
  }
  for (let i = 0; i < ref.length - 1; i++) {
    const a = ref[i], b = ref[i + 1];
    if (larguraM >= a.l && larguraM <= b.l) {
      const t = (larguraM - a.l) / (b.l - a.l);
      const min = Math.round(a.min + (b.min - a.min) * t);
      const max = Math.round(a.max + (b.max - a.max) * t);
      return { min, max, recomendada: Math.round(((min + max) / 2) * 10) / 10 };
    }
  }
  return { min: 20, max: 30, recomendada: 25 };
}

// ===== Troca de ar mínima (ventilação mínima) =====
// CFM por ave aproximado por idade (semana) — base ventilação mínima de inverno:
// Sem 1: 0,1 | Sem 2: 0,15 | Sem 3: 0,25 | Sem 4: 0,35 | Sem 5: 0,5 | Sem 6: 0,7 | Sem 7: 1,0
export function cfmPorAve(idadeDias: number): number {
  const tabela: Record<number, number> = { 1: 0.1, 2: 0.15, 3: 0.25, 4: 0.35, 5: 0.5, 6: 0.7, 7: 1.0 };
  const sem = Math.min(7, Math.max(1, Math.ceil(idadeDias / 7)));
  return tabela[sem];
}

export function planoVentilacaoMinima(opts: {
  idadeDias: number;
  numeroAves: number;
  capacidadeExaustorCfm: number; // ex: 24000 cfm por exaustor cone
  totalExaustores: number;
  cicloSegundos?: number; // padrão 300 (5 min)
}) {
  const cfmTotalNecessario = opts.numeroAves * cfmPorAve(opts.idadeDias);
  const ciclo = opts.cicloSegundos ?? 300;
  const capCiclo = opts.capacidadeExaustorCfm * ciclo; // ft³ por exaustor em 1 ciclo
  const necessarioCiclo = cfmTotalNecessario * ciclo;
  // Tempo ligado de 1 exaustor para entregar volume necessário, em 1 ciclo
  const segundosLigado1Exaustor = Math.min(ciclo, Math.round(necessarioCiclo / opts.capacidadeExaustorCfm));
  // Se >ciclo, precisa de mais exaustores
  const exaustoresNecessarios = Math.max(1, Math.ceil(cfmTotalNecessario / opts.capacidadeExaustorCfm));
  return {
    cfmTotalNecessario: Math.round(cfmTotalNecessario),
    exaustoresNecessarios,
    segundosLigado1Exaustor,
    cicloSegundos: ciclo,
    porcentagemDoCiclo: Math.round((segundosLigado1Exaustor / ciclo) * 100),
    capacidadeOk: exaustoresNecessarios <= opts.totalExaustores,
    capCiclo: Math.round(capCiclo),
    necessarioCiclo: Math.round(necessarioCiclo),
  };
}
