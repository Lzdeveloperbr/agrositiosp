import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ClipboardCheck, FileDown, Thermometer, Droplets, Utensils, Wind, Shield,
  Skull, Lightbulb, Sparkles, AlertTriangle, CheckCircle2, TrendingUp, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { savePdf } from "@/lib/pdfHistory";
import { SITIO } from "@/lib/pdf";
import { fmtData, hojeISO } from "@/lib/data";

export const Route = createFileRoute("/checklist-granja")({
  head: () => ({
    meta: [
      { property: "og:title", content: "Checklist Diário da Granja — Aviário Pro" },
      { property: "og:description", content: "Checklist profissional diário para frangos de corte: ambiência, água, ração, cama, biosseguridade e mortalidade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Checklist Diário da Granja — Aviário Pro" },
      { name: "description", content: "Checklist profissional diário para frangos de corte: ambiência, água, ração, cama, biosseguridade e mortalidade." },
    ],
  }),
  component: ChecklistGranjaPage,
});

// ============== Estrutura ==============
type Item = { id: string; label: string; critico?: boolean; dica?: string };
type Secao = { id: string; titulo: string; icone: any; cor: string; itens: Item[] };

const SECOES_BASE: Secao[] = [
  {
    id: "ambiencia",
    titulo: "Ambiência & Clima",
    icone: Thermometer,
    cor: "text-orange-500",
    itens: [
      { id: "temp_manha", label: "Temperatura ambiente medida (manhã)", critico: true, dica: "Pintinho 1ª sem: 32-34°C" },
      { id: "temp_tarde", label: "Temperatura ambiente medida (tarde)", critico: true },
      { id: "temp_cama", label: "Temperatura da cama verificada", dica: "Termômetro a 2cm da cama" },
      { id: "umidade", label: "Umidade dentro da faixa (50-70%)" },
      { id: "exaustores", label: "Exaustores funcionando 100%", critico: true },
      { id: "cortinas", label: "Cortinas/janelas reguladas conforme idade" },
      { id: "nebulizadores", label: "Nebulizadores/aspersores limpos e operantes" },
      { id: "sensores", label: "Sensores e controlador climático aferidos" },
    ],
  },
  {
    id: "agua",
    titulo: "Água",
    icone: Droplets,
    cor: "text-blue-500",
    itens: [
      { id: "agua_disp", label: "Água disponível em todos os bebedouros", critico: true },
      { id: "agua_limpa", label: "Linhas e bebedouros limpos (sem biofilme)" },
      { id: "pressao", label: "Pressão de água conferida (nipples)" },
      { id: "cloro", label: "Cloração da água verificada (3-5 ppm)" },
      { id: "ph", label: "pH da água (5,5 a 7,0)" },
      { id: "consumo_agua", label: "Consumo de água anotado", critico: true, dica: "Consumo cai = sinal de alerta" },
      { id: "vazamentos", label: "Sem vazamentos na linha" },
    ],
  },
  {
    id: "racao",
    titulo: "Ração & Comedouros",
    icone: Utensils,
    cor: "text-amber-600",
    itens: [
      { id: "racao_disp", label: "Ração disponível em todos os comedouros", critico: true },
      { id: "tipo_racao", label: "Tipo de ração confere com a idade do lote", critico: true },
      { id: "altura_comed", label: "Altura dos comedouros ajustada (nível do dorso)" },
      { id: "silo_estoque", label: "Estoque de ração no silo conferido" },
      { id: "qualidade", label: "Sem ração mofada, úmida ou com odor" },
      { id: "desperdicio", label: "Sem desperdício no chão" },
      { id: "consumo_racao", label: "Consumo de ração registrado" },
    ],
  },
  {
    id: "cama",
    titulo: "Cama & Galpão",
    icone: Sparkles,
    cor: "text-yellow-600",
    itens: [
      { id: "cama_seca", label: "Cama seca e solta (sem empedramento)", critico: true },
      { id: "revolver", label: "Cama revolvida nos pontos úmidos" },
      { id: "limpeza_geral", label: "Galpão sem fezes acumuladas/áreas sujas" },
      { id: "telhado", label: "Telhado e estrutura sem goteiras" },
      { id: "telas", label: "Telas de proteção íntegras (pragas/aves)" },
      { id: "luz", label: "Iluminação conforme programa de luz", dica: "Intensidade e horas certas por idade" },
    ],
  },
  {
    id: "biosseguranca",
    titulo: "Biosseguridade",
    icone: Shield,
    cor: "text-emerald-600",
    itens: [
      { id: "pedilúvio", label: "Pedilúvio com cal/desinfetante ativo", critico: true },
      { id: "epi", label: "Botas e roupa exclusivas do galpão" },
      { id: "visitas", label: "Sem visitas não autorizadas registradas" },
      { id: "isca_rato", label: "Iscas de roedores ativas e checadas" },
      { id: "moscas", label: "Controle de moscas/cascudinho realizado" },
      { id: "isolamento", label: "Aviário isolado de outras criações" },
    ],
  },
  {
    id: "mortalidade",
    titulo: "Mortalidade & Sanidade",
    icone: Skull,
    cor: "text-red-500",
    itens: [
      { id: "coleta_mortos", label: "Coleta de aves mortas realizada (2x dia)", critico: true },
      { id: "registro_mort", label: "Mortalidade registrada na ficha do lote", critico: true },
      { id: "necropsia", label: "Necropsia de amostras suspeitas (se houver)" },
      { id: "refugos", label: "Refugos identificados e eliminados conforme protocolo" },
      { id: "composteira", label: "Composteira/destino correto das carcaças" },
      { id: "sintomas", label: "Sem sintomas anormais (respiratório, diarreia, etc.)" },
    ],
  },
  {
    id: "equipamentos",
    titulo: "Equipamentos & Energia",
    icone: Lightbulb,
    cor: "text-violet-500",
    itens: [
      { id: "gerador", label: "Gerador testado e com combustível", critico: true },
      { id: "alarme", label: "Alarme de queda de energia funcionando", critico: true },
      { id: "campanulas", label: "Aquecedores/campânulas operando (se aplicável)" },
      { id: "motor_exaustor", label: "Sem ruídos anormais nos motores" },
      { id: "lâmpadas", label: "Lâmpadas queimadas substituídas" },
      { id: "rede_eletrica", label: "Rede elétrica sem fios expostos" },
    ],
  },
];

type Resposta = { v: boolean; obs?: string };
type Estado = {
  data: string;
  loteNumero: string;
  idadeDias: string;
  galpao: string;
  responsavel: string;
  // medidas numéricas
  tempManha: string; tempTarde: string;
  umidade: string;
  consumoAgua: string; consumoRacao: string;
  mortosDia: string; refugos: string;
  observacoesGerais: string;
  respostas: Record<string, Resposta>;
};

const LS_KEY = "agro:checklist-granja:v1";

function novoEstado(): Estado {
  return {
    data: hojeISO(),
    loteNumero: "",
    idadeDias: "",
    galpao: "",
    responsavel: "",
    tempManha: "", tempTarde: "",
    umidade: "",
    consumoAgua: "", consumoRacao: "",
    mortosDia: "", refugos: "",
    observacoesGerais: "",
    respostas: {},
  };
}

function ChecklistGranjaPage() {
  const [estado, setEstado] = useState<Estado>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return { ...novoEstado(), ...JSON.parse(raw) };
    } catch {}
    return novoEstado();
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(estado));
  }, [estado]);

  const totalItens = useMemo(() => SECOES_BASE.reduce((s, sec) => s + sec.itens.length, 0), []);
  const totalCriticos = useMemo(() => SECOES_BASE.reduce((s, sec) => s + sec.itens.filter(i => i.critico).length, 0), []);

  const stats = useMemo(() => {
    let ok = 0, criticosOk = 0;
    SECOES_BASE.forEach(sec => sec.itens.forEach(it => {
      const r = estado.respostas[it.id];
      if (r?.v) { ok++; if (it.critico) criticosOk++; }
    }));
    return {
      ok, criticosOk,
      pct: Math.round((ok / totalItens) * 100),
      pctCrit: Math.round((criticosOk / totalCriticos) * 100),
    };
  }, [estado.respostas, totalItens, totalCriticos]);

  const idade = parseInt(estado.idadeDias) || 0;
  const fase = idade <= 7 ? "Pintinho (1-7d)" : idade <= 21 ? "Crescimento (8-21d)" : idade <= 35 ? "Engorda (22-35d)" : "Final/Abate (35+d)";
  const faseColor = idade <= 7 ? "bg-amber-500" : idade <= 21 ? "bg-blue-500" : idade <= 35 ? "bg-emerald-500" : "bg-violet-500";

  const setResp = (id: string, v: boolean) =>
    setEstado(e => ({ ...e, respostas: { ...e.respostas, [id]: { ...e.respostas[id], v } } }));
  const setObs = (id: string, obs: string) =>
    setEstado(e => ({ ...e, respostas: { ...e.respostas, [id]: { v: e.respostas[id]?.v ?? false, obs } } }));

  const marcarTudo = (secId: string, valor: boolean) => {
    const sec = SECOES_BASE.find(s => s.id === secId);
    if (!sec) return;
    setEstado(e => {
      const r = { ...e.respostas };
      sec.itens.forEach(it => { r[it.id] = { ...r[it.id], v: valor }; });
      return { ...e, respostas: r };
    });
  };

  const limpar = () => {
    if (!confirm("Limpar todo o checklist do dia?")) return;
    setEstado(novoEstado());
    toast.success("Checklist zerado");
  };

  const gerarPDF = () => {
    const doc = new jsPDF();
    const w = doc.internal.pageSize.getWidth();
    doc.setFillColor(88, 165, 90);
    doc.rect(0, 0, w, 32, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold").setFontSize(18);
    doc.text(SITIO.nome, 14, 13);
    doc.setFont("helvetica", "normal").setFontSize(10);
    doc.text(SITIO.local, 14, 20);
    doc.setFontSize(8);
    doc.text(`Resp.: ${SITIO.responsavel}`, 14, 27);
    doc.setFontSize(11).setFont("helvetica", "bold");
    doc.text("CHECKLIST DIÁRIO — GRANJA", w - 14, 13, { align: "right" });
    doc.setFontSize(9).setFont("helvetica", "normal");
    doc.text(fmtData(estado.data), w - 14, 20, { align: "right" });
    doc.text(`Lote ${estado.loteNumero || "—"} · ${idade}d · ${fase}`, w - 14, 26, { align: "right" });

    doc.setTextColor(0);
    let y = 40;
    autoTable(doc, {
      startY: y,
      head: [["Campo", "Valor", "Campo", "Valor"]],
      body: [
        ["Galpão", estado.galpao || "—", "Responsável", estado.responsavel || "—"],
        ["Temp. manhã", estado.tempManha ? `${estado.tempManha}°C` : "—", "Temp. tarde", estado.tempTarde ? `${estado.tempTarde}°C` : "—"],
        ["Umidade", estado.umidade ? `${estado.umidade}%` : "—", "Mortos no dia", estado.mortosDia || "—"],
        ["Consumo água (L)", estado.consumoAgua || "—", "Consumo ração (kg)", estado.consumoRacao || "—"],
      ],
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [88, 165, 90] },
    });
    y = (doc as any).lastAutoTable.finalY + 5;

    SECOES_BASE.forEach(sec => {
      const rows = sec.itens.map(it => {
        const r = estado.respostas[it.id];
        return [
          (r?.v ? "✓" : "○") + (it.critico ? " *" : ""),
          it.label,
          r?.obs || "",
        ];
      });
      autoTable(doc, {
        startY: y,
        head: [[{ content: sec.titulo, colSpan: 3, styles: { halign: "left", fillColor: [88, 165, 90], textColor: 255 } }]],
        body: rows,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 1.5 },
        columnStyles: { 0: { cellWidth: 12, halign: "center" }, 1: { cellWidth: 110 }, 2: { cellWidth: "auto" } },
      });
      y = (doc as any).lastAutoTable.finalY + 3;
    });

    if (estado.observacoesGerais) {
      autoTable(doc, {
        startY: y,
        head: [["Observações gerais"]],
        body: [[estado.observacoesGerais]],
        theme: "grid",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [88, 165, 90] },
      });
      y = (doc as any).lastAutoTable.finalY + 3;
    }

    autoTable(doc, {
      startY: y,
      body: [
        ["Conformidade total", `${stats.ok}/${totalItens} (${stats.pct}%)`],
        ["Itens críticos OK", `${stats.criticosOk}/${totalCriticos} (${stats.pctCrit}%)`],
      ],
      theme: "plain",
      styles: { fontSize: 10, fontStyle: "bold" },
    });

    const nome = `checklist-granja-lote${estado.loteNumero || "X"}-${estado.data}.pdf`;
    savePdf(doc, nome, { titulo: `Checklist Granja · Lote ${estado.loteNumero}`, modulo: "granja", ref: estado.loteNumero });
    toast.success("PDF gerado");
  };

  return (
    <AppShell>
      <div className="space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold flex items-center gap-2">
              <ClipboardCheck className="h-8 w-8 text-primary" /> Checklist Diário
            </h1>
            <p className="text-muted-foreground mt-1">Protocolo profissional para garantir o melhor lote possível.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={limpar}><Trash2 className="h-4 w-4 mr-1" /> Zerar</Button>
            <Button onClick={gerarPDF}><FileDown className="h-4 w-4 mr-1" /> Gerar PDF</Button>
          </div>
        </header>

        {/* Cabeçalho do dia */}
        <Card>
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
            <Field label="Data"><Input type="date" value={estado.data} onChange={e => setEstado({ ...estado, data: e.target.value })} /></Field>
            <Field label="Lote nº"><Input value={estado.loteNumero} onChange={e => setEstado({ ...estado, loteNumero: e.target.value })} placeholder="045" /></Field>
            <Field label="Idade (dias)"><Input type="number" value={estado.idadeDias} onChange={e => setEstado({ ...estado, idadeDias: e.target.value })} /></Field>
            <Field label="Galpão"><Input value={estado.galpao} onChange={e => setEstado({ ...estado, galpao: e.target.value })} placeholder="01" /></Field>
            <Field label="Responsável"><Input value={estado.responsavel} onChange={e => setEstado({ ...estado, responsavel: e.target.value })} /></Field>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Conformidade" value={`${stats.pct}%`} icon={CheckCircle2} accent="text-emerald-500" sub={`${stats.ok}/${totalItens} itens`} />
          <Kpi label="Críticos OK" value={`${stats.pctCrit}%`} icon={AlertTriangle} accent={stats.pctCrit === 100 ? "text-emerald-500" : "text-red-500"} sub={`${stats.criticosOk}/${totalCriticos}`} />
          <Kpi label="Fase do lote" value={fase} icon={TrendingUp} accent="text-primary" sub={`${idade || 0} dias`} badge={faseColor} />
          <Kpi label="Mortos dia" value={estado.mortosDia || "0"} icon={Skull} accent="text-red-500" sub={`Refugos: ${estado.refugos || 0}`} />
        </div>

        {/* Medidas rápidas */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wind className="h-4 w-4" /> Medidas do dia</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Field label="Temp. manhã (°C)"><Input type="number" step="0.1" value={estado.tempManha} onChange={e => setEstado({ ...estado, tempManha: e.target.value })} /></Field>
            <Field label="Temp. tarde (°C)"><Input type="number" step="0.1" value={estado.tempTarde} onChange={e => setEstado({ ...estado, tempTarde: e.target.value })} /></Field>
            <Field label="Umidade (%)"><Input type="number" value={estado.umidade} onChange={e => setEstado({ ...estado, umidade: e.target.value })} /></Field>
            <Field label="Água (L)"><Input type="number" value={estado.consumoAgua} onChange={e => setEstado({ ...estado, consumoAgua: e.target.value })} /></Field>
            <Field label="Ração (kg)"><Input type="number" value={estado.consumoRacao} onChange={e => setEstado({ ...estado, consumoRacao: e.target.value })} /></Field>
            <Field label="Mortos"><Input type="number" value={estado.mortosDia} onChange={e => setEstado({ ...estado, mortosDia: e.target.value })} /></Field>
          </CardContent>
        </Card>

        {/* Seções */}
        <Tabs defaultValue={SECOES_BASE[0].id} className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1">
            {SECOES_BASE.map(s => {
              const Icon = s.icone;
              const total = s.itens.length;
              const done = s.itens.filter(i => estado.respostas[i.id]?.v).length;
              return (
                <TabsTrigger key={s.id} value={s.id} className="text-xs gap-1">
                  <Icon className={`h-3.5 w-3.5 ${s.cor}`} />
                  {s.titulo} <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">{done}/{total}</Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {SECOES_BASE.map(sec => {
            const Icon = sec.icone;
            return (
              <TabsContent key={sec.id} value={sec.id} className="mt-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base flex items-center gap-2"><Icon className={`h-5 w-5 ${sec.cor}`} /> {sec.titulo}</CardTitle>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => marcarTudo(sec.id, true)}>Marcar tudo</Button>
                      <Button size="sm" variant="ghost" onClick={() => marcarTudo(sec.id, false)}>Limpar</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {sec.itens.map(it => {
                      const r = estado.respostas[it.id];
                      return (
                        <div key={it.id} className={`rounded-lg border p-3 transition-colors ${r?.v ? "bg-primary/5 border-primary/30" : "bg-muted/20"}`}>
                          <div className="flex items-start gap-3">
                            <Checkbox checked={!!r?.v} onCheckedChange={(v) => setResp(it.id, !!v)} className="mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-sm font-medium ${r?.v ? "line-through text-muted-foreground" : ""}`}>{it.label}</span>
                                {it.critico && <Badge variant="destructive" className="text-[10px] py-0">CRÍTICO</Badge>}
                              </div>
                              {it.dica && <p className="text-[11px] text-muted-foreground mt-0.5">💡 {it.dica}</p>}
                              <Input
                                value={r?.obs || ""}
                                onChange={e => setObs(it.id, e.target.value)}
                                placeholder="Observação (opcional)"
                                className="mt-2 h-8 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>

        {/* Observações finais */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Observações gerais do dia</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              rows={4}
              value={estado.observacoesGerais}
              onChange={e => setEstado({ ...estado, observacoesGerais: e.target.value })}
              placeholder="Anote ocorrências, visitas técnicas, decisões tomadas, próximos passos..."
            />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>;
}

function Kpi({ label, value, icon: Icon, accent, sub, badge }: { label: string; value: string; icon: any; accent: string; sub?: string; badge?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
          <Icon className={`h-4 w-4 ${accent}`} />
        </div>
        <div className="flex items-end gap-2">
          <span className="font-display font-bold text-2xl tabular-nums">{value}</span>
          {badge && <span className={`h-2 w-2 rounded-full ${badge} mb-2`} />}
        </div>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}
