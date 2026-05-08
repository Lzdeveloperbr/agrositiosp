import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Bird, Beef, Zap, FileText, Sprout, BookOpen, ListChecks,
  Boxes, Wallet, Database, LogOut, Tractor, CloudRain, Bug, ShoppingCart, Menu,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useFazenda } from "@/lib/cloud/fazenda";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type Item = { to: string; label: string; icon: any };

const groups: { label: string; items: Item[] }[] = [
  {
    label: "Operação",
    items: [
      { to: "/", label: "Início", icon: LayoutDashboard },
      { to: "/diario", label: "Diário", icon: BookOpen },
      { to: "/tarefas", label: "Tarefas", icon: ListChecks },
    ],
  },
  {
    label: "Produção",
    items: [
      { to: "/granja", label: "Granja", icon: Bird },
      { to: "/gado", label: "Gado", icon: Beef },
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
      <aside className="hidden md:flex md:w-60 flex-col bg-sidebar border-r border-sidebar-border">
        <div className="p-5 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
              <Sprout className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-display text-lg font-bold leading-tight">AgroSítio</div>
              <div className="text-xs text-muted-foreground">{fazendaNome ?? "Granja & Gado"}</div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {groups.map((g) => (
            <div key={g.label}>
              <div className="px-3 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">{g.label}</div>
              <div className="space-y-1">
                {g.items.map((it) => {
                  const active = isActive(it.to);
                  const Icon = it.icon;
                  return (
                    <Link
                      key={it.to}
                      to={it.to}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {it.label}
                      {active && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border flex items-center justify-between">
          <div className="text-[10px] text-muted-foreground truncate">
            <div className="truncate">{operador || "—"}</div>
            <div className="truncate">{codigo} · v1.2</div>
          </div>
          <Button variant="ghost" size="icon" onClick={sair} className="h-8 w-8 shrink-0"><LogOut className="h-4 w-4" /></Button>
        </div>
      </aside>

      <header className="md:hidden flex items-center justify-between p-3 border-b border-border bg-sidebar sticky top-0 z-30">
        <Link to="/" className="flex items-center gap-2 min-w-0">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--gradient-primary)" }}>
            <Sprout className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="leading-tight min-w-0">
            <div className="font-display font-bold text-sm truncate">{fazendaNome ?? "AgroSítio"}</div>
            <div className="text-[10px] text-muted-foreground truncate">{operador || codigo}</div>
          </div>
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] sm:w-[360px] overflow-y-auto p-0 bg-sidebar">
              <SheetHeader className="p-5 border-b border-sidebar-border text-left">
                <SheetTitle className="font-display">{fazendaNome ?? "AgroSítio"}</SheetTitle>
                <p className="text-xs text-muted-foreground">{operador ? `${operador} · ` : ""}{codigo}</p>
              </SheetHeader>
              <nav className="p-3 space-y-4">
                {groups.map((g) => (
                  <div key={g.label}>
                    <div className="px-3 pb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">{g.label}</div>
                    <div className="space-y-1">
                      {g.items.map((it) => {
                        const active = isActive(it.to);
                        const Icon = it.icon;
                        return (
                          <Link
                            key={it.to}
                            to={it.to}
                            onClick={() => setOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium",
                              active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50",
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {it.label}
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

      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">{children}</div>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 bg-sidebar border-t border-sidebar-border">
          {mobileBottom.map((it) => {
            const active = isActive(it.to);
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10px]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {it.label}
              </Link>
            );
          })}
          <button
            onClick={() => setOpen(true)}
            className="flex flex-col items-center gap-1 py-2.5 text-[10px] text-muted-foreground"
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
