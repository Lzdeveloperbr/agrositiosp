import { hojeISO } from "@/lib/data";
// Notificações locais (Notification API). Funciona com app aberto / instalado em foreground.
// Sem service worker push (que exigiria FCM). Persiste IDs já notificados em localStorage.

const KEY = "agro:notif-sent";

function getSent(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
function setSent(map: Record<string, number>) {
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch {}
}

export function notifSupportada(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notifPermissao(): NotificationPermission | "unsupported" {
  if (!notifSupportada()) return "unsupported";
  return Notification.permission;
}

export async function pedirPermissao(): Promise<NotificationPermission | "unsupported"> {
  if (!notifSupportada()) return "unsupported";
  if (Notification.permission === "granted" || Notification.permission === "denied") return Notification.permission;
  return await Notification.requestPermission();
}

export function notificar(id: string, titulo: string, corpo: string, urlIcon = "/icon-192.png") {
  if (!notifSupportada() || Notification.permission !== "granted") return false;
  const sent = getSent();
  const hoje = hojeISO();
  const key = `${id}:${hoje}`;
  if (sent[key]) return false;
  try {
    new Notification(titulo, { body: corpo, icon: urlIcon, badge: urlIcon, tag: id });
    sent[key] = Date.now();
    // limpa entradas antigas (>7d)
    const cutoff = Date.now() - 7 * 86400000;
    for (const k of Object.keys(sent)) if (sent[k] < cutoff) delete sent[k];
    setSent(sent);
    return true;
  } catch { return false; }
}
