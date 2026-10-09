import { useState } from "react";
import { useFazenda } from "@/lib/cloud/fazenda";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users } from "lucide-react";
import { toast } from "sonner";
import logoUrl from "@/assets/logo-aviario-pro.png";

export function EntrarFazenda() {
  const { entrar, criar, setOperador } = useFazenda();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [operador, setOp] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!operador.trim()) { toast.error("Diga seu nome"); return; }
    if (!codigo.trim()) { toast.error("Informe o código da granja"); return; }
    setLoading(true);
    setOperador(operador.trim());
    const r = modo === "entrar"
      ? await entrar(codigo)
      : await criar(nome || "Minha Granja", codigo);
    setLoading(false);
    if (!r.ok) { toast.error(r.erro || "Erro"); return; }
    toast.success(modo === "entrar" ? `Bem-vindo a ${(r as any).nome ?? "granja"}` : "Granja criada");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md p-6 sm:p-8 space-y-6 border-border">
        <div className="flex flex-col items-center text-center gap-2">
          <img src={logoUrl} alt="Aviário Pro" width={160} height={160} className="h-36 w-36 object-contain" />
          <h1 className="font-display text-4xl">AVIÁRIO <span className="text-primary">PRO</span></h1>
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground font-semibold">
            Gestão profissional de frango de corte
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-secondary/60 border border-border">
          <Button
            variant={modo === "entrar" ? "default" : "ghost"}
            onClick={() => setModo("entrar")}
            className="h-10 rounded-md"
          >
            Entrar
          </Button>
          <Button
            variant={modo === "criar" ? "default" : "ghost"}
            onClick={() => setModo("criar")}
            className="h-10 rounded-md"
          >
            Criar granja
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground"><Users className="h-3.5 w-3.5" /> Seu nome</Label>
            <Input value={operador} onChange={(e) => setOp(e.target.value)} placeholder="Ex: João" className="h-12" />
          </div>

          {modo === "criar" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Nome da granja</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Granja Boa Vista" className="h-12" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Código da granja</Label>
            <Input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="EX: GRANJA2026" className="uppercase tracking-[0.16em] font-mono h-12 text-center text-base" />
            <p className="text-[11px] text-muted-foreground/80 pt-0.5">
              {modo === "entrar"
                ? "Use o mesmo código combinado com sua família."
                : "Crie um código fácil de lembrar e compartilhe."}
            </p>
          </div>
        </div>

        <Button className="w-full h-12 text-base font-bold" size="lg" onClick={submit} disabled={loading}>
          {loading ? "..." : modo === "entrar" ? "Entrar na granja →" : "Criar granja →"}
        </Button>

        <p className="text-center text-[10px] uppercase tracking-[0.28em] text-muted-foreground/60">
          Manejo · Nutrição · Sanidade · Resultados
        </p>
      </Card>
    </div>
  );
}
