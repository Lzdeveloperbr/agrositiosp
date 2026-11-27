import { useCallback, useEffect, useState } from "react";
import { CloudOff, CloudUpload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useFazenda } from "@/lib/cloud/fazenda";
import { EVENTO_FILA, lerFila, sincronizarFila } from "@/lib/fila-lancamentos";
import { EVENTO_SALVO } from "@/components/LancamentoRapido";

/**
 * Indicador de conexão e reenvio automático da fila de lançamentos.
 * Fica invisível quando está online e sem pendências.
 */
export function StatusConexao({ className = "" }: { className?: string }) {
  const { client, fazendaId, operador } = useFazenda();
  const [online, setOnline] = useState(true);
  const [pendentes, setPendentes] = useState(0);
  const [enviando, setEnviando] = useState(false);

  const enviar = useCallback(
    async (manual = false) => {
      if (!fazendaId || !navigator.onLine || lerFila(fazendaId).length === 0) return;
      setEnviando(true);
      try {
        const r = await sincronizarFila(client, fazendaId, operador || null);
        if (r.enviados) {
          toast.success(`${r.enviados} lançamento(s) pendente(s) enviado(s)`);
          window.dispatchEvent(new CustomEvent(EVENTO_SALVO));
        }
        for (const x of r.recusados)
          toast.error(
            `Lote ${x.loteNumero} · ${x.form.data.split("-").reverse().join("/")}: ${x.erro}`,
          );
        if (manual && !r.enviados && lerFila(fazendaId).length)
          toast.warning("Ainda sem conexão com a nuvem. Nova tentativa em instantes.");
      } finally {
        setEnviando(false);
      }
    },
    [client, fazendaId, operador],
  );

  useEffect(() => {
    if (!fazendaId) return;
    const sync = () => {
      setOnline(navigator.onLine);
      setPendentes(lerFila(fazendaId).length);
    };
    sync();
    void enviar();
    const onOnline = () => {
      sync();
      void enviar();
    };
    const onVis = () => {
      if (!document.hidden) void enviar();
    };
    const onFila = (e: Event) => setPendentes(Number((e as CustomEvent<number>).detail) || 0);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", sync);
    window.addEventListener(EVENTO_FILA, onFila);
    document.addEventListener("visibilitychange", onVis);
    const id = window.setInterval(() => {
      if (!document.hidden) void enviar();
    }, 60_000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", sync);
      window.removeEventListener(EVENTO_FILA, onFila);
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(id);
    };
  }, [fazendaId, enviar]);

  if (online && pendentes === 0) return null;
  const Icone = enviando ? Loader2 : online ? CloudUpload : CloudOff;
  const texto = !online
    ? pendentes
      ? `Sem sinal · ${pendentes}`
      : "Sem sinal"
    : `${pendentes} a enviar`;
  return (
    <button
      type="button"
      onClick={() => void enviar(true)}
      title={
        pendentes
          ? `${pendentes} lançamento(s) guardado(s) no aparelho`
          : "Sem conexão com a internet"
      }
      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-bold ${online ? "border-primary/30 bg-primary/10 text-primary" : "border-warning/60 bg-warning/15 text-warning-foreground"} ${className}`}
    >
      <Icone className={`h-3.5 w-3.5 ${enviando ? "animate-spin" : ""}`} />
      {texto}
    </button>
  );
}
