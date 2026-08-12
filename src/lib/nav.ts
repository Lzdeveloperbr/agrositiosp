// Fonte única de verdade da navegação do app (sidebar, menu mobile, busca e hub /modulos).
import {
  LayoutDashboard, Bird, Beef, Zap, FileText, BookOpen, ListChecks,
  Boxes, Wallet, Database, Tractor, CloudRain, Bug, ShoppingCart, Sprout, BellRing,
  Stethoscope, TrendingUp, Sparkles, ClipboardList, Wind, Factory, Milk, Truck,
  ClipboardCheck, Trophy, BarChart3, Syringe, History, Ruler, Calculator, MapPin,
  Landmark, Scale, MessagesSquare, Store, Target, Cloud,
} from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  icon: any;
  desc: string;
  short?: string;
  tags?: string[];
};

export type NavGroup = { label: string; icon: any; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Dia a dia",
    icon: LayoutDashboard,
    items: [
      { to: "/", label: "Início", icon: LayoutDashboard, desc: "Painel geral com clima, alertas e indicadores", tags: ["painel", "dashboard", "home"] },
      { to: "/agro-ia", label: "Agro IA", icon: Sparkles, desc: "Assistente técnico com os dados da sua fazenda", tags: ["ia", "chat", "inteligencia"] },
      { to: "/chat", label: "Chat da Equipe", icon: MessagesSquare, desc: "Conversa em tempo real com todo o time", tags: ["mensagem", "equipe"] },
      { to: "/modo-campo", label: "Modo Campo", icon: MapPin, desc: "Foto + GPS, leitor de brinco e ditado por voz", tags: ["mobile", "gps", "campo"] },
      { to: "/diario", label: "Diário de Campo", icon: BookOpen, desc: "Registros diários com fotos, clima e localização", tags: ["registro", "foto"] },
      { to: "/prioridades", label: "Prioridades do Mês", icon: Target, desc: "Plano mensal do sítio com metas, prazos, responsáveis e custo", tags: ["plano", "mes", "meta", "prioridade"] },
      { to: "/tarefas", label: "Tarefas", icon: ListChecks, desc: "Lista de atividades por prioridade e categoria", tags: ["todo", "atividade"] },
      { to: "/lembretes", label: "Lembretes", icon: BellRing, desc: "Avisos recorrentes com notificação", tags: ["alerta", "notificacao"] },
      { to: "/quiz", label: "Quiz Diário", icon: ClipboardList, desc: "Treinamento rápido da equipe", tags: ["treino", "curso"] },
    ],
  },
  {
    label: "Granja (Aves)",
    icon: Bird,
    items: [
      { to: "/granja", label: "Granja", icon: Bird, desc: "Lotes de frango, mortalidade e desempenho", tags: ["frango", "lote", "aves"] },
      { to: "/pesagem-pro", label: "Pesagem Pro", icon: Scale, desc: "Pesagens com uniformidade, CV% e GPD", tags: ["peso", "balanca", "uniformidade"] },
      { to: "/checklist-granja", label: "Checklist Diário", icon: ClipboardCheck, desc: "Rotina diária do galpão item a item", tags: ["rotina", "conferencia"] },
      { to: "/excelencia-lote", label: "Excelência do Lote", icon: Trophy, desc: "IEP, GPD e curva de peso vs. meta", tags: ["iep", "kpi", "meta"] },
      { to: "/manejo", label: "Manejo do Frango", icon: BookOpen, desc: "Água, cama, luz, anti-calo e vazio sanitário", tags: ["luz", "cama", "agua", "protocolo"] },
      { to: "/ambiencia", label: "Ambiência do Aviário", icon: Wind, desc: "Temperatura, umidade e ventilação por idade", tags: ["clima", "ventilacao", "temperatura"] },
      { to: "/calendario-sanitario", label: "Calendário Sanitário", icon: Syringe, desc: "Vacinas e medicações programadas", tags: ["vacina", "sanidade"] },
      { to: "/analise-aves", label: "Análise IA das Aves", icon: Stethoscope, desc: "Diagnóstico por foto e sintomas", tags: ["doenca", "diagnostico"] },
      { to: "/ficha-lote", label: "Ficha do Lote", icon: ClipboardList, desc: "Ficha técnica completa do lote atual", tags: ["relatorio", "lote"] },
      { to: "/comparativo-lotes", label: "Comparativo de Lotes", icon: BarChart3, desc: "Compare desempenho entre lotes", tags: ["comparar", "grafico"] },
      { to: "/historico-lotes", label: "Histórico & Benchmark", icon: History, desc: "Todos os lotes encerrados e médias", tags: ["historico", "benchmark"] },
      { to: "/entregas-racao", label: "Entregas de Ração", icon: Truck, desc: "Controle de cargas, viagens e consumo", tags: ["racao", "carga", "caminhao"] },
    ],
  },
  {
    label: "Gado & Leite",
    icon: Beef,
    items: [
      { to: "/gado", label: "Rebanho", icon: Beef, desc: "Cadastro, categorias e movimentação do rebanho", tags: ["boi", "vaca", "gedave"] },
      { to: "/gado-pro", label: "Gado Pro", icon: TrendingUp, desc: "GMD, reprodução e lotação de pasto", tags: ["gmd", "reproducao", "pasto"] },
      { to: "/leite", label: "Gado de Leite", icon: Milk, desc: "Rebanho leiteiro, controle leiteiro, lactações e reprodução", tags: ["ordenha", "litros", "vaca", "leite"] },
      { to: "/engorda", label: "Gado de Engorda", icon: Scale, desc: "Lotes de engorda com GMD, arrobas e lucro por cabeça", tags: ["boi", "gmd", "arroba", "confinamento"] },
      { to: "/veterinario", label: "Veterinário", icon: Stethoscope, desc: "Atendimentos, tratamentos e carências", tags: ["saude", "medicamento"] },
      { to: "/racao", label: "Fábrica de Ração", icon: Factory, desc: "Fórmulas e custo por tonelada", tags: ["formula", "nutricao"] },
    ],
  },
  {
    label: "Lavoura & Clima",
    icon: Sprout,
    items: [
      { to: "/plantios", label: "Plantios", icon: Sprout, desc: "Áreas plantadas, tratos e colheita", tags: ["safra", "cultura"] },
      { to: "/guia-cultivo", label: "Guia de Cultivo", icon: BookOpen, desc: "Manual por cultura com adubação calculada", tags: ["adubo", "npk"] },
      { to: "/monitoramento", label: "Monitoramento", icon: Bug, desc: "Pragas, doenças e daninhas com foto e GPS", tags: ["praga", "doenca"] },
      { to: "/chuvas", label: "Chuvas", icon: CloudRain, desc: "Pluviômetro com histórico mensal", tags: ["pluviometro", "mm"] },
      { to: "/medir-area", label: "Medir Área (satélite)", icon: Ruler, desc: "Hectares e alqueires desenhando no mapa", tags: ["hectare", "alqueire", "mapa"] },
    ],
  },
  {
    label: "Recursos",
    icon: Boxes,
    items: [
      { to: "/estoque", label: "Estoque", icon: Boxes, desc: "Insumos e ração com alerta de mínimo", tags: ["insumo", "almoxarifado"] },
      { to: "/compras", label: "Compras", icon: ShoppingCart, desc: "Pedidos, cotações e recebimentos", tags: ["pedido", "cotacao"] },
      { to: "/fornecedores", label: "Fornecedores", icon: Store, desc: "Mapa de fornecedores com rotas e contatos", tags: ["mapa", "contato"] },
      { to: "/maquinas", label: "Máquinas", icon: Tractor, desc: "Abastecimentos, manutenções e horímetro", tags: ["trator", "manutencao"] },
      { to: "/energia", label: "Energia", icon: Zap, desc: "Leitura dos relógios e consumo em kWh", tags: ["luz", "kwh", "relogio"] },
    ],
  },
  {
    label: "Gestão",
    icon: Wallet,
    items: [
      { to: "/financeiro", label: "Finanças", icon: Wallet, desc: "Receitas, despesas e contas a pagar", tags: ["dinheiro", "caixa"] },
      { to: "/custos", label: "Custos por Lote", icon: TrendingUp, desc: "Rateio de custo e margem por lote", tags: ["margem", "lucro"] },
      { to: "/financeiro-lote", label: "Painel Financeiro do Lote", icon: Wallet, desc: "Custo por ave, custo/kg, participação e lucro projetado", tags: ["custo", "ave", "lucro", "participacao"] },
      { to: "/mercado", label: "Mercado Agro", icon: BarChart3, desc: "Cotações e notícias do agronegócio", tags: ["cotacao", "boi", "soja"] },
      { to: "/relatorios", label: "Relatórios", icon: FileText, desc: "PDFs técnicos e fechamento de lote", tags: ["pdf", "impressao"] },
      { to: "/calculadora-agro", label: "Calculadora Agro", icon: Calculator, desc: "NPK, calagem, vazão e logística", tags: ["calculo", "conta"] },
      { to: "/automacoes", label: "Automações", icon: Sparkles, desc: "Regras automáticas e gatilhos", tags: ["regra", "gatilho"] },
      { to: "/integracoes-gov", label: "Integrações Gov", icon: Landmark, desc: "CNPJ, CEP, CAR, INCRA e SISBOV", tags: ["governo", "cnpj", "car"] },
      { to: "/onedrive", label: "OneDrive + IA", icon: Cloud, desc: "IA lê planilhas e PDFs do OneDrive e atualiza os módulos sozinha", tags: ["onedrive", "importar", "excel", "pdf", "ia"] },
      { to: "/backup", label: "Backup & Dados", icon: Database, desc: "Exportar, importar e limpar dados", tags: ["exportar", "importar"] },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export const MOBILE_BOTTOM: NavItem[] = [
  { ...ALL_NAV_ITEMS[0]!, short: "Início" },
  { ...NAV_GROUPS[1]!.items[0]!, short: "Granja" },
  { ...NAV_GROUPS[2]!.items[0]!, short: "Gado" },
  { ...ALL_NAV_ITEMS.find((i) => i.to === "/chat")!, short: "Chat" },
];

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function buscarModulos(q: string): NavItem[] {
  const t = norm(q);
  if (!t) return [];
  return ALL_NAV_ITEMS.filter((i) =>
    norm(i.label).includes(t) || norm(i.desc).includes(t) || (i.tags ?? []).some((tag) => norm(tag).includes(t)),
  );
}
