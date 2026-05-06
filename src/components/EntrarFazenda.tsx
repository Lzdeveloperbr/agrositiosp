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
    toast.success(modo === "entrar" ? `Bem-vindo a ${r.nome}` : "Fazenda criada");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--gradient-surface)" }}>
      <Card className="w-full max-w-md p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
            <Sprout className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold leading-tight">AgroSítio</h1>
            <p className="text-xs text-muted-foreground">Sincronizado entre toda a família</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant={modo === "entrar" ? "default" : "outline"} onClick={() => setModo("entrar")}>Entrar</Button>
          <Button variant={modo === "criar" ? "default" : "outline"} onClick={() => setModo("criar")}>Criar fazenda</Button>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs flex items-center gap-1"><Users className="h-3 w-3" /> Seu nome</Label>
            <Input value={operador} onChange={(e) => setOp(e.target.value)} placeholder="Ex: João" />
          </div>

          {modo === "criar" && (
            <div>
              <Label className="text-xs">Nome da fazenda</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Sítio Boa Vista" />
            </div>
          )}

          <div>
            <Label className="text-xs">Código da fazenda</Label>
            <Input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="Ex: SITIO2026" className="uppercase tracking-wider" />
            <p className="text-xs text-muted-foreground mt-1">
              {modo === "entrar"
                ? "Use o mesmo código combinado com sua família"
                : "Crie um código fácil de lembrar e compartilhe"}
            </p>
          </div>
        </div>

        <Button className="w-full" size="lg" onClick={submit} disabled={loading}>
          {loading ? "..." : modo === "entrar" ? "Entrar na fazenda" : "Criar fazenda"}
        </Button>
      </Card>
    </div>
  );
}
