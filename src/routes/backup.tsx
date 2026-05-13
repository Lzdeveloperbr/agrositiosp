import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFazenda } from "@/lib/cloud/fazenda";
import { Database, Download, Cloud, Users, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/backup")({
  head: () => ({
    meta: [
      { title: "Backup e Restauração — AgroSítio" },
      { name: "description", content: "Exporte e restaure todos os dados da fazenda em um único arquivo seguro." },
      { property: "og:title", content: "Backup e Restauração — AgroSítio" },
      { property: "og:description", content: "Exporte e restaure todos os dados da fazenda em um único arquivo seguro." },
    ],
  }),
  component: BackupPage,
});

function BackupPage() {
  const { client, fazendaId, fazendaNome, codigo } = useFazenda();

  const exportar = async () => {
    if (!fazendaId) return;
    const tabelas = ["lotes","medidores","animais","pastos","diario","tarefas","estoque","financeiro"];
    const dump: Record<string, any> = { _exportadoEm: new Date().toISOString(), fazenda: { id: fazendaId, nome: fazendaNome, codigo } };
    for (const t of tabelas) {
      const { data } = await client.from(t).select("*");
      dump[t] = data || [];
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agrositio-${codigo}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup baixado");
  };

  const copiarCodigo = () => {
    if (!codigo) return;
    navigator.clipboard.writeText(codigo);
    toast.success("Código copiado");
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-2xl">
        <header>
          <h1 className="text-3xl md:text-4xl font-display font-bold flex items-center gap-2"><Database className="h-8 w-8 text-primary" /> Backup & Compartilhar</h1>
          <p className="text-muted-foreground mt-1">Seus dados ficam na nuvem e sincronizam entre todos.</p>
        </header>

        <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
          <h2 className="font-display font-semibold text-lg mb-2 flex items-center gap-2"><Cloud className="h-5 w-5 text-primary" /> Sincronização</h2>
          <p className="text-sm text-muted-foreground">Tudo que você, seu pai ou seu irmão registrar aparece em tempo real para os outros. Não precisa exportar nem importar nada entre celulares.</p>
        </Card>

        <Card className="p-5">
          <h2 className="font-display font-semibold text-lg mb-3 flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Convidar família</h2>
          <p className="text-sm text-muted-foreground mb-3">Compartilhe este código. Quem tiver o código vê e edita os mesmos dados:</p>
          <div className="flex items-center gap-2 bg-muted/40 rounded-lg p-3">
            <span className="font-mono text-2xl font-bold tracking-wider flex-1">{codigo}</span>
            <Button size="sm" variant="outline" onClick={copiarCodigo}><Copy className="h-4 w-4 mr-1" /> Copiar</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Eles abrem o app, escolhem "Entrar", digitam o nome e o código.</p>
        </Card>

        <Card className="p-5">
          <h2 className="font-display font-semibold text-lg mb-2">Exportar tudo</h2>
          <p className="text-sm text-muted-foreground mb-4">Baixa um arquivo .json com todos os dados desta fazenda — útil para guardar uma cópia.</p>
          <Button onClick={exportar}><Download className="h-4 w-4 mr-1" /> Baixar backup</Button>
        </Card>
      </div>
    </AppShell>
  );
}
