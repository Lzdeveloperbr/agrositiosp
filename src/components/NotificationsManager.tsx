import { useEffect, useState } from "react";
import { Bell, BellOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLotes, useTarefas, useEstoque } from "@/lib/state";
import { fechamentoLote } from "@/lib/fechamentoLote";
import { notifPermissao, pedirPermissao, notificar, notifSupportada } from "@/lib/notifications";
import { toast } from "sonner";

export function NotificationsManager() {
  const [lotes] = useLotes();
  const [tarefas] = useTarefas();
  const [estoque] = useEstoque();
  const [perm, setPerm] = useState<string>("default");

  useEffect(() => { setPerm(String(notifPermissao())); }, []);

  // checador periódico (a cada 5 min enquanto app aberto)
  useEffect(() => {
    if (perm !== "granted") return;
    const checar = () => {
      const ativos = lotes.filter((l) => !l.encerrado);
      for (const l of ativos) {
        const f = fechamentoLote(l);
        const metaMort = Math.min(5, (f.idade / 42) * 5);
        if (f.mortPct > metaMort + 1) {
          notificar(`mort-${l.id}`, "🚨 Mortalidade alta", `Lote ${l.numero}: ${f.mortPct.toFixed(2)}% (meta ${metaMort.toFixed(2)}%)`);
        }
        if (f.pesoMedioG && f.pesoVsMetaPct < -8) {
          notificar(`peso-${l.id}`, "⚠️ Peso abaixo da curva", `Lote ${l.numero}: ${Math.abs(f.pesoVsMetaPct).toFixed(1)}% abaixo da meta`);
        }
        if (f.diasPrevistos - f.idade <= 3 && f.diasPrevistos - f.idade > 0) {
          notificar(`abate-${l.id}`, "📅 Abate próximo", `Lote ${l.numero}: faltam ${f.diasPrevistos - f.idade} dias`);
        }
        if (f.racaoRestanteKg < 500 && !l.encerrado && f.idade < f.diasPrevistos) {
          notificar(`racao-${l.id}`, "🌾 Ração acabando", `Lote ${l.numero}: ~${f.racaoRestanteKg.toFixed(0)} kg restantes`);
        }
      }
      const pend = tarefas.filter((t) => !t.concluida && t.prioridade === "alta");
      if (pend.length > 0) notificar(`tarefa-alta`, "✅ Tarefas urgentes", `${pend.length} tarefa(s) de alta prioridade pendentes`);
      const baixo = estoque.filter((i) => i.minimo !== undefined && i.quantidade <= i.minimo);
      if (baixo.length > 0) notificar(`estoque-baixo`, "📦 Estoque baixo", `${baixo.length} item(ns) abaixo do mínimo`);
    };
    checar();
    const t = setInterval(checar, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [perm, lotes, tarefas, estoque]);

  const ativar = async () => {
    const r = await pedirPermissao();
    setPerm(String(r));
    if (r === "granted") toast.success("Notificações ativadas! Você receberá alertas críticos.");
    else if (r === "denied") toast.error("Permissão negada. Ative nas configurações do navegador.");
    else if (r === "unsupported") toast.error("Seu navegador não suporta notificações.");
  };

  if (!notifSupportada() || perm === "granted") return null;

  return (
    <Card className="p-4 border-accent/40 bg-accent/5 flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
        {perm === "denied" ? <BellOff className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">
          {perm === "denied" ? "Notificações bloqueadas" : "Ativar alertas do sítio"}
        </p>
        <p className="text-xs text-muted-foreground">
          {perm === "denied"
            ? "Libere as notificações nas configurações do navegador para receber alertas críticos."
            : "Receba avisos de mortalidade alta, peso fora da meta, ração acabando e abate próximo."}
        </p>
      </div>
      {perm !== "denied" && (
        <Button size="sm" onClick={ativar}><Check className="h-4 w-4 mr-1" /> Ativar</Button>
      )}
    </Card>
  );
}
