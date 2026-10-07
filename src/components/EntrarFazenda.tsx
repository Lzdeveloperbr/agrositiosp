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
    if (!codigo.trim()) { toast.error("Informe o código da fazenda"); return; }
    setLoading(true);
    setOperador(operador.trim());
    const r = modo === "entrar"
      ? await entrar(codigo)
      : await criar(nome || "Minha Fazenda", codigo);
    setLoading(false);
    if (!r.ok) { toast.error(r.erro || "Erro"); return; }
    toast.success(modo === "entrar" ? `Bem-vindo a ${(r as any).nome ?? "fazenda"}` : "Fazenda criada");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background grain relative overflow-hidden">
      <Card className="w-full max-w-md p-6 sm:p-8 space-y-6 card-elevated relative border-primary/15">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="relative">
            <img src={logoUrl} alt="Aviário Pro" width={120} height={120} className="h-28 w-28 object-contain relative" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-extrabold leading-tight">
              Agro<span className="text-gradient">Sítio</span>
            </h1>
            <div className="mt-1 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.28em] text-primary/90 font-semibold">
              <span className="h-px w-6 bg-primary/50" />
              Avicultura de Corte
              <span className="h-px w-6 bg-primary/50" />
            </div>
          </div>
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
            Criar fazenda
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground"><Users className="h-3.5 w-3.5" /> Seu nome</Label>
            <Input value={operador} onChange={(e) => setOp(e.target.value)} placeholder="Ex: João" className="h-12" />
          </div>

          {modo === "criar" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Nome da fazenda</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Sítio Boa Vista" className="h-12" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Código da fazenda</Label>
            <Input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="EX: SITIO2026" className="uppercase tracking-[0.16em] font-mono h-12 text-center text-base" />
            <p className="text-[11px] text-muted-foreground/80 pt-0.5">
              {modo === "entrar"
                ? "Use o mesmo código combinado com sua família."
                : "Crie um código fácil de lembrar e compartilhe."}
            </p>
          </div>
        </div>

        <Button className="w-full h-12 text-base font-bold" size="lg" onClick={submit} disabled={loading}>
          {loading ? "..." : modo === "entrar" ? "Entrar na fazenda →" : "Criar fazenda →"}
        </Button>

        <p className="text-center text-[10px] uppercase tracking-[0.28em] text-muted-foreground/60">
          Manejo · Nutrição · Sanidade · Resultados
        </p>
      </Card>
    </div>
  );
}
