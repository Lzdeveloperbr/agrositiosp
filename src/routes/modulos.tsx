import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { NAV_GROUPS, buscarModulos } from "@/lib/nav";

export const Route = createFileRoute("/modulos")({
  head: () => ({
    meta: [
      { title: "Módulos — Aviário Pro" },
      { name: "description", content: "Todas as ferramentas do Aviário Pro: operação, ração, sanidade e desempenho dos lotes." },
      { property: "og:title", content: "Módulos — Aviário Pro" },
      { property: "og:description", content: "Todas as ferramentas do Aviário Pro: operação, ração, sanidade e desempenho dos lotes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Modulos,
});

function Modulos() {
  const [q, setQ] = useState("");
  const busca = buscarModulos(q);
  const grupos = q ? [{ label: "Resultados", icon: Search, items: busca }] : NAV_GROUPS;

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="space-y-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Ferramentas</h1>
            <p className="text-sm text-muted-foreground mt-1">Ferramentas da granja organizadas por rotina.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar módulo…" className="pl-9 h-11" />
          </div>
        </header>

        {grupos.map((g) => (
          <section key={g.label} className="space-y-3">
            <div className="flex items-center gap-2">
              <g.icon className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">{g.label}</h2>
              <span className="text-xs text-muted-foreground/60 tabular-nums">{g.items.length}</span>
            </div>
            {g.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nada encontrado.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((it) => {
                  const Icon = it.icon;
                  return (
                    <Link
                      key={it.to}
                      to={it.to}
                      className="card-elevated group flex items-start gap-3 p-4 transition-all hover:border-primary/40 hover:-translate-y-0.5"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium truncate">{it.label}</span>
                        <span className="block text-xs text-muted-foreground leading-snug mt-0.5">{it.desc}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </div>
    </AppShell>
  );
}
