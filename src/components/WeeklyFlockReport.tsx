import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown } from "lucide-react";
import { weeklyFlock } from "@/lib/weekly-flock";
import { fmtData } from "@/lib/data";
import type { Lote } from "@/lib/types";
import { savePdf } from "@/lib/pdfHistory";

export function WeeklyFlockReport({ lote }: { lote: Lote }) {
  const rows = useMemo(() => weeklyFlock(lote), [lote]);
  const number = (n: number) => n.toLocaleString("pt-BR");
  const percent = (n: number) => `${n.toFixed(2).replace(".", ",")}%`;
  async function download() {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const pdf = new jsPDF({ orientation: "landscape" });
    pdf.setFontSize(18); pdf.text(`Aviário Pro | Fechamento semanal — Lote ${lote.numero}`, 14, 18);
    pdf.setFontSize(10); pdf.text(`Ross AP95 | Alojamento ${fmtData(lote.dataEntrada)} | ${number(lote.quantidadeInicial)} aves`, 14, 26);
    pdf.text("D0 = alojamento. Semana 1 = D0-D6. Percentuais sobre aves alojadas. Ausência de registro não significa zero.", 14, 33);
    autoTable(pdf, { startY: 40, head: [["Semana", "Idade", "Mortos", "M %", "Elim.", "E %", "M+E", "% sem.", "M acum.", "E acum.", "M+E acum.", "% acum.", "Vivas", "Situação"]],
      body: rows.map((r) => [r.week, `D${r.startAge}-D${r.endAge}`, r.deaths, percent(r.deathsPct), r.culls, percent(r.cullsPct), r.losses, percent(r.lossesPct), r.cumulativeDeaths, r.cumulativeCulls, r.cumulativeLosses, percent(r.cumulativePct), r.liveBirds, r.status + (r.missing ? ` (${r.missing} sem registro)` : "")]), styles: { fontSize: 8 } });
    for (const row of rows.filter((r) => r.status !== "Não iniciada")) {
      pdf.addPage(); pdf.setFontSize(14); pdf.text(`Lote ${lote.numero} | Semana ${row.week} | D${row.startAge}-D${row.endAge}`,14,18);
      autoTable(pdf,{startY:26,head:[["Data","Idade","Mortos","Eliminados","Registro"]],body:row.days.map((d)=>[fmtData(d.date),`D${d.age}`,d.recorded?d.deaths:"—",d.recorded?d.culls:"—",d.future?"Futuro":d.recorded?"Registrado":"Sem registro"])});
    }
    savePdf(pdf, `fechamento-semanal-lote-${lote.numero}.pdf`, "granja");
  }
  return <section className="space-y-4" aria-label="Fechamento semanal do lote">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-display text-2xl">Fechamento semanal</h2><p className="text-sm text-muted-foreground">Semana 1: D0–D6 · Percentuais sobre {number(lote.quantidadeInicial)} aves alojadas</p></div>
      <Button variant="outline" onClick={() => void download()}><FileDown /> Baixar fechamento</Button>
    </header>
    <div className="overflow-x-auto border-y border-border">
      <table className="w-full min-w-[1150px] text-sm">
        <thead className="text-xs text-muted-foreground"><tr>{["Semana / período","Mortos","M %","Eliminados","E %","M+E","% semana","M acum.","E acum.","M+E acum.","% acum.","Vivas","Situação"].map((h)=><th key={h} className="px-3 py-3 text-right first:text-left">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r)=><tr key={r.week} className="border-t border-border">
          <td className="px-3 py-3 whitespace-nowrap"><strong>{r.week}ª · D{r.startAge}–D{r.endAge}</strong><div className="text-xs text-muted-foreground">{fmtData(r.days[0].date)} – {fmtData(r.days[6].date)}</div></td>
          {[r.deaths,percent(r.deathsPct),r.culls,percent(r.cullsPct),r.losses,percent(r.lossesPct),r.cumulativeDeaths,r.cumulativeCulls,r.cumulativeLosses,percent(r.cumulativePct),number(r.liveBirds)].map((v,i)=><td key={i} className="px-3 py-3 text-right tabular-nums">{r.status === "Não iniciada" ? "—" : v}</td>)}
          <td className="px-3 py-3"><Badge variant={r.status==="Incompleta"?"destructive":"secondary"}>{r.status}</Badge>{r.missing>0&&<p className="mt-1 text-xs text-muted-foreground">{r.missing} dia(s) sem registro</p>}</td>
        </tr>)}</tbody>
      </table>
    </div>
    {rows.filter((r)=>r.status!=="Não iniciada").map((r)=><details key={r.week} className="border-b border-border pb-3"><summary className="cursor-pointer text-sm font-medium">Semana {r.week} · registros diários</summary><div className="mt-3 grid gap-2 sm:grid-cols-4 lg:grid-cols-7">{r.days.map((d)=><div key={d.date} className="text-sm"><p className="font-medium">D{d.age} · {fmtData(d.date)}</p><p className="text-muted-foreground">{d.future?"Futuro":d.recorded?`M: ${d.deaths} · E: ${d.culls}`:"Sem registro"}</p></div>)}</div></details>)}
  </section>;
}