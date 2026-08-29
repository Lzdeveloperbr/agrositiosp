import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { savePdf } from "./pdfHistory";
import { SITIO } from "./pdf";
import { rotuloResposta, type QuizDia } from "./quizQuestions";
import { fmtData } from "@/lib/data";

const BRAND = { r: 88, g: 165, b: 90 };

function header(doc: jsPDF, title: string, subtitle?: string) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, w, 32, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(SITIO.nome, 14, 13);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(SITIO.local, 14, 20);
  doc.setFontSize(8);
  doc.text(`Proprietário: ${SITIO.proprietario}`, 14, 26);
  doc.text(`Responsável: ${SITIO.responsavel}`, 14, 30);
  doc.setFontSize(9);
  doc.text("AgroSítio · Relatório Diário com IA", w - 14, 13, { align: "right" });
  doc.setFontSize(8);
  doc.text(fmtData(new Date()), w - 14, 20, { align: "right" });

  doc.setTextColor(40);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 46);
  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(110);
    doc.text(subtitle, 14, 53);
  }
  doc.setTextColor(40);
}

function footer(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.text(`${SITIO.nome} · ${SITIO.local}`, 14, h - 12);
    doc.text(`Resp.: ${SITIO.responsavel}`, 14, h - 8);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, w / 2, h - 8, { align: "center" });
    doc.text(`Página ${i} de ${pages}`, w - 14, h - 8, { align: "right" });
  }
}

function limparMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, (m) => m.trim() + " ");
}

function sectionTitle(doc: jsPDF, y: number, label: string): number {
  if (y > 270) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(40);
  doc.text(label, 14, y);
  doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
  doc.setLineWidth(0.5);
  doc.line(14, y + 1.5, 196, y + 1.5);
  return y + 7;
}

export function gerarPdfQuizDiario(q: QuizDia) {
  const doc = new jsPDF();
  const dataLabel = fmtData(q.data + "T12:00:00", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
  header(doc, "Relatório Diário do Sítio", dataLabel);

  let y = 62;

  // ===== Clima do dia =====
  if (q.clima) {
    y = sectionTitle(doc, y, "Clima do Dia");
    const c = q.clima;
    autoTable(doc, {
      startY: y,
      theme: "grid",
      headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b] },
      head: [["Indicador", "Valor"]],
      body: [
        ["Local", c.cidade ?? "—"],
        ["Condição", c.condicao],
        ["Temperatura", `${c.tempC.toFixed(1)} °C (sensação ${c.feelsC.toFixed(1)} °C)`],
        ["Umidade", `${c.umidade.toFixed(0)} %`],
        ["Vento", `${c.vento.toFixed(0)} km/h`],
        ["Probabilidade de chuva", `${c.chuvaProb.toFixed(0)} %`],
        ["Alertas", c.alertas.length ? c.alertas.join(" · ") : "—"],
      ],
      styles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 50, fontStyle: "bold" } },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ===== Energia =====
  if (q.energia && q.energia.porMedidor.length) {
    y = sectionTitle(doc, y, "Consumo de Energia (hoje)");
    autoTable(doc, {
      startY: y,
      theme: "striped",
      headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b] },
      head: [["Medidor", "Última leitura", "Data", "Consumo do dia"]],
      body: q.energia.porMedidor.map((m) => [
        m.nome,
        m.ultimaLeitura !== undefined ? `${m.ultimaLeitura.toLocaleString("pt-BR")} kWh` : "—",
        m.dataUltima ? fmtData(m.dataUltima) : "—",
        `${m.consumoKwh.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kWh`,
      ]),
      foot: [["Total", "", "", `${q.energia.consumoTotalDiaKwh.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kWh`]],
      footStyles: { fillColor: [240, 240, 240], textColor: 40, fontStyle: "bold" },
      styles: { fontSize: 9 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ===== Respostas do quiz =====
  y = sectionTitle(doc, y, "Quiz do Dia");
  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b] },
    head: [["Área", "Pergunta", "Resposta"]],
    body: q.perguntas.map((p) => [p.area, p.texto, rotuloResposta(p, q.respostas[p.id] ?? "")]),
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 24, fontStyle: "bold" }, 2: { cellWidth: 40, fontStyle: "bold" } },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ===== Fotos =====
  if (q.fotos && q.fotos.length) {
    y = sectionTitle(doc, y, "Registro Fotográfico");
    const cellW = 56;
    const cellH = 42;
    const gap = 6;
    let x = 14;
    let count = 0;
    for (const f of q.fotos) {
      if (y + cellH + 8 > 285) { doc.addPage(); y = 20; x = 14; }
      try {
        const fmt = f.dataUrl.includes("png") ? "PNG" : "JPEG";
        doc.addImage(f.dataUrl, fmt, x, y, cellW, cellH, undefined, "FAST");
        doc.setFontSize(8);
        doc.setTextColor(110);
        doc.text(`Foto ${++count}${f.legenda ? ` — ${f.legenda}` : ""}`, x, y + cellH + 4, { maxWidth: cellW });
      } catch {}
      x += cellW + gap;
      if (x + cellW > 196) { x = 14; y += cellH + 12; }
    }
    if (x !== 14) y += cellH + 12;
    y += 4;
  }

  // ===== Análise IA =====
  y = sectionTitle(doc, y, "Análise & Recomendações da IA");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40);
  const texto = q.analise ? limparMarkdown(q.analise) : "Sem análise gerada para este relatório.";
  const linhas = doc.splitTextToSize(texto, 180);
  for (const linha of linhas) {
    if (y > 278) { doc.addPage(); y = 20; }
    doc.text(linha, 14, y);
    y += 5;
  }

  // Assinaturas
  if (y > 250) { doc.addPage(); y = 20; }
  y += 16;
  doc.setDrawColor(160);
  doc.line(20, y, 90, y);
  doc.line(120, y, 190, y);
  doc.setFontSize(8);
  doc.setTextColor(110);
  doc.text(SITIO.responsavel + " — Responsável", 20, y + 5);
  doc.text(SITIO.proprietario + " — Proprietário", 120, y + 5);

  footer(doc);
  savePdf(doc, `relatorio-diario-${q.data}.pdf`, {
    titulo: `Relatório Diário · ${dataLabel}`,
    modulo: "Quiz Diário",
    ref: q.data,
  });
}
