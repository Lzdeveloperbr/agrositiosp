import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { gerarInsightAgro } from "@/lib/ai.functions";

export function AIInsightsCard({ context }: { context: string }) {
  const fn = useServerFn(gerarInsightAgro);
  const [loading, setLoading] = useState(false);
  const [texto, setTexto] = useState<string>("");

  async function rodar() {
    setLoading(true);
    try {
      const r = await fn({ data: { context } });
      setTexto(r.texto);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao gerar análise");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-5 relative overflow-hidden border-accent/30" style={{ background: "var(--gradient-surface)" }}>
      <div className="absolute -right-8 -top-8 opacity-10">
        <Sparkles className="h-32 w-32 text-accent" />
      </div>
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-accent)" }}>
              <Sparkles className="h-4 w-4 text-accent-foreground" />
            </div>
            <div>
              <h3 className="font-display font-semibold">Análise inteligente</h3>
              <p className="text-xs text-muted-foreground">IA agrícola sobre seus dados</p>
            </div>
          </div>
          <Button size="sm" onClick={rodar} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : texto ? "Atualizar" : "Analisar"}
          </Button>
        </div>
        {texto ? (
          <div className="text-sm whitespace-pre-wrap leading-relaxed prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: renderMd(texto) }} />
        ) : (
          <p className="text-sm text-muted-foreground">Clique em <strong>Analisar</strong> para receber diagnóstico, ações da semana e oportunidades de lucro com base na sua granja, gado e finanças.</p>
        )}
      </div>
    </Card>
  );
}

function renderMd(s: string): string {
  // micro-markdown seguro: bold, listas, quebras
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]+?<\/li>)/g, "<ul class='list-disc pl-5 my-1.5 space-y-0.5'>$1</ul>")
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}
