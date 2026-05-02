import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Lote, Medidor } from "./types";

const BRAND = { r: 88, g: 165, b: 90 };

function header(doc: jsPDF, title: string, subtitle?: string) {
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 28, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("AgroSítio", 14, 13);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Gestão Rural · Bello Alimentos", 14, 20);

  doc.setTextColor(40);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 42);
  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(110);
    doc.text(subtitle, 14, 49);
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
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, h - 8);
    doc.text(`Página ${i} de ${pages}`, w - 14, h - 8, { align: "right" });
  }
}

export function gerarRelatorioLote(lote: Lote) {
  const doc = new jsPDF();
  header(doc, `Relatório do Lote ${lote.numero}`, `Entrada: ${new Date(lote.dataEntrada).toLocaleDateString("pt-BR")} · ${lote.integradora}`);

  const totalMort = lote.entries.reduce((s, e) => s + e.mortalidade, 0);
  const totalRacao = lote.entries.reduce((s, e) => s + e.racaoKg, 0);
  const totalAgua = lote.entries.reduce((s, e) => s + e.aguaL, 0);
  const vivas = lote.quantidadeInicial - totalMort;
  const mortPct = (totalMort / lote.quantidadeInicial) * 100;
  const ultPeso = [...lote.entries].reverse().find((e) => e.pesoMedioG)?.pesoMedioG ?? 0;
  const pesoTotalKg = (vivas * ultPeso) / 1000;
  const ca = pesoTotalKg > 0 ? totalRacao / pesoTotalKg : 0;

  autoTable(doc, {
    startY: 58,
    theme: "grid",
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b] },
    head: [["Indicador", "Valor"]],
    body: [
      ["Quantidade inicial", lote.quantidadeInicial.toLocaleString("pt-BR") + " aves"],
      ["Aves vivas", vivas.toLocaleString("pt-BR")],
      ["Mortalidade total", `${totalMort.toLocaleString("pt-BR")} (${mortPct.toFixed(2)}%)`],
      ["Ração consumida", `${totalRacao.toLocaleString("pt-BR")} kg`],
      ["Água consumida", `${totalAgua.toLocaleString("pt-BR")} L`],
      ["Peso médio atual", `${ultPeso.toLocaleString("pt-BR")} g`],
      ["Peso vivo estimado", `${pesoTotalKg.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg`],
      ["Conversão alimentar", ca.toFixed(3)],
      ["Previsão de abate", `${lote.previsaoAbateDias} dias`],
      ["Lucro estimado granjeiro", `${lote.percentualLucro}% sobre produção`],
    ],
  });

  if (lote.entries.length) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      theme: "striped",
      headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b] },
      head: [["Data", "Mort.", "Ração (kg)", "Água (L)", "Peso (g)"]],
      body: lote.entries
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((e) => [
          new Date(e.date).toLocaleDateString("pt-BR"),
          e.mortalidade,
          e.racaoKg,
          e.aguaL,
          e.pesoMedioG ?? "—",
        ]),
    });
  }

  footer(doc);
  doc.save(`relatorio-lote-${lote.numero}.pdf`);
}

export function gerarRelatorioEnergia(medidores: Medidor[]) {
  const doc = new jsPDF();
  header(doc, "Relatório de Consumo de Energia", `Período: últimos registros`);

  let y = 58;
  for (const m of medidores) {
    autoTable(doc, {
      startY: y,
      theme: "grid",
      headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b] },
      head: [[`${m.nome}`, `Inst. ${m.codigoInstalacao} · Rel. ${m.codigoRelogio}`]],
      body: [],
    });
    const sorted = [...m.leituras].sort((a, b) => a.data.localeCompare(b.data));
    const rows = sorted.map((l, i) => {
      const prev = i > 0 ? sorted[i - 1].valor : null;
      const consumo = prev !== null ? l.valor - prev : null;
      return [
        new Date(l.data).toLocaleDateString("pt-BR"),
        l.valor.toLocaleString("pt-BR") + " kWh",
        consumo !== null ? consumo.toLocaleString("pt-BR") + " kWh" : "—",
      ];
    });
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY,
      theme: "striped",
      head: [["Data", "Leitura", "Consumo"]],
      body: rows.length ? rows : [["—", "Sem leituras", "—"]],
    });
    y = (doc as any).lastAutoTable.finalY + 8;
    if (y > 250) { doc.addPage(); y = 20; }
  }

  footer(doc);
  doc.save(`relatorio-energia-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function gerarRelatorioGeral(lotes: Lote[], medidores: Medidor[]) {
  const doc = new jsPDF();
  header(doc, "Relatório Geral do Sítio", new Date().toLocaleDateString("pt-BR"));

  const lotesAtivos = lotes.filter((l) => !l.encerrado);
  const totalAves = lotesAtivos.reduce((s, l) => s + l.quantidadeInicial - l.entries.reduce((a, e) => a + e.mortalidade, 0), 0);

  autoTable(doc, {
    startY: 58,
    theme: "grid",
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b] },
    head: [["Resumo", "Valor"]],
    body: [
      ["Lotes ativos", lotesAtivos.length.toString()],
      ["Aves vivas (total)", totalAves.toLocaleString("pt-BR")],
      ["Medidores cadastrados", medidores.length.toString()],
      ["Lotes encerrados", lotes.filter((l) => l.encerrado).length.toString()],
    ],
  });

  if (lotesAtivos.length) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      theme: "striped",
      headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b] },
      head: [["Lote", "Entrada", "Inicial", "Vivas", "Mort. %"]],
      body: lotesAtivos.map((l) => {
        const m = l.entries.reduce((s, e) => s + e.mortalidade, 0);
        return [
          l.numero,
          new Date(l.dataEntrada).toLocaleDateString("pt-BR"),
          l.quantidadeInicial.toLocaleString("pt-BR"),
          (l.quantidadeInicial - m).toLocaleString("pt-BR"),
          ((m / l.quantidadeInicial) * 100).toFixed(2) + "%",
        ];
      }),
    });
  }

  footer(doc);
  doc.save(`relatorio-geral-${new Date().toISOString().slice(0, 10)}.pdf`);
}
