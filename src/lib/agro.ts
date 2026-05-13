// Calendário agrícola — janelas ideais de plantio (hemisfério sul / Brasil) por mês (1-12).
export type CulturaInfo = {
  nome: string;
  emoji: string;
  janela: number[];
  cicloDias: [number, number];
  agua: "baixa" | "media" | "alta";
  solo: string;
  obs: string;
};

export const CULTURAS: CulturaInfo[] = [
  { nome: "Milho",      emoji: "🌽", janela: [9,10,11,12,1],     cicloDias: [110, 140], agua: "media", solo: "Bem drenado, fértil",      obs: "Plantio de verão; safrinha em fev-mar." },
  { nome: "Soja",       emoji: "🫘", janela: [10,11,12],          cicloDias: [100, 130], agua: "media", solo: "Argiloso, pH 5,5-6,5",     obs: "Inocular semente; rotação com milho." },
  { nome: "Feijão",     emoji: "🫛", janela: [9,10,2,3],          cicloDias: [80, 100],  agua: "media", solo: "Drenado, fértil",          obs: "Águas (out) e seca (fev-mar)." },
  { nome: "Café",       emoji: "☕", janela: [10,11,12,1],         cicloDias: [365, 730], agua: "alta",  solo: "Profundo, ácido (5,0-5,5)",obs: "Mudas no início das chuvas." },
  { nome: "Cana",       emoji: "🎋", janela: [9,10,11,2,3],       cicloDias: [365, 540], agua: "media", solo: "Argiloso, profundo",       obs: "Plantio de ano e meio (set-out)." },
  { nome: "Sorgo",      emoji: "🌾", janela: [1,2,3],             cicloDias: [100, 120], agua: "baixa", solo: "Tolera solos pobres",      obs: "Excelente para safrinha." },
  { nome: "Mandioca",   emoji: "🍠", janela: [9,10,11,12],         cicloDias: [240, 540], agua: "baixa", solo: "Arenoso, drenado",         obs: "Maniva sadia; pouca exigência." },
  { nome: "Capim/Pasto",emoji: "🌱", janela: [10,11,12,1,2],      cicloDias: [60, 120],  agua: "media", solo: "Variado",                  obs: "Brachiaria/Mombaça com chuva regular." },
  { nome: "Hortaliças", emoji: "🥬", janela: [3,4,5,6,7,8],       cicloDias: [40, 90],   agua: "alta",  solo: "Rico em matéria orgânica", obs: "Outono/inverno: alface, couve, brócolis." },
  { nome: "Tomate",     emoji: "🍅", janela: [3,4,5,8,9],         cicloDias: [100, 140], agua: "alta",  solo: "Drenado, rico em Ca",      obs: "Tutoramento e desbrota." },
  { nome: "Banana",     emoji: "🍌", janela: [9,10,11,12],         cicloDias: [365, 540], agua: "alta",  solo: "Profundo, drenado",        obs: "Mudas no início das chuvas." },
  { nome: "Trigo",      emoji: "🌾", janela: [4,5,6],             cicloDias: [110, 140], agua: "media", solo: "Drenado",                  obs: "Sul/Sudeste, cultivo de inverno." },
];

export const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export function recomendacoesDoMes(mes: number): CulturaInfo[] {
  return CULTURAS.filter((c) => c.janela.includes(mes));
}

// === Plantios ===
export type TratoCultural = {
  id: string;
  data: string;
  tipo: "adubacao" | "irrigacao" | "pulverizacao" | "capina" | "colheita_parcial" | "outro";
  produto?: string;
  dose?: string;
  custo?: number;
  observacoes?: string;
};

export type Plantio = {
  id: string;
  cultura: string;
  variedade?: string;
  areaHa: number;
  quantidadeSementes?: number;
  unidadeSementes?: string;
  tipoSolo?: string;
  local?: string;
  dataPlantio: string;
  previsaoColheita?: string;
  dataColheita?: string;
  produtividadeKg?: number;
  precoKg?: number;
  status: "plantado" | "crescimento" | "florescimento" | "colheita" | "encerrado";
  tratos: TratoCultural[];
  observacoes?: string;
};
