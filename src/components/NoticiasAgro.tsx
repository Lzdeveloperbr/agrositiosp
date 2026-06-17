import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper, ExternalLink, RefreshCw } from "lucide-react";
import { buscarNoticiasAgro, type Noticia } from "@/lib/noticias.functions";

type Props = { limit?: number; compact?: boolean };

export function NoticiasAgro({ limit = 6, compact = false }: Props) {
  const fetchNoticias = useServerFn(buscarNoticiasAgro);
  const [data, setData] = useState<Noticia[] | null>(null);
  const [loading, setLoading] = useState(true);

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
    const t = setInterval(load, 30 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const itens = (data ?? []).slice(0, limit);

  return (
    <Card className="p-5" style={{ background: "var(--gradient-surface)", boxShadow: "var(--shadow-soft)" }}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="min-w-0">
          <h2 className="font-display font-semibold text-lg flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" /> Notícias do Agro
          </h2>
          <p className="text-xs text-muted-foreground">Atualizado a cada 30 min · 4 fontes</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" variant="ghost" onClick={load} disabled={loading} className="h-8">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button asChild size="sm" variant="outline" className="h-8 text-xs">
            <Link to="/mercado">Ver tudo</Link>
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className={compact ? "space-y-2" : "grid sm:grid-cols-2 gap-3"}>
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : itens.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhuma notícia disponível agora.</p>
      ) : compact ? (
        <ul className="divide-y divide-border/60">
          {itens.map((n, i) => (
            <li key={i}>
              <a href={n.link} target="_blank" rel="noopener noreferrer" className="flex gap-3 py-2.5 group">
                {n.imagem && (
                  <img src={n.imagem} alt="" loading="lazy"
                    className="h-14 w-14 rounded-md object-cover shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{n.fonte}</Badge>
                    {n.data && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(n.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium leading-tight line-clamp-2 group-hover:text-primary transition-colors">{n.titulo}</p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {itens.map((n, i) => (
            <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" className="group">
              <Card className="p-3 h-full hover:border-primary/50 transition-colors flex gap-3 border-border/60">
                {n.imagem && (
                  <img src={n.imagem} alt="" loading="lazy"
                    className="h-20 w-20 rounded-md object-cover shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{n.fonte}</Badge>
                    {n.data && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(n.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">{n.titulo}</h3>
                  <span className="text-[10px] text-muted-foreground mt-1 inline-flex items-center gap-1">
                    Ler <ExternalLink className="h-2.5 w-2.5" />
                  </span>
                </div>
              </Card>
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}
