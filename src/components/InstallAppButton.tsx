import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Smartphone, Download, Share2, MoreVertical, PlusSquare, CheckCircle2 } from "lucide-react";

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
      setOpen(false);
      setStatus("Aviário Pro instalado. Abra pelo ícone na tela inicial.");
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
      setStatus("O Chrome não liberou a janela automática nesta visita. Use o menu ⋮ do Chrome e escolha “Instalar app” ou “Adicionar à tela inicial”.");
      return;
    }
    try {
      await deferred.prompt();
      const result = await deferred.userChoice;
      setStatus(result.outcome === "accepted"
        ? "Instalação confirmada. Procure o ícone Aviário Pro na tela inicial."
        : "Instalação cancelada. Você pode tentar novamente pelo menu do Chrome.");
    } catch {
      setStatus("Não foi possível abrir a instalação automática. Use o menu ⋮ do Chrome e escolha “Instalar app” ou “Adicionar à tela inicial”.");
    } finally {
      setDeferred(null);
    }
  };

  const installApple = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Aviário Pro",
          text: "Aviário Pro — aplicativo de gestão da granja",
          url: window.location.href,
        });
      }
      setStatus("No menu aberto, toque em “Adicionar à Tela de Início” e depois em “Adicionar”. Se essa opção não aparecer, abra o endereço no Safari.");
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        setStatus("Abra o menu Compartilhar do navegador e escolha “Adicionar à Tela de Início”. No iPhone, o Safari costuma oferecer essa opção.");
      }
    }
  };

  const handleClick = () => {
    if (installed) return;
    setStatus("");
    if (ios) {
      setOpen(true);
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
        <DialogContent className="w-[calc(100vw-1.25rem)] max-w-md max-h-[85dvh] overflow-y-auto rounded-2xl p-5 sm:p-6">
          <DialogHeader className="pr-6">
            <DialogTitle className="flex items-center gap-2 text-lg">
              {ios ? <Share2 className="h-5 w-5" /> : <Download className="h-5 w-5" />}
              Instalar Aviário Pro
            </DialogTitle>
            <DialogDescription>
              {ios
                ? "Adicione o sistema à tela inicial do iPhone para abrir como aplicativo."
                : "Instale pelo Chrome para abrir o Aviário Pro em uma janela própria."}
            </DialogDescription>
          </DialogHeader>

          {ios ? (
            <div className="space-y-4 text-sm">
              <div className="rounded-xl border border-border p-4">
                <p className="mb-3 flex items-center gap-2 font-semibold"><Share2 className="h-4 w-4" /> No iPhone ou iPad</p>
                <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
                  <li>Toque em “Abrir compartilhamento” abaixo.</li>
                  <li>No menu, escolha “Adicionar à Tela de Início”.</li>
                  <li>Toque em “Adicionar” no canto superior.</li>
                </ol>
                <Button className="mt-4 w-full" onClick={() => void installApple()}>
                  <Share2 className="mr-2 h-4 w-4" /> Abrir compartilhamento
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Se a opção não aparecer no Chrome, copie o endereço e abra no Safari. O iPhone exige a confirmação manual; nenhum site consegue instalar sozinho.</p>
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="rounded-xl border border-border p-4">
                <p className="mb-3 flex items-center gap-2 font-semibold"><Smartphone className="h-4 w-4" /> Android — Google Chrome</p>
                {deferred ? (
                  <>
                    <p className="mb-3 text-muted-foreground">O Chrome liberou a instalação automática para este dispositivo.</p>
                    <Button className="w-full" onClick={() => void installAndroid()}>
                      <Download className="mr-2 h-4 w-4" /> Instalar agora
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="mb-3 text-muted-foreground">Mesmo quando o Chrome não mostra a janela automática, você pode adicionar o app pelo menu:</p>
                    <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
                      <li>Toque nos três pontinhos <MoreVertical className="mx-1 inline h-4 w-4" /> no alto do Chrome.</li>
                      <li>Escolha “Instalar app” ou “Adicionar à tela inicial”.</li>
                      <li>Confirme em “Instalar” ou “Adicionar”.</li>
                    </ol>
                    <Button variant="outline" className="mt-4 w-full" onClick={() => setStatus("Abra agora o menu ⋮ do Chrome. Se aparecer “Instalar app” ou “Adicionar à tela inicial”, toque nessa opção e confirme.")}>
                      <MoreVertical className="mr-2 h-4 w-4" /> Entendi, mostrar no Chrome
                    </Button>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Se nenhuma opção aparecer, atualize o Chrome, abra o endereço diretamente nele (não dentro de outro aplicativo) e tente novamente.</p>
            </div>
          )}

          {status && <p role="status" className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">{status}</p>}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Seus dados da granja continuam protegidos; a instalação não compartilha suas informações.
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
