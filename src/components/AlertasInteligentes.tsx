import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldCheck, Info, TriangleAlert, ArrowRight } from "lucide-react";
import { gerarAlertas, type Alerta, type Severidade } from "@/lib/alertas";
import { useLotes, useEstoque, useFinanceiro, useTarefas } from "@/lib/state";

const ESTILO: Record<Severidade, { cls: string; icon: any; label: string }> = {
  critico: { cls: "border-destructive/40 bg-destructive/10 text-destructive", icon: AlertTriangle, label: "Crítico" },
  atencao: { cls: "border-accent/40 bg-accent/10 text-accent", icon: TriangleAlert, label: "Atenção" },
  info: { cls: "border-border bg-muted/40 text-muted-foreground", icon: Info, label: "Info" },
};

export function AlertasInteligentes({ limite = 6 }: { limite?: number }) {
  const [lotes] = useLotes();
  const [estoque] = useEstoque();
  const [financeiro] = useFinanceiro();
  const [tarefas] = useTarefas();
  const [tudo, setTudo] = useState(false);

  const alertas: Alerta[] = useMemo(
    () => gerarAlertas({ lotes, estoque, financeiro: financeiro.filter(l => !l.modulo || l.modulo === "granja" || l.modulo === "geral"), tarefas: tarefas.filter(t => t.categoria === "granja" || t.categoria === "geral"), animais: [] }),
    [lotes, estoque, financeiro, tarefas],
  );

  const criticos = alertas.filter((a) => a.severidade === "critico").length;
  const atencao = alertas.filter((a) => a.severidade === "atencao").length;
  const lista = tudo ? alertas : alertas.slice(0, limite);

  return (
    <Card className="p-4 md:p-5" style={{ background: "var(--gradient-surface)" }}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
          <h2 className="font-display font-semibold text-lg truncate">Alertas inteligentes</h2>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {criticos > 0 && <Badge variant="destructive">{criticos} crítico(s)</Badge>}
          {atencao > 0 && <Badge variant="secondary">{atencao} atenção</Badge>}
        </div>
      </div>

      {alertas.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Tudo em ordem por aqui. Nenhum risco detectado nos seus dados. ✅
        </p>
      ) : (
        <div className="grid md:grid-cols-2 gap-2.5">
          {lista.map((a) => {
            const st = ESTILO[a.severidade];
            const Icon = st.icon;
            return (
              <div key={a.id} className={`rounded-xl border p-3 flex gap-3 ${st.cls}`}>
                <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground leading-snug">{a.titulo}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{a.detalhe}</p>
                  <Link to={a.to} className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1.5">
                    Resolver <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {alertas.length > limite && (
        <div className="mt-3 text-center">
          <Button variant="ghost" size="sm" onClick={() => setTudo((v) => !v)}>
            {tudo ? "Mostrar menos" : `Ver todos (${alertas.length})`}
          </Button>
        </div>
      )}
    </Card>
  );
}
