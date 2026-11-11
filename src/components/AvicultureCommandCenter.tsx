import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLotes } from "@/lib/state";
import { calcularResumoLote } from "@/lib/granja";
import { hojeISO } from "@/lib/data";
import {
  Activity, AlertCircle, ArrowRight, Bird, CalendarCheck, ClipboardPenLine,
  Scale, ShieldCheck, TrendingUp,
} from "lucide-react";

const fmt = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits });

export function AvicultureCommandCenter() {
  const [lotes] = useLotes();
  const hoje = hojeISO();

  const rows = useMemo(() => lotes.filter((lote) => !lote.encerrado).map((lote) => {
    const resumo = calcularResumoLote(lote);
    const registroHoje = (lote.entries ?? []).some((entry) => entry.date === hoje);
    const ultimaData = [...(lote.entries ?? [])]
      .filter((entry) => entry.date <= hoje)
      .map((entry) => entry.date)
      .sort()
      .at(-1) ?? null;
    return { lote, resumo, registroHoje, ultimaData };
  }), [lotes, hoje]);

  const totalVivas = rows.reduce((sum, row) => sum + row.resumo.vivas, 0);
  const totalAlojadas = rows.reduce((sum, row) => sum + row.lote.quantidadeInicial, 0);
  const semRegistro = rows.filter((row) => !row.registroHoje).length;
  const semPesagem = rows.filter((row) => !row.resumo.ultimaPesagem).length;
  const atencaoPeso = rows.filter((row) => row.resumo.situacao === "critico" || row.resumo.situacao === "atencao").length;

  return (
    <section aria-label="Centro de comando avícola" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Gestão zootécnica</p>
          <h2 className="text-2xl md:text-3xl">Centro de comando avícola</h2>
          <p className="mt-1 text-sm text-muted-foreground">Acompanhamento dos lotes ativos, qualidade dos registros e pontos que merecem conferência.</p>
        </div>
        <Badge variant="outline" className="gap-1"><Activity className="h-3 w-3" /> {rows.length} lote(s) ativo(s)</Badge>
      </div>

      {rows.length === 0 ? (
        <Card className="p-5 md:p-6">
          <div className="flex items-start gap-3">
            <Bird className="mt-1 h-6 w-6 text-primary" />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold">Comece pelo cadastro do lote</h3>
              <p className="mt-1 text-sm text-muted-foreground">Depois do alojamento, o painel acompanha idade, aves vivas estimadas, mortalidade, pesagens e evolução zootécnica com base nos seus lançamentos.</p>
              <Button asChild className="mt-4"><Link to="/granja">Cadastrar primeiro lote <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Metric icon={Bird} label="Aves vivas estimadas" value={totalVivas.toLocaleString("pt-BR")} detail={totalAlojadas ? `${fmt((totalVivas / totalAlojadas) * 100)}% das alojadas` : "Sem quantidade alojada"} />
            <Metric icon={CalendarCheck} label="Diários faltantes hoje" value={String(semRegistro)} detail={semRegistro ? "Lotes sem lançamento na data de hoje" : "Todos os lotes têm registro hoje"} warning={semRegistro > 0} />
            <Metric icon={Scale} label="Sem pesagem" value={String(semPesagem)} detail="Lotes sem pesagem válida registrada" warning={semPesagem > 0} />
            <Metric icon={TrendingUp} label="Peso para conferir" value={String(atencaoPeso)} detail="Comparação com referência da linhagem/sexo" warning={atencaoPeso > 0} />
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            {rows.map(({ lote, resumo, registroHoje, ultimaData }) => (
              <Card key={lote.id} className="overflow-hidden p-4 md:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Lote {lote.numero}{lote.galpao ? ` · ${lote.galpao}` : ""}</p>
                    <h3 className="mt-1 text-xl font-semibold">Dia {resumo.idade} de criação</h3>
                  </div>
                  <Badge variant={registroHoje ? "secondary" : "destructive"}>{registroHoje ? "Diário atualizado" : "Falta diário de hoje"}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Aves vivas estimadas</p>
                    <p className="mt-1 text-xl font-bold tabular-nums">{resumo.vivas.toLocaleString("pt-BR")}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Mortalidade + eliminados</p>
                    <p className="mt-1 text-xl font-bold tabular-nums">{fmt(resumo.mortalidadePct)}%</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Último peso médio</p>
                    <p className="mt-1 text-xl font-bold tabular-nums">{resumo.ultimaPesagem ? `${Math.round(resumo.ultimaPesagem.pesoG).toLocaleString("pt-BR")} g` : "Sem pesagem"}</p>
                    {resumo.ultimaPesagem && <p className="mt-1 text-[11px] text-muted-foreground">Há {resumo.diasSemPesar} dia(s)</p>}
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Diferença da referência</p>
                    <p className="mt-1 text-xl font-bold tabular-nums">{resumo.diferencaPesoPct === null ? "—" : `${resumo.diferencaPesoPct > 0 ? "+" : ""}${fmt(resumo.diferencaPesoPct)}%`}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{resumo.diferencaPesoPct === null ? "Registre uma pesagem" : "Na data da última pesagem"}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>Último diário: {ultimaData ? ultimaData.split("-").reverse().join("/") : "Nenhum registro"}</span>
                  <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Estimativas baseadas nos lançamentos</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild size="sm"><Link to="/granja/$id" params={{ id: lote.id }}><ClipboardPenLine className="mr-1.5 h-4 w-4" /> Abrir diário do lote</Link></Button>
                  <Button asChild size="sm" variant="outline"><Link to="/pesagem-pro"><Scale className="mr-1.5 h-4 w-4" /> Pesagens</Link></Button>
                </div>
              </Card>
            ))}
          </div>
          <p className="flex items-start gap-2 text-xs text-muted-foreground"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> Aves vivas são estimadas a partir das baixas registradas. A diferença de peso compara a última pesagem com a referência na idade daquela pesagem; não substitui avaliação técnica do lote.</p>
        </>
      )}
    </section>
  );
}

function Metric({ icon: Icon, label, value, detail, warning = false }: {
  icon: typeof Bird; label: string; value: string; detail: string; warning?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${warning ? "text-warning" : "text-primary"}`} />
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </Card>
  );
}
