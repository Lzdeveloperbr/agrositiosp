import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useDiario } from "@/lib/state";
import { uid } from "@/lib/storage";
import type { DiarioEntry, DiarioFoto } from "@/lib/types";
import { BookOpen, Plus, Camera, Trash2, MapPin, FileText, X, CloudSun, Loader2, Images } from "lucide-react";
import { toast } from "sonner";
import { gerarRelatorioDiario } from "@/lib/pdf";
import { compressFile, uploadFotoBlob } from "@/lib/cloud/uploadFoto";
import { useFazenda } from "@/lib/cloud/fazenda";
import { fmtData, hojeISO } from "@/lib/data";

export const Route = createFileRoute("/diario")({
  head: () => ({
    meta: [
      { title: "Diário de Campo — Aviário Pro" },
      { name: "description", content: "Registros diários da fazenda com fotos, clima e GPS para histórico completo." },
      { property: "og:title", content: "Diário de Campo — Aviário Pro" },
      { property: "og:description", content: "Registros diários da fazenda com fotos, clima e GPS para histórico completo." },
    ],
  }),
  component: DiarioPage,
});

const CATS = ["granja", "gado", "cerca", "maquina", "geral"] as const;

// upload de fotos agora vai para o Storage da nuvem (ver lib/cloud/uploadFoto.ts)


function DiarioPage() {
  const [entries, setEntries] = useDiario();
  const { fazendaId, codigo } = useFazenda();
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const [filtro, setFiltro] = useState<string>("todas");
  const [busca, setBusca] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<{ data: string; titulo: string; categoria: any; texto: string; condicao: string; temperatura?: number; chuvaMm?: number; gps?: { lat: number; lon: number }; fotos: DiarioFoto[] }>({
    data: hojeISO(),
    titulo: "",
    categoria: "geral",
    texto: "",
    condicao: "",
    temperatura: undefined,
    chuvaMm: undefined,
    gps: undefined,
    fotos: [],
  });

  const reset = () => setForm({ data: hojeISO(), titulo: "", categoria: "geral", texto: "", condicao: "", temperatura: undefined, chuvaMm: undefined, gps: undefined, fotos: [] });

  const addFotos = async (files: FileList | null) => {
    if (!files || !fazendaId || !codigo) return;
    setUploading(true);
    const novas: DiarioFoto[] = [];
    for (const f of Array.from(files)) {
      try {
        const blob = await compressFile(f);
        const url = await uploadFotoBlob(blob, fazendaId, codigo);
        novas.push({ id: uid(), dataUrl: url });
      } catch (e) { console.error(e); toast.error("Falha ao enviar foto"); }
    }
    setUploading(false);
    setForm((p) => ({ ...p, fotos: [...p.fotos, ...novas] }));
  };

  const removerFoto = (id: string) => setForm((p) => ({ ...p, fotos: p.fotos.filter((f) => f.id !== id) }));

  const captarGPS = () => {
    if (!navigator.geolocation) { toast.error("GPS não disponível"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setForm((p) => ({ ...p, gps: { lat: pos.coords.latitude, lon: pos.coords.longitude } })); toast.success("Localização capturada"); },
      () => toast.error("Não foi possível obter localização"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const salvar = () => {
    if (!form.titulo) { toast.error("Informe um título"); return; }
    const novo: DiarioEntry = {
      id: uid(),
      data: form.data,
      titulo: form.titulo,
      categoria: form.categoria,
      texto: form.texto,
      clima: (form.condicao || form.temperatura !== undefined || form.chuvaMm !== undefined) ? { condicao: form.condicao, temperatura: form.temperatura, chuvaMm: form.chuvaMm } : undefined,
      gps: form.gps,
      fotos: form.fotos,
    };
    setEntries((p) => [novo, ...p]);
    setOpen(false);
    reset();
    toast.success("Registro salvo");
  };

  const remover = (id: string) => {
    if (!confirm("Apagar registro?")) return;
    setEntries((p) => p.filter((e) => e.id !== id));
  };

  const filtrados = useMemo(() => entries.filter((e) => {
    if (filtro !== "todas" && e.categoria !== filtro) return false;
    if (busca && !`${e.titulo} ${e.texto}`.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  }).sort((a, b) => b.data.localeCompare(a.data)), [entries, filtro, busca]);

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold flex items-center gap-2"><BookOpen className="h-8 w-8 text-primary" /> Diário de campo</h1>
            <p className="text-muted-foreground mt-1">Anote tudo que acontece — com fotos, clima e localização.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => gerarRelatorioDiario(entries)} disabled={entries.length === 0}><FileText className="h-4 w-4 mr-1" /> PDF</Button>
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Novo registro</Button></DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Novo registro</DialogTitle></DialogHeader>
                <div className="grid md:grid-cols-2 gap-3">
                  <Field label="Data"><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></Field>
                  <Field label="Categoria">
                    <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <div className="md:col-span-2"><Field label="Título *"><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Manejo dos bezerros" /></Field></div>
                  <div className="md:col-span-2"><Field label="Descrição"><Textarea rows={4} value={form.texto} onChange={(e) => setForm({ ...form, texto: e.target.value })} placeholder="O que aconteceu hoje..." /></Field></div>

                  <Field label="Tempo"><Input value={form.condicao} onChange={(e) => setForm({ ...form, condicao: e.target.value })} placeholder="Sol, nublado, chuva..." /></Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Temp. (°C)"><Input type="number" value={form.temperatura ?? ""} onChange={(e) => setForm({ ...form, temperatura: e.target.value ? +e.target.value : undefined })} /></Field>
                    <Field label="Chuva (mm)"><Input type="number" value={form.chuvaMm ?? ""} onChange={(e) => setForm({ ...form, chuvaMm: e.target.value ? +e.target.value : undefined })} /></Field>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => galeriaRef.current?.click()} disabled={uploading}>{uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Images className="h-4 w-4 mr-1" />} {uploading ? "Enviando..." : "Escolher da galeria"}</Button>
                  <input ref={galeriaRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFotos(e.target.files); e.currentTarget.value = ""; }} />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}><Camera className="h-4 w-4 mr-1" /> Tirar foto</Button>
                  <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" hidden onChange={(e) => { addFotos(e.target.files); e.currentTarget.value = ""; }} />
                  <Button type="button" variant="outline" size="sm" onClick={captarGPS}><MapPin className="h-4 w-4 mr-1" /> {form.gps ? "GPS ✓" : "Capturar GPS"}</Button>
                  {form.gps && <span className="text-xs text-muted-foreground self-center">{form.gps.lat.toFixed(4)}, {form.gps.lon.toFixed(4)}</span>}
                </div>

                {form.fotos.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                    {form.fotos.map((f) => (
                      <div key={f.id} className="relative aspect-square rounded-md overflow-hidden border border-border">
                        <img src={f.dataUrl} alt="" className="w-full h-full object-cover" />
                        <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6" onClick={() => removerFoto(f.id)}><X className="h-3 w-3" /></Button>
                      </div>
                    ))}
                  </div>
                )}

                <DialogFooter><Button onClick={salvar}>Salvar registro</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="flex flex-wrap gap-2">
          <Input className="flex-1 min-w-[200px]" placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          <Select value={filtro} onValueChange={setFiltro}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas categorias</SelectItem>
              {CATS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {filtrados.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">Sem registros</p>
            <p className="text-sm text-muted-foreground mb-4">Comece anotando o que aconteceu hoje no sítio.</p>
            <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Primeiro registro</Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtrados.map((e) => (
              <Card key={e.id} className="p-5" style={{ background: "var(--gradient-surface)" }}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="capitalize">{e.categoria}</Badge>
                      <span className="text-xs text-muted-foreground">{fmtData(e.data, { weekday: "short", day: "2-digit", month: "short" })}</span>
                    </div>
                    <h3 className="font-display font-bold text-lg mt-1">{e.titulo}</h3>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remover(e.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>

                {e.texto && <p className="text-sm whitespace-pre-wrap mb-3">{e.texto}</p>}

                {(e.clima || e.gps) && (
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-3">
                    {e.clima?.condicao && <span className="flex items-center gap-1"><CloudSun className="h-3 w-3" /> {e.clima.condicao}</span>}
                    {e.clima?.temperatura !== undefined && <span>{e.clima.temperatura}°C</span>}
                    {e.clima?.chuvaMm !== undefined && <span>{e.clima.chuvaMm}mm</span>}
                    {e.gps && <a className="flex items-center gap-1 underline" href={`https://www.google.com/maps?q=${e.gps.lat},${e.gps.lon}`} target="_blank" rel="noopener"><MapPin className="h-3 w-3" /> {e.gps.lat.toFixed(4)}, {e.gps.lon.toFixed(4)}</a>}
                  </div>
                )}

                {e.fotos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {e.fotos.map((f) => (
                      <a key={f.id} href={f.dataUrl} target="_blank" rel="noopener" className="aspect-square rounded-md overflow-hidden border border-border">
                        <img src={f.dataUrl} alt="" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
