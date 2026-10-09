import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scale, Plus, Trash2, Save } from "lucide-react";
import { useLotes } from "@/lib/state";
import { useFazenda } from "@/lib/cloud/fazenda";
import { diffDias, fmtData, hojeISO } from "@/lib/data";
import { calcularResumoLote } from "@/lib/granja";
import { uid } from "@/lib/storage";
import type { DailyEntry } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/pesagem-pro")({
  head: () => ({ meta: [
    { title: "Pesagem de Frangos — Aviário Pro" },
    { name: "description", content: "Pesagens por lote, uniformidade e evolução de peso dos frangos de corte." },
    { property: "og:title", content: "Pesagem de Frangos — Aviário Pro" },
    { property: "og:description", content: "Peso real e amostras do lote integrados às projeções de manejo e silo." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: PesagemPro,
});

type Amostra = NonNullable<DailyEntry["amostraPesagem"]>[number];
function PesagemPro() {
  const [lotes, setLotes] = useLotes();
  const { client, operador } = useFazenda();
  const [loteId, setLoteId] = useState("");
  const lote = lotes.find(l => l.id === loteId) ?? lotes.find(l => !l.encerrado) ?? lotes[0];
  const [data, setData] = useState(hojeISO());
  const [sexo, setSexo] = useState<Amostra["sexo"]>("misto");
  const [peso, setPeso] = useState("");
  const [amostras, setAmostras] = useState<Amostra[]>([]);
  const [salvando, setSalvando] = useState(false);
  const resumo = useMemo(() => lote ? calcularResumoLote(lote) : null, [lote]);
  const media = amostras.length ? amostras.reduce((s, a) => s + a.pesoG, 0) / amostras.length : 0;
  const uniformidade = media ? 100 * amostras.filter(a => Math.abs(a.pesoG - media) <= media * .1).length / amostras.length : 0;
  const desvio = amostras.length > 1 ? Math.sqrt(amostras.reduce((s, a) => s + (a.pesoG - media) ** 2, 0) / (amostras.length - 1)) : 0;
  const historico = lote?.entries.filter(e => (e.pesoMedioG ?? 0) > 0).slice().sort((a,b) => b.date.localeCompare(a.date)) ?? [];

  function adicionar() {
    const valor = Number(peso.replace(",", "."));
    if (!Number.isFinite(valor) || valor < 20 || valor > 6000) return toast.error("Informe um peso entre 20 g e 6.000 g");
    setAmostras(a => [...a, { id: uid(), sexo, pesoG: valor }]); setPeso("");
  }
  async function salvar() {
    if (!lote || lote.encerrado || !amostras.length || salvando) return;
    if (!data || data < lote.dataEntrada || data > hojeISO()) return toast.error("A data deve ficar entre o alojamento e hoje");
    const existente = lote.entries.find(e => e.date === data);
    if (existente?.pesoMedioG && !confirm("Substituir a pesagem desta data? Mortalidade e observações serão preservadas.")) return;
    const entrada: DailyEntry = { ...existente, date: data, mortalidade: existente?.mortalidade ?? 0,
      pesoMedioG: Math.round(media * 100) / 100, amostraPesagem: amostras, operadorPesagem: operador ?? undefined, registradoEm: new Date().toISOString() };
    const entries = [...lote.entries.filter(e => e.date !== data), entrada].sort((a,b) => a.date.localeCompare(b.date));
    setSalvando(true);
    try {
      const { data: gravado, error } = await client.from("lotes").update({ entries }).eq("id", lote.id).select("id,entries").single();
      if (error || !gravado) throw new Error("Não foi possível salvar a pesagem. Tente novamente.");
      setLotes(prev => prev.map(l => l.id === lote.id ? { ...l, entries: gravado.entries as DailyEntry[] } : l));
      setAmostras([]); toast.success("Pesagem salva no lote");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao salvar"); }
    finally { setSalvando(false); }
  }
  return <AppShell><div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="eyebrow">Desempenho do lote</p><h1 className="font-display text-4xl flex items-center gap-2"><Scale className="size-7 text-primary"/>Pesagem de frangos</h1></div>
      <Select value={lote?.id ?? ""} onValueChange={v => { setLoteId(v); setAmostras([]); }}><SelectTrigger className="w-full sm:w-60"><SelectValue placeholder="Selecionar lote"/></SelectTrigger><SelectContent>{lotes.map(l => <SelectItem key={l.id} value={l.id}>Lote {l.numero}{l.encerrado ? " · encerrado" : ""}</SelectItem>)}</SelectContent></Select>
    </header>
    {!lote ? <p className="text-muted-foreground py-12">Nenhum lote cadastrado.</p> : <>
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 border-y border-border py-5">
        {[{ label: "Idade do lote", value: `D${resumo?.idade ?? 0}` }, { label: "Último peso real", value: resumo?.ultimaPesagem ? `${Math.round(resumo.ultimaPesagem.pesoG)} g` : "—" }, {label:"Previsão hoje", value:`${Math.round(resumo?.pesoProjetadoHojeG ?? 0)} g`}, {label:"Aves vivas",value:resumo?.vivas.toLocaleString("pt-BR") ?? "—"}].map(k => <div key={k.label}><p className="text-xs text-muted-foreground">{k.label}</p><p className="font-display text-3xl mt-1">{k.value}</p></div>)}
      </section>
      {!lote.encerrado && <section className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4"><h2 className="font-display text-2xl">Nova amostra</h2>
          <div className="space-y-2"><Label htmlFor="data-pesagem">Data da pesagem</Label><Input id="data-pesagem" type="date" min={lote.dataEntrada} max={hojeISO()} value={data} onChange={e => setData(e.target.value)}/><p className="text-xs text-muted-foreground">{data >= lote.dataEntrada ? `D${diffDias(lote.dataEntrada, data)}` : "Data anterior ao alojamento"}</p></div>
          <div className="grid grid-cols-[100px_minmax(0,1fr)_44px] items-end gap-2">
            <div><Label>Sexo</Label><Select value={sexo} onValueChange={v=>setSexo(v as Amostra["sexo"])}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="misto">Misto</SelectItem><SelectItem value="macho">Macho</SelectItem><SelectItem value="femea">Fêmea</SelectItem></SelectContent></Select></div>
            <div><Label htmlFor="peso-ave">Peso da ave (g)</Label><Input id="peso-ave" inputMode="decimal" value={peso} onChange={e=>setPeso(e.target.value)} onKeyDown={e=>{if(e.key==="Enter") adicionar();}}/></div>
            <Button size="icon" aria-label="Adicionar peso" onClick={adicionar}><Plus className="size-4"/></Button>
          </div>
          <div className="grid grid-cols-3 border-y border-border py-4 gap-2">{[{label:"Média",v:`${Math.round(media)} g`},{label:"Uniformidade",v:`${uniformidade.toFixed(1)}%`},{label:"CV",v:media ? `${(100*desvio/media).toFixed(1)}%` : "—"}].map(k=><div key={k.label}><p className="text-xs text-muted-foreground">{k.label}</p><p className="text-xl font-semibold">{k.v}</p></div>)}</div>
          <Button onClick={salvar} disabled={!amostras.length || salvando}><Save className="size-4"/>{salvando ? "Salvando…" : "Salvar pesagem no lote"}</Button>
        </div>
        <div><h2 className="font-display text-2xl mb-3">Aves da amostra · {amostras.length}</h2><div className="max-h-80 overflow-auto space-y-1">{amostras.map((a,i)=><div key={a.id} className="flex items-center justify-between border-b border-border py-2"><span className="text-sm">{i+1} · {a.sexo} · <strong>{a.pesoG} g</strong></span><Button variant="ghost" size="icon" aria-label={`Remover ave ${i+1}`} onClick={()=>setAmostras(s=>s.filter(v=>v.id!==a.id))}><Trash2 className="size-4"/></Button></div>)}{!amostras.length && <p className="text-muted-foreground py-6">Nenhuma ave na amostra.</p>}</div></div>
      </section>}
      <section className="border-t border-border pt-5"><h2 className="font-display text-2xl mb-3">Histórico de peso</h2><div className="space-y-2">{historico.map(e=><div key={e.date} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-3"><div><p className="font-medium">{fmtData(e.date)} · D{diffDias(lote.dataEntrada,e.date)}</p><p className="text-xs text-muted-foreground">{e.amostraPesagem?.length ? `${e.amostraPesagem.length} aves pesadas` : "Peso médio registrado"}{e.operadorPesagem ? ` · ${e.operadorPesagem}` : ""}</p></div><strong className="font-display text-2xl">{e.pesoMedioG?.toFixed(0)} g</strong></div>)}{!historico.length && <p className="text-muted-foreground py-6">Sem pesagens neste lote.</p>}</div></section>
    </>}
  </div></AppShell>;
}
