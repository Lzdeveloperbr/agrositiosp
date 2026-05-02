import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Bird, Zap, FileText, Sprout } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/granja", label: "Granja", icon: Bird },
  { to: "/energia", label: "Energia", icon: Zap },
  { to: "/relatorios", label: "Relatórios", icon: FileText },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:w-64 flex-col bg-sidebar border-r border-sidebar-border">
        <div className="p-6 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
              <Sprout className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-display text-lg font-bold leading-tight">AgroSítio</div>
              <div className="text-xs text-muted-foreground">Bello Alimentos</div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {items.map((it) => {
            const active = pathname === it.to;
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
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
        <div className="p-4 text-xs text-muted-foreground border-t border-sidebar-border">
          v1.0 · 28.000 aves
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-sidebar">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
            <Sprout className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold">AgroSítio</span>
        </Link>
      </header>

      <main className="flex-1 min-w-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">{children}</div>

        {/* Mobile bottom nav */}
        <nav className="md:hidden sticky bottom-0 grid grid-cols-4 bg-sidebar border-t border-sidebar-border">
          {items.map((it) => {
            const active = pathname === it.to;
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 text-xs",
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
