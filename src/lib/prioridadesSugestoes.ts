// Sugestões profissionais de prioridades por mês (calendário agropecuário do Sudeste).
export type Sugestao = { titulo: string; descricao: string; categoria: string; prioridade: "alta" | "media" | "baixa" };

export const CATEGORIAS = ["granja", "gado", "lavoura", "estrutura", "financeiro", "maquinas", "equipe", "geral"] as const;
export type CategoriaPrioridade = (typeof CATEGORIAS)[number];

export const CATEGORIA_LABEL: Record<string, string> = {
  granja: "Granja",
  gado: "Gado",
  lavoura: "Lavoura",
  estrutura: "Estrutura",
  financeiro: "Financeiro",
  maquinas: "Máquinas",
  equipe: "Equipe",
  geral: "Geral",
};

const BASE: Sugestao[] = [
  { titulo: "Fechamento financeiro do mês", descricao: "Conferir receitas, despesas e contas em aberto.", categoria: "financeiro", prioridade: "alta" },
  { titulo: "Leitura dos relógios de energia", descricao: "Registrar as leituras no dia 30 e comparar consumo.", categoria: "estrutura", prioridade: "media" },
  { titulo: "Inventário de estoque", descricao: "Contagem física de ração, medicamentos e insumos.", categoria: "estrutura", prioridade: "media" },
];

const POR_MES: Record<number, Sugestao[]> = {
  1: [
    { titulo: "Controle de erosão e drenagem", descricao: "Pico de chuvas: revisar curvas de nível, bueiros e carreadores.", categoria: "estrutura", prioridade: "alta" },
    { titulo: "Manejo antimosca e umidade da cama", descricao: "Verão úmido exige cama seca e controle sanitário reforçado.", categoria: "granja", prioridade: "alta" },
    { titulo: "Vermifugação estratégica do rebanho", descricao: "Alta infestação parasitária no período chuvoso.", categoria: "gado", prioridade: "alta" },
  ],
  2: [
    { titulo: "Manutenção de cercas e porteiras", descricao: "Reparos após período de chuva forte.", categoria: "estrutura", prioridade: "media" },
    { titulo: "Avaliação de pastagem (pico de produção)", descricao: "Ajustar lotação e vedar piquetes para o inverno.", categoria: "gado", prioridade: "alta" },
  ],
  3: [
    { titulo: "Vedação de pastos para feno/silagem", descricao: "Garantir reserva de volumoso para a seca.", categoria: "gado", prioridade: "alta" },
    { titulo: "Revisão de ventilação e nebulização", descricao: "Fim do calor intenso: limpeza e teste dos exaustores.", categoria: "granja", prioridade: "media" },
  ],
  4: [
    { titulo: "Preparo para a seca", descricao: "Estoque de volumoso, sal mineral e reserva de água.", categoria: "gado", prioridade: "alta" },
    { titulo: "Vacinação de aftosa (quando aplicável)", descricao: "Conferir calendário oficial e atualizar GTA/SISBOV.", categoria: "gado", prioridade: "alta" },
  ],
  5: [
    { titulo: "Vedação de cortinas e aquecimento", descricao: "Preparar galpão para noites frias: cortina, forro e campânulas.", categoria: "granja", prioridade: "alta" },
    { titulo: "Manutenção preventiva de máquinas", descricao: "Troca de óleo, filtros e revisão antes da entressafra.", categoria: "maquinas", prioridade: "media" },
  ],
  6: [
    { titulo: "Suplementação proteica do rebanho", descricao: "Pasto seco: ajustar proteinado e monitorar escore corporal.", categoria: "gado", prioridade: "alta" },
    { titulo: "Controle de temperatura noturna no galpão", descricao: "Registrar mínimas e ajustar aquecimento por idade.", categoria: "granja", prioridade: "alta" },
  ],
  7: [
    { titulo: "Aceiros e prevenção de incêndio", descricao: "Roçar e limpar aceiros antes do pico de seca.", categoria: "estrutura", prioridade: "alta" },
    { titulo: "Revisão de poços, bombas e caixas d'água", descricao: "Garantir vazão e limpeza dos reservatórios.", categoria: "estrutura", prioridade: "alta" },
  ],
  8: [
    { titulo: "Planejamento da safra e compra de insumos", descricao: "Cotar sementes, adubo e defensivos com antecedência.", categoria: "lavoura", prioridade: "alta" },
    { titulo: "Análise de solo e calagem", descricao: "Coletar amostras e aplicar calcário com antecedência.", categoria: "lavoura", prioridade: "alta" },
  ],
  9: [
    { titulo: "Preparo de área e plantio das águas", descricao: "Organizar máquinas, sementes e cronograma de plantio.", categoria: "lavoura", prioridade: "alta" },
    { titulo: "Vazio sanitário e desinfecção do galpão", descricao: "Cumprir protocolo completo antes do próximo lote.", categoria: "granja", prioridade: "alta" },
  ],
  10: [
    { titulo: "Adubação de cobertura e monitoramento de pragas", descricao: "Rondas semanais de MIP com registro fotográfico.", categoria: "lavoura", prioridade: "alta" },
    { titulo: "Recuperação de pastagem", descricao: "Adubar e semear com o início das chuvas.", categoria: "gado", prioridade: "media" },
  ],
  11: [
    { titulo: "Estação de monta", descricao: "Programar IA/monta, avaliar touros e escore das matrizes.", categoria: "gado", prioridade: "alta" },
    { titulo: "Revisão elétrica e para-raios", descricao: "Período de tempestades: proteger equipamentos do galpão.", categoria: "estrutura", prioridade: "alta" },
  ],
  12: [
    { titulo: "Balanço anual e planejamento do ano", descricao: "Consolidar custos, lucro por módulo e metas do próximo ano.", categoria: "financeiro", prioridade: "alta" },
    { titulo: "Férias/escala da equipe", descricao: "Garantir cobertura do plantão da granja nas festas.", categoria: "equipe", prioridade: "media" },
  ],
};

export function sugestoesDoMes(mes: string): Sugestao[] {
  const m = Number(mes.slice(5, 7));
  return [...(POR_MES[m] ?? []), ...BASE];
}

export function mesLabel(mes: string): string {
  const [a, m] = mes.split("-");
  const d = new Date(Number(a), Number(m) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function mesAtual(): string {
  return new Date().toISOString().slice(0, 7);
}

export function deslocarMes(mes: string, delta: number): string {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(a!, (m! - 1) + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
