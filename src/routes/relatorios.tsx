import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLotes, useMedidores, useAnimais, useDiario, useFinanceiro, useEstoque, useChuvas } from "@/lib/state";
import { gerarRelatorioLote, gerarRelatorioEnergia, gerarRelatorioGeral, gerarRelatorioRebanho, gerarRelatorioDiario, gerarRelatorioAnimal, gerarLivroCaixa } from "@/lib/pdf";
import { listPdfHistory, deletePdfHistory, downloadFromHistory, printFromHistory, clearPdfHistory, type PdfHistoryItem } from "@/lib/pdfHistory";
import { baixarCSV } from "@/lib/exportar";
import { FileText, Bird, Zap, Layers, Beef, BookOpen, Wallet, History, Download, Printer, Trash2, Table } from "lucide-react";
import { fmtData } from "@/lib/data";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios em PDF — Aviário Pro" },
      { name: "description", content: "Relatórios profissionais em PDF: lotes, rebanho, energia, livro caixa e diário." },
      { property: "og:title", content: "Relatórios em PDF — Aviário Pro" },
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

        <ExportacaoCSV />


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
                    <p className="text-xs text-muted-foreground">{fmtData(l.dataEntrada)} · {l.entries.length} lançamentos</p>
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

        <HistoricoPdfs />
      </div>
    </AppShell>
  );
}

function HistoricoPdfs() {
  const [items, setItems] = useState<PdfHistoryItem[]>([]);

  useEffect(() => {
    const refresh = () => setItems(listPdfHistory());
    refresh();
    window.addEventListener("pdf-history-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("pdf-history-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const fmtSize = (b: number) => b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

  return (
    <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h2 className="font-display font-semibold text-lg">Histórico de PDFs gerados</h2>
        </div>
        {items.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => { if (confirm("Apagar todo o histórico?")) clearPdfHistory(); }}>
            <Trash2 className="h-4 w-4 mr-1" /> Limpar
          </Button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Nenhum PDF gerado ainda. Clique em qualquer botão acima para criar.</p>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card/50">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{it.titulo}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {new Date(it.data).toLocaleString("pt-BR")} · {it.modulo}
                  {it.ref ? ` · ${it.ref}` : ""} · {fmtSize(it.size)}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" variant="outline" onClick={() => downloadFromHistory(it)} title="Baixar">
                  <Download className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => printFromHistory(it)} title="Imprimir">
                  <Printer className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deletePdfHistory(it.id)} title="Excluir">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
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

function ExportacaoCSV() {
  const [lotes] = useLotes();
  const [animais] = useAnimais();
  const [fin] = useFinanceiro();
  const [estoque] = useEstoque();
  const [chuvas] = useChuvas();

  const opcoes = [
    {
      titulo: "Lotes da granja", desc: `${lotes.length} lote(s) com desempenho consolidado`,
      run: () => baixarCSV("lotes", lotes.map((l) => {
        const mort = l.entries.reduce((s, e) => s + (e.mortalidade || 0), 0);
        const elim = l.entries.reduce((s, e) => s + (e.eliminados || 0), 0);
        const peso = [...l.entries].reverse().find((e) => e.pesoMedioG)?.pesoMedioG ?? "";
        return {
          lote: l.numero, data_entrada: l.dataEntrada, alojadas: l.quantidadeInicial,
          mortalidade: mort, eliminados: elim, vivas: l.quantidadeInicial - mort - elim,
          mortalidade_pct: ((mort + elim) / Math.max(1, l.quantidadeInicial) * 100).toFixed(2),
          peso_medio_g: peso, integradora: l.integradora, encerrado: l.encerrado ? "sim" : "nao",
        };
      })),
    },
    {
      titulo: "Lançamentos diários", desc: "Mortalidade, eliminados e peso dia a dia",
      run: () => baixarCSV("lancamentos-diarios", lotes.flatMap((l) => l.entries.map((e) => ({
        lote: l.numero, data: e.date, mortalidade: e.mortalidade, eliminados: e.eliminados ?? 0,
        peso_medio_g: e.pesoMedioG ?? "", observacoes: e.observacoes ?? "",
      })))),
    },
    {
      titulo: "Rebanho", desc: `${animais.length} animal(is) cadastrado(s)`,
      run: () => baixarCSV("rebanho", animais.map((a) => ({
        brinco: a.brinco, nome: a.nome ?? "", sexo: a.sexo, raca: a.raca ?? "", categoria: a.categoria ?? "",
        nascimento: a.nascimento ?? "", data_entrada: a.dataEntrada, status: a.status,
        ultimo_peso_kg: [...a.pesagens].sort((x, y) => x.data.localeCompare(y.data)).pop()?.pesoKg ?? "",
        preco_compra: a.precoCompra ?? "", preco_venda: a.precoVenda ?? "",
      }))),
    },
    {
      titulo: "Financeiro", desc: `${fin.length} lançamento(s) — receitas e despesas`,
      run: () => baixarCSV("financeiro", fin.map((l) => ({
        data: l.data, tipo: l.tipo, categoria: l.categoria, descricao: l.descricao,
        valor: l.valor, modulo: l.modulo ?? "", vencimento: l.vencimento ?? "", status: l.status,
      }))),
    },
    {
      titulo: "Estoque", desc: `${estoque.length} item(ns) com saldo atual`,
      run: () => baixarCSV("estoque", estoque.map((i) => ({
        nome: i.nome, categoria: i.categoria, unidade: i.unidade, quantidade: i.quantidade,
        minimo: i.minimo ?? "", lote: i.loteId ?? "",
      }))),
    },
    {
      titulo: "Chuvas", desc: `${chuvas.length} registro(s) de pluviometria`,
      run: () => baixarCSV("chuvas", chuvas.map((c) => ({ data: c.data, mm: c.mm, local: c.local ?? "", observacoes: c.observacoes ?? "" }))),
    },
  ];

  return (
    <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
      <div className="flex items-center gap-2 mb-1">
        <Table className="h-5 w-5 text-primary" />
        <h2 className="font-display font-semibold text-lg">Exportar dados (Excel / CSV)</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Arquivos prontos para abrir no Excel, Google Sheets ou enviar para o contador.</p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {opcoes.map((o) => (
          <div key={o.titulo} className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border bg-card/50">
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{o.titulo}</p>
              <p className="text-xs text-muted-foreground truncate">{o.desc}</p>
            </div>
            <Button size="sm" variant="outline" onClick={o.run}><Download className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => gerarLivroCaixa(fin, `Todos os lançamentos · ${new Date().getFullYear()}`)}>
          <Wallet className="h-4 w-4 mr-1" /> Livro caixa em PDF
        </Button>
      </div>
    </Card>
  );
}
