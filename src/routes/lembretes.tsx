import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bell, BellRing, Plus, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useFazenda } from "@/lib/cloud/fazenda";
import { useLembretes, type Lembrete, pedirPermissaoNotificacao, lembretesDoDia, proximosLembretes, dispararNotificacao } from "@/lib/lembretes";

export const Route = createFileRoute("/lembretes")({
  head: () => ({
    meta: [
      { title: "Lembretes Mensais — Aviário Pro" },
      { name: "description", content: "Contas e tarefas recorrentes (energia, internet, leituras) com notificação no dia." },
      { property: "og:title", content: "Lembretes Mensais — Aviário Pro" },
      { property: "og:description", content: "Contas e tarefas recorrentes (energia, internet, leituras) com notificação no dia." },
    ],
  }),
  component: LembretesPage,
});

const CATS: { v: Lembrete["categoria"]; label: string }[] = [
  { v: "energia", label: "⚡ Energia" },
  { v: "agua", label: "💧 Água" },
  { v: "internet", label: "📡 Internet" },
  { v: "telefone", label: "📞 Telefone" },
  { v: "imposto", label: "🧾 Imposto" },
  { v: "salario", label: "💰 Salário" },
  { v: "racao", label: "🌾 Ração / Insumo" },
  { v: "outro", label: "📌 Outro" },
];

function LembretesPage() {
  const { fazendaId } = useFazenda();
  const [items, setItems] = useLembretes(fazendaId);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Partial<Lembrete>>({ categoria: "outro", dia: 1, ativo: true, notificar: true });
  const permissao = typeof Notification !== "undefined" ? Notification.permission : "default";

  const hoje = lembretesDoDia(items);
  const proximos = proximosLembretes(items, 30);

  const salvar = () => {
    if (!edit.titulo || !edit.dia) { toast.error("Preencha título e dia"); return; }
    const novo: Lembrete = {
      id: edit.id || crypto.randomUUID(),
      titulo: edit.titulo!,
      descricao: edit.descricao,
      dia: Math.min(31, Math.max(1, Number(edit.dia))),
      categoria: edit.categoria as Lembrete["categoria"],
      ativo: edit.ativo ?? true,
      notificar: edit.notificar ?? true,
    };
    setItems((prev) => edit.id ? prev.map((p) => p.id === edit.id ? novo : p) : [...prev, novo]);
    setOpen(false);
    setEdit({ categoria: "outro", dia: 1, ativo: true, notificar: true });
    toast.success("Lembrete salvo");
  };

  const ativarNotif = async () => {
    const r = await pedirPermissaoNotificacao();
    if (r === "granted") {
      dispararNotificacao("Aviário Pro", "Notificações ativadas com sucesso!");
      toast.success("Notificações ativadas");
    } else {
      toast.error("Permissão negada — ative nas configurações do navegador");
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
              <BellRing className="h-7 w-7 text-primary" /> Lembretes
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Contas mensais e tarefas recorrentes — com notificação no dia.</p>
          </div>
          <div className="flex gap-2">
            {permissao !== "granted" && (
              <Button variant="outline" size="sm" onClick={ativarNotif}><Bell className="h-4 w-4 mr-1.5" /> Ativar notificações</Button>
            )}
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEdit({ categoria: "outro", dia: 1, ativo: true, notificar: true }); }}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{edit.id ? "Editar lembrete" : "Novo lembrete"}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Título</Label><Input value={edit.titulo ?? ""} onChange={(e) => setEdit({ ...edit, titulo: e.target.value })} placeholder="Ex: Pagar internet" /></div>
                  <div><Label>Descrição</Label><Input value={edit.descricao ?? ""} onChange={(e) => setEdit({ ...edit, descricao: e.target.value })} placeholder="Opcional" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Dia do mês</Label>
                      <Input type="number" min={1} max={31} value={edit.dia ?? 1} onChange={(e) => setEdit({ ...edit, dia: Number(e.target.value) })} />
                    </div>
                    <div>
                      <Label>Categoria</Label>
                      <Select value={edit.categoria} onValueChange={(v) => setEdit({ ...edit, categoria: v as any })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CATS.map((c) => <SelectItem key={c.v} value={c.v}>{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <Label>Notificar no dia</Label>
                    <Switch checked={edit.notificar ?? true} onCheckedChange={(v) => setEdit({ ...edit, notificar: v })} />
                  </div>
                  <Button className="w-full" onClick={salvar}>Salvar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {hoje.length > 0 && (
          <Card className="p-4 border-primary/40 bg-primary/5">
            <div className="flex items-center gap-2 mb-2"><BellRing className="h-5 w-5 text-primary" /><h2 className="font-semibold">Hoje</h2></div>
            <div className="space-y-2">
              {hoje.map((l) => (
                <div key={l.id} className="flex items-center justify-between p-2 rounded bg-background/50">
                  <div><div className="font-medium text-sm">{l.titulo}</div><div className="text-xs text-muted-foreground">{l.descricao}</div></div>
                  <Badge>{CATS.find((c) => c.v === l.categoria)?.label}</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Calendar className="h-4 w-4" /> Próximos 30 dias</h2>
          {proximos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lembrete previsto.</p>
          ) : (
            <div className="space-y-2">
              {proximos.map(({ lembrete: l, diasAte }) => (
                <div key={l.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/60 hover:bg-muted/30">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex flex-col items-center justify-center text-xs font-semibold">
                    <span className="text-base leading-none">{l.dia}</span>
                    <span className="text-[9px]">dia</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{l.titulo}</div>
                    <div className="text-xs text-muted-foreground truncate">{l.descricao}</div>
                  </div>
                  <Badge variant={diasAte === 0 ? "default" : diasAte <= 3 ? "destructive" : "secondary"}>
                    {diasAte === 0 ? "Hoje" : `${diasAte}d`}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={() => { setEdit(l); setOpen(true); }}>✏️</Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold mb-3">Todos os lembretes ({items.length})</h2>
          <div className="space-y-2">
            {items.map((l) => (
              <div key={l.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/60">
                <Switch checked={l.ativo} onCheckedChange={(v) => setItems((prev) => prev.map((p) => p.id === l.id ? { ...p, ativo: v } : p))} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{l.titulo} <span className="text-muted-foreground font-normal">— dia {l.dia}</span></div>
                  <div className="text-xs text-muted-foreground truncate">{CATS.find((c) => c.v === l.categoria)?.label} {l.notificar ? "· 🔔" : ""}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setEdit(l); setOpen(true); }}>✏️</Button>
                <Button variant="ghost" size="icon" onClick={() => { setItems((prev) => prev.filter((p) => p.id !== l.id)); toast.success("Removido"); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
