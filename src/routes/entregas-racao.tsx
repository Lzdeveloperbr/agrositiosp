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
import { Truck, Package, Calendar as CalIcon, FileText, Plus, Upload, Download, Search, Eye, Trash2, BarChart3, Image as ImageIcon, Drumstick, Scale, Boxes, Settings2 } from "lucide-react";
import { ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Area, AreaChart, Legend } from "recharts";
import { useFazenda } from "@/lib/cloud/fazenda";
import { compressFile, uploadFotoBlob } from "@/lib/cloud/uploadFoto";
import { useLotes } from "@/lib/state";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SITIO } from "@/lib/pdf";
import { savePdf } from "@/lib/pdfHistory";

// ===== Curvas de referência por linhagem (base = misto) =====
// Consumo acumulado (g) e peso (g) por idade, baseados em manuais Cobb 500 / Ross 308 / Ross AP 95.
// Ross AP 95 = pesos OFICIAIS da Bello Alimentos (programação de ração).
const CURVAS_BASE = {
  cobb500: {
    consumo: { 0: 0, 1: 13, 7: 165, 14: 565, 21: 1240, 28: 2185, 35: 3415, 42: 4905, 49: 6510, 56: 8200 } as Record<number, number>,
    peso:    { 0: 42, 1: 50, 7: 185, 14: 470, 21: 925, 28: 1520, 35: 2230, 42: 2980, 49: 3680, 56: 4300 } as Record<number, number>,
  },
  ross308: {
    consumo: { 0: 0, 1: 13, 7: 170, 14: 580, 21: 1265, 28: 2230, 35: 3490, 42: 5010, 49: 6640, 56: 8350 } as Record<number, number>,
    peso:    { 0: 43, 1: 52, 7: 192, 14: 485, 21: 950, 28: 1560, 35: 2290, 42: 3050, 49: 3750, 56: 4380 } as Record<number, number>,
  },
  ross_ap95: {
    // Pesos esperados oficiais Bello/AP95: D4 123g · D7 211g · D14 523g · D21 1036g · D28 1699g · D35 2446g · D42 3205g
    // Consumo recalculado a partir de CA alvo AP95 (D7≈0,95 / D14≈1,18 / D21≈1,30 / D28≈1,40 / D35≈1,52 / D42≈1,62).
    consumo: { 0: 0, 1: 14, 4: 75, 7: 200, 14: 617, 21: 1347, 28: 2379, 35: 3718, 42: 5192, 49: 6708, 56: 8420 } as Record<number, number>,
    peso:    { 0: 44, 1: 55, 4: 123, 7: 211, 14: 523, 21: 1036, 28: 1699, 35: 2446, 42: 3205, 49: 3900, 56: 4550 } as Record<number, number>,
  },
};
type Linhagem = keyof typeof CURVAS_BASE;
type Sexo = "macho" | "femea" | "misto";
const LIN_LABEL: Record<Linhagem, string> = { cobb500: "Cobb 500", ross308: "Ross 308", ross_ap95: "Ross AP 95" };
// Multiplicadores de sexo aplicados ao base (misto = curva original; macho >, fêmea <)
const SEXO_MULT: Record<Sexo, { peso: number; consumo: number }> = {
  macho: { peso: 1.06, consumo: 1.05 },
  misto: { peso: 1.00, consumo: 1.00 },
  femea: { peso: 0.94, consumo: 0.95 },
};

function interp(tbl: Record<number, number>, idade: number) {
  const keys = Object.keys(tbl).map(Number).sort((a, b) => a - b);
  if (idade <= keys[0]) return tbl[keys[0]];
  if (idade >= keys[keys.length - 1]) return tbl[keys[keys.length - 1]];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (idade >= a && idade <= b) {
      const t = (idade - a) / (b - a);
      return tbl[a] + (tbl[b] - tbl[a]) * t;
    }
  }
  return tbl[keys[keys.length - 1]];
}
const consumoAcumGPorAve = (idade: number, lin: Linhagem, sx: Sexo) =>
  interp(CURVAS_BASE[lin].consumo, idade) * SEXO_MULT[sx].consumo;
const pesoMedioGPorAve = (idade: number, lin: Linhagem, sx: Sexo) =>
  interp(CURVAS_BASE[lin].peso, idade) * SEXO_MULT[sx].peso;
const consumoDiarioGPorAve = (idade: number, lin: Linhagem, sx: Sexo) =>
  Math.max(0, consumoAcumGPorAve(idade, lin, sx) - consumoAcumGPorAve(Math.max(0, idade - 1), lin, sx));
// CA alvo = consumo acumulado / peso (mesma unidade)
const caAlvo = (idade: number, lin: Linhagem, sx: Sexo) => {
  const p = pesoMedioGPorAve(idade, lin, sx);
  return p > 0 ? consumoAcumGPorAve(idade, lin, sx) / p : 0;
};
function classificaCA(real: number, alvo: number): { label: string; cor: string; desc: string } {
  if (!real || !alvo) return { label: "—", cor: "bg-muted text-muted-foreground", desc: "Sem dados suficientes" };
  const d = real - alvo;
  if (d <= -0.05) return { label: "Excelente", cor: "bg-emerald-600 text-white", desc: `Abaixo do alvo (${alvo.toFixed(3)}). Lote convertendo muito bem.` };
  if (d <= 0.05)  return { label: "Bom",        cor: "bg-emerald-500 text-white", desc: `Dentro do alvo (${alvo.toFixed(3)}). Lote saudável.` };
  if (d <= 0.15)  return { label: "Regular",    cor: "bg-amber-500 text-white",   desc: `Acima do alvo (${alvo.toFixed(3)}). Revisar ração/ambiência.` };
  return            { label: "Ruim",       cor: "bg-destructive text-destructive-foreground", desc: `Muito acima do alvo (${alvo.toFixed(3)}). Investigar manejo, água e sanidade.` };
}

type LoteCfg = {
  dataAlojamento: string;
  qtdInicial: number;
  mortalidadeAcum: number;
  eliminadosAcum?: number;     // aves eliminadas/refugagem
  linhagem: Linhagem;
  sexo: Sexo;
  pesoMedioRealG?: number;     // última pesagem real (g) — usa no CA se preenchido
  pesoMedioRealData?: string;  // data da última pesagem real
};
const CFG_KEY = (fid: string) => `racao_lote_cfg_${fid}`;



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

        <EstoqueEstimado totalEntregueKg={stats.total} />


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

// ===== Estoque estimado de ração baseado em idade/consumo =====
function EstoqueEstimado({ totalEntregueKg }: { totalEntregueKg: number }) {
  const { fazendaId } = useFazenda();
  const [lotes] = useLotes();
  const [cfg, setCfg] = useState<LoteCfg>({ dataAlojamento: todayISO(), qtdInicial: 0, mortalidadeAcum: 0, eliminadosAcum: 0, linhagem: "ross_ap95", sexo: "misto" });
  const [editing, setEditing] = useState(false);
  const [manual, setManual] = useState(false);

  // Lote ativo (não encerrado mais recente) — usado para auto-preencher
  const loteAtivo = useMemo(() => {
    const ativos = lotes.filter(l => !l.encerrado);
    const lista = ativos.length ? ativos : lotes;
    return [...lista].sort((a, b) => (b.dataEntrada || "").localeCompare(a.dataEntrada || ""))[0];
  }, [lotes]);

  // Carregar/salvar config local por fazenda (linhagem/sexo + flag manual)
  useEffect(() => {
    if (!fazendaId) return;
    try {
      const raw = localStorage.getItem(CFG_KEY(fazendaId));
      if (raw) {
        const p = JSON.parse(raw);
        setCfg((prev) => ({ ...prev, linhagem: p.linhagem ?? "ross_ap95", sexo: p.sexo ?? "misto", ...(p.manual ? p : {}) }));
        setManual(!!p.manual);
      }
    } catch {}
  }, [fazendaId]);
  useEffect(() => {
    if (!fazendaId) return;
    localStorage.setItem(CFG_KEY(fazendaId), JSON.stringify({ ...cfg, manual }));
  }, [cfg, manual, fazendaId]);

  // Auto-preencher a partir do lote ativo (mortalidade/peso/eliminados vêm dos lançamentos da Granja)
  useEffect(() => {
    if (manual || !loteAtivo) return;
    const mort = loteAtivo.entries.reduce((s, e) => s + (e.mortalidade || 0), 0);
    const elim = loteAtivo.entries.reduce((s, e) => s + (e.eliminados || 0), 0);
    const ultimaPesagem = [...loteAtivo.entries]
      .filter(e => e.pesoMedioG)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
    setCfg(prev => ({
      ...prev,
      dataAlojamento: loteAtivo.dataEntrada,
      qtdInicial: loteAtivo.quantidadeInicial,
      mortalidadeAcum: mort,
      eliminadosAcum: elim,
      pesoMedioRealG: ultimaPesagem?.pesoMedioG,
      pesoMedioRealData: ultimaPesagem?.date,
    }));
  }, [loteAtivo, manual]);



  const calc = useMemo(() => {
    if (!cfg.qtdInicial || !cfg.dataAlojamento) return null;
    const lin = cfg.linhagem, sx = cfg.sexo;
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const aloj = new Date(cfg.dataAlojamento + "T00:00");
    // Idade começa em 0 (dia do alojamento = D0)
    const idade = Math.max(0, Math.round((hoje.getTime() - aloj.getTime()) / 86400000));
    const baixas = (cfg.mortalidadeAcum || 0) + (cfg.eliminadosAcum || 0);
    const avesVivas = Math.max(0, cfg.qtdInicial - baixas);
    const avesMediasParaConsumo = (cfg.qtdInicial + avesVivas) / 2;
    const consumoAcumKg = (consumoAcumGPorAve(idade, lin, sx) * avesMediasParaConsumo) / 1000;
    const consumoHojeKg = (consumoDiarioGPorAve(idade, lin, sx) * avesVivas) / 1000;
    const estoqueKg = totalEntregueKg - consumoAcumKg;
    // Peso médio: prioriza pesagem real informada
    const pesoMedioCurvaKg = pesoMedioGPorAve(idade, lin, sx) / 1000;
    const pesoMedioRealKg = cfg.pesoMedioRealG ? cfg.pesoMedioRealG / 1000 : undefined;
    const pesoMedioKg = pesoMedioRealKg ?? pesoMedioCurvaKg;
    const usandoPesoReal = !!pesoMedioRealKg;
    const pesoTotalLoteKg = pesoMedioKg * avesVivas;
    const diasRestantes = consumoHojeKg > 0 ? estoqueKg / consumoHojeKg : 0;
    // CA real = ração consumida ÷ peso vivo produzido (usa peso real quando disponível)
    const racaoConsumidaKg = Math.min(totalEntregueKg, consumoAcumKg);
    const caReal = pesoTotalLoteKg > 0 ? racaoConsumidaKg / pesoTotalLoteKg : 0;
    const caTarget = caAlvo(idade, lin, sx);
    const caStatus = classificaCA(caReal, caTarget);
    const desvioPesoPct = pesoMedioRealKg && pesoMedioCurvaKg > 0
      ? ((pesoMedioRealKg - pesoMedioCurvaKg) / pesoMedioCurvaKg) * 100
      : null;

    const proj: { dia: string; idade: number; consumo: number; estoque: number }[] = [];
    let estoque = estoqueKg;
    for (let i = 1; i <= 14; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      const idd = idade + i;
      const c = (consumoDiarioGPorAve(idd, lin, sx) * avesVivas) / 1000;
      estoque -= c;
      proj.push({
        dia: d.toISOString().slice(5, 10).split("-").reverse().join("/"),
        idade: idd,
        consumo: Math.round(c),
        estoque: Math.round(estoque),
      });
    }
    return { idade, avesVivas, baixas, consumoAcumKg, consumoHojeKg, estoqueKg, pesoMedioKg, pesoMedioCurvaKg, pesoTotalLoteKg, diasRestantes, proj, caReal, caTarget, caStatus, usandoPesoReal, desvioPesoPct };
  }, [cfg, totalEntregueKg]);


  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-display text-lg font-bold flex items-center gap-2">
            <Boxes className="h-5 w-5 text-primary" /> Estoque estimado de ração
          </h3>
          <p className="text-xs text-muted-foreground">
            {loteAtivo && !manual
              ? <>Sincronizado automaticamente com o <b>Lote {loteAtivo.numero}</b> da Granja (mortalidade, eliminados e peso médio).</>
              : "Cálculo automático pelo consumo médio do lote (idade × aves vivas × linhagem)."}
          </p>
          <div className="flex gap-2 mt-2 flex-wrap">
            {loteAtivo && !manual && <Badge className="bg-emerald-600 text-white">Auto · Lote {loteAtivo.numero}</Badge>}
            {manual && <Badge variant="destructive">Modo manual</Badge>}
            <Badge variant="secondary">{LIN_LABEL[cfg.linhagem]}</Badge>
            <Badge variant="outline">{cfg.sexo === "macho" ? "Macho" : cfg.sexo === "femea" ? "Fêmea" : "Misto"}</Badge>
            {calc?.usandoPesoReal && <Badge className="bg-emerald-600 text-white">Peso real informado</Badge>}
            {calc && <Badge variant="outline">D{calc.idade}</Badge>}
          </div>


        </div>
        <Button size="sm" variant="outline" onClick={() => setEditing(v => !v)}>
          <Settings2 className="h-4 w-4 mr-1" /> {editing ? "Fechar" : "Configurar lote"}
        </Button>
      </div>

      {editing && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3 rounded-md bg-muted/30">
          <div>
            <Label className="text-xs">Data de alojamento (D0)</Label>
            <Input type="date" value={cfg.dataAlojamento}
              onChange={e => setCfg({ ...cfg, dataAlojamento: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Aves alojadas (início)</Label>
            <Input type="number" inputMode="numeric" value={cfg.qtdInicial || ""}
              onChange={e => setCfg({ ...cfg, qtdInicial: Number(e.target.value) || 0 })} placeholder="Ex: 25000" />
          </div>
          <div>
            <Label className="text-xs">Mortalidade acumulada</Label>
            <Input type="number" inputMode="numeric" value={cfg.mortalidadeAcum || ""}
              onChange={e => setCfg({ ...cfg, mortalidadeAcum: Number(e.target.value) || 0 })} placeholder="Aves mortas" />
          </div>
          <div>
            <Label className="text-xs">Eliminados acumulado</Label>
            <Input type="number" inputMode="numeric" value={cfg.eliminadosAcum || ""}
              onChange={e => setCfg({ ...cfg, eliminadosAcum: Number(e.target.value) || 0 })} placeholder="Refugagem / sacrifício" />
          </div>
          <div>
            <Label className="text-xs">Linhagem</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={cfg.linhagem}
              onChange={e => setCfg({ ...cfg, linhagem: e.target.value as Linhagem })}
            >
              <option value="ross_ap95">Ross AP 95</option>
              <option value="ross308">Ross 308</option>
              <option value="cobb500">Cobb 500</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Sexagem</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={cfg.sexo}
              onChange={e => setCfg({ ...cfg, sexo: e.target.value as Sexo })}
            >
              <option value="misto">Misto</option>
              <option value="macho">Macho</option>
              <option value="femea">Fêmea</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Peso médio REAL (g) — última pesagem</Label>
            <Input type="number" inputMode="decimal" value={cfg.pesoMedioRealG || ""}
              onChange={e => setCfg({ ...cfg, pesoMedioRealG: Number(e.target.value) || undefined })} placeholder="Ex: 2200 — deixe vazio para usar curva" />
            <p className="text-[10px] text-muted-foreground mt-1">Se informado, sobrescreve a curva no cálculo de CA, peso vivo e estoque.</p>
          </div>
          <div>
            <Label className="text-xs">Data da pesagem real</Label>
            <Input type="date" value={cfg.pesoMedioRealData || ""}
              onChange={e => setCfg({ ...cfg, pesoMedioRealData: e.target.value || undefined })} />
          </div>
        </div>
      )}


      {!calc ? (
        <p className="text-sm text-muted-foreground text-center p-6">
          Clique em <b>Configurar lote</b> e informe a data de alojamento e o número de aves para ver o estoque estimado.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Idade do lote" value={`D${calc.idade}`} hint={`${calc.avesVivas.toLocaleString("pt-BR")} aves vivas${calc.baixas ? ` · ${calc.baixas} baixas` : ""}`} icon={CalIcon} tone="primary" />
            <StatCard
              label={calc.usandoPesoReal ? "Peso médio (real)" : "Peso médio (curva)"}
              value={`${calc.pesoMedioKg.toFixed(3)} kg`}
              hint={calc.desvioPesoPct != null
                ? `${calc.desvioPesoPct >= 0 ? "+" : ""}${calc.desvioPesoPct.toFixed(1)}% vs curva · lote ≈ ${fmtKg(Math.round(calc.pesoTotalLoteKg))}`
                : `Lote ≈ ${fmtKg(Math.round(calc.pesoTotalLoteKg))}`}
              icon={Scale}
              tone="accent"
            />
            <StatCard label="Consumo hoje" value={fmtKg(Math.round(calc.consumoHojeKg))} hint={`${Math.round(consumoDiarioGPorAve(calc.idade, cfg.linhagem, cfg.sexo))} g/ave/dia`} icon={Drumstick} tone="muted" />
            <StatCard
              label="Estoque estimado"
              value={fmtKg(Math.max(0, Math.round(calc.estoqueKg)))}
              hint={calc.estoqueKg < 0
                ? `Faltaram ${fmtKg(Math.round(-calc.estoqueKg))}`
                : `≈ ${calc.diasRestantes.toFixed(1)} dias`}
              icon={Boxes}
              tone={calc.estoqueKg <= 0 ? "destructive" : calc.diasRestantes < 2 ? "destructive" : "primary"}
            />
          </div>


          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded bg-muted/30">
              <p className="text-muted-foreground">Entregue total</p>
              <p className="font-display font-bold text-base">{fmtKg(Math.round(totalEntregueKg))}</p>
            </div>
            <div className="p-3 rounded bg-muted/30">
              <p className="text-muted-foreground">Consumo acumulado estimado</p>
              <p className="font-display font-bold text-base">{fmtKg(Math.round(calc.consumoAcumKg))}</p>
            </div>
            <div className="p-3 rounded bg-muted/30">
              <p className="text-muted-foreground">Saldo (entregue − consumido)</p>
              <p className={`font-display font-bold text-base ${calc.estoqueKg < 0 ? "text-destructive" : ""}`}>
                {fmtKg(Math.round(calc.estoqueKg))}
              </p>
            </div>
          </div>

          {/* Conversão alimentar (CA) */}
          <div className="rounded-lg border p-4 bg-gradient-to-br from-muted/40 to-transparent">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Conversão alimentar (CA)
                </h4>
                <p className="text-[11px] text-muted-foreground">kg de ração consumida ÷ kg de peso vivo produzido</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${calc.caStatus.cor}`}>
                {calc.caStatus.label}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="p-2 rounded bg-background/60 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">CA real</p>
                <p className="font-display text-xl font-bold">{calc.caReal ? calc.caReal.toFixed(3) : "—"}</p>
              </div>
              <div className="p-2 rounded bg-background/60 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">CA alvo</p>
                <p className="font-display text-xl font-bold">{calc.caTarget.toFixed(3)}</p>
              </div>
              <div className="p-2 rounded bg-background/60 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Desvio</p>
                <p className={`font-display text-xl font-bold ${calc.caReal - calc.caTarget > 0.05 ? "text-destructive" : calc.caReal && calc.caReal - calc.caTarget < -0.05 ? "text-emerald-600" : ""}`}>
                  {calc.caReal ? (calc.caReal - calc.caTarget >= 0 ? "+" : "") + (calc.caReal - calc.caTarget).toFixed(3) : "—"}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">{calc.caStatus.desc}</p>
          </div>



          {/* Tabela diária de peso esperado x consumo (curva oficial Bello / AP95) */}
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" /> Peso esperado por dia — {LIN_LABEL[cfg.linhagem]} ({cfg.sexo})
            </h4>
            <p className="text-[11px] text-muted-foreground mb-2">
              Interpolação diária a partir das idades-marco (D4, D7, D14, D21, D28, D35, D42). GPD = ganho de peso/dia. CA alvo = consumo acumulado ÷ peso vivo.
            </p>
            <div className="overflow-x-auto rounded border">
              <table className="w-full text-[11px]">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 text-left">Idade</th>
                    <th className="px-2 py-1.5 text-right">Peso esperado</th>
                    <th className="px-2 py-1.5 text-right">GPD</th>
                    <th className="px-2 py-1.5 text-right">Ração/dia</th>
                    <th className="px-2 py-1.5 text-right">Ração acum.</th>
                    <th className="px-2 py-1.5 text-right">CA alvo</th>
                    <th className="px-2 py-1.5 text-right">Lote/dia</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 50 }, (_, d) => {
                    const pesoAve = pesoMedioGPorAve(d, cfg.linhagem, cfg.sexo);
                    const pesoOnt = d > 0 ? pesoMedioGPorAve(d - 1, cfg.linhagem, cfg.sexo) : pesoAve;
                    const gpd = pesoAve - pesoOnt;
                    const racDia = consumoDiarioGPorAve(d, cfg.linhagem, cfg.sexo);
                    const racAcum = consumoAcumGPorAve(d, cfg.linhagem, cfg.sexo);
                    const ca = caAlvo(d, cfg.linhagem, cfg.sexo);
                    const loteDiaKg = (racDia * calc.avesVivas) / 1000;
                    const idadeAtual = d === calc.idade;
                    const marco = [0, 4, 7, 14, 21, 28, 35, 42, 49].includes(d);
                    return (
                      <tr key={d} className={`border-t ${idadeAtual ? "bg-primary/10 font-semibold" : marco ? "bg-muted/20" : ""}`}>
                        <td className="px-2 py-1">D{d}{idadeAtual && <span className="ml-1 text-[9px] text-primary">HOJE</span>}</td>
                        <td className="px-2 py-1 text-right">{Math.round(pesoAve)} g</td>
                        <td className="px-2 py-1 text-right text-muted-foreground">{gpd > 0 ? `+${Math.round(gpd)} g` : "—"}</td>
                        <td className="px-2 py-1 text-right">{Math.round(racDia)} g</td>
                        <td className="px-2 py-1 text-right text-muted-foreground">{(racAcum / 1000).toFixed(2)} kg</td>
                        <td className="px-2 py-1 text-right">{ca ? ca.toFixed(3) : "—"}</td>
                        <td className="px-2 py-1 text-right font-mono">{loteDiaKg >= 1000 ? `${(loteDiaKg/1000).toFixed(2)} t` : `${Math.round(loteDiaKg)} kg`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Linhas destacadas em azul = idade atual do lote · cinza = idades-marco da ficha técnica.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Projeção do estoque — próximos 14 dias</h4>
            <div className="h-56">
              <ResponsiveContainer>
                <AreaChart data={calc.proj}>
                  <defs>
                    <linearGradient id="gEst" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="dia" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v: any, n: any) => [fmtKg(Number(v)), n === "estoque" ? "Estoque" : "Consumo"]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="estoque" name="Estoque" stroke="hsl(var(--primary))" fill="url(#gEst)" strokeWidth={2} />
                  <Line type="monotone" dataKey="consumo" name="Consumo/dia" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Curva: {LIN_LABEL[cfg.linhagem]} — {cfg.sexo === "macho" ? "macho" : cfg.sexo === "femea" ? "fêmea" : "misto"}. {calc.usandoPesoReal ? "CA usando peso REAL informado." : "Informe o peso real da última pesagem para um CA mais preciso."}
            </p>
          </div>
        </>
      )}
    </Card>
  );
}
