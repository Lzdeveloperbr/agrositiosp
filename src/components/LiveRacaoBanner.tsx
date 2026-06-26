import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wheat, TrendingDown, Activity, AlertTriangle, Timer, Package } from "lucide-react";
import type { ItemEstoque } from "@/lib/types";

function fmt(n: number, d = 0) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function LiveRacaoBanner({ itens }: { itens: ItemEstoque[] }) {
  const [now, setNow] = useState(() => new Date());

  // tick a cada 1s pra dar sensação "ao vivo" e recalcular consumo/autonomia
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const racoes = useMemo(() => itens.filter((i) => i.categoria === "racao"), [itens]);

  const stats = useMemo(() => {
    const totalKg = racoes.reduce((s, i) => {
      const u = (i.unidade || "").toLowerCase();
      const fator = u === "t" || u === "ton" || u === "tonelada" ? 1000 : u === "g" ? 0.001 : 1; // assume kg padrão
      return s + i.quantidade * fator;
    }, 0);

    const abaixoMin = racoes.filter((i) => i.minimo !== undefined && i.quantidade <= (i.minimo ?? 0)).length;

    // consumo médio/dia: soma das saídas dos últimos 30 dias em racoes
    const limite = new Date();
    limite.setDate(limite.getDate() - 30);
    let saidaKg = 0;
    let diasComMov = new Set<string>();
    racoes.forEach((i) => {
      (i.movimentacoes || []).forEach((m) => {
        if (m.tipo !== "saida") return;
        const d = new Date(m.data);
        if (d >= limite) {
          saidaKg += m.quantidade;
          diasComMov.add(m.data);
        }
      });
    });
    const dias = Math.max(1, diasComMov.size);
    const consumoDia = saidaKg / 30; // média espalhada por 30d
    const consumoSeg = consumoDia / 86400;
    const autonomiaDias = consumoDia > 0 ? totalKg / consumoDia : Infinity;

    // animação "ao vivo": estimativa de kg consumidos desde a meia-noite
    const meiaNoite = new Date(now);
    meiaNoite.setHours(0, 0, 0, 0);
    const segHoje = (now.getTime() - meiaNoite.getTime()) / 1000;
    const projetadoHoje = consumoSeg * segHoje;
    const estoqueAgora = Math.max(0, totalKg - projetadoHoje);

    return { totalKg, abaixoMin, consumoDia, consumoSeg, autonomiaDias, estoqueAgora, qtdItens: racoes.length, mediaPorDiaReal: saidaKg / dias };
  }, [racoes, now]);

  if (racoes.length === 0) return null;

  return (
    <Card className="p-5 border-primary/30 relative overflow-hidden" style={{ background: "var(--gradient-surface)" }}>
      <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        AO VIVO · {now.toLocaleTimeString("pt-BR")}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Wheat className="h-6 w-6 text-primary" />
        <h2 className="font-display font-bold text-xl">Ração em estoque</h2>
        <Badge variant="outline" className="text-[10px]">{stats.qtdItens} {stats.qtdItens === 1 ? "item" : "itens"}</Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric icon={<Package className="h-4 w-4" />} label="Peso atual (kg)">
          <span className="tabular-nums">{fmt(stats.estoqueAgora, 3)}</span>
          <span className="block text-xs text-muted-foreground font-normal mt-0.5">
            {fmt(stats.estoqueAgora / 1000, 3)} t · base {fmt(stats.totalKg)} kg
          </span>
        </Metric>

        <Metric icon={<TrendingDown className="h-4 w-4" />} label="Consumo / dia">
          <span className="tabular-nums">{fmt(stats.consumoDia, 1)} <small className="text-sm font-normal">kg</small></span>
          <span className="block text-xs text-muted-foreground font-normal mt-0.5">
            ≈ {fmt(stats.consumoSeg * 1000, 2)} g/s (média 30 d)
          </span>
        </Metric>

        <Metric icon={<Timer className="h-4 w-4" />} label="Autonomia">
          <span className="tabular-nums">
            {Number.isFinite(stats.autonomiaDias) ? `${fmt(stats.autonomiaDias, 1)} d` : "—"}
          </span>
          <span className="block text-xs text-muted-foreground font-normal mt-0.5">
            {Number.isFinite(stats.autonomiaDias) ? `acaba em ${prazo(stats.autonomiaDias)}` : "sem consumo registrado"}
          </span>
        </Metric>

        <Metric icon={<Activity className="h-4 w-4" />} label="Status">
          {stats.abaixoMin > 0 ? (
            <Badge variant="destructive" className="flex items-center gap-1 w-fit">
              <AlertTriangle className="h-3 w-3" /> {stats.abaixoMin} abaixo do mínimo
            </Badge>
          ) : (
            <Badge className="bg-emerald-600 hover:bg-emerald-600 w-fit">OK</Badge>
          )}
          <span className="block text-xs text-muted-foreground font-normal mt-1">
            atualização a cada segundo
          </span>
        </Metric>
      </div>
    </Card>
  );
}

function Metric({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">{icon}{label}</div>
      <div className="font-display font-bold text-2xl">{children}</div>
    </div>
  );
}

function prazo(dias: number) {
  if (dias < 1) return "menos de 1 dia";
  if (dias < 30) return `${Math.round(dias)} dias`;
  const meses = dias / 30;
  if (meses < 12) return `~${meses.toFixed(1)} meses`;
  return `~${(dias / 365).toFixed(1)} anos`;
}
