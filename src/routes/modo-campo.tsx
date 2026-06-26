import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, MapPin, ScanLine, Mic, MicOff, CheckCircle2, AlertTriangle, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useDiario, useAnimais } from "@/lib/state";
import { uid } from "@/lib/storage";

export const Route = createFileRoute("/modo-campo")({
  head: () => ({
    meta: [
      { title: "Modo Campo — AgroSítio" },
      { name: "description", content: "Ferramentas de campo: câmera com GPS, leitor de brinco/QR e ditado por voz." },
    ],
  }),
  component: ModoCampoPage,
});

function ModoCampoPage() {
  return (
    <AppShell>
      <div className="space-y-4 max-w-4xl mx-auto">
        <header>
          <h1 className="text-3xl md:text-4xl font-display font-bold flex items-center gap-2">
            <MapPin className="h-8 w-8 text-primary" /> Modo Campo
          </h1>
          <p className="text-muted-foreground mt-1">Ferramentas rápidas para registrar do pasto, do galpão ou da lavoura.</p>
          <OfflineBadge />
        </header>

        <Tabs defaultValue="foto" className="space-y-4">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="foto"><Camera className="h-4 w-4 mr-1" /> Foto + GPS</TabsTrigger>
            <TabsTrigger value="brinco"><ScanLine className="h-4 w-4 mr-1" /> Brinco/QR</TabsTrigger>
            <TabsTrigger value="voz"><Mic className="h-4 w-4 mr-1" /> Voz → Diário</TabsTrigger>
          </TabsList>

          <TabsContent value="foto"><FotoGPS /></TabsContent>
          <TabsContent value="brinco"><LeitorBrinco /></TabsContent>
          <TabsContent value="voz"><DitadoVoz /></TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function OfflineBadge() {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return (
    <Badge variant={online ? "secondary" : "destructive"} className="mt-2 text-[10px]">
      {online ? "🟢 Online" : "🔴 Offline — anotações ficam salvas no aparelho"}
    </Badge>
  );
}

/* ============ FOTO + GPS ============ */
function FotoGPS() {
  const [, setDiario] = useDiario();
  const [foto, setFoto] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number; acc: number } | null>(null);
  const [loadingGps, setLoadingGps] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [nota, setNota] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function capturarGps() {
    if (!navigator.geolocation) return toast.error("GPS não suportado neste aparelho");
    setLoadingGps(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoords({ lat: p.coords.latitude, lon: p.coords.longitude, acc: Math.round(p.coords.accuracy) });
        setLoadingGps(false);
        toast.success(`Localização capturada (±${Math.round(p.coords.accuracy)}m)`);
      },
      (e) => { setLoadingGps(false); toast.error("GPS: " + e.message); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 6_000_000) return toast.error("Foto grande demais. Use a câmera direto.");
    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = () => rej(r.error);
      r.readAsDataURL(f);
    });
    setFoto(dataUrl);
    if (!coords) capturarGps();
  }

  async function salvar() {
    if (!foto && !nota.trim() && !titulo.trim()) return toast.error("Adicione foto, título ou nota");
    const txt = [
      titulo.trim() && `**${titulo.trim()}**`,
      nota.trim(),
      coords && `📍 ${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)} (±${coords.acc}m) — https://maps.google.com/?q=${coords.lat},${coords.lon}`,
    ].filter(Boolean).join("\n\n");
    setDiario((prev) => [
      { id: uid(), data: new Date().toISOString().slice(0, 10), titulo: titulo.trim() || "Registro de campo", texto: txt, foto: foto ?? undefined, tags: ["campo"] } as any,
      ...prev,
    ]);
    toast.success("Registro salvo no Diário");
    setFoto(null); setCoords(null); setTitulo(""); setNota("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <Card className="p-5 space-y-4">
      <div>
        <Label>Foto</Label>
        <div className="mt-2">
          {foto ? (
            <div className="relative">
              <img src={foto} alt="captura" className="w-full max-h-80 object-cover rounded-lg border border-border" />
              <Button size="icon" variant="destructive" className="absolute top-2 right-2 h-8 w-8" onClick={() => setFoto(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <label className="block">
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={onFile}
              />
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                <Camera className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Toque para abrir a câmera</p>
                <p className="text-xs text-muted-foreground mt-1">ou escolher uma imagem</p>
              </div>
            </label>
          )}
        </div>
      </div>

      <div>
        <Label className="flex items-center justify-between">
          <span>Localização GPS</span>
          <Button size="sm" variant="outline" onClick={capturarGps} disabled={loadingGps}>
            {loadingGps ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <MapPin className="h-3 w-3 mr-1" />}
            {coords ? "Atualizar" : "Capturar"}
          </Button>
        </Label>
        {coords ? (
          <div className="mt-2 p-3 rounded-lg bg-primary/10 border border-primary/30 text-sm">
            <div className="flex items-center gap-2 font-mono text-xs">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              {coords.lat.toFixed(6)}, {coords.lon.toFixed(6)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Precisão ±{coords.acc}m · <a href={`https://maps.google.com/?q=${coords.lat},${coords.lon}`} target="_blank" rel="noreferrer" className="underline">abrir no mapa</a></div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">Capture automaticamente ao tirar foto, ou toque em "Capturar".</p>
        )}
      </div>

      <div>
        <Label>Título</Label>
        <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Cerca quebrada no Pasto 3" />
      </div>
      <div>
        <Label>Observação</Label>
        <Textarea value={nota} onChange={(e) => setNota(e.target.value)} placeholder="O que aconteceu, o que precisa fazer..." rows={3} />
      </div>

      <Button onClick={salvar} className="w-full" size="lg"><Upload className="h-4 w-4 mr-2" /> Salvar no Diário</Button>
    </Card>
  );
}

/* ============ LEITOR DE BRINCO / QR ============ */
function LeitorBrinco() {
  const [animais] = useAnimais();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [manual, setManual] = useState("");

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "BarcodeDetector" in window);
    return () => stop();
  }, []);

  async function start() {
    setResult(null);
    if (!("BarcodeDetector" in window)) {
      toast.error("Câmera-scanner não suportado neste navegador. Use o campo manual abaixo.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setRunning(true);
      // @ts-expect-error BarcodeDetector
      const detector = new window.BarcodeDetector({ formats: ["qr_code", "code_128", "ean_13", "ean_8", "code_39", "data_matrix"] });
      const tick = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes && codes.length > 0) {
            const v = codes[0].rawValue as string;
            setResult(v);
            stop();
            return;
          }
        } catch {}
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (e: any) {
      toast.error("Câmera: " + (e?.message ?? "acesso negado"));
    }
  }
  function stop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRunning(false);
  }

  const codigo = result ?? manual.trim();
  const encontrado = codigo ? animais.find((a) => a.brinco?.toUpperCase() === codigo.toUpperCase() || a.id === codigo) : null;

  return (
    <Card className="p-5 space-y-4">
      {supported === false && (
        <div className="rounded-lg p-3 bg-amber-500/10 border border-amber-500/30 text-xs flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div>Este navegador não tem scanner nativo. Use o iPhone/Android no Chrome ou digite o número do brinco manualmente.</div>
        </div>
      )}

      <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        {!running && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button onClick={start} size="lg"><ScanLine className="h-5 w-5 mr-2" /> Iniciar leitor</Button>
          </div>
        )}
        {running && (
          <>
            <div className="absolute inset-x-12 top-1/2 -translate-y-1/2 h-0.5 bg-primary animate-pulse" />
            <Button onClick={stop} variant="destructive" size="sm" className="absolute top-2 right-2">Parar</Button>
          </>
        )}
      </div>

      <div>
        <Label>Ou digite o brinco manualmente</Label>
        <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Ex: 1234 ou BR-0567" />
      </div>

      {codigo && (
        <div className={`rounded-lg p-4 border ${encontrado ? "border-primary/50 bg-primary/10" : "border-amber-500/30 bg-amber-500/10"}`}>
          <div className="text-xs text-muted-foreground">Código lido</div>
          <div className="font-mono text-lg font-bold">{codigo}</div>
          {encontrado ? (
            <div className="mt-2 text-sm">
              <p>✅ Animal encontrado: <strong>{encontrado.nome ?? "(sem nome)"}</strong></p>
              <p className="text-xs text-muted-foreground">{encontrado.raca ?? "—"} · {encontrado.sexo ?? "—"} · status {encontrado.status}</p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">⚠️ Nenhum animal com este brinco no rebanho.</p>
          )}
        </div>
      )}
    </Card>
  );
}

/* ============ DITADO POR VOZ ============ */
function DitadoVoz() {
  const [, setDiario] = useDiario();
  const [rec, setRec] = useState(false);
  const [texto, setTexto] = useState("");
  const [titulo, setTitulo] = useState("");
  const recRef = useRef<any>(null);
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    const W = typeof window !== "undefined" ? (window as any) : {};
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  function toggle() {
    const W = window as any;
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SR) return toast.error("Reconhecimento de voz não suportado neste navegador (use Chrome no Android).");
    if (rec) { recRef.current?.stop(); setRec(false); return; }
    const r = new SR();
    r.lang = "pt-BR";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e: any) => {
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
      }
      if (final) setTexto((t) => (t + " " + final).trim());
    };
    r.onerror = (e: any) => { toast.error("Voz: " + (e.error ?? "erro")); setRec(false); };
    r.onend = () => setRec(false);
    r.start();
    recRef.current = r;
    setRec(true);
  }

  function salvar() {
    if (!texto.trim()) return toast.error("Nada para salvar");
    setDiario((prev) => [
      { id: uid(), data: new Date().toISOString().slice(0, 10), titulo: titulo.trim() || "Ditado de voz", texto, tags: ["campo", "voz"] } as any,
      ...prev,
    ]);
    toast.success("Salvo no Diário");
    setTexto(""); setTitulo("");
  }

  return (
    <Card className="p-5 space-y-4">
      {supported === false && (
        <div className="rounded-lg p-3 bg-amber-500/10 border border-amber-500/30 text-xs flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div>Reconhecimento de voz só funciona em navegadores Chrome (Android e desktop).</div>
        </div>
      )}
      <div className="flex flex-col items-center gap-3 py-4">
        <button
          onClick={toggle}
          className={`h-24 w-24 rounded-full flex items-center justify-center transition-all ${rec ? "bg-destructive text-destructive-foreground animate-pulse scale-110" : "bg-primary text-primary-foreground hover:scale-105"}`}
        >
          {rec ? <MicOff className="h-10 w-10" /> : <Mic className="h-10 w-10" />}
        </button>
        <p className="text-sm font-medium">{rec ? "Gravando... toque para parar" : "Toque para falar"}</p>
      </div>
      <div>
        <Label>Título</Label>
        <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Opcional" />
      </div>
      <div>
        <Label>Transcrição</Label>
        <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={5} placeholder="O que você falar aparece aqui..." />
      </div>
      <Button onClick={salvar} className="w-full" size="lg" disabled={!texto.trim()}>Salvar no Diário</Button>
    </Card>
  );
}
