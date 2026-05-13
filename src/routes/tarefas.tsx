import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useTarefas } from "@/lib/state";
import { uid } from "@/lib/storage";
import { ListChecks, Plus, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/tarefas")({
  head: () => ({
    meta: [
      { title: "Tarefas — AgroSítio" },
      { name: "description", content: "Lista de tarefas da fazenda com prioridade, categoria e vencimento." },
      { property: "og:title", content: "Tarefas — AgroSítio" },
      { property: "og:description", content: "Lista de tarefas da fazenda com prioridade, categoria e vencimento." },
    ],
  }),
  component: TarefasPage,
});

const PRIO = { baixa: "secondary", media: "outline", alta: "destructive" } as const;

function TarefasPage() {
  const [tarefas, setTarefas] = useTarefas();
  const [open, setOpen] = useState(false);
  const [filtro, setFiltro] = useState<"todas" | "pendentes" | "concluidas">("pendentes");

  const [form, setForm] = useState({
    titulo: "", descricao: "", vencimento: "", prioridade: "media" as any, categoria: "geral" as any,
  });

  const criar = () => {
    if (!form.titulo) { toast.error("Informe o título"); return; }
    setTarefas((p) => [{
      id: uid(),
      titulo: form.titulo,
      descricao: form.descricao,
      vencimento: form.vencimento || undefined,
      prioridade: form.prioridade,
      categoria: form.categoria,
      concluida: false,
      criadaEm: new Date().toISOString(),
    }, ...p]);
    setOpen(false);
    setForm({ titulo: "", descricao: "", vencimento: "", prioridade: "media", categoria: "geral" });
    toast.success("Tarefa criada");
  };

  const toggle = (id: string) => setTarefas((p) => p.map((t) => t.id === id ? { ...t, concluida: !t.concluida } : t));
  const remover = (id: string) => setTarefas((p) => p.filter((t) => t.id !== id));

  const visiveis = useMemo(() => {
    return tarefas
      .filter((t) => filtro === "todas" ? true : filtro === "concluidas" ? t.concluida : !t.concluida)
      .sort((a, b) => {
        if (a.vencimento && b.vencimento) return a.vencimento.localeCompare(b.vencimento);
        if (a.vencimento) return -1;
        if (b.vencimento) return 1;
        return b.criadaEm.localeCompare(a.criadaEm);
      });
  }, [tarefas, filtro]);

  const isVencida = (v?: string) => v && new Date(v) < new Date(new Date().toDateString());

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold flex items-center gap-2"><ListChecks className="h-8 w-8 text-primary" /> Tarefas</h1>
            <p className="text-muted-foreground mt-1">Lembretes, vacinas, manutenção e to-do do sítio.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Nova tarefa</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova tarefa</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Field label="Título *"><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></Field>
                <Field label="Descrição"><Textarea rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Vencimento"><Input type="date" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} /></Field>
                  <Field label="Prioridade">
                    <Select value={form.prioridade} onValueChange={(v) => setForm({ ...form, prioridade: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="baixa">Baixa</SelectItem><SelectItem value="media">Média</SelectItem><SelectItem value="alta">Alta</SelectItem></SelectContent>
                    </Select>
                  </Field>
                  <Field label="Categoria">
                    <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="granja">Granja</SelectItem>
                        <SelectItem value="gado">Gado</SelectItem>
                        <SelectItem value="cerca">Cerca</SelectItem>
                        <SelectItem value="maquina">Máquina</SelectItem>
                        <SelectItem value="geral">Geral</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>
              <DialogFooter><Button onClick={criar}>Criar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <div className="flex gap-2">
          <Button size="sm" variant={filtro === "pendentes" ? "default" : "outline"} onClick={() => setFiltro("pendentes")}>Pendentes</Button>
          <Button size="sm" variant={filtro === "concluidas" ? "default" : "outline"} onClick={() => setFiltro("concluidas")}>Concluídas</Button>
          <Button size="sm" variant={filtro === "todas" ? "default" : "outline"} onClick={() => setFiltro("todas")}>Todas</Button>
        </div>

        {visiveis.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <ListChecks className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">Nenhuma tarefa</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {visiveis.map((t) => {
              const vencida = !t.concluida && isVencida(t.vencimento);
              return (
                <Card key={t.id} className={`p-3 flex items-start gap-3 ${vencida ? "border-destructive/40" : ""}`} style={{ background: "var(--gradient-surface)" }}>
                  <Checkbox checked={t.concluida} onCheckedChange={() => toggle(t.id)} className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`font-medium text-sm ${t.concluida ? "line-through text-muted-foreground" : ""}`}>{t.titulo}</p>
                      <Badge variant={PRIO[t.prioridade]} className="text-[10px]">{t.prioridade}</Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">{t.categoria}</Badge>
                      {vencida && <Badge variant="destructive" className="text-[10px] flex gap-1 items-center"><AlertCircle className="h-3 w-3" /> vencida</Badge>}
                    </div>
                    {t.descricao && <p className="text-xs text-muted-foreground mt-0.5">{t.descricao}</p>}
                    {t.vencimento && <p className="text-[11px] text-muted-foreground mt-0.5">📅 {new Date(t.vencimento).toLocaleDateString("pt-BR")}</p>}
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remover(t.id)}><Trash2 className="h-4 w-4" /></Button>
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
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
