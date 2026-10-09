import { useEffect, useState } from "react";
import { useFazenda } from "@/lib/cloud/fazenda";
import { fetchWeather, wmoEmoji, wmoLabel, geocode, type WeatherSnapshot } from "@/lib/weather";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Cloud, Droplets, Wind, Thermometer, Sunrise, Sunset, MapPin, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { fmtData } from "@/lib/data";

export function WeatherWidget({ compact }: { compact?: boolean }) {
  const { coords, setCoords } = useFazenda();
  const [data, setData] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [results, setResults] = useState<Awaited<ReturnType<typeof geocode>>>([]);

  useEffect(() => {
    if (!coords) return;
    setLoading(true);
    fetchWeather(coords.lat, coords.lon)
      .then(setData)
      .catch(() => toast.error("Falha ao buscar clima"))
      .finally(() => setLoading(false));
    const t = setInterval(() => fetchWeather(coords.lat, coords.lon).then(setData).catch(() => {}), 15 * 60_000);
    return () => clearInterval(t);
  }, [coords?.lat, coords?.lon]);

  async function buscar() {
    if (!busca.trim()) return;
    setResults(await geocode(busca));
  }
  async function escolher(r: typeof results[number]) {
    await setCoords({ lat: r.lat, lon: r.lon, cidade: `${r.name}${r.admin ? ", " + r.admin : ""}` });
    setSetupOpen(false); setBusca(""); setResults([]);
    toast.success("Localização salva");
  }
  async function usarGPS() {
    if (!navigator.geolocation) return toast.error("GPS indisponível");
    navigator.geolocation.getCurrentPosition(
      async (pos) => { await setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }); setSetupOpen(false); toast.success("GPS salvo"); },
      () => toast.error("Permissão negada"),
    );
  }

  if (!coords || setupOpen) {
    return (
      <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="h-4 w-4 text-primary" />
          <h3 className="font-display font-semibold">Definir localização da fazenda</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Necessária para previsão do tempo, alertas de calor na granja.</p>
        <div className="flex gap-2 mb-2">
          <Input placeholder="Cidade, ex: Patos de Minas" value={busca} onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => e.key === "Enter" && buscar()} />
          <Button onClick={buscar} variant="secondary">Buscar</Button>
        </div>
        <Button onClick={usarGPS} variant="outline" size="sm" className="w-full mb-2"><MapPin className="h-4 w-4 mr-1.5" /> Usar GPS atual</Button>
        {results.length > 0 && (
          <div className="space-y-1 mt-2">
            {results.map((r, i) => (
              <button key={i} onClick={() => escolher(r)} className="w-full text-left p-2 rounded hover:bg-muted text-sm">
                <span className="font-medium">{r.name}</span>
                <span className="text-muted-foreground"> · {r.admin ?? ""} {r.country ?? ""}</span>
              </button>
            ))}
          </div>
        )}
      </Card>
    );
  }

  if (loading || !data) {
    return (
      <Card className="p-5 flex items-center justify-center min-h-[180px]" style={{ background: "var(--gradient-surface)" }}>
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </Card>
    );
  }

  const c = data.current;
  const hoje = data.daily[0];
  const proxChuva = data.daily.find((d, i) => i > 0 && d.chuvaMm > 0.5);

  if (compact) {
    return (
      <Card className="p-4 relative overflow-hidden" style={{ background: "var(--gradient-surface)" }}>
        <div className="absolute -right-6 -top-6 text-7xl opacity-15">{wmoEmoji(c.code, c.isDay)}</div>
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{coords.cidade ?? `${coords.lat.toFixed(2)}, ${coords.lon.toFixed(2)}`}</p>
            <button onClick={() => setSetupOpen(true)} className="text-[10px] text-muted-foreground hover:text-primary">trocar</button>
          </div>
          <div className="flex items-end gap-3">
            <div className="text-4xl font-display font-bold">{c.tempC.toFixed(0)}°</div>
            <div className="text-sm text-muted-foreground pb-1.5">
              <div>{wmoLabel[c.code] ?? "—"}</div>
              <div className="text-xs">Sensação {c.feelsC.toFixed(0)}° · Máx {hoje.tMax.toFixed(0)}° / Mín {hoje.tMin.toFixed(0)}°</div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 relative overflow-hidden" style={{ background: "var(--gradient-surface)" }}>
      <div className="absolute -right-8 -top-8 text-9xl opacity-10 select-none">{wmoEmoji(c.code, c.isDay)}</div>

      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">{coords.cidade ?? `${coords.lat.toFixed(3)}, ${coords.lon.toFixed(3)}`}</p>
          </div>
          <button onClick={() => setSetupOpen(true)} className="text-xs text-muted-foreground hover:text-primary">trocar</button>
        </div>

        <div className="flex items-end gap-4 mb-4">
          <div className="text-6xl font-display font-bold leading-none">{c.tempC.toFixed(0)}°</div>
          <div className="pb-2">
            <div className="text-base font-medium">{wmoLabel[c.code] ?? "—"}</div>
            <div className="text-xs text-muted-foreground">Sensação térmica {c.feelsC.toFixed(0)}°</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-xs mb-4">
          <Metric icon={Droplets} value={`${c.umidade}%`} label="Umidade" />
          <Metric icon={Wind} value={`${c.vento.toFixed(0)} km/h`} label="Vento" />
          <Metric icon={Cloud} value={`${c.chuvaProb}%`} label="Chuva" />
          <Metric icon={Thermometer} value={`${hoje.tMax.toFixed(0)}/${hoje.tMin.toFixed(0)}°`} label="Máx/Mín" />
        </div>

        {data.alertas.length > 0 && (
          <div className="space-y-1 mb-4">
            {data.alertas.map((a, i) => (
              <div key={i} className="text-xs p-2 rounded bg-destructive/15 border border-destructive/30 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                <span>{a}</span>
              </div>
            ))}
          </div>
        )}

        {proxChuva && (
          <div className="text-xs p-2 rounded bg-primary/10 border border-primary/30 mb-4">
            🌧️ Próxima chuva: <strong>{fmtData(proxChuva.date, { weekday: "short", day: "2-digit", month: "2-digit" })}</strong> · {proxChuva.chuvaMm.toFixed(0)} mm ({proxChuva.chuvaProb}%)
          </div>
        )}

        <div className="grid grid-cols-7 gap-1.5">
          {data.daily.map((d) => (
            <div key={d.date} className="text-center p-1.5 rounded bg-muted/40">
              <div className="text-[10px] text-muted-foreground uppercase">{fmtData(d.date, { weekday: "short" }).slice(0, 3)}</div>
              <div className="text-xl my-0.5">{wmoEmoji(d.code, true)}</div>
              <div className="text-[11px] font-semibold">{d.tMax.toFixed(0)}°</div>
              <div className="text-[10px] text-muted-foreground">{d.tMin.toFixed(0)}°</div>
              {d.chuvaMm > 0.5 && <div className="text-[9px] text-primary mt-0.5">{d.chuvaMm.toFixed(0)}mm</div>}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border/40">
          <span className="flex items-center gap-1"><Sunrise className="h-3 w-3" /> {new Date(hoje.sunrise).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
          <span className="flex items-center gap-1"><Sunset className="h-3 w-3" /> {new Date(hoje.sunset).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
          <Badge variant="outline" className="text-[9px]">Open-Meteo</Badge>
        </div>
      </div>
    </Card>
  );
}

function Metric({ icon: Icon, value, label }: any) {
  return (
    <div className="rounded-lg bg-muted/40 p-2 text-center">
      <Icon className="h-3.5 w-3.5 mx-auto text-primary mb-0.5" />
      <div className="font-semibold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
