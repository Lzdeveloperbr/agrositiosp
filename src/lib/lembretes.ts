// Lembretes mensais recorrentes (energia dia 30, internet dia 14, etc).
// Armazenados em localStorage por fazenda. Notificações nativas via Notification API.
import { useEffect, useState, useCallback } from "react";

export type Lembrete = {
  id: string;
  titulo: string;
  descricao?: string;
  dia: number;          // dia do mês (1-31)
  categoria: "energia" | "agua" | "internet" | "telefone" | "imposto" | "salario" | "racao" | "outro";
  ativo: boolean;
  notificar: boolean;
  ultimaNotificacao?: string; // YYYY-MM-DD para evitar repetir no mesmo dia
};

const PADRAO: Omit<Lembrete, "id">[] = [
  { titulo: "Leitura dos relógios de energia", descricao: "Anotar leitura dos 3 medidores", dia: 30, categoria: "energia", ativo: true, notificar: true },
  { titulo: "Pagar internet", descricao: "Vencimento mensal", dia: 14, categoria: "internet", ativo: true, notificar: true },
  { titulo: "Pagar conta de luz", descricao: "Vencimento mensal", dia: 10, categoria: "energia", ativo: true, notificar: true },
];

function key(fazendaId: string) { return `lembretes:${fazendaId}`; }

export function carregarLembretes(fazendaId: string): Lembrete[] {
  try {
    const raw = localStorage.getItem(key(fazendaId));
    if (!raw) {
      const seed = PADRAO.map((p) => ({ ...p, id: crypto.randomUUID() }));
      localStorage.setItem(key(fazendaId), JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw);
  } catch { return []; }
}

export function salvarLembretes(fazendaId: string, ls: Lembrete[]) {
  localStorage.setItem(key(fazendaId), JSON.stringify(ls));
}

export function useLembretes(fazendaId: string | null) {
  const [items, setItems] = useState<Lembrete[]>([]);
  useEffect(() => {
    if (!fazendaId) return;
    setItems(carregarLembretes(fazendaId));
  }, [fazendaId]);
  const set = useCallback((updater: Lembrete[] | ((prev: Lembrete[]) => Lembrete[])) => {
    setItems((prev) => {
      const next = typeof updater === "function" ? (updater as any)(prev) : updater;
      if (fazendaId) salvarLembretes(fazendaId, next);
      return next;
    });
  }, [fazendaId]);
  return [items, set] as const;
}

export function lembretesDoDia(items: Lembrete[], hoje = new Date()) {
  const dia = hoje.getDate();
  return items.filter((l) => l.ativo && l.dia === dia);
}

export function proximosLembretes(items: Lembrete[], janelaDias = 7, hoje = new Date()) {
  const dia = hoje.getDate();
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  return items
    .filter((l) => l.ativo)
    .map((l) => {
      let diasAte = l.dia - dia;
      if (diasAte < 0) diasAte += diasNoMes;
      return { lembrete: l, diasAte };
    })
    .filter((x) => x.diasAte >= 0 && x.diasAte <= janelaDias)
    .sort((a, b) => a.diasAte - b.diasAte);
}

// ===== Notificações =====
export async function pedirPermissaoNotificacao(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export function dispararNotificacao(titulo: string, body: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    new Notification(titulo, { body, icon: "/icon-192.png", badge: "/icon-192.png", tag: titulo });
  } catch {}
}

// Verifica e dispara notificações para os lembretes de hoje (uma vez por dia)
export function verificarENotificar(fazendaId: string) {
  const items = carregarLembretes(fazendaId);
  const hoje = new Date().toISOString().slice(0, 10);
  const doDia = lembretesDoDia(items);
  let alterado = false;
  for (const l of doDia) {
    if (!l.notificar) continue;
    if (l.ultimaNotificacao === hoje) continue;
    dispararNotificacao(`📌 ${l.titulo}`, l.descricao || "Lembrete de hoje");
    l.ultimaNotificacao = hoje;
    alterado = true;
  }
  if (alterado) salvarLembretes(fazendaId, items);
}
