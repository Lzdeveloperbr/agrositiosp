import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLotes, useMedidores, useAnimais, useDiario, useFinanceiro } from "@/lib/state";
import { gerarRelatorioLote, gerarRelatorioEnergia, gerarRelatorioGeral, gerarRelatorioRebanho, gerarRelatorioDiario, gerarRelatorioAnimal, gerarLivroCaixa } from "@/lib/pdf";
import { FileText, Bird, Zap, Layers, Beef, BookOpen, Wallet } from "lucide-react";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios em PDF — AgroSítio" },
      { name: "description", content: "Relatórios profissionais em PDF: lotes, rebanho, energia, livro caixa e diário." },
      { property: "og:title", content: "Relatórios em PDF — AgroSítio" },
      { property: "og:description", content: "Relatórios profissionais em PDF: lotes, rebanho, energia, livro caixa e diário." },
    ],
  }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const [lotes] = useLotes();
  const [medidores] = useMedidores();
  const [animais] = useAnimais();
  const [diario] = useDiario();

  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl md:text-4xl font-display font-bold">Relatórios</h1>
          <p className="text-muted-foreground mt-1">Documentos PDF profissionais para arquivo e apresentação.</p>
        </header>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Big icon={Layers} title="Geral do Sítio" desc="Resumo consolidado: granja, gado, energia." action={() => gerarRelatorioGeral(lotes, medidores, animais)} />
          <Big icon={Zap} title="Consumo de Energia" desc="Leituras dos 3 relógios." action={() => gerarRelatorioEnergia(medidores)} />
          <Big icon={Beef} title="Rebanho completo" desc="Lista de animais com peso e status." action={() => gerarRelatorioRebanho(animais)} />
          <Big icon={BookOpen} title="Diário de campo" desc="Todos os registros com fotos." action={() => gerarRelatorioDiario(diario)} />
        </div>

        <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Bird className="h-5 w-5 text-primary" />
            <h2 className="font-display font-semibold text-lg">Por lote</h2>
          </div>
          {lotes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Cadastre um lote para gerar relatórios.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {lotes.map((l) => (
                <div key={l.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50">
                  <div>
                    <p className="font-medium">Lote {l.numero}</p>
                    <p className="text-xs text-muted-foreground">{new Date(l.dataEntrada).toLocaleDateString("pt-BR")} · {l.entries.length} lançamentos</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => gerarRelatorioLote(l)}><FileText className="h-4 w-4 mr-1" /> PDF</Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Beef className="h-5 w-5 text-primary" />
            <h2 className="font-display font-semibold text-lg">Por animal</h2>
          </div>
          {animais.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sem animais cadastrados.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {animais.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50">
                  <div>
                    <p className="font-medium">Brinco {a.brinco}</p>
                    <p className="text-xs text-muted-foreground">{a.sexo} · {a.categoria ?? "—"} · {a.status}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => gerarRelatorioAnimal(a)}><FileText className="h-4 w-4 mr-1" /> PDF</Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function Big({ icon: Icon, title, desc, action }: any) {
  return (
    <Card className="p-6 relative overflow-hidden group cursor-pointer hover:border-primary/40 transition-all" style={{ background: "var(--gradient-surface)", boxShadow: "var(--shadow-card)" }} onClick={action}>
      <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl group-hover:bg-primary/20 transition-colors" />
      <div className="relative">
        <div className="h-12 w-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
          <Icon className="h-6 w-6 text-primary-foreground" />
        </div>
        <h3 className="font-display font-bold text-xl mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{desc}</p>
        <Button variant="secondary"><FileText className="h-4 w-4 mr-1" /> Gerar PDF</Button>
      </div>
    </Card>
  );
}
