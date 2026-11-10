import { useEffect, useState } from "react";
import { Download, Share, Smartphone, Apple, MonitorDown } from "lucide-react";
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

function detectAppleMobile() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function InstallAppBanner() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(true);
  const [isIos, setIsIos] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setInstalled(isStandalone());
    setIsIos(detectAppleMobile());

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
      setInstalled(false);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setMessage("Aviário Pro instalado com sucesso.");
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

  const installAndroid = async () => {
    if (!promptEvent) {
      setMessage("Este navegador não liberou a instalação direta. Abra o Aviário Pro em um navegador compatível com instalação de aplicativos.");
      return;
    }
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
      setMessage("Instalação confirmada.");
    }
    setPromptEvent(null);
  };

  const installIphone = async () => {
    const shareData = {
      title: "Aviário Pro",
      text: "Adicionar o Aviário Pro à tela inicial",
      url: window.location.href,
    };

    if (typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        setMessage("No menu aberto, selecione “Adicionar à Tela de Início” para concluir a instalação.");
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setMessage("Não foi possível abrir o menu de compartilhamento neste navegador.");
        }
      }
      return;
    }

    setMessage("Abra este site no Safari para usar a opção de adicionar à tela inicial.");
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
          <p className="text-xs text-muted-foreground">Adicione o app à tela inicial do seu celular.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 px-3 pb-3 sm:px-4 sm:pb-4">
        <Button size="sm" onClick={installAndroid} disabled={isIos} variant={isIos ? "outline" : "default"}>
          <Download className="mr-1.5 h-4 w-4" /> Android
        </Button>
        <Button size="sm" onClick={installIphone} disabled={!isIos} variant={!isIos ? "outline" : "default"}>
          <Share className="mr-1.5 h-4 w-4" /> iPhone
        </Button>
      </div>
      {message && <p role="status" className="border-t border-border px-4 py-2 text-xs text-muted-foreground">{message}</p>}
      {!isIos && !promptEvent && <p className="px-4 pb-3 text-xs text-muted-foreground">A instalação direta depende de o navegador oferecer o recurso de instalação.</p>}
      {isIos && <p className="px-4 pb-3 text-xs text-muted-foreground">No iPhone, o iOS exige confirmar “Adicionar à Tela de Início” no menu que será aberto.</p>}
    </Card>
  );
}
