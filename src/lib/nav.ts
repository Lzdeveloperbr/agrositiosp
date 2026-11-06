// Fonte única de verdade da navegação do app (sidebar, menu mobile, busca e hub /modulos).
import {
  LayoutDashboard, Bird, FileText, BookOpen, ListChecks, Boxes, Wallet, Database,
  BellRing, Stethoscope, TrendingUp, Sparkles, ClipboardList, Wind, Truck,
  ClipboardCheck, Trophy, BarChart3, Syringe, History, Scale, MessagesSquare, PieChart,
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
    label: "Operação",
    icon: LayoutDashboard,
    items: [
      { to: "/", label: "Central", icon: LayoutDashboard, desc: "Lote ativo, alertas e rotina de hoje", tags: ["painel", "inicio"] },
      { to: "/granja", label: "Lotes", icon: Bird, desc: "Lotes, lançamento diário, mortalidade e peso", tags: ["frango", "lote", "aves"] },
      { to: "/checklist-granja", label: "Checklist diário", icon: ClipboardCheck, desc: "Rotina do galpão item a item", tags: ["rotina"] },
      { to: "/manejo", label: "Manejo do lote", icon: BookOpen, desc: "Água, cama, luz, temperatura e protocolo diário", tags: ["luz", "cama", "agua", "protocolo"] },
      { to: "/ambiencia", label: "Ambiência", icon: Wind, desc: "Temperatura, umidade, pressão e ventilação", tags: ["clima", "ventilacao"] },
      { to: "/pesagem-pro", label: "Pesagem", icon: Scale, desc: "Amostras, uniformidade, CV% e GPD", tags: ["peso", "balanca"] },
    ],
  },
  {
    label: "Ração e sanidade",
    icon: Boxes,
    items: [
      { to: "/silo", label: "Silo ao vivo", icon: Boxes, desc: "Saldo de ração, autonomia e pedido", tags: ["silo", "racao", "estoque"] },
      { to: "/entregas-racao", label: "Entregas de ração", icon: Truck, desc: "Cargas recebidas por lote", tags: ["racao", "carga"] },
      { to: "/estoque", label: "Estoque do lote", icon: Boxes, desc: "Ração e insumos do aviário", tags: ["insumo"] },
      { to: "/calendario-sanitario", label: "Calendário sanitário", icon: Syringe, desc: "Vacinas e medicações programadas", tags: ["vacina", "sanidade"] },
      { to: "/analise-aves", label: "Análise das aves", icon: Stethoscope, desc: "Diagnóstico por foto e sintomas", tags: ["doenca"] },
    ],
  },
  {
    label: "Desempenho",
    icon: TrendingUp,
    items: [
      { to: "/painel-analitico", label: "Painel analítico", icon: BarChart3, desc: "Gráficos de produção, pesagens, financeiro e estoque", tags: ["dashboard", "graficos", "analise"] },
      { to: "/excelencia-lote", label: "Excelência do lote", icon: Trophy, desc: "IEP, GPD e curva de peso vs. meta", tags: ["iep", "kpi"] },
      { to: "/ficha-lote", label: "Ficha do lote", icon: ClipboardList, desc: "Ficha técnica completa", tags: ["lote"] },
      { to: "/comparativo-lotes", label: "Comparativo", icon: BarChart3, desc: "Compare desempenho entre lotes", tags: ["comparar"] },
      { to: "/historico-lotes", label: "Histórico", icon: History, desc: "Lotes encerrados e médias", tags: ["benchmark"] },
      { to: "/indicadores", label: "Indicadores", icon: PieChart, desc: "Ranking e evolução dos lotes", tags: ["ranking"] },
      { to: "/custos", label: "Custos por lote", icon: TrendingUp, desc: "Custo, margem e projeção", tags: ["margem", "lucro"] },
      { to: "/financeiro-lote", label: "Resultado do lote", icon: Wallet, desc: "Custo por ave, custo/kg e lucro", tags: ["custo"] },
      { to: "/financeiro", label: "Lançamentos", icon: Wallet, desc: "Receitas e despesas da granja", tags: ["caixa"] },
      { to: "/relatorios", label: "Relatórios", icon: FileText, desc: "PDFs técnicos e fechamento", tags: ["pdf"] },
    ],
  },
  {
    label: "Equipe e sistema",
    icon: Sparkles,
    items: [
      { to: "/agro-ia", label: "Assistente IA", icon: Sparkles, desc: "Perguntas técnicas com os dados do lote", tags: ["ia"] },
      { to: "/automacoes", label: "Automação", icon: Sparkles, desc: "Regras da granja e AVI Smart", tags: ["regra", "smaai"] },
      { to: "/chat", label: "Chat da equipe", icon: MessagesSquare, desc: "Conversa em tempo real", tags: ["mensagem"] },
      { to: "/diario", label: "Diário do aviário", icon: BookOpen, desc: "Registros com fotos", tags: ["registro"] },
      { to: "/tarefas", label: "Tarefas", icon: ListChecks, desc: "Atividades por prioridade", tags: ["todo"] },
      { to: "/lembretes", label: "Lembretes", icon: BellRing, desc: "Avisos recorrentes", tags: ["alerta"] },
      { to: "/backup", label: "Backup", icon: Database, desc: "Exportar e importar dados", tags: ["exportar"] },
      { to: "/tutorial", label: "Tutorial do aplicativo", icon: BookOpen, desc: "Aprenda a usar cada módulo passo a passo", tags: ["ajuda", "guia", "como usar", "tutorial"] },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

const item = (to: string, short: string): NavItem => {
  const found = ALL_NAV_ITEMS.find((i) => i.to === to);
  if (!found) throw new Error(`Missing navigation item: ${to}`);
  return { ...found, short };
};
export const MOBILE_BOTTOM: NavItem[] = [
  item("/", "Central"),
  item("/granja", "Lotes"),
  item("/manejo", "Manejo"),
  item("/silo", "Silo"),
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
