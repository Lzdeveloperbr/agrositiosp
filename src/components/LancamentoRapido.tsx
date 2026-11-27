import { useEffect, useId, useMemo, useState } from "react";
import { Droplets, Loader2, Minus, Plus, Save, Thermometer, Wheat } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLotes } from "@/lib/state";
import { useFazenda } from "@/lib/cloud/fazenda";
import { addDias, diffDias, hojeISO } from "@/lib/data";
import {
  mesclarEntry,
  patchMedicao,
  validarLancamento,
  CAMPOS_MEDICAO,
  type FormLancamento,
} from "@/lib/lancamento-rapido";

const EVENTO_ABRIR = "lancamento-rapido:abrir";
export const EVENTO_SALVO = "lancamento-rapido:salvo";
export const abrirLancamentoRapido = () => window.dispatchEvent(new CustomEvent(EVENTO_ABRIR));

const vazio = (data: string): FormLancamento => ({
  data,
  mortalidade: null,
  eliminados: null,
  pesoMedioG: null,
  temperatura_c: null,
  umidade_pct: null,
  consumo_agua_l: null,
  consumo_racao_kg: null,
  uniformidade_pct: null,
  observacoes: "",
});

/** Painel de lançamento do dia: baixas, peso e medições do galpão em um só lugar. */
export function LancamentoRapido() {
  const [lotes, setLotes] = useLotes();
  const { client, fazendaId, operador } = useFazenda();
  const ativos = useMemo(() => lotes.filter((l) => !l.encerrado), [lotes]);
  const [open, setOpen] = useState(false);
  const [loteId, setLoteId] = useState<string | null>(null);
  const lote = ativos.find((l) => l.id === loteId) ?? ativos[0] ?? null;
  const hoje = hojeISO();
  const [form, setForm] = useState<FormLancamento>(() => vazio(hoje));
  const [existente, setExistente] = useState<Record<string, unknown> | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const abrir = () => {
      setForm(vazio(hojeISO()));
      setOpen(true);
    };
    window.addEventListener(EVENTO_ABRIR, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR, abrir);
  }, []);

  // Preenche com o que já existe na data (corrigir o mesmo dia sem duplicar).
  useEffect(() => {
    if (!open || !lote) return;
    let cancel = false;
    const e = lote.entries.find((x) => x.date === form.data);
    setForm((f) => ({
      ...vazio(f.data),
      mortalidade: e ? Number(e.mortalidade) || 0 : null,
      eliminados: e?.eliminados ?? null,
      pesoMedioG: e?.pesoMedioG ?? null,
      observacoes: e?.observacoes ?? "",
    }));
    setExistente(null);
    setCarregando(true);
    void client
      .from("lote_medicoes")
      .select("*")
      .eq("lote_id", lote.id)
      .eq("data", form.data)
      .maybeSingle()
      .then(({ data }) => {
        if (cancel) return;
        setExistente(data ?? null);
        if (data)
          setForm((f) => {
            const n = { ...f };
            for (const k of CAMPOS_MEDICAO)
              n[k] = data[k] === null || data[k] === undefined ? null : Number(data[k]);
            return n;
          });
        setCarregando(false);
      });
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lote?.id, form.data, client]);

  const set = <K extends keyof FormLancamento>(k: K, v: FormLancamento[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const numero = (k: keyof FormLancamento) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(k, (e.target.value === "" ? null : Number(e.target.value.replace(",", "."))) as never);

  async function salvar() {
    if (!lote || !fazendaId) return;
    const erros = validarLancamento(form, lote, hoje);
    if (erros.length) return toast.error(erros[0]);
    setSalvando(true);
    try {
      const m = mesclarEntry(lote.entries ?? [], form);
      if (m.mudou)
        setLotes((prev) => prev.map((l) => (l.id === lote.id ? { ...l, entries: m.entries } : l)));
      const patch = patchMedicao(form);
      const mudouMedicao = Object.entries(patch).some(
        ([k, v]) => !existente || Number(existente[k]) !== v || existente[k] === null,
      );
      if (Object.keys(patch).length && mudouMedicao) {
        const { error } = await client.from("lote_medicoes").upsert(
          {
            ...(existente ?? {}),
            fazenda_id: fazendaId,
            lote_id: lote.id,
            data: form.data,
            ...patch,
            autor: operador || null,
            atualizado_em: new Date().toISOString(),
          },
          { onConflict: "lote_id,data" },
        );
        if (error) throw error;
      }
      if (!m.mudou && !mudouMedicao) toast.info("Nada mudou nesta data.");
      else
        toast.success(`Lote ${lote.numero} · D${diffDias(lote.dataEntrada, form.data)} registrado`);
      window.dispatchEvent(new CustomEvent(EVENTO_SALVO));
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar agora.");
    } finally {
      setSalvando(false);
    }
  }

  const ontem = addDias(hoje, -1);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] overflow-y-auto rounded-t-2xl p-0 pb-[env(safe-area-inset-bottom)] sm:mx-auto sm:max-w-xl"
      >
        <SheetHeader className="border-b border-border p-4 text-left">
          <SheetTitle>Lançamento do dia</SheetTitle>
          <SheetDescription>
            {lote
              ? `Lote ${lote.numero}${lote.galpao ? ` · ${lote.galpao}` : ""} · D${Math.max(0, diffDias(lote.dataEntrada, form.data))}`
              : "Nenhum lote ativo"}
          </SheetDescription>
        </SheetHeader>
        {!lote ? (
          <p className="p-4 text-sm text-muted-foreground">
            Cadastre um lote para lançar os dados do dia.
          </p>
        ) : (
          <div className="space-y-5 p-4">
            <div className="flex flex-wrap gap-2">
              {ativos.length > 1 &&
                ativos.map((l) => (
                  <Chip key={l.id} ativo={l.id === lote.id} onClick={() => setLoteId(l.id)}>
                    Lote {l.numero}
                  </Chip>
                ))}
              <Chip ativo={form.data === hoje} onClick={() => set("data", hoje)}>
                Hoje
              </Chip>
              {ontem >= lote.dataEntrada && (
                <Chip ativo={form.data === ontem} onClick={() => set("data", ontem)}>
                  Ontem
                </Chip>
              )}
              <Input
                type="date"
                value={form.data}
                min={lote.dataEntrada}
                max={hoje}
                onChange={(e) => e.target.value && set("data", e.target.value)}
                className="h-9 w-auto"
              />
              {carregando && (
                <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Stepper
                label="Mortalidade"
                valor={form.mortalidade}
                on={(v) => set("mortalidade", v)}
              />
              <Stepper
                label="Eliminados"
                valor={form.eliminados}
                on={(v) => set("eliminados", v)}
              />
            </div>

            <fieldset className="grid grid-cols-2 gap-3">
              <legend className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                <Thermometer className="h-3.5 w-3.5" /> Dentro do galpão
              </legend>
              <Campo
                label="Temperatura (°C)"
                v={form.temperatura_c}
                on={numero("temperatura_c")}
                step="0.1"
              />
              <Campo label="Umidade (%)" v={form.umidade_pct} on={numero("umidade_pct")} />
            </fieldset>

            <fieldset className="grid grid-cols-2 gap-3">
              <legend className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                <Droplets className="h-3.5 w-3.5" /> Consumo do dia
              </legend>
              <Campo label="Água (L)" v={form.consumo_agua_l} on={numero("consumo_agua_l")} />
              <Campo
                label="Ração (kg)"
                v={form.consumo_racao_kg}
                on={numero("consumo_racao_kg")}
                icon={Wheat}
              />
            </fieldset>

            <div className="grid grid-cols-2 gap-3">
              <Campo label="Peso médio (g)" v={form.pesoMedioG} on={numero("pesoMedioG")} />
              <Campo
                label="Uniformidade (%)"
                v={form.uniformidade_pct}
                on={numero("uniformidade_pct")}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Observações</Label>
              <Textarea
                rows={2}
                value={form.observacoes}
                onChange={(e) => set("observacoes", e.target.value)}
                placeholder="Ex.: troca de ração, vacina, ajuste de cortina…"
              />
            </div>

            <p className="text-[11px] text-muted-foreground">
              Campos vazios não são alterados. Deixe a mortalidade em “—” se ainda não contou as
              aves; use 0 só quando não houve baixas.
            </p>

            <Button className="h-12 w-full text-base" onClick={salvar} disabled={salvando}>
              {salvando ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Save className="h-5 w-5" />
              )}{" "}
              Salvar lançamento
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Chip({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 rounded-full border px-3.5 text-sm font-semibold transition-colors ${ativo ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50"}`}
    >
      {children}
    </button>
  );
}

function Stepper({
  label,
  valor,
  on,
}: {
  label: string;
  valor: number | null;
  on: (v: number | null) => void;
}) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-full"
          aria-label={`Diminuir ${label}`}
          onClick={() => on(Math.max(0, (valor ?? 1) - 1))}
        >
          <Minus className="h-5 w-5" />
        </Button>
        <input
          inputMode="numeric"
          aria-label={label}
          className="w-14 bg-transparent text-center text-3xl font-extrabold tabular-nums outline-none"
          value={valor ?? ""}
          placeholder="—"
          onChange={(e) =>
            on(e.target.value === "" ? null : Math.max(0, Math.floor(Number(e.target.value) || 0)))
          }
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-full"
          aria-label={`Aumentar ${label}`}
          onClick={() => on((valor ?? 0) + 1)}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

function Campo({
  label,
  v,
  on,
  step = "1",
  icon: Icon,
}: {
  label: string;
  v: number | null;
  on: (e: React.ChangeEvent<HTMLInputElement>) => void;
  step?: string;
  icon?: typeof Wheat;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1 text-xs">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        value={v ?? ""}
        onChange={on}
        placeholder="—"
        className="h-11 text-base"
      />
    </div>
  );
}
