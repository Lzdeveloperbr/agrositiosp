import { useState } from "react";
import { useFazenda } from "@/lib/cloud/fazenda";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sprout, Users } from "lucide-react";
import { toast } from "sonner";

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
    <div className="min-h-screen flex items-center justify-center p-4 surface grain relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[520px] rounded-full blur-3xl" style={{ background: "radial-gradient(closest-side, oklch(0.86 0.20 125 / 0.22), transparent 70%)" }} />
      <Card className="w-full max-w-md p-7 space-y-6 card-elevated relative">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
            <Sprout className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold leading-tight tracking-tight">
              Agro<span className="text-gradient">Sítio</span>
            </h1>
            <p className="text-xs text-muted-foreground">Gestão profissional · sincronizada com sua família</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted/40 border border-border">
          <Button
            variant={modo === "entrar" ? "default" : "ghost"}
            onClick={() => setModo("entrar")}
            className="h-9 rounded-lg"
          >
            Entrar
          </Button>
          <Button
            variant={modo === "criar" ? "default" : "ghost"}
            onClick={() => setModo("criar")}
            className="h-9 rounded-lg"
          >
            Criar fazenda
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground"><Users className="h-3.5 w-3.5" /> Seu nome</Label>
            <Input value={operador} onChange={(e) => setOp(e.target.value)} placeholder="Ex: João" className="h-11" />
          </div>

          {modo === "criar" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Nome da fazenda</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Sítio Boa Vista" className="h-11" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Código da fazenda</Label>
            <Input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="EX: SITIO2026" className="uppercase tracking-[0.2em] font-mono h-11 text-center text-base" />
            <p className="text-[11px] text-muted-foreground/80 pt-0.5">
              {modo === "entrar"
                ? "Use o mesmo código combinado com sua família."
                : "Crie um código fácil de lembrar e compartilhe."}
            </p>
          </div>
        </div>

        <Button className="w-full h-12 text-base font-semibold shadow-lg" size="lg" onClick={submit} disabled={loading} style={{ boxShadow: "var(--shadow-glow)" }}>
          {loading ? "..." : modo === "entrar" ? "Entrar na fazenda →" : "Criar fazenda →"}
        </Button>

        <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground/60">
          Agropecuária · Granja · Gado · Lavoura
        </p>
      </Card>
    </div>
  );
}
