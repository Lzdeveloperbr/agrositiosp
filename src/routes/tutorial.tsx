import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, BookOpen, CheckCircle2, ClipboardCheck, Bird, Wind, Scale,
  Boxes, Syringe, Wallet, FileText, ShieldCheck, Smartphone, Lightbulb,
} from "lucide-react";

export const Route = createFileRoute("/tutorial")({
  head: () => ({
    meta: [
      { title: "Tutorial do aplicativo — Aviário Pro" },
      { name: "description", content: "Aprenda passo a passo a configurar e usar o Aviário Pro na rotina da granja." },
    ],
  }),
  component: TutorialPage,
});

const etapas = [
  { id: "fazenda", title: "1. Acesse sua fazenda", detail: "Entre com o código da fazenda e confira se o nome e o operador exibidos no aplicativo estão corretos. Cada fazenda mantém seus próprios registros." },
  { id: "lote", title: "2. Cadastre o lote", detail: "Abra Lotes e cadastre um novo lote. Informe os dados reais de entrada, quantidade de aves, data, integradora e demais campos solicitados. Revise antes de salvar: esses dados servem de base para os indicadores." },
  { id: "diario", title: "3. Faça os lançamentos diários", detail: "Acesse o lote ativo e registre os dados do dia, como mortalidade, eliminados, observações e pesagens quando houver. Lance somente valores conferidos no galpão e evite preencher com estimativas como se fossem medições." },
  { id: "manejo", title: "4. Confira manejo e ambiência", detail: "Use Manejo e Ambiência para acompanhar as informações operacionais disponíveis, como água, cama, iluminação, temperatura, umidade e ventilação. Compare os registros com o protocolo técnico da sua integração e orientação do responsável técnico." },
  { id: "racao", title: "5. Controle ração e estoque", detail: "Em Silo, acompanhe saldo e autonomia com base nos lançamentos realizados. Em Entregas de ração e Estoque, registre recebimentos e movimentações para manter o histórico atualizado." },
  { id: "sanidade", title: "6. Organize a sanidade", detail: "Consulte o Calendário sanitário e registre aplicações conforme o programa oficial do lote e a orientação do médico-veterinário ou responsável técnico. O aplicativo ajuda a organizar informações, mas não substitui prescrição." },
  { id: "tarefas", title: "7. Organize a rotina da equipe", detail: "Crie tarefas com título, categoria, prioridade e vencimento. Marque como concluídas somente depois que o serviço for realizado. Use o Diário para documentar ocorrências e anexar fotos." },
  { id: "relatorios", title: "8. Acompanhe resultados", detail: "Consulte Excelência do lote, Indicadores, Comparativo, Custos e Relatórios para analisar o desempenho. Confira período, lote e origem dos dados antes de tomar decisões." },
  { id: "backup", title: "9. Faça backup regularmente", detail: "Abra Backup e siga as opções disponíveis para exportar seus dados. Guarde o arquivo em local seguro e não compartilhe códigos de acesso ou arquivos com informações da fazenda." },
];

const atalhos = [
  { to: "/", title: "Central", desc: "Resumo do dia, alertas e atalhos.", icon: BookOpen },
  { to: "/granja", title: "Lotes", desc: "Cadastro, histórico e lançamentos dos lotes.", icon: Bird },
  { to: "/checklist-granja", title: "Checklist diário", desc: "Conferência da rotina do galpão.", icon: ClipboardCheck },
  { to: "/ambiencia", title: "Ambiência", desc: "Acompanhamento ambiental.", icon: Wind },
  { to: "/pesagem-pro", title: "Pesagem", desc: "Amostras e evolução de peso.", icon: Scale },
  { to: "/silo", title: "Silo", desc: "Saldo e autonomia da ração.", icon: Boxes },
  { to: "/calendario-sanitario", title: "Sanidade", desc: "Agenda sanitária do lote.", icon: Syringe },
  { to: "/financeiro", title: "Financeiro", desc: "Receitas e despesas lançadas.", icon: Wallet },
  { to: "/relatorios", title: "Relatórios", desc: "Consultas e documentos disponíveis.", icon: FileText },
];

function TutorialPage() {
  const [concluidas, setConcluidas] = useState<string[]>([]);
  const progresso = Math.round((concluidas.length / etapas.length) * 100);
  const alternar = (id: string) => setConcluidas((atual) => atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]);

  return (
    <AppShell>
      <div className="space-y-7">
        <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-8">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/70 px-3 py-1 text-xs font-semibold text-primary">
              <BookOpen className="h-3.5 w-3.5" /> CENTRAL DE APRENDIZADO
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Aprenda a usar o Aviário Pro</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Um guia prático para configurar sua fazenda, registrar a rotina do aviário e acompanhar os resultados. Siga as etapas no seu ritmo e abra cada módulo pelo atalho correspondente.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild><Link to="/"><ArrowRight className="mr-2 h-4 w-4" />Ir para a Central</Link></Button>
              <Button variant="outline" onClick={() => setConcluidas([])}>Reiniciar progresso</Button>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-8 -bottom-16 hidden h-64 w-64 rounded-full border-[28px] border-primary/5 sm:block" />
        </section>

        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Seu progresso neste tutorial</p>
              <p className="mt-1 text-xs text-muted-foreground">{concluidas.length} de {etapas.length} etapas concluídas</p>
            </div>
            <span className="text-2xl font-bold tabular-nums text-primary">{progresso}%</span>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: progresso + "%" }} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">A marcação é apenas um checklist de aprendizado nesta tela; não altera os dados da fazenda.</p>
        </Card>

        <section className="space-y-3">
          <div>
            <p className="eyebrow">COMECE POR AQUI</p>
            <h2 className="text-2xl font-bold">Passo a passo</h2>
            <p className="mt-1 text-sm text-muted-foreground">Abra cada etapa, leia a orientação e marque quando terminar.</p>
          </div>
          <div className="space-y-3">
            {etapas.map((etapa) => {
              const feito = concluidas.includes(etapa.id);
              return (
                <details key={etapa.id} className="group rounded-xl border border-border bg-card open:border-primary/30">
                  <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                    <button type="button" aria-label={feito ? "Desmarcar etapa" : "Marcar etapa como concluída"} onClick={(e) => { e.preventDefault(); e.stopPropagation(); alternar(etapa.id); }} className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${feito ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
                      {feito ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs">○</span>}
                    </button>
                    <span className={`flex-1 text-sm font-semibold sm:text-base ${feito ? "text-muted-foreground line-through" : ""}`}>{etapa.title}</span>
                    <span className="text-xs text-muted-foreground transition-transform group-open:rotate-90">›</span>
                  </summary>
                  <div className="border-t border-border px-4 pb-4 pt-3 pl-14">
                    <p className="text-sm leading-6 text-muted-foreground">{etapa.detail}</p>
                    <button type="button" onClick={() => alternar(etapa.id)} className="mt-3 text-xs font-semibold text-primary hover:underline">{feito ? "Desmarcar etapa" : "Marcar como concluída"}</button>
                  </div>
                </details>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <p className="eyebrow">ACESSO RÁPIDO</p>
            <h2 className="text-2xl font-bold">Conheça os principais módulos</h2>
            <p className="mt-1 text-sm text-muted-foreground">Toque em um cartão para abrir a ferramenta correspondente.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {atalhos.map((item) => {
              const Icon = item.icon;
              return <Link key={item.to} to={item.to} className="group flex gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><strong className="block text-sm">{item.title}</strong><span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.desc}</span></span>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </Link>;
            })}
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><h3 className="font-semibold">Boas práticas e segurança</h3></div>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-5 text-muted-foreground">
              <li>Registre dados reais e confira antes de salvar.</li>
              <li>Não compartilhe o código de acesso da fazenda.</li>
              <li>Faça backups periódicos e mantenha uma cópia segura.</li>
              <li>Use os indicadores como apoio; decisões técnicas devem considerar o responsável técnico.</li>
            </ul>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-primary" /><h3 className="font-semibold">Dicas para usar no celular</h3></div>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-5 text-muted-foreground">
              <li>Use o botão de menu para localizar os módulos.</li>
              <li>Na busca rápida, digite o nome do recurso desejado.</li>
              <li>Adicione o aplicativo à tela inicial pelo recurso de instalação, quando disponível.</li>
              <li>Confira se a conexão voltou antes de considerar um registro concluído.</li>
            </ul>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Smartphone className="h-4 w-4" /> Interface adaptada para celular e computador.</div>
          </Card>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div><p className="font-semibold">Pronto para começar?</p><p className="mt-1 text-xs text-muted-foreground">Volte à Central para acompanhar a operação.</p></div>
          <Button asChild><Link to="/">Abrir Central <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </div>
      </div>
    </AppShell>
  );
}
