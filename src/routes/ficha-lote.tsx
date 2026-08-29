import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, FileDown, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { savePdf } from "@/lib/pdfHistory";
import { SITIO } from "@/lib/pdf";
import { fmtData, isoLocal } from "@/lib/data";

export const Route = createFileRoute("/ficha-lote")({ component: FichaLotePage });

const IDADES = [4, 7, 14, 21, 28, 35, 42, 49] as const;
const DIAS_SEM = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;

type OrigemMatriz = { nAves: string; linhagem: string; matriz: string; idadeMatriz: string; pesoPintinho: string; mortosChegada: string };
type DiaMort = { m: string; e: string };
type SemanaMort = { dias: DiaMort[]; obs?: string };
type PesoIdade = { esperado: string; real: string };

type Ficha = {
  id: string;
  // cabeçalho
  integrado: string; endereco: string;
  nAviario: string; nContrato: string; nCama: string; tempAviario: string;
  dataAlojamento: string; nAvesAlojadas: string;
  incubatorio: string; horaChegada: string; pessoasDescarregar: string;
  sexo: "macho" | "femea" | "misto" | "";
  tecnico: string; foneTecnico: string;
  // origem
  matrizes: OrigemMatriz[];
  // mortalidade 8 semanas × 7 dias
  semanas: SemanaMort[];
  // peso
  pesos: Record<number, PesoIdade>;
  // declaração
  cidade: string; dia: string; mes: string; ano: string;
  observacoesGerais: string;
  criadoEm: string;
  atualizadoEm: string;
};

const KEY = "fichas-lote-v1";

function novaFicha(): Ficha {
  const hoje = new Date();
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    integrado: SITIO.proprietario, endereco: `${SITIO.nome} - ${SITIO.local}`,
    nAviario: "", nContrato: "", nCama: "", tempAviario: "",
    dataAlojamento: isoLocal(hoje), nAvesAlojadas: "",
    incubatorio: "", horaChegada: "", pessoasDescarregar: "", sexo: "misto",
    tecnico: "", foneTecnico: "",
    matrizes: [{ nAves: "", linhagem: "", matriz: "", idadeMatriz: "", pesoPintinho: "", mortosChegada: "" }],
    semanas: Array.from({ length: 8 }, () => ({ dias: Array.from({ length: 7 }, () => ({ m: "", e: "" })), obs: "" })),
    pesos: Object.fromEntries(IDADES.map((i) => [i, { esperado: "", real: "" }])) as any,
    cidade: SITIO.local.split(" - ")[0] ?? "", dia: String(hoje.getDate()), mes: hoje.toLocaleDateString("pt-BR", { month: "long" }), ano: String(hoje.getFullYear()),
    observacoesGerais: "",
    criadoEm: hoje.toISOString(), atualizadoEm: hoje.toISOString(),
  };
}

function carregar(): Ficha[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function salvar(fichas: Ficha[]) {
  try { localStorage.setItem(KEY, JSON.stringify(fichas)); } catch {}
}

function num(v: string): number { const n = Number(String(v).replace(",", ".")); return Number.isFinite(n) ? n : 0; }

function FichaLotePage() {
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [ativaId, setAtivaId] = useState<string | null>(null);

  useEffect(() => {
    const f = carregar();
    setFichas(f);
    if (f.length) setAtivaId(f[0].id);
  }, []);

  const ativa = useMemo(() => fichas.find((f) => f.id === ativaId) ?? null, [fichas, ativaId]);

  function atualizar(patch: Partial<Ficha>) {
    if (!ativa) return;
    const upd = { ...ativa, ...patch, atualizadoEm: new Date().toISOString() };
    const novas = fichas.map((f) => (f.id === ativa.id ? upd : f));
    setFichas(novas); salvar(novas);
  }
  function criar() {
    const f = novaFicha();
    const novas = [f, ...fichas]; setFichas(novas); salvar(novas); setAtivaId(f.id);
    toast.success("Nova ficha criada");
  }
  function excluir(id: string) {
    if (!confirm("Excluir esta ficha? Esta ação não pode ser desfeita.")) return;
    const novas = fichas.filter((f) => f.id !== id);
    setFichas(novas); salvar(novas);
    if (ativaId === id) setAtivaId(novas[0]?.id ?? null);
  }

  // ===== cálculos =====
  const totaisSemana = useMemo(() => {
    if (!ativa) return [];
    let acumM = 0, acumE = 0;
    const nAves = num(ativa.nAvesAlojadas);
    return ativa.semanas.map((s) => {
      const m = s.dias.reduce((a, d) => a + num(d.m), 0);
      const e = s.dias.reduce((a, d) => a + num(d.e), 0);
      acumM += m; acumE += e;
      const me = m + e;
      const acumME = acumM + acumE;
      return {
        m, e, me,
        pctSem: nAves > 0 ? (me / nAves) * 100 : 0,
        acumME,
        pctAcum: nAves > 0 ? (acumME / nAves) * 100 : 0,
      };
    });
  }, [ativa]);

  if (!ativa) {
    return (
      <div className="p-4 md:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Ficha de Acompanhamento do Lote</h1>
            <p className="text-sm text-muted-foreground">Replica digital da ficha Bello Alimentos — preencha conforme os dias e gere o PDF final.</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-muted-foreground">Nenhuma ficha cadastrada ainda.</p>
            <Button onClick={criar}><Plus className="h-4 w-4 mr-2" /> Criar primeira ficha</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Ficha de Acompanhamento do Lote</h1>
            <p className="text-sm text-muted-foreground">Bello Alimentos · Sítio Santo Antônio</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={criar}><Plus className="h-4 w-4 mr-2" /> Nova ficha</Button>
          <Button onClick={() => gerarPdfFicha(ativa, totaisSemana)}><FileDown className="h-4 w-4 mr-2" /> Gerar PDF</Button>
        </div>
      </div>

      {/* seletor de fichas */}
      {fichas.length > 1 && (
        <Card>
          <CardContent className="p-3 flex flex-wrap gap-2">
            {fichas.map((f) => (
              <Button key={f.id} size="sm" variant={f.id === ativaId ? "default" : "outline"} onClick={() => setAtivaId(f.id)}>
                AV {f.nAviario || "?"} · Contr. {f.nContrato || "?"} · {fmtData(f.dataAlojamento)}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="cab" className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="cab">Cabeçalho</TabsTrigger>
          <TabsTrigger value="matriz">Origem Matriz</TabsTrigger>
          <TabsTrigger value="mort">Mortalidade</TabsTrigger>
          <TabsTrigger value="peso">Peso</TabsTrigger>
          <TabsTrigger value="decl">Declaração</TabsTrigger>
        </TabsList>

        {/* ===== Cabeçalho ===== */}
        <TabsContent value="cab">
          <Card>
            <CardHeader><CardTitle>Dados do Lote</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Integrado"><Input value={ativa.integrado} onChange={(e) => atualizar({ integrado: e.target.value })} /></Field>
              <Field label="Endereço"><Input value={ativa.endereco} onChange={(e) => atualizar({ endereco: e.target.value })} /></Field>
              <Field label="Técnico"><Input value={ativa.tecnico} onChange={(e) => atualizar({ tecnico: e.target.value })} /></Field>
              <Field label="Telefone do técnico"><Input value={ativa.foneTecnico} onChange={(e) => atualizar({ foneTecnico: e.target.value })} /></Field>
              <Field label="Nº do Aviário"><Input value={ativa.nAviario} onChange={(e) => atualizar({ nAviario: e.target.value })} placeholder="Ex: AV 1" /></Field>
              <Field label="Nº do Contrato"><Input value={ativa.nContrato} onChange={(e) => atualizar({ nContrato: e.target.value })} /></Field>
              <Field label="Nº da Cama"><Input value={ativa.nCama} onChange={(e) => atualizar({ nCama: e.target.value })} placeholder="0 = nova" /></Field>
              <Field label="Temp. do aviário (°C)"><Input type="number" step="0.1" value={ativa.tempAviario} onChange={(e) => atualizar({ tempAviario: e.target.value })} /></Field>
              <Field label="Data do alojamento"><Input type="date" value={ativa.dataAlojamento} onChange={(e) => atualizar({ dataAlojamento: e.target.value })} /></Field>
              <Field label="Nº de aves alojadas"><Input type="number" value={ativa.nAvesAlojadas} onChange={(e) => atualizar({ nAvesAlojadas: e.target.value })} /></Field>
              <Field label="Incubatório"><Input value={ativa.incubatorio} onChange={(e) => atualizar({ incubatorio: e.target.value })} placeholder="Ex: Pluma Cassilândia" /></Field>
              <Field label="Hora de chegada do pintinho"><Input value={ativa.horaChegada} onChange={(e) => atualizar({ horaChegada: e.target.value })} placeholder="10:00" /></Field>
              <Field label="Nº de pessoas para descarregar"><Input type="number" value={ativa.pessoasDescarregar} onChange={(e) => atualizar({ pessoasDescarregar: e.target.value })} /></Field>
              <Field label="Sexo">
                <Select value={ativa.sexo} onValueChange={(v) => atualizar({ sexo: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="macho">Macho</SelectItem>
                    <SelectItem value="femea">Fêmea</SelectItem>
                    <SelectItem value="misto">Misto</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Origem Matriz ===== */}
        <TabsContent value="matriz">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Origem da Matriz</CardTitle>
              <Button size="sm" variant="outline" onClick={() => atualizar({ matrizes: [...ativa.matrizes, { nAves: "", linhagem: "", matriz: "", idadeMatriz: "", pesoPintinho: "", mortosChegada: "" }] })}>
                <Plus className="h-4 w-4 mr-1" /> Linha
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-muted">
                  <tr>
                    {["Nº de aves", "Linhagem", "Matriz", "Idade matriz", "Peso pintinho", "Mortos na chegada", ""].map((h) => (
                      <th key={h} className="p-2 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ativa.matrizes.map((m, i) => (
                    <tr key={i} className="border-t">
                      {(["nAves", "linhagem", "matriz", "idadeMatriz", "pesoPintinho", "mortosChegada"] as const).map((k) => (
                        <td key={k} className="p-1">
                          <Input value={m[k]} onChange={(e) => {
                            const arr = [...ativa.matrizes]; arr[i] = { ...arr[i], [k]: e.target.value }; atualizar({ matrizes: arr });
                          }} />
                        </td>
                      ))}
                      <td className="p-1">
                        <Button size="icon" variant="ghost" onClick={() => atualizar({ matrizes: ativa.matrizes.filter((_, idx) => idx !== i) })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Mortalidade ===== */}
        <TabsContent value="mort">
          <Card>
            <CardHeader>
              <CardTitle>Mortalidade Semanal</CardTitle>
              <p className="text-xs text-muted-foreground">M = mortos, E = eliminados. Totais e % são calculados automaticamente.</p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="text-xs min-w-[900px] w-full border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th rowSpan={2} className="border p-1">Sem.</th>
                    {DIAS_SEM.map((d) => (<th key={d} colSpan={2} className="border p-1">{d}</th>))}
                    <th colSpan={2} className="border p-1">Total Sem.</th>
                    <th rowSpan={2} className="border p-1">% Sem.</th>
                    <th rowSpan={2} className="border p-1">Acum. M+E</th>
                    <th rowSpan={2} className="border p-1">% Acum.</th>
                  </tr>
                  <tr className="bg-muted">
                    {DIAS_SEM.flatMap((d) => [<th key={`m-${d}`} className="border p-1">M</th>, <th key={`e-${d}`} className="border p-1">E</th>])}
                    <th className="border p-1">M</th><th className="border p-1">E</th>
                  </tr>
                </thead>
                <tbody>
                  {ativa.semanas.map((s, idx) => {
                    const t = totaisSemana[idx];
                    return (
                      <tr key={idx}>
                        <td className="border p-1 text-center font-bold">{idx + 1}</td>
                        {s.dias.map((d, di) => (
                          <>
                            <td key={`m-${di}`} className="border p-0">
                              <input className="w-12 p-1 text-center bg-transparent" value={d.m} onChange={(e) => {
                                const semanas = ativa.semanas.map((ss, i) => i !== idx ? ss : { ...ss, dias: ss.dias.map((dd, j) => j !== di ? dd : { ...dd, m: e.target.value }) });
                                atualizar({ semanas });
                              }} />
                            </td>
                            <td key={`e-${di}`} className="border p-0">
                              <input className="w-12 p-1 text-center bg-transparent" value={d.e} onChange={(e) => {
                                const semanas = ativa.semanas.map((ss, i) => i !== idx ? ss : { ...ss, dias: ss.dias.map((dd, j) => j !== di ? dd : { ...dd, e: e.target.value }) });
                                atualizar({ semanas });
                              }} />
                            </td>
                          </>
                        ))}
                        <td className="border p-1 text-center bg-muted/40">{t?.m || 0}</td>
                        <td className="border p-1 text-center bg-muted/40">{t?.e || 0}</td>
                        <td className="border p-1 text-center bg-muted/40">{t ? t.pctSem.toFixed(2) : "0.00"}%</td>
                        <td className="border p-1 text-center bg-muted/40">{t?.acumME || 0}</td>
                        <td className="border p-1 text-center bg-muted/40">{t ? t.pctAcum.toFixed(2) : "0.00"}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Peso ===== */}
        <TabsContent value="peso">
          <Card>
            <CardHeader><CardTitle>Peso por Idade (g)</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="text-sm min-w-[640px] w-full border-collapse">
                <thead className="bg-muted">
                  <tr>
                    <th className="border p-2">Idade (dias)</th>
                    {IDADES.map((i) => (<th key={i} className="border p-2">{i}</th>))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border p-2 font-medium">Esperado</td>
                    {IDADES.map((i) => (
                      <td key={i} className="border p-0">
                        <input className="w-full p-2 text-center bg-transparent" value={ativa.pesos[i]?.esperado ?? ""} onChange={(e) => atualizar({ pesos: { ...ativa.pesos, [i]: { ...ativa.pesos[i], esperado: e.target.value } } })} />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="border p-2 font-medium">Real</td>
                    {IDADES.map((i) => (
                      <td key={i} className="border p-0">
                        <input className="w-full p-2 text-center bg-transparent" value={ativa.pesos[i]?.real ?? ""} onChange={(e) => atualizar({ pesos: { ...ativa.pesos, [i]: { ...ativa.pesos[i], real: e.target.value } } })} />
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-muted/40">
                    <td className="border p-2 font-medium">%</td>
                    {IDADES.map((i) => {
                      const esp = num(ativa.pesos[i]?.esperado || ""); const real = num(ativa.pesos[i]?.real || "");
                      const pct = esp > 0 ? (real / esp) * 100 : 0;
                      return <td key={i} className="border p-2 text-center">{pct ? pct.toFixed(1) + "%" : "—"}</td>;
                    })}
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Declaração ===== */}
        <TabsContent value="decl">
          <Card>
            <CardHeader><CardTitle>Declaração & Assinatura</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm bg-muted/40 p-4 rounded border">
                Declaro para os devidos fins que todas as aves entregues por mim para Bello Alimentos receberam apenas rações e produtos veterinários fornecidos pela empresa. Declaro também que foram cumpridos os prazos de carência de medicação para o abate das aves, informações das quais tomei conhecimento através dos técnicos credenciados pela Bello Alimentos.
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Cidade"><Input value={ativa.cidade} onChange={(e) => atualizar({ cidade: e.target.value })} /></Field>
                <Field label="Dia"><Input value={ativa.dia} onChange={(e) => atualizar({ dia: e.target.value })} /></Field>
                <Field label="Mês"><Input value={ativa.mes} onChange={(e) => atualizar({ mes: e.target.value })} /></Field>
                <Field label="Ano"><Input value={ativa.ano} onChange={(e) => atualizar({ ano: e.target.value })} /></Field>
              </div>
              <Field label="Observações gerais do lote">
                <Textarea rows={4} value={ativa.observacoesGerais} onChange={(e) => atualizar({ observacoesGerais: e.target.value })} placeholder="Anote intercorrências, manejos, tratamentos..." />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap justify-between gap-2 pt-4 border-t">
        <Button variant="outline" className="text-destructive" onClick={() => excluir(ativa.id)}>
          <Trash2 className="h-4 w-4 mr-2" /> Excluir esta ficha
        </Button>
        <Button size="lg" onClick={() => gerarPdfFicha(ativa, totaisSemana)}>
          <FileDown className="h-4 w-4 mr-2" /> Gerar PDF da Ficha
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

// ============= PDF =============
function gerarPdfFicha(f: Ficha, totais: Array<{ m: number; e: number; me: number; pctSem: number; acumME: number; pctAcum: number }>) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const BRAND = { r: 88, g: 165, b: 90 };

  // Header
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b); doc.rect(0, 0, W, 22, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text("FICHA DE ACOMPANHAMENTO DO LOTE DE FRANGO", W / 2, 10, { align: "center" });
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text(`${SITIO.nome} · ${SITIO.local}`, W / 2, 17, { align: "center" });

  doc.setTextColor(40);
  let y = 28;

  // Dados gerais
  autoTable(doc, {
    startY: y, theme: "grid", styles: { fontSize: 8, cellPadding: 1.5 },
    body: [
      [{ content: "INTEGRADO", styles: { fontStyle: "bold", fillColor: [240, 240, 240] } }, f.integrado || "—", { content: "END.", styles: { fontStyle: "bold", fillColor: [240, 240, 240] } }, f.endereco || "—"],
      [{ content: "Nº AVIÁRIO", styles: { fontStyle: "bold", fillColor: [240, 240, 240] } }, f.nAviario || "—", { content: "Nº CONTRATO", styles: { fontStyle: "bold", fillColor: [240, 240, 240] } }, f.nContrato || "—"],
      [{ content: "Nº CAMA", styles: { fontStyle: "bold", fillColor: [240, 240, 240] } }, f.nCama || "—", { content: "TEMP. AVIÁRIO", styles: { fontStyle: "bold", fillColor: [240, 240, 240] } }, f.tempAviario ? `${f.tempAviario} °C` : "—"],
      [{ content: "DATA ALOJAMENTO", styles: { fontStyle: "bold", fillColor: [240, 240, 240] } }, f.dataAlojamento ? fmtData(f.dataAlojamento + "T12:00:00") : "—", { content: "Nº AVES ALOJADAS", styles: { fontStyle: "bold", fillColor: [240, 240, 240] } }, f.nAvesAlojadas || "—"],
      [{ content: "INCUBATÓRIO", styles: { fontStyle: "bold", fillColor: [240, 240, 240] } }, f.incubatorio || "—", { content: "HORA CHEGADA", styles: { fontStyle: "bold", fillColor: [240, 240, 240] } }, f.horaChegada || "—"],
      [{ content: "PESSOAS DESCARREGAR", styles: { fontStyle: "bold", fillColor: [240, 240, 240] } }, f.pessoasDescarregar || "—", { content: "SEXO", styles: { fontStyle: "bold", fillColor: [240, 240, 240] } }, f.sexo === "macho" ? "(X) Macho ( ) Fêmea ( ) Misto" : f.sexo === "femea" ? "( ) Macho (X) Fêmea ( ) Misto" : "( ) Macho ( ) Fêmea (X) Misto"],
      [{ content: "TÉCNICO", styles: { fontStyle: "bold", fillColor: [240, 240, 240] } }, f.tecnico || "—", { content: "FONE", styles: { fontStyle: "bold", fillColor: [240, 240, 240] } }, f.foneTecnico || "—"],
    ],
    columnStyles: { 0: { cellWidth: 36 }, 1: { cellWidth: 60 }, 2: { cellWidth: 36 }, 3: { cellWidth: 60 } },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  // Origem matriz
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text("ORIGEM MATRIZ", 14, y); y += 1;
  autoTable(doc, {
    startY: y, theme: "grid", styles: { fontSize: 8, cellPadding: 1.5, halign: "center" },
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: 255 },
    head: [["Nº de aves", "Linhagem", "Matriz", "Idade matriz", "Peso pintinho", "Mortos na chegada"]],
    body: f.matrizes.map((m) => [m.nAves || "—", m.linhagem || "—", m.matriz || "—", m.idadeMatriz || "—", m.pesoPintinho || "—", m.mortosChegada || "—"]),
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  // Mortalidade
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text("MORTALIDADE", 14, y); y += 1;
  const headMort: any[] = [
    [{ content: "Sem", rowSpan: 2 }, ...DIAS_SEM.map((d) => ({ content: d, colSpan: 2 })), { content: "Total Sem.", colSpan: 2 }, { content: "% Sem.", rowSpan: 2 }, { content: "Acum. M+E", rowSpan: 2 }, { content: "% Acum.", rowSpan: 2 }],
    [...DIAS_SEM.flatMap(() => ["M", "E"]), "M", "E"],
  ];
  const bodyMort = f.semanas.map((s, idx) => {
    const t = totais[idx];
    const cels: any[] = [String(idx + 1)];
    s.dias.forEach((d) => { cels.push(d.m || "", d.e || ""); });
    cels.push(String(t?.m || 0), String(t?.e || 0), `${(t?.pctSem || 0).toFixed(2)}%`, String(t?.acumME || 0), `${(t?.pctAcum || 0).toFixed(2)}%`);
    return cels;
  });
  autoTable(doc, {
    startY: y, theme: "grid", styles: { fontSize: 7, cellPadding: 1, halign: "center" },
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: 255, fontSize: 7 },
    head: headMort, body: bodyMort,
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  // Peso
  if (y > 230) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text("PESO POR IDADE (g)", 14, y); y += 1;
  autoTable(doc, {
    startY: y, theme: "grid", styles: { fontSize: 8, cellPadding: 1.5, halign: "center" },
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: 255 },
    head: [["Idade", ...IDADES.map((i) => String(i))]],
    body: [
      ["Esperado", ...IDADES.map((i) => f.pesos[i]?.esperado || "—")],
      ["Real", ...IDADES.map((i) => f.pesos[i]?.real || "—")],
      ["%", ...IDADES.map((i) => {
        const esp = num(f.pesos[i]?.esperado || ""); const real = num(f.pesos[i]?.real || "");
        return esp > 0 ? `${((real / esp) * 100).toFixed(1)}%` : "—";
      })],
    ],
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // Observações
  if (f.observacoesGerais.trim()) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text("OBSERVAÇÕES", 14, y); y += 4;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    const linhas = doc.splitTextToSize(f.observacoesGerais, W - 28);
    doc.text(linhas, 14, y); y += linhas.length * 4.5 + 4;
  }

  // Declaração
  if (y > 230) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text("DECLARAÇÃO", 14, y); y += 4;
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  const decl = "Declaro para os devidos fins que todas as aves entregues por mim para Bello Alimentos receberam apenas rações e produtos veterinários fornecidos pela empresa. Declaro também que foram cumpridos os prazos de carência de medicação para o abate das aves, informações das quais tomei conhecimento através dos técnicos credenciados pela Bello Alimentos.";
  const linhasDecl = doc.splitTextToSize(decl, W - 28);
  doc.text(linhasDecl, 14, y); y += linhasDecl.length * 4 + 6;

  doc.setFontSize(9);
  doc.text(`${f.cidade || "—"}, ${f.dia || "—"} de ${f.mes || "—"} de ${f.ano || "—"}`, 14, y);
  y += 18;
  doc.setDrawColor(80); doc.line(110, y, W - 14, y);
  doc.setFontSize(8); doc.setTextColor(100);
  doc.text("Assinatura do Responsável", (110 + W - 14) / 2, y + 4, { align: "center" });

  // footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); doc.setFontSize(7); doc.setTextColor(140);
    const h = doc.internal.pageSize.getHeight();
    doc.text(`${SITIO.nome} · Ficha do lote AV ${f.nAviario || "?"} · Contrato ${f.nContrato || "?"}`, 14, h - 6);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")} · Pág. ${i}/${pages}`, W - 14, h - 6, { align: "right" });
  }

  const filename = `ficha-lote-av${f.nAviario || "sn"}-${f.dataAlojamento}.pdf`;
  savePdf(doc, filename, { titulo: `Ficha do Lote AV ${f.nAviario || "?"}`, modulo: "Ficha Lote Frango", ref: f.nContrato });
  toast.success("PDF gerado");
}
