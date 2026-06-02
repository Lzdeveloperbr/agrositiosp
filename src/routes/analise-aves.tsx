import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Stethoscope, Upload, Sparkles, Loader2, X, Download, FileText, Camera } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { analisarAvesFoto } from "@/lib/ai.functions";
import { compressFile } from "@/lib/cloud/uploadFoto";
import jsPDF from "jspdf";
import { SITIO } from "@/lib/pdf";
import { savePdf } from "@/lib/pdfHistory";

export const Route = createFileRoute("/analise-aves")({
  head: () => ({
    meta: [
      { title: "Análise IA das Aves — AgroSítio" },
      { name: "description", content: "Envie fotos do lote e receba laudo veterinário e extensionista detalhado gerado por IA, com plano de ação e PDF." },
    ],
  }),
  component: AnaliseAvesPage,
});

type LinhagemOpt = "ross_ap95" | "ross308" | "cobb500";
const LIN_LABEL: Record<LinhagemOpt, string> = { ross_ap95: "Ross AP 95", ross308: "Ross 308", cobb500: "Cobb 500" };
type SexoOpt = "macho" | "femea" | "misto";

type FotoLocal = { id: string; dataUrl: string; nome: string };

function AnaliseAvesPage() {
  const fn = useServerFn(analisarAvesFoto);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fotos, setFotos] = useState<FotoLocal[]>([]);
  const [loading, setLoading] = useState(false);
  const [texto, setTexto] = useState<string>("");
  const [erro, setErro] = useState<string>("");

  // Carrega config persistida do estoque (entregas-racao) para já preencher idade/linhagem
  const cfgFromStorage = (() => {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith("racao_lote_cfg_"));
      if (keys.length) return JSON.parse(localStorage.getItem(keys[0])!);
    } catch {}
    return null;
  })();

  const [ctx, setCtx] = useState({
    dataAlojamento: cfgFromStorage?.dataAlojamento || new Date().toISOString().slice(0, 10),
    qtdInicial: cfgFromStorage?.qtdInicial || 0,
    mortalidadeAcum: cfgFromStorage?.mortalidadeAcum || 0,
    eliminadosAcum: cfgFromStorage?.eliminadosAcum || 0,
    linhagem: (cfgFromStorage?.linhagem as LinhagemOpt) || "ross_ap95",
    sexo: (cfgFromStorage?.sexo as SexoOpt) || "misto",
    pesoMedioRealG: cfgFromStorage?.pesoMedioRealG || undefined,
    observacoes: "",
  });

  const idade = Math.max(0, Math.round((new Date(new Date().toISOString().slice(0,10) + "T00:00").getTime() - new Date(ctx.dataAlojamento + "T00:00").getTime()) / 86400000));
  const vivas = Math.max(0, (ctx.qtdInicial || 0) - (ctx.mortalidadeAcum || 0) - (ctx.eliminadosAcum || 0));

  async function adicionarFotos(files: FileList | null) {
    if (!files) return;
    const restante = 8 - fotos.length;
    if (restante <= 0) return toast.error("Máximo 8 fotos");
    const arr = Array.from(files).slice(0, restante);
    const novas: FotoLocal[] = [];
    for (const f of arr) {
      try {
        const blob = await compressFile(f, 1280, 0.78);
        const dataUrl = await blobToDataURL(blob);
        novas.push({ id: Math.random().toString(36).slice(2), dataUrl, nome: f.name });
      } catch (err: any) {
        toast.error("Erro ao processar " + f.name);
      }
    }
    setFotos(prev => [...prev, ...novas]);
  }

  function removerFoto(id: string) {
    setFotos(prev => prev.filter(f => f.id !== id));
  }

  async function analisar() {
    if (fotos.length === 0) return toast.error("Envie ao menos 1 foto");
    setLoading(true); setErro(""); setTexto("");
    try {
      const context = JSON.stringify({
        idadeDias: idade,
        linhagem: LIN_LABEL[ctx.linhagem],
        sexo: ctx.sexo,
        aves_alojadas: ctx.qtdInicial,
        aves_vivas_estimadas: vivas,
        mortalidade_acumulada: ctx.mortalidadeAcum,
        eliminados_acumulados: ctx.eliminadosAcum,
        peso_medio_real_g: ctx.pesoMedioRealG || null,
        observacoes_granjeiro: ctx.observacoes || null,
        data_avaliacao: new Date().toISOString().slice(0, 10),
        propriedade: SITIO.nome,
      });
      const r = await fn({ data: { context, fotos: fotos.map(f => f.dataUrl) } });
      setTexto(r.texto);
      toast.success("Laudo gerado");
    } catch (e: any) {
      setErro(e.message ?? "Erro inesperado");
      toast.error(e.message ?? "Falha na análise");
    } finally {
      setLoading(false);
    }
  }

  function baixarPdf() {
    if (!texto) return;
    const doc = new jsPDF();
    const w = doc.internal.pageSize.getWidth();
    doc.setFillColor(88, 165, 90);
    doc.rect(0, 0, w, 32, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold"); doc.setFontSize(16);
    doc.text(SITIO.nome, 14, 13);
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text("Laudo Veterinário IA — Análise de Aves por Foto", 14, 20);
    doc.setFontSize(8);
    doc.text(`Resp.: ${SITIO.responsavel}`, 14, 27);
    doc.text(new Date().toLocaleString("pt-BR"), w - 14, 13, { align: "right" });

    doc.setTextColor(40);
    // dados do lote
    doc.setFontSize(10);
    let y = 42;
    doc.setFont("helvetica", "bold");
    doc.text("Dados do lote avaliado:", 14, y); y += 5;
    doc.setFont("helvetica", "normal");
    const meta = [
      `Idade: D${idade}`,
      `Linhagem: ${LIN_LABEL[ctx.linhagem]}`,
      `Sexagem: ${ctx.sexo}`,
      `Alojadas: ${ctx.qtdInicial.toLocaleString("pt-BR")}`,
      `Vivas est.: ${vivas.toLocaleString("pt-BR")}`,
      `Mortalidade: ${ctx.mortalidadeAcum}`,
      `Eliminados: ${ctx.eliminadosAcum}`,
      ctx.pesoMedioRealG ? `Peso médio real: ${ctx.pesoMedioRealG} g` : null,
    ].filter(Boolean).join(" · ");
    const metaLines = doc.splitTextToSize(meta, w - 28);
    doc.text(metaLines, 14, y); y += metaLines.length * 5 + 3;

    // miniaturas
    let x = 14;
    for (const f of fotos.slice(0, 8)) {
      try {
        if (y > 240) { doc.addPage(); y = 20; x = 14; }
        doc.addImage(f.dataUrl, "JPEG", x, y, 42, 32, undefined, "FAST");
        x += 46;
        if (x > 160) { x = 14; y += 36; }
      } catch {}
    }
    y += 38;
    doc.setDrawColor(220);
    doc.line(14, y - 4, w - 14, y - 4);

    // Texto do laudo
    doc.setFontSize(10);
    const cleaned = texto.replace(/\*\*/g, "").replace(/^- /gm, "• ");
    const lines = doc.splitTextToSize(cleaned, w - 28);
    for (const line of lines) {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(line, 14, y);
      y += 5;
    }

    // rodapé
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8); doc.setTextColor(140);
      const h = doc.internal.pageSize.getHeight();
      doc.text(`${SITIO.nome} · ${SITIO.local}`, 14, h - 8);
      doc.text(`Laudo IA · Página ${i}/${pages}`, w - 14, h - 8, { align: "right" });
    }
    const filename = `laudo-aves-D${idade}-${new Date().toISOString().slice(0, 10)}.pdf`;
    savePdf(doc, filename, { titulo: `Laudo IA Aves D${idade}`, modulo: "Granja" });
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Stethoscope className="h-7 w-7 text-primary" /> Análise IA das Aves
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Envie fotos do galpão e do lote. Uma IA nível <b>veterinário + extensionista</b> avalia comportamento, ambiência e sanidade, e gera um laudo profissional em PDF.
          </p>
        </div>

        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Dados do lote</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Alojamento (D0)</Label>
              <Input type="date" value={ctx.dataAlojamento} onChange={e => setCtx({ ...ctx, dataAlojamento: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Aves alojadas</Label>
              <Input type="number" inputMode="numeric" value={ctx.qtdInicial || ""} onChange={e => setCtx({ ...ctx, qtdInicial: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <Label className="text-xs">Mortalidade acum.</Label>
              <Input type="number" inputMode="numeric" value={ctx.mortalidadeAcum || ""} onChange={e => setCtx({ ...ctx, mortalidadeAcum: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <Label className="text-xs">Eliminados acum.</Label>
              <Input type="number" inputMode="numeric" value={ctx.eliminadosAcum || ""} onChange={e => setCtx({ ...ctx, eliminadosAcum: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <Label className="text-xs">Linhagem</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={ctx.linhagem} onChange={e => setCtx({ ...ctx, linhagem: e.target.value as LinhagemOpt })}>
                <option value="ross_ap95">Ross AP 95</option>
                <option value="ross308">Ross 308</option>
                <option value="cobb500">Cobb 500</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Sexagem</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={ctx.sexo} onChange={e => setCtx({ ...ctx, sexo: e.target.value as SexoOpt })}>
                <option value="misto">Misto</option>
                <option value="macho">Macho</option>
                <option value="femea">Fêmea</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Peso médio real (g)</Label>
              <Input type="number" inputMode="decimal" value={ctx.pesoMedioRealG || ""} onChange={e => setCtx({ ...ctx, pesoMedioRealG: Number(e.target.value) || undefined })} placeholder="opcional" />
            </div>
            <div className="flex items-end">
              <div className="text-xs space-y-1 w-full">
                <Badge variant="outline">D{idade}</Badge>
                <p className="text-muted-foreground">{vivas.toLocaleString("pt-BR")} aves vivas</p>
              </div>
            </div>
          </div>
          <div>
            <Label className="text-xs">Observações do granjeiro (opcional)</Label>
            <Textarea rows={2} value={ctx.observacoes} onChange={e => setCtx({ ...ctx, observacoes: e.target.value })} placeholder="Algum sinal que percebeu? mortalidade subiu? consumo caiu?" />
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Camera className="h-4 w-4 text-primary" /> Fotos do lote <span className="text-muted-foreground font-normal">({fotos.length}/8)</span></h3>
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={fotos.length >= 8}>
              <Upload className="h-3.5 w-3.5 mr-1" /> Adicionar fotos
            </Button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple className="hidden"
              onChange={e => { adicionarFotos(e.target.files); if (fileRef.current) fileRef.current.value = ""; }} />
          </div>
          {fotos.length === 0 ? (
            <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground text-sm">
              <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Tire ou envie fotos do galpão: distribuição das aves, cama, bebedouros, comedouros e close em aves suspeitas.<br/>
              <span className="text-[11px]">Quanto mais ângulos, mais preciso o laudo.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {fotos.map(f => (
                <div key={f.id} className="relative group">
                  <img src={f.dataUrl} alt={f.nome} className="w-full h-28 object-cover rounded border" />
                  <button onClick={() => removerFoto(f.id)} className="absolute top-1 right-1 bg-destructive/90 text-destructive-foreground rounded-full p-1 opacity-90 group-hover:opacity-100">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <Button onClick={analisar} disabled={loading || fotos.length === 0} className="w-full">
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analisando…</> : <><Sparkles className="h-4 w-4 mr-2" /> Gerar laudo veterinário</>}
          </Button>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </Card>

        {texto && (
          <Card className="p-5 space-y-3" style={{ background: "var(--gradient-surface)" }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-display font-bold text-lg flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-primary" /> Laudo técnico
              </h3>
              <Button size="sm" onClick={baixarPdf}><Download className="h-4 w-4 mr-1" /> Baixar PDF</Button>
            </div>
            <div className="text-sm leading-relaxed prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: renderMd(texto) }} />
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

function renderMd(s: string): string {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]+?<\/li>)/g, "<ul class='list-disc pl-5 my-1.5 space-y-0.5'>$1</ul>")
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}
