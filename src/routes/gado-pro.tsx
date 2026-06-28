import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAnimais, useFinanceiro } from "@/lib/state";
import { Beef, TrendingUp, Heart, Syringe, Calculator } from "lucide-react";

export const Route = createFileRoute("/gado-pro")({
  head: () => ({
    meta: [
      { title: "Gado Pro — AgroSítio" },
      { name: "description", content: "GMD, reprodução, sanitário e custo da arroba — gestão profissional do rebanho bovino." },
    ],
  }),
  component: GadoProPage,
});

function GadoProPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl md:text-4xl font-display font-bold flex items-center gap-2">
            <Beef className="h-7 w-7 text-primary" /> Gado Pro
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Performance, reprodução, sanitário e custo da arroba</p>
        </header>

        <Tabs defaultValue="gmd">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
            <TabsTrigger value="gmd"><TrendingUp className="h-4 w-4 mr-1.5" />GMD &amp; Abate</TabsTrigger>
            <TabsTrigger value="repro"><Heart className="h-4 w-4 mr-1.5" />Reprodução</TabsTrigger>
            <TabsTrigger value="sanit"><Syringe className="h-4 w-4 mr-1.5" />Sanitário</TabsTrigger>
            <TabsTrigger value="custo"><Calculator className="h-4 w-4 mr-1.5" />Custo @</TabsTrigger>
          </TabsList>

          <TabsContent value="gmd" className="mt-4"><GmdTab /></TabsContent>
          <TabsContent value="repro" className="mt-4"><ReproTab /></TabsContent>
          <TabsContent value="sanit" className="mt-4"><SanitarioTab /></TabsContent>
          <TabsContent value="custo" className="mt-4"><CustoArrobaTab /></TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

/* ---------- GMD + projeção de abate ---------- */
function GmdTab() {
  const { items: animais } = useAnimais();
  const ativos = animais.filter((a) => a.status === "ativo");

  const linhas = useMemo(() => {
    return ativos.map((a) => {
      const pes = [...(a.pesagens ?? [])].sort((x, y) => x.data.localeCompare(y.data));
      const primeiro = pes[0];
      const ultimo = pes[pes.length - 1];
      let gmd: number | null = null;
      if (primeiro && ultimo && primeiro !== ultimo) {
        const dias = (new Date(ultimo.data).getTime() - new Date(primeiro.data).getTime()) / 86400000;
        if (dias > 0) gmd = (ultimo.peso - primeiro.peso) / dias;
      }
      const pesoAtual = ultimo?.peso ?? a.pesoEntradaKg ?? 0;
      const META_ABATE = 540; // kg vivo
      const diasFalta = gmd && gmd > 0 ? Math.max(0, Math.ceil((META_ABATE - pesoAtual) / gmd)) : null;
      const arroba = (pesoAtual * 0.55) / 15; // 55% rendimento, @ = 15kg
      return { a, gmd, pesoAtual, diasFalta, arroba };
    });
  }, [ativos]);

  const mediaGmd = linhas.filter((l) => l.gmd).reduce((s, l) => s + (l.gmd || 0), 0) / Math.max(1, linhas.filter((l) => l.gmd).length);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Cabeças ativas" value={ativos.length.toString()} />
        <Kpi label="GMD médio" value={`${(mediaGmd || 0).toFixed(2)} kg/dia`} hint="Meta confinamento: 1,4 kg" />
        <Kpi label="Peso médio" value={`${(linhas.reduce((s, l) => s + l.pesoAtual, 0) / Math.max(1, linhas.length)).toFixed(0)} kg`} />
        <Kpi label="Arrobas estimadas" value={linhas.reduce((s, l) => s + l.arroba, 0).toFixed(1)} hint="55% rendimento" />
      </div>
      <Card className="p-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brinco</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Peso (kg)</TableHead>
                <TableHead className="text-right">GMD</TableHead>
                <TableHead className="text-right">@ atual</TableHead>
                <TableHead className="text-right">Dias p/ 540kg</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((l) => (
                <TableRow key={l.a.id}>
                  <TableCell className="font-medium">{l.a.brinco}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{l.a.categoria ?? "—"}</Badge></TableCell>
                  <TableCell className="text-right tabular-nums">{l.pesoAtual.toFixed(0)}</TableCell>
                  <TableCell className="text-right tabular-nums">{l.gmd ? `${l.gmd.toFixed(2)}` : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{l.arroba.toFixed(1)}</TableCell>
                  <TableCell className="text-right tabular-nums">{l.diasFalta != null ? l.diasFalta : "—"}</TableCell>
                </TableRow>
              ))}
              {linhas.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nenhum animal ativo. Cadastre no módulo Gado.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">Cálculo: GMD = (peso atual − primeiro peso) / dias. Arrobas = peso × 55% / 15.</p>
      </Card>
    </div>
  );
}

/* ---------- Reprodução ---------- */
function ReproTab() {
  const { items: animais } = useAnimais();
  const femeas = animais.filter((a) => a.sexo === "femea" && a.status === "ativo");

  // Próximos eventos: parto estimado 283 dias após IA/cobertura
  const linhas = femeas.map((a) => {
    const eventos = [...(a.reproducao ?? [])].sort((x, y) => y.data.localeCompare(x.data));
    const ultIA = eventos.find((e: any) => e.tipo === "ia" || e.tipo === "cobertura" || e.tipo === "IA");
    let partoPrev: string | null = null;
    let diagPrev: string | null = null;
    if (ultIA) {
      const base = new Date(ultIA.data);
      partoPrev = new Date(base.getTime() + 283 * 86400000).toISOString().slice(0, 10);
      diagPrev = new Date(base.getTime() + 30 * 86400000).toISOString().slice(0, 10);
    }
    return { a, ultIA, partoPrev, diagPrev };
  });

  const prenhes = linhas.filter((l) => l.ultIA && (l.ultIA as any).resultado === "prenhe").length;
  const taxa = femeas.length ? Math.round((prenhes / femeas.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Fêmeas ativas" value={femeas.length.toString()} />
        <Kpi label="Prenhez confirmada" value={prenhes.toString()} />
        <Kpi label="Taxa de prenhez" value={`${taxa}%`} hint="Meta: ≥ 70%" />
        <Kpi label="Gestação média" value="283 dias" hint="Padrão Zebu/Nelore" />
      </div>
      <Card className="p-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brinco</TableHead>
              <TableHead>Última IA / cobertura</TableHead>
              <TableHead>Diagnóstico (30d)</TableHead>
              <TableHead>Parto previsto</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((l) => (
              <TableRow key={l.a.id}>
                <TableCell className="font-medium">{l.a.brinco}</TableCell>
                <TableCell className="tabular-nums">{l.ultIA ? new Date(l.ultIA.data).toLocaleDateString("pt-BR") : "—"}</TableCell>
                <TableCell className="tabular-nums">{l.diagPrev ? new Date(l.diagPrev).toLocaleDateString("pt-BR") : "—"}</TableCell>
                <TableCell className="tabular-nums">{l.partoPrev ? new Date(l.partoPrev).toLocaleDateString("pt-BR") : "—"}</TableCell>
                <TableCell>
                  {l.ultIA ? (
                    <Badge variant={(l.ultIA as any).resultado === "prenhe" ? "default" : "secondary"}>{(l.ultIA as any).resultado ?? "aguardando"}</Badge>
                  ) : <span className="text-muted-foreground text-xs">sem IA registrada</span>}
                </TableCell>
              </TableRow>
            ))}
            {linhas.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Cadastre fêmeas no módulo Gado.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
      <Card className="p-4">
        <h3 className="font-display font-semibold mb-2">Protocolo IATF (referência)</h3>
        <ul className="text-sm space-y-1.5 text-muted-foreground">
          <li><strong className="text-foreground">D0:</strong> implante de progesterona + 2mg BE</li>
          <li><strong className="text-foreground">D8:</strong> remoção do implante + PGF2α + eCG + 1mg cipionato</li>
          <li><strong className="text-foreground">D10:</strong> IATF (48–54h após retirada)</li>
          <li><strong className="text-foreground">D40:</strong> diagnóstico de gestação (ultrassom)</li>
        </ul>
      </Card>
    </div>
  );
}

/* ---------- Sanitário ---------- */
const CALENDARIO_SANIT = [
  { idade: "0–7 dias", evento: "Cura de umbigo + brinco + colostro", obrig: true },
  { idade: "2–8 meses", evento: "Brucelose B19 (fêmeas)", obrig: true },
  { idade: "3–8 meses", evento: "Clostridioses (10 doses)", obrig: false },
  { idade: "4 meses", evento: "IBR/BVD + Leptospirose", obrig: false },
  { idade: "Maio/Nov", evento: "Aftosa (campanha oficial — estados endêmicos)", obrig: true },
  { idade: "Trimestral", evento: "Vermifugação estratégica + mosca-do-chifre", obrig: true },
  { idade: "Mensal", evento: "Controle de carrapato (banho/pulverização)", obrig: true },
  { idade: "Pré-cobertura", evento: "Reprodutivas: IBR/BVD/Lepto/Campilobacter", obrig: false },
];
function SanitarioTab() {
  return (
    <Card className="p-4">
      <h3 className="font-display font-semibold mb-3">Calendário sanitário bovino — referência</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Idade / Período</TableHead>
              <TableHead>Manejo</TableHead>
              <TableHead className="text-right">Obrigatório</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {CALENDARIO_SANIT.map((c, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{c.idade}</TableCell>
                <TableCell>{c.evento}</TableCell>
                <TableCell className="text-right">
                  {c.obrig ? <Badge>Sim</Badge> : <Badge variant="secondary">Recomendado</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-[11px] text-muted-foreground mt-3">Confirme calendário oficial com a Defesa Agropecuária do seu estado.</p>
    </Card>
  );
}

/* ---------- Custo da arroba ---------- */
function CustoArrobaTab() {
  const { items: fin } = useFinanceiro();
  const { items: animais } = useAnimais();
  const [cab, setCab] = useState(String(animais.filter((a) => a.status === "ativo").length || 100));
  const [pesoFinal, setPesoFinal] = useState("540");
  const [pesoInicial, setPesoInicial] = useState("350");
  const [periodo, setPeriodo] = useState("90");
  const [precoArroba, setPrecoArroba] = useState("310");
  const [custoExtra, setCustoExtra] = useState("0");
  const [tipo, setTipo] = useState<"confinamento" | "pasto">("confinamento");

  const n = (v: string) => Number(v) || 0;
  const gpt = Math.max(0, n(pesoFinal) - n(pesoInicial)); // kg vivo
  const arrobasProd = (gpt * 0.55) / 15; // por cabeça
  const consumoMS = tipo === "confinamento" ? 0.022 * ((n(pesoInicial) + n(pesoFinal)) / 2) : 0.018 * ((n(pesoInicial) + n(pesoFinal)) / 2);
  const racaoTotal = consumoMS * n(periodo) * n(cab);
  const custoRacao = racaoTotal * (tipo === "confinamento" ? 0.95 : 0.45); // R$/kg MS
  const totDespMes = fin.filter((f) => f.tipo === "despesa").reduce((s, f) => s + f.valor, 0);
  const custoOper = totDespMes * (n(periodo) / 30) * 0.4; // 40% das despesas alocado ao gado (estimado)
  const custoTotal = custoRacao + custoOper + n(custoExtra);
  const arrobasTotais = arrobasProd * n(cab);
  const custoArroba = arrobasTotais > 0 ? custoTotal / arrobasTotais : 0;
  const receita = arrobasTotais * n(precoArroba);
  const lucro = receita - custoTotal;
  const margem = receita > 0 ? (lucro / receita) * 100 : 0;

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-3">
        <h3 className="font-display font-semibold">Parâmetros do lote</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Cabeças"><Input type="number" value={cab} onChange={(e) => setCab(e.target.value)} /></Field>
          <Field label="Peso inicial (kg)"><Input type="number" value={pesoInicial} onChange={(e) => setPesoInicial(e.target.value)} /></Field>
          <Field label="Peso final (kg)"><Input type="number" value={pesoFinal} onChange={(e) => setPesoFinal(e.target.value)} /></Field>
          <Field label="Período (dias)"><Input type="number" value={periodo} onChange={(e) => setPeriodo(e.target.value)} /></Field>
          <Field label="Tipo">
            <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="confinamento">Confinamento</SelectItem>
                <SelectItem value="pasto">Pasto + suplementação</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Preço @ (R$)"><Input type="number" value={precoArroba} onChange={(e) => setPrecoArroba(e.target.value)} /></Field>
          <Field label="Custos extras (R$)"><Input type="number" value={custoExtra} onChange={(e) => setCustoExtra(e.target.value)} /></Field>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Arrobas produzidas" value={arrobasTotais.toFixed(1)} hint={`${arrobasProd.toFixed(2)} @ / cabeça`} />
        <Kpi label="Custo / @" value={`R$ ${custoArroba.toFixed(2)}`} hint="produção" />
        <Kpi label="Receita estimada" value={`R$ ${receita.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} />
        <Kpi label="Lucro / margem" value={`R$ ${lucro.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} hint={`${margem.toFixed(1)}%`} />
      </div>

      <Card className="p-4 text-sm space-y-2">
        <div className="font-display font-semibold">Composição do custo</div>
        <div className="grid grid-cols-2 gap-2">
          <Info2 label="Ração / suplemento" value={`R$ ${custoRacao.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} sub={`${racaoTotal.toFixed(0)} kg MS`} />
          <Info2 label="Operacional (mão de obra, sanidade)" value={`R$ ${custoOper.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} sub="40% das despesas do período" />
          <Info2 label="Extras informados" value={`R$ ${n(custoExtra).toLocaleString("pt-BR")}`} sub="combustível, transporte, depreciação" />
          <Info2 label="Custo total" value={`R$ ${custoTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} sub="período inteiro" />
        </div>
        <p className="text-[11px] text-muted-foreground pt-1">Consumo MS: 2,2% PV (confinamento) ou 1,8% PV (pasto). Custo MS: R$ 0,95/kg conf. ou R$ 0,45/kg pasto. Ajuste pela ração real cadastrada na Fábrica.</p>
      </Card>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-2xl font-display font-bold tabular-nums mt-1">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </Card>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
function Info2({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-muted/30 rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display font-bold tabular-nums">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
