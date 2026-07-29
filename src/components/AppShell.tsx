import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Bird, Beef, Zap, FileText, BookOpen, ListChecks,
  Boxes, Wallet, Database, LogOut, Tractor, CloudRain, Bug, ShoppingCart, Menu, Sprout, BellRing,
  Stethoscope, TrendingUp, Sparkles, ClipboardList, Wind, Factory, Milk, Truck, ClipboardCheck, Trophy,
  BarChart3, Syringe, History, Ruler, Calculator, MapPin, Landmark, Scale,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useFazenda } from "@/lib/cloud/fazenda";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import logoUrl from "@/assets/logo-agrositio.png";

type Item = { to: string; label: string; icon: any };

const groups: { label: string; items: Item[] }[] = [
  {
    label: "Operação",
    items: [
      { to: "/", label: "Início", icon: LayoutDashboard },
      { to: "/agro-ia", label: "Agro IA", icon: Sparkles },
      { to: "/chat", label: "Chat da Equipe", icon: MessagesSquare },
      { to: "/modo-campo", label: "Modo Campo", icon: MapPin },
      { to: "/diario", label: "Diário", icon: BookOpen },
      { to: "/tarefas", label: "Tarefas", icon: ListChecks },
      { to: "/lembretes", label: "Lembretes", icon: BellRing },
      { to: "/quiz", label: "Quiz Diário", icon: ClipboardList },
    ],
  },
  {
    label: "Produção",
    items: [
      { to: "/granja", label: "Granja", icon: Bird },
      { to: "/pesagem-pro", label: "Pesagem Pro", icon: Scale },
      { to: "/checklist-granja", label: "Checklist Diário", icon: ClipboardCheck },
      { to: "/excelencia-lote", label: "Excelência do Lote", icon: Trophy },
      { to: "/comparativo-lotes", label: "Comparativo Lotes", icon: BarChart3 },
      { to: "/historico-lotes", label: "Histórico & Benchmark", icon: History },
      { to: "/calendario-sanitario", label: "Calendário Sanitário", icon: Syringe },



      { to: "/analise-aves", label: "Análise IA Aves", icon: Stethoscope },
      { to: "/manejo", label: "Manejo Frango", icon: BookOpen },
      { to: "/ficha-lote", label: "Ficha do Lote", icon: ClipboardList },
      { to: "/ambiencia", label: "Ambiência Aviário", icon: Wind },
      { to: "/gado", label: "Gado", icon: Beef },
      { to: "/gado-pro", label: "Gado Pro", icon: TrendingUp },
      { to: "/leite", label: "Leite", icon: Milk },
      { to: "/veterinario", label: "Veterinário", icon: Stethoscope },
      { to: "/racao", label: "Fábrica Ração", icon: Factory },
      { to: "/entregas-racao", label: "Entregas Ração", icon: Truck },
      { to: "/guia-cultivo", label: "Guia de Cultivo", icon: Sprout },
      { to: "/plantios", label: "Plantios", icon: Sprout },
      { to: "/chuvas", label: "Chuvas", icon: CloudRain },
      { to: "/monitoramento", label: "Monitoramento", icon: Bug },
    ],
  },
  {
    label: "Recursos",
    items: [
      { to: "/estoque", label: "Estoque", icon: Boxes },
      { to: "/compras", label: "Compras", icon: ShoppingCart },
      { to: "/maquinas", label: "Máquinas", icon: Tractor },
      { to: "/energia", label: "Energia", icon: Zap },
    ],
  },
  {
    label: "Gestão",
    items: [
      { to: "/financeiro", label: "Finanças", icon: Wallet },
      { to: "/mercado", label: "Mercado Agro", icon: BarChart3 },
      { to: "/custos", label: "Custos por Lote", icon: TrendingUp },
      { to: "/medir-area", label: "Medir Área (satélite)", icon: Ruler },
      { to: "/calculadora-agro", label: "Calculadora Agro", icon: Calculator },
      { to: "/automacoes", label: "Automações", icon: Sparkles },
      { to: "/integracoes-gov", label: "Integrações Gov", icon: Landmark },
      { to: "/relatorios", label: "Relatórios", icon: FileText },
      { to: "/backup", label: "Backup", icon: Database },
    ],
  },
];

const allItems: Item[] = groups.flatMap((g) => g.items);
const mobileBottom: Item[] = [
  { to: "/", label: "Início", icon: LayoutDashboard },
  { to: "/granja", label: "Granja", icon: Bird },
  { to: "/gado", label: "Gado", icon: Beef },
  { to: "/diario", label: "Diário", icon: BookOpen },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { fazendaNome, codigo, operador, sair } = useFazenda();
  const [open, setOpen] = useState(false);

  const isActive = (to: string) => pathname === to || (to !== "/" && pathname.startsWith(to));

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="hidden md:flex md:w-64 flex-col bg-sidebar/95 backdrop-blur-xl border-r border-sidebar-border sticky top-0 h-screen">
        <div className="p-5 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-xl blur-md opacity-40 group-hover:opacity-70 transition" style={{ background: "var(--gradient-primary)" }} />
              <img src={logoUrl} alt="AgroSítio" width={40} height={40} className="h-10 w-10 object-contain relative" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-lg font-bold leading-tight tracking-tight">
                Agro<span className="text-gradient">Sítio</span>
              </div>
              <div className="text-[11px] text-muted-foreground truncate">{fazendaNome ?? "Granja & Gado"}</div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-5 overflow-y-auto">
          {groups.map((g) => (
            <div key={g.label}>
              <div className="px-3 pb-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60 font-semibold">{g.label}</div>
              <div className="space-y-0.5">
                {g.items.map((it) => {
                  const active = isActive(it.to);
                  const Icon = it.icon;
                  return (
                    <Link
                      key={it.to}
                      to={it.to}
                      className={cn(
                        "relative flex items-center gap-3 pl-3 pr-3 py-2 rounded-lg text-sm font-medium transition-all",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                          : "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/40",
                      )}
                    >
                      {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary" />}
                      <Icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-primary" : "")} />
                      <span className="truncate">{it.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2">
            <div className="h-8 w-8 rounded-full grid place-items-center text-[11px] font-bold shrink-0" style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}>
              {(operador || "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium truncate">{operador || "—"}</div>
              <div className="text-[10px] text-muted-foreground truncate">{codigo} · v1.2</div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={sair} aria-label="Sair da fazenda" className="h-8 w-8 shrink-0"><LogOut className="h-4 w-4" /></Button>
        </div>
      </aside>

      <header className="md:hidden grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 border-b border-border bg-sidebar/85 backdrop-blur-xl sticky top-0 z-30">
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
          <img src={logoUrl} alt="AgroSítio" width={36} height={36} className="h-9 w-9 object-contain shrink-0" />
          <div className="leading-tight min-w-0">
            <div className="font-display font-bold text-sm truncate tracking-tight">{fazendaNome ?? "AgroSítio"}</div>
            <div className="text-[10px] text-muted-foreground truncate">{operador || codigo}</div>
          </div>
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu" className="h-9 w-9"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] sm:w-[360px] overflow-y-auto p-0 bg-sidebar">
              <SheetHeader className="p-5 border-b border-sidebar-border text-left">
                <SheetTitle className="font-display tracking-tight">{fazendaNome ?? "AgroSítio"}</SheetTitle>
                <p className="text-xs text-muted-foreground">{operador ? `${operador} · ` : ""}{codigo}</p>
              </SheetHeader>
              <nav className="p-3 space-y-5">
                {groups.map((g) => (
                  <div key={g.label}>
                    <div className="px-3 pb-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60 font-semibold">{g.label}</div>
                    <div className="space-y-0.5">
                      {g.items.map((it) => {
                        const active = isActive(it.to);
                        const Icon = it.icon;
                        return (
                          <Link
                            key={it.to}
                            to={it.to}
                            onClick={() => setOpen(false)}
                            className={cn(
                              "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                              active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50",
                            )}
                          >
                            {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary" />}
                            <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "")} />
                            <span className="truncate">{it.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full mt-2" onClick={() => { setOpen(false); sair(); }}>
                  <LogOut className="h-4 w-4 mr-2" /> Sair da fazenda
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="flex-1 min-w-0 pb-28 md:pb-0">
        <div className="px-3 py-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">{children}</div>

        <nav aria-label="Navegação principal" className="md:hidden fixed bottom-3 left-3 right-3 z-40 grid grid-cols-5 rounded-2xl bg-sidebar/85 backdrop-blur-xl border border-sidebar-border shadow-2xl overflow-hidden">
          {mobileBottom.map((it) => {
            const active = isActive(it.to);
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-b bg-primary" />}
                <Icon className="h-5 w-5" />
                {it.label}
              </Link>
            );
          })}
          <button
            onClick={() => setOpen(true)}
            className="flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
            Mais
          </button>
        </nav>
      </main>
    </div>
  );
}

export const __ALL_NAV_ITEMS = allItems;
