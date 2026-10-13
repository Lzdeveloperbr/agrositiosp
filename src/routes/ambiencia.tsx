import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Thermometer, Wind, Gauge, Bird, TrendingUp, Snowflake, Flame, AlertTriangle } from "lucide-react";
import {
  pressaoIdealPa, planoVentilacaoMinima, sensacaoTermica, statusTermico,
  metaPeso, CURVAS, LINHAGEM_LABEL, type Linhagem,
} from "@/lib/linhagens";
import { useLotes } from "@/lib/state";
import { useFazenda } from "@/lib/cloud/fazenda";
import { fetchWeather } from "@/lib/weather";
import { calcularResumoLote } from "@/lib/granja";

export const Route = createFileRoute("/ambiencia")({
  head: () => ({
    meta: [
      { title: "Ambiência do Aviário — Aviário Pro" },
      { name: "description", content: "Calculadora profissional de pressão negativa, troca de ar mínima, sensação térmica das aves e comparativo de peso por linhagem (Cobb 500 / Ross 308)." },
      { property: "og:title", content: "Ambiência do Aviário — Aviário Pro" },
      { property: "og:description", content: "Pressão, ventilação mínima e sensação térmica pela idade real do lote." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AmbienciaPage,
});

const STORAGE_KEY = "agro:ambiencia:cfg";
type Cfg = {
  larguraM: number;
  comprimentoM: number;
  alturaM: number;
  totalExaustores: number;
  capExaustorCfm: number;
  cicloSegundos: number;
  linhagem: Linhagem;
};
const DEFAULT_CFG: Cfg = {
  larguraM: 14,
  comprimentoM: 120,
  alturaM: 3,
  totalExaustores: 10,
  capExaustorCfm: 24000,
  cicloSegundos: 300,
  linhagem: "ross_ap95",
};

function AmbienciaPage() {
  const [lotes] = useLotes();
  const { fazendaId, coords } = useFazenda();
  const [cfg, setCfg] = useState<Cfg>(DEFAULT_CFG);
  const [temp, setTemp] = useState<number>(28);
  const [umid, setUmid] = useState<number>(70);
  const [vento, setVento] = useState<number>(1.5);
  const [climaLoading, setClimaLoading] = useState(false);

  // Persistência
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY + ":" + (fazendaId ?? "_"));
      if (raw) setCfg({ ...DEFAULT_CFG, ...JSON.parse(raw) });
    } catch {}
  }, [fazendaId]);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY + ":" + (fazendaId ?? "_"), JSON.stringify(cfg)); } catch {}
  }, [cfg, fazendaId]);

  // Lote ativo: idade pelo calendário (D0 = alojamento), vivas descontando mortes e eliminados.
  const ativo = lotes.find((l) => !l.encerrado);
  const resumo = ativo ? calcularResumoLote(ativo) : null;
  const idadeDias = resumo ? Math.max(1, resumo.idade) : 21;
  const numeroAves = resumo ? resumo.vivas : 20000;
  const pesoMedioG = resumo?.ultimaPesagem && resumo.ultimaPesagem.idade === resumo.idade ? resumo.ultimaPesagem.pesoG : resumo ? Math.round(resumo.pesoProjetadoHojeG) : 0;

  // Pressão
  const pressao = useMemo(() => pressaoIdealPa(cfg.larguraM), [cfg.larguraM]);

  // Ventilação mínima
  const ventilacao = useMemo(() => planoVentilacaoMinima({
    idadeDias,
    numeroAves,
    capacidadeExaustorCfm: cfg.capExaustorCfm,
    totalExaustores: cfg.totalExaustores,
    cicloSegundos: cfg.cicloSegundos,
  }), [idadeDias, numeroAves, cfg]);

  // Sensação térmica
  const et = useMemo(() => sensacaoTermica(temp, umid, vento), [temp, umid, vento]);
  const status = useMemo(() => statusTermico(et, idadeDias), [et, idadeDias]);

  // Curva peso
  const meta = metaPeso(cfg.linhagem, idadeDias);
  const diffPct = pesoMedioG ? ((pesoMedioG - meta) / meta) * 100 : 0;
  const corPeso = !pesoMedioG ? "text-muted-foreground" : Math.abs(diffPct) <= 3 ? "text-emerald-600" : diffPct < -3 ? "text-destructive" : "text-amber-600";

  const carregarClima = async () => {
    if (!coords) return;
    setClimaLoading(true);
    try {
      const w = await fetchWeather(coords.lat, coords.lon);
      if (w?.current) {
        setTemp(w.current.tempC);
        setUmid(w.current.umidade);
        setVento(Math.round((w.current.vento / 3.6) * 10) / 10);
      }
    } finally { setClimaLoading(false); }
  };

  // Curva visualização (peso real vs meta nas semanas chave)
  const curva = CURVAS[cfg.linhagem];

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
              <Wind className="h-6 w-6 text-primary" /> Ambiência do Aviário
            </h1>
            <p className="text-muted-foreground text-sm">Pressão negativa, troca de ar mínima, sensação térmica e curva de linhagem.</p>
          </div>
          <Button variant="outline" size="sm" onClick={carregarClima} disabled={climaLoading}>
            <Thermometer className="h-4 w-4 mr-2" /> {climaLoading ? "Lendo…" : "Usar clima atual"}
          </Button>
        </header>

        {/* Configuração do galpão */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Gauge className="h-4 w-4 text-primary" /> Configuração do galpão</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><Label className="text-xs">Largura (m)</Label><Input type="number" step="0.5" value={cfg.larguraM} onChange={(e) => setCfg({ ...cfg, larguraM: +e.target.value || 0 })} /></div>
            <div><Label className="text-xs">Comprimento (m)</Label><Input type="number" step="1" value={cfg.comprimentoM} onChange={(e) => setCfg({ ...cfg, comprimentoM: +e.target.value || 0 })} /></div>
            <div><Label className="text-xs">Pé direito (m)</Label><Input type="number" step="0.1" value={cfg.alturaM} onChange={(e) => setCfg({ ...cfg, alturaM: +e.target.value || 0 })} /></div>
            <div><Label className="text-xs">Nº de exaustores</Label><Input type="number" value={cfg.totalExaustores} onChange={(e) => setCfg({ ...cfg, totalExaustores: +e.target.value || 0 })} /></div>
            <div><Label className="text-xs">Capacidade exaustor (CFM)</Label><Input type="number" step="500" value={cfg.capExaustorCfm} onChange={(e) => setCfg({ ...cfg, capExaustorCfm: +e.target.value || 0 })} /></div>
            <div><Label className="text-xs">Ciclo (segundos)</Label><Input type="number" step="30" value={cfg.cicloSegundos} onChange={(e) => setCfg({ ...cfg, cicloSegundos: +e.target.value || 0 })} /></div>
            <div className="col-span-2">
              <Label className="text-xs">Linhagem</Label>
              <Select value={cfg.linhagem} onValueChange={(v) => setCfg({ ...cfg, linhagem: v as Linhagem })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cobb500">Cobb 500</SelectItem>
                  <SelectItem value="ross_ap95">Ross AP95 (Ross 308 AP)</SelectItem>
                  <SelectItem value="ross308">Ross 308</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Pressão estática */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Gauge className="h-4 w-4 text-primary" /> Pressão estática ideal (negativa)</h3>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Mínima" value={`${pressao.min} Pa`} hint="Inlets pouco abertos" />
            <Stat label="Recomendada" value={`${pressao.recomendada} Pa`} hint={`Largura ${cfg.larguraM} m`} highlight />
            <Stat label="Máxima" value={`${pressao.max} Pa`} hint="Inlets bem fechados" />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Ajuste a abertura dos <strong>inlets</strong> até o manômetro marcar a pressão recomendada com os exaustores em modo túnel/mínima.
            Pressão mais alta = jato de ar atravessa o galpão sem cair sobre as aves jovens.
          </p>
        </Card>

        {/* Troca de ar mínima */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Wind className="h-4 w-4 text-primary" /> Troca de ar mínima</h3>
          <div className="text-xs text-muted-foreground mb-3">
            Lote ativo: {ativo ? <Badge variant="outline">Lote {ativo.numero} · {idadeDias} dias · {numeroAves.toLocaleString("pt-BR")} aves</Badge> : "Sem lote ativo (usando 20.000 aves @ 21 dias)"}.
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="CFM total exigido" value={ventilacao.cfmTotalNecessario.toLocaleString("pt-BR")} hint="m³/min mínimo" />
            <Stat label="Exaustores necessários" value={`${ventilacao.exaustoresNecessarios} / ${cfg.totalExaustores}`} hint={ventilacao.capacidadeOk ? "Capacidade OK" : "Insuficiente"} />
            <Stat label="Tempo ligado por ciclo" value={`${ventilacao.segundosLigado1Exaustor}s`} hint={`${ventilacao.porcentagemDoCiclo}% do ciclo de ${ventilacao.cicloSegundos}s`} highlight />
            <Stat label="Volume / ciclo" value={ventilacao.necessarioCiclo.toLocaleString("pt-BR")} hint={`ft³ necessários`} />
          </div>
          {!ventilacao.capacidadeOk && (
            <div className="mt-3 flex items-start gap-2 p-2.5 rounded-md border border-destructive/40 bg-destructive/5 text-xs">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <span>Capacidade insuficiente — você precisa de <strong>{ventilacao.exaustoresNecessarios}</strong> exaustores e tem <strong>{cfg.totalExaustores}</strong>. Aumente capacidade ou reduza densidade.</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Recomendação: programar timer do controlador para <strong>{ventilacao.segundosLigado1Exaustor}s ligado / {Math.max(0, ventilacao.cicloSegundos - ventilacao.segundosLigado1Exaustor)}s desligado</strong>.
          </p>
        </Card>

        {/* Sensação térmica */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Thermometer className="h-4 w-4 text-primary" /> Sensação térmica das aves</h3>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div><Label className="text-xs">Temperatura (ºC)</Label><Input type="number" step="0.1" value={temp} onChange={(e) => setTemp(+e.target.value || 0)} /></div>
            <div><Label className="text-xs">Umidade (%)</Label><Input type="number" step="1" value={umid} onChange={(e) => setUmid(+e.target.value || 0)} /></div>
            <div><Label className="text-xs">Vento (m/s)</Label><Input type="number" step="0.1" value={vento} onChange={(e) => setVento(+e.target.value || 0)} /></div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-lg border border-border/60 bg-muted/30">
            <div className="text-4xl">
              {status.faixa.includes("Calor") || status.faixa.includes("Estresse") ? <Flame className="h-10 w-10 text-destructive" /> :
               status.faixa.includes("Frio") ? <Snowflake className="h-10 w-10 text-sky-600" /> :
               <Thermometer className="h-10 w-10 text-emerald-600" />}
            </div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Sensação térmica real</div>
              <div className="text-3xl font-bold">{et.toFixed(1)}ºC</div>
              <div className={`text-sm font-medium ${status.cor}`}>{status.faixa}</div>
              <div className="text-xs text-muted-foreground mt-1">{status.recomendacao}</div>
            </div>
          </div>
        </Card>

        {/* Curva de peso x linhagem */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Bird className="h-4 w-4 text-primary" /> Peso vivo x meta {LINHAGEM_LABEL[cfg.linhagem]}</h3>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <Stat label="Idade do lote" value={`${idadeDias} d`} hint={ativo ? `Lote ${ativo.numero}` : "Sem lote ativo"} />
            <Stat label="Meta (g)" value={meta.toLocaleString("pt-BR")} hint={LINHAGEM_LABEL[cfg.linhagem]} />
            <Stat label="Real (g)" value={pesoMedioG ? pesoMedioG.toLocaleString("pt-BR") : "—"} hint={pesoMedioG ? `${diffPct >= 0 ? "+" : ""}${diffPct.toFixed(1)}% vs meta` : "Lançar pesagem"} className={corPeso} highlight />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr><th className="text-left py-1.5">Idade</th><th className="text-right">Meta (g)</th><th className="text-right">Cons. acum.</th><th className="text-right">CA</th></tr>
              </thead>
              <tbody>
                {curva.map((c) => (
                  <tr key={c.dia} className={`border-t border-border/40 ${c.dia === idadeDias ? "bg-primary/5 font-medium" : ""}`}>
                    <td className="py-1.5">{c.dia} d</td>
                    <td className="text-right">{c.peso.toLocaleString("pt-BR")}</td>
                    <td className="text-right">{c.consumoAcum.toLocaleString("pt-BR")} g</td>
                    <td className="text-right">{c.ca.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            <TrendingUp className="h-3 w-3 inline mr-1" /> Lance o peso médio nos lançamentos diários do lote para o sistema comparar automaticamente com a meta da linhagem.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, hint, highlight, className }: { label: string; value: string | number; hint?: string; highlight?: boolean; className?: string }) {
  return (
    <div className={`p-3 rounded-md border ${highlight ? "border-primary/40 bg-primary/5" : "border-border/60"}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold ${className ?? ""}`}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}
