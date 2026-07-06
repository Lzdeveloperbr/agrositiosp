import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Lote, Medidor, Animal, DiarioEntry, Lancamento } from "./types";
import { savePdf } from "./pdfHistory";
import { fechamentoLote, type FechamentoLote, type FaseRacao } from "./fechamentoLote";
import { CURVAS, type Linhagem } from "./linhagens";

const BRAND = { r: 88, g: 165, b: 90 };
const INK = { r: 30, g: 41, b: 59 };       // slate-800
const MUTED = { r: 100, g: 116, b: 139 };  // slate-500
const SOFT = { r: 241, g: 245, b: 249 };   // slate-100
const LINE = { r: 226, g: 232, b: 240 };   // slate-200
const OK = { r: 22, g: 163, b: 74 };
const WARN = { r: 217, g: 119, b: 6 };
const BAD = { r: 220, g: 38, b: 38 };

export const SITIO = {
  nome: "Sítio Santo Antônio",
  local: "Meridiano - SP",
  proprietario: "Luiz Antônio Balbo Pereira",
  responsavel: "Alan José Godoy",
};

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
  doc.text("AgroSítio · Gestão Rural", w - 14, 13, { align: "right" });
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

// ===== Helpers do relatório do lote =====

function getLoteLinhagem(loteId: string): Linhagem {
  if (typeof window === "undefined") return "cobb500";
  return (localStorage.getItem("granja:linhagem:" + loteId) as Linhagem) || "cobb500";
}
function getLoteAreaM2(loteId: string): number | undefined {
  if (typeof window === "undefined") return undefined;
  const v = localStorage.getItem("granja:areaM2:" + loteId);
  return v ? Number(v) : undefined;
}
function getLoteAbateReal(loteId: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  return localStorage.getItem("granja:abateReal:" + loteId) || undefined;
}

function interpCurva(linhagem: Linhagem, dia: number, key: "peso" | "consumoAcum" | "ca") {
  const c = CURVAS[linhagem];
  if (dia <= c[0].dia) return c[0][key];
  if (dia >= c[c.length - 1].dia) return c[c.length - 1][key];
  for (let i = 0; i < c.length - 1; i++) {
    const a = c[i], b = c[i + 1];
    if (dia >= a.dia && dia <= b.dia) {
      const t = (dia - a.dia) / (b.dia - a.dia);
      return a[key] + (b[key] - a[key]) * t;
    }
  }
  return c[c.length - 1][key];
}

function classificarUniformidade(cv: number): { label: string; cor: [number, number, number] } {
  if (cv <= 6) return { label: "Excelente", cor: [OK.r, OK.g, OK.b] };
  if (cv <= 8) return { label: "Muito boa", cor: [16, 185, 129] };
  if (cv <= 10) return { label: "Boa", cor: [BRAND.r, BRAND.g, BRAND.b] };
  if (cv <= 13) return { label: "Regular", cor: [WARN.r, WARN.g, WARN.b] };
  return { label: "Ruim", cor: [BAD.r, BAD.g, BAD.b] };
}

function pontuarLote(f: FechamentoLote, cv: number): { estrelas: number; nota: string } {
  let s = 0;
  s += f.mortPct <= 3 ? 5 : f.mortPct <= 5 ? 4 : f.mortPct <= 7 ? 3 : f.mortPct <= 10 ? 2 : 1;
  s += f.caEstimado <= 1.55 ? 5 : f.caEstimado <= 1.65 ? 4 : f.caEstimado <= 1.75 ? 3 : f.caEstimado <= 1.9 ? 2 : 1;
  s += f.pesoVsMetaPct >= 0 ? 5 : f.pesoVsMetaPct >= -3 ? 4 : f.pesoVsMetaPct >= -6 ? 3 : f.pesoVsMetaPct >= -10 ? 2 : 1;
  s += cv <= 6 ? 5 : cv <= 8 ? 4 : cv <= 10 ? 3 : cv <= 13 ? 2 : 1;
  s += f.viabilidade >= 96 ? 5 : f.viabilidade >= 94 ? 4 : f.viabilidade >= 92 ? 3 : f.viabilidade >= 88 ? 2 : 1;
  const media = s / 5;
  const estrelas = Math.max(1, Math.min(5, Math.round(media)));
  const nota = estrelas === 5 ? "Excelente" : estrelas === 4 ? "Muito Bom" : estrelas === 3 ? "Bom" : estrelas === 2 ? "Regular" : "Insuficiente";
  return { estrelas, nota };
}

function card(doc: jsPDF, x: number, y: number, w: number, h: number, titulo: string, valor: string, sub?: string, corValor?: [number, number, number]) {
  doc.setDrawColor(LINE.r, LINE.g, LINE.b);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, h, 2.4, 2.4, "FD");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(titulo.toUpperCase(), x + 4, y + 5.5);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  const c = corValor ?? [INK.r, INK.g, INK.b];
  doc.setTextColor(c[0], c[1], c[2]);
  doc.text(valor, x + 4, y + 13);
  if (sub) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(sub, x + 4, y + 18);
  }
}

function secaoTitulo(doc: jsPDF, y: number, titulo: string): number {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(14, y, 3, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.text(titulo, 20, y + 5);
  doc.setDrawColor(LINE.r, LINE.g, LINE.b);
  doc.line(14, y + 8, w - 14, y + 8);
  return y + 13;
}

function estrelas(doc: jsPDF, x: number, y: number, n: number, size = 6) {
  for (let i = 0; i < 5; i++) {
    if (i < n) { doc.setTextColor(245, 158, 11); doc.text("★", x + i * size, y); }
    else { doc.setTextColor(203, 213, 225); doc.text("★", x + i * size, y); }
  }
}

// mini-gráfico de linha
function chartLinha(doc: jsPDF, x: number, y: number, w: number, h: number, titulo: string, series: { nome: string; dados: number[]; cor: [number, number, number] }[], labels: string[]) {
  doc.setDrawColor(LINE.r, LINE.g, LINE.b);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, h, 2, 2, "FD");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9);
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.text(titulo, x + 4, y + 6);

  const pad = { l: 12, r: 6, t: 12, b: 12 };
  const cx = x + pad.l, cy = y + pad.t;
  const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;

  const all = series.flatMap(s => s.dados).filter(v => Number.isFinite(v));
  if (!all.length) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(8);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text("Sem dados suficientes", x + w / 2, y + h / 2, { align: "center" });
    return;
  }
  const min = Math.min(...all, 0);
  const max = Math.max(...all);
  const range = Math.max(1, max - min);
  const n = Math.max(...series.map(s => s.dados.length));

  // eixos
  doc.setDrawColor(LINE.r, LINE.g, LINE.b);
  doc.line(cx, cy, cx, cy + ch);
  doc.line(cx, cy + ch, cx + cw, cy + ch);

  // grid + labels
  doc.setFontSize(6); doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  for (let i = 0; i <= 4; i++) {
    const yy = cy + ch - (ch * i) / 4;
    doc.setDrawColor(240, 244, 248);
    doc.line(cx, yy, cx + cw, yy);
    const val = min + (range * i) / 4;
    doc.text(val.toFixed(val >= 100 ? 0 : 1), cx - 1, yy + 1.5, { align: "right" });
  }

  // linhas
  series.forEach(s => {
    if (s.dados.length < 2) return;
    doc.setDrawColor(s.cor[0], s.cor[1], s.cor[2]);
    doc.setLineWidth(0.6);
    for (let i = 0; i < s.dados.length - 1; i++) {
      const x1 = cx + (cw * i) / Math.max(1, n - 1);
      const x2 = cx + (cw * (i + 1)) / Math.max(1, n - 1);
      const y1 = cy + ch - ((s.dados[i] - min) / range) * ch;
      const y2 = cy + ch - ((s.dados[i + 1] - min) / range) * ch;
      doc.line(x1, y1, x2, y2);
    }
  });
  doc.setLineWidth(0.2);

  // labels eixo X (a cada ~5)
  doc.setFontSize(5.5); doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  const step = Math.max(1, Math.round(n / 6));
  for (let i = 0; i < n; i += step) {
    const xx = cx + (cw * i) / Math.max(1, n - 1);
    doc.text(labels[i] ?? "", xx, cy + ch + 4, { align: "center" });
  }

  // legenda
  let lx = x + w - pad.r;
  [...series].reverse().forEach(s => {
    doc.setFillColor(s.cor[0], s.cor[1], s.cor[2]);
    doc.setFontSize(6.5); doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    const tw = doc.getTextWidth(s.nome);
    lx -= (tw + 6);
    doc.circle(lx, y + 6.5, 1, "F");
    doc.text(s.nome, lx + 2, y + 7);
  });
}

function chartBarras(doc: jsPDF, x: number, y: number, w: number, h: number, titulo: string, dados: number[], labels: string[], cor: [number, number, number]) {
  doc.setDrawColor(LINE.r, LINE.g, LINE.b);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, h, 2, 2, "FD");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9);
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.text(titulo, x + 4, y + 6);

  const pad = { l: 12, r: 6, t: 12, b: 12 };
  const cx = x + pad.l, cy = y + pad.t;
  const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;

  if (!dados.length) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(8);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text("Sem dados", x + w / 2, y + h / 2, { align: "center" });
    return;
  }
  const max = Math.max(1, ...dados);
  const bw = cw / dados.length;

  doc.setFontSize(6); doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  for (let i = 0; i <= 4; i++) {
    const yy = cy + ch - (ch * i) / 4;
    doc.setDrawColor(240, 244, 248);
    doc.line(cx, yy, cx + cw, yy);
    doc.text(((max * i) / 4).toFixed(0), cx - 1, yy + 1.5, { align: "right" });
  }

  doc.setFillColor(cor[0], cor[1], cor[2]);
  dados.forEach((v, i) => {
    const bh = (v / max) * ch;
    doc.rect(cx + i * bw + 0.6, cy + ch - bh, Math.max(0.4, bw - 1.2), bh, "F");
  });

  doc.setFontSize(5.5); doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  const step = Math.max(1, Math.round(dados.length / 6));
  for (let i = 0; i < dados.length; i += step) {
    doc.text(labels[i] ?? "", cx + i * bw + bw / 2, cy + ch + 4, { align: "center" });
  }
}

function ensurePage(doc: jsPDF, y: number, need = 40): number {
  const h = doc.internal.pageSize.getHeight();
  if (y + need > h - 20) { doc.addPage(); return 46; }
  return y;
}

export function gerarRelatorioLote(lote: Lote) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const linhagem = getLoteLinhagem(lote.id);
  const areaM2 = getLoteAreaM2(lote.id);
  const abateReal = getLoteAbateReal(lote.id);
  const f = fechamentoLote(lote, linhagem);

  // ===== série diária derivada =====
  const entries = [...lote.entries].sort((a, b) => a.date.localeCompare(b.date));
  const entrada = new Date(lote.dataEntrada + "T00:00:00");
  type Dia = {
    date: string; idade: number; mort: number; mortAcum: number;
    vivas: number; pesoG: number | null; pesoMeta: number; ganhoDia: number | null;
    consumoDiaKg: number; consumoAcumKg: number; caDia: number | null;
    obs?: string;
  };
  const dias: Dia[] = [];
  let acumMort = 0, acumConsumoKg = 0, ultPeso: number | null = null;
  entries.forEach(e => {
    const d = new Date(e.date + "T00:00:00");
    const idade = Math.max(0, Math.floor((d.getTime() - entrada.getTime()) / 86400000));
    acumMort += (e.mortalidade || 0) + (e.eliminados || 0);
    const vivas = Math.max(0, lote.quantidadeInicial - acumMort);
    const pesoG = e.pesoMedioG ?? null;
    const pesoMeta = interpCurva(linhagem, idade, "peso");
    const gAveDia = Math.max(0, interpCurva(linhagem, idade + 0.5, "consumoAcum") - interpCurva(linhagem, idade - 0.5, "consumoAcum"));
    const consumoDiaKg = (vivas * gAveDia) / 1000;
    acumConsumoKg += consumoDiaKg;
    const ganho = pesoG !== null && ultPeso !== null ? pesoG - ultPeso : null;
    const caDia = pesoG !== null && ganho !== null && ganho > 0 && vivas > 0
      ? consumoDiaKg / ((ganho / 1000) * vivas) : null;
    dias.push({ date: e.date, idade, mort: (e.mortalidade || 0) + (e.eliminados || 0), mortAcum: acumMort, vivas, pesoG, pesoMeta, ganhoDia: ganho, consumoDiaKg, consumoAcumKg: acumConsumoKg, caDia, obs: e.observacoes });
    if (pesoG !== null) ultPeso = pesoG;
  });

  // KPIs derivados
  const pesosReais = dias.map(d => d.pesoG).filter((x): x is number => x !== null);
  const pesoMax = pesosReais.length ? Math.max(...pesosReais) : 0;
  const pesoMin = pesosReais.length ? Math.min(...pesosReais) : 0;
  const gpd = pesosReais.length >= 2 && dias.length >= 2
    ? (pesosReais[pesosReais.length - 1] - pesosReais[0]) / Math.max(1, dias[dias.length - 1].idade - dias.find(d => d.pesoG !== null)!.idade)
    : (f.pesoMedioG ? f.pesoMedioG / Math.max(1, f.idade) : 0);
  const consumoTotalKg = acumConsumoKg;
  const consumoMedioAve = f.vivas > 0 ? (consumoTotalKg / f.vivas) : 0;
  const consumoDiario = dias.length ? consumoTotalKg / dias.length : 0;
  const caReal = f.pesoVivoKg > 0 ? consumoTotalKg / f.pesoVivoKg : f.caEstimado;
  const caAjustada = f.pesoMedioG ? caReal * (2500 / Math.max(500, f.pesoMedioG)) : caReal;
  // IEP = (viabilidade × peso médio kg × 100) / (idade × CA)
  const iep = f.pesoMedioG && f.caEstimado > 0 && f.idade > 0
    ? (f.viabilidade * (f.pesoMedioG / 1000) * 100) / (f.idade * caReal) : 0;

  const picoMort = dias.reduce((m, d) => d.mort > m.mort ? d : m, { date: "", mort: 0 } as any);
  const mediaMortDia = dias.length ? f.baixas / dias.length : 0;

  // uniformidade estimada (CV do peso vs meta ao longo do tempo)
  const desvios = dias.filter(d => d.pesoG !== null).map(d => (d.pesoG! - d.pesoMeta) / d.pesoMeta);
  const mediaDesv = desvios.length ? desvios.reduce((s, v) => s + v, 0) / desvios.length : 0;
  const varDesv = desvios.length ? desvios.reduce((s, v) => s + (v - mediaDesv) ** 2, 0) / desvios.length : 0;
  const cvEstimado = Math.sqrt(varDesv) * 100;
  const uniformidade = Math.max(0, Math.min(100, 100 - cvEstimado));
  const uni = classificarUniformidade(cvEstimado);
  const pont = pontuarLote(f, cvEstimado);

  const densidade = areaM2 && areaM2 > 0 ? f.vivas / areaM2 : null;
  const dataPrevAbate = new Date(entrada.getTime() + lote.previsaoAbateDias * 86400000);
  const producaoPorM2 = areaM2 && areaM2 > 0 ? f.pesoVivoKg / areaM2 : null;
  const producaoPorAve = f.inicial > 0 ? f.pesoVivoKg / f.inicial : 0;

  // ============ PÁGINA 1: Capa / Resumo ============
  header(doc, `Relatório Técnico do Lote ${lote.numero}`, `${lote.integradora || "—"} · Linhagem ${linhagem === "cobb500" ? "Cobb 500" : "Ross 308"} · ${f.encerrado ? "Lote encerrado" : `Em andamento — D${f.idade}/${f.diasPrevistos}`}`);

  // Faixa de classificação
  doc.setFillColor(SOFT.r, SOFT.g, SOFT.b);
  doc.roundedRect(14, 60, w - 28, 22, 3, 3, "F");
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text("AVALIAÇÃO GERAL DO LOTE", 20, 68);
  doc.setFont("helvetica", "bold"); doc.setFontSize(20);
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.text(pont.nota, 20, 78);
  doc.setFontSize(16);
  estrelas(doc, w - 90, 76, pont.estrelas, 7);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text("Mort. · CA · Peso · Uniformidade · Viabilidade", w - 90, 80);

  // Cards principais (8 cards 2x4)
  let cy = 90;
  const cw = (w - 28 - 9) / 4;  // 4 cards por linha, gap 3
  const ch = 24;
  const kpis: Array<[string, string, string?, [number, number, number]?]> = [
    ["Aves alojadas", f.inicial.toLocaleString("pt-BR"), lote.integradora || "—"],
    ["Aves vivas", f.vivas.toLocaleString("pt-BR"), `Viab. ${f.viabilidade.toFixed(1)}%`, [OK.r, OK.g, OK.b]],
    ["Mortalidade", `${f.baixas.toLocaleString("pt-BR")}`, `${f.mortPct.toFixed(2)}%`, f.mortPct > 5 ? [BAD.r, BAD.g, BAD.b] : [INK.r, INK.g, INK.b]],
    ["Idade do lote", `${f.idade} d`, `Previsão ${f.diasPrevistos} d`],
    ["Peso médio", f.pesoMedioG ? `${f.pesoMedioG.toLocaleString("pt-BR")} g` : "Não informado", f.pesoMedioG ? `Meta ${Math.round(f.pesoMetaG)} g (${f.pesoVsMetaPct >= 0 ? "+" : ""}${f.pesoVsMetaPct.toFixed(1)}%)` : ""],
    ["Peso vivo total", `${Math.round(f.pesoVivoKg).toLocaleString("pt-BR")} kg`, `${(f.pesoVivoKg / 1000).toFixed(2)} t`],
    ["Densidade", densidade ? `${densidade.toFixed(1)} aves/m²` : "Não informado", areaM2 ? `Área ${areaM2} m²` : "Cadastre a área"],
    ["Lucro estimado", `R$ ${f.lucroLiquido.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`, `Margem ${f.margemPct.toFixed(1)}%`, f.lucroLiquido >= 0 ? [OK.r, OK.g, OK.b] : [BAD.r, BAD.g, BAD.b]],
  ];
  kpis.forEach((k, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    card(doc, 14 + col * (cw + 3), cy + row * (ch + 3), cw, ch, k[0], k[1], k[2], k[3]);
  });
  cy += 2 * (ch + 3) + 4;

  // Bloco datas & contexto
  cy = secaoTitulo(doc, cy, "Datas & contexto");
  autoTable(doc, {
    startY: cy, theme: "plain", styles: { fontSize: 8.5, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: "bold", textColor: [INK.r, INK.g, INK.b], cellWidth: 55 }, 1: { textColor: [MUTED.r, MUTED.g, MUTED.b] } },
    body: [
      ["Empresa integradora", lote.integradora || "Não informado"],
      ["Data de alojamento", entrada.toLocaleDateString("pt-BR")],
      ["Data prevista de abate", dataPrevAbate.toLocaleDateString("pt-BR")],
      ["Data real de abate", abateReal ? new Date(abateReal).toLocaleDateString("pt-BR") : (f.encerrado ? "Lote encerrado sem data registrada" : "—")],
      ["Área da granja", areaM2 ? `${areaM2} m²` : "Não informado"],
      ["Densidade de alojamento", areaM2 ? `${(f.inicial / areaM2).toFixed(1)} aves/m²` : "Não informado"],
      ["Preço R$/kg vivo", `R$ ${(lote.precoKgVivo ?? 5.5).toFixed(2)}`],
    ],
  });

  // ============ PÁGINA 2: Conversão + Crescimento ============
  doc.addPage();
  let y = 46;
  y = secaoTitulo(doc, y, "Conversão alimentar");
  const temConsumo = consumoTotalKg > 0 && f.pesoVivoKg > 0;
  if (temConsumo) {
    const ccw = (w - 28 - 6) / 3;
    const linha1: Array<[string, string, string?, [number, number, number]?]> = [
      ["CA (real)", caReal.toFixed(3), "kg ração / kg carne", caReal <= 1.7 ? [OK.r, OK.g, OK.b] : caReal <= 1.85 ? [WARN.r, WARN.g, WARN.b] : [BAD.r, BAD.g, BAD.b]],
      ["CA ajustada (2,5 kg)", caAjustada.toFixed(3), "Corrigida para peso padrão"],
      ["IEP", iep > 0 ? iep.toFixed(0) : "—", "Índice de Eficiência Produtiva", iep >= 320 ? [OK.r, OK.g, OK.b] : iep >= 280 ? [WARN.r, WARN.g, WARN.b] : [BAD.r, BAD.g, BAD.b]],
    ];
    linha1.forEach((k, i) => card(doc, 14 + i * (ccw + 3), y, ccw, ch, k[0], k[1], k[2], k[3]));
    const linha2: Array<[string, string, string?]> = [
      ["Consumo total", `${Math.round(consumoTotalKg).toLocaleString("pt-BR")} kg`, `${(consumoTotalKg / 1000).toFixed(2)} t`],
      ["Consumo médio/ave", `${consumoMedioAve.toFixed(2)} kg`, `${(consumoMedioAve * 1000).toFixed(0)} g/ave`],
      ["Consumo diário médio", `${consumoDiario.toFixed(1)} kg/dia`, `${(consumoDiario / f.vivas * 1000).toFixed(1)} g/ave/dia`],
    ];
    linha2.forEach((k, i) => card(doc, 14 + i * (ccw + 3), y + ch + 3, ccw, ch, k[0], k[1], k[2]));
    y += 2 * (ch + 3) + 4;
  } else {
    doc.setFillColor(SOFT.r, SOFT.g, SOFT.b);
    doc.roundedRect(14, y, w - 28, 16, 2, 2, "F");
    doc.setFont("helvetica", "italic"); doc.setFontSize(9);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text("Conversão alimentar indisponível. Cadastre o consumo de ração para calcular automaticamente.", w / 2, y + 10, { align: "center" });
    y += 22;
  }

  y = secaoTitulo(doc, y, "Crescimento");
  const cwG = (w - 28 - 9) / 4;
  const growth: Array<[string, string, string?, [number, number, number]?]> = [
    ["Ganho de peso diário (GPD)", `${gpd.toFixed(1)} g/dia`, "Média do período"],
    ["Peso realizado", f.pesoMedioG ? `${f.pesoMedioG.toLocaleString("pt-BR")} g` : "—", "Última pesagem"],
    ["Peso esperado", `${Math.round(f.pesoMetaG).toLocaleString("pt-BR")} g`, `Curva ${linhagem === "cobb500" ? "Cobb 500" : "Ross 308"}`],
    ["Diferença", f.pesoMedioG ? `${f.pesoVsMetaPct >= 0 ? "+" : ""}${f.pesoVsMetaPct.toFixed(2)}%` : "—", "Realizado vs meta", f.pesoVsMetaPct >= 0 ? [OK.r, OK.g, OK.b] : [BAD.r, BAD.g, BAD.b]],
    ["Peso máximo", pesoMax ? `${pesoMax.toLocaleString("pt-BR")} g` : "—"],
    ["Peso mínimo", pesoMin ? `${pesoMin.toLocaleString("pt-BR")} g` : "—"],
    ["Pesagens registradas", `${pesosReais.length}`],
    ["Uniformidade estimada", `${uniformidade.toFixed(1)}%`, `CV ${cvEstimado.toFixed(2)}%`, uni.cor],
  ];
  growth.forEach((k, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    card(doc, 14 + col * (cwG + 3), y + row * (ch + 3), cwG, ch, k[0], k[1], k[2], k[3]);
  });
  y += 2 * (ch + 3) + 6;

  // ============ Mortalidade + Uniformidade ============
  y = ensurePage(doc, y, 70);
  y = secaoTitulo(doc, y, "Mortalidade");
  const cwM = (w - 28 - 9) / 4;
  const mort: Array<[string, string, string?, [number, number, number]?]> = [
    ["Mortalidade acumulada", `${f.baixas.toLocaleString("pt-BR")} aves`, `${f.mortPct.toFixed(2)}%`, f.mortPct > 5 ? [BAD.r, BAD.g, BAD.b] : [INK.r, INK.g, INK.b]],
    ["Média diária", `${mediaMortDia.toFixed(2)} aves/dia`],
    ["Pico de mortalidade", `${picoMort.mort} aves`, picoMort.date ? `Dia ${new Date(picoMort.date).toLocaleDateString("pt-BR")}` : "—"],
    ["Viabilidade", `${f.viabilidade.toFixed(2)}%`, "100 − Mortalidade", [OK.r, OK.g, OK.b]],
  ];
  mort.forEach((k, i) => card(doc, 14 + i * (cwM + 3), y, cwM, ch, k[0], k[1], k[2], k[3]));
  y += ch + 6;

  y = secaoTitulo(doc, y, "Uniformidade");
  const cwU = (w - 28 - 6) / 3;
  const uniCards: Array<[string, string, string?, [number, number, number]?]> = [
    ["Uniformidade", `${uniformidade.toFixed(1)}%`, "Dentro da meta ±", uni.cor],
    ["Coeficiente de Variação (CV)", `${cvEstimado.toFixed(2)}%`, "Peso vs meta"],
    ["Classificação", uni.label, "Escala industrial", uni.cor],
  ];
  uniCards.forEach((k, i) => card(doc, 14 + i * (cwU + 3), y, cwU, ch, k[0], k[1], k[2], k[3]));
  y += ch + 8;

  // ============ Gráficos ============
  doc.addPage();
  y = 46;
  y = secaoTitulo(doc, y, "Evolução do desempenho");
  const gW = (w - 28 - 6) / 2;
  const gH = 55;
  const labels = dias.map(d => `D${d.idade}`);

  chartLinha(doc, 14, y, gW, gH, "Evolução do peso (g)", [
    { nome: "Real", dados: dias.map(d => d.pesoG ?? NaN).filter(v => Number.isFinite(v)) as number[], cor: [BRAND.r, BRAND.g, BRAND.b] },
    { nome: "Meta", dados: dias.filter(d => d.pesoG !== null).map(d => d.pesoMeta), cor: [148, 163, 184] },
  ], dias.filter(d => d.pesoG !== null).map(d => `D${d.idade}`));
  chartBarras(doc, 14 + gW + 6, y, gW, gH, "Mortalidade diária (aves)", dias.map(d => d.mort), labels, [BAD.r, BAD.g, BAD.b]);
  y += gH + 6;

  chartLinha(doc, 14, y, gW, gH, "Mortalidade acumulada", [
    { nome: "Acumulada", dados: dias.map(d => d.mortAcum), cor: [BAD.r, BAD.g, BAD.b] },
  ], labels);
  chartLinha(doc, 14 + gW + 6, y, gW, gH, "Consumo de ração (kg/dia)", [
    { nome: "Consumo", dados: dias.map(d => Number(d.consumoDiaKg.toFixed(1))), cor: [59, 130, 246] },
  ], labels);
  y += gH + 6;

  chartLinha(doc, 14, y, gW, gH, "Conversão alimentar (dia)", [
    { nome: "CA dia", dados: dias.map(d => d.caDia ?? NaN).filter(v => Number.isFinite(v)) as number[], cor: [217, 119, 6] },
  ], dias.filter(d => d.caDia !== null).map(d => `D${d.idade}`));
  chartLinha(doc, 14 + gW + 6, y, gW, gH, "Ganho diário (g/dia)", [
    { nome: "Ganho", dados: dias.map(d => d.ganhoDia ?? NaN).filter(v => Number.isFinite(v)) as number[], cor: [OK.r, OK.g, OK.b] },
  ], dias.filter(d => d.ganhoDia !== null).map(d => `D${d.idade}`));
  y += gH + 6;

  // ============ Histórico diário ============
  doc.addPage();
  y = 46;
  y = secaoTitulo(doc, y, "Histórico diário completo");
  autoTable(doc, {
    startY: y,
    theme: "striped",
    styles: { fontSize: 7.5, cellPadding: 1.6 },
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: 255, fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    head: [["Data", "Idade", "Mort.", "Mort. acum.", "Peso (g)", "Ganho/dia", "Consumo (kg)", "CA dia", "Observações"]],
    body: dias.map(d => [
      new Date(d.date).toLocaleDateString("pt-BR"),
      `D${d.idade}`,
      d.mort.toString(),
      d.mortAcum.toString(),
      d.pesoG !== null ? d.pesoG.toLocaleString("pt-BR") : "—",
      d.ganhoDia !== null ? d.ganhoDia.toFixed(1) : "—",
      d.consumoDiaKg.toFixed(1),
      d.caDia !== null ? d.caDia.toFixed(2) : "—",
      d.obs ?? "",
    ]),
  });

  // ============ Estatísticas finais ============
  y = (doc as any).lastAutoTable.finalY + 8;
  y = ensurePage(doc, y, 90);
  y = secaoTitulo(doc, y, "Estatísticas finais");
  autoTable(doc, {
    startY: y, theme: "grid",
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: 255 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 } },
    head: [["Indicador", "Valor"]],
    body: [
      ["Total de aves alojadas", f.inicial.toLocaleString("pt-BR")],
      ["Total abatido / previsto", f.vivas.toLocaleString("pt-BR")],
      ["Peso total produzido", `${Math.round(f.pesoVivoKg).toLocaleString("pt-BR")} kg (${(f.pesoVivoKg / 1000).toFixed(2)} t)`],
      ["Peso médio final", f.pesoMedioG ? `${f.pesoMedioG.toLocaleString("pt-BR")} g` : "Não informado"],
      ["Mortalidade total", `${f.baixas.toLocaleString("pt-BR")} aves (${f.mortPct.toFixed(2)}%)`],
      ["Viabilidade final", `${f.viabilidade.toFixed(2)}%`],
      ["Conversão alimentar", temConsumo ? caReal.toFixed(3) : "Não informado"],
      ["Consumo total de ração", `${Math.round(consumoTotalKg).toLocaleString("pt-BR")} kg`],
      ["Produção por m²", producaoPorM2 ? `${producaoPorM2.toFixed(2)} kg/m²` : "Não informado"],
      ["Produção por ave alojada", `${producaoPorAve.toFixed(3)} kg/ave`],
      ["Índice de Eficiência Produtiva (IEP)", iep > 0 ? iep.toFixed(0) : "Não informado"],
      ["Ganho de peso diário (GPD)", `${gpd.toFixed(1)} g/dia`],
      ["Classificação final do lote", `${pont.nota} (${pont.estrelas}/5 estrelas)`],
    ],
  });

  footer(doc);
  savePdf(doc, `relatorio-lote-${lote.numero}.pdf`, { titulo: `Relatório Técnico do Lote ${lote.numero}`, modulo: "Granja", ref: `Lote ${lote.numero}` });
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
  savePdf(doc, `relatorio-energia-${new Date().toISOString().slice(0, 10)}.pdf`, { titulo: "Consumo de Energia", modulo: "Energia" });
}

export function gerarRelatorioGeral(lotes: Lote[], medidores: Medidor[], animais: Animal[]) {
  const doc = new jsPDF();
  header(doc, "Relatório Geral do Sítio", new Date().toLocaleDateString("pt-BR"));

  const lotesAtivos = lotes.filter((l) => !l.encerrado);
  const totalAves = lotesAtivos.reduce((s, l) => s + l.quantidadeInicial - l.entries.reduce((a, e) => a + e.mortalidade, 0), 0);
  const ativos = animais.filter((a) => a.status === "ativo");

  autoTable(doc, {
    startY: 62,
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
  savePdf(doc, `relatorio-geral-${new Date().toISOString().slice(0, 10)}.pdf`, { titulo: "Relatório Geral do Sítio", modulo: "Geral" });
}

function ultimoPeso(a: Animal) {
  return [...a.pesagens].sort((x, y) => y.data.localeCompare(x.data))[0]?.pesoKg;
}

export function gerarRelatorioRebanho(animais: Animal[]) {
  const doc = new jsPDF();
  const ativos = animais.filter((a) => a.status === "ativo");
  header(doc, "Relatório do Rebanho", `${ativos.length} cabeças ativas`);

  autoTable(doc, {
    startY: 62,
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
  savePdf(doc, `relatorio-rebanho-${new Date().toISOString().slice(0, 10)}.pdf`, { titulo: "Relatório do Rebanho", modulo: "Gado" });
}

export function gerarRelatorioAnimal(a: Animal) {
  const doc = new jsPDF();
  header(doc, `Animal ${a.brinco}`, `${a.sexo} · ${a.categoria ?? ""} · ${a.raca ?? ""}`);

  autoTable(doc, {
    startY: 62, theme: "grid",
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
  savePdf(doc, `animal-${a.brinco}.pdf`, { titulo: `Animal ${a.brinco}`, modulo: "Gado", ref: `Brinco ${a.brinco}` });
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
  savePdf(doc, `diario-${new Date().toISOString().slice(0, 10)}.pdf`, { titulo, modulo: "Diário" });
}

export function gerarLivroCaixa(lancamentos: Lancamento[], periodoLabel: string) {
  const doc = new jsPDF();
  header(doc, "Livro Caixa do Produtor", periodoLabel);

  const sorted = [...lancamentos].sort((a, b) => a.data.localeCompare(b.data));
  let saldo = 0;
  const rows = sorted.map((l) => {
    const e = l.tipo === "receita" ? l.valor : 0;
    const s = l.tipo === "despesa" ? l.valor : 0;
    saldo += e - s;
    return [
      new Date(l.data).toLocaleDateString("pt-BR"),
      l.descricao + (l.categoria ? ` (${l.categoria})` : ""),
      l.modulo ?? "—",
      e ? e.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—",
      s ? s.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—",
      saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    ];
  });

  const totReceita = sorted.filter((l) => l.tipo === "receita").reduce((a, b) => a + b.valor, 0);
  const totDespesa = sorted.filter((l) => l.tipo === "despesa").reduce((a, b) => a + b.valor, 0);

  autoTable(doc, {
    startY: 62, theme: "grid",
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b] },
    head: [["Resumo", "Valor"]],
    body: [
      ["Total de receitas", totReceita.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })],
      ["Total de despesas", totDespesa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })],
      ["Resultado do período", (totReceita - totDespesa).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })],
      ["Lançamentos", sorted.length.toString()],
    ],
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8, theme: "striped",
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b] },
    head: [["Data", "Histórico", "Módulo", "Entrada", "Saída", "Saldo"]],
    body: rows.length ? rows : [["—", "Sem lançamentos", "—", "—", "—", "—"]],
    styles: { fontSize: 8 },
  });

  footer(doc);
  savePdf(doc, `livro-caixa-${periodoLabel.replace(/\s+/g, "-").toLowerCase()}.pdf`, { titulo: `Livro Caixa — ${periodoLabel}`, modulo: "Financeiro", ref: periodoLabel });
}

export function gerarFechamentoPDF(lote: Lote, f: FechamentoLote, fases: FaseRacao[]) {
  const doc = new jsPDF();
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
  header(doc, `Fechamento — Lote ${lote.numero}`, `${f.encerrado ? "Lote encerrado" : `D${f.idade}/${f.diasPrevistos}`} · ${lote.integradora || "—"}`);

  autoTable(doc, {
    startY: 62, theme: "grid",
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b] },
    head: [["Indicador zootécnico", "Valor"]],
    body: [
      ["Aves alojadas", f.inicial.toLocaleString("pt-BR")],
      ["Aves vivas", f.vivas.toLocaleString("pt-BR")],
      ["Baixas (mort. + elim.)", `${f.baixas.toLocaleString("pt-BR")} (${f.mortPct.toFixed(2)}%)`],
      ["Viabilidade", `${f.viabilidade.toFixed(2)}%`],
      ["Peso médio", f.pesoMedioG ? `${f.pesoMedioG.toLocaleString("pt-BR")} g (meta ${Math.round(f.pesoMetaG)} g · ${f.pesoVsMetaPct >= 0 ? "+" : ""}${f.pesoVsMetaPct.toFixed(1)}%)` : "—"],
      ["Peso vivo total", `${f.pesoVivoKg.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg`],
      ["Conversão alimentar (estim.)", f.caEstimado.toFixed(2)],
      ["Ração consumida (estim.)", `${f.racaoConsumidaKg.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg`],
      ["Ração total prevista", `${f.racaoTotalKg.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg`],
    ],
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8, theme: "grid",
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b] },
    head: [["Fechamento financeiro", "Valor"]],
    body: [
      ["Receita estimada", fmt(f.receitaEstimada)],
      ["Custo pintinhos", fmt(f.custoPintinhos)],
      ["Custo ração", fmt(f.custoRacao)],
      ["Outros custos", fmt(f.custoOutros)],
      ["Custo total", fmt(f.custoTotal)],
      [f.lucroLiquido >= 0 ? "Lucro líquido" : "Prejuízo", fmt(f.lucroLiquido)],
      ["Margem", `${f.margemPct.toFixed(2)}%`],
      ["R$ por ave viva", fmt(f.lucroPorAve)],
    ],
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8, theme: "striped",
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b] },
    head: [["Fase", "Período", "g/ave", "Total no lote"]],
    body: fases.map((fa) => [
      fa.nome,
      `D${fa.diaInicio}–D${fa.diaFim}`,
      `${fa.gPorAve} g`,
      `${((fa.gPorAve / 1000) * lote.quantidadeInicial).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg`,
    ]),
  });

  footer(doc);
  savePdf(doc, `fechamento-lote-${lote.numero}.pdf`, { titulo: `Fechamento do Lote ${lote.numero}`, modulo: "Granja", ref: `Lote ${lote.numero}` });
}

export function gerarComparativoLotesPDF(dados: FechamentoLote[]) {
  const doc = new jsPDF({ orientation: "landscape" });
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  header(doc, "Comparativo de Lotes", `${dados.length} lote(s)`);

  const totReceita = dados.reduce((s, d) => s + d.receitaEstimada, 0);
  const totCusto = dados.reduce((s, d) => s + d.custoTotal, 0);
  autoTable(doc, {
    startY: 62, theme: "grid",
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b] },
    head: [["Resumo", "Valor"]],
    body: [
      ["Receita total estimada", fmt(totReceita)],
      ["Custo total", fmt(totCusto)],
      ["Resultado", fmt(totReceita - totCusto)],
    ],
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8, theme: "striped",
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b] },
    head: [["Lote", "Status", "Aves", "Mort.", "Viab.", "Peso", "CA", "Receita", "Custo", "Lucro", "R$/ave"]],
    body: dados.map((d) => [
      d.numero,
      d.encerrado ? "Encerrado" : `D${d.idade}/${d.diasPrevistos}`,
      d.vivas.toLocaleString("pt-BR"),
      `${d.mortPct.toFixed(2)}%`,
      `${d.viabilidade.toFixed(2)}%`,
      d.pesoMedioG ? `${d.pesoMedioG} g` : "—",
      d.caEstimado.toFixed(2),
      fmt(d.receitaEstimada),
      fmt(d.custoTotal),
      fmt(d.lucroLiquido),
      fmt(d.lucroPorAve),
    ]),
    styles: { fontSize: 8 },
  });

  footer(doc);
  savePdf(doc, `comparativo-lotes-${new Date().toISOString().slice(0, 10)}.pdf`, { titulo: "Comparativo de Lotes", modulo: "Granja" });
}
