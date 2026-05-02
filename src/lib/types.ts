export type DailyEntry = {
  date: string; // ISO yyyy-mm-dd
  mortalidade: number;
  racaoKg: number;
  aguaL: number;
  pesoMedioG?: number; // gramas
  observacoes?: string;
};

export type Lote = {
  id: string;
  numero: string;
  dataEntrada: string;
  quantidadeInicial: number;
  integradora: string;
  previsaoAbateDias: number;
  percentualLucro: number; // %
  precoKgVivo?: number;
  entries: DailyEntry[];
  encerrado?: boolean;
};

export type Medidor = {
  id: string;
  nome: string;
  codigoInstalacao: string;
  codigoRelogio: string;
  leituras: { data: string; valor: number }[];
};
