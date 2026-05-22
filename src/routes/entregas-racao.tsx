import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Truck, Package, Calendar as CalIcon, FileText, Plus, Upload, Sparkles, Building2, Download, Search, Eye, Trash2, AlertTriangle, BarChart3 } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend } from "recharts";
import { useFazenda } from "@/lib/cloud/fazenda";
import { compressFile, uploadFotoBlob } from "@/lib/cloud/uploadFoto";
import { ocrNotaRacao } from "@/lib/racao.functions";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SITIO } from "@/lib/pdf";
import { savePdf } from "@/lib/pdfHistory";

export const Route = createFileRoute("/entregas-racao")({
  head: () => ({
    meta: [
      { title: "Controle de Ração — AgroSítio" },
      { name: "description", content: "Sistema profissional de controle de entregas de ração para aviários: dashboard, granjas, motoristas, notas com OCR e relatórios em PDF." },
    ],
  }),
  component: EntregasRacaoPage,
});

// ===== Types =====
type Granja = {
  id: string; nome: string; proprietario?: string; cidade?: string; endereco?: string;
  qtd_aves?: number; qtd_galpoes?: number; observacoes?: string;
};
type Entrega = {
  id: string; data: string; viagem?: string; placa?: string; motorista?: string;
  tipo_racao?: string; galpao?: string; quantidade_kg: number; granja_id?: string;
  documento_url?: string; observacoes?: string;
};
type Documento = {
  id: string; nome: string; url: string; mime?: string; motorista?: string;
  viagem?: string; data?: string; granja_id?: string; entrega_id?: string; created_at?: string;
};

const TIPOS_RACAO = ["Pré-Inicial", "Inicial", "Crescimento", "Engorda", "Final / Abate", "Outro"];

function fmtKg(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 2)} t`;
  return `${n.toLocaleString("pt-BR")} kg`;
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function fileToDataUrl(f: File) {
  return new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(f);
  });
}

// ===== Page =====
function EntregasRacaoPage() {
  const { client, fazendaId, codigo } = useFazenda();
  const [granjas, setGranjas] = useState<Granja[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!fazendaId) { setLoading(false); return; }
    let cancel = false;
    Promise.all([
      client.from("granjas_racao").select("*").order("created_at", { ascending: false }),
      client.from("entregas_racao").select("*").order("data", { ascending: false }),
      client.from("documentos_racao").select("*").order("created_at", { ascending: false }),
    ]).then(([g, e, d]) => {
      if (cancel) return;
      setGranjas((g.data as any[]) || []);
      setEntregas((e.data as any[]) || []);
      setDocumentos((d.data as any[]) || []);
      setLoading(false);
    });
    return () => { cancel = true; };
  }, [client, fazendaId]);

  // ===== Stats =====
  const stats = useMemo(() => {
    const hoje = todayISO();
    const d7 = new Date(); d7.setDate(d7.getDate() - 7); const iso7 = d7.toISOString().slice(0,10);
    const d30 = new Date(); d30.setDate(d30.getDate() - 30); const iso30 = d30.toISOString().slice(0,10);
    const sum = (arr: Entrega[]) => arr.reduce((s, x) => s + (Number(x.quantidade_kg) || 0), 0);
    const hojeArr = entregas.filter(e => e.data === hoje);
    const semArr = entregas.filter(e => e.data >= iso7);
    const mesArr = entregas.filter(e => e.data >= iso30);
    return {
      hoje: sum(hojeArr), hojeQt: hojeArr.length,
      semana: sum(semArr), semanaQt: semArr.length,
      mes: sum(mesArr), mesQt: mesArr.length,
      total: sum(entregas), totalQt: entregas.length,
      media: mesArr.length ? sum(mesArr) / mesArr.length : 0,
    };
  }, [entregas]);

  // ===== Charts data =====
  const dataDiario = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      map.set(d.toISOString().slice(0,10), 0);
    }
    entregas.forEach(e => {
      if (map.has(e.data)) map.set(e.data, (map.get(e.data) || 0) + Number(e.quantidade_kg || 0));
    });
    return Array.from(map.entries()).map(([data, kg]) => ({
      data: data.slice(5).split("-").reverse().join("/"),
      kg,
    }));
  }, [entregas]);

  const dataPorGalpao = useMemo(() => {
    const map = new Map<string, number>();
    entregas.forEach(e => {
      const k = e.galpao || "—";
      map.set(k, (map.get(k) || 0) + Number(e.quantidade_kg || 0));
    });
    return Array.from(map.entries()).map(([galpao, kg]) => ({ galpao, kg }))
      .sort((a, b) => b.kg - a.kg).slice(0, 8);
  }, [entregas]);

  // ===== CRUD helpers =====
  async function addGranja(g: Omit<Granja, "id">) {
    if (!fazendaId) return;
    const { data, error } = await client.from("granjas_racao").insert({ ...g, fazenda_id: fazendaId }).select().single();
    if (error) { toast.error("Erro: " + error.message); return; }
    setGranjas(prev => [data as any, ...prev]);
    toast.success("Granja cadastrada");
  }
  async function delGranja(id: string) {
    if (!confirm("Excluir granja?")) return;
    const { error } = await client.from("granjas_racao").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setGranjas(prev => prev.filter(g => g.id !== id));
  }

  async function addEntrega(e: Omit<Entrega, "id">) {
    if (!fazendaId) return;
    const { data, error } = await client.from("entregas_racao").insert({ ...e, fazenda_id: fazendaId }).select().single();
    if (error) { toast.error("Erro: " + error.message); return; }
    setEntregas(prev => [data as any, ...prev]);
    toast.success("Entrega registrada");
  }
  async function delEntrega(id: string) {
    if (!confirm("Excluir entrega?")) return;
    const { error } = await client.from("entregas_racao").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setEntregas(prev => prev.filter(e => e.id !== id));
  }

  async function addDocumento(d: Omit<Documento, "id">) {
    if (!fazendaId) return;
    const { data, error } = await client.from("documentos_racao").insert({ ...d, fazenda_id: fazendaId }).select().single();
    if (error) { toast.error(error.message); return; }
    setDocumentos(prev => [data as any, ...prev]);
  }
  async function delDocumento(id: string) {
    if (!confirm("Excluir documento?")) return;
    const { error } = await client.from("documentos_racao").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setDocumentos(prev => prev.filter(d => d.id !== id));
  }

  // ===== Alertas =====
  const alertas = useMemo(() => {
    const arr: string[] = [];
    granjas.forEach(g => {
      const ent = entregas.filter(e => e.granja_id === g.id);
      const ultimos7 = ent.filter(e => {
        const d = new Date(e.data); const lim = new Date(); lim.setDate(lim.getDate() - 7);
        return d >= lim;
      });
      const totalSem = ultimos7.reduce((s, e) => s + Number(e.quantidade_kg || 0), 0);
      if (g.qtd_aves && g.qtd_aves > 0) {
        const consumoMedioAve = totalSem / g.qtd_aves;
        if (consumoMedioAve > 1.2) arr.push(`⚠️ ${g.nome}: consumo elevado (${consumoMedioAve.toFixed(2)} kg/ave em 7d)`);
      }
    });
    return arr;
  }, [granjas, entregas]);

  if (!fazendaId) {
    return <AppShell><Card className="p-6">Entre numa fazenda para usar o Controle de Ração.</Card></AppShell>;
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Truck className="h-7 w-7 text-primary" /> Controle de Ração
            </h1>
            <p className="text-sm text-muted-foreground">Entregas, motoristas, notas com OCR e relatórios profissionais.</p>
          </div>
          <Button onClick={() => exportarRelatorio(entregas, granjas)} variant="outline">
            <Download className="h-4 w-4 mr-2" /> Relatório PDF
          </Button>
        </div>

        {alertas.length > 0 && (
          <Card className="p-4 border-destructive/40 bg-destructive/5">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="space-y-1 text-sm">
                {alertas.map((a, i) => <div key={i}>{a}</div>)}
              </div>
            </div>
          </Card>
        )}

        <Tabs defaultValue="dashboard">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="dashboard"><BarChart3 className="h-4 w-4 mr-1 hidden sm:inline" />Dashboard</TabsTrigger>
            <TabsTrigger value="entregas"><Truck className="h-4 w-4 mr-1 hidden sm:inline" />Entregas</TabsTrigger>
            <TabsTrigger value="granjas"><Building2 className="h-4 w-4 mr-1 hidden sm:inline" />Granjas</TabsTrigger>
            <TabsTrigger value="docs"><FileText className="h-4 w-4 mr-1 hidden sm:inline" />Documentos</TabsTrigger>
          </TabsList>

          {/* ===== Dashboard ===== */}
          <TabsContent value="dashboard" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Hoje" value={fmtKg(stats.hoje)} hint={`${stats.hojeQt} viagens`} icon={CalIcon} tone="primary" />
              <StatCard label="Últimos 7 dias" value={fmtKg(stats.semana)} hint={`${stats.semanaQt} viagens`} icon={Truck} tone="accent" />
              <StatCard label="Últimos 30 dias" value={fmtKg(stats.mes)} hint={`${stats.mesQt} viagens`} icon={Package} tone="muted" />
              <StatCard label="Média / viagem" value={fmtKg(Math.round(stats.media))} hint="últimos 30d" icon={BarChart3} tone="primary" />
            </div>

            <Card className="p-4">
              <h3 className="font-semibold mb-3 text-sm">Consumo diário — últimos 14 dias</h3>
              <div className="h-64">
                <ResponsiveContainer>
                  <LineChart data={dataDiario}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="data" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip formatter={(v: any) => fmtKg(Number(v))} />
                    <Line type="monotone" dataKey="kg" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3 text-sm">Consumo por galpão</h3>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={dataPorGalpao}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="galpao" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip formatter={(v: any) => fmtKg(Number(v))} />
                    <Legend />
                    <Bar dataKey="kg" name="Total entregue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3 text-sm">Últimas entregas</h3>
              {loading ? <p className="text-sm text-muted-foreground">Carregando…</p> :
                entregas.length === 0 ? <p className="text-sm text-muted-foreground">Sem entregas ainda.</p> :
                <div className="space-y-2">
                  {entregas.slice(0, 8).map(e => {
                    const g = granjas.find(g => g.id === e.granja_id);
                    return (
                      <div key={e.id} className="flex items-center justify-between text-sm p-2 rounded border border-border/60">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{g?.nome || "—"} · {e.tipo_racao || "Ração"}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {new Date(e.data + "T00:00").toLocaleDateString("pt-BR")} · Viagem {e.viagem || "?"} · {e.motorista || "—"} · {e.placa || "—"}
                          </div>
                        </div>
                        <Badge variant="secondary" className="shrink-0">{fmtKg(Number(e.quantidade_kg))}</Badge>
                      </div>
                    );
                  })}
                </div>
              }
            </Card>
          </TabsContent>

          {/* ===== Entregas ===== */}
          <TabsContent value="entregas" className="space-y-3 mt-4">
            <EntregaForm granjas={granjas} onSave={addEntrega} onSaveDoc={addDocumento} />
            <Card className="p-3">
              <ListaEntregas entregas={entregas} granjas={granjas} onDelete={delEntrega} />
            </Card>
          </TabsContent>

          {/* ===== Granjas ===== */}
          <TabsContent value="granjas" className="space-y-3 mt-4">
            <GranjaForm onSave={addGranja} />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {granjas.map(g => {
                const total = entregas.filter(e => e.granja_id === g.id).reduce((s, e) => s + Number(e.quantidade_kg || 0), 0);
                return (
                  <Card key={g.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold">{g.nome}</div>
                        <div className="text-xs text-muted-foreground">{g.proprietario || "—"} · {g.cidade || "—"}</div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => delGranja(g.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>Aves: <b className="text-foreground">{g.qtd_aves?.toLocaleString("pt-BR") || "—"}</b></div>
                      <div>Galpões: <b className="text-foreground">{g.qtd_galpoes ?? "—"}</b></div>
                    </div>
                    <Badge variant="secondary">Total entregue: {fmtKg(total)}</Badge>
                    {g.observacoes && <p className="text-xs text-muted-foreground">{g.observacoes}</p>}
                  </Card>
                );
              })}
              {granjas.length === 0 && <p className="text-sm text-muted-foreground col-span-full">Cadastre sua primeira granja acima.</p>}
            </div>
          </TabsContent>

          {/* ===== Documentos ===== */}
          <TabsContent value="docs" className="space-y-3 mt-4">
            <DocumentosArea
              documentos={documentos}
              granjas={granjas}
              fazendaId={fazendaId!}
              codigo={codigo!}
              onAdd={addDocumento}
              onDelete={delDocumento}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

// ===== Granja Form =====
function GranjaForm({ onSave }: { onSave: (g: Omit<Granja, "id">) => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Omit<Granja, "id">>({ nome: "" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-1" /> Nova granja</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Cadastrar Granja</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome*</Label><Input value={f.nome} onChange={e => setF({ ...f, nome: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Proprietário</Label><Input value={f.proprietario || ""} onChange={e => setF({ ...f, proprietario: e.target.value })} /></div>
            <div><Label>Cidade</Label><Input value={f.cidade || ""} onChange={e => setF({ ...f, cidade: e.target.value })} /></div>
          </div>
          <div><Label>Endereço</Label><Input value={f.endereco || ""} onChange={e => setF({ ...f, endereco: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Qtd. aves</Label><Input type="number" value={f.qtd_aves || ""} onChange={e => setF({ ...f, qtd_aves: Number(e.target.value) || undefined })} /></div>
            <div><Label>Qtd. galpões</Label><Input type="number" value={f.qtd_galpoes || ""} onChange={e => setF({ ...f, qtd_galpoes: Number(e.target.value) || undefined })} /></div>
          </div>
          <div><Label>Observações</Label><Textarea rows={2} value={f.observacoes || ""} onChange={e => setF({ ...f, observacoes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button onClick={() => {
            if (!f.nome.trim()) return toast.error("Informe o nome");
            onSave(f); setF({ nome: "" }); setOpen(false);
          }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== Entrega Form (com OCR) =====
function EntregaForm({
  granjas,
  onSave,
  onSaveDoc,
}: {
  granjas: Granja[];
  onSave: (e: Omit<Entrega, "id">) => void;
  onSaveDoc: (d: Omit<Documento, "id">) => void;
}) {
  const { fazendaId, codigo } = useFazenda();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Omit<Entrega, "id">>({ data: todayISO(), quantidade_kg: 0 });
  const [uploading, setUploading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const ocrFn = useServerFn(ocrNotaRacao);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!fazendaId || !codigo) return;
    setUploading(true);
    try {
      const isImg = file.type.startsWith("image/");
      const blob = isImg ? await compressFile(file, 1600, 0.85) : file;
      const url = await uploadFotoBlob(blob, fazendaId, codigo);
      setF(prev => ({ ...prev, documento_url: url }));
      toast.success("Documento enviado");

      // OCR só para imagens
      if (isImg) {
        setOcrLoading(true);
        try {
          const dataUrl = await fileToDataUrl(new File([blob], file.name, { type: blob.type }));
          const res = await ocrFn({ data: { imagem: dataUrl } });
          setF(prev => ({
            ...prev,
            motorista: res.motorista || prev.motorista,
            placa: res.placa || prev.placa,
            viagem: res.viagem || prev.viagem,
            quantidade_kg: res.quantidadeKg ?? prev.quantidade_kg,
            tipo_racao: res.tipoRacao || prev.tipo_racao,
            data: res.data || prev.data,
          }));
          toast.success("Campos preenchidos pela IA");
        } catch (err: any) {
          toast.warning("OCR não disponível: " + (err.message || "erro"));
        } finally {
          setOcrLoading(false);
        }
      }
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  function reset() {
    setF({ data: todayISO(), quantidade_kg: 0 });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-1" /> Nova entrega</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Registrar entrega de ração</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Card className="p-3 bg-primary/5 border-primary/30">
            <Label className="flex items-center gap-2 mb-2"><Sparkles className="h-4 w-4 text-primary" /> Foto da nota (OCR automático)</Label>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading || ocrLoading}>
              <Upload className="h-4 w-4 mr-1" /> {uploading ? "Enviando…" : ocrLoading ? "Lendo nota…" : "Enviar nota"}
            </Button>
            {f.documento_url && <p className="text-xs text-muted-foreground mt-2">✓ Documento anexado</p>}
          </Card>

          <div className="grid grid-cols-2 gap-2">
            <div><Label>Data*</Label><Input type="date" value={f.data} onChange={e => setF({ ...f, data: e.target.value })} /></div>
            <div><Label>Viagem nº</Label><Input value={f.viagem || ""} onChange={e => setF({ ...f, viagem: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Motorista</Label><Input value={f.motorista || ""} onChange={e => setF({ ...f, motorista: e.target.value })} /></div>
            <div><Label>Placa</Label><Input value={f.placa || ""} onChange={e => setF({ ...f, placa: e.target.value.toUpperCase() })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Tipo de ração</Label>
              <Select value={f.tipo_racao || ""} onValueChange={v => setF({ ...f, tipo_racao: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{TIPOS_RACAO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Galpão</Label><Input value={f.galpao || ""} onChange={e => setF({ ...f, galpao: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Quantidade (kg)*</Label><Input type="number" value={f.quantidade_kg || ""} onChange={e => setF({ ...f, quantidade_kg: Number(e.target.value) || 0 })} /></div>
            <div>
              <Label>Granja</Label>
              <Select value={f.granja_id || ""} onValueChange={v => setF({ ...f, granja_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{granjas.map(g => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Observações</Label><Textarea rows={2} value={f.observacoes || ""} onChange={e => setF({ ...f, observacoes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button onClick={() => {
            if (!f.data) return toast.error("Informe a data");
            if (!f.quantidade_kg || f.quantidade_kg <= 0) return toast.error("Quantidade inválida");
            onSave(f);
            // salva o documento na central também
            if (f.documento_url) {
              onSaveDoc({
                nome: `Nota ${f.viagem || ""} ${f.data}`.trim(),
                url: f.documento_url,
                mime: f.documento_url.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
                motorista: f.motorista,
                viagem: f.viagem,
                data: f.data,
                granja_id: f.granja_id,
              });
            }
            setOpen(false); reset();
          }}>Salvar entrega</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== Lista de Entregas =====
function ListaEntregas({ entregas, granjas, onDelete }: { entregas: Entrega[]; granjas: Granja[]; onDelete: (id: string) => void }) {
  const [q, setQ] = useState("");
  const filtradas = useMemo(() => {
    const lq = q.toLowerCase();
    return entregas.filter(e => !q ||
      (e.motorista || "").toLowerCase().includes(lq) ||
      (e.placa || "").toLowerCase().includes(lq) ||
      (e.viagem || "").toLowerCase().includes(lq) ||
      (e.tipo_racao || "").toLowerCase().includes(lq) ||
      (granjas.find(g => g.id === e.granja_id)?.nome || "").toLowerCase().includes(lq)
    );
  }, [entregas, granjas, q]);
  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por motorista, placa, viagem, granja…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {filtradas.length === 0 ? <p className="text-sm text-muted-foreground p-4 text-center">Nenhuma entrega.</p> :
        <div className="space-y-2">
          {filtradas.map(e => {
            const g = granjas.find(g => g.id === e.granja_id);
            return (
              <div key={e.id} className="flex items-center justify-between gap-2 p-3 rounded border border-border/60 hover:bg-muted/30">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{g?.nome || "—"}</span>
                    <Badge variant="outline" className="text-xs">{e.tipo_racao || "—"}</Badge>
                    <Badge className="text-xs">{fmtKg(Number(e.quantidade_kg))}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(e.data + "T00:00").toLocaleDateString("pt-BR")} · V {e.viagem || "?"} · {e.motorista || "—"} · {e.placa || "—"} · Galpão {e.galpao || "—"}
                  </div>
                </div>
                <div className="flex gap-1">
                  {e.documento_url && (
                    <a href={e.documento_url} target="_blank" rel="noreferrer">
                      <Button size="icon" variant="ghost"><Eye className="h-4 w-4" /></Button>
                    </a>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => onDelete(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      }
    </>
  );
}

// ===== Documentos =====
function DocumentosArea({
  documentos, granjas, fazendaId, codigo, onAdd, onDelete,
}: {
  documentos: Documento[]; granjas: Granja[]; fazendaId: string; codigo: string;
  onAdd: (d: Omit<Documento, "id">) => void; onDelete: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtrados = useMemo(() => {
    const lq = q.toLowerCase();
    return documentos.filter(d => !q ||
      (d.nome || "").toLowerCase().includes(lq) ||
      (d.motorista || "").toLowerCase().includes(lq) ||
      (d.viagem || "").toLowerCase().includes(lq) ||
      (d.data || "").includes(lq)
    );
  }, [documentos, q]);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const blob = file.type.startsWith("image/") ? await compressFile(file, 1600, 0.85) : file;
      const url = await uploadFotoBlob(blob, fazendaId, codigo);
      onAdd({ nome: file.name, url, mime: file.type, data: todayISO() });
      toast.success("Documento adicionado");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar documentos…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
          <Upload className="h-4 w-4 mr-1" /> {uploading ? "Enviando…" : "Subir documento"}
        </Button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtrados.map(d => (
          <Card key={d.id} className="p-3 space-y-2">
            {d.mime?.startsWith("image/") ? (
              <img src={d.url} alt={d.nome} className="w-full h-32 object-cover rounded" loading="lazy" />
            ) : (
              <div className="w-full h-32 bg-muted rounded flex items-center justify-center"><FileText className="h-10 w-10 text-muted-foreground" /></div>
            )}
            <div className="text-sm font-medium truncate">{d.nome}</div>
            <div className="text-xs text-muted-foreground">
              {d.data && new Date(d.data + "T00:00").toLocaleDateString("pt-BR")}
              {d.motorista && ` · ${d.motorista}`}
              {d.viagem && ` · V${d.viagem}`}
            </div>
            <div className="flex gap-1">
              <a href={d.url} target="_blank" rel="noreferrer" className="flex-1">
                <Button size="sm" variant="outline" className="w-full"><Eye className="h-3 w-3 mr-1" />Ver</Button>
              </a>
              <a href={d.url} download={d.nome}>
                <Button size="sm" variant="outline"><Download className="h-3 w-3" /></Button>
              </a>
              <Button size="sm" variant="ghost" onClick={() => onDelete(d.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
            </div>
          </Card>
        ))}
        {filtrados.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center p-4">Nenhum documento.</p>}
      </div>
    </>
  );
}

// ===== Relatório PDF =====
function exportarRelatorio(entregas: Entrega[], granjas: Granja[]) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(88, 165, 90);
  doc.rect(0, 0, w, 28, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text(SITIO.nome, 14, 12);
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text("Relatório de Entregas de Ração", 14, 19);
  doc.text(new Date().toLocaleDateString("pt-BR"), w - 14, 12, { align: "right" });
  doc.setTextColor(40);

  const total = entregas.reduce((s, e) => s + Number(e.quantidade_kg || 0), 0);
  doc.setFontSize(11);
  doc.text(`Total geral: ${fmtKg(total)} em ${entregas.length} viagens`, 14, 38);

  autoTable(doc, {
    startY: 44,
    head: [["Data", "Viagem", "Motorista", "Placa", "Granja", "Tipo", "Galpão", "Qtd (kg)"]],
    body: entregas.slice(0, 200).map(e => [
      new Date(e.data + "T00:00").toLocaleDateString("pt-BR"),
      e.viagem || "—",
      e.motorista || "—",
      e.placa || "—",
      granjas.find(g => g.id === e.granja_id)?.nome || "—",
      e.tipo_racao || "—",
      e.galpao || "—",
      Number(e.quantidade_kg || 0).toLocaleString("pt-BR"),
    ]),
    headStyles: { fillColor: [88, 165, 90] },
    styles: { fontSize: 8 },
  });

  const filename = `racao-${todayISO()}.pdf`;
  savePdf(doc, filename, { titulo: "Entregas de Ração", modulo: "racao" });
}
