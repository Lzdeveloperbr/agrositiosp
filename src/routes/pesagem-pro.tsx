import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import {
  Scale, Plus, Trash2, Download, Printer, Target, TrendingUp, Activity, AlertTriangle,
  CheckCircle2, Users, Bird, Calendar, Copy,
} from "lucide-react";
import { useFazenda } from "@/lib/cloud/fazenda";
import { CURVAS, metaPeso, type Linhagem, LINHAGEM_LABEL } from "@/lib/linhagens";
import { toast } from "sonner";
import { diffDias, fmtData, hojeISO, isoLocal, parseData } from "@/lib/data";

export const Route = createFileRoute("/pesagem-pro")({
  head: () => ({
    meta: [
      { title: "Pesagem de Frangos — AgroSítio" },
      { name: "description", content: "Pesagem profissional de frangos com peso esperado, uniformidade, GPD e comparação por linhagem." },
      { property: "og:title", content: "Pesagem de Frangos — AgroSítio" },
      { property: "og:description", content: "Acompanhe peso, uniformidade e ganho diário do lote." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PesagemPro,
});

// ===== Tipos =====
type Sexo = "macho" | "femea" | "misto";
type Registro = { id: string; sexo: Sexo; pesoG: number };
type Pesagem = {
  id: string;
  loteId: string;
  data: string; // ISO
  idadeDias: number;
  operador?: string;
  registros: Registro[];
  obs?: string;
  vacinacao?: string;
  racao?: string;
  tempC?: number;
  umidade?: number;
  mortalidade?: number;
  consumoAgua?: number;
  consumoRacao?: number;
};
type LotePesagem = {
  id: string;
  nome: string;
  linhagem: Linhagem;
  dataAlojamento: string;
  quantidade: number;
  aviario?: string;
  responsavel?: string;
  intervaloDias: number;
  metaCustom?: Record<number, number>; // idade -> peso g
};
type Store = { lotes: LotePesagem[]; pesagens: Pesagem[]; loteAtivo?: string };

// ===== Storage =====
function useStore(scope: string) {
  const key = `pesagem_pro_v2_${scope || "default"}`;
  const [data, setData] = useState<Store>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as Store;
    } catch {}
    return { lotes: [], pesagens: [] };
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
  }, [key, data]);
  return [data, setData] as const;
}

// ===== Utils =====
const uid = () => Math.random().toString(36).slice(2, 10);
const daysBetween = (iso: string, ref: Date = new Date()) => {
  return Math.max(0, diffDias(iso, ref));
};
const fmtDate = (iso: string) => parseData(iso)?.toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" }) ?? "—";
const fmtDay = (iso: string) => fmtData(iso);
const mean = (xs: number[]) => xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : 0;
const std = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs); return Math.sqrt(xs.reduce((a,b)=>a+(b-m)**2,0)/(xs.length-1));
};
const cv = (xs: number[]) => { const m = mean(xs); return m > 0 ? (std(xs)/m)*100 : 0; };
const uniformidade = (xs: number[]) => {
  if (!xs.length) return 0;
  const m = mean(xs); const lo = m*0.9, hi = m*1.1;
  return (xs.filter(x => x>=lo && x<=hi).length / xs.length) * 100;
};

function statusVsMeta(real: number, meta: number) {
  if (meta <= 0) return { label: "—", color: "bg-muted text-muted-foreground", emoji: "⚪" };
  const diff = ((real - meta) / meta) * 100;
  if (diff >= 2) return { label: `+${diff.toFixed(1)}% acima`, color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", emoji: "🟢" };
  if (diff > -2) return { label: `${diff.toFixed(1)}% na meta`, color: "bg-amber-500/15 text-amber-400 border-amber-500/30", emoji: "🟡" };
  return { label: `${diff.toFixed(1)}% abaixo`, color: "bg-red-500/15 text-red-400 border-red-500/30", emoji: "🔴" };
}

// ===== Component =====
function PesagemPro() {
  const { codigo } = useFazenda();
  const [store, setStore] = useStore(codigo ?? "default");
  const [tab, setTab] = useState("dashboard");

  const loteAtivo = store.lotes.find(l => l.id === store.loteAtivo) ?? store.lotes[0];
  const pesagensLote = useMemo(
    () => loteAtivo ? store.pesagens.filter(p => p.loteId === loteAtivo.id).sort((a,b)=>a.data.localeCompare(b.data)) : [],
    [store.pesagens, loteAtivo],
  );

  const setLoteAtivo = (id: string) => setStore(s => ({ ...s, loteAtivo: id }));
  const addLote = (l: LotePesagem) => setStore(s => ({ ...s, lotes: [...s.lotes, l], loteAtivo: l.id }));
  const delLote = (id: string) => {
    if (!confirm("Excluir lote e todas as pesagens?")) return;
    setStore(s => ({ ...s, lotes: s.lotes.filter(x=>x.id!==id), pesagens: s.pesagens.filter(p=>p.loteId!==id) }));
  };
  const addPesagem = (p: Pesagem) => setStore(s => ({ ...s, pesagens: [...s.pesagens, p] }));
  const updPesagem = (p: Pesagem) => setStore(s => ({ ...s, pesagens: s.pesagens.map(x => x.id===p.id?p:x) }));
  const delPesagem = (id: string) => setStore(s => ({ ...s, pesagens: s.pesagens.filter(x=>x.id!==id) }));
  const dupPesagem = (id: string) => {
    const p = store.pesagens.find(x=>x.id===id); if (!p) return;
    const novo: Pesagem = { ...p, id: uid(), data: new Date().toISOString() };
    addPesagem(novo); toast.success("Pesagem duplicada");
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <Scale className="h-7 w-7 text-primary" /> Pesagem Pro
          </h1>
          <p className="text-muted-foreground text-sm">Controle profissional de pesagem — dia 0 ao 45, machos e fêmeas, meta vs realizado.</p>
        </div>
        <div className="flex items-center gap-2">
          {store.lotes.length > 0 && (
            <Select value={loteAtivo?.id ?? ""} onValueChange={setLoteAtivo}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Selecionar lote" /></SelectTrigger>
              <SelectContent>
                {store.lotes.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.nome} · {LINHAGEM_LABEL[l.linhagem]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 md:grid-cols-7 w-full">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="lotes">Lotes</TabsTrigger>
          <TabsTrigger value="nova" disabled={!loteAtivo}>Nova</TabsTrigger>
          <TabsTrigger value="historico" disabled={!loteAtivo}>Histórico</TabsTrigger>
          <TabsTrigger value="graficos" disabled={!loteAtivo}>Gráficos</TabsTrigger>
          <TabsTrigger value="metas" disabled={!loteAtivo}>Metas</TabsTrigger>
          <TabsTrigger value="relatorio" disabled={!loteAtivo}>Relatório</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          {!loteAtivo ? <EmptyState onCreate={()=>setTab("lotes")} /> : <Dashboard lote={loteAtivo} pesagens={pesagensLote} />}
        </TabsContent>
        <TabsContent value="lotes" className="mt-4">
          <LotesPanel lotes={store.lotes} loteAtivoId={loteAtivo?.id} onAdd={addLote} onDel={delLote} onSelect={setLoteAtivo} />
        </TabsContent>
        <TabsContent value="nova" className="mt-4">
          {loteAtivo && <NovaPesagem lote={loteAtivo} onSave={(p)=>{ addPesagem(p); toast.success("Pesagem salva"); setTab("historico"); }} />}
        </TabsContent>
        <TabsContent value="historico" className="mt-4">
          {loteAtivo && <Historico lote={loteAtivo} pesagens={pesagensLote} onUpd={updPesagem} onDel={delPesagem} onDup={dupPesagem} />}
        </TabsContent>
        <TabsContent value="graficos" className="mt-4">
          {loteAtivo && <Graficos lote={loteAtivo} pesagens={pesagensLote} />}
        </TabsContent>
        <TabsContent value="metas" className="mt-4">
          {loteAtivo && <MetasPanel lote={loteAtivo} onChange={(meta)=>setStore(s=>({...s, lotes: s.lotes.map(l=>l.id===loteAtivo.id?{...l, metaCustom: meta}:l)}))} />}
        </TabsContent>
        <TabsContent value="relatorio" className="mt-4">
          {loteAtivo && <Relatorio lote={loteAtivo} pesagens={pesagensLote} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ===== Empty =====
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card>
      <CardContent className="py-16 text-center space-y-3">
        <Bird className="h-12 w-12 mx-auto text-muted-foreground" />
        <div className="text-lg font-semibold">Nenhum lote cadastrado</div>
        <p className="text-sm text-muted-foreground">Crie seu primeiro lote para começar as pesagens profissionais.</p>
        <Button onClick={onCreate}><Plus className="h-4 w-4 mr-1" />Criar lote</Button>
      </CardContent>
    </Card>
  );
}

// ===== Dashboard =====
function Dashboard({ lote, pesagens }: { lote: LotePesagem; pesagens: Pesagem[] }) {
  const idade = daysBetween(lote.dataAlojamento);
  const hoje = hojeISO();
  const hojeP = pesagens.filter(p => p.data.slice(0,10) === hoje);
  const total = pesagens.flatMap(p=>p.registros);

  const ultima = pesagens[pesagens.length-1];
  const penultima = pesagens[pesagens.length-2];

  const pesos = ultima ? ultima.registros.map(r=>r.pesoG) : [];
  const machos = ultima ? ultima.registros.filter(r=>r.sexo==="macho").map(r=>r.pesoG) : [];
  const femeas = ultima ? ultima.registros.filter(r=>r.sexo==="femea").map(r=>r.pesoG) : [];
  const medio = mean(pesos);
  const mMacho = mean(machos);
  const mFemea = mean(femeas);

  const ganhoDesde = ultima && penultima ? mean(ultima.registros.map(r=>r.pesoG)) - mean(penultima.registros.map(r=>r.pesoG)) : 0;
  const diasEntre = ultima && penultima ? Math.max(1, daysBetween(penultima.data, new Date(ultima.data))) : 1;
  const gmd = ganhoDesde / diasEntre;

  const metaHoje = lote.metaCustom?.[ultima?.idadeDias ?? idade] ?? metaPeso(lote.linhagem, ultima?.idadeDias ?? idade);
  const st = statusVsMeta(medio, metaHoje);

  const proxData = ultima ? new Date(new Date(ultima.data).getTime() + lote.intervaloDias * 86400000) : new Date();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={<Calendar className="h-4 w-4"/>} label="Idade" value={`${idade} dias`} hint={fmtDay(lote.dataAlojamento)} />
        <KPI icon={<Users className="h-4 w-4"/>} label="Aves pesadas hoje" value={String(hojeP.reduce((a,p)=>a+p.registros.length,0))} hint={`${total.length} no total`} />
        <KPI icon={<Scale className="h-4 w-4"/>} label="Peso médio última" value={medio?`${medio.toFixed(0)} g`:"—"} hint={ultima?`Dia ${ultima.idadeDias}`:"sem registro"} />
        <KPI icon={<Target className="h-4 w-4"/>} label="Meta dia" value={`${metaHoje} g`} hint={st.label} hintClass={st.color.split(" ")[1]} />
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Machos (última)</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{mMacho?`${mMacho.toFixed(0)} g`:"—"}<div className="text-xs text-muted-foreground">{machos.length} aves</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Fêmeas (última)</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{mFemea?`${mFemea.toFixed(0)} g`:"—"}<div className="text-xs text-muted-foreground">{femeas.length} aves</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">GMD desde última</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{gmd?`${gmd.toFixed(1)} g/dia`:"—"}<div className="text-xs text-muted-foreground">{diasEntre} dias intervalo</div></CardContent></Card>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4"/>Status do lote</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Badge className={`${st.color} border`}>{st.emoji} {st.label}</Badge>
            <div className="text-sm text-muted-foreground">
              Uniformidade: <b className="text-foreground">{uniformidade(pesos).toFixed(1)}%</b> ·
              CV: <b className="text-foreground">{cv(pesos).toFixed(1)}%</b>
            </div>
            <div className="text-xs text-muted-foreground">
              Última pesagem: {ultima ? fmtDate(ultima.data) : "—"}<br/>
              Próxima programada: {ultima ? fmtDay(proxData.toISOString()) : "Agendar primeira pesagem"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Evolução peso x meta</CardTitle></CardHeader>
          <CardContent className="h-48">
            <MiniCurva lote={lote} pesagens={pesagens} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPI({ icon, label, value, hint, hintClass }: { icon: React.ReactNode; label: string; value: string; hint?: string; hintClass?: string }) {
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {hint && <div className={`text-xs ${hintClass ?? "text-muted-foreground"}`}>{hint}</div>}
    </CardContent></Card>
  );
}

function MiniCurva({ lote, pesagens }: { lote: LotePesagem; pesagens: Pesagem[] }) {
  const data = pesagens.map(p => ({
    dia: p.idadeDias,
    real: Math.round(mean(p.registros.map(r=>r.pesoG))),
    meta: lote.metaCustom?.[p.idadeDias] ?? metaPeso(lote.linhagem, p.idadeDias),
  }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.2}/>
        <XAxis dataKey="dia" tick={{fontSize:11}}/>
        <YAxis tick={{fontSize:11}}/>
        <Tooltip contentStyle={{background:"hsl(var(--card))", border:"1px solid hsl(var(--border))"}}/>
        <Legend />
        <Line type="monotone" dataKey="meta" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" name="Meta"/>
        <Line type="monotone" dataKey="real" stroke="hsl(var(--primary))" strokeWidth={2} name="Real"/>
      </LineChart>
    </ResponsiveContainer>
  );
}

// ===== Lotes =====
function LotesPanel({ lotes, loteAtivoId, onAdd, onDel, onSelect }: {
  lotes: LotePesagem[]; loteAtivoId?: string;
  onAdd: (l: LotePesagem) => void; onDel: (id: string) => void; onSelect: (id: string)=>void;
}) {
  const [f, setF] = useState<Partial<LotePesagem>>({
    linhagem: "cobb500", dataAlojamento: hojeISO(), intervaloDias: 7,
  });
  const submit = () => {
    if (!f.nome || !f.dataAlojamento || !f.quantidade) return toast.error("Preencha nome, data e quantidade");
    onAdd({
      id: uid(), nome: f.nome!, linhagem: (f.linhagem ?? "cobb500") as Linhagem,
      dataAlojamento: f.dataAlojamento!, quantidade: Number(f.quantidade),
      aviario: f.aviario, responsavel: f.responsavel, intervaloDias: Number(f.intervaloDias ?? 7),
    });
    setF({ linhagem:"cobb500", dataAlojamento:hojeISO(), intervaloDias:7 });
    toast.success("Lote criado");
  };
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Novo lote</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Nome do lote</Label><Input value={f.nome ?? ""} onChange={e=>setF({...f, nome:e.target.value})} placeholder="Lote 12 - Aviário 1"/></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Linhagem</Label>
              <Select value={f.linhagem} onValueChange={v=>setF({...f, linhagem: v as Linhagem})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cobb500">Cobb 500</SelectItem>
                  <SelectItem value="ross308">Ross 308</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Alojamento</Label><Input type="date" value={f.dataAlojamento ?? ""} onChange={e=>setF({...f, dataAlojamento:e.target.value})}/></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Quantidade aves</Label><Input type="number" value={f.quantidade ?? ""} onChange={e=>setF({...f, quantidade:Number(e.target.value)})}/></div>
            <div><Label>Intervalo (dias)</Label><Input type="number" value={f.intervaloDias ?? 7} onChange={e=>setF({...f, intervaloDias:Number(e.target.value)})}/></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Aviário</Label><Input value={f.aviario ?? ""} onChange={e=>setF({...f, aviario:e.target.value})}/></div>
            <div><Label>Responsável</Label><Input value={f.responsavel ?? ""} onChange={e=>setF({...f, responsavel:e.target.value})}/></div>
          </div>
          <Button onClick={submit} className="w-full"><Plus className="h-4 w-4 mr-1"/>Criar lote</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Lotes ({lotes.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {lotes.length === 0 && <div className="text-sm text-muted-foreground">Nenhum lote.</div>}
          {lotes.map(l => {
            const idade = daysBetween(l.dataAlojamento);
            return (
              <div key={l.id} className={`p-3 rounded-md border ${l.id===loteAtivoId?"border-primary bg-primary/5":"border-border"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{l.nome}</div>
                    <div className="text-xs text-muted-foreground">{LINHAGEM_LABEL[l.linhagem]} · {l.quantidade.toLocaleString("pt-BR")} aves · {idade}d</div>
                    {l.aviario && <div className="text-xs text-muted-foreground">Aviário {l.aviario}{l.responsavel?` · ${l.responsavel}`:""}</div>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={()=>onSelect(l.id)}>Selecionar</Button>
                    <Button size="sm" variant="ghost" onClick={()=>onDel(l.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

// ===== Nova Pesagem =====
function NovaPesagem({ lote, onSave }: { lote: LotePesagem; onSave: (p: Pesagem) => void }) {
  const idadeAuto = daysBetween(lote.dataAlojamento);
  const [data, setData] = useState(() => {
    const agora = new Date();
    return `${isoLocal(agora)}T${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
  });
  const [idadeDias, setIdadeDias] = useState(idadeAuto);
  const [operador, setOperador] = useState("");
  const [obs, setObs] = useState("");
  const [vac, setVac] = useState("");
  const [rac, setRac] = useState("");
  const [temp, setTemp] = useState<number|undefined>();
  const [umid, setUmid] = useState<number|undefined>();
  const [mort, setMort] = useState<number|undefined>();
  const [agua, setAgua] = useState<number|undefined>();
  const [racK, setRacK] = useState<number|undefined>();
  const [regs, setRegs] = useState<Registro[]>([]);
  const [sexoIn, setSexoIn] = useState<Sexo>("macho");
  const [pesoIn, setPesoIn] = useState("");

  const add = () => {
    const v = Number(pesoIn);
    if (!v || v <= 0) return toast.error("Peso inválido");
    setRegs(r => [...r, { id: uid(), sexo: sexoIn, pesoG: v }]);
    setPesoIn("");
  };
  const addLote = (vals: string) => {
    const novos: Registro[] = vals.split(/[\s,;]+/).filter(Boolean).map(v=>({id:uid(), sexo:sexoIn, pesoG:Number(v)})).filter(r=>r.pesoG>0);
    if (!novos.length) return toast.error("Cole pesos separados por espaço/vírgula");
    setRegs(r => [...r, ...novos]); toast.success(`${novos.length} pesos adicionados`);
  };

  const pesos = regs.map(r=>r.pesoG);
  const mAll = mean(pesos);
  const mM = mean(regs.filter(r=>r.sexo==="macho").map(r=>r.pesoG));
  const mF = mean(regs.filter(r=>r.sexo==="femea").map(r=>r.pesoG));
  const meta = lote.metaCustom?.[idadeDias] ?? metaPeso(lote.linhagem, idadeDias);
  const st = statusVsMeta(mAll, meta);

  const salvar = () => {
    if (!regs.length) return toast.error("Adicione pelo menos uma pesagem");
    onSave({
      id: uid(), loteId: lote.id, data: new Date(data).toISOString(), idadeDias,
      operador, registros: regs, obs, vacinacao: vac, racao: rac,
      tempC: temp, umidade: umid, mortalidade: mort, consumoAgua: agua, consumoRacao: racK,
    });
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Dados da pesagem</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Data/hora</Label><Input type="datetime-local" value={data} onChange={e=>setData(e.target.value)}/></div>
            <div><Label>Idade (dias)</Label><Input type="number" value={idadeDias} onChange={e=>setIdadeDias(Number(e.target.value))}/></div>
          </div>
          <div><Label>Operador</Label><Input value={operador} onChange={e=>setOperador(e.target.value)} placeholder="Quem realizou"/></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Vacinação</Label><Input value={vac} onChange={e=>setVac(e.target.value)} placeholder="Ex: Gumboro"/></div>
            <div><Label>Ração</Label><Input value={rac} onChange={e=>setRac(e.target.value)} placeholder="Inicial/Crescimento"/></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Temp °C</Label><Input type="number" value={temp??""} onChange={e=>setTemp(e.target.value?Number(e.target.value):undefined)}/></div>
            <div><Label>Umid %</Label><Input type="number" value={umid??""} onChange={e=>setUmid(e.target.value?Number(e.target.value):undefined)}/></div>
            <div><Label>Mort.</Label><Input type="number" value={mort??""} onChange={e=>setMort(e.target.value?Number(e.target.value):undefined)}/></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Água (L)</Label><Input type="number" value={agua??""} onChange={e=>setAgua(e.target.value?Number(e.target.value):undefined)}/></div>
            <div><Label>Ração (kg)</Label><Input type="number" value={racK??""} onChange={e=>setRacK(e.target.value?Number(e.target.value):undefined)}/></div>
          </div>
          <div><Label>Observações</Label><Textarea rows={2} value={obs} onChange={e=>setObs(e.target.value)}/></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Pesos individuais</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Select value={sexoIn} onValueChange={v=>setSexoIn(v as Sexo)}>
              <SelectTrigger className="w-28"><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="macho">Macho</SelectItem>
                <SelectItem value="femea">Fêmea</SelectItem>
                <SelectItem value="misto">Misto</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Peso (g)" value={pesoIn} onChange={e=>setPesoIn(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()}/>
            <Button onClick={add}><Plus className="h-4 w-4"/></Button>
          </div>
          <Textarea rows={2} placeholder="Colar vários pesos (espaço/vírgula): 142 145 140 155 160" onBlur={e=>{ if(e.target.value){ addLote(e.target.value); e.target.value=""; }}}/>

          <div className="max-h-56 overflow-auto border rounded-md">
            <Table>
              <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Sexo</TableHead><TableHead>Peso (g)</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {regs.map((r,i) => (
                  <TableRow key={r.id}>
                    <TableCell>{i+1}</TableCell>
                    <TableCell className="capitalize">{r.sexo}</TableCell>
                    <TableCell>{r.pesoG}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={()=>setRegs(rs=>rs.filter(x=>x.id!==r.id))}><Trash2 className="h-3 w-3"/></Button></TableCell>
                  </TableRow>
                ))}
                {!regs.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum peso</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded border"><div className="text-muted-foreground">Média geral</div><div className="font-bold text-base">{mAll?mAll.toFixed(0):"—"} g</div></div>
            <div className="p-2 rounded border"><div className="text-muted-foreground">Machos</div><div className="font-bold text-base">{mM?mM.toFixed(0):"—"} g</div></div>
            <div className="p-2 rounded border"><div className="text-muted-foreground">Fêmeas</div><div className="font-bold text-base">{mF?mF.toFixed(0):"—"} g</div></div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded border"><div className="text-muted-foreground">Uniformidade</div><div className="font-bold">{uniformidade(pesos).toFixed(1)}%</div></div>
            <div className="p-2 rounded border"><div className="text-muted-foreground">CV</div><div className="font-bold">{cv(pesos).toFixed(1)}%</div></div>
            <div className="p-2 rounded border"><div className="text-muted-foreground">Meta · {idadeDias}d</div><div className="font-bold">{meta} g</div></div>
          </div>
          <Badge className={`${st.color} border w-full justify-center py-2`}>{st.emoji} {st.label}</Badge>

          <Button onClick={salvar} className="w-full" size="lg"><CheckCircle2 className="h-4 w-4 mr-1"/>Salvar pesagem</Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== Histórico =====
function Historico({ lote, pesagens, onDel, onDup }: {
  lote: LotePesagem; pesagens: Pesagem[];
  onUpd: (p: Pesagem)=>void; onDel: (id:string)=>void; onDup: (id:string)=>void;
}) {
  const [filtro, setFiltro] = useState("");
  const filtered = pesagens.filter(p => !filtro || p.data.includes(filtro) || p.operador?.toLowerCase().includes(filtro.toLowerCase()) || p.obs?.toLowerCase().includes(filtro.toLowerCase()));

  const exportCSV = () => {
    const rows = [["Data","Idade","Sexo","Peso(g)","Operador","Obs"]];
    for (const p of pesagens) for (const r of p.registros)
      rows.push([fmtDate(p.data), String(p.idadeDias), r.sexo, String(r.pesoG), p.operador??"", p.obs??""]);
    const csv = rows.map(r=>r.map(c=>`"${(c??"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF"+csv], {type:"text/csv"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `pesagens_${lote.nome}.csv`; a.click();
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Histórico ({pesagens.length})</CardTitle>
        <div className="flex gap-2">
          <Input className="w-48" placeholder="Filtrar..." value={filtro} onChange={e=>setFiltro(e.target.value)}/>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1"/>CSV</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Data</TableHead><TableHead>Idade</TableHead><TableHead>N</TableHead>
            <TableHead>Méd</TableHead><TableHead>♂</TableHead><TableHead>♀</TableHead>
            <TableHead>Unif%</TableHead><TableHead>CV%</TableHead><TableHead>Meta</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.slice().reverse().map(p => {
              const pesos = p.registros.map(r=>r.pesoG);
              const m = mean(pesos);
              const meta = lote.metaCustom?.[p.idadeDias] ?? metaPeso(lote.linhagem, p.idadeDias);
              const st = statusVsMeta(m, meta);
              return (
                <TableRow key={p.id}>
                  <TableCell className="text-xs">{fmtDate(p.data)}<br/><span className="text-muted-foreground">{p.operador}</span></TableCell>
                  <TableCell>{p.idadeDias}d</TableCell>
                  <TableCell>{p.registros.length}</TableCell>
                  <TableCell className="font-semibold">{m.toFixed(0)}</TableCell>
                  <TableCell>{mean(p.registros.filter(r=>r.sexo==="macho").map(r=>r.pesoG)).toFixed(0)||"—"}</TableCell>
                  <TableCell>{mean(p.registros.filter(r=>r.sexo==="femea").map(r=>r.pesoG)).toFixed(0)||"—"}</TableCell>
                  <TableCell>{uniformidade(pesos).toFixed(0)}</TableCell>
                  <TableCell>{cv(pesos).toFixed(1)}</TableCell>
                  <TableCell>{meta}</TableCell>
                  <TableCell><Badge className={`${st.color} border text-xs`}>{st.emoji}</Badge></TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={()=>onDup(p.id)}><Copy className="h-3 w-3"/></Button>
                    <Button size="sm" variant="ghost" onClick={()=>{ if(confirm("Excluir?")) onDel(p.id); }}><Trash2 className="h-3 w-3 text-destructive"/></Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {!filtered.length && <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">Sem pesagens</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ===== Gráficos =====
function Graficos({ lote, pesagens }: { lote: LotePesagem; pesagens: Pesagem[] }) {
  const data = pesagens.map(p => {
    const pesos = p.registros.map(r=>r.pesoG);
    const machos = p.registros.filter(r=>r.sexo==="macho").map(r=>r.pesoG);
    const femeas = p.registros.filter(r=>r.sexo==="femea").map(r=>r.pesoG);
    return {
      dia: p.idadeDias,
      geral: Math.round(mean(pesos)),
      machos: machos.length?Math.round(mean(machos)):null,
      femeas: femeas.length?Math.round(mean(femeas)):null,
      meta: lote.metaCustom?.[p.idadeDias] ?? metaPeso(lote.linhagem, p.idadeDias),
    };
  });
  const ganho = data.map((d,i) => ({ dia: d.dia, ganho: i>0 ? Math.round((d.geral-data[i-1].geral)/Math.max(1,d.dia-data[i-1].dia)) : 0 }));

  if (!data.length) return <Card><CardContent className="py-12 text-center text-muted-foreground">Sem dados para gráficos.</CardContent></Card>;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <ChartCard title="Evolução geral x Meta">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2}/><XAxis dataKey="dia"/><YAxis/><Tooltip contentStyle={{background:"hsl(var(--card))"}}/><Legend/>
          <Line type="monotone" dataKey="meta" stroke="#888" strokeDasharray="5 5" name="Meta"/>
          <Line type="monotone" dataKey="geral" stroke="hsl(var(--primary))" strokeWidth={2} name="Real"/>
        </LineChart>
      </ChartCard>
      <ChartCard title="Machos vs Fêmeas">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2}/><XAxis dataKey="dia"/><YAxis/><Tooltip contentStyle={{background:"hsl(var(--card))"}}/><Legend/>
          <Line type="monotone" dataKey="machos" stroke="#3b82f6" name="♂ Machos"/>
          <Line type="monotone" dataKey="femeas" stroke="#ec4899" name="♀ Fêmeas"/>
        </LineChart>
      </ChartCard>
      <ChartCard title="Ganho diário (GMD)">
        <BarChart data={ganho}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2}/><XAxis dataKey="dia"/><YAxis/><Tooltip contentStyle={{background:"hsl(var(--card))"}}/>
          <Bar dataKey="ganho" fill="hsl(var(--primary))" name="g/dia"/>
        </BarChart>
      </ChartCard>
      <ChartCard title="Meta x Resultado (diferença %)">
        <BarChart data={data.map(d=>({dia:d.dia, diff: d.meta?Number((((d.geral-d.meta)/d.meta)*100).toFixed(1)):0}))}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2}/><XAxis dataKey="dia"/><YAxis/><Tooltip contentStyle={{background:"hsl(var(--card))"}}/>
          <Bar dataKey="diff" fill="#10b981" name="% vs meta"/>
        </BarChart>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ===== Metas =====
function MetasPanel({ lote, onChange }: { lote: LotePesagem; onChange: (m: Record<number, number>) => void }) {
  const base = lote.metaCustom ?? Object.fromEntries(Array.from({length:46},(_,d)=>[d, metaPeso(lote.linhagem, d)]));
  const [meta, setMeta] = useState<Record<number, number>>(base);
  const dias = Array.from({length:46},(_,i)=>i);

  const reset = () => {
    const novo = Object.fromEntries(dias.map(d=>[d, metaPeso(lote.linhagem, d)]));
    setMeta(novo); onChange(novo); toast.success(`Resetado para ${LINHAGEM_LABEL[lote.linhagem]}`);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4"/>Tabela de Metas (dia 0 → 45)</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reset}>Resetar p/ {LINHAGEM_LABEL[lote.linhagem]}</Button>
          <Button size="sm" onClick={()=>{ onChange(meta); toast.success("Metas salvas"); }}>Salvar</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {dias.map(d => (
            <div key={d} className="text-xs">
              <Label className="text-[10px]">Dia {d}</Label>
              <Input type="number" value={meta[d] ?? ""} onChange={e=>setMeta(m=>({...m, [d]: Number(e.target.value)}))}/>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ===== Relatório =====
function Relatorio({ lote, pesagens }: { lote: LotePesagem; pesagens: Pesagem[] }) {
  const todasPesos = pesagens.flatMap(p=>p.registros.map(r=>r.pesoG));
  const idade = daysBetween(lote.dataAlojamento);
  const primeira = pesagens[0]; const ultima = pesagens[pesagens.length-1];
  const gmdTotal = primeira && ultima && ultima.idadeDias > primeira.idadeDias
    ? (mean(ultima.registros.map(r=>r.pesoG)) - mean(primeira.registros.map(r=>r.pesoG))) / (ultima.idadeDias - primeira.idadeDias) : 0;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between print:hidden">
        <CardTitle className="text-base">Relatório do lote</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={()=>window.print()}><Printer className="h-4 w-4 mr-1"/>Imprimir / PDF</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 print:p-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Info label="Lote" v={lote.nome}/>
          <Info label="Linhagem" v={LINHAGEM_LABEL[lote.linhagem]}/>
          <Info label="Alojamento" v={fmtDay(lote.dataAlojamento)}/>
          <Info label="Idade atual" v={`${idade} dias`}/>
          <Info label="Aves iniciais" v={lote.quantidade.toLocaleString("pt-BR")}/>
          <Info label="Aviário" v={lote.aviario ?? "—"}/>
          <Info label="Responsável" v={lote.responsavel ?? "—"}/>
          <Info label="Intervalo" v={`${lote.intervaloDias} dias`}/>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI icon={<TrendingUp className="h-4 w-4"/>} label="GMD total" value={gmdTotal?`${gmdTotal.toFixed(1)} g/dia`:"—"}/>
          <KPI icon={<Scale className="h-4 w-4"/>} label="Peso atual" value={ultima?`${mean(ultima.registros.map(r=>r.pesoG)).toFixed(0)} g`:"—"}/>
          <KPI icon={<Activity className="h-4 w-4"/>} label="Uniformidade" value={`${uniformidade(ultima?ultima.registros.map(r=>r.pesoG):[]).toFixed(1)}%`}/>
          <KPI icon={<AlertTriangle className="h-4 w-4"/>} label="CV" value={`${cv(ultima?ultima.registros.map(r=>r.pesoG):[]).toFixed(1)}%`}/>
        </div>

        <div>
          <div className="text-sm font-semibold mb-2">Evolução de peso</div>
          <div className="h-72"><MiniCurva lote={lote} pesagens={pesagens}/></div>
        </div>

        <div>
          <div className="text-sm font-semibold mb-2">Pesagens realizadas</div>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Data</TableHead><TableHead>Idade</TableHead><TableHead>N</TableHead>
              <TableHead>Méd</TableHead><TableHead>♂</TableHead><TableHead>♀</TableHead>
              <TableHead>Unif</TableHead><TableHead>CV</TableHead><TableHead>Meta</TableHead><TableHead>vs Meta</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {pesagens.map(p => {
                const pp = p.registros.map(r=>r.pesoG);
                const m = mean(pp);
                const meta = lote.metaCustom?.[p.idadeDias] ?? metaPeso(lote.linhagem, p.idadeDias);
                const st = statusVsMeta(m, meta);
                return (
                  <TableRow key={p.id}>
                    <TableCell>{fmtDate(p.data)}</TableCell>
                    <TableCell>{p.idadeDias}d</TableCell>
                    <TableCell>{p.registros.length}</TableCell>
                    <TableCell><b>{m.toFixed(0)}</b></TableCell>
                    <TableCell>{mean(p.registros.filter(r=>r.sexo==="macho").map(r=>r.pesoG)).toFixed(0)||"—"}</TableCell>
                    <TableCell>{mean(p.registros.filter(r=>r.sexo==="femea").map(r=>r.pesoG)).toFixed(0)||"—"}</TableCell>
                    <TableCell>{uniformidade(pp).toFixed(0)}%</TableCell>
                    <TableCell>{cv(pp).toFixed(1)}%</TableCell>
                    <TableCell>{meta}</TableCell>
                    <TableCell>{st.emoji} {st.label}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="text-xs text-muted-foreground border-t pt-2">
          Total de aves pesadas: <b>{todasPesos.length}</b> · Gerado em {new Date().toLocaleString("pt-BR")}
        </div>
      </CardContent>
    </Card>
  );
}

function Info({ label, v }: { label: string; v: string }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="font-semibold">{v}</div></div>;
}
