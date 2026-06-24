import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Ruler, Trash2, Save, MapPin, Undo2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/medir-area")({
  head: () => ({
    meta: [
      { title: "Medidor de Área via Satélite — AgroSítio" },
      { name: "description", content: "Meça talhões em hectares, alqueires e m² desenhando no mapa de satélite." },
    ],
  }),
  component: MedirAreaPage,
});

declare global {
  interface Window {
    google: any;
    __initAgroMap?: () => void;
  }
}

const M2_POR_HA = 10000;
const M2_POR_ALQ_SP = 24200; // alqueire paulista (2,42 ha)
const M2_POR_ALQ_MG = 48400; // alqueire mineiro (4,84 ha)
const M2_POR_ALQ_NORTE = 27225; // alqueire do norte (2,7225 ha)
const M2_POR_TAREFA = 3025; // tarefa NE (~30,25 ares)

type Talhao = {
  id: string;
  nome: string;
  areaM2: number;
  perimetroM: number;
  coords: { lat: number; lng: number }[];
  criadoEm: string;
};

const STORAGE_KEY = "agrositio:talhoes";

function loadTalhoes(): Talhao[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveTalhoes(t: Talhao[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
}

function MedirAreaPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObjRef = useRef<any>(null);
  const polygonRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const pathRef = useRef<{ lat: number; lng: number }[]>([]);

  const [ready, setReady] = useState(false);
  const [areaM2, setAreaM2] = useState(0);
  const [perimetroM, setPerimetroM] = useState(0);
  const [nome, setNome] = useState("");
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    setTalhoes(loadTalhoes());
  }, []);

  // Load Google Maps JS
  useEffect(() => {
    const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
    const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
    if (!key) {
      toast.error("Google Maps não configurado");
      return;
    }
    if (window.google?.maps) {
      initMap();
      return;
    }
    window.__initAgroMap = initMap;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__initAgroMap&libraries=geometry,places${channel ? `&channel=${channel}` : ""}`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    return () => {
      delete window.__initAgroMap;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function initMap() {
    if (!mapRef.current || !window.google) return;
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: -22.5, lng: -48.5 },
      zoom: 16,
      mapTypeId: "hybrid",
      tilt: 0,
      streetViewControl: false,
      fullscreenControl: true,
    });
    mapObjRef.current = map;

    // Tentar centralizar na localização
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => map.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { timeout: 5000 },
      );
    }

    map.addListener("click", (e: any) => {
      const pt = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      pathRef.current = [...pathRef.current, pt];
      const marker = new window.google.maps.Marker({
        position: pt,
        map,
        label: `${pathRef.current.length}`,
        draggable: true,
      });
      marker.addListener("dragend", (ev: any) => {
        const idx = markersRef.current.indexOf(marker);
        if (idx >= 0) {
          pathRef.current[idx] = { lat: ev.latLng.lat(), lng: ev.latLng.lng() };
          redrawPolygon();
        }
      });
      markersRef.current.push(marker);
      redrawPolygon();
    });

    setReady(true);
  }

  function redrawPolygon() {
    if (!mapObjRef.current || !window.google) return;
    if (polygonRef.current) polygonRef.current.setMap(null);
    if (pathRef.current.length < 2) {
      setAreaM2(0);
      setPerimetroM(0);
      return;
    }
    polygonRef.current = new window.google.maps.Polygon({
      paths: pathRef.current,
      strokeColor: "#22c55e",
      strokeOpacity: 0.95,
      strokeWeight: 3,
      fillColor: "#22c55e",
      fillOpacity: 0.25,
      map: mapObjRef.current,
    });
    if (pathRef.current.length >= 3) {
      const a = window.google.maps.geometry.spherical.computeArea(pathRef.current);
      const closed = [...pathRef.current, pathRef.current[0]];
      const p = window.google.maps.geometry.spherical.computeLength(closed);
      setAreaM2(a);
      setPerimetroM(p);
    } else {
      setAreaM2(0);
      const p = window.google.maps.geometry.spherical.computeLength(pathRef.current);
      setPerimetroM(p);
    }
  }

  function limpar() {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    pathRef.current = [];
    if (polygonRef.current) polygonRef.current.setMap(null);
    polygonRef.current = null;
    setAreaM2(0);
    setPerimetroM(0);
  }

  function desfazer() {
    if (pathRef.current.length === 0) return;
    pathRef.current = pathRef.current.slice(0, -1);
    const last = markersRef.current.pop();
    if (last) last.setMap(null);
    redrawPolygon();
  }

  function salvar() {
    if (areaM2 <= 0 || pathRef.current.length < 3) {
      toast.error("Desenhe pelo menos 3 pontos");
      return;
    }
    const novo: Talhao = {
      id: crypto.randomUUID(),
      nome: nome.trim() || `Talhão ${talhoes.length + 1}`,
      areaM2,
      perimetroM,
      coords: pathRef.current,
      criadoEm: new Date().toISOString(),
    };
    const next = [novo, ...talhoes];
    setTalhoes(next);
    saveTalhoes(next);
    setNome("");
    toast.success(`${novo.nome} salvo`);
  }

  function carregar(t: Talhao) {
    limpar();
    pathRef.current = [...t.coords];
    t.coords.forEach((pt, i) => {
      const marker = new window.google.maps.Marker({
        position: pt,
        map: mapObjRef.current,
        label: `${i + 1}`,
        draggable: true,
      });
      marker.addListener("dragend", (ev: any) => {
        const idx = markersRef.current.indexOf(marker);
        if (idx >= 0) {
          pathRef.current[idx] = { lat: ev.latLng.lat(), lng: ev.latLng.lng() };
          redrawPolygon();
        }
      });
      markersRef.current.push(marker);
    });
    redrawPolygon();
    if (t.coords.length > 0) mapObjRef.current.setCenter(t.coords[0]);
  }

  function excluir(id: string) {
    const next = talhoes.filter((t) => t.id !== id);
    setTalhoes(next);
    saveTalhoes(next);
  }

  async function buscarLocal() {
    if (!busca.trim() || !window.google) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: busca }, (res: any[], status: string) => {
      if (status === "OK" && res[0]) {
        mapObjRef.current.setCenter(res[0].geometry.location);
        mapObjRef.current.setZoom(17);
      } else {
        toast.error("Local não encontrado");
      }
    });
  }

  const ha = areaM2 / M2_POR_HA;
  const alqSP = areaM2 / M2_POR_ALQ_SP;
  const alqMG = areaM2 / M2_POR_ALQ_MG;
  const alqN = areaM2 / M2_POR_ALQ_NORTE;
  const tarefa = areaM2 / M2_POR_TAREFA;

  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
            <Ruler className="h-7 w-7 text-primary" /> Medidor de Área via Satélite
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Toque no mapa para marcar os vértices do terreno. Arraste os pontos para ajustar.
          </p>
        </div>

        <Card className="p-3">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar cidade, endereço, fazenda..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buscarLocal()}
            />
            <Button onClick={buscarLocal} variant="secondary"><MapPin className="h-4 w-4" /></Button>
          </div>
        </Card>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            <Card className="overflow-hidden">
              <div ref={mapRef} className="w-full h-[480px] bg-muted" />
            </Card>
            <div className="flex flex-wrap gap-2">
              <Button onClick={desfazer} variant="outline" size="sm" disabled={!ready}>
                <Undo2 className="h-4 w-4 mr-1" /> Desfazer
              </Button>
              <Button onClick={limpar} variant="outline" size="sm" disabled={!ready}>
                <Trash2 className="h-4 w-4 mr-1" /> Limpar
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Card className="p-4 space-y-2">
              <div className="text-xs uppercase text-muted-foreground font-semibold">Medição atual</div>
              <Linha k="Hectares (ha)" v={ha.toFixed(4)} destaque />
              <Linha k="Alqueire paulista" v={alqSP.toFixed(4)} />
              <Linha k="Alqueire mineiro" v={alqMG.toFixed(4)} />
              <Linha k="Alqueire do norte" v={alqN.toFixed(4)} />
              <Linha k="Tarefa (NE)" v={tarefa.toFixed(3)} />
              <Linha k="Metros²" v={areaM2.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} />
              <Linha k="Perímetro (m)" v={perimetroM.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} />
              <Linha k="Pontos" v={String(pathRef.current.length)} />
            </Card>

            <Card className="p-4 space-y-2">
              <div className="text-xs uppercase text-muted-foreground font-semibold">Salvar talhão</div>
              <Input placeholder="Nome do talhão" value={nome} onChange={(e) => setNome(e.target.value)} />
              <Button onClick={salvar} className="w-full" disabled={areaM2 <= 0}>
                <Save className="h-4 w-4 mr-2" /> Salvar
              </Button>
            </Card>
          </div>
        </div>

        {talhoes.length > 0 && (
          <Card className="p-4">
            <div className="text-sm font-semibold mb-3">Talhões salvos ({talhoes.length})</div>
            <div className="space-y-2">
              {talhoes.map((t) => (
                <div key={t.id} className="flex items-center gap-2 p-2 rounded border border-border">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{t.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {(t.areaM2 / M2_POR_HA).toFixed(3)} ha · {(t.areaM2 / M2_POR_ALQ_SP).toFixed(3)} alq SP · {t.perimetroM.toFixed(0)} m perímetro
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => carregar(t)}>Abrir</Button>
                  <Button size="sm" variant="ghost" onClick={() => excluir(t.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function Linha({ k, v, destaque }: { k: string; v: string; destaque?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className={destaque ? "font-bold text-primary text-lg" : "font-mono"}>{v}</span>
    </div>
  );
}
