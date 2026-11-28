import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Scale, Plus, Trash2, Save, Undo2, Target } from "lucide-react";
import { useLotes } from "@/lib/state";
import { useFazenda } from "@/lib/cloud/fazenda";
import { estatisticaAmostra } from "@/lib/uniformidade";
import { histograma, salvarPesagemNuvem, tamanhoAmostra } from "@/lib/pesagem";
import { refPesoG } from "@/lib/silo";
import { diffDias, fmtData, hojeISO } from "@/lib/data";
import { calcularResumoLote } from "@/lib/granja";
import { uid } from "@/lib/storage";
import type { DailyEntry } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/pesagem-pro")({
  head: () => ({
    meta: [
      { title: "Pesagem de Frangos — Aviário Pro" },
      {
        name: "description",
        content: "Pesagens por lote, uniformidade e evolução de peso dos frangos de corte.",
      },
      { property: "og:title", content: "Pesagem de Frangos — Aviário Pro" },
      {
        property: "og:description",
        content: "Peso real e amostras do lote integrados às projeções de manejo e silo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PesagemPro,
});

type Amostra = NonNullable<DailyEntry["amostraPesagem"]>[number];
const fmt = (v: number, d = 0) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: d });
const chaveRascunho = (loteId: string, data: string) => `pesagem-rascunho:${loteId}:${data}`;

function PesagemPro() {
  const [lotes] = useLotes();
  const { client, operador } = useFazenda();
  const [loteId, setLoteId] = useState("");
  const lote = lotes.find((l) => l.id === loteId) ?? lotes.find((l) => !l.encerrado) ?? lotes[0];
  const [data, setData] = useState(hojeISO());
  const [sexo, setSexo] = useState<Amostra["sexo"]>("misto");
  const [peso, setPeso] = useState("");
  const [amostras, setAmostras] = useState<Amostra[]>([]);
  const [salvando, setSalvando] = useState(false);
  const pesoRef = useRef<HTMLInputElement>(null);
  const resumo = useMemo(() => (lote ? calcularResumoLote(lote) : null), [lote]);
  const est = estatisticaAmostra(amostras.map((a) => a.pesoG));
  const media = est?.media ?? 0;
  const historico =
    lote?.entries
      .filter((e) => (e.pesoMedioG ?? 0) > 0)
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date)) ?? [];
  const meta = tamanhoAmostra(resumo?.vivas ?? 0);
  const idadeData = lote && data >= lote.dataEntrada ? diffDias(lote.dataEntrada, data) : 0;
  const refData = lote
    ? refPesoG(idadeData, lote.linhagem ?? "ross_ap95", lote.sexo ?? "misto")
    : 0;
  const difRef = media && refData ? ((media - refData) / refData) * 100 : null;
  const hist = useMemo(() => histograma(amostras.map((a) => a.pesoG)), [amostras]);
  const maxHist = Math.max(1, ...hist.map((h) => h.n));

  // Rascunho no aparelho: a amostra não se perde se a página recarregar ou o sinal cair.
  const chave = lote ? chaveRascunho(lote.id, data) : null;
  const [carregado, setCarregado] = useState<string | null>(null);
  useEffect(() => {
    if (!chave) return;
    try {
      const r = JSON.parse(localStorage.getItem(chave) || "[]");
      setAmostras(Array.isArray(r) ? r : []);
    } catch {
      setAmostras([]);
    }
    setCarregado(chave);
  }, [chave]);
  useEffect(() => {
    // Só grava depois de carregar o rascunho desta data/lote (evita levar a amostra para outra data).
    if (!lote || !chave || carregado !== chave) return;
    try {
      if (amostras.length) localStorage.setItem(chave, JSON.stringify(amostras));
      else localStorage.removeItem(chave);
    } catch {
      /* ignora */
    }
  }, [amostras, carregado, chave]);

  function adicionar() {
    const valor = Number(peso.replace(",", "."));
    if (!Number.isFinite(valor) || valor < 20 || valor > 6000)
      return toast.error("Informe um peso entre 20 g e 6.000 g");
    setAmostras((a) => [...a, { id: uid(), sexo, pesoG: valor }]);
    setPeso("");
    pesoRef.current?.focus();
  }
  async function salvar() {
    if (!lote || lote.encerrado || !amostras.length || salvando) return;
    if (!data || data < lote.dataEntrada || data > hojeISO())
      return toast.error("A data deve ficar entre o alojamento e hoje");
    const existente = lote.entries.find((e) => e.date === data);
    if (
      existente?.pesoMedioG &&
      !confirm("Substituir a pesagem desta data? Mortalidade e observações serão preservadas.")
    )
      return;
    if (
      amostras.length < meta &&
      !confirm(
        `A amostra tem ${amostras.length} aves; o recomendado é ${meta}. Salvar mesmo assim?`,
      )
    )
      return;
    setSalvando(true);
    try {
      const r = await salvarPesagemNuvem(client, lote.id, data, amostras, operador || null).catch(
        (e: unknown) => ({
          ok: false as const,
          erro: e instanceof Error ? e.message : "Falha de conexão",
        }),
      );
      if (!r.ok) {
        toast.error(r.erro, {
          description:
            "A amostra continua guardada neste aparelho. Tente salvar de novo quando houver sinal.",
        });
        return;
      }
      window.dispatchEvent(
        new CustomEvent("cloud-row", { detail: { table: "lotes", row: r.row } }),
      );
      setAmostras([]);
      toast.success(`Pesagem salva: ${fmt(media)} g (${amostras.length} aves)`);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Desempenho do lote</p>
            <h1 className="font-display text-4xl flex items-center gap-2">
              <Scale className="size-7 text-primary" />
              Pesagem de frangos
            </h1>
          </div>
          <Select value={lote?.id ?? ""} onValueChange={(v) => setLoteId(v)}>
            <SelectTrigger className="w-full sm:w-60">
              <SelectValue placeholder="Selecionar lote" />
            </SelectTrigger>
            <SelectContent>
              {lotes.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  Lote {l.numero}
                  {l.encerrado ? " · encerrado" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </header>
        {!lote ? (
          <p className="text-muted-foreground py-12">Nenhum lote cadastrado.</p>
        ) : (
          <>
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 border-y border-border py-5">
              {[
                { label: "Idade do lote", value: `D${resumo?.idade ?? 0}` },
                {
                  label: "Último peso real",
                  value: resumo?.ultimaPesagem ? `${fmt(resumo.ultimaPesagem.pesoG)} g` : "—",
                },
                { label: "Previsão hoje", value: `${fmt(resumo?.pesoProjetadoHojeG ?? 0)} g` },
                { label: "Aves vivas", value: resumo?.vivas.toLocaleString("pt-BR") ?? "—" },
              ].map((k) => (
                <div key={k.label}>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="font-display text-3xl mt-1 tabular-nums">{k.value}</p>
                </div>
              ))}
            </section>
            {!lote.encerrado && (
              <section className="grid lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h2 className="font-display text-2xl">Nova amostra</h2>
                  <div className="space-y-2">
                    <Label htmlFor="data-pesagem">Data da pesagem</Label>
                    <Input
                      id="data-pesagem"
                      type="date"
                      min={lote.dataEntrada}
                      max={hojeISO()}
                      value={data}
                      onChange={(e) => setData(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {data >= lote.dataEntrada
                        ? `D${idadeData} · referência ${fmt(refData)} g`
                        : "Data anterior ao alojamento"}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-semibold">
                        Amostra: {amostras.length} de {meta} aves
                      </span>
                      <span className="text-muted-foreground">
                        1% do lote, mín. 50 · pese em 3 pontos do galpão
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-[width] duration-300 ${amostras.length >= meta ? "bg-success" : "bg-primary"}`}
                        style={{ width: `${Math.min(100, (amostras.length / meta) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-[100px_minmax(0,1fr)_52px] items-end gap-2">
                    <div>
                      <Label>Sexo</Label>
                      <Select value={sexo} onValueChange={(v) => setSexo(v as Amostra["sexo"])}>
                        <SelectTrigger className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="misto">Misto</SelectItem>
                          <SelectItem value="macho">Macho</SelectItem>
                          <SelectItem value="femea">Fêmea</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="peso-ave">Peso da ave (g)</Label>
                      <Input
                        ref={pesoRef}
                        id="peso-ave"
                        inputMode="decimal"
                        enterKeyHint="next"
                        className="h-12 text-xl font-semibold"
                        value={peso}
                        onChange={(e) => setPeso(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") adicionar();
                        }}
                        placeholder="Ex.: 1250"
                      />
                    </div>
                    <Button
                      size="icon"
                      className="h-12 w-12"
                      aria-label="Adicionar peso"
                      onClick={adicionar}
                    >
                      <Plus className="size-5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 border-y border-border py-4 gap-3">
                    {[
                      { label: "Média", v: media ? `${fmt(media)} g` : "—" },
                      {
                        label: "× referência",
                        v: difRef === null ? "—" : `${difRef > 0 ? "+" : ""}${fmt(difRef, 1)}%`,
                        tom:
                          difRef === null
                            ? ""
                            : difRef < -7
                              ? "text-destructive"
                              : difRef < -3
                                ? "text-warning-foreground"
                                : "text-success",
                      },
                      {
                        label: "Uniformidade",
                        v: est ? `${fmt(est.uniformidadePct, 1)}%` : "—",
                        tom: !est
                          ? ""
                          : est.uniformidadePct < 70
                            ? "text-destructive"
                            : est.uniformidadePct < 80
                              ? "text-warning-foreground"
                              : "text-success",
                      },
                      { label: "CV", v: est && est.n > 1 ? `${fmt(est.cvPct, 1)}%` : "—" },
                    ].map((k) => (
                      <div key={k.label}>
                        <p className="text-xs text-muted-foreground">{k.label}</p>
                        <p className={`text-xl font-semibold tabular-nums ${k.tom ?? ""}`}>{k.v}</p>
                      </div>
                    ))}
                  </div>

                  {hist.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold text-muted-foreground">
                        Distribuição em relação à média (faixa verde = ±10%, conta para a
                        uniformidade)
                      </p>
                      <div className="flex h-24 items-end gap-1">
                        {hist.map((h) => (
                          <div
                            key={h.de}
                            className="flex flex-1 flex-col items-center justify-end gap-1"
                          >
                            <span className="text-[10px] tabular-nums text-muted-foreground">
                              {h.n || ""}
                            </span>
                            <div
                              className={`w-full rounded-t ${h.uniforme ? "bg-success/70" : "bg-warning/70"}`}
                              style={{
                                height: `${(h.n / maxHist) * 64}px`,
                                minHeight: h.n ? 3 : 0,
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                        <span>−25%</span>
                        <span>média</span>
                        <span>+25%</span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="h-12 flex-1"
                      onClick={salvar}
                      disabled={!amostras.length || salvando}
                    >
                      <Save className="size-4" />
                      {salvando ? "Salvando…" : "Salvar pesagem no lote"}
                    </Button>
                    <Button
                      variant="outline"
                      className="h-12"
                      disabled={!amostras.length}
                      onClick={() => setAmostras((s) => s.slice(0, -1))}
                    >
                      <Undo2 className="size-4" /> Desfazer
                    </Button>
                  </div>
                  {amostras.length > 0 && (
                    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Target className="size-3.5" /> Rascunho guardado neste aparelho até salvar.
                    </p>
                  )}
                </div>
                <div>
                  <h2 className="font-display text-2xl mb-3">
                    Aves da amostra · {amostras.length}
                  </h2>
                  <div className="max-h-96 overflow-auto">
                    {amostras.length ? (
                      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                        {[...amostras].reverse().map((a, j) => {
                          const i = amostras.length - j;
                          const fora = media && Math.abs(a.pesoG - media) > media * 0.1;
                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => setAmostras((s) => s.filter((v) => v.id !== a.id))}
                              aria-label={`Remover ave ${i}`}
                              className={`group flex items-center justify-between rounded-lg border px-2 py-1.5 text-left text-sm ${fora ? "border-warning/50 bg-warning/10" : "border-border"}`}
                            >
                              <span>
                                <span className="text-[10px] text-muted-foreground">
                                  #{i}
                                  {a.sexo !== "misto" ? ` ${a.sexo === "macho" ? "♂" : "♀"}` : ""}
                                </span>
                                <br />
                                <strong className="tabular-nums">{fmt(a.pesoG)}</strong>
                              </span>
                              <Trash2 className="size-3.5 text-muted-foreground opacity-50 group-hover:opacity-100" />
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-muted-foreground py-6">
                        Nenhuma ave na amostra. Digite o peso e aperte Enter para adicionar a
                        próxima.
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}
            <section className="border-t border-border pt-5">
              <h2 className="font-display text-2xl mb-3">Histórico de peso</h2>
              <div className="space-y-2">
                {historico.map((e) => {
                  const idade = diffDias(lote.dataEntrada, e.date);
                  const ref = refPesoG(idade, lote.linhagem ?? "ross_ap95", lote.sexo ?? "misto");
                  const dif = ((Number(e.pesoMedioG) - ref) / ref) * 100;
                  const u = e.amostraPesagem?.length
                    ? estatisticaAmostra(e.amostraPesagem.map((a) => a.pesoG))
                    : null;
                  return (
                    <div
                      key={e.date}
                      className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-3"
                    >
                      <div>
                        <p className="font-medium">
                          {fmtData(e.date)} · D{idade}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {e.amostraPesagem?.length
                            ? `${e.amostraPesagem.length} aves pesadas${u ? ` · uniformidade ${fmt(u.uniformidadePct, 1)}%` : ""}`
                            : "Peso médio registrado"}
                          {e.operadorPesagem ? ` · ${e.operadorPesagem}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <strong className="font-display text-2xl tabular-nums">
                          {fmt(Number(e.pesoMedioG))} g
                        </strong>
                        <p
                          className={`text-xs tabular-nums ${dif < -7 ? "text-destructive" : dif < -3 ? "text-warning-foreground" : "text-success"}`}
                        >
                          {dif > 0 ? "+" : ""}
                          {fmt(dif, 1)}% vs ref. {fmt(ref)} g
                        </p>
                      </div>
                    </div>
                  );
                })}
                {!historico.length && (
                  <p className="text-muted-foreground py-6">Sem pesagens neste lote.</p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
