import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, RefreshCw, MapPin } from "lucide-react";

export const Route = createFileRoute("/mercado")({
  head: () => ({
    meta: [
      { title: "Mercado Agro — AgroSítio" },
      { name: "description", content: "Cotações agropecuárias em tempo real." },
    ],
  }),
  component: MercadoPage,
});

type ApiResp = {
  boi_gordo_cepea_sp?: number;
  boi_gordo_praca?: string;
  vaca_gorda?: number;
  soja?: number;
  milho?: number;
  bezerro_ms?: number;
  atualizado?: string;
  fonte?: string;
};

type Item = { nome: string; valor: number; unidade: string; praca?: string };

function montar(d: ApiResp): Item[] {
  const out: Item[] = [];
  if (d.boi_gordo_cepea_sp) out.push({ nome: "Boi Gordo", valor: d.boi_gordo_cepea_sp, unidade: "@", praca: d.boi_gordo_praca });
  if (d.vaca_gorda) out.push({ nome: "Vaca Gorda", valor: d.vaca_gorda, unidade: "@" });
  if (d.bezerro_ms) out.push({ nome: "Bezerro", valor: d.bezerro_ms, unidade: "cab", praca: "MS" });
  if (d.soja) out.push({ nome: "Soja", valor: d.soja, unidade: "sc 60kg" });
  if (d.milho) out.push({ nome: "Milho", valor: d.milho, unidade: "sc 60kg" });
  return out;
}

function MercadoPage() {
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErro(null);
    try {
      const r = await fetch("https://agrodocai.com.br/api/v1/cotacao", { cache: "no-store" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      setData(await r.json());
    } catch (e: any) {
      setErro(e?.message ?? "Falha ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30 * 60 * 1000); // 30 min
    return () => clearInterval(t);
  }, []);

  const itens = data ? montar(data) : [];

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Inteligência de mercado</p>
            <h1 className="text-2xl md:text-3xl font-display font-bold mt-1">Mercado Agro</h1>
            <p className="text-sm text-muted-foreground">
              Cotações automáticas {data?.atualizado && <>· atualizado {new Date(data.atualizado).toLocaleString("pt-BR")}</>}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </header>

        {loading && !data ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : erro ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-destructive">Erro ao carregar: {erro}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={load}>Tentar novamente</Button>
          </Card>
        ) : itens.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhuma cotação disponível.</p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {itens.map((it) => (
              <Card key={it.nome} className="p-4" style={{ background: "var(--gradient-surface)", boxShadow: "var(--shadow-soft)" }}>
                <p className="text-sm font-semibold">{it.nome}</p>
                {it.praca && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" /> {it.praca}
                  </p>
                )}
                <p className="text-3xl font-display font-bold tabular-nums mt-3">
                  R$ {it.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  <span className="text-xs text-muted-foreground font-normal ml-1">/{it.unidade}</span>
                </p>
              </Card>
            ))}
          </div>
        )}

        {data?.fonte && (
          <p className="text-[11px] text-muted-foreground text-center">
            Fonte: {data.fonte} · via AgroDoc AI
          </p>
        )}
      </div>
    </AppShell>
  );
}
