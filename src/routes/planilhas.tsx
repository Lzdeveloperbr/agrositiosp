import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCloudCollection } from "@/lib/cloud/useCloudCollection";
import { useResumoPropriedade } from "@/lib/varsSistema";
import {
  MODELOS, COL_LETRAS, avaliarTudo, VARIAVEIS_DOC, numeroDe, type Celulas,
} from "@/lib/planilha";
import { Plus, Table2, Trash2, Save, Sigma, Download, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/planilhas")({
  head: () => ({
    meta: [
      { title: "Planilhas Inteligentes — AgroSítio" },
      { name: "description", content: "Planilhas com fórmulas estilo Excel conectadas aos dados vivos da granja, do leite, da engorda e do financeiro." },
      { property: "og:title", content: "Planilhas Inteligentes — AgroSítio" },
      { property: "og:description", content: "Fórmulas, cálculos e variáveis vivas da propriedade em uma planilha só sua." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Planilhas,
});

type PlanilhaRow = {
  id: string;
  nome: string;
  modelo: string;
  atividade: string | null;
  colunas: string[];
  celulas: Celulas;
  linhas: number;
  config: any;
  created_at?: string;
};

function Planilhas() {
  const { items, add, update, remove, loading } = useCloudCollection<PlanilhaRow>("planilhas");
  const { vars } = useResumoPropriedade();
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const aberta = items.find((p) => p.id === abertaId) ?? null;

  async function criar(modeloId: string) {
    const m = MODELOS.find((x) => x.id === modeloId)!;
    const nova = await add({
      nome: m.nome,
      modelo: m.id,
      atividade: m.atividade,
      colunas: m.colunas as any,
      celulas: m.celulas as any,
      linhas: m.linhas,
      config: {} as any,
    });
    if (nova) { setAbertaId(nova.id); toast.success("Planilha criada"); }
  }

  if (aberta) {
    return (
      <AppShell>
        <Editor
          planilha={aberta}
          vars={vars}
          onVoltar={() => setAbertaId(null)}
          onSalvar={(patch) => update(aberta.id, patch)}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Planilhas Inteligentes</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Fórmulas como no Excel + variáveis vivas da sua propriedade.
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Nova planilha</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Escolha um modelo</DialogTitle></DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                {MODELOS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => criar(m.id)}
                    className="card-elevated p-4 text-left transition-all hover:border-primary/40"
                  >
                    <div className="flex items-center gap-2">
                      <Table2 className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm">{m.nome}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{m.descricao}</p>
                    <Badge variant="secondary" className="mt-2 text-[10px] uppercase">{m.atividade}</Badge>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </header>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : items.length === 0 ? (
          <div className="card-elevated p-8 text-center">
            <Table2 className="h-8 w-8 mx-auto text-primary" />
            <p className="mt-3 font-semibold">Nenhuma planilha ainda</p>
            <p className="text-sm text-muted-foreground">Crie a primeira a partir de um modelo pronto.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <div key={p.id} className="card-elevated p-4">
                <button className="text-left w-full" onClick={() => setAbertaId(p.id)}>
                  <div className="flex items-center gap-2">
                    <Table2 className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">{p.nome}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(p.colunas?.length ?? 0)} colunas · {p.linhas} linhas
                  </p>
                </button>
                <div className="flex items-center justify-between mt-3">
                  <Badge variant="secondary" className="text-[10px] uppercase">{p.atividade ?? "geral"}</Badge>
                  <Button
                    size="icon" variant="ghost"
                    onClick={() => { if (confirm("Excluir planilha?")) remove(p.id); }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <section className="card-elevated p-4">
          <div className="flex items-center gap-2">
            <Sigma className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Variáveis vivas disponíveis</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 mt-3">
            {VARIAVEIS_DOC.map((v) => (
              <div key={v.chave} className="rounded-lg border border-border/60 px-3 py-2">
                <code className="text-xs text-primary">{v.chave}</code>
                <p className="text-[11px] text-muted-foreground">{v.desc}</p>
                <p className="text-[11px] tabular-nums">Agora: {(vars[v.chave] ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Editor({
  planilha, vars, onVoltar, onSalvar,
}: {
  planilha: PlanilhaRow;
  vars: Record<string, number>;
  onVoltar: () => void;
  onSalvar: (patch: Partial<PlanilhaRow>) => Promise<any>;
}) {
  const [celulas, setCelulas] = useState<Celulas>(planilha.celulas ?? {});
  const [nome, setNome] = useState(planilha.nome);
  const [linhas, setLinhas] = useState(planilha.linhas || 20);
  const [colunas, setColunas] = useState<string[]>(planilha.colunas?.length ? planilha.colunas : ["A", "B", "C", "D"]);
  const [sel, setSel] = useState<string>("A1");
  const [sujo, setSujo] = useState(false);

  const calc = useMemo(() => avaliarTudo(celulas, vars), [celulas, vars]);

  function setCel(k: string, v: string) {
    setCelulas((prev) => ({ ...prev, [k]: v }));
    setSujo(true);
  }

  async function salvar() {
    await onSalvar({ nome, celulas: celulas as any, linhas, colunas: colunas as any });
    setSujo(false);
    toast.success("Planilha salva");
  }

  function exportarCsv() {
    const linhasCsv: string[] = [];
    for (let r = 1; r <= linhas; r++) {
      linhasCsv.push(colunas.map((c) => {
        const v = calc[`${c}${r}`] ?? celulas[`${c}${r}`] ?? "";
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(";"));
    }
    const blob = new Blob(["\ufeff" + linhasCsv.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${nome}.csv`;
    a.click();
  }

  const somaSel = useMemo(() => {
    const vals = Object.keys(celulas)
      .filter((k) => k.startsWith(sel.replace(/\d+$/, "")))
      .map((k) => numeroDe(calc[k] as any));
    return vals.reduce((s, v) => s + v, 0);
  }, [celulas, calc, sel]);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onVoltar}><ArrowLeft className="h-4 w-4" /></Button>
        <Input
          value={nome}
          onChange={(e) => { setNome(e.target.value); setSujo(true); }}
          className="h-10 max-w-xs font-semibold"
        />
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={exportarCsv}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button size="sm" className="gap-2" onClick={salvar} disabled={!sujo}>
            <Save className="h-4 w-4" /> Salvar
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-md border border-border/60 px-2 py-1 font-mono">{sel}</span>
        <Input
          value={celulas[sel] ?? ""}
          onChange={(e) => setCel(sel, e.target.value)}
          placeholder="Valor ou fórmula: =SOMA(B2:B8) · =@granja.vivas"
          className="h-9 flex-1 min-w-[200px] font-mono text-xs"
        />
        <span className="tabular-nums">Soma da coluna: {somaSel.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</span>
      </div>

      <div className="card-elevated overflow-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card w-10 border border-border/50 text-[10px] text-muted-foreground">#</th>
              {colunas.map((c) => (
                <th key={c} className="border border-border/50 bg-muted/40 px-2 py-1 text-[11px] font-semibold text-muted-foreground min-w-[110px]">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: linhas }, (_, i) => i + 1).map((r) => (
              <tr key={r}>
                <td className="sticky left-0 z-10 bg-card border border-border/50 text-center text-[10px] text-muted-foreground tabular-nums">{r}</td>
                {colunas.map((c) => {
                  const k = `${c}${r}`;
                  const ativo = sel === k;
                  const bruto = celulas[k] ?? "";
                  const valor = calc[k];
                  const formula = bruto.startsWith("=");
                  return (
                    <td key={k} className={`border border-border/50 p-0 ${ativo ? "ring-2 ring-primary ring-inset" : ""}`}>
                      <input
                        value={ativo ? bruto : (valor !== undefined && valor !== "" ? String(typeof valor === "number" ? valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : valor) : "")}
                        onFocus={() => setSel(k)}
                        onChange={(e) => setCel(k, e.target.value)}
                        className={`w-full bg-transparent px-2 py-1.5 text-xs outline-none tabular-nums ${formula && !ativo ? "text-primary" : ""}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => { setLinhas((n) => n + 10); setSujo(true); }}>+10 linhas</Button>
        <Button
          variant="outline" size="sm"
          onClick={() => {
            const prox = COL_LETRAS[colunas.length];
            if (prox) { setColunas((c) => [...c, prox]); setSujo(true); }
          }}
        >
          + coluna
        </Button>
      </div>
    </div>
  );
}
