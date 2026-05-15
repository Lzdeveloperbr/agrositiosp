import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { savePdf } from "./pdfHistory";
import { SITIO } from "./pdf";
import { rotuloResposta, type QuizDia } from "./quizQuestions";

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
  doc.text(new Date().toLocaleDateString("pt-BR"), w - 14, 20, { align: "right" });

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

// Limpa markdown básico (negrito, listas, headers) para texto plano legível em PDF
function limparMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, (m) => m.trim() + " ");
}

export function gerarPdfQuizDiario(q: QuizDia) {
  const doc = new jsPDF();
  const dataLabel = new Date(q.data + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
  header(doc, "Relatório Diário do Sítio", dataLabel);

  // Resumo respostas
  const rows = q.perguntas.map((p) => [
    p.area,
    p.texto,
    rotuloResposta(p, q.respostas[p.id] ?? ""),
  ]);

  autoTable(doc, {
    startY: 62,
    theme: "grid",
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b] },
    head: [["Área", "Pergunta", "Resposta"]],
    body: rows,
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 24, fontStyle: "bold" }, 2: { cellWidth: 40, fontStyle: "bold" } },
  });

  // Análise da IA
  let y = (doc as any).lastAutoTable.finalY + 10;
  if (y > 240) { doc.addPage(); y = 20; }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(40);
  doc.text("Análise & Recomendações da IA", 14, y);
  y += 6;
  doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
  doc.setLineWidth(0.6);
  doc.line(14, y, 196, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40);
  const texto = q.analise ? limparMarkdown(q.analise) : "Sem análise gerada para este relatório.";
  const linhas = doc.splitTextToSize(texto, 180);
  for (const linha of linhas) {
    if (y > 275) { doc.addPage(); y = 20; }
    doc.text(linha, 14, y);
    y += 5;
  }

  // Assinatura
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
