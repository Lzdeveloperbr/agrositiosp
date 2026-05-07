import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useMonitoramentos } from "@/lib/state";
import { uid } from "@/lib/storage";
import { Bug, Plus, Trash2, MapPin, Camera } from "lucide-react";
import { toast } from "sonner";
import { uploadFotoToCloud } from "@/lib/cloud/uploadFoto";
import { useFazenda } from "@/lib/cloud/fazenda";

export const Route = createFileRoute("/monitoramento")({
  head: () => ({ meta: [{ title: "Monitoramento — AgroSítio" }] }),
  component: MonitPage,
});

function MonitPage() {
  const [items, setItems] = useMonitoramentos();
  const { codigo } = useFazenda();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ data: new Date().toISOString().slice(0, 10), modulo: "gado", alvo: "", severidade: "media", acao: "", produto: "", dose: "", local: "", observacoes: "" });
  const [fotos, setFotos] = useState<{ id: string; dataUrl: string }[]>([]);
  const [gps, setGps] = useState<{ lat: number; lon: number } | null>(null);

  const pegarGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) => setGps({ lat: p.coords.latitude, lon: p.coords.longitude }), () => toast.error("GPS indisponível"));
  };

  const onFotos = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files).slice(0, 4)) {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement("canvas");
          const max = 1200;
          const ratio = Math.min(max / img.width, max / img.height, 1);
          c.width = img.width * ratio; c.height = img.height * ratio;
          c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
          setFotos((p) => [...p, { id: uid(), dataUrl: c.toDataURL("image/jpeg", 0.7) }]);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(f);
    }
  };

  const salvar = async () => {
    if (!form.alvo) { toast.error("Informe o alvo (praga/doença)"); return; }
    const fotosUp: { id: string; dataUrl: string }[] = [];
    for (const f of fotos) {
      try {
        const url = codigo ? await uploadFotoToCloud(f.dataUrl, codigo) : f.dataUrl;
        fotosUp.push({ id: f.id, dataUrl: url });
      } catch { fotosUp.push(f); }
    }
    setItems((p) => [{ id: uid(), ...form, gps: gps ?? undefined, fotos: fotosUp }, ...p]);
    setOpen(false); setForm({ ...form, alvo: "", produto: "", dose: "", acao: "", observacoes: "" }); setFotos([]); setGps(null);
    toast.success("Registro salvo");
  };

  const sevColor = { baixa: "secondary", media: "default", alta: "destructive" } as const;

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold flex items-center gap-2"><Bug className="h-8 w-8 text-primary" /> Monitoramento (MIP)</h1>
            <p className="text-muted-foreground mt-1">Pragas, doenças e sintomas com fotos e GPS.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Novo registro</Button></DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Novo monitoramento</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <F label="Data"><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></F>
                <F label="Módulo">
                  <Select value={form.modulo} onValueChange={(v) => setForm({ ...form, modulo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="gado">Gado</SelectItem><SelectItem value="granja">Granja</SelectItem><SelectItem value="pasto">Pasto</SelectItem><SelectItem value="geral">Geral</SelectItem></SelectContent>
                  </Select>
                </F>
                <div className="col-span-2"><F label="Alvo (praga/doença) *"><Input value={form.alvo} onChange={(e) => setForm({ ...form, alvo: e.target.value })} placeholder="Ex: Carrapato, mosca-do-chifre, coccidiose..." /></F></div>
                <F label="Severidade">
                  <Select value={form.severidade} onValueChange={(v) => setForm({ ...form, severidade: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="baixa">Baixa</SelectItem><SelectItem value="media">Média</SelectItem><SelectItem value="alta">Alta</SelectItem></SelectContent>
                  </Select>
                </F>
                <F label="Local"><Input value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} placeholder="Pasto, galpão..." /></F>
                <div className="col-span-2"><F label="Ação tomada"><Input value={form.acao} onChange={(e) => setForm({ ...form, acao: e.target.value })} placeholder="Aplicação de carrapaticida..." /></F></div>
                <F label="Produto"><Input value={form.produto} onChange={(e) => setForm({ ...form, produto: e.target.value })} /></F>
                <F label="Dose"><Input value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} /></F>
                <div className="col-span-2"><F label="Observações"><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></F></div>
                <div className="col-span-2 flex gap-2 flex-wrap">
                  <Button type="button" size="sm" variant="outline" onClick={pegarGPS}><MapPin className="h-3.5 w-3.5 mr-1" /> {gps ? `${gps.lat.toFixed(4)}, ${gps.lon.toFixed(4)}` : "Capturar GPS"}</Button>
                  <label className="inline-flex">
                    <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={(e) => onFotos(e.target.files)} />
                    <Button type="button" size="sm" variant="outline" asChild><span><Camera className="h-3.5 w-3.5 mr-1" /> Fotos ({fotos.length})</span></Button>
                  </label>
                </div>
                {fotos.length > 0 && <div className="col-span-2 grid grid-cols-4 gap-2">{fotos.map((f) => <img key={f.id} src={f.dataUrl} className="aspect-square object-cover rounded" />)}</div>}
              </div>
              <DialogFooter><Button onClick={salvar}>Salvar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        {items.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <Bug className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p>Nenhum registro de monitoramento.</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {items.map((m) => (
              <Card key={m.id} className="p-4" style={{ background: "var(--gradient-surface)" }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-display font-bold">{m.alvo}</h3>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px] capitalize">{m.modulo}</Badge>
                      <Badge variant={sevColor[m.severidade]} className="text-[10px]">{m.severidade}</Badge>
                      <span className="text-[11px] text-muted-foreground">{new Date(m.data).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setItems((p) => p.filter((x) => x.id !== m.id))}><Trash2 className="h-4 w-4" /></Button>
                </div>
                {m.acao && <p className="text-sm"><strong>Ação:</strong> {m.acao}</p>}
                {(m.produto || m.dose) && <p className="text-xs text-muted-foreground">{m.produto} {m.dose && `· ${m.dose}`}</p>}
                {m.local && <p className="text-xs text-muted-foreground"><MapPin className="inline h-3 w-3 mr-1" />{m.local}</p>}
                {m.observacoes && <p className="text-sm text-muted-foreground mt-2">{m.observacoes}</p>}
                {m.fotos.length > 0 && <div className="grid grid-cols-4 gap-1 mt-3">{m.fotos.map((f) => <img key={f.id} src={f.dataUrl} className="aspect-square object-cover rounded" />)}</div>}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
