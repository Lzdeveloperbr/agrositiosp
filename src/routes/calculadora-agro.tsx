import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Ruler, Sprout, Droplets, FlaskConical, Truck, Beaker, DollarSign } from "lucide-react";

export const Route = createFileRoute("/calculadora-agro")({
  head: () => ({
    meta: [
      { title: "Calculadora Agro Profissional — AgroSítio" },
      { name: "description", content: "Conversões, adubação NPK, sementes, irrigação, calagem, vazão e custo de diesel por hectare." },
    ],
  }),
  component: CalculadoraPage,
});

function CalculadoraPage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
            <Calculator className="h-7 w-7 text-primary" /> Calculadora Agro Profissional
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ferramentas de campo: conversões, adubação, sementes, irrigação, calagem e custos.
          </p>
        </div>

        <Tabs defaultValue="conversao" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto w-full justify-start">
            <TabsTrigger value="conversao"><Ruler className="h-4 w-4 mr-1" />Conversões</TabsTrigger>
            <TabsTrigger value="npk"><FlaskConical className="h-4 w-4 mr-1" />Adubação NPK</TabsTrigger>
            <TabsTrigger value="semente"><Sprout className="h-4 w-4 mr-1" />Sementes/ha</TabsTrigger>
            <TabsTrigger value="irrigacao"><Droplets className="h-4 w-4 mr-1" />Irrigação</TabsTrigger>
            <TabsTrigger value="calagem"><Beaker className="h-4 w-4 mr-1" />Calagem</TabsTrigger>
            <TabsTrigger value="vazao"><Droplets className="h-4 w-4 mr-1" />Vazão Pulv.</TabsTrigger>
            <TabsTrigger value="diesel"><Truck className="h-4 w-4 mr-1" />Diesel/ha</TabsTrigger>
            <TabsTrigger value="roi"><DollarSign className="h-4 w-4 mr-1" />ROI</TabsTrigger>
          </TabsList>

          <TabsContent value="conversao"><Conversao /></TabsContent>
          <TabsContent value="npk"><NPK /></TabsContent>
          <TabsContent value="semente"><Sementes /></TabsContent>
          <TabsContent value="irrigacao"><Irrigacao /></TabsContent>
          <TabsContent value="calagem"><Calagem /></TabsContent>
          <TabsContent value="vazao"><Vazao /></TabsContent>
          <TabsContent value="diesel"><Diesel /></TabsContent>
          <TabsContent value="roi"><ROI /></TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function Field({ label, value, onChange, unit, step = "any" }: { label: string; value: number | string; onChange: (v: number) => void; unit?: string; step?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2 items-center">
        <Input type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />
        {unit && <span className="text-xs text-muted-foreground w-12">{unit}</span>}
      </div>
    </div>
  );
}

function Resultado({ k, v, destaque }: { k: string; v: string; destaque?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{k}</span>
      <span className={destaque ? "font-bold text-primary" : "font-mono text-sm"}>{v}</span>
    </div>
  );
}

function Conversao() {
  const [valor, setValor] = useState(1);
  const [origem, setOrigem] = useState<"ha" | "m2" | "alqSP" | "alqMG" | "alqN" | "tarefa">("ha");
  const fatores: Record<string, number> = {
    ha: 10000, m2: 1, alqSP: 24200, alqMG: 48400, alqN: 27225, tarefa: 3025,
  };
  const m2 = valor * fatores[origem];
  return (
    <Card className="p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor" value={valor} onChange={setValor} />
        <div className="space-y-1">
          <Label className="text-xs">Unidade</Label>
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={origem} onChange={(e) => setOrigem(e.target.value as any)}>
            <option value="ha">Hectares (ha)</option>
            <option value="m2">Metros² (m²)</option>
            <option value="alqSP">Alqueire paulista</option>
            <option value="alqMG">Alqueire mineiro</option>
            <option value="alqN">Alqueire do norte</option>
            <option value="tarefa">Tarefa (NE)</option>
          </select>
        </div>
      </div>
      <div className="pt-3 space-y-1">
        <Resultado k="Hectares" v={(m2 / 10000).toFixed(4) + " ha"} destaque />
        <Resultado k="Metros²" v={m2.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + " m²"} />
        <Resultado k="Alqueire paulista (2,42 ha)" v={(m2 / 24200).toFixed(4)} />
        <Resultado k="Alqueire mineiro (4,84 ha)" v={(m2 / 48400).toFixed(4)} />
        <Resultado k="Alqueire do norte (2,72 ha)" v={(m2 / 27225).toFixed(4)} />
        <Resultado k="Tarefa (3.025 m²)" v={(m2 / 3025).toFixed(4)} />
        <Resultado k="Acres" v={(m2 / 4046.86).toFixed(4)} />
      </div>
    </Card>
  );
}

function NPK() {
  const [area, setArea] = useState(1);
  const [n, setN] = useState(120);
  const [p, setP] = useState(80);
  const [k, setK] = useState(80);
  const [pctN, setPctN] = useState(20);
  const [pctP, setPctP] = useState(5);
  const [pctK, setPctK] = useState(20);

  const totalN = n * area;
  const totalP = p * area;
  const totalK = k * area;
  const fertN = pctN > 0 ? totalN / (pctN / 100) : 0;
  const fertP = pctP > 0 ? totalP / (pctP / 100) : 0;
  const fertK = pctK > 0 ? totalK / (pctK / 100) : 0;

  return (
    <Card className="p-4 space-y-3">
      <div className="text-sm font-semibold">Necessidade da cultura (kg/ha)</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Área" value={area} onChange={setArea} unit="ha" />
        <Field label="N" value={n} onChange={setN} unit="kg/ha" />
        <Field label="P₂O₅" value={p} onChange={setP} unit="kg/ha" />
        <Field label="K₂O" value={k} onChange={setK} unit="kg/ha" />
      </div>
      <div className="text-sm font-semibold pt-2">Concentração do fertilizante (%)</div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="% N (ex: ureia 45)" value={pctN} onChange={setPctN} unit="%" />
        <Field label="% P₂O₅ (ex: SS 18)" value={pctP} onChange={setPctP} unit="%" />
        <Field label="% K₂O (ex: KCl 60)" value={pctK} onChange={setPctK} unit="%" />
      </div>
      <div className="pt-3 space-y-1">
        <Resultado k="Total N na área" v={totalN.toFixed(1) + " kg"} />
        <Resultado k="Total P₂O₅ na área" v={totalP.toFixed(1) + " kg"} />
        <Resultado k="Total K₂O na área" v={totalK.toFixed(1) + " kg"} />
        <Resultado k="Fertilizante N necessário" v={fertN.toFixed(1) + " kg"} destaque />
        <Resultado k="Fertilizante P necessário" v={fertP.toFixed(1) + " kg"} destaque />
        <Resultado k="Fertilizante K necessário" v={fertK.toFixed(1) + " kg"} destaque />
      </div>
    </Card>
  );
}

function Sementes() {
  const [area, setArea] = useState(1);
  const [pop, setPop] = useState(300000);
  const [pms, setPms] = useState(180);
  const [germ, setGerm] = useState(95);
  const [vigor, setVigor] = useState(90);

  const valorCultural = (germ * vigor) / 100; // %
  const sementesPorM2Necessarias = valorCultural > 0 ? pop / 10000 / (valorCultural / 100) : 0;
  const kgPorHa = (sementesPorM2Necessarias * 10000 * pms) / 1_000_000;
  const totalKg = kgPorHa * area;

  return (
    <Card className="p-4 space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Field label="Área" value={area} onChange={setArea} unit="ha" />
        <Field label="População desejada" value={pop} onChange={setPop} unit="pl/ha" />
        <Field label="PMS (peso 1000 sem.)" value={pms} onChange={setPms} unit="g" />
        <Field label="Germinação" value={germ} onChange={setGerm} unit="%" />
        <Field label="Vigor" value={vigor} onChange={setVigor} unit="%" />
      </div>
      <div className="pt-3 space-y-1">
        <Resultado k="Valor cultural" v={valorCultural.toFixed(1) + " %"} />
        <Resultado k="Sementes/m²" v={sementesPorM2Necessarias.toFixed(1)} />
        <Resultado k="kg/ha" v={kgPorHa.toFixed(2) + " kg/ha"} destaque />
        <Resultado k="Total para a área" v={totalKg.toFixed(2) + " kg"} destaque />
        <Resultado k="Sacos 20 kg" v={(totalKg / 20).toFixed(1)} />
      </div>
    </Card>
  );
}

function Irrigacao() {
  const [area, setArea] = useState(1);
  const [lamina, setLamina] = useState(10); // mm
  const [vazao, setVazao] = useState(20); // m³/h
  const [eficiencia, setEficiencia] = useState(85);

  const volumeNecM3 = (area * 10000 * lamina) / 1000; // 1 mm = 1 L/m² => /1000 m³
  const volumeAplicarM3 = eficiencia > 0 ? volumeNecM3 / (eficiencia / 100) : 0;
  const horas = vazao > 0 ? volumeAplicarM3 / vazao : 0;

  return (
    <Card className="p-4 space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Área" value={area} onChange={setArea} unit="ha" />
        <Field label="Lâmina" value={lamina} onChange={setLamina} unit="mm" />
        <Field label="Vazão sistema" value={vazao} onChange={setVazao} unit="m³/h" />
        <Field label="Eficiência" value={eficiencia} onChange={setEficiencia} unit="%" />
      </div>
      <div className="pt-3 space-y-1">
        <Resultado k="Volume necessário" v={volumeNecM3.toFixed(1) + " m³ (" + (volumeNecM3 * 1000).toLocaleString("pt-BR") + " L)"} />
        <Resultado k="Volume a aplicar (c/ perdas)" v={volumeAplicarM3.toFixed(1) + " m³"} destaque />
        <Resultado k="Tempo de irrigação" v={horas.toFixed(2) + " h (" + (horas * 60).toFixed(0) + " min)"} destaque />
        <Resultado k="L/m²" v={lamina.toFixed(1)} />
      </div>
    </Card>
  );
}

function Calagem() {
  const [area, setArea] = useState(1);
  const [v1, setV1] = useState(40); // % atual
  const [v2, setV2] = useState(70); // % desejada
  const [ctc, setCtc] = useState(8); // CTC cmolc/dm³
  const [prnt, setPrnt] = useState(85); // %
  const [prof, setProf] = useState(20); // cm

  // NC = CTC × (V2 - V1) / PRNT  [t/ha para 20cm]
  const ncBase = (ctc * (v2 - v1)) / prnt; // t/ha para 20 cm
  const nc = ncBase * (prof / 20);
  const totalT = nc * area;
  const totalKg = totalT * 1000;

  return (
    <Card className="p-4 space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Field label="Área" value={area} onChange={setArea} unit="ha" />
        <Field label="V% atual" value={v1} onChange={setV1} unit="%" />
        <Field label="V% desejada" value={v2} onChange={setV2} unit="%" />
        <Field label="CTC" value={ctc} onChange={setCtc} unit="cmolc" />
        <Field label="PRNT calcário" value={prnt} onChange={setPrnt} unit="%" />
        <Field label="Profundidade" value={prof} onChange={setProf} unit="cm" />
      </div>
      <div className="pt-3 space-y-1">
        <Resultado k="Necessidade de calcário" v={nc.toFixed(2) + " t/ha"} destaque />
        <Resultado k="Total para a área" v={totalT.toFixed(2) + " t (" + totalKg.toFixed(0) + " kg)"} destaque />
        <Resultado k="Fórmula" v="NC = CTC × (V₂−V₁)/PRNT" />
      </div>
    </Card>
  );
}

function Vazao() {
  const [pontas, setPontas] = useState(0.8); // L/min por ponta
  const [esp, setEsp] = useState(0.5); // m entre pontas
  const [vel, setVel] = useState(6); // km/h
  const [area, setArea] = useState(1);

  // L/ha = (Q × 600) / (V × esp)  com Q em L/min, V em km/h
  const lha = (pontas * 600) / (vel * esp);
  const totalL = lha * area;

  return (
    <Card className="p-4 space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Vazão da ponta" value={pontas} onChange={setPontas} unit="L/min" />
        <Field label="Espaçamento" value={esp} onChange={setEsp} unit="m" />
        <Field label="Velocidade" value={vel} onChange={setVel} unit="km/h" />
        <Field label="Área" value={area} onChange={setArea} unit="ha" />
      </div>
      <div className="pt-3 space-y-1">
        <Resultado k="Vazão de aplicação" v={lha.toFixed(1) + " L/ha"} destaque />
        <Resultado k="Volume total" v={totalL.toFixed(1) + " L"} destaque />
        <Resultado k="Fórmula" v="L/ha = (Q × 600) / (V × E)" />
      </div>
    </Card>
  );
}

function Diesel() {
  const [area, setArea] = useState(1);
  const [consumo, setConsumo] = useState(12); // L/h
  const [rend, setRend] = useState(1.5); // ha/h
  const [preco, setPreco] = useState(6.20);

  const lha = rend > 0 ? consumo / rend : 0;
  const totalL = lha * area;
  const custoHa = lha * preco;
  const custoTotal = totalL * preco;

  return (
    <Card className="p-4 space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Área" value={area} onChange={setArea} unit="ha" />
        <Field label="Consumo trator" value={consumo} onChange={setConsumo} unit="L/h" />
        <Field label="Rendimento" value={rend} onChange={setRend} unit="ha/h" />
        <Field label="Preço diesel" value={preco} onChange={setPreco} unit="R$/L" />
      </div>
      <div className="pt-3 space-y-1">
        <Resultado k="Consumo por hectare" v={lha.toFixed(2) + " L/ha"} />
        <Resultado k="Diesel total" v={totalL.toFixed(1) + " L"} destaque />
        <Resultado k="Custo R$/ha" v={"R$ " + custoHa.toFixed(2)} />
        <Resultado k="Custo total" v={"R$ " + custoTotal.toFixed(2)} destaque />
      </div>
    </Card>
  );
}

function ROI() {
  const [area, setArea] = useState(1);
  const [prod, setProd] = useState(60); // sc/ha
  const [preco, setPreco] = useState(130); // R$/sc
  const [custoHa, setCustoHa] = useState(5000);

  const receitaHa = prod * preco;
  const lucroHa = receitaHa - custoHa;
  const margem = receitaHa > 0 ? (lucroHa / receitaHa) * 100 : 0;
  const breakeven = preco > 0 ? custoHa / preco : 0;
  const lucroTotal = lucroHa * area;
  const roi = custoHa > 0 ? (lucroHa / custoHa) * 100 : 0;

  return (
    <Card className="p-4 space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Área" value={area} onChange={setArea} unit="ha" />
        <Field label="Produtividade" value={prod} onChange={setProd} unit="sc/ha" />
        <Field label="Preço saca" value={preco} onChange={setPreco} unit="R$" />
        <Field label="Custo total" value={custoHa} onChange={setCustoHa} unit="R$/ha" />
      </div>
      <div className="pt-3 space-y-1">
        <Resultado k="Receita por hectare" v={"R$ " + receitaHa.toFixed(2)} />
        <Resultado k="Lucro por hectare" v={"R$ " + lucroHa.toFixed(2)} destaque />
        <Resultado k="Margem" v={margem.toFixed(1) + " %"} />
        <Resultado k="ROI" v={roi.toFixed(1) + " %"} destaque />
        <Resultado k="Break-even" v={breakeven.toFixed(1) + " sc/ha"} />
        <Resultado k="Lucro total na área" v={"R$ " + lucroTotal.toFixed(2)} destaque />
      </div>
    </Card>
  );
}
