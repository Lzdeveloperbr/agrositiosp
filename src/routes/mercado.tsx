import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, RefreshCw, MapPin, Newspaper, ExternalLink } from "lucide-react";
import { buscarNoticiasAgro, type Noticia } from "@/lib/noticias.functions";
import { fmtData } from "@/lib/data";

export const Route = createFileRoute("/mercado")({
  head: () => ({
    meta: [
      { title: "Mercado Agro — AgroSítio" },
      { name: "description", content: "Cotações agropecuárias e notícias do agro em tempo real." },
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
  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Inteligência de mercado</p>
          <h1 className="text-2xl md:text-3xl font-display font-bold mt-1">Mercado Agro</h1>
          <p className="text-sm text-muted-foreground">Cotações e notícias atualizadas automaticamente.</p>
        </header>

        <Tabs defaultValue="cotacoes" className="space-y-4">
          <TabsList className="grid grid-cols-2 w-full sm:w-auto">
            <TabsTrigger value="cotacoes"><BarChart3 className="h-4 w-4 mr-1.5" /> Cotações</TabsTrigger>
            <TabsTrigger value="noticias"><Newspaper className="h-4 w-4 mr-1.5" /> Notícias</TabsTrigger>
          </TabsList>

          <TabsContent value="cotacoes"><CotacoesTab /></TabsContent>
          <TabsContent value="noticias"><NoticiasTab /></TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function CotacoesTab() {
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
    const t = setInterval(load, 30 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const itens = data ? montar(data) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {data?.atualizado && <>Atualizado {new Date(data.atualizado).toLocaleString("pt-BR")}</>}
        </p>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

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
  );
}

function NoticiasTab() {
  const fetchNoticias = useServerFn(buscarNoticiasAgro);
  const [data, setData] = useState<Noticia[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [fonte, setFonte] = useState<string>("Todas");

  const load = async () => {
    setLoading(true);
    try {
      setData(await fetchNoticias());
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30 * 60 * 1000); // 30 min
    return () => clearInterval(t);
  }, []);

  const fontes = ["Todas", ...Array.from(new Set((data ?? []).map((n) => n.fonte)))];
  const filtradas = (data ?? []).filter((n) => {
    if (fonte !== "Todas" && n.fonte !== fonte) return false;
    if (q && !`${n.titulo} ${n.resumo}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Buscar notícia…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <div className="flex flex-wrap gap-1.5">
          {fontes.map((f) => (
            <Button key={f} size="sm" variant={fonte === f ? "default" : "outline"} onClick={() => setFonte(f)} className="h-8 text-xs">
              {f}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading} className="ml-auto">
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      {loading && !data ? (
        <div className="grid md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : filtradas.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Newspaper className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhuma notícia encontrada.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtradas.map((n, i) => (
            <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" className="group">
              <Card className="p-4 h-full hover:border-primary/50 transition-colors flex gap-3" style={{ boxShadow: "var(--shadow-soft)" }}>
                {n.imagem && (
                  <img
                    src={n.imagem}
                    alt=""
                    className="h-24 w-24 rounded-md object-cover shrink-0"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="secondary" className="text-[10px]">{n.fonte}</Badge>
                    {n.data && (
                      <span className="text-[10px] text-muted-foreground">
                        {fmtData(n.data, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors line-clamp-2">{n.titulo}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.resumo}</p>
                  <span className="text-[10px] text-muted-foreground mt-1 inline-flex items-center gap-1">
                    Ler matéria <ExternalLink className="h-3 w-3" />
                  </span>
                </div>
              </Card>
            </a>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground text-center">
        Fontes: Notícias Agrícolas · Canal Rural · Globo Rural · Ministério da Agricultura
      </p>
    </div>
  );
}
