import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useLotes } from "@/lib/state";
import { gerarCalendario, type ItemCalendario, type AplicacaoSanitaria } from "@/lib/calendarioSanitario";
import { Syringe, Pill, ShieldCheck, ClipboardCheck, AlertTriangle, CheckCircle2, Calendar, Bird, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { fmtData, hojeISO } from "@/lib/data";

export const Route = createFileRoute("/calendario-sanitario")({
  head: () => ({
    meta: [
      { title: "Calendário Sanitário — Aviário Pro" },
      { name: "description", content: "Calendário automático de vacinas e medicamentos do lote ativo da granja, com check-off de aplicação, dose e observações." },
      { property: "og:title", content: "Calendário Sanitário — Aviário Pro" },
      { property: "og:description", content: "Calendário automático de vacinas e medicamentos do lote ativo da granja, com check-off de aplicação, dose e observações." },
    ],
  }),
  component: CalendarioSanitario,
});

function CalendarioSanitario() {
  const [lotes, setLotes] = useLotes();
  const ativos = lotes.filter((l) => !l.encerrado);
  const [loteId, setLoteId] = useState<string>(ativos[0]?.id ?? "");
  const lote = lotes.find((l) => l.id === loteId) ?? ativos[0];
  const [aplicar, setAplicar] = useState<ItemCalendario | null>(null);
  const [form, setForm] = useState<AplicacaoSanitaria>({ codigo: "", data: hojeISO(), status: "feito" });

  if (!lote) {
    return (
      <AppShell>
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-display font-bold flex items-center gap-2"><Syringe className="h-7 w-7 text-primary" /> Calendário Sanitário</h1>
          <Card className="p-8 text-center border-dashed">
            <Bird className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum lote ativo. Cadastre um lote para liberar o protocolo.</p>
            <Button asChild className="mt-3"><Link to="/granja">Cadastrar lote</Link></Button>
          </Card>
        </div>
      </AppShell>
    );
  }

  const cal = gerarCalendario({ dataEntrada: lote.dataEntrada, aplicacoes: lote.aplicacoes ?? [] });
  const idade = cal[0]?.diaAtual ?? 0;

  const totalObrig = cal.filter((c) => c.obrigatorio).length;
  const feitosObrig = cal.filter((c) => c.obrigatorio && c.status === "feito").length;
  const hoje = cal.filter((c) => c.status === "hoje");
  const atrasados = cal.filter((c) => c.status === "atraso");

  const abrir = (item: ItemCalendario) => {
    setAplicar(item);
    setForm({
      codigo: item.codigo,
      data: item.aplicado?.data ?? hojeISO(),
      status: item.aplicado?.status ?? "feito",
      dose: item.aplicado?.dose ?? item.dose ?? "",
      responsavel: item.aplicado?.responsavel ?? "",
      observacoes: item.aplicado?.observacoes ?? "",
    });
  };

  const salvar = () => {
    if (!aplicar) return;
    setLotes((prev) => prev.map((l) => {
      if (l.id !== lote.id) return l;
      const existing = (l.aplicacoes ?? []).filter((a) => a.codigo !== form.codigo);
      return { ...l, aplicacoes: [...existing, form] };
    }));
    setAplicar(null);
    toast.success(form.status === "feito" ? "Aplicação registrada" : "Marcado como ignorado");
  };

  const remover = (codigo: string) => {
    setLotes((prev) => prev.map((l) => l.id === lote.id ? { ...l, aplicacoes: (l.aplicacoes ?? []).filter((a) => a.codigo !== codigo) } : l));
    toast.success("Registro removido");
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold flex items-center gap-2"><Syringe className="h-7 w-7 text-primary" /> Calendário Sanitário</h1>
            <p className="text-muted-foreground mt-1">Protocolo automático por idade do lote.</p>
          </div>
          {ativos.length > 1 && (
            <select value={loteId} onChange={(e) => setLoteId(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
              {ativos.map((l) => <option key={l.id} value={l.id}>Lote {l.numero}</option>)}
            </select>
          )}
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi icon={Calendar} label="Idade do lote" value={`D${idade}`} hint={`Lote ${lote.numero}`} tone="primary" />
          <Kpi icon={ShieldCheck} label="Obrigatórios feitos" value={`${feitosObrig}/${totalObrig}`} hint={`${Math.round((feitosObrig / totalObrig) * 100)}%`} tone="accent" />
          <Kpi icon={Sparkles} label="Para hoje" value={hoje.length.toString()} hint={hoje.length ? "aplicar hoje" : "nada hoje"} tone={hoje.length ? "primary" : "muted"} />
          <Kpi icon={AlertTriangle} label="Em atraso" value={atrasados.length.toString()} hint={atrasados.length ? "aplicar urgente" : "tudo em dia"} tone={atrasados.length ? "destructive" : "muted"} />
        </div>

        <div className="space-y-3">
          {cal.map((item) => (
            <Card key={item.codigo} className={`p-4 border ${
              item.status === "feito" ? "border-success/40 bg-success/5" :
              item.status === "ignorado" ? "border-border bg-muted/30 opacity-70" :
              item.status === "atraso" ? "border-destructive/40 bg-destructive/5" :
              item.status === "hoje" ? "border-primary/60 bg-primary/5" :
              "border-border/60"
            }`}>
              <div className="flex items-start gap-4">
                <div className="shrink-0 flex flex-col items-center">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    item.status === "feito" ? "bg-success/15 text-success" :
                    item.status === "atraso" ? "bg-destructive/15 text-destructive" :
                    item.status === "hoje" ? "bg-primary/15 text-primary" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {item.status === "feito" ? <CheckCircle2 className="h-5 w-5" /> :
                     item.status === "atraso" ? <AlertTriangle className="h-5 w-5" /> :
                     item.tipo === "vacina" ? <Syringe className="h-5 w-5" /> :
                     item.tipo === "medicamento" ? <Pill className="h-5 w-5" /> :
                     <ClipboardCheck className="h-5 w-5" />}
                  </div>
                  <span className="text-[10px] mt-1 font-mono text-muted-foreground">D{item.dia}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{item.nome}</h3>
                    {item.obrigatorio && <Badge variant="secondary" className="text-[10px]">obrigatório</Badge>}
                    {item.status === "hoje" && <Badge className="text-[10px]">HOJE</Badge>}
                    {item.status === "atraso" && <Badge variant="destructive" className="text-[10px]">ATRASO {idade - item.dia}d</Badge>}
                    {item.status === "feito" && item.aplicado && <Badge variant="outline" className="text-[10px] border-success/40 text-success">✓ {fmtData(item.aplicado.data)}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.via && <span className="capitalize">via {item.via} · </span>}
                    {item.dose && <span>{item.dose} · </span>}
                    Previsto {fmtData(item.dataPrevista)}
                  </p>
                  {item.obs && <p className="text-xs text-muted-foreground mt-1 italic">{item.obs}</p>}
                  {item.aplicado?.observacoes && <p className="text-xs mt-1"><strong>Obs aplicação:</strong> {item.aplicado.observacoes}</p>}
                </div>
                <div className="shrink-0 flex flex-col gap-1.5">
                  {item.aplicado ? (
                    <Button size="sm" variant="ghost" onClick={() => remover(item.codigo)}><X className="h-3.5 w-3.5" /></Button>
                  ) : (
                    <Button size="sm" variant={item.status === "atraso" || item.status === "hoje" ? "default" : "outline"} onClick={() => abrir(item)}>Aplicar</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Protocolo de referência para frango de corte. Sempre confirme com a integradora ou veterinário responsável.
        </p>
      </div>

      <Dialog open={!!aplicar} onOpenChange={(o) => !o && setAplicar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{aplicar?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Status</Label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="feito">Feito</option>
                  <option value="ignorado">Ignorado</option>
                </select>
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Dose / quantidade</Label><Input value={form.dose ?? ""} onChange={(e) => setForm({ ...form, dose: e.target.value })} placeholder={aplicar?.dose ?? ""} /></div>
            <div className="space-y-1"><Label className="text-xs">Responsável</Label><Input value={form.responsavel ?? ""} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} placeholder="Quem aplicou" /></div>
            <div className="space-y-1"><Label className="text-xs">Observações</Label><Textarea rows={2} value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAplicar(null)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Kpi({ icon: Icon, label, value, hint, tone }: { icon: any; label: string; value: string; hint: string; tone: "primary" | "accent" | "destructive" | "muted" }) {
  const color = tone === "destructive" ? "text-destructive" : tone === "accent" ? "text-accent" : tone === "muted" ? "text-muted-foreground" : "text-primary";
  return (
    <Card className="p-3 md:p-4 flex items-start gap-3" style={{ background: "var(--gradient-surface)" }}>
      <div className={`h-9 w-9 rounded-lg bg-muted/60 flex items-center justify-center ${color} shrink-0`}><Icon className="h-4 w-4" /></div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`font-display font-bold text-xl truncate ${color}`}>{value}</p>
        <p className="text-[11px] text-muted-foreground truncate">{hint}</p>
      </div>
    </Card>
  );
}
