import { useEffect, useState } from "react";
import { Download, Share, Smartphone, PlusSquare, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function InstallAppBanner() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [installed, setInstalled] = useState(true);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    const ua = navigator.userAgent;
    setIsIos(/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
      setInstalled(false);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setShowHelp(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.warn("Não foi possível registrar o suporte de instalação:", error);
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!promptEvent) {
      setShowHelp((value) => !value);
      return;
    }
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setPromptEvent(null);
  };

  if (installed) return null;

  return (
    <Card className="mb-4 overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 via-background to-emerald-500/5">
      <div className="flex items-center gap-3 p-3 sm:p-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Smartphone className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Instale o Aviário Pro</p>
          <p className="text-xs text-muted-foreground">Acesse pelo ícone na tela inicial, como um aplicativo.</p>
        </div>
        <Button size="sm" onClick={install} className="shrink-0">
          <Download className="mr-1.5 h-4 w-4" /> Instalar
        </Button>
      </div>
      {showHelp && (
        <div className="space-y-2 border-t border-border px-4 py-3 text-sm">
          {isIos ? (
            <>
              <p className="font-semibold">Instalar no iPhone ou iPad</p>
              <p className="flex items-center gap-2 text-muted-foreground"><Share className="h-4 w-4 shrink-0" /> 1. No Safari, toque em Compartilhar.</p>
              <p className="flex items-center gap-2 text-muted-foreground"><PlusSquare className="h-4 w-4 shrink-0" /> 2. Escolha “Adicionar à Tela de Início”.</p>
              <p className="text-xs text-muted-foreground">Confirme em “Adicionar”. O ícone do Aviário Pro ficará na tela inicial.</p>
            </>
          ) : (
            <>
              <p className="font-semibold">Instalar no Android</p>
              <p className="flex items-center gap-2 text-muted-foreground"><MoreVertical className="h-4 w-4 shrink-0" /> 1. Abra o menu ⋮ do Chrome.</p>
              <p className="flex items-center gap-2 text-muted-foreground"><Download className="h-4 w-4 shrink-0" /> 2. Toque em “Instalar aplicativo” ou “Adicionar à tela inicial”.</p>
              <p className="text-xs text-muted-foreground">Se a opção não aparecer, atualize a página e tente novamente pelo Chrome.</p>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
