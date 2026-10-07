import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Smartphone, Download, Share2 } from "lucide-react";

export function InstallAppButton({ size = "sm" as const }) {
  const [deferred, setDeferred] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setDeferred(e); };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    if (deferred) {
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferred(null);
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <Button onClick={handleClick} variant="outline" size={size} className="gap-1.5 w-full sm:w-auto">
        <Smartphone className="h-4 w-4" />
        Instalar como app
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> Instalar Aviário Pro</DialogTitle>
            <DialogDescription>Tenha o app na tela inicial, com ícone próprio e funcionando offline.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-semibold mb-1">📱 Android (Chrome)</p>
              <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                <li>Toque no menu <b>⋮</b> no canto do navegador.</li>
                <li>Escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</li>
                <li>Confirme. Pronto — vai virar um ícone como APK.</li>
              </ol>
            </div>
            <div>
              <p className="font-semibold mb-1 flex items-center gap-1.5"><Share2 className="h-4 w-4" /> iPhone (Safari)</p>
              <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                <li>Toque no botão <b>Compartilhar</b>.</li>
                <li>Escolha <b>Adicionar à Tela de Início</b>.</li>
                <li>Confirme com o nome Aviário Pro.</li>
              </ol>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              💡 O app fica instalado igual a um APK normal: abre em tela cheia, ícone próprio e funciona até com sinal fraco.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
