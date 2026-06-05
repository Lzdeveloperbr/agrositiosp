import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLotes } from "@/lib/state";
import { CURVAS, metaPeso, type Linhagem } from "@/lib/linhagens";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { Trophy, ShieldCheck, Syringe, Scale, TrendingUp, Truck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/excelencia-lote")({
  head: () => ({
    meta: [
      { title: "Excelência do Lote — AgroSítio" },
      { name: "description", content: "Ferramentas profissionais: biossegurança, plano sanitário, uniformidade, performance e pré-abate." },
    ],
  }),
  component: ExcelenciaLote,
});

// ===== Helpers =====
function idadeDias(dataEntrada: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(dataEntrada).getTime()) / 86400000));
}

// IEP (Índice de Eficiência Produtiva) = (Viab% × Peso(kg) × 100) / (Idade × CA)
function calcIEP(viabPct: number, pesoKg: number, idade: number, ca: number): number {
  if (idade <= 0 || ca <= 0) return 0;
  return Math.round((viabPct * pesoKg * 100) / (idade * ca));
}

function classifIEP(iep: number): { label: string; cor: string } {
  if (iep >= 400) return { label: "Excelente", cor: "bg-emerald-500" };
  if (iep >= 350) return { label: "Muito bom", cor: "bg-emerald-400" };
  if (iep >= 300) return { label: "Bom", cor: "bg-amber-500" };
  if (iep >= 250) return { label: "Regular", cor: "bg-orange-500" };
  return { label: "Ruim", cor: "bg-destructive" };
}

function classifCV(cv: number): { label: string; cor: string } {
  if (cv <= 8) return { label: "Excelente", cor: "text-emerald-600" };
  if (cv <= 10) return { label: "Bom", cor: "text-emerald-500" };
  if (cv <= 12) return { label: "Aceitável", cor: "text-amber-600" };
  return { label: "Desuniforme", cor: "text-destructive" };
}

// ===== Plano Sanitário padrão (frango de corte) =====
const PLANO_SANITARIO = [
  { dia: 1, vacina: "Marek + Bronquite (incubatório)", via: "Spray/SC", obs: "Já aplicada no nascedouro." },
  { dia: 7, vacina: "Newcastle + Bronquite (reforço)", via: "Água/Spray", obs: "Jejum hídrico 1h antes. Leite em pó 2g/L." },
  { dia: 10, vacina: "Gumboro (1ª dose)", via: "Água", obs: "Cepa intermediária. Sem cloro na água." },
  { dia: 14, vacina: "Newcastle (B1/La Sota)", via: "Água/Spray", obs: "Confirmar título sorológico anterior." },
  { dia: 18, vacina: "Gumboro (2ª dose)", via: "Água", obs: "Janela Deventer. Conferir tempo de consumo (<2h)." },
  { dia: 21, vacina: "Coccidiose (reforço — se aplicável)", via: "Água", obs: "Conforme programa da integradora." },
];

const BIOSSEGURANCA = [
  { id: "cerca", txt: "Cerca perimetral íntegra e portão fechado" },
  { id: "arco", txt: "Arco de desinfecção de veículos funcionando" },
  { id: "pedilv", txt: "Pediluvio na entrada com solução trocada (≤ 48h)" },
  { id: "roupa", txt: "Troca de roupa/botas obrigatória" },
  { id: "visit", txt: "Registro de visitantes com vazio sanitário > 48h" },
  { id: "ratos", txt: "Iscas de raticida ativas e mapeadas" },
  { id: "moscas", txt: "Controle de moscas (larvicida na cama)" },
  { id: "passar", txt: "Telas anti-pássaro íntegras (todas as janelas)" },
  { id: "agua", txt: "Reservatório de água fechado e clorado" },
  { id: "racao", txt: "Silo de ração vedado, sem pontos de umidade" },
  { id: "morto", txt: "Composteira/incinerador funcionando" },
  { id: "esterco", txt: "Cama anterior destinada corretamente" },
];

const PRE_ABATE = [
  { dia: -3, item: "Suspender qualquer medicação (carência)" },
  { dia: -2, item: "Conferir agendamento de carregamento com integradora" },
  { dia: -1, item: "Liberar comedouros (vazio ração 8-10h antes da apanha)" },
  { dia: -1, item: "Manter água até 2-3h antes da apanha" },
  { dia: 0, item: "Reduzir luz / ambiente calmo durante apanha" },
  { dia: 0, item: "Apanha pelo dorso, 3-4 aves/mão (nunca pelas pernas)" },
  { dia: 0, item: "Densidade ≤ 8 aves/caixa (verão) ou 10 (inverno)" },
  { dia: 0, item: "Registrar peso de carga, mortos chegada, DOA" },
];

function ExcelenciaLote() {
  const [lotes] = useLotes();
  const ativos = lotes.filter((l) => !l.encerrado);
  const [loteId, setLoteId] = useState<string>(ativos[0]?.id ?? "");
  const lote = lotes.find((l) => l.id === loteId);

  const [linhagem, setLinhagem] = useState<Linhagem>("ross308");

  // Pesagem amostral
  const [pesos, setPesos] = useState<string>("");
  const amostra = useMemo(() => {
    const arr = pesos
      .split(/[\s,;\n]+/)
      .map((v) => parseFloat(v.replace(",", ".")))
      .filter((n) => !isNaN(n) && n > 0);
    if (!arr.length) return null;
    const n = arr.length;
    const media = arr.reduce((a, b) => a + b, 0) / n;
    const variancia = arr.reduce((a, b) => a + (b - media) ** 2, 0) / n;
    const dp = Math.sqrt(variancia);
    const cv = (dp / media) * 100;
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    // Uniformidade clássica: % de aves dentro de ±10% da média
    const dentro = arr.filter((v) => Math.abs(v - media) <= media * 0.1).length;
    const unif = (dentro / n) * 100;
    return { n, media, dp, cv, min, max, unif };
  }, [pesos]);

  // Biossegurança score
  const [biosCheck, setBiosCheck] = useState<Record<string, boolean>>({});
  const biosScore = useMemo(() => {
    const ok = BIOSSEGURANCA.filter((b) => biosCheck[b.id]).length;
    return { ok, total: BIOSSEGURANCA.length, pct: Math.round((ok / BIOSSEGURANCA.length) * 100) };
  }, [biosCheck]);

  // Performance vs meta
  const performance = useMemo(() => {
    if (!lote) return null;
    const idade = idadeDias(lote.dataEntrada);
    const totalMort = lote.entries.reduce((s, e) => s + (e.mortalidade || 0), 0);
    const totalElim = lote.entries.reduce((s, e) => s + (e.eliminados || 0), 0);
    const vivas = lote.quantidadeInicial - totalMort - totalElim;
    const viab = (vivas / lote.quantidadeInicial) * 100;
    const ultPeso = [...lote.entries].reverse().find((e) => e.pesoMedioG)?.pesoMedioG ?? 0;
    const meta = metaPeso(linhagem, idade);
    const pesoKg = ultPeso / 1000;
    const gpd = idade > 0 && ultPeso > 0 ? Math.round(ultPeso / idade) : 0;
    const gpdMeta = idade > 0 ? Math.round(meta / idade) : 0;
    // CA estimada pela curva (sem dados reais de ração aqui)
    const caCurva = CURVAS[linhagem].reduce((acc, p) => Math.abs(p.dia - idade) < Math.abs(acc.dia - idade) ? p : acc).ca;
    const iep = calcIEP(viab, pesoKg, idade, caCurva);
    // Curva chart
    const chart = CURVAS[linhagem].map((p) => ({
      dia: p.dia,
      meta: p.peso,
      real: p.dia === idade && ultPeso > 0 ? ultPeso : undefined,
    }));
    if (ultPeso > 0 && !chart.find((c) => c.dia === idade)) {
      chart.push({ dia: idade, meta: meta, real: ultPeso });
      chart.sort((a, b) => a.dia - b.dia);
    }
    return { idade, vivas, viab, ultPeso, meta, pesoKg, gpd, gpdMeta, caCurva, iep, chart, diff: ultPeso - meta };
  }, [lote, linhagem]);

  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" /> Excelência do Lote
          </h1>
          <p className="text-sm text-muted-foreground">
            Ferramentas profissionais para alcançar IEP &gt; 400 e CA &lt; 1,55.
          </p>
        </header>

        <Card className="p-4 flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <Label>Lote</Label>
            <Select value={loteId} onValueChange={setLoteId}>
              <SelectTrigger><SelectValue placeholder="Selecionar lote" /></SelectTrigger>
              <SelectContent>
                {ativos.map((l) => (
                  <SelectItem key={l.id} value={l.id}>Lote {l.numero} — {l.integradora}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label>Linhagem</Label>
            <Select value={linhagem} onValueChange={(v) => setLinhagem(v as Linhagem)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ross308">Ross 308 / AP 95</SelectItem>
                <SelectItem value="cobb500">Cobb 500</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {lote && performance && (
            <div className="text-xs text-muted-foreground sm:text-right">
              <div>Idade: <b className="text-foreground">D{performance.idade}</b></div>
              <div>Vivas: <b className="text-foreground">{performance.vivas.toLocaleString("pt-BR")}</b></div>
            </div>
          )}
        </Card>

        <Tabs defaultValue="perf" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="perf"><TrendingUp className="h-4 w-4 mr-1" /> Performance</TabsTrigger>
            <TabsTrigger value="unif"><Scale className="h-4 w-4 mr-1" /> Uniformidade</TabsTrigger>
            <TabsTrigger value="bios"><ShieldCheck className="h-4 w-4 mr-1" /> Biossegurança</TabsTrigger>
            <TabsTrigger value="san"><Syringe className="h-4 w-4 mr-1" /> Sanitário</TabsTrigger>
            <TabsTrigger value="abate"><Truck className="h-4 w-4 mr-1" /> Pré-Abate</TabsTrigger>
          </TabsList>

          {/* ===== Performance ===== */}
          <TabsContent value="perf" className="space-y-4">
            {!performance ? (
              <Card className="p-6 text-sm text-muted-foreground">Selecione um lote ativo.</Card>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="p-3">
                    <div className="text-[10px] uppercase text-muted-foreground">IEP</div>
                    <div className="text-2xl font-bold">{performance.iep}</div>
                    <Badge className={classifIEP(performance.iep).cor + " text-white text-[10px]"}>{classifIEP(performance.iep).label}</Badge>
                  </Card>
                  <Card className="p-3">
                    <div className="text-[10px] uppercase text-muted-foreground">Peso real / meta</div>
                    <div className="text-lg font-bold">{performance.ultPeso || "—"}g</div>
                    <div className={"text-xs " + (performance.diff >= 0 ? "text-emerald-600" : "text-destructive")}>
                      Meta D{performance.idade}: {performance.meta}g ({performance.diff >= 0 ? "+" : ""}{performance.diff}g)
                    </div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-[10px] uppercase text-muted-foreground">GPD</div>
                    <div className="text-2xl font-bold">{performance.gpd}g/dia</div>
                    <div className="text-[10px] text-muted-foreground">Meta: {performance.gpdMeta}g/dia</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-[10px] uppercase text-muted-foreground">Viabilidade</div>
                    <div className="text-2xl font-bold">{performance.viab.toFixed(1)}%</div>
                    <div className="text-[10px] text-muted-foreground">CA curva: {performance.caCurva.toFixed(2)}</div>
                  </Card>
                </div>

                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Curva de peso — Real vs Meta</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={performance.chart}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="dia" label={{ value: "Dia", position: "insideBottom", offset: -5 }} />
                        <YAxis label={{ value: "Peso (g)", angle: -90, position: "insideLeft" }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="meta" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" name="Meta" dot={false} />
                        <Line type="monotone" dataKey="real" stroke="hsl(var(--primary))" strokeWidth={3} name="Real" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Diagnóstico automático</h3>
                  <ul className="text-sm space-y-1">
                    {performance.diff < -50 && <li className="text-destructive">⚠ Peso {Math.abs(performance.diff)}g abaixo da meta — revisar consumo de ração, temperatura noturna e densidade.</li>}
                    {performance.diff > 50 && <li className="text-emerald-600">✓ Peso {performance.diff}g acima da meta — manter manejo.</li>}
                    {performance.viab < 95 && <li className="text-destructive">⚠ Viabilidade abaixo de 95% — investigar causas de mortalidade (necropsia recomendada).</li>}
                    {performance.iep < 300 && <li className="text-destructive">⚠ IEP abaixo de 300 — revisar conjunto: peso, CA, mortalidade e idade de abate.</li>}
                    {performance.idade >= 7 && performance.ultPeso === 0 && <li className="text-amber-600">⚠ Nenhum peso registrado — fazer pesagem amostral hoje.</li>}
                  </ul>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ===== Uniformidade ===== */}
          <TabsContent value="unif" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Pesagem amostral</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Pese pelo menos 50 aves em 3-5 pontos do galpão. Cole os pesos em gramas separados por espaço, vírgula ou enter.
              </p>
              <Label>Pesos (g)</Label>
              <textarea
                value={pesos}
                onChange={(e) => setPesos(e.target.value)}
                placeholder="Ex: 1850 1920 1780 1900 1850 1810..."
                className="w-full min-h-32 p-2 text-sm font-mono border rounded-md bg-background"
              />
              {amostra && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><div className="text-[10px] uppercase text-muted-foreground">N° aves</div><div className="text-xl font-bold">{amostra.n}</div></div>
                  <div><div className="text-[10px] uppercase text-muted-foreground">Peso médio</div><div className="text-xl font-bold">{amostra.media.toFixed(0)}g</div></div>
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground">CV%</div>
                    <div className={"text-xl font-bold " + classifCV(amostra.cv).cor}>{amostra.cv.toFixed(1)}%</div>
                    <div className={"text-[10px] " + classifCV(amostra.cv).cor}>{classifCV(amostra.cv).label}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground">Uniformidade ±10%</div>
                    <div className="text-xl font-bold">{amostra.unif.toFixed(0)}%</div>
                    <div className="text-[10px] text-muted-foreground">Mín {amostra.min} / Máx {amostra.max}g</div>
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-2">Referência técnica de CV</h3>
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr><th className="text-left py-1">CV%</th><th className="text-left">Classificação</th><th className="text-left">Ação</th></tr>
                </thead>
                <tbody>
                  <tr className="border-t"><td className="py-1.5">≤ 8%</td><td className="text-emerald-600 font-medium">Excelente</td><td className="text-xs">Manter manejo</td></tr>
                  <tr className="border-t"><td className="py-1.5">8-10%</td><td className="text-emerald-500 font-medium">Bom</td><td className="text-xs">Atenção a densidade local</td></tr>
                  <tr className="border-t"><td className="py-1.5">10-12%</td><td className="text-amber-600 font-medium">Aceitável</td><td className="text-xs">Revisar altura de comedouros/bebedouros</td></tr>
                  <tr className="border-t"><td className="py-1.5">&gt; 12%</td><td className="text-destructive font-medium">Desuniforme</td><td className="text-xs">Investigar coccidiose, ventilação, espaço de comedouro</td></tr>
                </tbody>
              </table>
            </Card>
          </TabsContent>

          {/* ===== Biossegurança ===== */}
          <TabsContent value="bios" className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Checklist de biossegurança</h3>
                <Badge className={biosScore.pct >= 90 ? "bg-emerald-500" : biosScore.pct >= 70 ? "bg-amber-500" : "bg-destructive"}>
                  {biosScore.ok}/{biosScore.total} ({biosScore.pct}%)
                </Badge>
              </div>
              <div className="space-y-2">
                {BIOSSEGURANCA.map((b) => (
                  <label key={b.id} className="flex items-start gap-2 cursor-pointer text-sm p-2 rounded hover:bg-muted/50">
                    <Checkbox
                      checked={!!biosCheck[b.id]}
                      onCheckedChange={(v) => setBiosCheck((s) => ({ ...s, [b.id]: !!v }))}
                      className="mt-0.5"
                    />
                    <span className={biosCheck[b.id] ? "line-through text-muted-foreground" : ""}>{b.txt}</span>
                  </label>
                ))}
              </div>
              {biosScore.pct < 90 && (
                <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Score abaixo de 90% — risco sanitário elevado.
                </p>
              )}
            </Card>
          </TabsContent>

          {/* ===== Plano Sanitário ===== */}
          <TabsContent value="san" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Plano sanitário padrão — Frango de corte</h3>
              <p className="text-xs text-muted-foreground mb-3">Programa típico; ajuste conforme orientação da integradora.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr><th className="text-left py-2">Dia</th><th className="text-left">Vacina/Manejo</th><th className="text-left">Via</th><th className="text-left">Observação</th><th></th></tr>
                  </thead>
                  <tbody>
                    {PLANO_SANITARIO.map((p) => {
                      const idade = lote ? idadeDias(lote.dataEntrada) : -1;
                      const status = idade < 0 ? "" : idade > p.dia ? "ok" : idade === p.dia ? "hoje" : "futuro";
                      return (
                        <tr key={p.dia} className={"border-b " + (status === "hoje" ? "bg-amber-500/10" : "")}>
                          <td className="py-2 font-mono font-bold">D{p.dia}</td>
                          <td className="py-2">{p.vacina}</td>
                          <td className="py-2 text-xs">{p.via}</td>
                          <td className="py-2 text-xs text-muted-foreground">{p.obs}</td>
                          <td className="py-2">
                            {status === "ok" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                            {status === "hoje" && <Badge className="bg-amber-500">HOJE</Badge>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-2">Boas práticas de aplicação via água</h3>
              <ul className="text-sm space-y-1.5 list-disc pl-5">
                <li>Jejum hídrico de 1-2h antes da vacinação (sede aumenta consumo)</li>
                <li>Água sem cloro/desinfetante — usar tiossulfato de sódio 50g/1000L se necessário</li>
                <li>Adicionar leite em pó desnatado 2g/L como estabilizante</li>
                <li>Consumir toda a água em ≤ 2h</li>
                <li>Liberar todos os bebedouros simultaneamente</li>
                <li>Anotar lote da vacina, hora, temperatura ambiente e operador</li>
              </ul>
            </Card>
          </TabsContent>

          {/* ===== Pré-Abate ===== */}
          <TabsContent value="abate" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Protocolo de pré-abate e apanha</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Jejum mal feito = peso de carcaça baixo + contaminação. Apanha errada = hematomas e DOA.
              </p>
              <div className="space-y-2">
                {PRE_ABATE.map((p, i) => (
                  <div key={i} className="flex items-start gap-3 p-2 border rounded">
                    <Badge variant="outline" className="font-mono shrink-0">
                      {p.dia === 0 ? "D ABATE" : `D${p.dia}`}
                    </Badge>
                    <span className="text-sm">{p.item}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-2">Tempo de jejum recomendado</h3>
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr><th className="text-left py-1">Distância frigorífico</th><th className="text-left">Jejum ração</th><th className="text-left">Jejum água</th></tr>
                </thead>
                <tbody>
                  <tr className="border-t"><td className="py-1.5">Até 50 km</td><td>8-10h</td><td>2-3h</td></tr>
                  <tr className="border-t"><td className="py-1.5">50-150 km</td><td>6-8h</td><td>1-2h</td></tr>
                  <tr className="border-t"><td className="py-1.5">&gt; 150 km</td><td>4-6h</td><td>até apanha</td></tr>
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground mt-2">
                Jejum total ideal (granja + transporte + espera) = 8-12h. Acima de 12h: perda de peso &gt;1% e bile na carcaça.
              </p>
            </Card>

            <Button onClick={() => toast.success("Protocolo registrado no diário")} className="w-full">
              <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar protocolo executado
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
