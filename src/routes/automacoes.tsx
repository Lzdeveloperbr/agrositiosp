import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { useFazenda } from "@/lib/cloud/fazenda";
import { useLotes, useEstoque, useAnimais, useFinanceiro } from "@/lib/state";
import { Zap, Bell, AlertTriangle, CheckCircle2, Bird, PackageX, Wallet, Syringe } from "lucide-react";
import { hojeISO, isoLocal } from "@/lib/data";

export const Route = createFileRoute("/automacoes")({
  head: () => ({
    meta: [
      { title: "Automações & Alertas — AgroSítio" },
      { name: "description", content: "Regras inteligentes que monitoram mortalidade, estoque, vacinas e contas, e disparam alertas automáticos no painel." },
    ],
  }),
  component: AutomacoesPage,
});

type Regra = { id: string; titulo: string; descricao: string; icon: any; ativa: boolean; gatilho: () => { ativa: boolean; severidade: "info" | "alerta" | "critico"; mensagem: string }[] };

function AutomacoesPage() {
  const [lotes] = useLotes();
  const [estoque] = useEstoque();
  const [animais] = useAnimais();
  const [fin] = useFinanceiro();
  const { fazendaId } = useFazenda();
  const storageKey = `agro:automacoes:${fazendaId ?? "_"}`;
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try { setEnabled(JSON.parse(localStorage.getItem(storageKey) || "{}")); } catch {}
  }, [storageKey]);
  const toggle = (id: string, v: boolean) => {
    const next = { ...enabled, [id]: v };
    setEnabled(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  };
  const isOn = (id: string) => enabled[id] !== false; // default ON

  const hoje = hojeISO();
  const em7 = new isoLocal(Date(Date.now() + 7 * 86400000));
  const em30 = new isoLocal(Date(Date.now() + 30 * 86400000));

  const regras: Regra[] = useMemo(() => [
    {
      id: "mortalidade-alta",
      titulo: "Mortalidade alta",
      descricao: "Dispara quando mortalidade do lote ativo passar de 5%.",
      icon: Bird,
      ativa: isOn("mortalidade-alta"),
      gatilho: () => {
        const a = lotes.find((l) => !l.encerrado);
        if (!a) return [];
        const m = a.entries.reduce((s, e) => s + e.mortalidade, 0);
        const pct = (m / a.quantidadeInicial) * 100;
        if (pct > 5) return [{ ativa: true, severidade: pct > 8 ? "critico" : "alerta", mensagem: `Lote ${a.numero}: mortalidade em ${pct.toFixed(2)}% (${m} aves).` }];
        return [];
      },
    },
    {
      id: "estoque-baixo",
      titulo: "Estoque abaixo do mínimo",
      descricao: "Avisa quando qualquer item ficar igual ou abaixo do estoque mínimo.",
      icon: PackageX,
      ativa: isOn("estoque-baixo"),
      gatilho: () => {
        const itens = estoque.filter((i) => i.minimo !== undefined && i.quantidade <= (i.minimo ?? 0));
        return itens.map((i) => ({ ativa: true, severidade: "alerta" as const, mensagem: `${i.nome}: ${i.quantidade} ${i.unidade} (mín ${i.minimo}).` }));
      },
    },
    {
      id: "vacina-proxima",
      titulo: "Vacina/medicação próxima",
      descricao: "Lista aplicações dos próximos 30 dias e atrasadas.",
      icon: Syringe,
      ativa: isOn("vacina-proxima"),
      gatilho: () => {
        const evts = animais.flatMap((a) => a.sanidade.map((s) => ({ ...s, brinco: a.brinco })));
        const atras = evts.filter((e) => e.proximaData && e.proximaData < hoje);
        const prox = evts.filter((e) => e.proximaData && e.proximaData >= hoje && e.proximaData <= em30);
        const out: any[] = [];
        if (atras.length) out.push({ ativa: true, severidade: "critico" as const, mensagem: `${atras.length} aplicação(ões) atrasada(s).` });
        if (prox.length) out.push({ ativa: true, severidade: "info" as const, mensagem: `${prox.length} aplicação(ões) nos próximos 30 dias.` });
        return out;
      },
    },
    {
      id: "contas-vencendo",
      titulo: "Contas a vencer",
      descricao: "Avisa contas pendentes nos próximos 7 dias e contas atrasadas.",
      icon: Wallet,
      ativa: isOn("contas-vencendo"),
      gatilho: () => {
        const pend = fin.filter((l) => l.status !== "pago" && l.vencimento && l.vencimento <= em7);
        const atr = pend.filter((l) => l.vencimento! < hoje);
        const out: any[] = [];
        if (atr.length) out.push({ ativa: true, severidade: "critico" as const, mensagem: `${atr.length} conta(s) atrasada(s).` });
        if (pend.length - atr.length > 0) out.push({ ativa: true, severidade: "alerta" as const, mensagem: `${pend.length - atr.length} conta(s) vencendo em 7 dias.` });
        return out;
      },
    },
    {
      id: "lote-abate",
      titulo: "Lote próximo ao abate",
      descricao: "Avisa quando lote ativo está nos últimos 7 dias da previsão.",
      icon: Bird,
      ativa: isOn("lote-abate"),
      gatilho: () => {
        const a = lotes.find((l) => !l.encerrado);
        if (!a) return [];
        const idade = a.entries.length;
        const faltam = a.previsaoAbateDias - idade;
        if (faltam <= 7 && faltam >= 0) return [{ ativa: true, severidade: "info" as const, mensagem: `Lote ${a.numero}: ${faltam} dia(s) para o abate.` }];
        return [];
      },
    },
  ], [lotes, estoque, animais, fin, enabled]);

  const ativos = regras.filter((r) => r.ativa).flatMap((r) => r.gatilho().map((g) => ({ ...g, regra: r })));
  const criticos = ativos.filter((a) => a.severidade === "critico");

  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2"><Zap className="h-6 w-6 text-primary" /> Automações & Alertas</h1>
          <p className="text-muted-foreground text-sm">Regras inteligentes que vigiam sua fazenda 24h e disparam alertas no painel.</p>
        </header>

        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4"><div className="text-xs text-muted-foreground">Regras ativas</div><div className="text-2xl font-bold">{regras.filter((r) => r.ativa).length}/{regras.length}</div></Card>
          <Card className="p-4 border-accent/40"><div className="text-xs text-muted-foreground">Alertas agora</div><div className="text-2xl font-bold text-accent">{ativos.length}</div></Card>
          <Card className="p-4 border-destructive/40"><div className="text-xs text-muted-foreground">Críticos</div><div className="text-2xl font-bold text-destructive">{criticos.length}</div></Card>
        </div>

        {ativos.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-3"><Bell className="h-4 w-4 text-accent" /> Alertas ativos</h3>
            <div className="space-y-2">
              {ativos.map((a, i) => (
                <div key={i} className={`flex items-center gap-3 p-2.5 rounded-md border ${a.severidade === "critico" ? "border-destructive/50 bg-destructive/5" : a.severidade === "alerta" ? "border-accent/50 bg-accent/5" : "border-border/60"}`}>
                  <a.regra.icon className={`h-4 w-4 ${a.severidade === "critico" ? "text-destructive" : "text-accent"}`} />
                  <div className="flex-1 text-sm"><span className="font-medium">{a.regra.titulo}:</span> {a.mensagem}</div>
                  <Badge variant={a.severidade === "critico" ? "destructive" : "secondary"} className="text-[10px]">{a.severidade}</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Regras configuráveis</h3>
          <div className="space-y-2">
            {regras.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-md border border-border/60">
                <r.icon className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{r.titulo}</div>
                  <div className="text-xs text-muted-foreground">{r.descricao}</div>
                </div>
                <Switch checked={r.ativa} onCheckedChange={(v) => toggle(r.id, v)} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 bg-muted/30">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Como funciona</p>
              <p className="text-muted-foreground">As regras rodam automaticamente toda vez que você abre o painel. Alertas críticos aparecem no <Link to="/" className="text-primary underline">Início</Link> e na sua tela de notificação do celular (se autorizado).</p>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
