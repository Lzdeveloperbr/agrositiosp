import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Bird, Beef, Zap, FileText, Sprout, BookOpen, ListChecks, Boxes, Wallet, Database } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Início", icon: LayoutDashboard },
  { to: "/granja", label: "Granja", icon: Bird },
  { to: "/gado", label: "Gado", icon: Beef },
  { to: "/diario", label: "Diário", icon: BookOpen },
  { to: "/tarefas", label: "Tarefas", icon: ListChecks },
  { to: "/estoque", label: "Estoque", icon: Boxes },
  { to: "/financeiro", label: "Finanças", icon: Wallet },
  { to: "/energia", label: "Energia", icon: Zap },
  { to: "/relatorios", label: "Relatórios", icon: FileText },
  { to: "/backup", label: "Backup", icon: Database },
] as const;

const mobileItems = items.slice(0, 5);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

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
              <div className="text-xs text-muted-foreground">Granja & Gado</div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map((it) => {
            const active = pathname === it.to || (it.to !== "/" && pathname.startsWith(it.to));
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
        </nav>
        <div className="p-3 text-[10px] text-muted-foreground border-t border-sidebar-border">v1.1 · offline</div>
      </aside>

      <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-sidebar">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
            <Sprout className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold">AgroSítio</span>
        </Link>
        <Link to="/relatorios" className="text-xs text-muted-foreground">Relatórios</Link>
      </header>

      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">{children}</div>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 bg-sidebar border-t border-sidebar-border">
          {mobileItems.map((it) => {
            const active = pathname === it.to || (it.to !== "/" && pathname.startsWith(it.to));
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
        </nav>
      </main>
    </div>
  );
}
