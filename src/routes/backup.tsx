import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { STORAGE_KEYS } from "@/lib/state";
import { Database, Download, Upload, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/backup")({
  head: () => ({ meta: [{ title: "Backup — AgroSítio" }] }),
  component: BackupPage,
});

function BackupPage() {
  const fileRef = useRef<HTMLInputElement>(null);

  const exportar = () => {
    const data: Record<string, any> = { _versao: 1, _exportadoEm: new Date().toISOString() };
    for (const k of STORAGE_KEYS) {
      const raw = localStorage.getItem(k);
      data[k] = raw ? JSON.parse(raw) : null;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agrositio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup exportado");
  };

  const importar = async (file: File) => {
    if (!confirm("Isso vai SUBSTITUIR todos os dados atuais. Continuar?")) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      for (const k of STORAGE_KEYS) {
        if (data[k] !== undefined && data[k] !== null) {
          localStorage.setItem(k, JSON.stringify(data[k]));
        }
      }
      toast.success("Backup restaurado. Recarregando...");
      setTimeout(() => location.reload(), 1000);
    } catch {
      toast.error("Arquivo inválido");
    }
  };

  const limpar = () => {
    if (!confirm("Apagar TODOS os dados? Esta ação não pode ser desfeita.")) return;
    if (!confirm("Tem certeza ABSOLUTA?")) return;
    for (const k of STORAGE_KEYS) localStorage.removeItem(k);
    toast.success("Dados apagados");
    setTimeout(() => location.reload(), 800);
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-2xl">
        <header>
          <h1 className="text-3xl md:text-4xl font-display font-bold flex items-center gap-2"><Database className="h-8 w-8 text-primary" /> Backup</h1>
          <p className="text-muted-foreground mt-1">Salve e restaure todos os dados do sítio em um arquivo.</p>
        </header>

        <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
          <h2 className="font-display font-semibold text-lg mb-2">Exportar</h2>
          <p className="text-sm text-muted-foreground mb-4">Baixa um arquivo .json com lotes, gado, diário, tarefas, estoque, financeiro e leituras.</p>
          <Button onClick={exportar}><Download className="h-4 w-4 mr-1" /> Baixar backup</Button>
        </Card>

        <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
          <h2 className="font-display font-semibold text-lg mb-2">Restaurar</h2>
          <p className="text-sm text-muted-foreground mb-4">Importa um arquivo de backup previamente salvo. Substitui todos os dados.</p>
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 mr-1" /> Escolher arquivo</Button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importar(e.target.files[0])} />
        </Card>

        <Card className="p-5 border-destructive/40">
          <h2 className="font-display font-semibold text-lg mb-2 flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /> Zona de perigo</h2>
          <p className="text-sm text-muted-foreground mb-4">Apaga permanentemente todos os dados deste dispositivo.</p>
          <Button variant="destructive" onClick={limpar}>Apagar tudo</Button>
        </Card>
      </div>
    </AppShell>
  );
}
