import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useLotes } from "@/lib/state";
import { uid } from "@/lib/storage";
import { Bird, Plus, FileText, Trash2, ArrowRight, Scale, Trophy, ClipboardCheck, Syringe, BarChart3, BookOpen, Wind, History, Stethoscope, Activity, Target, Droplets, Wheat, Zap } from "lucide-react";
import { gerarRelatorioLote } from "@/lib/pdf";
import { toast } from "sonner";
import { diffDias, fmtData, hojeISO } from "@/lib/data";

export const Route = createFileRoute("/granja/")({
  head: () => ({
    meta: [
      { title: "Granja de Frango — AgroSítio" },
      { name: "description", content: "Gestão de lotes de frango de corte: mortalidade, ração, água, peso e CA." },
      { property: "og:title", content: "Granja de Frango — AgroSítio" },
      { property: "og:description", content: "Gestão de lotes de frango de corte: mortalidade, ração, água, peso e CA." },
    ],
  }),
  component: GranjaPage,
});

function GranjaPage() {
  const [lotes, setLotes] = useLotes();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    numero: "",
    dataEntrada: hojeISO(),
    quantidadeInicial: 28000,
    integradora: "Bello Alimentos",
    previsaoAbateDias: 42,
    percentualLucro: 10,
  });

  const criar = () => {
    if (!form.numero) { toast.error("Informe o número do lote"); return; }
    setLotes((prev) => [
      { id: uid(), ...form, entries: [] },
      ...prev,
    ]);
    setOpen(false);
    setForm({ ...form, numero: "" });
    toast.success("Lote criado");
  };

  const remover = (id: string) => {
    if (!confirm("Remover este lote?")) return;
    setLotes((prev) => prev.filter((l) => l.id !== id));
  };

  const ativos = lotes.filter((l) => !l.encerrado);
  const kpis = useMemo(() => {
    let totalAves = 0, vivas = 0, mortas = 0, somaPeso = 0, comPeso = 0, diasSoma = 0;
    for (const l of ativos) {
      const mort = l.entries.reduce((s, e) => s + e.mortalidade, 0);
      totalAves += l.quantidadeInicial;
      mortas += mort;
      vivas += l.quantidadeInicial - mort;
      const ult = [...l.entries].reverse().find((e) => e.pesoMedioG)?.pesoMedioG;
      if (ult) { somaPeso += ult; comPeso++; }
      diasSoma += Math.max(0, diffDias(l.dataEntrada));
    }
    return {
      ativos: ativos.length,
      vivas,
      totalAves,
      mortalidade: totalAves ? (mortas / totalAves) * 100 : 0,
      pesoMedio: comPeso ? somaPeso / comPeso : 0,
      idadeMedia: ativos.length ? diasSoma / ativos.length : 0,
    };
  }, [ativos]);

  const atalhos = [
    { to: "/pesagem-pro", label: "Pesagem Pro", icon: Scale },
    { to: "/excelencia-lote", label: "Excelência", icon: Trophy },
    { to: "/checklist-granja", label: "Checklist", icon: ClipboardCheck },
    { to: "/calendario-sanitario", label: "Sanitário", icon: Syringe },
    { to: "/manejo", label: "Manejo", icon: BookOpen },
    { to: "/ambiencia", label: "Ambiência", icon: Wind },
    { to: "/automacoes", label: "Automação", icon: Zap },
    { to: "/analise-aves", label: "IA Aves", icon: Stethoscope },
    { to: "/comparativo-lotes", label: "Comparativo", icon: BarChart3 },
    { to: "/historico-lotes", label: "Histórico", icon: History },
    { to: "/entregas-racao", label: "Ração", icon: Wheat },
  ];


  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-primary/80 font-semibold mb-1">Avicultura de Corte</div>
            <h1 className="text-3xl md:text-4xl font-display font-bold">Granja</h1>
            <p className="text-muted-foreground mt-1">Manejo · Nutrição · Sanidade · Resultados</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Novo lote</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Cadastrar novo lote</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Número do lote"><Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} placeholder="Ex: 045" /></Field>
                <Field label="Data de entrada"><Input type="date" value={form.dataEntrada} onChange={(e) => setForm({ ...form, dataEntrada: e.target.value })} /></Field>
                <Field label="Qtd. inicial (aves)"><Input type="number" value={form.quantidadeInicial} onChange={(e) => setForm({ ...form, quantidadeInicial: +e.target.value })} /></Field>
                <Field label="Integradora"><Input value={form.integradora} onChange={(e) => setForm({ ...form, integradora: e.target.value })} /></Field>
                <Field label="Previsão abate (dias)"><Input type="number" value={form.previsaoAbateDias} onChange={(e) => setForm({ ...form, previsaoAbateDias: +e.target.value })} /></Field>
                <Field label="% lucro granjeiro"><Input type="number" value={form.percentualLucro} onChange={(e) => setForm({ ...form, percentualLucro: +e.target.value })} /></Field>
              </div>
              <DialogFooter><Button onClick={criar}>Criar lote</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        {ativos.length > 0 && (
          <Card className="p-5" style={{ background: "var(--gradient-surface)", boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg grid place-items-center" style={{ background: "var(--gradient-primary)" }}>
                  <Activity className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-base leading-tight">Painel Operacional</h2>
                  <p className="text-[11px] text-muted-foreground">{kpis.ativos} lote{kpis.ativos > 1 ? "s" : ""} em produção · idade média {kpis.idadeMedia.toFixed(0)}d</p>
                </div>
              </div>
              <Badge variant="outline" className="border-primary/40 text-primary">Ao vivo</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiTile icon={Bird} label="Aves vivas" value={kpis.vivas.toLocaleString("pt-BR")} sub={`de ${kpis.totalAves.toLocaleString("pt-BR")}`} />
              <KpiTile icon={Target} label="Mortalidade" value={`${kpis.mortalidade.toFixed(2)}%`} sub={kpis.mortalidade < 3 ? "Excelente" : kpis.mortalidade < 5 ? "Bom" : "Atenção"} tone={kpis.mortalidade < 3 ? "ok" : kpis.mortalidade < 5 ? "warn" : "bad"} />
              <KpiTile icon={Scale} label="Peso médio" value={kpis.pesoMedio ? `${kpis.pesoMedio.toFixed(0)} g` : "—"} sub="última pesagem" />
              <KpiTile icon={Droplets} label="Idade média" value={`${kpis.idadeMedia.toFixed(0)} d`} sub="dias de vida" />
            </div>
          </Card>
        )}

        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 font-semibold mb-2 px-1">Módulos técnicos</div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {atalhos.map((a) => {
              const Icon = a.icon;
              return (
                <Link key={a.to} to={a.to} className="group flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-card/60 border border-border hover:border-primary/50 hover:bg-card transition-all">
                  <div className="h-9 w-9 rounded-lg grid place-items-center bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-[11px] font-medium text-center leading-tight">{a.label}</span>
                </Link>
              );
            })}
          </div>
        </div>


        {lotes.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <Bird className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">Nenhum lote cadastrado</p>
            <p className="text-sm text-muted-foreground mb-4">Comece criando o primeiro lote da sua granja.</p>
            <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Criar primeiro lote</Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {lotes.map((l) => {
              const mort = l.entries.reduce((s, e) => s + e.mortalidade, 0);
              const vivas = l.quantidadeInicial - mort;
              const ultPeso = [...l.entries].reverse().find((e) => e.pesoMedioG)?.pesoMedioG ?? 0;
              const dias = diffDias(l.dataEntrada);
              const progresso = Math.min(100, (dias / l.previsaoAbateDias) * 100);
              return (
                <Card key={l.id} className="p-5" style={{ background: "var(--gradient-surface)", boxShadow: "var(--shadow-card)" }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-xl font-bold">Lote {l.numero}</h3>
                        {l.encerrado ? <Badge variant="secondary">Encerrado</Badge> : <Badge>Ativo</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Entrada: {fmtData(l.dataEntrada)} · {dias}d</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => remover(l.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <Mini label="Vivas" value={vivas.toLocaleString("pt-BR")} />
                    <Mini label="Mort." value={`${((mort / l.quantidadeInicial) * 100).toFixed(1)}%`} />
                    <Mini label="Peso" value={ultPeso ? `${ultPeso}g` : "—"} />
                  </div>
                  <div className="space-y-1 mb-4">
                    <div className="flex justify-between text-xs text-muted-foreground"><span>Crescimento</span><span>{dias}/{l.previsaoAbateDias} dias</span></div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full" style={{ width: `${progresso}%`, background: "var(--gradient-primary)" }} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" className="flex-1"><Link to="/granja/$id" params={{ id: l.id }}>Abrir <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
                    <Button size="sm" variant="outline" onClick={() => gerarRelatorioLote(l)}><FileText className="h-4 w-4" /></Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded-md p-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display font-bold text-lg tabular-nums">{value}</p>
    </div>
  );
}

function KpiTile({ icon: Icon, label, value, sub, tone }: { icon: any; label: string; value: string; sub?: string; tone?: "ok" | "warn" | "bad" }) {
  const toneColor = tone === "ok" ? "text-success" : tone === "warn" ? "text-warning" : tone === "bad" ? "text-destructive" : "text-primary";
  return (
    <div className="relative overflow-hidden rounded-xl bg-card/70 border border-border p-3.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
        <Icon className={`h-3.5 w-3.5 ${toneColor}`} />
      </div>
      <div className="font-display font-bold text-2xl tabular-nums leading-none">{value}</div>
      {sub && <div className={`text-[10px] mt-1 ${toneColor}`}>{sub}</div>}
    </div>
  );
}
