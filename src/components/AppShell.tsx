import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LogOut, Menu, Search, Grid3X3, ChevronDown, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useFazenda } from "@/lib/cloud/fazenda";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChatNotifier } from "@/components/ChatNotifier";
import { NAV_GROUPS, MOBILE_BOTTOM, ALL_NAV_ITEMS, buscarModulos, type NavItem } from "@/lib/nav";
import logoUrl from "@/assets/logo-agrositio.png";

function NavLinkRow({ item, active, onClick, compact }: { item: NavItem; active: boolean; onClick?: () => void; compact?: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-3 pl-3 pr-3 rounded-md text-sm font-medium transition-all",
        compact ? "py-2" : "py-2.5",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm border border-primary/15"
          : "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/40",
      )}
    >
      {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary" />}
      <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function NavTree({ pathname, onNavigate, initialOpenAll }: { pathname: string; onNavigate?: () => void; initialOpenAll?: boolean }) {
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(to + "/"));
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const base: Record<string, boolean> = {};
    NAV_GROUPS.forEach((g) => {
      base[g.label] = initialOpenAll ? true : g.items.some((i) => isActive(i.to)) || g.label === "Dia a dia";
    });
    return base;
  });
  const [q, setQ] = useState("");
  const results = buscarModulos(q);

  return (
    <div className="space-y-3">
      <div className="relative px-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar módulo…"
          className="pl-9 h-9 bg-sidebar-accent/40 border-sidebar-border"
        />
      </div>

      {q ? (
        <div className="space-y-0.5">
          {results.length === 0 && <p className="px-3 py-6 text-sm text-muted-foreground text-center">Nada encontrado.</p>}
          {results.map((it) => (
            <NavLinkRow key={it.to} item={it} active={isActive(it.to)} onClick={onNavigate} compact />
          ))}
        </div>
      ) : (
        NAV_GROUPS.map((g) => {
          const open = openGroups[g.label];
          const GIcon = g.icon;
          return (
            <div key={g.label}>
              <button
                type="button"
                onClick={() => setOpenGroups((p) => ({ ...p, [g.label]: !p[g.label] }))}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 font-semibold hover:text-foreground transition-colors"
              >
                <GIcon className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">{g.label}</span>
                <span className="text-[10px] tabular-nums opacity-60">{g.items.length}</span>
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !open && "-rotate-90")} />
              </button>
              {open && (
                <div className="space-y-0.5 mt-0.5">
                  {g.items.map((it) => (
                    <NavLinkRow key={it.to} item={it} active={isActive(it.to)} onClick={onNavigate} compact />
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const list = useMemo(() => (q ? buscarModulos(q) : ALL_NAV_ITEMS.slice(0, 8)), [q]);

  useEffect(() => { if (!open) setQ(""); }, [open]);

  const go = (to: string) => {
    onOpenChange(false);
    navigate({ to });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && list[0]) go(list[0].to); }}
            placeholder="Buscar módulo, função ou atalho…"
            className="flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-2">
          {list.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nada encontrado.</p>}
          {list.map((it) => {
            const Icon = it.icon;
            return (
              <button
                key={it.to}
                onClick={() => go(it.to)}
                className="w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-accent/10 transition-colors"
              >
                <Icon className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium truncate">{it.label}</span>
                  <span className="block text-xs text-muted-foreground truncate">{it.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { fazendaNome, codigo, operador, sair } = useFazenda();
  const [open, setOpen] = useState(false);
  const [palette, setPalette] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(to + "/"));
  const atual = ALL_NAV_ITEMS.find((i) => i.to !== "/" && isActive(i.to));
  const titulo = atual?.label ?? (pathname.startsWith("/modulos") ? "Módulos" : (fazendaNome ?? "AgroSítio"));
  const subtitulo = titulo === fazendaNome ? (operador || codigo || "") : (fazendaNome ?? operador ?? codigo ?? "");

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <ChatNotifier />
      <CommandPalette open={palette} onOpenChange={setPalette} />

      <aside className="hidden md:flex md:w-64 flex-col bg-sidebar border-r border-sidebar-border sticky top-0 h-screen">
        <div className="p-4 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative shrink-0">
              <img src={logoUrl} alt="AgroSítio" width={40} height={40} className="h-10 w-10 object-contain relative" />
            </div>
            <div className="min-w-0">
               <div className="font-display text-lg font-extrabold leading-tight">
                Agro<span className="text-gradient">Sítio</span>
              </div>
              <div className="text-[11px] text-muted-foreground truncate">{fazendaNome ?? "Granja & Gado"}</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          <NavTree pathname={pathname} />
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-2">
          <button
            onClick={() => setPalette(true)}
            className="w-full flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/30 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Search className="h-3.5 w-3.5" /> Busca rápida
            <kbd className="ml-auto rounded border border-border px-1.5 py-0.5 text-[10px]">Ctrl K</kbd>
          </button>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex items-center gap-2">
               <div className="h-8 w-8 rounded-full grid place-items-center text-[11px] font-bold shrink-0 bg-primary text-primary-foreground">
                {(operador || "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">{operador || "—"}</div>
                <div className="text-[10px] text-muted-foreground truncate">{codigo}</div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={sair} aria-label="Sair da fazenda" className="h-8 w-8 shrink-0"><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </aside>

      <header className="md:hidden grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 border-b border-sidebar-border bg-sidebar/95 backdrop-blur-xl sticky top-0 z-30">
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
          <img src={logoUrl} alt="AgroSítio" width={36} height={36} className="h-9 w-9 object-contain shrink-0" />
          <div className="leading-tight min-w-0">
            <div className="font-display font-bold text-sm truncate tracking-tight">{titulo}</div>
            <div className="text-[10px] text-muted-foreground truncate">{subtitulo}</div>
          </div>
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" aria-label="Buscar" className="h-9 w-9" onClick={() => setPalette(true)}><Search className="h-5 w-5" /></Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu" className="h-9 w-9"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[88vw] sm:w-[380px] overflow-y-auto p-0 bg-sidebar">
              <SheetHeader className="p-5 border-b border-sidebar-border text-left">
                <SheetTitle className="font-display tracking-tight">{fazendaNome ?? "AgroSítio"}</SheetTitle>
                <p className="text-xs text-muted-foreground">{operador ? `${operador} · ` : ""}{codigo}</p>
              </SheetHeader>
              <nav className="p-3">
                <NavTree pathname={pathname} onNavigate={() => setOpen(false)} />
                <Button variant="outline" className="w-full mt-4" onClick={() => { setOpen(false); sair(); }}>
                  <LogOut className="h-4 w-4 mr-2" /> Sair da fazenda
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="flex-1 min-w-0 pb-28 md:pb-0">
        <div className="px-3 py-3 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">{children}</div>

        <nav aria-label="Navegação principal" className="md:hidden fixed bottom-2 left-2 right-2 z-40 grid grid-cols-5 rounded-lg bg-sidebar/95 backdrop-blur-xl border border-primary/15 shadow-2xl overflow-hidden">
          {MOBILE_BOTTOM.map((it) => {
            const active = isActive(it.to);
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-10 rounded-b bg-primary" />}
                <Icon className="h-5 w-5" />
                {it.short ?? it.label}
              </Link>
            );
          })}
          <Link
            to="/modulos"
            className={cn(
              "relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors",
              isActive("/modulos") ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {isActive("/modulos") && <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-10 rounded-b bg-primary" />}
            <Grid3X3 className="h-5 w-5" />
            Módulos
          </Link>
        </nav>
      </main>
    </div>
  );
}

export const __ALL_NAV_ITEMS = ALL_NAV_ITEMS;
void X;
