import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { useLotes } from "@/lib/state";
import { diffDias, hojeISO } from "@/lib/data";
import { refPesoG } from "@/lib/silo";
import { Activity, HeartPulse } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function AvicultureCharts() {
  const [lotes] = useLotes();
  const hoje = hojeISO();
  const data = useMemo(() => {
    const weighed = lotes.filter((l) => !l.encerrado).flatMap((l) => (l.entries ?? [])
      .filter((e) => e.date <= hoje && Number(e.pesoMedioG) > 0)
      .map((e) => {
        const age = Math.max(0, diffDias(l.dataEntrada, e.date));
        return { age, real: Number(e.pesoMedioG), target: refPesoG(age, l.linhagem ?? "ross_ap95", l.sexo ?? "misto") };
      }));
    const groups = new Map<number, { real: number[]; target: number[] }>();
    weighed.forEach((p) => {
      const g = groups.get(p.age) ?? { real: [], target: [] };
      g.real.push(p.real); g.target.push(p.target); groups.set(p.age, g);
    });
    const weight = [...groups.entries()].sort(([a], [b]) => a - b).map(([age, g]) => ({
      age: `D${age}`,
      real: Math.round(g.real.reduce((s, n) => s + n, 0) / g.real.length),
      target: Math.round(g.target.reduce((s, n) => s + n, 0) / g.target.length),
    }));
    const losses = new Map<string, number>();
    lotes.filter((l) => !l.encerrado).forEach((l) => (l.entries ?? []).filter((e) => e.date <= hoje).forEach((e) => {
      const n = Math.max(0, Number(e.mortalidade) || 0) + Math.max(0, Number(e.eliminados) || 0);
      if (n) losses.set(e.date, (losses.get(e.date) ?? 0) + n);
    }));
    const mortality = [...losses.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([date, birds]) => ({
      date: date.slice(5).split("-").reverse().join("/"), birds,
    }));
    return { weight, mortality };
  }, [lotes, hoje]);

  return (
    <section className="grid gap-3 xl:grid-cols-2" aria-label="Gráficos de desempenho avícola">
      <Card className="avi-card-3d overflow-hidden p-4 md:p-5">
        <div className="mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-primary"/><div><h3 className="font-semibold">Curva de crescimento</h3><p className="text-xs text-muted-foreground">Peso real médio versus referência · gramas</p></div></div>
        {data.weight.length ? <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.weight} margin={{top:12,right:8,left:-18,bottom:0}}>
              <defs><linearGradient id="aviWeightArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#16845b" stopOpacity={0.28}/><stop offset="100%" stopColor="#16845b" stopOpacity={0.02}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.55}/>
              <XAxis dataKey="age" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}} width={46}/>
              <Tooltip formatter={(v, name) => [`${Number(v).toLocaleString("pt-BR")} g`, name === "real" ? "Peso real médio" : "Referência média"]}/>
              <Area type="monotone" dataKey="real" stroke="#16845b" strokeWidth={3} fill="url(#aviWeightArea)" activeDot={{r:6}}/>
              <Line type="monotone" dataKey="target" name="Referência" stroke="#94a3b8" strokeDasharray="5 4" strokeWidth={2} dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div> : <Empty text="Registre pesagens para visualizar a evolução real."/>}
        <p className="mt-2 text-[11px] text-muted-foreground">Quando há vários lotes, os pontos mostram médias por idade. A referência respeita linhagem e sexo cadastrados.</p>
      </Card>
      <Card className="avi-card-3d overflow-hidden p-4 md:p-5">
        <div className="mb-3 flex items-center gap-2"><HeartPulse className="h-4 w-4 text-primary"/><div><h3 className="font-semibold">Baixas diárias</h3><p className="text-xs text-muted-foreground">Mortalidade + eliminados · últimos 14 dias com ocorrências</p></div></div>
        {data.mortality.length ? <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.mortality} margin={{top:12,right:8,left:-18,bottom:0}}>
              <defs><linearGradient id="aviMortBars" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e18a42"/><stop offset="100%" stopColor="#f4c78f"/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.55}/>
              <XAxis dataKey="date" tick={{fontSize:10}}/><YAxis allowDecimals={false} tick={{fontSize:11}} width={42}/>
              <Tooltip formatter={(v) => [Number(v).toLocaleString("pt-BR"), "Aves"]}/>
              <Bar dataKey="birds" name="Baixas" fill="url(#aviMortBars)" radius={[7,7,0,0]} maxBarSize={34}/>
            </BarChart>
          </ResponsiveContainer>
        </div> : <Empty text="As baixas aparecem aqui quando forem registradas."/>}
        <p className="mt-2 text-[11px] text-muted-foreground">Dias sem lançamento de baixa não são interpretados como zero.</p>
      </Card>
    </section>
  );
}

function Empty({text}:{text:string}) {
  return <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 text-center text-sm text-muted-foreground">{text}</div>;
}
