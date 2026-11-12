import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLotes } from "@/lib/state";
import { hojeISO } from "@/lib/data";
import { CalendarCheck, ClipboardPenLine, ShieldAlert, CheckCircle2 } from "lucide-react";

function shiftDate(iso: string, delta: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function AvicultureRecordQuality() {
  const [lotes] = useLotes();
  const hoje = hojeISO();
  const report = useMemo(() => {
    const active = lotes.filter((l) => !l.encerrado);
    const days = Array.from({ length: 7 }, (_, i) => shiftDate(hoje, i - 6));
    const rows = days.map((date) => {
      const recorded = active.filter((l) => (l.entries ?? []).some((e) => e.date === date)).length;
      return { date, recorded, expected: active.length };
    });
    const expected = rows.reduce((s, r) => s + r.expected, 0);
    const done = rows.reduce((s, r) => s + r.recorded, 0);
    const missingToday = active.filter((l) => !(l.entries ?? []).some((e) => e.date === hoje));
    const pct = expected ? Math.round((done / expected) * 100) : null;
    return { active, rows, expected, done, pct, missingToday };
  }, [lotes, hoje]);

  if (!report.active.length) return null;

  return (
    <Card className="avi-card-3d overflow-hidden p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Confiabilidade operacional</p>
          <h2 className="text-xl font-semibold">Qualidade dos registros</h2>
          <p className="mt-1 text-xs text-muted-foreground">Acompanhamento dos diários lançados nos últimos sete dias, por lote ativo.</p>
        </div>
        <Badge variant={report.missingToday.length ? "secondary" : "outline"}>{report.missingToday.length ? `${report.missingToday.length} pendente(s) hoje` : "Hoje em dia"}</Badge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">Cobertura de registros</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{report.pct === null ? "—" : `${report.pct}%`}</p>
          <p className="text-[11px] text-muted-foreground">{report.done} de {report.expected} diários esperados</p>
        </div>
        <div className="rounded-xl bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">Lotes ativos monitorados</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{report.active.length}</p>
          <p className="text-[11px] text-muted-foreground">Janela de sete dias</p>
        </div>
      </div>
      <div className="mt-4 flex items-end gap-2" aria-label="Cobertura diária dos registros">
        {report.rows.map((r) => {
          const ratio = r.expected ? r.recorded / r.expected : 0;
          return <div key={r.date} className="min-w-0 flex-1 text-center">
            <div className="flex h-16 items-end overflow-hidden rounded-md bg-muted/70">
              <div className="w-full rounded-md bg-primary transition-all duration-500" style={{ height: `${ratio * 100}%` }} title={`${r.recorded} de ${r.expected} lotes com diário`}/>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">{r.date.slice(8,10)}/{r.date.slice(5,7)}</p>
            <p className="text-[10px] font-medium tabular-nums">{r.recorded}/{r.expected}</p>
          </div>;
        })}
      </div>
      {report.missingToday.length ? (
        <div className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold"><ShieldAlert className="h-4 w-4"/> Diários que faltam hoje</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {report.missingToday.map((l) => <Badge key={l.id} variant="outline">Lote {l.numero}</Badge>)}
          </div>
          <Button asChild size="sm" className="mt-3 w-full sm:w-auto"><Link to="/granja"><ClipboardPenLine className="mr-2 h-4 w-4"/>Abrir lançamentos</Link></Button>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-primary/5 p-3 text-sm"><CheckCircle2 className="h-4 w-4 text-primary"/> Todos os lotes ativos têm diário lançado hoje.</div>
      )}
      <p className="mt-3 flex items-start gap-2 text-[11px] text-muted-foreground"><CalendarCheck className="mt-0.5 h-3.5 w-3.5 shrink-0"/> Cobertura mede a existência de lançamento diário, não a qualidade ou a precisão das medições.</p>
    </Card>
  );
}
