import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useLotes, useEstoque } from "@/lib/state";
import { ArrowLeft, Plus, FileText, Trash2 } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { gerarRelatorioLote } from "@/lib/pdf";
import { FechamentoLoteCard } from "@/components/FechamentoLoteCard";
import { toast } from "sonner";
import { addDias, diffDias, fmtData, hojeISO, parseData } from "@/lib/data";
import { calcularResumoLote } from "@/lib/granja";
import { refPesoG } from "@/lib/silo";

export const Route = createFileRoute("/granja/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes do Lote — AgroSítio" },
      { name: "description", content: "Lote de frango: mortalidade diária, peso médio, ração, água e conversão alimentar." },
      { property: "og:title", content: "Detalhes do Lote — AgroSítio" },
      { property: "og:description", content: "Lote de frango: mortalidade diária, peso médio, ração, água e conversão alimentar." },
    ],
  }),
  component: LoteDetalhe,
  notFoundComponent: () => <AppShell><p>Lote não encontrado.</p></AppShell>,
});

function LoteDetalhe() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [lotes, setLotes] = useLotes();
  const [estoque] = useEstoque();
  const lote = lotes.find((l) => l.id === id);
  const estoqueRacaoKg = estoque.filter((i) => i.categoria === "racao" && i.loteId === id).reduce((s, i) => s + (i.quantidade || 0), 0);

  const [entry, setEntry] = useState({
    date: hojeISO(),
    mortalidade: 0,
    eliminados: 0,
    pesoMedioG: undefined as number | undefined,
    observacoes: "",
  });

  if (!lote) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Lote não encontrado.</p>
        <Button asChild variant="link"><Link to="/granja">Voltar</Link></Button>
      </AppShell>
    );
  }

  const resumo = calcularResumoLote(lote);
  const totalMort = resumo.mortalidade;
  const totalElim = resumo.eliminados;
  const vivas = resumo.vivas;
  // Idade começa em D0 (dia do alojamento)
  const dias = Math.max(0, diffDias(lote.dataEntrada));
  const ultPeso = resumo.ultimaPesagem?.pesoG ?? 0;
  const pesoTotalKg = (vivas * ultPeso) / 1000;
  const previsao = addDias(lote.dataEntrada, lote.previsaoAbateDias);

  const adicionar = () => {
    const data = parseData(entry.date);
    const entrada = parseData(lote.dataEntrada);
    const hoje = parseData(hojeISO());
    if (!data || !entrada || !hoje || data < entrada || data > hoje) {
      toast.error("A data deve ficar entre o alojamento e hoje");
      return;
    }
    if (entry.mortalidade < 0 || entry.eliminados < 0 || entry.mortalidade + entry.eliminados > vivas) {
      toast.error("Confira a quantidade de mortalidade e eliminados");
      return;
    }
    if (entry.pesoMedioG !== undefined && (entry.pesoMedioG < 20 || entry.pesoMedioG > 6000)) {
      toast.error("Informe um peso médio entre 20 g e 6.000 g");
      return;
    }
    const jaExiste = lote.entries.some((e) => e.date === entry.date);
    setLotes((prev) => prev.map((l) => l.id === id ? {
      ...l,
      entries: jaExiste
        ? l.entries.map((e) => e.date === entry.date ? { ...entry } : e)
        : [...l.entries, { ...entry }].sort((a, b) => a.date.localeCompare(b.date)),
    } : l));
    setEntry({ ...entry, mortalidade: 0, eliminados: 0, pesoMedioG: undefined, observacoes: "" });
    toast.success(jaExiste ? "Lançamento do dia atualizado" : "Lançamento registrado");
  };

  const removerEntry = (idx: number) => {
    setLotes((prev) => prev.map((l) => l.id === id ? { ...l, entries: l.entries.filter((_, i) => i !== idx) } : l));
  };

  const encerrar = () => {
    if (!confirm("Encerrar este lote?")) return;
    setLotes((prev) => prev.map((l) => l.id === id ? { ...l, encerrado: !l.encerrado } : l));
  };

  const removerLote = () => {
    if (!confirm("Excluir este lote?")) return;
    setLotes((prev) => prev.filter((l) => l.id !== id));
    navigate({ to: "/granja" });
  };

  const chartData = [...lote.entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => {
      const idade = Math.max(0, diffDias(lote.dataEntrada, e.date));
      return { dia: `D${idade}`, peso: e.pesoMedioG ?? null, esperado: Math.round(refPesoG(idade, "ross_ap95", "misto")), mort: e.mortalidade };
    });

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2"><Link to="/granja"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link></Button>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-display font-bold">Lote {lote.numero}</h1>
                {lote.encerrado ? <Badge variant="secondary">Encerrado</Badge> : <Badge>Ativo</Badge>}
              </div>
              <p className="text-muted-foreground mt-1">Entrada {fmtData(lote.dataEntrada)} · D{dias} · {lote.integradora}</p>
              <p className="text-xs text-muted-foreground">Previsão de abate: {fmtData(previsao)}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => gerarRelatorioLote(lote)}><FileText className="h-4 w-4 mr-1" /> PDF</Button>
              <Button variant="outline" onClick={encerrar}>{lote.encerrado ? "Reabrir" : "Encerrar"}</Button>
              <Button variant="ghost" size="icon" onClick={removerLote}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI label="Inicial" value={lote.quantidadeInicial.toLocaleString("pt-BR")} />
          <KPI label="Vivas" value={vivas.toLocaleString("pt-BR")} />
          <KPI label="Mort.+Elim." value={`${((totalMort + totalElim) / lote.quantidadeInicial * 100).toFixed(2)}%`} />
          <KPI label="Peso esperado" value={`${resumo.pesoEsperadoHojeG.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} g`} />
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="p-5 lg:col-span-2" style={{ background: "var(--gradient-surface)" }}>
            <h2 className="font-display font-semibold text-lg mb-3">Linha do tempo</h2>
            {chartData.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="dia" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="peso" stroke="var(--primary)" strokeWidth={2.5} name="Peso (g)" />
                  <Line type="monotone" dataKey="esperado" stroke="var(--muted-foreground)" strokeDasharray="5 5" strokeWidth={2} name="Esperado (g)" />
                  <Line type="monotone" dataKey="mort" stroke="var(--destructive)" strokeWidth={2} name="Mortalidade" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-12 text-center">Sem lançamentos ainda.</p>
            )}
          </Card>

          <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
            <h2 className="font-display font-semibold text-lg mb-3">Lançamento diário</h2>
            <div className="space-y-3">
              <Field label="Data"><Input type="date" value={entry.date} onChange={(e) => setEntry({ ...entry, date: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Mortalidade">
                  <Input type="number" inputMode="numeric" min={0} value={entry.mortalidade || ""}
                    onChange={(e) => setEntry({ ...entry, mortalidade: Number(e.target.value) || 0 })} placeholder="0" />
                </Field>
                <Field label="Eliminados">
                  <Input type="number" inputMode="numeric" min={0} value={entry.eliminados || ""}
                    onChange={(e) => setEntry({ ...entry, eliminados: Number(e.target.value) || 0 })} placeholder="0" />
                </Field>
              </div>
              <Field label="Peso médio (g)">
                <Input type="number" inputMode="decimal" min={0} value={entry.pesoMedioG ?? ""}
                  onChange={(e) => setEntry({ ...entry, pesoMedioG: e.target.value ? Number(e.target.value) : undefined })} placeholder="Ex: 1850" />
              </Field>
              <Field label="Observações"><Textarea rows={2} value={entry.observacoes} onChange={(e) => setEntry({ ...entry, observacoes: e.target.value })} /></Field>
              <Button onClick={adicionar} className="w-full"><Plus className="h-4 w-4 mr-1" /> Lançar</Button>
            </div>
          </Card>
        </div>

        <ConfigRemuneracao loteId={lote.id} vivas={vivas} pesoVivoKg={pesoTotalKg} />

        <FechamentoLoteCard lote={lote} estoqueRacaoKg={estoqueRacaoKg} />

        <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
          <h2 className="font-display font-semibold text-lg mb-3">Histórico</h2>
          {lote.entries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhum lançamento.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase tracking-wider">
                  <tr className="border-b border-border">
                    <th className="text-left py-2">Data</th>
                    <th className="text-right py-2">Mort.</th>
                    <th className="text-right py-2">Elim.</th>
                    <th className="text-right py-2">Peso (g)</th>
                    <th className="text-left py-2 pl-4">Obs</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {[...lote.entries].sort((a, b) => b.date.localeCompare(a.date)).map((e, idx) => {
                    const realIdx = lote.entries.indexOf(e);
                    return (
                      <tr key={idx} className="border-b border-border/50">
                        <td className="py-2">{fmtData(e.date)}</td>
                        <td className="py-2 text-right tabular-nums">{e.mortalidade}</td>
                        <td className="py-2 text-right tabular-nums">{e.eliminados ?? 0}</td>
                        <td className="py-2 text-right tabular-nums">{e.pesoMedioG ?? "—"}</td>
                        <td className="py-2 pl-4 text-muted-foreground">{e.observacoes ?? ""}</td>
                        <td className="py-2 text-right"><Button size="icon" variant="ghost" onClick={() => removerEntry(realIdx)}><Trash2 className="h-3.5 w-3.5" /></Button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3" style={{ background: "var(--gradient-surface)" }}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display font-bold text-xl tabular-nums">{value}</p>
    </Card>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}

function ConfigRemuneracao({ loteId, vivas, pesoVivoKg }: { loteId: string; vivas: number; pesoVivoKg: number }) {
  const readNum = (k: string, def: number) => {
    if (typeof window === "undefined") return def;
    const v = localStorage.getItem(`granja:${k}:${loteId}`);
    return v !== null && v !== "" ? Number(v) : def;
  };
  const readStr = (k: string) => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(`granja:${k}:${loteId}`) || "";
  };
  const [precoAve, setPrecoAve] = useState(readNum("precoAve", 2.14));
  const [pctIntegrado, setPctIntegrado] = useState(readNum("pctIntegrado", 14));
  const [areaM2, setAreaM2] = useState(readNum("areaM2", 0));
  const [custoEnergia, setCustoEnergia] = useState(readNum("custoEnergia", 0));
  const [custoCama, setCustoCama] = useState(readNum("custoCama", 0));
  const [custoMaoObra, setCustoMaoObra] = useState(readNum("custoMaoObra", 0));
  const [custoOutros, setCustoOutros] = useState(readNum("custoOutros", 0));
  const [abateReal, setAbateReal] = useState(readStr("abateReal"));

  const save = () => {
    const set = (k: string, v: string | number) => {
      if (v === "" || v === 0) localStorage.removeItem(`granja:${k}:${loteId}`);
      else localStorage.setItem(`granja:${k}:${loteId}`, String(v));
    };
    set("precoAve", precoAve);
    set("pctIntegrado", pctIntegrado);
    set("areaM2", areaM2);
    set("custoEnergia", custoEnergia);
    set("custoCama", custoCama);
    set("custoMaoObra", custoMaoObra);
    set("custoOutros", custoOutros);
    if (abateReal) localStorage.setItem(`granja:abateReal:${loteId}`, abateReal);
    else localStorage.removeItem(`granja:abateReal:${loteId}`);
    toast.success("Configurações salvas");
  };

  const ganhoFrig = vivas * precoAve;
  const receita = ganhoFrig * (pctIntegrado / 100);
  const custos = custoEnergia + custoCama + custoMaoObra + custoOutros;
  const lucro = receita - custos;
  const densidade = areaM2 > 0 ? vivas / areaM2 : 0;

  return (
    <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
      <h2 className="font-display font-semibold text-lg mb-1">Configurações & remuneração</h2>
      <p className="text-xs text-muted-foreground mb-4">Usado no PDF do lote para calcular sua parte do ganho e recomendações.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Field label="Preço/ave frigorífico (R$)">
          <Input type="number" step="0.01" value={precoAve || ""} onChange={(e) => setPrecoAve(Number(e.target.value) || 0)} placeholder="2.14" />
        </Field>
        <Field label="% do integrado">
          <Input type="number" step="0.1" value={pctIntegrado || ""} onChange={(e) => setPctIntegrado(Number(e.target.value) || 0)} placeholder="14" />
        </Field>
        <Field label="Área útil (m²)">
          <Input type="number" value={areaM2 || ""} onChange={(e) => setAreaM2(Number(e.target.value) || 0)} placeholder="1200" />
        </Field>
        <Field label="Data real do abate">
          <Input type="date" value={abateReal} onChange={(e) => setAbateReal(e.target.value)} />
        </Field>
      </div>

      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Custos do granjeiro (R$)</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Field label="Energia elétrica">
          <Input type="number" value={custoEnergia || ""} onChange={(e) => setCustoEnergia(Number(e.target.value) || 0)} placeholder="0" />
        </Field>
        <Field label="Cama / maravalha">
          <Input type="number" value={custoCama || ""} onChange={(e) => setCustoCama(Number(e.target.value) || 0)} placeholder="0" />
        </Field>
        <Field label="Mão de obra">
          <Input type="number" value={custoMaoObra || ""} onChange={(e) => setCustoMaoObra(Number(e.target.value) || 0)} placeholder="0" />
        </Field>
        <Field label="Outros">
          <Input type="number" value={custoOutros || ""} onChange={(e) => setCustoOutros(Number(e.target.value) || 0)} placeholder="0" />
        </Field>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <MiniStat label="Ganho frigorífico" value={`R$ ${ganhoFrig.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`} sub={`${vivas.toLocaleString("pt-BR")} × R$ ${precoAve.toFixed(2)}`} />
        <MiniStat label={`Sua parte (${pctIntegrado.toFixed(1)}%)`} value={`R$ ${receita.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`} tone="primary" />
        <MiniStat label="Lucro líquido" value={`R$ ${lucro.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`} sub={`− R$ ${custos.toLocaleString("pt-BR")} custos`} tone={lucro >= 0 ? "ok" : "bad"} />
        <MiniStat label="Densidade" value={densidade > 0 ? `${densidade.toFixed(1)} aves/m²` : "—"} sub={areaM2 > 0 ? `${areaM2} m²` : "cadastre área"} />
      </div>

      <div className="flex gap-2">
        <Button onClick={save}>Salvar configurações</Button>
        <span className="text-xs text-muted-foreground self-center">Peso vivo atual: {pesoVivoKg.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg · R$/kg estimado: R$ {pesoVivoKg > 0 ? (receita / pesoVivoKg).toFixed(3) : "—"}</span>
      </div>
    </Card>
  );
}

function MiniStat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "primary" | "ok" | "bad" }) {
  const color = tone === "primary" ? "text-primary" : tone === "ok" ? "text-emerald-500" : tone === "bad" ? "text-destructive" : "";
  return (
    <div className="bg-muted/40 rounded-md p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-display font-bold text-lg tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
