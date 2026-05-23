import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Truck, Package, Calendar as CalIcon, FileText, Plus, Upload, Download, Search, Eye, Trash2, BarChart3, Image as ImageIcon } from "lucide-react";
import { ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from "recharts";
import { useFazenda } from "@/lib/cloud/fazenda";
import { compressFile, uploadFotoBlob } from "@/lib/cloud/uploadFoto";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SITIO } from "@/lib/pdf";
import { savePdf } from "@/lib/pdfHistory";

export const Route = createFileRoute("/entregas-racao")({
  head: () => ({
    meta: [
      { title: "Controle de Ração — AgroSítio" },
      { name: "description", content: "Registro simples de entregas de ração no aviário: kg, placa, motorista, data, foto da nota e do caminhão." },
    ],
  }),
  component: EntregasRacaoPage,
});

type Entrega = {
  id: string;
  data: string;
  motorista?: string;
  placa?: string;
  quantidade_kg: number;
  documento_url?: string;     // foto da nota
  foto_caminhao_url?: string; // foto do caminhão
  observacoes?: string;
};

function fmtKg(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 2)} t`;
  return `${n.toLocaleString("pt-BR")} kg`;
}
function todayISO() { return new Date().toISOString().slice(0, 10); }

function EntregasRacaoPage() {
  const { client, fazendaId } = useFazenda();
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!fazendaId) { setLoading(false); return; }
    let cancel = false;
    client.from("entregas_racao").select("*").order("data", { ascending: false })
      .then(({ data }) => {
        if (cancel) return;
        setEntregas((data as any[]) || []);
        setLoading(false);
      });
    return () => { cancel = true; };
  }, [client, fazendaId]);

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
    };
  }, [entregas]);

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

  const filtradas = useMemo(() => {
    const lq = q.toLowerCase();
    return entregas.filter(e => !q ||
      (e.motorista || "").toLowerCase().includes(lq) ||
      (e.placa || "").toLowerCase().includes(lq) ||
      e.data.includes(lq)
    );
  }, [entregas, q]);

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
            <p className="text-sm text-muted-foreground">Anote rápido cada caminhão de ração que chega no aviário.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportarRelatorio(entregas)}>
              <Download className="h-4 w-4 mr-2" /> PDF
            </Button>
            <EntregaForm onSave={addEntrega} />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Hoje" value={fmtKg(stats.hoje)} hint={`${stats.hojeQt} caminhões`} icon={CalIcon} tone="primary" />
          <StatCard label="7 dias" value={fmtKg(stats.semana)} hint={`${stats.semanaQt} caminhões`} icon={Truck} tone="accent" />
          <StatCard label="30 dias" value={fmtKg(stats.mes)} hint={`${stats.mesQt} caminhões`} icon={Package} tone="muted" />
          <StatCard label="Total" value={fmtKg(stats.total)} hint={`${stats.totalQt} caminhões`} icon={BarChart3} tone="primary" />
        </div>

        <Card className="p-4">
          <h3 className="font-semibold mb-3 text-sm">Entregas — últimos 14 dias</h3>
          <div className="h-56">
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

        <Card className="p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por motorista, placa ou data…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground p-4 text-center">Carregando…</p>
          ) : filtradas.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">Nenhuma entrega registrada. Clique em "Nova entrega" para começar.</p>
          ) : (
            <div className="space-y-2">
              {filtradas.map(e => (
                <div key={e.id} className="flex items-center gap-3 p-3 rounded border border-border/60 hover:bg-muted/30">
                  <div className="flex gap-1 shrink-0">
                    {e.documento_url ? (
                      <a href={e.documento_url} target="_blank" rel="noreferrer" title="Foto da nota">
                        <img src={e.documento_url} alt="nota" className="w-14 h-14 object-cover rounded border" loading="lazy" />
                      </a>
                    ) : (
                      <div className="w-14 h-14 rounded border bg-muted flex items-center justify-center text-muted-foreground"><FileText className="h-5 w-5" /></div>
                    )}
                    {e.foto_caminhao_url ? (
                      <a href={e.foto_caminhao_url} target="_blank" rel="noreferrer" title="Foto do caminhão">
                        <img src={e.foto_caminhao_url} alt="caminhão" className="w-14 h-14 object-cover rounded border" loading="lazy" />
                      </a>
                    ) : (
                      <div className="w-14 h-14 rounded border bg-muted flex items-center justify-center text-muted-foreground"><Truck className="h-5 w-5" /></div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge>{fmtKg(Number(e.quantidade_kg))}</Badge>
                      <span className="font-medium truncate">{e.motorista || "—"}</span>
                      <Badge variant="outline" className="text-xs">{e.placa || "sem placa"}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(e.data + "T00:00").toLocaleDateString("pt-BR")}
                      {e.observacoes ? ` · ${e.observacoes}` : ""}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => delEntrega(e.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function EntregaForm({ onSave }: { onSave: (e: Omit<Entrega, "id">) => Promise<void> | void }) {
  const { fazendaId, codigo } = useFazenda();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Omit<Entrega, "id">>({ data: todayISO(), quantidade_kg: 0 });
  const [upNota, setUpNota] = useState(false);
  const [upCam, setUpCam] = useState(false);
  const notaRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  async function uploadField(file: File, field: "documento_url" | "foto_caminhao_url") {
    if (!fazendaId || !codigo) return;
    const setUp = field === "documento_url" ? setUpNota : setUpCam;
    setUp(true);
    try {
      const blob = file.type.startsWith("image/") ? await compressFile(file, 1600, 0.85) : file;
      const url = await uploadFotoBlob(blob, fazendaId, codigo);
      setF(prev => ({ ...prev, [field]: url }));
      toast.success(field === "documento_url" ? "Nota enviada" : "Foto do caminhão enviada");
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message);
    } finally {
      setUp(false);
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova entrega de ração</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Data*</Label>
              <Input type="date" value={f.data} onChange={e => setF({ ...f, data: e.target.value })} />
            </div>
            <div>
              <Label>Quantidade (kg)*</Label>
              <Input type="number" inputMode="decimal" value={f.quantidade_kg || ""} onChange={e => setF({ ...f, quantidade_kg: Number(e.target.value) || 0 })} />
            </div>
          </div>
          <div>
            <Label>Motorista</Label>
            <Input value={f.motorista || ""} onChange={e => setF({ ...f, motorista: e.target.value })} placeholder="Nome do caminhoneiro" />
          </div>
          <div>
            <Label>Placa do caminhão</Label>
            <Input value={f.placa || ""} onChange={e => setF({ ...f, placa: e.target.value.toUpperCase() })} placeholder="ABC1D23" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Card className="p-3 space-y-2">
              <Label className="flex items-center gap-1 text-xs"><FileText className="h-3 w-3" /> Foto da nota</Label>
              <input ref={notaRef} type="file" accept="image/*,application/pdf" capture="environment" className="hidden"
                onChange={e => e.target.files?.[0] && uploadField(e.target.files[0], "documento_url")} />
              {f.documento_url ? (
                <a href={f.documento_url} target="_blank" rel="noreferrer">
                  <img src={f.documento_url} alt="nota" className="w-full h-24 object-cover rounded" />
                </a>
              ) : (
                <div className="w-full h-24 bg-muted rounded flex items-center justify-center text-muted-foreground"><FileText className="h-6 w-6" /></div>
              )}
              <Button size="sm" variant="outline" className="w-full" onClick={() => notaRef.current?.click()} disabled={upNota}>
                <Upload className="h-3 w-3 mr-1" /> {upNota ? "Enviando…" : f.documento_url ? "Trocar" : "Tirar foto"}
              </Button>
            </Card>

            <Card className="p-3 space-y-2">
              <Label className="flex items-center gap-1 text-xs"><Truck className="h-3 w-3" /> Foto do caminhão</Label>
              <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => e.target.files?.[0] && uploadField(e.target.files[0], "foto_caminhao_url")} />
              {f.foto_caminhao_url ? (
                <a href={f.foto_caminhao_url} target="_blank" rel="noreferrer">
                  <img src={f.foto_caminhao_url} alt="caminhão" className="w-full h-24 object-cover rounded" />
                </a>
              ) : (
                <div className="w-full h-24 bg-muted rounded flex items-center justify-center text-muted-foreground"><ImageIcon className="h-6 w-6" /></div>
              )}
              <Button size="sm" variant="outline" className="w-full" onClick={() => camRef.current?.click()} disabled={upCam}>
                <Upload className="h-3 w-3 mr-1" /> {upCam ? "Enviando…" : f.foto_caminhao_url ? "Trocar" : "Tirar foto"}
              </Button>
            </Card>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea rows={2} value={f.observacoes || ""} onChange={e => setF({ ...f, observacoes: e.target.value })} placeholder="Opcional" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={async () => {
            if (!f.data) return toast.error("Informe a data");
            if (!f.quantidade_kg || f.quantidade_kg <= 0) return toast.error("Quantidade inválida");
            await onSave(f);
            setOpen(false); reset();
          }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function exportarRelatorio(entregas: Entrega[]) {
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
  doc.text(`Total geral: ${fmtKg(total)} em ${entregas.length} caminhões`, 14, 38);

  autoTable(doc, {
    startY: 44,
    head: [["Data", "Motorista", "Placa", "Quantidade (kg)", "Obs."]],
    body: entregas.slice(0, 300).map(e => [
      new Date(e.data + "T00:00").toLocaleDateString("pt-BR"),
      e.motorista || "—",
      e.placa || "—",
      Number(e.quantidade_kg || 0).toLocaleString("pt-BR"),
      e.observacoes || "",
    ]),
    headStyles: { fillColor: [88, 165, 90] },
    styles: { fontSize: 9 },
  });

  const filename = `racao-${todayISO()}.pdf`;
  savePdf(doc, filename, { titulo: "Entregas de Ração", modulo: "racao" });
}
