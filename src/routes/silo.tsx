import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  AreaChart, Area, LineChart, Line, ReferenceLine, BarChart, Bar,
} from "recharts";
import {
  Boxes, Scale, Gauge, TrendingUp, AlertTriangle, Truck, Settings2, Timer,
  Activity, Drumstick, Target, ShieldCheck,
} from "lucide-react";
import { useFazenda } from "@/lib/cloud/fazenda";
import { useLotes } from "@/lib/state";
import { fmtData, fmtDataHora, isoLocal } from "@/lib/data";
import {
  calcularSilo, CFG_PADRAO, LINHAGEM_SILO_LABEL, refConsumoDiaG, refPesoG,
  type Linhagem, type Sexo, type SiloCfg, type PesagemSilo, type EntregaSilo,
} from "@/lib/silo";

export const Route = createFileRoute("/silo")({
  head: () => ({
    meta: [
      { title: "Silo ao Vivo — estoque de ração em tempo real | AgroSítio" },
      { name: "description", content: "Estoque de ração do silo calculado em tempo real por balanço de massa, peso das aves, mortalidade e curva da linhagem, com autonomia, projeção e pedido recomendado." },
      { property: "og:title", content: "Silo ao Vivo — estoque de ração em tempo real" },
      { property: "og:description", content: "Modelo híbrido de estoque de ração: pesagem física, consumo real, peso das aves e curva da linhagem." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SiloPage,
});

const kg = (n: number, d = 0) => `${(Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d })} kg`;
const num = (n: number, d = 1) => (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const CFG_LOCAL = (f: string) => `silo_pref_${f}`;

type PesagemRow = { id: string; medido_em: string; estoque_kg: number; metodo: string; estimado_kg: number | null; erro_kg: number | null; observacoes: string | null };

function SiloPage() {
  const { client, fazendaId, operador } = useFazenda();
  const [lotes] = useLotes();
  const [entregas, setEntregas] = useState<EntregaSilo[]>([]);
  const [pesagens, setPesagens] = useState<PesagemRow[]>([]);
  const [cfg, setCfg] = useState<SiloCfg>(CFG_PADRAO);
  const [cfgId, setCfgId] = useState<string | null>(null);
  const [linhagem, setLinhagem] = useState<Linhagem>("ross_ap95");
  const [sexo, setSexo] = useState<Sexo>("misto");
  const [agora, setAgora] = useState(() => new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(s);
  }, []);

  const loteAtivo = useMemo(() => {
    const ativos = lotes.filter((l) => !l.encerrado);
    const lista = ativos.length ? ativos : lotes;
    return [...lista].sort((a, b) => (b.dataEntrada || "").localeCompare(a.dataEntrada || ""))[0] || null;
  }, [lotes]);

  // preferências locais (linhagem/sexo)
  useEffect(() => {
    if (!fazendaId) return;
    try {
      const raw = localStorage.getItem(CFG_LOCAL(fazendaId));
      if (raw) {
        const p = JSON.parse(raw);
        if (p.linhagem) setLinhagem(p.linhagem);
        if (p.sexo) setSexo(p.sexo);
      }
    } catch { /* ignore */ }
  }, [fazendaId]);
  useEffect(() => {
    if (!fazendaId) return;
    localStorage.setItem(CFG_LOCAL(fazendaId), JSON.stringify({ linhagem, sexo }));
  }, [linhagem, sexo, fazendaId]);

  // carregar entregas + pesagens + config
  useEffect(() => {
    if (!fazendaId) { setLoading(false); return; }
    let cancel = false;
    (async () => {
      const [ent, pes, conf] = await Promise.all([
        client.from("entregas_racao").select("id,data,quantidade_kg,lote_id").order("data", { ascending: true }),
        client.from("silo_pesagens").select("*").order("medido_em", { ascending: true }),
        client.from("silo_config").select("*").order("updated_at", { ascending: false }),
      ]);
      if (cancel) return;
      const rows = (ent.data as any[]) || [];
      const doLote = loteAtivo ? rows.filter((r) => r.lote_id === loteAtivo.id) : [];
      setEntregas(doLote.map((r) => ({ id: r.id, data: r.data, kg: Number(r.quantidade_kg) || 0 })));
      setPesagens(((pes.data as any[]) || []).filter((p) => loteAtivo && p.lote_id === loteAtivo.id));
      const configs = (conf.data as any[]) || [];
      const c = loteAtivo ? configs.find((item) => item.lote_id === loteAtivo.id) : undefined;
      if (c) {
        setCfgId(c.id);
        setCfg({
          capacidadeKg: Number(c.capacidade_kg), capacidadeOperacionalKg: c.capacidade_operacional_kg ? Number(c.capacidade_operacional_kg) : null,
          estoqueMinimoKg: Number(c.estoque_minimo_kg), margemSegurancaKg: Number(c.margem_seguranca_kg),
          cargaPadraoKg: Number(c.carga_padrao_kg), leadTimeHoras: Number(c.lead_time_horas),
          erroBalancaKg: Number(c.erro_balanca_kg), perdaPct: Number(c.perda_pct),
        });
      } else {
        setCfgId(null);
        setCfg(CFG_PADRAO);
      }
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [client, fazendaId, loteAtivo]);

  const calc = useMemo(() => {
    if (!loteAtivo) return null;
    return calcularSilo({
      agora,
      alojamento: loteAtivo.dataEntrada,
      qtdInicial: loteAtivo.quantidadeInicial,
       previsaoAbateDias: loteAtivo.previsaoAbateDias || 42,
      linhagem, sexo,
      entries: (loteAtivo.entries || []).map((e) => ({ date: e.date, mortalidade: e.mortalidade, eliminados: e.eliminados, pesoMedioG: e.pesoMedioG })),
      entregas,
      pesagens: pesagens.map((p) => ({ id: p.id, medidoEm: p.medido_em, kg: Number(p.estoque_kg) })),
      cfg,
    });
    // recalcula a cada segundo (barato) — memo pelo relógio
  }, [loteAtivo, entregas, pesagens, cfg, linhagem, sexo, agora]);

  async function salvarCfg(novo: SiloCfg) {
    setCfg(novo);
    if (!fazendaId) return;
    const row = {
      fazenda_id: fazendaId, lote_id: loteAtivo?.id ?? null,
      capacidade_kg: novo.capacidadeKg, capacidade_operacional_kg: novo.capacidadeOperacionalKg,
      estoque_minimo_kg: novo.estoqueMinimoKg, margem_seguranca_kg: novo.margemSegurancaKg,
      carga_padrao_kg: novo.cargaPadraoKg, lead_time_horas: novo.leadTimeHoras,
      erro_balanca_kg: novo.erroBalancaKg, perda_pct: novo.perdaPct,
    };
    if (cfgId) {
      const { error } = await client.from("silo_config").update(row).eq("id", cfgId);
      if (error) return toast.error(error.message);
    } else {
      const { data, error } = await client.from("silo_config").insert(row).select().single();
      if (error) return toast.error(error.message);
      setCfgId((data as any).id);
    }
    toast.success("Parâmetros do silo salvos");
  }

  async function addPesagem(p: { medidoEm: string; kg: number; metodo: string; obs: string }) {
    if (!fazendaId) return;
    const { data, error } = await client.from("silo_pesagens").insert({
      fazenda_id: fazendaId, lote_id: loteAtivo?.id ?? null,
      medido_em: new Date(p.medidoEm).toISOString(), estoque_kg: p.kg, metodo: p.metodo,
      estimado_kg: calc ? Math.round(calc.estoqueAtualKg) : null,
      erro_kg: calc ? Math.round(p.kg - calc.estoqueAtualKg) : null,
      observacoes: p.obs || null, autor: operador || null,
    }).select().single();
    if (error) return toast.error(error.message);
    setPesagens((prev) => [...prev, data as any].sort((a, b) => a.medido_em.localeCompare(b.medido_em)));
    toast.success("Pesagem registrada — modelo recalibrado");
  }

  async function delPesagem(id: string) {
    if (!confirm("Excluir esta pesagem do silo?")) return;
    const { error } = await client.from("silo_pesagens").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setPesagens((prev) => prev.filter((p) => p.id !== id));
  }

  if (!fazendaId) return <AppShell><Card className="p-6">Entre numa fazenda para usar o Silo ao Vivo.</Card></AppShell>;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Boxes className="h-7 w-7 text-primary" /> Silo ao Vivo
            </h1>
            <p className="text-sm text-muted-foreground">
              Estoque calculado por balanço de massa + peso real das aves + curva da linhagem — atualizando a cada segundo.
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Select value={linhagem} onValueChange={(v) => setLinhagem(v as Linhagem)}>
              <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(LINHAGEM_SILO_LABEL) as Linhagem[]).map((k) => (
                  <SelectItem key={k} value={k} className="text-xs">{LINHAGEM_SILO_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sexo} onValueChange={(v) => setSexo(v as Sexo)}>
              <SelectTrigger className="h-9 w-[110px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="misto" className="text-xs">Misto</SelectItem>
                <SelectItem value="macho" className="text-xs">Macho</SelectItem>
                <SelectItem value="femea" className="text-xs">Fêmea</SelectItem>
              </SelectContent>
            </Select>
            <PesagemDialog onSave={addPesagem} estimado={calc?.estoqueAtualKg ?? 0} />
          </div>
        </div>

        {loading ? (
          <Card className="p-6 text-sm text-muted-foreground">Carregando dados do silo…</Card>
        ) : !loteAtivo || !calc ? (
          <Card className="p-6 text-sm text-muted-foreground">
            Nenhum lote ativo. Cadastre um lote na Granja para o silo calcular consumo, autonomia e pedido.
          </Card>
        ) : (
          <>
            <Card className="p-3 flex flex-wrap items-center gap-2 text-sm">
              <Drumstick className="h-4 w-4 text-primary" />
              <span className="font-semibold">Lote {loteAtivo.numero}</span>
              <Badge variant="outline" className="text-[10px]">D{calc.idade} · alojado {fmtData(loteAtivo.dataEntrada)}</Badge>
              <Badge variant="secondary" className="text-[10px]">{LINHAGEM_SILO_LABEL[linhagem]}</Badge>
              <span className="ml-auto flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> AO VIVO · {agora.toLocaleTimeString("pt-BR")}
              </span>
            </Card>

            {/* ===== Painel principal ===== */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Estoque agora" value={kg(calc.estoqueAtualKg)} hint={`faixa ${kg(calc.faixa.min)} – ${kg(calc.faixa.max)}`} icon={Boxes} tone="primary" />
              <StatCard label="Autonomia" value={`${num(calc.autonomiaDias, 1)} d`} hint={calc.tRuptura ? `acaba ${fmtDataHora(calc.tRuptura)}` : "> 7 dias"} icon={Timer} tone="accent" />
              <StatCard label="Consumo hoje" value={kg(calc.consumoHojeKg)} hint={`agora ${num(calc.consumoHoraAtualKgH, 1)} kg/h · ${num(calc.consumoSegKg * 1000, 1)} g/s`} icon={TrendingUp} tone="muted" />
              <StatCard label="Confiança" value={`${calc.confianca}%`} hint={calc.ancora ? `pesagem há ${num(calc.horasDesdeAncora, 1)} h` : calc.modoEstimativa === "peso_ave" ? `pelo peso das aves (D${calc.ultPesagem?.idade})` : "só curva da linhagem"} icon={ShieldCheck} tone="primary" />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Aves vivas" value={calc.avesVivas.toLocaleString("pt-BR")} hint={`mortalidade ${num(calc.mortalidadePct, 2)}%`} icon={Drumstick} tone="muted" />
              <StatCard label="Peso médio" value={`${num(calc.pesoAtualG, 0)} g`} hint={calc.ultPesagem ? `pesado D${calc.ultPesagem.idade}` : "estimado pela curva"} icon={Scale} tone="accent" />
              <StatCard label="GPD" value={`${num(calc.gpd7 ?? calc.gpdRecente ?? 0, 0)} g/dia`} hint={`3d ${num(calc.gpd3 ?? 0, 0)} · médio ${num(calc.gpdMedio ?? 0, 0)}`} icon={Activity} tone="muted" />
              <StatCard label="CA estimada" value={num(calc.fcrReal, 3)} hint={`não medida · referência ${num(calc.fcrRef, 3)}`} icon={Target} tone="primary" />
            </div>

            {/* ===== Alertas ===== */}
            <div className="grid md:grid-cols-2 gap-3">
              {calc.alertas.map((a, i) => (
                <Card key={i} className={`p-3 border-l-4 ${
                  a.nivel === "critico" ? "border-l-destructive" :
                  a.nivel === "alto" ? "border-l-orange-500" :
                  a.nivel === "medio" ? "border-l-amber-500" :
                  a.nivel === "ok" ? "border-l-emerald-500" : "border-l-sky-500"}`}>
                  <div className="font-semibold text-sm">{a.titulo}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.detalhe}</div>
                </Card>
              ))}
            </div>

            <Tabs defaultValue="projecao">
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="projecao">Projeção</TabsTrigger>
                <TabsTrigger value="consumo">Consumo</TabsTrigger>
                <TabsTrigger value="peso">Peso & GPD</TabsTrigger>
                <TabsTrigger value="pedido">Pedido</TabsTrigger>
                <TabsTrigger value="calibracao">Calibração</TabsTrigger>
                <TabsTrigger value="config">Parâmetros</TabsTrigger>
              </TabsList>

              {/* --- Projeção --- */}
              <TabsContent value="projecao" className="space-y-4 pt-4">
                <Card className="p-4">
                  <h3 className="font-semibold text-sm mb-3">Estoque projetado — próximos 7 dias</h3>
                  <div className="h-64">
                    <ResponsiveContainer>
                      <AreaChart data={calc.projecao.map((p) => ({ label: p.label, estoque: p.estoque }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" fontSize={10} interval={Math.ceil(calc.projecao.length / 8)} />
                        <YAxis fontSize={10} />
                        <Tooltip formatter={(v: any) => kg(Number(v))} />
                        <ReferenceLine y={cfg.estoqueMinimoKg} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: "mínimo", fontSize: 10 }} />
                        <ReferenceLine y={cfg.estoqueMinimoKg + cfg.margemSegurancaKg} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" label={{ value: "segurança", fontSize: 10 }} />
                        <Area type="monotone" dataKey="estoque" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.18)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[["6 h", "h6"], ["12 h", "h12"], ["24 h", "h24"], ["48 h", "h48"], ["72 h", "h72"], ["7 dias", "h168"]].map(([lab, k]) => (
                    <Card key={k} className="p-3">
                      <div className="text-[11px] text-muted-foreground">Estoque em {lab}</div>
                      <div className="font-display font-bold text-lg tabular-nums">{kg(calc.marcos[k] ?? 0)}</div>
                    </Card>
                  ))}
                </div>

                <Card className="p-4">
                  <h3 className="font-semibold text-sm mb-2">Previsão de esgotamento</h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
                    {calc.limiares.map((l, i) => (
                      <div key={i} className="rounded border border-border/60 p-2">
                        <div className="text-[11px] text-muted-foreground">
                          {l.pct === -1 ? `Estoque mínimo (${kg(cfg.estoqueMinimoKg)})` : l.pct === 0 ? "Zero" : `${l.pct}% do atual`}
                        </div>
                        <div className="font-semibold tabular-nums">{l.quando ? fmtDataHora(l.quando) : "> 7 dias"}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">Previsão estatística — não substitui a medição física do silo.</p>
                </Card>
              </TabsContent>

              {/* --- Consumo --- */}
              <TabsContent value="consumo" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard label="Média 3 dias" value={kg(calc.mm3)} hint="kg/dia" icon={TrendingUp} tone="muted" />
                  <StatCard label="Média 7 dias" value={kg(calc.mm7)} hint="kg/dia" icon={TrendingUp} tone="muted" />
                  <StatCard label="Média 14 dias" value={kg(calc.mm14)} hint="kg/dia" icon={TrendingUp} tone="muted" />
                  <StatCard label="Tendência" value={calc.tendencia === "subindo" ? "Subindo" : calc.tendencia === "caindo" ? "Caindo" : "Estável"} hint={`amanhã ${kg(calc.consumoAmanhaKg)}`} icon={Activity} tone="accent" />
                </div>

                <Card className="p-4">
                  <h3 className="font-semibold text-sm mb-3">Consumo diário — real estimado × referência da linhagem</h3>
                  <div className="h-64">
                    <ResponsiveContainer>
                      <LineChart data={serieConsumo(calc, linhagem, sexo)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" fontSize={10} />
                        <YAxis fontSize={10} />
                        <Tooltip formatter={(v: any) => kg(Number(v))} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="modelo" name="Modelo híbrido" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="referencia" name="Referência" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                  <Info label="Consumo acumulado" value={kg(calc.consumoAcumKg)} />
                  <Info label="Acumulado por ave" value={`${num(calc.consumoPorAveG, 0)} g`} />
                  <Info label="kg/1.000 aves/dia" value={num(calc.consumoKgPor1000Dia, 1)} />
                  <Info label="vs referência" value={`${calc.difConsumoPct > 0 ? "+" : ""}${num(calc.difConsumoPct, 1)}% (${calc.classeConsumo})`} />
                  <Info label="Total entregue" value={kg(calc.totalEntregueKg)} />
                  <Info label="Entregas" value={`${calc.entregasCount} cargas`} />
                  <Info label="Intervalo médio" value={`${num(calc.intervaloEntregas.medio, 1)} d (mediana ${num(calc.intervaloEntregas.mediano, 1)})`} />
                  <Info label="Desvio do intervalo" value={`${num(calc.intervaloEntregas.desvio, 1)} d`} />
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold text-sm mb-2">Peso de cada modelo agora</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <Info label="A · consumo real medido" value={`${num(calc.pesosModelo.A * 100, 0)}%`} />
                    <Info label="B · escala metabólica" value={`${num(calc.pesosModelo.B * 100, 0)}%`} />
                    <Info label="D · ganho de peso × CA" value={`${num(calc.pesosModelo.D * 100, 0)}%`} />
                    <Info label="C · curva da linhagem" value={`${num(calc.pesosModelo.C * 100, 0)}%`} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Sem balança no silo, o modelo D é o principal: ele converte o ganho de peso real medido em cada dia
                    (g/ave/dia) em quilos de ração usando a conversão alimentar incremental da linhagem, somando a
                    manutenção pelo peso metabólico (PV^0,75). Quanto mais pesagens de aves você registrar na granja,
                    mais preciso fica o estoque.
                  </p>
                </Card>
              </TabsContent>

              {/* --- Peso --- */}
              <TabsContent value="peso" className="space-y-4 pt-4">
                <Card className="p-4">
                  <h3 className="font-semibold text-sm mb-3">Peso médio — real, referência e projeção</h3>
                  <div className="h-64">
                    <ResponsiveContainer>
                      <LineChart data={seriePeso(calc, linhagem, sexo, loteAtivo.previsaoAbateDias || 45)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="idade" fontSize={10} />
                        <YAxis fontSize={10} />
                        <Tooltip formatter={(v: any) => `${num(Number(v), 0)} g`} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="real" name="Pesado" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                        <Line type="monotone" dataKey="projecao" name="Projeção" stroke="hsl(var(--primary))" strokeDasharray="4 4" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="referencia" name="Referência" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold text-sm mb-3">Ganho de peso diário (GPD)</h3>
                  <div className="h-52">
                    <ResponsiveContainer>
                      <BarChart data={[
                        { k: "Recente", v: calc.gpdRecente ?? 0 },
                        { k: "3 dias", v: calc.gpd3 ?? 0 },
                        { k: "7 dias", v: calc.gpd7 ?? 0 },
                        { k: "Médio", v: calc.gpdMedio ?? 0 },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="k" fontSize={11} />
                        <YAxis fontSize={11} />
                        <Tooltip formatter={(v: any) => `${num(Number(v), 0)} g/dia`} />
                        <Bar dataKey="v" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                  {calc.previsaoPeso.map((p) => (
                    <Info key={p.dias} label={`Em ${p.dias} dia(s) — D${p.idade}`} value={`${num(p.pesoG, 0)} g`} hint={`ref ${num(p.refG, 0)} g`} />
                  ))}
                </Card>
              </TabsContent>

              {/* --- Pedido --- */}
              <TabsContent value="pedido" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard label="Pedido recomendado" value={kg(calc.pedidoRecomendadoKg)} hint={`espaço livre ${kg(calc.espacoSiloKg)}`} icon={Truck} tone="primary" />
                  <StatCard label="Pedir até" value={calc.dataPedido ? fmtDataHora(calc.dataPedido) : "sem urgência"} hint={`lead time ${num(calc.proximaEntregaEm, 0)} h`} icon={Timer} tone="accent" />
                  <StatCard label="Consumo até a entrega" value={kg(calc.consumoAtePedido)} hint="previsto pelo modelo" icon={TrendingUp} tone="muted" />
                  <StatCard label="Capacidade do silo" value={kg(cfg.capacidadeOperacionalKg || cfg.capacidadeKg)} hint={`mínimo ${kg(cfg.estoqueMinimoKg)}`} icon={Gauge} tone="muted" />
                </div>
                <Card className="p-4 text-sm space-y-2">
                  <h3 className="font-semibold">Como o pedido foi calculado</h3>
                  <p className="text-muted-foreground text-xs">
                    consumo previsto até a próxima entrega ({kg(calc.consumoAtePedido)}) + estoque mínimo ({kg(cfg.estoqueMinimoKg)})
                    + margem de segurança ({kg(cfg.margemSegurancaKg)}) − estoque atual ({kg(calc.estoqueAtualKg)}),
                    limitado ao espaço livre do silo e arredondado para a fração da carga padrão.
                  </p>
                </Card>
                {calc.anomalias.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Inconsistências detectadas</h3>
                    <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
                      {calc.anomalias.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  </Card>
                )}
              </TabsContent>

              {/* --- Calibração --- */}
              <TabsContent value="calibracao" className="space-y-4 pt-4">
                <Card className="p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                  <Info label="Âncora atual" value={calc.ancora ? kg(calc.ancora.kg) : "balanço teórico"} hint={calc.ancora ? fmtDataHora(calc.ancora.data) : "sem pesagem física"} />
                  <Info label="Entradas desde a âncora" value={kg(calc.entradasDesdeAncora)} />
                  <Info label="Consumo desde a âncora" value={kg(calc.consumoDesdeAncora)} />
                  <Info label="Balanço simples (teórico)" value={kg(calc.estoqueBalancoSimplesKg)} hint="só entregue − curva" />
                  <Info label="Incerteza (±)" value={kg(calc.sigmaKg)} />
                  <Info label="Fator de consumo real" value={calc.fatorReal ? `${num(calc.fatorReal, 3)}×` : "—"} hint={calc.fatorReal ? `${num(calc.diasCobertosReal, 1)} dias medidos` : "precisa de 2 pesagens"} />
                  <Info label="Último erro" value={calc.ultimoErro?.erro != null ? `${calc.ultimoErro.erro > 0 ? "+" : ""}${num(calc.ultimoErro.erro, 0)} kg` : "—"} hint={calc.ultimoErro?.erroPct != null ? `${num(calc.ultimoErro.erroPct, 1)}%` : ""} />
                  <Info label="Peso vivo total" value={kg(calc.pesoTotalVivoKg)} />
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold text-sm mb-3">Histórico de pesagens físicas do silo</h3>
                  {pesagens.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhuma pesagem registrada. Cada pesagem vira uma âncora e melhora muito a precisão.</p>
                  ) : (
                    <div className="space-y-2">
                      {[...calc.historicoErros].reverse().map((h, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm rounded border border-border/60 p-2">
                          <Badge variant="outline" className="text-[10px]">{fmtDataHora(h.medidoEm)}</Badge>
                          <span className="font-semibold tabular-nums">{kg(h.real)}</span>
                          {h.estimado !== null && (
                            <span className="text-xs text-muted-foreground">
                              estimado {kg(h.estimado)} · erro {h.erro! > 0 ? "+" : ""}{num(h.erro!, 0)} kg
                              {h.erroPct !== null ? ` (${num(h.erroPct, 1)}%)` : ""}
                            </span>
                          )}
                          <Button
                            size="sm" variant="ghost" className="ml-auto text-xs text-destructive"
                            onClick={() => {
                              const alvo = pesagens.find((p) => p.medido_em === h.medidoEm);
                              if (alvo) delPesagem(alvo.id);
                            }}
                          >Excluir</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </TabsContent>

              {/* --- Config --- */}
              <TabsContent value="config" className="pt-4">
                <ConfigForm cfg={cfg} onSave={salvarCfg} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Info({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
      {hint ? <div className="text-[10px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

function serieConsumo(calc: ReturnType<typeof calcularSilo>, lin: Linhagem, sx: Sexo) {
  const out: { label: string; modelo: number; referencia: number }[] = [];
  for (let i = -7; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const idade = calc.idade + i;
    if (idade < 0) continue;
    out.push({
      label: `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`,
      modelo: Math.round(calc.consumoDoDiaKg(d)),
      referencia: Math.round((refConsumoDiaG(idade, lin, sx) * calc.avesVivas) / 1000),
    });
  }
  return out;
}

function seriePeso(calc: ReturnType<typeof calcularSilo>, lin: Linhagem, sx: Sexo, abate: number) {
  const reais = new Map<number, number>();
   for (const pesagem of calc.pesagensAves) reais.set(pesagem.idade, pesagem.g);
  const out: { idade: number; real: number | null; projecao: number; referencia: number }[] = [];
  for (let d = 0; d <= abate; d++) {
    out.push({
      idade: d,
      real: reais.get(d) ?? null,
      projecao: Math.round(calc.pesoPrevistoG(d)),
      referencia: Math.round(refPesoG(d, lin, sx)),
    });
  }
  return out;
}

function PesagemDialog({ onSave, estimado }: { onSave: (p: { medidoEm: string; kg: number; metodo: string; obs: string }) => Promise<unknown>; estimado: number }) {
  const [open, setOpen] = useState(false);
  const agoraLocal = () => {
    const d = new Date();
    return `${isoLocal(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  const [medidoEm, setMedidoEm] = useState(agoraLocal);
  const [valor, setValor] = useState("");
  const [metodo, setMetodo] = useState("balanca");
  const [obs, setObs] = useState("");

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setMedidoEm(agoraLocal()); }}>
      <DialogTrigger asChild>
        <Button variant="outline"><Scale className="h-4 w-4 mr-2" /> Pesagem manual (opcional)</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Pesagem manual do silo (opcional)</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">Não é obrigatório: sem balança, o sistema estima pelo peso das aves. Se você conseguir medir (régua, sensor, sobra da carga), o valor vira a âncora do cálculo. Estimativa atual: <strong>{kg(estimado)}</strong>.</div>
          <div>
            <Label className="text-xs">Data e hora</Label>
            <Input type="datetime-local" value={medidoEm} onChange={(e) => setMedidoEm(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Estoque medido (kg)</Label>
            <Input type="number" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="9500" />
          </div>
          <div>
            <Label className="text-xs">Método</Label>
            <Select value={metodo} onValueChange={setMetodo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="balanca">Célula de carga / balança</SelectItem>
                <SelectItem value="regua">Régua / nível visual</SelectItem>
                <SelectItem value="sensor">Sensor de nível</SelectItem>
                <SelectItem value="estimativa">Estimativa do operador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Observações</Label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={async () => {
              const n = Number(valor);
              if (!Number.isFinite(n) || n < 0) return toast.error("Informe o peso medido");
              await onSave({ medidoEm, kg: n, metodo, obs });
              setValor(""); setObs(""); setOpen(false);
            }}
          >Salvar pesagem</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfigForm({ cfg, onSave }: { cfg: SiloCfg; onSave: (c: SiloCfg) => Promise<unknown> }) {
  const [f, setF] = useState<SiloCfg>(cfg);
  useEffect(() => setF(cfg), [cfg]);
  const campo = (label: string, k: keyof SiloCfg, hint?: string) => (
    <div key={k as string}>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number" inputMode="decimal"
        value={(f[k] as number) ?? ""}
        onChange={(e) => setF({ ...f, [k]: e.target.value === "" ? null : Number(e.target.value) } as SiloCfg)}
      />
      {hint ? <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p> : null}
    </div>
  );
  return (
    <Card className="p-4 space-y-4">
      <h3 className="font-semibold text-sm flex items-center gap-2"><Settings2 className="h-4 w-4" /> Parâmetros do silo</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {campo("Capacidade máxima (kg)", "capacidadeKg")}
        {campo("Capacidade operacional (kg)", "capacidadeOperacionalKg", "Limite prático de recebimento")}
        {campo("Estoque mínimo (kg)", "estoqueMinimoKg", "Dispara o alerta de pedido")}
        {campo("Margem de segurança (kg)", "margemSegurancaKg")}
        {campo("Carga padrão do caminhão (kg)", "cargaPadraoKg")}
        {campo("Lead time da entrega (h)", "leadTimeHoras")}
        {campo("Erro da balança (kg)", "erroBalancaKg", "Usado no cálculo da faixa de incerteza")}
        {campo("Desperdício estimado (%)", "perdaPct", "Deixe 0 se não medido")}
      </div>
      <Button onClick={() => onSave(f)}>Salvar parâmetros</Button>
    </Card>
  );
}
