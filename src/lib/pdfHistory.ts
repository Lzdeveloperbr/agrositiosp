import type jsPDF from "jspdf";

export type PdfHistoryItem = {
  id: string;
  filename: string;
  titulo: string;
  modulo: string;
  ref?: string;       // ex: número do lote, brinco
  data: string;       // ISO datetime
  size: number;       // bytes
  dataUrl: string;    // data:application/pdf;base64,...
};

const KEY = "pdf-history-v1";
const MAX_ITEMS = 40;

function read(): PdfHistoryItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(items: PdfHistoryItem[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {
    // quota — drop oldest until it fits
    while (items.length > 1) {
      items.pop();
      try { localStorage.setItem(KEY, JSON.stringify(items)); return; } catch {}
    }
  }
  window.dispatchEvent(new Event("pdf-history-changed"));
}

export function listPdfHistory(): PdfHistoryItem[] {
  return read().sort((a, b) => b.data.localeCompare(a.data));
}

export function deletePdfHistory(id: string) {
  write(read().filter((i) => i.id !== id));
}

export function clearPdfHistory() {
  write([]);
}

export function downloadFromHistory(item: PdfHistoryItem) {
  const a = document.createElement("a");
  a.href = item.dataUrl;
  a.download = item.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function printFromHistory(item: PdfHistoryItem) {
  const w = window.open("", "_blank");
  if (!w) { downloadFromHistory(item); return; }
  w.document.write(`<iframe src="${item.dataUrl}" style="border:0;width:100%;height:100vh" onload="this.contentWindow.focus();this.contentWindow.print();"></iframe>`);
  w.document.close();
}

export function savePdf(
  doc: jsPDF,
  filename: string,
  meta: { titulo: string; modulo: string; ref?: string },
) {
  // 1) trigger normal download
  doc.save(filename);
  // 2) record in history
  try {
    const blob = doc.output("blob") as Blob;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const items = read();
      items.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        filename,
        titulo: meta.titulo,
        modulo: meta.modulo,
        ref: meta.ref,
        data: new Date().toISOString(),
        size: blob.size,
        dataUrl,
      });
      write(items.slice(0, MAX_ITEMS));
    };
    reader.readAsDataURL(blob);
  } catch {}
}
