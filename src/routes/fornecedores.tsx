import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Store, Plus, Search, Star, Navigation, Phone, MessageCircle, Copy, Share2, Trash2,
  Pencil, MapPin, Crosshair, Download, Upload, Loader2, Camera, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { useFazenda } from "@/lib/cloud/fazenda";
import { compressFile, uploadFotoBlob } from "@/lib/cloud/uploadFoto";
import { geocodificarEndereco, reverterCoordenadas } from "@/lib/fornecedores.functions";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { DARK_MAP_STYLE } from "@/lib/mapStyle";

export const Route = createFileRoute("/fornecedores")({
  head: () => ({
    meta: [
      { title: "Fornecedores no Mapa — AgroSítio" },
      { name: "description", content: "Cadastre e localize lojas e fornecedores no mapa: rotas, telefone, WhatsApp, favoritos e filtro por raio." },
      { property: "og:title", content: "Fornecedores no Mapa — AgroSítio" },
      { property: "og:description", content: "Seu mapa pessoal de fornecedores: pins, rotas, contatos e favoritos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FornecedoresPage,
});

declare global {
  interface Window { google: any; __initFornMap?: () => void }
}

const CATEGORIAS = [
  "ração", "medicamentos", "equipamentos", "peças", "elétrica", "hidráulica",
  "construção", "combustível", "oficina", "ferragens", "transporte", "sementes",
  "adubos", "veterinária", "outro",
] as const;

const CORES: Record<string, string> = {
  "ração": "#f59e0b", medicamentos: "#22c55e", equipamentos: "#3b82f6", "peças": "#a855f7",
  "elétrica": "#eab308", "hidráulica": "#06b6d4", "construção": "#f97316", "combustível": "#ef4444",
  oficina: "#8b5cf6", ferragens: "#64748b", transporte: "#14b8a6", sementes: "#84cc16",
  adubos: "#10b981", "veterinária": "#ec4899", outro: "#94a3b8",
};

type Fornecedor = {
  id: string;
  nome: string;
  responsavel?: string | null;
  categoria: string;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  observacoes?: string | null;
  foto_url?: string | null;
  favorito: boolean;
  latitude?: number | null;
  longitude?: number | null;
  created_at?: string;
};

const vazio = (): Partial<Fornecedor> => ({ nome: "", categoria: "outro", favorito: false });

function distKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180, la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const soDigitos = (s?: string | null) => (s || "").replace(/\D/g, "");

function FornecedoresPage() {
  const { client, fazendaId, codigo, operador } = useFazenda();
  const mapDiv = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const clusterRef = useRef<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const [itens, setItens] = useState<Fornecedor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [catFiltro, setCatFiltro] = useState("todas");
  const [raio, setRaio] = useState("0");
  const [soFav, setSoFav] = useState(false);
  const [minha, setMinha] = useState<{ lat: number; lng: number } | null>(null);
  const [sel, setSel] = useState<Fornecedor | null>(null);
  const [form, setForm] = useState<Partial<Fornecedor>>(vazio());
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [buscandoEnd, setBuscandoEnd] = useState(false);
  const [modoPin, setModoPin] = useState(false);
  const modoPinRef = useRef(false);
  modoPinRef.current = modoPin;

  // ---------- dados ----------
  const carregar = useCallback(async () => {
    if (!fazendaId) { setCarregando(false); return; }
    const { data, error } = await client.from("fornecedores").select("*").order("favorito", { ascending: false }).order("nome");
    setCarregando(false);
    if (error) { console.error(error); toast.error("Erro ao carregar fornecedores"); return; }
    setItens((data as Fornecedor[]) ?? []);
  }, [client, fazendaId]);

  useEffect(() => { void carregar(); }, [carregar]);

  // ---------- mapa ----------
  useEffect(() => {
    const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
    const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
    if (!key) { toast.error("Google Maps não configurado"); return; }
    if (window.google?.maps) { initMap(); return; }
    window.__initFornMap = initMap;
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__initFornMap&libraries=geometry${channel ? `&channel=${channel}` : ""}`;
    s.async = true; s.defer = true;
    document.head.appendChild(s);
    return () => { delete window.__initFornMap; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function initMap() {
    if (!mapDiv.current || !window.google) return;
    const map = new window.google.maps.Map(mapDiv.current, {
      center: { lat: -22.5, lng: -48.5 },
      zoom: 11,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      styles: DARK_MAP_STYLE,
    });
    mapRef.current = map;
    map.addListener("click", (e: any) => {
      if (!modoPinRef.current) return;
      const lat = e.latLng.lat(), lng = e.latLng.lng();
      setModoPin(false);
      abrirNovo({ latitude: lat, longitude: lng });
      void preencherEndereco(lat, lng);
    });
    localizar(true);
  }

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return itens.filter((f) => {
      if (soFav && !f.favorito) return false;
      if (catFiltro !== "todas" && f.categoria !== catFiltro) return false;
      if (q && !`${f.nome} ${f.cidade ?? ""} ${f.categoria} ${f.telefone ?? ""} ${f.whatsapp ?? ""} ${f.responsavel ?? ""}`.toLowerCase().includes(q)) return false;
      const r = Number(raio);
      if (r > 0 && minha && f.latitude != null && f.longitude != null) {
        if (distKm(minha, { lat: f.latitude, lng: f.longitude }) > r) return false;
      }
      return true;
    });
  }, [itens, busca, catFiltro, soFav, raio, minha]);

  // desenhar marcadores
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google) return;
    for (const m of markersRef.current.values()) m.setMap(null);
    markersRef.current.clear();
    clusterRef.current?.clearMarkers();

    const marks: any[] = [];
    for (const f of filtrados) {
      if (f.latitude == null || f.longitude == null) continue;
      const cor = CORES[f.categoria] ?? CORES.outro;
      const mk = new window.google.maps.Marker({
        position: { lat: Number(f.latitude), lng: Number(f.longitude) },
        title: f.nome,
        icon: {
          path: "M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z",
          fillColor: cor,
          fillOpacity: 1,
          strokeColor: "#0b0b0b",
          strokeWeight: 1.5,
          scale: 1.6,
          anchor: new window.google.maps.Point(12, 22),
        },
      });
      mk.addListener("click", () => setSel(f));
      markersRef.current.set(f.id, mk);
      marks.push(mk);
    }
    clusterRef.current = new MarkerClusterer({ map, markers: marks });
    return () => { clusterRef.current?.clearMarkers(); };
  }, [filtrados]);

  function focar(f: Fornecedor) {
    setSel(f);
    if (f.latitude == null || f.longitude == null || !mapRef.current) return;
    mapRef.current.panTo({ lat: Number(f.latitude), lng: Number(f.longitude) });
    mapRef.current.setZoom(16);
    mapDiv.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function localizar(silencioso = false) {
    if (!navigator.geolocation) { if (!silencioso) toast.error("GPS indisponível"); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const loc = { lat: p.coords.latitude, lng: p.coords.longitude };
        setMinha(loc);
        mapRef.current?.panTo(loc);
        if (!silencioso) toast.success("Localização detectada");
      },
      () => { if (!silencioso) toast.error("Não foi possível obter sua localização"); },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function preencherEndereco(lat: number, lng: number) {
    try {
      const r = await reverterCoordenadas({ data: { lat, lng } });
      if (r) setForm((p) => ({ ...p, endereco: r.endereco, cidade: r.cidade, estado: r.estado, cep: r.cep }));
    } catch (e) { console.error(e); }
  }

  async function buscarEndereco() {
    const q = (form.endereco || "").trim();
    if (q.length < 3) { toast.error("Digite o endereço"); return; }
    setBuscandoEnd(true);
    try {
      const r = await geocodificarEndereco({ data: { endereco: q } });
      if (!r) { toast.error("Endereço não encontrado"); return; }
      setForm((p) => ({ ...p, endereco: r.endereco, cidade: r.cidade || p.cidade, estado: r.estado || p.estado, cep: r.cep || p.cep, latitude: r.lat, longitude: r.lng }));
      mapRef.current?.panTo({ lat: r.lat, lng: r.lng });
      mapRef.current?.setZoom(16);
      toast.success("Local encontrado");
    } catch (e: any) { toast.error(e?.message ?? "Falha na busca"); }
    finally { setBuscandoEnd(false); }
  }

  function abrirNovo(extra: Partial<Fornecedor> = {}) {
    setForm({ ...vazio(), ...extra });
    setAberto(true);
  }

  async function enviarFoto(file?: File | null) {
    if (!file || !fazendaId || !codigo) return;
    setEnviandoFoto(true);
    try {
      const blob = await compressFile(file);
      const url = await uploadFotoBlob(blob, fazendaId, codigo);
      setForm((p) => ({ ...p, foto_url: url }));
    } catch (e) { console.error(e); toast.error("Falha ao enviar foto"); }
    finally { setEnviandoFoto(false); }
  }

  async function salvar() {
    if (!fazendaId) { toast.error("Entre em uma fazenda"); return; }
    const nome = (form.nome || "").trim();
    if (!nome) { toast.error("Informe o nome da loja"); return; }
    setSalvando(true);
    const payload: any = {
      nome, responsavel: form.responsavel || null, categoria: form.categoria || "outro",
      endereco: form.endereco || null, cidade: form.cidade || null, estado: form.estado || null,
      cep: form.cep || null, telefone: form.telefone || null, whatsapp: form.whatsapp || null,
      email: form.email || null, observacoes: form.observacoes || null, foto_url: form.foto_url || null,
      favorito: !!form.favorito, latitude: form.latitude ?? null, longitude: form.longitude ?? null,
    };
    const res = form.id
      ? await client.from("fornecedores").update(payload).eq("id", form.id).select().single()
      : await client.from("fornecedores").insert({ ...payload, fazenda_id: fazendaId, autor: operador || null }).select().single();
    setSalvando(false);
    if (res.error) { console.error(res.error); toast.error("Não foi possível salvar"); return; }
    const row = res.data as Fornecedor;
    setItens((p) => (form.id ? p.map((i) => (i.id === row.id ? row : i)) : [row, ...p]));
    setAberto(false);
    setSel(row);
    toast.success(form.id ? "Fornecedor atualizado" : "Fornecedor cadastrado");
  }

  async function excluir(f: Fornecedor) {
    if (!confirm(`Excluir "${f.nome}"?`)) return;
    const { error } = await client.from("fornecedores").delete().eq("id", f.id);
    if (error) { toast.error("Erro ao excluir"); return; }
    setItens((p) => p.filter((i) => i.id !== f.id));
    if (sel?.id === f.id) setSel(null);
    toast.success("Excluído");
  }

  async function alternarFavorito(f: Fornecedor) {
    const { data, error } = await client.from("fornecedores").update({ favorito: !f.favorito }).eq("id", f.id).select().single();
    if (error) { toast.error("Erro ao favoritar"); return; }
    setItens((p) => p.map((i) => (i.id === f.id ? (data as Fornecedor) : i)));
    if (sel?.id === f.id) setSel(data as Fornecedor);
  }

  // ---------- export / import ----------
  function baixar(nome: string, conteudo: string, tipo: string) {
    const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
    const a = document.createElement("a");
    a.href = url; a.download = nome; a.click();
    URL.revokeObjectURL(url);
  }
  function exportarJSON() { baixar("fornecedores.json", JSON.stringify(itens, null, 2), "application/json"); }
  function exportarCSV() {
    const cols = ["nome", "responsavel", "categoria", "endereco", "cidade", "estado", "cep", "telefone", "whatsapp", "email", "observacoes", "latitude", "longitude", "favorito"];
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [cols.join(","), ...itens.map((f) => cols.map((c) => esc((f as any)[c])).join(","))].join("\n");
    baixar("fornecedores.csv", csv, "text/csv;charset=utf-8");
  }
  async function importarJSON(file?: File | null) {
    if (!file || !fazendaId) return;
    try {
      const arr = JSON.parse(await file.text());
      if (!Array.isArray(arr)) throw new Error("formato");
      const rows = arr.slice(0, 500).map((f: any) => ({
        fazenda_id: fazendaId, nome: String(f.nome ?? "Sem nome").slice(0, 120),
        responsavel: f.responsavel ?? null, categoria: f.categoria ?? "outro", endereco: f.endereco ?? null,
        cidade: f.cidade ?? null, estado: f.estado ?? null, cep: f.cep ?? null, telefone: f.telefone ?? null,
        whatsapp: f.whatsapp ?? null, email: f.email ?? null, observacoes: f.observacoes ?? null,
        foto_url: f.foto_url ?? null, favorito: !!f.favorito,
        latitude: f.latitude ?? null, longitude: f.longitude ?? null,
      }));
      const { error } = await client.from("fornecedores").insert(rows);
      if (error) throw error;
      await carregar();
      toast.success(`${rows.length} fornecedores importados`);
    } catch (e) { console.error(e); toast.error("Arquivo inválido"); }
  }

  // ---------- estatísticas ----------
  const stats = useMemo(() => {
    const porCidade: Record<string, number> = {};
    const porCat: Record<string, number> = {};
    for (const f of itens) {
      const c = (f.cidade || "Sem cidade").trim();
      porCidade[c] = (porCidade[c] ?? 0) + 1;
      porCat[f.categoria] = (porCat[f.categoria] ?? 0) + 1;
    }
    return {
      total: itens.length,
      favoritos: itens.filter((f) => f.favorito).length,
      cidades: Object.entries(porCidade).sort((a, b) => b[1] - a[1]),
      categorias: Object.entries(porCat).sort((a, b) => b[1] - a[1]),
    };
  }, [itens]);

  const distanciaDe = (f: Fornecedor) =>
    minha && f.latitude != null && f.longitude != null
      ? distKm(minha, { lat: Number(f.latitude), lng: Number(f.longitude) })
      : null;

  return (
    <AppShell>
      <div className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Store className="size-5" /></div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Fornecedores</h1>
              <p className="text-xs text-muted-foreground">Seu mapa pessoal de lojas — {stats.total} cadastrados · {stats.favoritos} favoritos</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => localizar()}><Crosshair className="mr-1 size-4" /> Minha localização</Button>
            <Button variant={modoPin ? "default" : "outline"} size="sm" onClick={() => { setModoPin((v) => !v); if (!modoPin) toast.info("Toque no mapa para marcar o local"); }}>
              <MapPin className="mr-1 size-4" /> {modoPin ? "Toque no mapa…" : "Marcar no mapa"}
            </Button>
            <Button size="sm" onClick={() => abrirNovo()}><Plus className="mr-1 size-4" /> Novo fornecedor</Button>
          </div>
        </header>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por loja, cidade, categoria ou telefone…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <Select value={catFiltro} onValueChange={setCatFiltro}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas categorias</SelectItem>
              {CATEGORIAS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Select value={raio} onValueChange={setRaio}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Qualquer distância</SelectItem>
                <SelectItem value="5">Até 5 km</SelectItem>
                <SelectItem value="10">Até 10 km</SelectItem>
                <SelectItem value="25">Até 25 km</SelectItem>
                <SelectItem value="50">Até 50 km</SelectItem>
              </SelectContent>
            </Select>
            <Button variant={soFav ? "default" : "outline"} size="icon" onClick={() => setSoFav((v) => !v)} aria-label="Somente favoritos">
              <Star className={`size-4 ${soFav ? "fill-current" : ""}`} />
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden p-0">
          <div ref={mapDiv} className={`h-[52vh] min-h-[340px] w-full ${modoPin ? "cursor-crosshair" : ""}`} />
        </Card>

        <Tabs defaultValue="lista">
          <TabsList>
            <TabsTrigger value="lista">Lista ({filtrados.length})</TabsTrigger>
            <TabsTrigger value="stats"><BarChart3 className="mr-1 size-4" /> Estatísticas</TabsTrigger>
            <TabsTrigger value="dados">Dados</TabsTrigger>
          </TabsList>

          <TabsContent value="lista" className="mt-3 space-y-2">
            {carregando && <p className="py-6 text-center text-sm text-muted-foreground">Carregando…</p>}
            {!carregando && filtrados.length === 0 && (
              <Card className="border-dashed p-10 text-center">
                <Store className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Nenhum fornecedor encontrado.</p>
                <Button className="mt-3" size="sm" onClick={() => abrirNovo()}><Plus className="mr-1 size-4" /> Cadastrar o primeiro</Button>
              </Card>
            )}
            {filtrados.map((f) => {
              const d = distanciaDe(f);
              return (
                <Card key={f.id} className="flex items-center gap-3 p-3">
                  {f.foto_url ? (
                    <img src={f.foto_url} alt={`Fachada de ${f.nome}`} className="size-12 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="grid size-12 shrink-0 place-items-center rounded-lg" style={{ background: `${CORES[f.categoria] ?? CORES.outro}22`, color: CORES[f.categoria] ?? CORES.outro }}>
                      <Store className="size-5" />
                    </div>
                  )}
                  <button className="min-w-0 flex-1 text-left" onClick={() => focar(f)}>
                    <div className="flex items-center gap-1.5">
                      {f.favorito && <Star className="size-3.5 shrink-0 fill-current text-primary" />}
                      <span className="truncate font-semibold">{f.nome}</span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      <span className="capitalize">{f.categoria}</span>
                      {f.cidade ? ` · ${f.cidade}${f.estado ? `/${f.estado}` : ""}` : ""}
                      {d != null ? ` · ${d.toFixed(1)} km` : ""}
                    </p>
                  </button>
                  <div className="flex shrink-0 gap-1">
                    <Button size="icon" variant="ghost" onClick={() => alternarFavorito(f)} aria-label="Favoritar"><Star className={`size-4 ${f.favorito ? "fill-current text-primary" : ""}`} /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setSel(f)} aria-label="Detalhes"><MapPin className="size-4" /></Button>
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="stats" className="mt-3 grid gap-3 md:grid-cols-2">
            <Card className="p-4">
              <p className="mb-2 text-sm font-semibold">Resumo</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-muted/50 p-3"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Fornecedores</p></div>
                <div className="rounded-lg bg-muted/50 p-3"><p className="text-2xl font-bold">{stats.favoritos}</p><p className="text-xs text-muted-foreground">Favoritos</p></div>
                <div className="rounded-lg bg-muted/50 p-3"><p className="text-2xl font-bold">{stats.cidades.length}</p><p className="text-xs text-muted-foreground">Cidades</p></div>
                <div className="rounded-lg bg-muted/50 p-3"><p className="text-2xl font-bold">{stats.categorias.length}</p><p className="text-xs text-muted-foreground">Categorias</p></div>
              </div>
            </Card>
            <Card className="p-4">
              <p className="mb-2 text-sm font-semibold">Por cidade</p>
              <div className="space-y-1 text-sm">
                {stats.cidades.map(([c, n]) => (
                  <div key={c} className="flex justify-between"><span className="truncate">{c}</span><Badge variant="secondary">{n}</Badge></div>
                ))}
                {stats.cidades.length === 0 && <p className="text-xs text-muted-foreground">Sem dados.</p>}
              </div>
            </Card>
            <Card className="p-4 md:col-span-2">
              <p className="mb-2 text-sm font-semibold">Por categoria</p>
              <div className="flex flex-wrap gap-2">
                {stats.categorias.map(([c, n]) => (
                  <Badge key={c} variant="outline" className="capitalize" style={{ borderColor: CORES[c] ?? CORES.outro }}>{c}: {n}</Badge>
                ))}
                {stats.categorias.length === 0 && <p className="text-xs text-muted-foreground">Sem dados.</p>}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="dados" className="mt-3">
            <Card className="space-y-3 p-4">
              <p className="text-sm text-muted-foreground">Exporte uma cópia dos seus fornecedores ou importe de um backup.</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={exportarJSON}><Download className="mr-1 size-4" /> Exportar JSON</Button>
                <Button variant="outline" size="sm" onClick={exportarCSV}><Download className="mr-1 size-4" /> Exportar CSV</Button>
                <Button variant="outline" size="sm" onClick={() => importRef.current?.click()}><Upload className="mr-1 size-4" /> Importar JSON</Button>
                <input ref={importRef} type="file" accept="application/json" hidden onChange={(e) => { void importarJSON(e.target.files?.[0]); e.target.value = ""; }} />
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Detalhes */}
      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
          {sel && <Detalhes f={sel} minha={minha}
            onEditar={() => { setForm(sel); setSel(null); setAberto(true); }}
            onExcluir={() => excluir(sel)}
            onFav={() => alternarFavorito(sel)} />}
        </DialogContent>
      </Dialog>

      {/* Formulário */}
      <Dialog open={aberto} onOpenChange={(o) => { setAberto(o); if (!o) setForm(vazio()); }}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <Campo label="Nome da loja *"><Input value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Agropecuária Central" /></Campo>
            <Campo label="Responsável"><Input value={form.responsavel ?? ""} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></Campo>
            <Campo label="Categoria">
              <Select value={form.categoria ?? "outro"} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
            </Campo>
            <Campo label="CEP"><Input value={form.cep ?? ""} onChange={(e) => setForm({ ...form, cep: e.target.value })} /></Campo>
            <div className="md:col-span-2">
              <Campo label="Endereço completo">
                <div className="flex gap-2">
                  <Input value={form.endereco ?? ""} onChange={(e) => setForm({ ...form, endereco: e.target.value })} placeholder="Rua, número, bairro, cidade" />
                  <Button type="button" variant="outline" onClick={buscarEndereco} disabled={buscandoEnd}>
                    {buscandoEnd ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                  </Button>
                </div>
              </Campo>
            </div>
            <Campo label="Cidade"><Input value={form.cidade ?? ""} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></Campo>
            <Campo label="Estado"><Input value={form.estado ?? ""} onChange={(e) => setForm({ ...form, estado: e.target.value })} maxLength={2} /></Campo>
            <Campo label="Telefone"><Input value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(14) 3333-0000" /></Campo>
            <Campo label="WhatsApp"><Input value={form.whatsapp ?? ""} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="(14) 99999-0000" /></Campo>
            <Campo label="E-mail"><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Campo>
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Latitude"><Input type="number" value={form.latitude ?? ""} onChange={(e) => setForm({ ...form, latitude: e.target.value ? +e.target.value : null })} /></Campo>
              <Campo label="Longitude"><Input type="number" value={form.longitude ?? ""} onChange={(e) => setForm({ ...form, longitude: e.target.value ? +e.target.value : null })} /></Campo>
            </div>
            <div className="md:col-span-2">
              <Campo label="Anotações (preços, promoções, horários, produtos, pagamento)">
                <Textarea rows={4} value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
              </Campo>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={enviandoFoto}>
              {enviandoFoto ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Camera className="mr-1 size-4" />} Foto da fachada
            </Button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { void enviarFoto(e.target.files?.[0]); e.target.value = ""; }} />
            <Button type="button" variant="outline" size="sm" onClick={() => { if (minha) { setForm({ ...form, latitude: minha.lat, longitude: minha.lng }); void preencherEndereco(minha.lat, minha.lng); toast.success("Usando sua posição atual"); } else localizar(); }}>
              <Crosshair className="mr-1 size-4" /> Usar minha posição
            </Button>
            <Button type="button" variant={form.favorito ? "default" : "outline"} size="sm" onClick={() => setForm({ ...form, favorito: !form.favorito })}>
              <Star className={`mr-1 size-4 ${form.favorito ? "fill-current" : ""}`} /> Favorito
            </Button>
            {form.foto_url && <img src={form.foto_url} alt="Fachada" className="size-12 rounded-lg object-cover" />}
          </div>

          <DialogFooter>
            <Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar fornecedor"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Detalhes({ f, minha, onEditar, onExcluir, onFav }: {
  f: Fornecedor; minha: { lat: number; lng: number } | null;
  onEditar: () => void; onExcluir: () => void; onFav: () => void;
}) {
  const enderecoTxt = [f.endereco, f.cidade, f.estado].filter(Boolean).join(", ");
  const destino = f.latitude != null && f.longitude != null ? `${f.latitude},${f.longitude}` : encodeURIComponent(enderecoTxt);
  const d = minha && f.latitude != null && f.longitude != null ? distKm(minha, { lat: Number(f.latitude), lng: Number(f.longitude) }) : null;
  const zap = soDigitos(f.whatsapp || f.telefone);

  const compartilhar = async () => {
    const texto = `${f.nome}\n${enderecoTxt}\nhttps://www.google.com/maps/search/?api=1&query=${destino}`;
    if (navigator.share) { try { await navigator.share({ title: f.nome, text: texto }); return; } catch { /* cancelado */ } }
    await navigator.clipboard.writeText(texto);
    toast.success("Localização copiada");
  };

  return (
    <div className="space-y-3">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {f.favorito && <Star className="size-4 fill-current text-primary" />}{f.nome}
        </DialogTitle>
      </DialogHeader>

      {f.foto_url && <img src={f.foto_url} alt={`Fachada de ${f.nome}`} className="h-40 w-full rounded-xl object-cover" />}

      <div className="flex flex-wrap gap-2">
        <Badge className="capitalize" style={{ background: `${CORES[f.categoria] ?? CORES.outro}22`, color: CORES[f.categoria] ?? CORES.outro }}>{f.categoria}</Badge>
        {d != null && <Badge variant="secondary">{d.toFixed(1)} km de você</Badge>}
      </div>

      <div className="space-y-1 text-sm">
        {f.responsavel && <p><span className="text-muted-foreground">Responsável:</span> {f.responsavel}</p>}
        {enderecoTxt && <p className="text-muted-foreground">{enderecoTxt}{f.cep ? ` · ${f.cep}` : ""}</p>}
        {f.telefone && <p><span className="text-muted-foreground">Tel:</span> {f.telefone}</p>}
        {f.email && <p><span className="text-muted-foreground">E-mail:</span> {f.email}</p>}
      </div>

      {f.observacoes && (
        <div className="rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-wrap">{f.observacoes}</div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" asChild disabled={!f.telefone}>
          <a href={`tel:${soDigitos(f.telefone)}`}><Phone className="mr-1 size-4" /> Ligar</a>
        </Button>
        <Button variant="outline" size="sm" asChild disabled={!zap}>
          <a href={`https://wa.me/55${zap}`} target="_blank" rel="noopener"><MessageCircle className="mr-1 size-4" /> WhatsApp</a>
        </Button>
        <Button variant="outline" size="sm" onClick={() => { void navigator.clipboard.writeText(enderecoTxt); toast.success("Endereço copiado"); }}>
          <Copy className="mr-1 size-4" /> Copiar endereço
        </Button>
        <Button variant="outline" size="sm" onClick={compartilhar}><Share2 className="mr-1 size-4" /> Compartilhar</Button>
        <Button size="sm" asChild>
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${destino}`} target="_blank" rel="noopener"><Navigation className="mr-1 size-4" /> Google Maps</a>
        </Button>
        <Button size="sm" variant="secondary" asChild>
          <a href={f.latitude != null ? `https://waze.com/ul?ll=${f.latitude},${f.longitude}&navigate=yes` : `https://waze.com/ul?q=${destino}`} target="_blank" rel="noopener">
            <Navigation className="mr-1 size-4" /> Waze
          </a>
        </Button>
      </div>

      <div className="flex justify-between gap-2 border-t pt-3">
        <Button variant="ghost" size="sm" onClick={onFav}><Star className={`mr-1 size-4 ${f.favorito ? "fill-current text-primary" : ""}`} /> Favorito</Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEditar}><Pencil className="mr-1 size-4" /> Editar</Button>
          <Button variant="destructive" size="sm" onClick={onExcluir}><Trash2 className="mr-1 size-4" /> Excluir</Button>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
