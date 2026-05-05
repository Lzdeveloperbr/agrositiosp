import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Lote, Medidor, Animal, DiarioEntry } from "./types";

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
  const vivas = lote.quantidadeInicial - totalMort;
  const mortPct = (totalMort / lote.quantidadeInicial) * 100;
  const ultPeso = [...lote.entries].reverse().find((e) => e.pesoMedioG)?.pesoMedioG ?? 0;
  const pesoTotalKg = (vivas * ultPeso) / 1000;

  autoTable(doc, {
    startY: 58,
    theme: "grid",
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b] },
    head: [["Indicador", "Valor"]],
    body: [
      ["Quantidade inicial", lote.quantidadeInicial.toLocaleString("pt-BR") + " aves"],
      ["Aves vivas", vivas.toLocaleString("pt-BR")],
      ["Mortalidade total", `${totalMort.toLocaleString("pt-BR")} (${mortPct.toFixed(2)}%)`],
      ["Peso médio atual", `${ultPeso.toLocaleString("pt-BR")} g`],
      ["Peso vivo estimado", `${pesoTotalKg.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg`],
      ["Previsão de abate", `${lote.previsaoAbateDias} dias`],
      ["Lucro estimado", `${lote.percentualLucro}% sobre produção`],
    ],
  });

  if (lote.entries.length) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      theme: "striped",
      headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b] },
      head: [["Data", "Mort.", "Peso (g)", "Observações"]],
      body: lote.entries.slice().sort((a, b) => a.date.localeCompare(b.date)).map((e) => [
        new Date(e.date).toLocaleDateString("pt-BR"),
        e.mortalidade,
        e.pesoMedioG ?? "—",
        e.observacoes ?? "",
      ]),
    });
  }

  footer(doc);
  doc.save(`relatorio-lote-${lote.numero}.pdf`);
}

export function gerarRelatorioEnergia(medidores: Medidor[]) {
  const doc = new jsPDF();
  header(doc, "Relatório de Consumo de Energia");

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

export function gerarRelatorioGeral(lotes: Lote[], medidores: Medidor[], animais: Animal[]) {
  const doc = new jsPDF();
  header(doc, "Relatório Geral do Sítio", new Date().toLocaleDateString("pt-BR"));

  const lotesAtivos = lotes.filter((l) => !l.encerrado);
  const totalAves = lotesAtivos.reduce((s, l) => s + l.quantidadeInicial - l.entries.reduce((a, e) => a + e.mortalidade, 0), 0);
  const ativos = animais.filter((a) => a.status === "ativo");

  autoTable(doc, {
    startY: 58,
    theme: "grid",
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b] },
    head: [["Resumo", "Valor"]],
    body: [
      ["Lotes ativos", lotesAtivos.length.toString()],
      ["Aves vivas (total)", totalAves.toLocaleString("pt-BR")],
      ["Cabeças de gado ativas", ativos.length.toString()],
      ["Medidores cadastrados", medidores.length.toString()],
    ],
  });

  footer(doc);
  doc.save(`relatorio-geral-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function ultimoPeso(a: Animal) {
  return [...a.pesagens].sort((x, y) => y.data.localeCompare(x.data))[0]?.pesoKg;
}

export function gerarRelatorioRebanho(animais: Animal[]) {
  const doc = new jsPDF();
  const ativos = animais.filter((a) => a.status === "ativo");
  header(doc, "Relatório do Rebanho", `${ativos.length} cabeças ativas`);

  autoTable(doc, {
    startY: 58,
    theme: "striped",
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b] },
    head: [["Brinco", "Sexo", "Categoria", "Raça", "Peso (kg)", "Status"]],
    body: animais.map((a) => [
      a.brinco,
      a.sexo === "macho" ? "M" : "F",
      a.categoria ?? "—",
      a.raca ?? "—",
      ultimoPeso(a)?.toLocaleString("pt-BR") ?? "—",
      a.status,
    ]),
  });

  footer(doc);
  doc.save(`relatorio-rebanho-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function gerarRelatorioAnimal(a: Animal) {
  const doc = new jsPDF();
  header(doc, `Animal ${a.brinco}`, `${a.sexo} · ${a.categoria ?? ""} · ${a.raca ?? ""}`);

  autoTable(doc, {
    startY: 58, theme: "grid",
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b] },
    head: [["Indicador", "Valor"]],
    body: [
      ["Brinco", a.brinco],
      ["Nome", a.nome ?? "—"],
      ["Nascimento", a.nascimento ? new Date(a.nascimento).toLocaleDateString("pt-BR") : "—"],
      ["Entrada", new Date(a.dataEntrada).toLocaleDateString("pt-BR")],
      ["Origem", a.origem ?? "—"],
      ["Status", a.status],
      ["Peso atual", ultimoPeso(a) ? `${ultimoPeso(a)} kg` : "—"],
    ],
  });

  if (a.pesagens.length) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8, theme: "striped",
      headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b] },
      head: [["Data", "Peso (kg)", "Obs"]],
      body: [...a.pesagens].sort((x, y) => x.data.localeCompare(y.data)).map((p) => [
        new Date(p.data).toLocaleDateString("pt-BR"), p.pesoKg, p.observacoes ?? "",
      ]),
    });
  }

  if (a.sanidade.length) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8, theme: "striped",
      headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b] },
      head: [["Data", "Tipo", "Produto", "Dose", "Próx."]],
      body: a.sanidade.map((s) => [
        new Date(s.data).toLocaleDateString("pt-BR"), s.tipo, s.produto, s.dose ?? "",
        s.proximaData ? new Date(s.proximaData).toLocaleDateString("pt-BR") : "—",
      ]),
    });
  }

  footer(doc);
  doc.save(`animal-${a.brinco}.pdf`);
}

export async function gerarRelatorioDiario(entries: DiarioEntry[], titulo = "Diário de Campo") {
  const doc = new jsPDF();
  header(doc, titulo, `${entries.length} registro(s)`);
  let y = 58;

  for (const e of entries.slice().sort((a, b) => b.data.localeCompare(a.data))) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40);
    doc.text(`${new Date(e.data).toLocaleDateString("pt-BR")} — ${e.titulo}`, 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(110);
    const meta = [
      `Categoria: ${e.categoria}`,
      e.clima?.condicao ? `Clima: ${e.clima.condicao}` : null,
      e.clima?.temperatura !== undefined ? `${e.clima.temperatura}°C` : null,
      e.clima?.chuvaMm ? `Chuva: ${e.clima.chuvaMm}mm` : null,
      e.gps ? `GPS: ${e.gps.lat.toFixed(4)}, ${e.gps.lon.toFixed(4)}` : null,
    ].filter(Boolean).join(" · ");
    doc.text(meta, 14, y); y += 5;

    doc.setTextColor(40);
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(e.texto || "", 180);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 4;

    // fotos
    let x = 14;
    for (const f of e.fotos.slice(0, 4)) {
      try {
        if (y > 230) { doc.addPage(); y = 20; x = 14; }
        doc.addImage(f.dataUrl, "JPEG", x, y, 42, 32, undefined, "FAST");
        x += 46;
        if (x > 160) { x = 14; y += 36; }
      } catch {}
    }
    y += 40;
    doc.setDrawColor(220);
    doc.line(14, y - 4, 196, y - 4);
  }

  footer(doc);
  doc.save(`diario-${new Date().toISOString().slice(0, 10)}.pdf`);
}
