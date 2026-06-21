// ===== Granja =====
export type DailyEntry = {
  date: string;
  mortalidade: number;
  eliminados?: number;
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
  aplicacoes?: import("./calendarioSanitario").AplicacaoSanitaria[];
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

export type EventoReproducao = {
  id: string;
  data: string;
  tipo: "cobertura" | "ia" | "diagnostico" | "parto" | "aborto";
  resultado?: "prenhe" | "vazia" | "macho" | "femea" | "perda";
  touroOuSemen?: string;
  previsaoParto?: string;
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
  reproducao: EventoReproducao[];
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

// ===== Financeiro (com contas a pagar/receber) =====
export type Lancamento = {
  id: string;
  data: string;
  tipo: "receita" | "despesa";
  categoria: string;
  descricao: string;
  valor: number;
  modulo?: "granja" | "gado" | "energia" | "maquina" | "geral";
  vencimento?: string;
  status: "pago" | "pendente" | "atrasado";
  dataPagamento?: string;
};

// ===== Máquinas =====
export type Abastecimento = {
  id: string;
  data: string;
  litros: number;
  precoLitro?: number;
  total?: number;
  horimetro?: number;
  posto?: string;
  combustivel: "diesel" | "gasolina" | "etanol" | "outro";
  observacoes?: string;
};
export type Manutencao = {
  id: string;
  data: string;
  tipo: "preventiva" | "corretiva" | "troca_oleo" | "filtro" | "outro";
  descricao: string;
  custo?: number;
  horimetro?: number;
  proximaData?: string;
  proximoHorimetro?: number;
  observacoes?: string;
};
export type Maquina = {
  id: string;
  nome: string;
  tipo: "trator" | "caminhao" | "carro" | "moto" | "implemento" | "gerador" | "outro";
  marca?: string;
  modelo?: string;
  ano?: number;
  placa?: string;
  horimetro: number;
  observacoes?: string;
  abastecimentos: Abastecimento[];
  manutencoes: Manutencao[];
};

// ===== Pluviometria =====
export type Chuva = {
  id: string;
  data: string;
  mm: number;
  local?: string;
  observacoes?: string;
};

// ===== MIP / Monitoramento =====
export type Monitoramento = {
  id: string;
  data: string;
  modulo: "gado" | "granja" | "pasto" | "geral";
  alvo: string; // praga / doença / sintoma
  severidade: "baixa" | "media" | "alta";
  acao?: string;
  produto?: string;
  dose?: string;
  local?: string;
  gps?: { lat: number; lon: number };
  fotos: DiarioFoto[];
  observacoes?: string;
};

// ===== Compras =====
export type CompraItem = { id: string; nome: string; quantidade: number; unidade: string; precoUnit?: number };
export type Compra = {
  id: string;
  data: string;
  fornecedor?: string;
  status: "solicitado" | "aprovado" | "pedido" | "recebido" | "cancelado";
  solicitante?: string;
  itens: CompraItem[];
  total: number;
  dataPedido?: string;
  dataRecebimento?: string;
  observacoes?: string;
};
