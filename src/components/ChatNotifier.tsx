// Avisa (notificação do sistema) quando chega mensagem nova no chat da equipe.
// Funciona no computador e no celular com o app aberto/instalado.
import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useFazenda } from "@/lib/cloud/fazenda";
import { notificar, notifSupportada, pedirPermissao } from "@/lib/notifications";

const SEEN_KEY = "agro:chat-last-seen";

export function ChatNotifier() {
  const { client, fazendaId, operador } = useFazenda();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const pathRef = useRef(pathname);
  const operadorRef = useRef(operador);
  pathRef.current = pathname;
  operadorRef.current = operador;

  useEffect(() => {
    if (!fazendaId || !notifSupportada()) return;
    if (Notification.permission === "default") void pedirPermissao();

    let cancel = false;
    let ultimo = localStorage.getItem(SEEN_KEY) || "";

    const checar = async () => {
      const { data, error } = await client
        .from("mensagens")
        .select("id, autor, texto, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      if (cancel || error || !data?.length) return;

      const novas = (data as any[])
        .filter((m) => !ultimo || m.created_at > ultimo)
        .filter((m) => (m.autor || "").trim() !== (operadorRef.current || "").trim())
        .reverse();

      ultimo = (data as any[])[0].created_at;
      localStorage.setItem(SEEN_KEY, ultimo);

      const noChat = pathRef.current === "/chat" && !document.hidden;
      if (noChat) return;

      for (const m of novas.slice(-3)) {
        notificar(`chat:${m.id}`, `💬 ${m.autor}`, String(m.texto).slice(0, 140));
      }
    };

    void checar();
    const timer = setInterval(() => void checar(), 10000);
    const onFocus = () => void checar();
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      cancel = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [client, fazendaId]);

  return null;
}
