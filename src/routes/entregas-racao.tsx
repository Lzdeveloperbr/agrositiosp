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

// ===== Calibração dinâmica pela última pesagem real =====
// Após uma pesagem, toda a curva (peso e consumo) é reescalada pelo desvio medido.
// O desvio é amortecido exponencialmente (meia-vida ~28 d) porque o lote tende a
// reconvergir para o padrão genético conforme envelhece.
export type Calib = { fator: number; idadePesagem: number } | null;

function criarCalib(pesoRealG: number | undefined, idadePesagem: number | undefined, lin: Linhagem, sx: Sexo): Calib {
  if (!pesoRealG || idadePesagem == null || idadePesagem < 0) return null;
  const base = pesoMedioGPorAve(idadePesagem, lin, sx);
  if (!base) return null;
  const f = pesoRealG / base;
  if (!Number.isFinite(f) || f <= 0.3 || f > 2.5) return null;
  return { fator: f, idadePesagem };
}
// fator aplicado no dia d (amortecido após a data da pesagem)
function fatorNoDia(cal: Calib, d: number): number {
  if (!cal) return 1;
  const dt = Math.max(0, d - cal.idadePesagem);
  return 1 + (cal.fator - 1) * Math.exp(-dt / 28);
}
const pesoCalibradoG = (d: number, lin: Linhagem, sx: Sexo, cal: Calib) =>
  pesoMedioGPorAve(d, lin, sx) * fatorNoDia(cal, d);
// Consumo escala com o peso metabólico (P^0,75) — padrão zootécnico.
const consumoCalibradoAcumG = (d: number, lin: Linhagem, sx: Sexo, cal: Calib) =>
  consumoAcumGPorAve(d, lin, sx) * Math.pow(fatorNoDia(cal, d), 0.75);
const consumoCalibradoDiaG = (d: number, lin: Linhagem, sx: Sexo, cal: Calib) =>
  Math.max(0, consumoCalibradoAcumG(d, lin, sx, cal) - consumoCalibradoAcumG(Math.max(0, d - 1), lin, sx, cal));

// Curva de consumo intradiário (fração acumulada do dia por hora local).
// Aves comem em picos após acender a luz e antes de apagar — perfil típico de aviário.
const PERFIL_HORA = [1.5, 1.2, 1.0, 1.0, 1.5, 3.0, 5.5, 7.0, 7.5, 6.5, 5.5, 5.0, 4.5, 4.5, 5.0, 5.5, 6.5, 7.5, 7.0, 5.5, 4.0, 2.8, 2.0, 1.0];
const PERFIL_SOMA = PERFIL_HORA.reduce((a, b) => a + b, 0);
/** fração (0..1) do consumo diário já realizado até este instante */
function fracaoDiaConsumida(agora: Date): number {
  const h = agora.getHours();
  const fracHora = (agora.getMinutes() * 60 + agora.getSeconds()) / 3600;
  let acc = 0;
  for (let i = 0; i < h; i++) acc += PERFIL_HORA[i];
  acc += PERFIL_HORA[h] * fracHora;
  return Math.min(1, acc / PERFIL_SOMA);
}
/** consumo instantâneo (kg/s) considerando o perfil intradiário */
function consumoInstantaneoKgS(consumoDiaKg: number, agora: Date): number {
  const peso = PERFIL_HORA[agora.getHours()] / PERFIL_SOMA; // fração daquela hora
  return (consumoDiaKg * peso) / 3600;
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
  lote_id?: string | null;    // lote da granja ao qual a entrega pertence
};

function fmtKg(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 2)} t`;
  return `${n.toLocaleString("pt-BR")} kg`;
}
function todayISO() { return new Date().toISOString().slice(0, 10); }

function EntregasRacaoPage() {
  const { client, fazendaId } = useFazenda();
  const [todas, setTodas] = useState<Entrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [lotes] = useLotes();

  // Lote ativo (mais recente não encerrado) — todo o controle de ração é por lote
  const loteAtivo = useMemo(() => {
    const ativos = lotes.filter(l => !l.encerrado);
    return [...ativos].sort((a, b) => b.dataEntrada.localeCompare(a.dataEntrada))[0] || null;
  }, [lotes]);

  // Entregas do lote ativo (inclui registros antigos sem lote feitos após o alojamento)
  const entregas = useMemo(() => {
    if (!loteAtivo) return todas.filter(e => !e.lote_id);
    return todas.filter(e => e.lote_id === loteAtivo.id || (!e.lote_id && e.data >= loteAtivo.dataEntrada));
  }, [todas, loteAtivo]);

  const entregasOutrosLotes = useMemo(
    () => todas.filter(e => !entregas.includes(e)),
    [todas, entregas]
  );

  const setEntregas = setTodas;

  useEffect(() => {
    if (!fazendaId) { setLoading(false); return; }
    let cancel = false;
    client.from("entregas_racao").select("*").order("data", { ascending: false })
      .then(({ data }) => {
        if (cancel) return;
        setTodas((data as any[]) || []);
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
    if (!loteAtivo) { toast.error("Cadastre um lote ativo na Granja antes de lançar entregas"); return; }
    const { data, error } = await client.from("entregas_racao")
      .insert({ ...e, fazenda_id: fazendaId, lote_id: loteAtivo.id }).select().single();
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

        <Card className="p-3 flex flex-wrap items-center gap-2 text-sm">
          <Drumstick className="h-4 w-4 text-primary" />
          {loteAtivo ? (
            <>
              <span className="font-semibold">Lote {loteAtivo.numero}</span>
              <Badge variant="outline" className="text-[10px]">
                alojado em {new Date(loteAtivo.dataEntrada + "T00:00").toLocaleDateString("pt-BR")}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Todas as entregas e o estoque abaixo são só deste lote — ao iniciar um novo lote tudo começa zerado.
              </span>
              {entregasOutrosLotes.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">{entregasOutrosLotes.length} entrega(s) de lotes anteriores ocultas</Badge>
              )}
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Nenhum lote ativo — cadastre um lote na Granja para registrar entregas.</span>
          )}
        </Card>



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



  // Relógio ao vivo (1 s) e recálculo do motor (1 min)
  const [agora, setAgora] = useState(() => new Date());
  const [tickMin, setTickMin] = useState(0);
  useEffect(() => {
    const s = setInterval(() => setAgora(new Date()), 1000);
    const m = setInterval(() => setTickMin((v) => v + 1), 60000);
    return () => { clearInterval(s); clearInterval(m); };
  }, []);

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

    // ---- Calibração pela última pesagem real ----
    const idadePesagem = cfg.pesoMedioRealData
      ? Math.max(0, Math.round((new Date(cfg.pesoMedioRealData + "T00:00").getTime() - aloj.getTime()) / 86400000))
      : (cfg.pesoMedioRealG ? idade : undefined);
    const cal = criarCalib(cfg.pesoMedioRealG, idadePesagem, lin, sx);
    const usandoPesoReal = !!cal;
    const diasDesdePesagem = cal ? idade - cal.idadePesagem : null;

    const consumoAcumOntemKg = (consumoCalibradoAcumG(Math.max(0, idade - 1), lin, sx, cal) * avesMediasParaConsumo) / 1000;
    const consumoHojeKg = (consumoCalibradoDiaG(idade, lin, sx, cal) * avesVivas) / 1000;
    const consumoAcumKg = consumoAcumOntemKg + consumoHojeKg;
    const estoqueMeiaNoiteKg = totalEntregueKg - consumoAcumOntemKg;
    const estoqueKg = totalEntregueKg - consumoAcumKg;

    // Peso médio calibrado (curva reescalada pela pesagem)
    const pesoMedioCurvaKg = pesoMedioGPorAve(idade, lin, sx) / 1000;
    const pesoMedioKg = pesoCalibradoG(idade, lin, sx, cal) / 1000;
    const pesoTotalLoteKg = pesoMedioKg * avesVivas;
    const diasRestantes = consumoHojeKg > 0 ? estoqueKg / consumoHojeKg : 0;
    // CA real = ração consumida ÷ peso vivo produzido
    const racaoConsumidaKg = Math.min(totalEntregueKg, consumoAcumKg);
    const caReal = pesoTotalLoteKg > 0 ? racaoConsumidaKg / pesoTotalLoteKg : 0;
    const caTarget = caAlvo(idade, lin, sx);
    const caStatus = classificaCA(caReal, caTarget);
    const desvioPesoPct = cal && pesoMedioCurvaKg > 0
      ? ((cfg.pesoMedioRealG! / 1000) - (pesoMedioGPorAve(cal.idadePesagem, lin, sx) / 1000)) / (pesoMedioGPorAve(cal.idadePesagem, lin, sx) / 1000) * 100
      : null;

    // Confiança do modelo: cai com o tempo desde a última pesagem
    const confianca = cal
      ? Math.max(45, Math.round(98 - Math.max(0, diasDesdePesagem ?? 0) * 3))
      : 62;

    // Projeção 14 dias + data prevista de ruptura do estoque
    const proj: { dia: string; idade: number; consumo: number; estoque: number; peso: number }[] = [];
    let estoque = estoqueKg;
    let rupturaData: string | null = null;
    for (let i = 1; i <= 14; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      const idd = idade + i;
      const c = (consumoCalibradoDiaG(idd, lin, sx, cal) * avesVivas) / 1000;
      estoque -= c;
      if (estoque <= 0 && !rupturaData) rupturaData = d.toLocaleDateString("pt-BR");
      proj.push({
        dia: d.toISOString().slice(5, 10).split("-").reverse().join("/"),
        idade: idd,
        consumo: Math.round(c),
        estoque: Math.round(estoque),
        peso: Math.round(pesoCalibradoG(idd, lin, sx, cal)),
      });
    }
    return {
      idade, avesVivas, baixas, consumoAcumKg, consumoHojeKg, estoqueKg, estoqueMeiaNoiteKg,
      pesoMedioKg, pesoMedioCurvaKg, pesoTotalLoteKg, diasRestantes, proj, caReal, caTarget, caStatus,
      usandoPesoReal, desvioPesoPct, cal, diasDesdePesagem, confianca, rupturaData,
    };
    // tickMin força recálculo do motor a cada minuto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg, totalEntregueKg, tickMin]);

  // Estoque ao vivo (perfil intradiário de consumo, atualiza a cada segundo)
  const live = useMemo(() => {
    if (!calc) return null;
    const frac = fracaoDiaConsumida(agora);
    const consumidoHojeKg = calc.consumoHojeKg * frac;
    const estoqueAgoraKg = calc.estoqueMeiaNoiteKg - consumidoHojeKg;
    const kgPorSeg = consumoInstantaneoKgS(calc.consumoHojeKg, agora);
    const horasAutonomia = kgPorSeg > 0 ? estoqueAgoraKg / (calc.consumoHojeKg / 24) : 0;
    return { frac, consumidoHojeKg, estoqueAgoraKg, kgPorSeg, gPorSeg: kgPorSeg * 1000, horasAutonomia };
  }, [calc, agora]);



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
        <div className="space-y-3 p-3 rounded-md bg-muted/30">
          {loteAtivo && (
            <div className="flex items-center justify-between gap-2 p-2 rounded bg-background border">
              <div className="text-xs">
                <p className="font-semibold">Vínculo com a Granja</p>
                <p className="text-muted-foreground">
                  {manual
                    ? "Editando manualmente. Os dados do lote da Granja estão ignorados."
                    : <>Puxando automaticamente do <b>Lote {loteAtivo.numero}</b>.</>}
                </p>
              </div>
              <Button size="sm" variant={manual ? "default" : "outline"} onClick={() => setManual(v => !v)}>
                {manual ? "Voltar ao automático" : "Editar manualmente"}
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Data de alojamento (D0)</Label>
            <Input type="date" value={cfg.dataAlojamento} disabled={!manual && !!loteAtivo}
              onChange={e => setCfg({ ...cfg, dataAlojamento: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Aves alojadas (início)</Label>
            <Input type="number" inputMode="numeric" value={cfg.qtdInicial || ""} disabled={!manual && !!loteAtivo}
              onChange={e => setCfg({ ...cfg, qtdInicial: Number(e.target.value) || 0 })} placeholder="Ex: 25000" />
          </div>
          <div>
            <Label className="text-xs">Mortalidade acumulada</Label>
            <Input type="number" inputMode="numeric" value={cfg.mortalidadeAcum || ""} disabled={!manual && !!loteAtivo}
              onChange={e => setCfg({ ...cfg, mortalidadeAcum: Number(e.target.value) || 0 })} placeholder="Aves mortas" />
          </div>
          <div>
            <Label className="text-xs">Eliminados acumulado</Label>
            <Input type="number" inputMode="numeric" value={cfg.eliminadosAcum || ""} disabled={!manual && !!loteAtivo}
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
            <Input type="number" inputMode="decimal" value={cfg.pesoMedioRealG || ""} disabled={!manual && !!loteAtivo}
              onChange={e => setCfg({ ...cfg, pesoMedioRealG: Number(e.target.value) || undefined })} placeholder="Ex: 2200 — deixe vazio para usar curva" />
            <p className="text-[10px] text-muted-foreground mt-1">
              {!manual && loteAtivo
                ? "Puxado da última pesagem registrada na Granja."
                : "Se informado, sobrescreve a curva no cálculo de CA, peso vivo e estoque."}
            </p>
          </div>
          <div>
            <Label className="text-xs">Data da pesagem real</Label>
            <Input type="date" value={cfg.pesoMedioRealData || ""} disabled={!manual && !!loteAtivo}
              onChange={e => setCfg({ ...cfg, pesoMedioRealData: e.target.value || undefined })} />
          </div>
          </div>
        </div>
      )}




      {!calc ? (
        <p className="text-sm text-muted-foreground text-center p-6">
          Clique em <b>Configurar lote</b> e informe a data de alojamento e o número de aves para ver o estoque estimado.
        </p>
      ) : (
        <>
          {/* ===== Painel AO VIVO ===== */}
          {live && (
            <div className="rounded-xl border p-4 bg-gradient-to-br from-primary/10 via-transparent to-transparent">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                  <h4 className="text-sm font-semibold">Estoque ao vivo</h4>
                  <Badge variant="outline" className="text-[10px]">{agora.toLocaleTimeString("pt-BR")}</Badge>
                  <Badge variant="secondary" className="text-[10px]">motor recalculado a cada 1 min</Badge>
                  <Badge className={`text-[10px] ${calc.confianca >= 85 ? "bg-emerald-600 text-white" : calc.confianca >= 65 ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"}`}>
                    precisão {calc.confianca}%
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {calc.cal
                    ? <>Curva recalibrada pela pesagem de D{calc.cal.idadePesagem} (fator {calc.cal.fator.toFixed(3)}× · há {calc.diasDesdePesagem} d)</>
                    : "Sem pesagem real — usando curva padrão da linhagem"}
                </p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
                <div className="p-3 rounded-lg bg-background/70 border">
                  <p className="text-[10px] uppercase text-muted-foreground">Ração no silo agora</p>
                  <p className={`font-display text-2xl font-bold tabular-nums ${live.estoqueAgoraKg <= 0 ? "text-destructive" : ""}`}>
                    {live.estoqueAgoraKg.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal">kg</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">{(live.estoqueAgoraKg / 1000).toFixed(3)} t</p>
                </div>
                <div className="p-3 rounded-lg bg-background/70 border">
                  <p className="text-[10px] uppercase text-muted-foreground">Consumo instantâneo</p>
                  <p className="font-display text-2xl font-bold tabular-nums">{live.gPorSeg.toFixed(1)} <span className="text-xs font-normal">g/s</span></p>
                  <p className="text-[10px] text-muted-foreground">{(live.kgPorSeg * 3600).toFixed(1)} kg/h · perfil intradiário</p>
                </div>
                <div className="p-3 rounded-lg bg-background/70 border">
                  <p className="text-[10px] uppercase text-muted-foreground">Consumido hoje</p>
                  <p className="font-display text-2xl font-bold tabular-nums">{live.consumidoHojeKg.toFixed(1)} <span className="text-xs font-normal">kg</span></p>
                  <p className="text-[10px] text-muted-foreground">{(live.frac * 100).toFixed(1)}% do dia · meta {Math.round(calc.consumoHojeKg)} kg</p>
                </div>
                <div className="p-3 rounded-lg bg-background/70 border">
                  <p className="text-[10px] uppercase text-muted-foreground">Autonomia</p>
                  <p className={`font-display text-2xl font-bold tabular-nums ${live.horasAutonomia < 24 ? "text-destructive" : ""}`}>
                    {live.horasAutonomia > 0 ? `${Math.floor(live.horasAutonomia)}h ${Math.round((live.horasAutonomia % 1) * 60)}m` : "0h"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{calc.rupturaData ? `Ruptura prevista ${calc.rupturaData}` : "Sem ruptura em 14 dias"}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Idade do lote" value={`D${calc.idade}`} hint={`${calc.avesVivas.toLocaleString("pt-BR")} aves vivas${calc.baixas ? ` · ${calc.baixas} baixas` : ""}`} icon={CalIcon} tone="primary" />
            <StatCard
              label={calc.usandoPesoReal ? "Peso esperado (calibrado)" : "Peso médio (curva)"}
              value={`${calc.pesoMedioKg.toFixed(3)} kg`}
              hint={calc.desvioPesoPct != null
                ? `${calc.desvioPesoPct >= 0 ? "+" : ""}${calc.desvioPesoPct.toFixed(1)}% vs curva na pesagem · lote ≈ ${fmtKg(Math.round(calc.pesoTotalLoteKg))}`
                : `Lote ≈ ${fmtKg(Math.round(calc.pesoTotalLoteKg))}`}
              icon={Scale}
              tone="accent"
            />
            <StatCard label="Consumo hoje" value={fmtKg(Math.round(calc.consumoHojeKg))} hint={`${Math.round(consumoCalibradoDiaG(calc.idade, cfg.linhagem, cfg.sexo, calc.cal))} g/ave/dia`} icon={Drumstick} tone="muted" />
            <StatCard
              label="Estoque fim do dia"
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
              Interpolação diária a partir das idades-marco. {calc.cal
                ? <>A coluna <b>Peso projetado</b> está <b>recalibrada</b> pela última pesagem real (fator {calc.cal.fator.toFixed(3)}× em D{calc.cal.idadePesagem}, amortecido ao longo dos dias).</>
                : <>Registre uma pesagem para o sistema recalibrar toda a projeção.</>}
            </p>
            <div className="overflow-x-auto rounded border">
              <table className="w-full text-[11px]">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 text-left">Idade</th>
                    <th className="px-2 py-1.5 text-right">Peso padrão</th>
                    <th className="px-2 py-1.5 text-right">Peso projetado</th>
                    <th className="px-2 py-1.5 text-right">GPD</th>
                    <th className="px-2 py-1.5 text-right">Ração/dia</th>
                    <th className="px-2 py-1.5 text-right">Ração acum.</th>
                    <th className="px-2 py-1.5 text-right">CA alvo</th>
                    <th className="px-2 py-1.5 text-right">Lote/dia</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 50 }, (_, d) => {
                    const pesoPadrao = pesoMedioGPorAve(d, cfg.linhagem, cfg.sexo);
                    const pesoAve = pesoCalibradoG(d, cfg.linhagem, cfg.sexo, calc.cal);
                    const pesoOnt = d > 0 ? pesoCalibradoG(d - 1, cfg.linhagem, cfg.sexo, calc.cal) : pesoAve;
                    const gpd = pesoAve - pesoOnt;
                    const racDia = consumoCalibradoDiaG(d, cfg.linhagem, cfg.sexo, calc.cal);
                    const racAcum = consumoCalibradoAcumG(d, cfg.linhagem, cfg.sexo, calc.cal);
                    const ca = pesoAve > 0 ? racAcum / pesoAve : 0;
                    const loteDiaKg = (racDia * calc.avesVivas) / 1000;
                    const idadeAtual = d === calc.idade;
                    const pesagem = calc.cal && d === calc.cal.idadePesagem;
                    const marco = [0, 4, 7, 14, 21, 28, 35, 42, 49].includes(d);
                    const dif = pesoAve - pesoPadrao;
                    return (
                      <tr key={d} className={`border-t ${idadeAtual ? "bg-primary/10 font-semibold" : pesagem ? "bg-emerald-500/10" : marco ? "bg-muted/20" : ""}`}>
                        <td className="px-2 py-1">D{d}{idadeAtual && <span className="ml-1 text-[9px] text-primary">HOJE</span>}{pesagem && <span className="ml-1 text-[9px] text-emerald-600">PESAGEM</span>}</td>
                        <td className="px-2 py-1 text-right text-muted-foreground">{Math.round(pesoPadrao)} g</td>
                        <td className={`px-2 py-1 text-right font-semibold ${dif > 5 ? "text-emerald-600" : dif < -5 ? "text-destructive" : ""}`}>{Math.round(pesoAve)} g</td>
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
