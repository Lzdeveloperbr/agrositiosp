import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Bird, Skull, TrendingUp, Scale, Calendar, AlertTriangle,
  Sparkles, ArrowRight, Activity, Wheat, Target, CheckCircle2,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart } from "recharts";
import { useLotes } from "@/lib/state";
import { CURVAS, type Linhagem } from "@/lib/linhagens";

function interp(curva: { dia: number; peso: number; consumoAcum: number; ca: number }[], dia: number, key: "peso" | "consumoAcum" | "ca"): number {
  if (dia <= curva[0].dia) return curva[0][key];
  if (dia >= curva[curva.length - 1].dia) return curva[curva.length - 1][key];
  for (let i = 0; i < curva.length - 1; i++) {
    const a = curva[i], b = curva[i + 1];
    if (dia >= a.dia && dia <= b.dia) {
      const t = (dia - a.dia) / (b.dia - a.dia);
      return a[key] + (b[key] - a[key]) * t;
    }
  }
  return curva[curva.length - 1][key];
}

// Manejo sugerido por idade do lote (referência operacional para frango de corte)
function sugestaoDoDia(idade: number): { titulo: string; descricao: string; categoria: string } {
  if (idade <= 0) return { titulo: "Pré-alojamento", descricao: "Aqueça o galpão a 32°C. Cama nova, comedouros e bebedouros higienizados.", categoria: "Preparação" };
  if (idade <= 3) return { titulo: "Pintinhos — primeiras 72h", descricao: "Mantenha 32-33°C. Confira papo dos pintinhos 12h após chegada. Água sempre disponível.", categoria: "Aquecimento" };
  if (idade <= 7) return { titulo: "1ª semana — vacinação Gumboro", descricao: "Reduza temperatura para 30°C. Aplique Gumboro na água (consulte integradora).", categoria: "Sanidade" };
  if (idade <= 14) return { titulo: "2ª semana — ajustes de comedouro", descricao: "Suba comedouros à altura do dorso. Temperatura 27-28°C. Faça pesagem amostral.", categoria: "Manejo" };
  if (idade <= 21) return { titulo: "3ª semana — ventilação mínima", descricao: "Ligue ventilação mínima. Temperatura 24-26°C. Acompanhe consumo de ração.", categoria: "Ambiência" };
  if (idade <= 28) return { titulo: "4ª semana — pesagem oficial", descricao: "Faça pesagem em 3 pontos do galpão. Verifique uniformidade. Reforce limpeza dos bebedouros.", categoria: "Pesagem" };
  if (idade <= 35) return { titulo: "5ª semana — pico de consumo", descricao: "Ventilação túnel se necessário. Temperatura 21-23°C. Monitore mortalidade diária.", categoria: "Ambiência" };
  if (idade <= 40) return { titulo: "Reta final — pré-abate", descricao: "Confirme data de carregamento. Reduza luz na noite anterior. Jejum 8h antes.", categoria: "Abate" };
  return { titulo: "Carregamento", descricao: "Aves prontas. Pese caminhão e siga protocolo da integradora.", categoria: "Abate" };
}

interface Props {
  linhagem?: Linhagem;
}

export function PainelLoteAtivo({ linhagem = "cobb500" }: Props) {
  const [lotes] = useLotes();
  const ativo = useMemo(() => lotes.find((l) => !l.encerrado), [lotes]);

  if (!ativo) {
    return (
      <Card className="p-6 md:p-8 border-dashed" style={{ background: "var(--gradient-surface)" }}>
        <div className="flex flex-col items-center text-center gap-3 py-6">
          <div className="h-14 w-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
            <Bird className="h-7 w-7" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg">Nenhum lote ativo</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Cadastre seu lote de frangos para liberar o painel automático com curva de peso, mortalidade vs meta, previsão de ração e sugestões diárias.
            </p>
          </div>
          <Button asChild><Link to="/granja">Cadastrar lote</Link></Button>
        </div>
      </Card>
    );
  }

  const hoje = new Date();
  const entrada = new Date(ativo.dataEntrada);
  const idade = Math.max(0, Math.floor((hoje.getTime() - entrada.getTime()) / 86400000));
  const previsao = ativo.previsaoAbateDias || 42;
  const diasRestantes = Math.max(0, previsao - idade);
  const dataAbate = new Date(entrada.getTime() + previsao * 86400000);

  const entries = [...ativo.entries].sort((a, b) => a.date.localeCompare(b.date));
  const totalMort = entries.reduce((s, e) => s + (e.mortalidade || 0), 0);
  const totalElim = entries.reduce((s, e) => s + (e.eliminados || 0), 0);
  const baixas = totalMort + totalElim;
  const vivas = Math.max(0, ativo.quantidadeInicial - baixas);
  const mortPct = ativo.quantidadeInicial > 0 ? (baixas / ativo.quantidadeInicial) * 100 : 0;
  const viabilidade = 100 - mortPct;

  // Meta de mortalidade acumulada por idade (referência: ~0,7%/semana, total ~5% em 42d)
  const metaMortPct = Math.min(5, (idade / 42) * 5);

  const curva = CURVAS[linhagem];
  const pesoMeta = interp(curva, idade, "peso");
  const consumoMetaPorAve = interp(curva, idade, "consumoAcum"); // g/ave acumulado
  const caMeta = interp(curva, idade, "ca");

  // Pesagem real mais recente
  const ultimaPesagem = [...entries].reverse().find((e) => e.pesoMedioG && e.pesoMedioG > 0);
  const pesoReal = ultimaPesagem?.pesoMedioG ?? null;
  const pesoVsMetaPct = pesoReal ? ((pesoReal - pesoMeta) / pesoMeta) * 100 : 0;

  // Ração total estimada até abate (kg)
  const consumoTotalPorAve = interp(curva, previsao, "consumoAcum"); // g/ave
  const racaoTotalKg = (consumoTotalPorAve / 1000) * ativo.quantidadeInicial;
  const racaoConsumidaKg = (consumoMetaPorAve / 1000) * vivas;
  const racaoRestanteKg = Math.max(0, racaoTotalKg - racaoConsumidaKg);

  // Receita estimada
  const pesoAbateEstimadoKg = interp(curva, previsao, "peso") / 1000;
  const precoKg = ativo.precoKgVivo ?? 5.5;
  const receitaEstimada = vivas * pesoAbateEstimadoKg * precoKg;

  // Chart: peso real vs meta + mortalidade acumulada
  const chartData = entries.map((e, i) => {
    const d = Math.max(1, Math.floor((new Date(e.date).getTime() - entrada.getTime()) / 86400000) + 1);
    const acumMort = entries.slice(0, i + 1).reduce((s, x) => s + (x.mortalidade || 0) + (x.eliminados || 0), 0);
    return {
      dia: `D${d}`,
      peso: e.pesoMedioG ?? null,
      metaPeso: Math.round(interp(curva, d, "peso")),
      mortAcum: acumMort,
    };
  });

  const sug = sugestaoDoDia(idade);

  // Alertas inteligentes
  const alertas: { tone: "destructive" | "warning"; msg: string }[] = [];
  if (mortPct > metaMortPct + 1) alertas.push({ tone: "destructive", msg: `Mortalidade ${mortPct.toFixed(2)}% acima da meta (${metaMortPct.toFixed(2)}%)` });
  if (pesoReal && pesoVsMetaPct < -8) alertas.push({ tone: "warning", msg: `Peso ${Math.abs(pesoVsMetaPct).toFixed(1)}% abaixo da curva ${linhagem === "cobb500" ? "Cobb 500" : "Ross 308"}` });
  if (diasRestantes <= 5 && diasRestantes > 0) alertas.push({ tone: "warning", msg: `Faltam ${diasRestantes} dias para o abate previsto` });
  if (!ultimaPesagem && idade >= 14) alertas.push({ tone: "warning", msg: "Nenhuma pesagem registrada — faça pesagem amostral" });

  const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return (
    <Card className="overflow-hidden border-primary/20" style={{ background: "var(--gradient-surface)", boxShadow: "var(--shadow-card)" }}>
      {/* Header */}
      <div className="p-5 md:p-6 border-b border-border/60" style={{ background: "var(--gradient-hero)" }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
              <Bird className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display font-bold text-xl md:text-2xl">Lote {ativo.numero}</h2>
                <Badge variant="secondary" className="font-mono">Dia {idade}/{previsao}</Badge>
                <Badge variant="outline" className="border-primary/40 text-primary">{linhagem === "cobb500" ? "Cobb 500" : "Ross 308"}</Badge>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                {ativo.integradora || "Integradora"} · abate previsto {dataAbate.toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline"><Link to="/granja">+ Lançar dia</Link></Button>
            <Button asChild size="sm"><Link to={`/granja/${ativo.id}`}>Detalhes <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link></Button>
          </div>
        </div>

        {/* Barra de progresso do lote */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Progresso do lote</span>
            <span className="font-medium text-foreground">{Math.min(100, Math.round((idade / previsao) * 100))}%</span>
          </div>
          <Progress value={Math.min(100, (idade / previsao) * 100)} className="h-2" />
        </div>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border/60 border-b border-border/60">
        <KPI icon={Bird} label="Aves vivas" value={vivas.toLocaleString("pt-BR")} hint={`de ${ativo.quantidadeInicial.toLocaleString("pt-BR")}`} tone="primary" />
        <KPI
          icon={Skull}
          label="Mortalidade"
          value={`${mortPct.toFixed(2)}%`}
          hint={`meta ${metaMortPct.toFixed(2)}%`}
          tone={mortPct > metaMortPct + 1 ? "destructive" : mortPct > metaMortPct ? "warning" : "primary"}
        />
        <KPI
          icon={Scale}
          label="Peso médio"
          value={pesoReal ? `${pesoReal.toLocaleString("pt-BR")} g` : "—"}
          hint={pesoReal ? `meta ${Math.round(pesoMeta).toLocaleString("pt-BR")} g (${pesoVsMetaPct >= 0 ? "+" : ""}${pesoVsMetaPct.toFixed(1)}%)` : `meta ${Math.round(pesoMeta).toLocaleString("pt-BR")} g`}
          tone={!pesoReal ? "muted" : pesoVsMetaPct < -5 ? "warning" : "primary"}
        />
        <KPI icon={Calendar} label="Dias p/ abate" value={diasRestantes.toString()} hint={dataAbate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} tone="accent" />
      </div>

      {/* Segunda linha de KPIs derivados */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border/60 border-b border-border/60 bg-muted/30">
        <KPI icon={CheckCircle2} label="Viabilidade" value={`${viabilidade.toFixed(2)}%`} hint="aves vivas/alojadas" tone="primary" compact />
        <KPI icon={Target} label="CA estimado" value={caMeta.toFixed(2)} hint="kg ração / kg vivo" tone="accent" compact />
        <KPI icon={Wheat} label="Ração restante" value={`${racaoRestanteKg.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg`} hint={`${(racaoRestanteKg / 1000).toFixed(1)} t até abate`} tone="primary" compact />
        <KPI icon={TrendingUp} label="Receita estimada" value={fmtBRL(receitaEstimada)} hint={`${precoKg.toFixed(2)} R$/kg vivo`} tone="accent" compact />
      </div>

      {/* Alertas + sugestão */}
      {(alertas.length > 0 || sug) && (
        <div className="grid md:grid-cols-2 gap-3 p-4 border-b border-border/60">
          <div className="rounded-xl p-4 bg-primary/10 border border-primary/30">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wide text-primary">{sug.categoria} · Dia {idade}</span>
            </div>
            <h4 className="font-semibold text-sm">{sug.titulo}</h4>
            <p className="text-xs text-muted-foreground mt-1">{sug.descricao}</p>
          </div>
          <div className="space-y-2">
            {alertas.length > 0 ? (
              alertas.map((a, i) => (
                <div
                  key={i}
                  className={`rounded-lg p-3 flex items-start gap-2 border ${a.tone === "destructive" ? "bg-destructive/10 border-destructive/40" : "bg-warning/10 border-warning/40"}`}
                >
                  <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${a.tone === "destructive" ? "text-destructive" : "text-warning"}`} />
                  <p className="text-xs font-medium">{a.msg}</p>
                </div>
              ))
            ) : (
              <div className="rounded-lg p-3 bg-success/10 border border-success/30 flex items-center gap-2 h-full">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <p className="text-xs font-medium">Lote dentro dos parâmetros esperados</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4 p-4 md:p-5">
        <div className="rounded-xl border border-border/60 p-4 bg-card/40">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Scale className="h-4 w-4 text-primary" /> Peso real vs meta</h3>
            <span className="text-xs text-muted-foreground">gramas</span>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="dia" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="metaPeso" stroke="var(--muted-foreground)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Meta" />
                <Line type="monotone" dataKey="peso" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} name="Real" connectNulls />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyMini msg="Lance pesagens para ver a curva" />
          )}
        </div>

        <div className="rounded-xl border border-border/60 p-4 bg-card/40">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-accent" /> Mortalidade acumulada</h3>
            <span className="text-xs text-muted-foreground">aves</span>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="mortGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="dia" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="mortAcum" stroke="var(--accent)" strokeWidth={2} fill="url(#mortGrad)" name="Baixas acumuladas" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyMini msg="Sem registros ainda" />
          )}
        </div>
      </div>
    </Card>
  );
}

function KPI({ icon: Icon, label, value, hint, tone = "primary", compact }: { icon: any; label: string; value: string; hint?: string; tone?: "primary" | "accent" | "destructive" | "warning" | "muted"; compact?: boolean }) {
  const toneColor =
    tone === "destructive" ? "text-destructive" :
    tone === "warning" ? "text-warning" :
    tone === "accent" ? "text-accent" :
    tone === "muted" ? "text-muted-foreground" : "text-primary";
  return (
    <div className={`${compact ? "p-3 md:p-4" : "p-4 md:p-5"} flex items-start gap-3`}>
      <div className={`shrink-0 h-9 w-9 rounded-lg bg-muted/60 flex items-center justify-center ${toneColor}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
        <p className={`font-display ${compact ? "text-lg md:text-xl" : "text-xl md:text-2xl"} font-bold leading-tight truncate ${toneColor}`}>{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{hint}</p>}
      </div>
    </div>
  );
}

function EmptyMini({ msg }: { msg: string }) {
  return (
    <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-lg">
      {msg}
    </div>
  );
}
