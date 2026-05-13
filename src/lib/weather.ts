// Open-Meteo (sem chave) — clima atual + previsão 7 dias.
export type WeatherSnapshot = {
  current: {
    tempC: number;
    feelsC: number;
    umidade: number;
    vento: number;
    code: number;
    chuvaProb: number;
    isDay: boolean;
  };
  daily: Array<{
    date: string;
    tMax: number;
    tMin: number;
    chuvaMm: number;
    chuvaProb: number;
    code: number;
    sunrise: string;
    sunset: string;
  }>;
  hourlyChuva: Array<{ hora: string; mm: number; prob: number }>;
  alertas: string[];
};

export const wmoLabel: Record<number, string> = {
  0: "Céu limpo", 1: "Predominantemente claro", 2: "Parcialmente nublado", 3: "Nublado",
  45: "Neblina", 48: "Neblina com geada",
  51: "Garoa fraca", 53: "Garoa", 55: "Garoa forte",
  61: "Chuva fraca", 63: "Chuva", 65: "Chuva forte",
  66: "Chuva congelante", 67: "Chuva congelante forte",
  71: "Neve fraca", 73: "Neve", 75: "Neve forte",
  77: "Granizo de neve",
  80: "Pancadas de chuva", 81: "Pancadas fortes", 82: "Temporal",
  85: "Pancadas de neve", 86: "Pancadas fortes de neve",
  95: "Trovoada", 96: "Trovoada com granizo", 99: "Trovoada severa",
};

export function wmoEmoji(code: number, day = true): string {
  if (code === 0) return day ? "☀️" : "🌙";
  if (code <= 2) return day ? "🌤️" : "🌙";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "🌨️";
  if (code >= 80 && code <= 82) return "⛈️";
  if (code >= 85 && code <= 86) return "🌨️";
  if (code >= 95) return "⛈️";
  return "🌡️";
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherSnapshot> {
  const u = new URL("https://api.open-meteo.com/v1/forecast");
  u.searchParams.set("latitude", String(lat));
  u.searchParams.set("longitude", String(lon));
  u.searchParams.set("current", "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,precipitation_probability");
  u.searchParams.set("hourly", "precipitation,precipitation_probability");
  u.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset");
  u.searchParams.set("timezone", "auto");
  u.searchParams.set("forecast_days", "7");
  const res = await fetch(u.toString());
  if (!res.ok) throw new Error("Falha ao buscar clima");
  const j: any = await res.json();

  const c = j.current;
  const d = j.daily;
  const h = j.hourly;
  const now = new Date();
  const horas: WeatherSnapshot["hourlyChuva"] = [];
  for (let i = 0; i < (h.time?.length ?? 0); i++) {
    const t = new Date(h.time[i]);
    if (t < now) continue;
    horas.push({ hora: h.time[i], mm: Number(h.precipitation[i] ?? 0), prob: Number(h.precipitation_probability[i] ?? 0) });
    if (horas.length >= 24) break;
  }

  const daily = (d.time as string[]).map((date, i) => ({
    date,
    tMax: Number(d.temperature_2m_max[i]),
    tMin: Number(d.temperature_2m_min[i]),
    chuvaMm: Number(d.precipitation_sum[i] ?? 0),
    chuvaProb: Number(d.precipitation_probability_max[i] ?? 0),
    code: Number(d.weather_code[i]),
    sunrise: d.sunrise[i],
    sunset: d.sunset[i],
  }));

  const alertas: string[] = [];
  if (c.temperature_2m >= 35) alertas.push("⚠️ Calor extremo hoje — reforçar ventilação e água.");
  if (c.temperature_2m <= 8) alertas.push("⚠️ Frio intenso — proteger pintainhos e bezerros.");
  if (c.relative_humidity_2m < 35) alertas.push("⚠️ Umidade baixa — risco de queimada.");
  const chuva24 = horas.reduce((s, x) => s + x.mm, 0);
  if (chuva24 >= 30) alertas.push(`⚠️ Chuva forte prevista nas próximas 24h (${chuva24.toFixed(0)} mm).`);
  const ventoKmh = Number(c.wind_speed_10m);
  if (ventoKmh >= 50) alertas.push(`⚠️ Vento forte (${ventoKmh.toFixed(0)} km/h).`);

  return {
    current: {
      tempC: Number(c.temperature_2m),
      feelsC: Number(c.apparent_temperature),
      umidade: Number(c.relative_humidity_2m),
      vento: ventoKmh,
      code: Number(c.weather_code),
      chuvaProb: Number(c.precipitation_probability ?? 0),
      isDay: !!c.is_day,
    },
    daily,
    hourlyChuva: horas,
    alertas,
  };
}

export async function geocode(q: string): Promise<Array<{ name: string; lat: number; lon: number; admin?: string; country?: string }>> {
  const u = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=pt&format=json`;
  const res = await fetch(u);
  if (!res.ok) return [];
  const j: any = await res.json();
  return (j.results ?? []).map((r: any) => ({ name: r.name, lat: r.latitude, lon: r.longitude, admin: r.admin1, country: r.country }));
}
