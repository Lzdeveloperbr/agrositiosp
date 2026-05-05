// ===== Granja =====
export type DailyEntry = {
  date: string;
  mortalidade: number;
  pesoMedioG?: number;
  observacoes?: string;
};

export type Lote = {
  id: string;
  numero: string;
  dataEntrada: string;
  quantidadeInicial: number;
  integradora: string;
  previsaoAbateDias: number;
  percentualLucro: number;
  precoKgVivo?: number;
  entries: DailyEntry[];
  encerrado?: boolean;
};

// ===== Energia =====
export type Medidor = {
  id: string;
  nome: string;
  codigoInstalacao: string;
  codigoRelogio: string;
  leituras: { data: string; valor: number }[];
};

// ===== Gado =====
export type Pasto = {
  id: string;
  nome: string;
  areaHa?: number;
  capacidade?: number;
  observacoes?: string;
};

export type Pesagem = { data: string; pesoKg: number; observacoes?: string };
export type EventoSanitario = {
  id: string;
  data: string;
  tipo: "vacina" | "vermifugo" | "medicamento" | "outro";
  produto: string;
  dose?: string;
  proximaData?: string;
  observacoes?: string;
};

export type Animal = {
  id: string;
  brinco: string;
  nome?: string;
  sexo: "macho" | "femea";
  raca?: string;
  categoria?: "bezerro" | "novilho" | "boi" | "vaca" | "novilha" | "touro";
  nascimento?: string;
  pesoEntradaKg?: number;
  dataEntrada: string;
  origem?: "nascido" | "comprado";
  precoCompra?: number;
  pastoId?: string;
  pesagens: Pesagem[];
  sanidade: EventoSanitario[];
  status: "ativo" | "vendido" | "morto" | "abatido";
  saidaData?: string;
  saidaMotivo?: string;
  precoVenda?: number;
  pesoVendaKg?: number;
  observacoes?: string;
};

// ===== Diário =====
export type DiarioFoto = { id: string; dataUrl: string; legenda?: string };
export type DiarioEntry = {
  id: string;
  data: string;
  titulo: string;
  categoria: "granja" | "gado" | "cerca" | "maquina" | "geral";
  texto: string;
  clima?: { temperatura?: number; condicao?: string; chuvaMm?: number };
  gps?: { lat: number; lon: number };
  fotos: DiarioFoto[];
};

// ===== Tarefas =====
export type Tarefa = {
  id: string;
  titulo: string;
  descricao?: string;
  vencimento?: string;
  prioridade: "baixa" | "media" | "alta";
  categoria: "granja" | "gado" | "cerca" | "maquina" | "geral";
  concluida: boolean;
  criadaEm: string;
};

// ===== Estoque =====
export type ItemEstoque = {
  id: string;
  nome: string;
  categoria: "racao" | "vacina" | "sal" | "remedio" | "insumo" | "outro";
  unidade: string;
  quantidade: number;
  minimo?: number;
  observacoes?: string;
  movimentacoes: { id: string; data: string; tipo: "entrada" | "saida"; quantidade: number; nota?: string }[];
};

// ===== Financeiro =====
export type Lancamento = {
  id: string;
  data: string;
  tipo: "receita" | "despesa";
  categoria: string;
  descricao: string;
  valor: number;
  modulo?: "granja" | "gado" | "energia" | "geral";
};
