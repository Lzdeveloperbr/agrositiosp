import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Smartphone, Download, Share2 } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isAppleMobile() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function InstallAppButton({ size = "sm" as const }) {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(true);
  const [ios, setIos] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setInstalled(isInstalled());
    setIos(isAppleMobile());

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferred(event as InstallPromptEvent);
      setInstalled(false);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setStatus("Aviário Pro instalado. Você já pode abrir pelo ícone na tela inicial.");
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const installAndroid = async () => {
    if (!deferred) {
      setStatus("Seu navegador ainda não disponibilizou a instalação direta. Abra este endereço no Chrome atualizado e tente novamente.");
      return;
    }
    await deferred.prompt();
    const result = await deferred.userChoice;
    if (result.outcome === "accepted") {
      setInstalled(true);
      setStatus("Instalação confirmada.");
    } else {
      setStatus("Instalação cancelada. Você pode tentar novamente quando quiser.");
    }
    setDeferred(null);
  };

  const installIphone = async () => {
    if (!navigator.share) {
      setStatus("Abra o Aviário Pro no Safari para acessar o menu nativo de compartilhamento.");
      return;
    }
    try {
      await navigator.share({
        title: "Aviário Pro",
        text: "Aviário Pro — aplicativo de gestão da granja",
        url: window.location.origin,
      });
      setStatus("No menu do iPhone, escolha “Adicionar à Tela de Início” e confirme.");
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        setStatus("Não foi possível abrir o menu de compartilhamento. Tente pelo Safari.");
      }
    }
  };

  const handleClick = () => {
    if (installed) return;
    if (ios) {
      void installIphone();
      return;
    }
    if (deferred) {
      void installAndroid();
      return;
    }
    setOpen(true);
  };

  if (installed) return null;

  return (
    <>
      <Button onClick={handleClick} variant="outline" size={size} className="gap-1.5 w-full sm:w-auto">
        <Smartphone className="h-4 w-4" />
        {ios ? "Adicionar no iPhone" : "Instalar aplicativo"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> Instalar Aviário Pro</DialogTitle>
            <DialogDescription>Instale com o ícone oficial e abra em uma janela própria, como um aplicativo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="font-semibold flex items-center gap-2"><Smartphone className="h-4 w-4" /> Android</p>
              <p className="text-xs text-muted-foreground">Use o Google Chrome atualizado. Toque no botão abaixo para abrir a confirmação nativa de instalação.</p>
              <Button className="w-full" onClick={() => { setOpen(false); void installAndroid(); }} disabled={!deferred}>
                <Download className="mr-2 h-4 w-4" /> Instalar no Android
              </Button>
              {!deferred && <p className="text-xs text-muted-foreground">A instalação direta ainda não foi liberada por este navegador. Se estiver em um navegador interno de outro aplicativo, abra no Chrome.</p>}
            </div>
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="font-semibold flex items-center gap-2"><Share2 className="h-4 w-4" /> iPhone / iPad</p>
              <p className="text-xs text-muted-foreground">O iOS não permite instalação silenciosa por sites. O botão abre o menu nativo; confirme “Adicionar à Tela de Início”.</p>
              <Button variant="outline" className="w-full" onClick={() => { setOpen(false); void installIphone(); }}>
                <Share2 className="mr-2 h-4 w-4" /> Abrir menu do iPhone
              </Button>
            </div>
            {status && <p role="status" className="text-xs text-muted-foreground">{status}</p>}
          </div>
        </DialogContent>
      </Dialog>
      {status && <p role="status" className="sr-only">{status}</p>}
    </>
  );
}
