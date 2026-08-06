import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLotes, useFinanceiro } from "@/lib/state";
import { fechamentoLote } from "@/lib/fechamentoLote";
import type { Linhagem } from "@/lib/linhagens";
import { baixarCSV } from "@/lib/exportar";
import { Wallet, Download, TrendingUp, Bird, Percent, Scale, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

export const Route = createFileRoute("/financeiro-lote")({
  head: () => ({
    meta: [
      { title: "Painel Financeiro do Lote — AgroSítio" },
      { name: "description", content: "Custo por ave, custo por kg, receita, participação do produtor e lucro projetado do lote de frangos em tempo real." },
      { property: "og:title", content: "Painel Financeiro do Lote — AgroSítio" },
      { property: "og:description", content: "Custo por ave, custo por kg, receita e lucro projetado do lote de frangos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FinanceiroLotePage,
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const brl2 = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 3, maximumFractionDigits: 3 });

type Params = { precoPintinho: number; precoRacaoKg: number; outrosCustos: number; precoKgVivo: number; participacaoPct: number; linhagem: Linhagem };
const PADRAO: Params = { precoPintinho: 2.8, precoRacaoKg: 2.5, outrosCustos: 0, precoKgVivo: 5.5, participacaoPct: 14, linhagem: "cobb500" };
const KEY = "agro:financeiro-lote:params";

function FinanceiroLotePage() {
  const [lotes] = useLotes();
  const [fin] = useFinanceiro();
  const [loteId, setLoteId] = useState<string>("");
  const [p, setP] = useState<Params>(PADRAO);

  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setP({ ...PADRAO, ...JSON.parse(raw) }); } catch { /* ignore */ }
  }, []);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ } }, [p]);
  useEffect(() => {
    if (!loteId && lotes.length) setLoteId(lotes.find((l) => !l.encerrado)?.id ?? lotes[0]!.id);
  }, [lotes, loteId]);

  const lote = lotes.find((l) => l.id === loteId);
  const set = (k: keyof Params) => (v: string) => setP((s) => ({ ...s, [k]: k === "linhagem" ? (v as Linhagem) : Number(v.replace(",", ".")) || 0 }));

  const calc = useMemo(() => {
    if (!lote) return null;
    const f = fechamentoLote({ ...lote, precoKgVivo: p.precoKgVivo }, p.linhagem, {
      precoPintinho: p.precoPintinho, precoRacaoKg: p.precoRacaoKg, outrosCustos: p.outrosCustos,
    });
    // Despesas reais lançadas no financeiro para o período do lote
    const inicio = lote.dataEntrada;
    const reais = fin.filter((l) => l.tipo === "despesa" && l.data >= inicio && (l.modulo === "granja" || !l.modulo));
    const despesasReais = reais.reduce((s, l) => s + l.valor, 0);
    const pesoKg = f.pesoVivoKg > 0 ? f.pesoVivoKg : (f.vivas * f.pesoMetaG) / 1000;
    const custoPorAve = f.vivas > 0 ? f.custoTotal / f.vivas : 0;
    const custoPorKg = pesoKg > 0 ? f.custoTotal / pesoKg : 0;
    const participacao = f.receitaEstimada * (p.participacaoPct / 100);
    const lucroProdutor = participacao - (f.custoRacao > 0 && p.precoRacaoKg === 0 ? 0 : 0) - f.custoOutros;
    const breakEvenKg = pesoKg > 0 ? f.custoTotal / pesoKg : 0;
    return { f, despesasReais, pesoKg, custoPorAve, custoPorKg, participacao, lucroProdutor, breakEvenKg };
  }, [lote, p, fin]);

  const chart = calc ? [
    { name: "Pintinhos", valor: calc.f.custoPintinhos },
    { name: "Ração", valor: calc.f.custoRacao },
    { name: "Outros", valor: calc.f.custoOutros },
    { name: "Lançado", valor: calc.despesasReais },
  ].filter((d) => d.valor > 0) : [];

  const exportar = () => {
    if (!lote || !calc) return;
    baixarCSV(`financeiro-lote-${lote.numero}`, [{
      lote: lote.numero, data_entrada: lote.dataEntrada, idade_dias: calc.f.idade,
      alojadas: calc.f.inicial, vivas: calc.f.vivas, mortalidade_pct: calc.f.mortPct.toFixed(2),
      peso_medio_g: calc.f.pesoMedioG ?? "", ca_estimada: calc.f.caEstimado.toFixed(3),
      peso_vivo_kg: calc.pesoKg.toFixed(1), custo_total: calc.f.custoTotal.toFixed(2),
      custo_por_ave: calc.custoPorAve.toFixed(3), custo_por_kg: calc.custoPorKg.toFixed(3),
      receita_estimada: calc.f.receitaEstimada.toFixed(2), participacao_pct: p.participacaoPct,
      ganho_produtor: calc.participacao.toFixed(2), lucro_liquido: calc.f.lucroLiquido.toFixed(2),
      margem_pct: calc.f.margemPct.toFixed(2),
    }]);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-4xl font-display font-bold">Painel financeiro do lote</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">Custo por ave, custo por kg, participação e lucro projetado em tempo real.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportar} disabled={!calc}><Download className="h-4 w-4 mr-1" /> Exportar CSV</Button>
            <Button asChild size="sm" variant="secondary"><Link to="/custos">Custos por lote <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
          </div>
        </header>

        {lotes.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">Cadastre um lote na granja para ver a análise financeira.</Card>
        ) : (
          <>
            <Card className="p-4 md:p-5" style={{ background: "var(--gradient-surface)" }}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label className="text-xs">Lote</Label>
                  <Select value={loteId} onValueChange={setLoteId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {lotes.map((l) => <SelectItem key={l.id} value={l.id}>Lote {l.numero}{l.encerrado ? " (encerrado)" : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Linhagem</Label>
                  <Select value={p.linhagem} onValueChange={set("linhagem")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cobb500">Cobb 500</SelectItem>
                      <SelectItem value="ross308">Ross 308</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Campo label="Preço do pintinho (R$)" value={p.precoPintinho} onChange={set("precoPintinho")} />
                <Campo label="Preço da ração (R$/kg)" value={p.precoRacaoKg} onChange={set("precoRacaoKg")} />
                <Campo label="Preço do kg vivo (R$)" value={p.precoKgVivo} onChange={set("precoKgVivo")} />
                <Campo label="Outros custos (R$)" value={p.outrosCustos} onChange={set("outrosCustos")} />
                <Campo label="Sua participação (%)" value={p.participacaoPct} onChange={set("participacaoPct")} />
              </div>
            </Card>

            {calc && lote && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <KPI label="Custo por ave" value={brl(calc.custoPorAve)} hint={`${calc.f.vivas.toLocaleString("pt-BR")} aves vivas`} icon={Bird} />
                  <KPI label="Custo por kg vivo" value={brl2(calc.custoPorKg)} hint={`${calc.pesoKg.toFixed(0)} kg estimados`} icon={Scale} />
                  <KPI label="Receita estimada" value={brl(calc.f.receitaEstimada)} hint={`${brl(p.precoKgVivo)}/kg`} icon={TrendingUp} />
                  <KPI label={`Seu ganho (${p.participacaoPct}%)`} value={brl(calc.participacao)} hint="Sobre a receita do lote" icon={Wallet} tone />
                </div>

                <div className="grid lg:grid-cols-3 gap-4">
                  <Card className="lg:col-span-2 p-5" style={{ background: "var(--gradient-surface)" }}>
                    <h2 className="font-display font-semibold text-lg mb-3">Composição do custo</h2>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chart}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis dataKey="name" fontSize={11} />
                          <YAxis fontSize={11} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                          <Tooltip formatter={(v: any) => brl(Number(v))} />
                          <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                            {chart.map((_, i) => <Cell key={i} fill={i === 1 ? "hsl(var(--primary))" : "hsl(var(--accent))"} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Card className="p-5 space-y-2" style={{ background: "var(--gradient-surface)" }}>
                    <h2 className="font-display font-semibold text-lg mb-2">Resultado projetado</h2>
                    <Linha k="Custo total" v={brl(calc.f.custoTotal)} />
                    <Linha k="Despesas lançadas" v={brl(calc.despesasReais)} />
                    <Linha k="Receita do lote" v={brl(calc.f.receitaEstimada)} />
                    <Linha k={`Sua participação (${p.participacaoPct}%)`} v={brl(calc.participacao)} destaque />
                    <Linha k="Lucro líquido (integração)" v={brl(calc.f.lucroLiquido)} />
                    <Linha k="Margem" v={`${calc.f.margemPct.toFixed(1)}%`} />
                    <Linha k="Break-even (custo/kg)" v={brl2(calc.breakEvenKg)} />
                  </Card>
                </div>

                <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-display font-semibold text-lg flex items-center gap-2"><Percent className="h-4 w-4 text-primary" /> Indicadores zootécnicos</h2>
                    <Badge variant="secondary">Dia {calc.f.idade} de {calc.f.diasPrevistos}</Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Mini k="Viabilidade" v={`${calc.f.viabilidade.toFixed(2)}%`} />
                    <Mini k="Mortalidade" v={`${calc.f.mortPct.toFixed(2)}%`} />
                    <Mini k="Peso médio" v={calc.f.pesoMedioG ? `${Math.round(calc.f.pesoMedioG)} g` : "—"} />
                    <Mini k="CA estimada" v={calc.f.caEstimado.toFixed(3)} />
                    <Mini k="Ração consumida" v={`${Math.round(calc.f.racaoConsumidaKg).toLocaleString("pt-BR")} kg`} />
                    <Mini k="Ração restante" v={`${Math.round(calc.f.racaoRestanteKg).toLocaleString("pt-BR")} kg`} />
                    <Mini k="Peso vivo total" v={`${Math.round(calc.pesoKg).toLocaleString("pt-BR")} kg`} />
                    <Mini k="Lucro por ave" v={brl(calc.f.lucroPorAve)} />
                  </div>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function Campo({ label, value, onChange }: { label: string; value: number; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input inputMode="decimal" value={String(value)} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function KPI({ label, value, hint, icon: Icon, tone }: { label: string; value: string; hint: string; icon: any; tone?: boolean }) {
  return (
    <Card className={`p-4 ${tone ? "border-primary/40 bg-primary/5" : ""}`}>
      <div className="flex items-center gap-2 text-muted-foreground text-xs"><Icon className="h-4 w-4 text-primary" /> {label}</div>
      <p className="font-display text-xl md:text-2xl font-bold mt-1.5">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
    </Card>
  );
}

function Linha({ k, v, destaque }: { k: string; v: string; destaque?: boolean }) {
  return (
    <div className={`flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0 ${destaque ? "font-semibold text-primary" : ""}`}>
      <span className={destaque ? "" : "text-muted-foreground"}>{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <p className="text-[11px] text-muted-foreground">{k}</p>
      <p className="font-display font-bold text-base mt-0.5">{v}</p>
    </div>
  );
}
