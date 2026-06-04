import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLotes } from "@/lib/state";
import { Thermometer, Droplets, Lightbulb, Utensils, Flame, ArrowRight, BookOpen, TrendingUp, Waves, Ruler, Sparkles } from "lucide-react";

export const Route = createFileRoute("/manejo")({
  head: () => ({
    meta: [
      { title: "Manejo do Frango — AgroSítio" },
      { name: "description", content: "Protocolo profissional dia a dia: temperatura, equipamentos, luz, ração e CA." },
      { property: "og:title", content: "Manejo do Frango — AgroSítio" },
      { property: "og:description", content: "Protocolo profissional dia a dia: temperatura, equipamentos, luz, ração e CA." },
    ],
  }),
  component: ManejoPage,
});

// ============ PROTOCOLO PROFISSIONAL FRANGO DE CORTE (Cobb/Ross padrão integrador) ============

type DiaProtocolo = {
  dia: number;
  tempAr: [number, number]; // °C ambiente
  tempCama: [number, number]; // °C cama
  umidade: [number, number]; // %
  luzHoras: number;
  luzLux: number;
  racao: "Pré-inicial" | "Inicial" | "Crescimento" | "Final" | "Retirada";
  consumoG: number; // g/ave/dia acumulado esperado
  pesoG: number; // peso médio esperado g
  caEsperado: number; // FCR acumulado
  manejo: string[];
};

// Tabela consolidada (referência Cobb 500 / Ross 308 — padrão Bello/JBS)
const PROTOCOLO: DiaProtocolo[] = [
  { dia: 1,  tempAr: [32, 33], tempCama: [30, 32], umidade: [60, 70], luzHoras: 23, luzLux: 30, racao: "Pré-inicial", consumoG: 14,   pesoG: 56,   caEsperado: 0.85, manejo: ["Pré-aquecer galpão 24h antes (cama a 30°C)", "Forno/campânula LIGADO em potência alta", "Bandejas de papel + comedouro infantil (1 para 80 aves)", "Bebedouro infantil + nipples regulados na altura do olho do pintinho", "Densidade inicial: círculos de proteção 40-50 aves/m²"] },
  { dia: 2,  tempAr: [32, 33], tempCama: [30, 32], umidade: [60, 70], luzHoras: 23, luzLux: 30, racao: "Pré-inicial", consumoG: 18,   pesoG: 72,   caEsperado: 0.88, manejo: ["Forno LIGADO", "Verificar papo cheio em 95% das aves de manhã", "Nipples na altura do olho — pressão 30-40 ml/min"] },
  { dia: 3,  tempAr: [31, 32], tempCama: [30, 32], umidade: [60, 70], luzHoras: 22, luzLux: 25, racao: "Pré-inicial", consumoG: 22,   pesoG: 92,   caEsperado: 0.90, manejo: ["Forno LIGADO", "Ampliar área dos círculos", "Limpar e renovar papel das bandejas"] },
  { dia: 4,  tempAr: [31, 32], tempCama: [29, 31], umidade: [60, 70], luzHoras: 22, luzLux: 25, racao: "Pré-inicial", consumoG: 27,   pesoG: 115,  caEsperado: 0.92, manejo: ["Forno LIGADO (reduzir potência conforme aves)", "Iniciar transição: 50% bandeja + 50% prato infantil"] },
  { dia: 5,  tempAr: [30, 31], tempCama: [28, 30], umidade: [60, 70], luzHoras: 21, luzLux: 20, racao: "Pré-inicial", consumoG: 33,   pesoG: 142,  caEsperado: 0.95, manejo: ["Forno geralmente LIGADO de manhã/noite", "Nipples subindo gradativamente (altura do dorso)"] },
  { dia: 6,  tempAr: [30, 31], tempCama: [28, 30], umidade: [60, 70], luzHoras: 20, luzLux: 20, racao: "Pré-inicial", consumoG: 39,   pesoG: 172,  caEsperado: 0.97, manejo: ["Retirar progressivamente bandejas de papel", "Pratos automáticos descendo até o nível das aves"] },
  { dia: 7,  tempAr: [29, 30], tempCama: [27, 29], umidade: [60, 70], luzHoras: 20, luzLux: 20, racao: "Pré-inicial", consumoG: 46,   pesoG: 205,  caEsperado: 1.00, manejo: ["⚠️ TROCA DE FASE: Pré-inicial → Inicial em 1-2 dias", "PESAGEM SEMANAL — meta 180-210g", "Abrir círculos de proteção (ampliar 100% do galpão até dia 10)", "Retirar comedouros infantis, deixar apenas pratos automáticos", "Nipples na altura do dorso da ave"] },
  { dia: 8,  tempAr: [28, 30], tempCama: [26, 28], umidade: [55, 65], luzHoras: 19, luzLux: 20, racao: "Inicial",     consumoG: 53,   pesoG: 240,  caEsperado: 1.03, manejo: ["INICIAR ração Inicial", "Forno apenas de madrugada (clima frio)"] },
  { dia: 9,  tempAr: [28, 29], tempCama: [26, 28], umidade: [55, 65], luzHoras: 18, luzLux: 15, racao: "Inicial",     consumoG: 61,   pesoG: 280,  caEsperado: 1.06, manejo: ["Forno só se T° ambiente < 26°C"] },
  { dia: 10, tempAr: [27, 29], tempCama: [25, 27], umidade: [55, 65], luzHoras: 18, luzLux: 15, racao: "Inicial",     consumoG: 70,   pesoG: 325,  caEsperado: 1.10, manejo: ["Liberar 100% do galpão", "Revisar nipples — agora altura do bico erguido"] },
  { dia: 11, tempAr: [27, 28], tempCama: [25, 27], umidade: [55, 65], luzHoras: 18, luzLux: 15, racao: "Inicial",     consumoG: 80,   pesoG: 375,  caEsperado: 1.13, manejo: ["Iniciar uso de exaustores conforme T°"] },
  { dia: 12, tempAr: [26, 28], tempCama: [24, 26], umidade: [55, 65], luzHoras: 18, luzLux: 15, racao: "Inicial",     consumoG: 91,   pesoG: 430,  caEsperado: 1.16, manejo: ["Forno geralmente DESLIGADO (só clima frio)"] },
  { dia: 13, tempAr: [26, 27], tempCama: [24, 26], umidade: [55, 65], luzHoras: 18, luzLux: 15, racao: "Inicial",     consumoG: 102,  pesoG: 490,  caEsperado: 1.20, manejo: ["Revolver cama nas linhas dos bebedouros"] },
  { dia: 14, tempAr: [25, 27], tempCama: [23, 25], umidade: [55, 65], luzHoras: 18, luzLux: 10, racao: "Inicial",     consumoG: 114,  pesoG: 555,  caEsperado: 1.23, manejo: ["⚠️ TROCA DE FASE: Inicial → Crescimento em 2-3 dias", "PESAGEM SEMANAL — meta 500-580g", "Reduzir luz para condicionar consumo (intervalo escuro 4-6h)", "Pratos automáticos: nível da borda na altura do dorso"] },
  { dia: 15, tempAr: [24, 26], tempCama: [22, 24], umidade: [55, 65], luzHoras: 18, luzLux: 10, racao: "Crescimento", consumoG: 127,  pesoG: 625,  caEsperado: 1.27, manejo: ["INICIAR ração Crescimento"] },
  { dia: 16, tempAr: [24, 26], tempCama: [22, 24], umidade: [55, 65], luzHoras: 18, luzLux: 10, racao: "Crescimento", consumoG: 140,  pesoG: 700,  caEsperado: 1.30, manejo: ["Acionar nebulizadores em T° > 28°C"] },
  { dia: 17, tempAr: [23, 25], tempCama: [21, 23], umidade: [50, 65], luzHoras: 18, luzLux: 10, racao: "Crescimento", consumoG: 153,  pesoG: 780,  caEsperado: 1.34, manejo: ["Verificar uniformidade do lote (CV < 10%)"] },
  { dia: 18, tempAr: [23, 25], tempCama: [21, 23], umidade: [50, 65], luzHoras: 18, luzLux: 10, racao: "Crescimento", consumoG: 167,  pesoG: 865,  caEsperado: 1.38, manejo: [] },
  { dia: 19, tempAr: [22, 24], tempCama: [20, 22], umidade: [50, 65], luzHoras: 18, luzLux: 10, racao: "Crescimento", consumoG: 181,  pesoG: 955,  caEsperado: 1.42, manejo: [] },
  { dia: 20, tempAr: [22, 24], tempCama: [20, 22], umidade: [50, 65], luzHoras: 18, luzLux: 10, racao: "Crescimento", consumoG: 195,  pesoG: 1050, caEsperado: 1.45, manejo: ["Marca de 1kg — checar peso real"] },
  { dia: 21, tempAr: [22, 24], tempCama: [20, 22], umidade: [50, 65], luzHoras: 18, luzLux: 10, racao: "Crescimento", consumoG: 209,  pesoG: 1150, caEsperado: 1.49, manejo: ["⚠️ PESAGEM SEMANAL — meta 1.100-1.200g", "Aumentar ventilação"] },
  { dia: 22, tempAr: [22, 23], tempCama: [20, 22], umidade: [50, 65], luzHoras: 18, luzLux: 10, racao: "Crescimento", consumoG: 222,  pesoG: 1255, caEsperado: 1.53, manejo: [] },
  { dia: 23, tempAr: [21, 23], tempCama: [20, 22], umidade: [50, 60], luzHoras: 18, luzLux: 10, racao: "Crescimento", consumoG: 234,  pesoG: 1365, caEsperado: 1.57, manejo: [] },
  { dia: 24, tempAr: [21, 23], tempCama: [20, 22], umidade: [50, 60], luzHoras: 18, luzLux: 10, racao: "Crescimento", consumoG: 246,  pesoG: 1480, caEsperado: 1.61, manejo: [] },
  { dia: 25, tempAr: [21, 23], tempCama: [20, 22], umidade: [50, 60], luzHoras: 18, luzLux: 10, racao: "Crescimento", consumoG: 257,  pesoG: 1600, caEsperado: 1.65, manejo: ["Considerar transição para ração Final"] },
  { dia: 26, tempAr: [20, 22], tempCama: [20, 22], umidade: [50, 60], luzHoras: 18, luzLux: 10, racao: "Final",       consumoG: 267,  pesoG: 1720, caEsperado: 1.69, manejo: ["INICIAR ração Final"] },
  { dia: 27, tempAr: [20, 22], tempCama: [20, 22], umidade: [50, 60], luzHoras: 18, luzLux: 10, racao: "Final",       consumoG: 276,  pesoG: 1840, caEsperado: 1.73, manejo: [] },
  { dia: 28, tempAr: [20, 22], tempCama: [20, 22], umidade: [50, 60], luzHoras: 18, luzLux: 10, racao: "Final",       consumoG: 284,  pesoG: 1960, caEsperado: 1.77, manejo: ["⚠️ PESAGEM SEMANAL — meta 1.900-2.050g"] },
  { dia: 29, tempAr: [20, 22], tempCama: [20, 22], umidade: [50, 60], luzHoras: 18, luzLux: 10, racao: "Final",       consumoG: 291,  pesoG: 2080, caEsperado: 1.80, manejo: [] },
  { dia: 30, tempAr: [20, 22], tempCama: [20, 22], umidade: [50, 60], luzHoras: 18, luzLux: 10, racao: "Final",       consumoG: 297,  pesoG: 2200, caEsperado: 1.83, manejo: ["Marca de 2,2kg"] },
  { dia: 31, tempAr: [19, 22], tempCama: [19, 22], umidade: [50, 60], luzHoras: 18, luzLux: 10, racao: "Final",       consumoG: 302,  pesoG: 2315, caEsperado: 1.86, manejo: [] },
  { dia: 32, tempAr: [19, 22], tempCama: [19, 22], umidade: [50, 60], luzHoras: 18, luzLux: 10, racao: "Final",       consumoG: 306,  pesoG: 2430, caEsperado: 1.89, manejo: [] },
  { dia: 33, tempAr: [19, 22], tempCama: [19, 22], umidade: [50, 60], luzHoras: 18, luzLux: 10, racao: "Final",       consumoG: 309,  pesoG: 2540, caEsperado: 1.92, manejo: [] },
  { dia: 34, tempAr: [19, 22], tempCama: [19, 22], umidade: [50, 60], luzHoras: 18, luzLux: 10, racao: "Final",       consumoG: 311,  pesoG: 2650, caEsperado: 1.95, manejo: [] },
  { dia: 35, tempAr: [19, 22], tempCama: [19, 22], umidade: [50, 60], luzHoras: 18, luzLux: 10, racao: "Final",       consumoG: 312,  pesoG: 2760, caEsperado: 1.98, manejo: ["⚠️ PESAGEM SEMANAL — meta 2.700-2.850g", "Avaliar primeira retirada (apanha leve)"] },
  { dia: 36, tempAr: [19, 22], tempCama: [19, 22], umidade: [50, 60], luzHoras: 18, luzLux: 10, racao: "Retirada",    consumoG: 313,  pesoG: 2870, caEsperado: 2.01, manejo: ["INICIAR ração Retirada (sem anticoccidiano)"] },
  { dia: 37, tempAr: [19, 22], tempCama: [19, 22], umidade: [50, 60], luzHoras: 18, luzLux: 10, racao: "Retirada",    consumoG: 313,  pesoG: 2975, caEsperado: 2.04, manejo: [] },
  { dia: 38, tempAr: [19, 22], tempCama: [19, 22], umidade: [50, 60], luzHoras: 18, luzLux: 10, racao: "Retirada",    consumoG: 313,  pesoG: 3080, caEsperado: 2.06, manejo: [] },
  { dia: 39, tempAr: [19, 22], tempCama: [19, 22], umidade: [50, 60], luzHoras: 18, luzLux: 10, racao: "Retirada",    consumoG: 312,  pesoG: 3180, caEsperado: 2.09, manejo: [] },
  { dia: 40, tempAr: [19, 22], tempCama: [19, 22], umidade: [50, 60], luzHoras: 18, luzLux: 10, racao: "Retirada",    consumoG: 310,  pesoG: 3275, caEsperado: 2.12, manejo: [] },
  { dia: 41, tempAr: [19, 22], tempCama: [19, 22], umidade: [50, 60], luzHoras: 18, luzLux: 10, racao: "Retirada",    consumoG: 308,  pesoG: 3370, caEsperado: 2.15, manejo: ["Jejum de pré-apanha 8-10h antes do embarque"] },
  { dia: 42, tempAr: [19, 22], tempCama: [19, 22], umidade: [50, 60], luzHoras: 18, luzLux: 10, racao: "Retirada",    consumoG: 305,  pesoG: 3460, caEsperado: 2.18, manejo: ["⚠️ ABATE — meta 3.400-3.500g · CA ≤ 1.75 (real)"] },
];

// Idade em dias começando em D0 (dia do alojamento = 0).
function idadeDias(dataEntrada: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(dataEntrada).getTime()) / 86400000));
}

// ============ ÁGUA: vazão, pressão e altura dos equipamentos por idade ============
type AguaRef = { faseDia: string; vazaoNipple: string; vazaoAve: string; pressaoCmH2O: string; alturaNipple: string; alturaPrato: string };
const AGUA: AguaRef[] = [
  { faseDia: "D0–D3",   vazaoNipple: "30–40 ml/min", vazaoAve: "30–50 ml/dia",   pressaoCmH2O: "10–15 cm H₂O", alturaNipple: "altura do OLHO", alturaPrato: "borda no chão (bandeja)" },
  { faseDia: "D4–D7",   vazaoNipple: "40–50 ml/min", vazaoAve: "60–110 ml/dia",  pressaoCmH2O: "15–20 cm H₂O", alturaNipple: "entre olho e dorso", alturaPrato: "borda 2–3 cm do piso" },
  { faseDia: "D8–D14",  vazaoNipple: "50–60 ml/min", vazaoAve: "120–220 ml/dia", pressaoCmH2O: "20–25 cm H₂O", alturaNipple: "altura do DORSO",  alturaPrato: "borda na altura do dorso" },
  { faseDia: "D15–D21", vazaoNipple: "60–70 ml/min", vazaoAve: "240–340 ml/dia", pressaoCmH2O: "25–30 cm H₂O", alturaNipple: "bico erguido 30°", alturaPrato: "subir para nível do dorso" },
  { faseDia: "D22–D28", vazaoNipple: "70–80 ml/min", vazaoAve: "350–470 ml/dia", pressaoCmH2O: "30–35 cm H₂O", alturaNipple: "bico erguido 45°", alturaPrato: "borda no nível do dorso" },
  { faseDia: "D29–D35", vazaoNipple: "80–90 ml/min", vazaoAve: "480–580 ml/dia", pressaoCmH2O: "35–40 cm H₂O", alturaNipple: "bico erguido 45°", alturaPrato: "borda no nível do dorso" },
  { faseDia: "D36–D42", vazaoNipple: "80–100 ml/min", vazaoAve: "580–700 ml/dia", pressaoCmH2O: "35–45 cm H₂O", alturaNipple: "bico erguido 45–60°", alturaPrato: "borda no nível do dorso" },
];

function aguaParaIdade(d: number): AguaRef {
  if (d <= 3) return AGUA[0];
  if (d <= 7) return AGUA[1];
  if (d <= 14) return AGUA[2];
  if (d <= 21) return AGUA[3];
  if (d <= 28) return AGUA[4];
  if (d <= 35) return AGUA[5];
  return AGUA[6];
}

// ============ LUZ: programa profissional com horários de liga/desliga ============
type LuzRef = {
  faseDia: string;
  horasLuz: number;
  horasEscuro: number;
  lux: number;
  pctBrilho: number; // % do dimmer
  acende: string;   // horário de acender a luz
  apaga: string;    // horário de apagar (início do escuro)
  cor: string;      // cor recomendada da lâmpada
  obj: string;
};
const LUZ: LuzRef[] = [
  { faseDia: "D0–D1",   horasLuz: 23, horasEscuro: 1,  lux: 30, pctBrilho: 100, acende: "00:00", apaga: "23:00", cor: "Branca fria 6500K", obj: "Estimular consumo · localizar comida/água" },
  { faseDia: "D2–D3",   horasLuz: 22, horasEscuro: 2,  lux: 25, pctBrilho: 80,  acende: "01:00", apaga: "23:00", cor: "Branca fria 6500K", obj: "Iniciar percepção de escuro" },
  { faseDia: "D4–D7",   horasLuz: 20, horasEscuro: 4,  lux: 20, pctBrilho: 70,  acende: "02:00", apaga: "22:00", cor: "Branca neutra 4000K", obj: "Reduzir gradualmente, primeiro descanso real" },
  { faseDia: "D8–D14",  horasLuz: 18, horasEscuro: 6,  lux: 15, pctBrilho: 60,  acende: "04:00", apaga: "22:00", cor: "Branca neutra 4000K", obj: "Bem-estar · regular ritmo circadiano" },
  { faseDia: "D15–D21", horasLuz: 18, horasEscuro: 6,  lux: 10, pctBrilho: 40,  acende: "04:00", apaga: "22:00", cor: "Branca quente 3000K", obj: "Reduzir agitação · controle de consumo" },
  { faseDia: "D22–D35", horasLuz: 18, horasEscuro: 6,  lux: 10, pctBrilho: 40,  acende: "04:00", apaga: "22:00", cor: "Branca quente 3000K", obj: "Manter ritmo · maximizar ganho" },
  { faseDia: "D36–D40", horasLuz: 20, horasEscuro: 4,  lux: 10, pctBrilho: 40,  acende: "03:00", apaga: "23:00", cor: "Branca quente 3000K", obj: "Aumentar consumo final" },
  { faseDia: "Pré-apanha", horasLuz: 24, horasEscuro: 0, lux: 5, pctBrilho: 20, acende: "—",     apaga: "—",     cor: "Azul (acalmar)",      obj: "Acalmar 4h antes do embarque" },
];

function luzParaIdade(d: number): LuzRef {
  if (d <= 1) return LUZ[0];
  if (d <= 3) return LUZ[1];
  if (d <= 7) return LUZ[2];
  if (d <= 14) return LUZ[3];
  if (d <= 21) return LUZ[4];
  if (d <= 35) return LUZ[5];
  return LUZ[6];
}

// Bater cama: a cada 3 dias a partir de D6 (após formação inicial da cama)
function deveBaterCama(d: number): boolean {
  return d >= 6 && (d - 6) % 3 === 0;

}

function ManejoPage() {
  const [lotes] = useLotes();
  const ativos = lotes.filter((l) => !l.encerrado);
  const [loteId, setLoteId] = useState<string>(ativos[0]?.id ?? "");
  const lote = ativos.find((l) => l.id === loteId);

  // idade D0 = 0. Protocolo interno usa dia 1..42, então protoIdx = idadeReal.
  const idadeReal = useMemo(() => (lote ? idadeDias(lote.dataEntrada) : 0), [lote]);
  const [diaSel, setDiaSel] = useState<number>(idadeReal); // dia exibido (0..41)
  const protoIdx = Math.max(0, Math.min(41, diaSel));
  const dia = PROTOCOLO[protoIdx];
  const diaDisplay = diaSel;
  const agua = aguaParaIdade(diaDisplay);

  // CA real do lote (se houver dados)
  const caReal = useMemo(() => {
    if (!lote) return null;
    const ultPeso = [...lote.entries].reverse().find((e) => e.pesoMedioG)?.pesoMedioG;
    if (!ultPeso) return null;
    const id = idadeDias(lote.dataEntrada);
    const consAcum = PROTOCOLO.slice(0, id + 1).reduce((s, p) => s + p.consumoG, 0);
    return { peso: ultPeso, ca: consAcum / ultPeso, idade: id };
  }, [lote]);

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold flex items-center gap-2">
              <BookOpen className="h-7 w-7 text-primary" /> Manejo do Frango
            </h1>
            <p className="text-muted-foreground mt-1">Protocolo profissional dia a dia · D0 = alojamento · padrão Cobb/Ross</p>
          </div>
          {ativos.length > 0 && (
            <Select value={loteId} onValueChange={(v) => { setLoteId(v); const l = ativos.find(x => x.id === v); if (l) setDiaSel(idadeDias(l.dataEntrada)); }}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Selecionar lote" /></SelectTrigger>
              <SelectContent>{ativos.map((l) => <SelectItem key={l.id} value={l.id}>Lote {l.numero} · D{idadeDias(l.dataEntrada)}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </header>

        {/* CA real */}
        {lote && caReal && (
          <Card className="p-5" style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}>
            <div className="flex items-center gap-2 mb-2 opacity-90"><TrendingUp className="h-5 w-5" /><span className="font-display font-semibold">Lote {lote.numero} · D{caReal.idade}</span></div>
            <div className="grid grid-cols-3 gap-4">
              <div><p className="text-xs opacity-80">Peso real</p><p className="text-2xl font-display font-bold">{caReal.peso}g</p></div>
              <div><p className="text-xs opacity-80">CA real (estim.)</p><p className="text-2xl font-display font-bold">{caReal.ca.toFixed(2)}</p></div>
              <div><p className="text-xs opacity-80">CA esperado</p><p className="text-2xl font-display font-bold">{PROTOCOLO[caReal.idade]?.caEsperado.toFixed(2)}</p></div>
            </div>
          </Card>
        )}

        {/* Seletor de dia */}
        <Card className="p-4" style={{ background: "var(--gradient-surface)" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold">Selecionar dia do lote</h2>
            <Badge variant="outline">D{diaDisplay} / D41</Badge>
          </div>
          <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-14 gap-1.5">
            {PROTOCOLO.map((p, idx) => {
              const d = idx; // 0..41
              const isPesagem = d > 0 && d % 7 === 0;
              const isTroca = p.manejo.some((m) => m.includes("TROCA") || m.includes("INICIAR ração"));
              const isCama = deveBaterCama(d);
              return (
                <button
                  key={p.dia}
                  onClick={() => setDiaSel(d)}
                  className={`aspect-square rounded-md text-xs font-semibold tabular-nums border transition ${
                    diaSel === d ? "bg-primary text-primary-foreground border-primary" :
                    isPesagem ? "bg-amber-500/20 border-amber-500/40 hover:bg-amber-500/30" :
                    isTroca ? "bg-blue-500/20 border-blue-500/40 hover:bg-blue-500/30" :
                    isCama ? "bg-emerald-500/15 border-emerald-500/40 hover:bg-emerald-500/25" :
                    "bg-muted/40 border-border hover:bg-muted"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-500/40" /> Pesagem semanal</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-500/40" /> Troca de ração / fase</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-500/40" /> Bater cama (3/3 dias)</span>
          </div>
        </Card>

        {/* Detalhe do dia */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          <ParamCard icon={<Thermometer className="h-5 w-5" />} label="Temp. ambiente" value={`${dia.tempAr[0]}–${dia.tempAr[1]}°C`} hint={`Cama: ${dia.tempCama[0]}–${dia.tempCama[1]}°C`} />
          <ParamCard icon={<Droplets className="h-5 w-5" />} label="Umidade" value={`${dia.umidade[0]}–${dia.umidade[1]}%`} hint="Relativa do ar" />
          <ParamCard icon={<Lightbulb className="h-5 w-5" />} label="Luz" value={`${luzParaIdade(diaDisplay).horasLuz}h · ${luzParaIdade(diaDisplay).pctBrilho}%`} hint={`${luzParaIdade(diaDisplay).lux} lux · acende ${luzParaIdade(diaDisplay).acende} / apaga ${luzParaIdade(diaDisplay).apaga}`} />
          <ParamCard icon={<Utensils className="h-5 w-5" />} label="Ração" value={dia.racao} hint={`${dia.consumoG}g/ave · meta ${dia.pesoG}g`} />
        </div>

        {/* Água & altura dos equipamentos do dia */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          <ParamCard icon={<Waves className="h-5 w-5" />} label="Vazão nipple" value={agua.vazaoNipple} hint={`~ ${agua.vazaoAve} por ave`} />
          <ParamCard icon={<Droplets className="h-5 w-5" />} label="Pressão linha" value={agua.pressaoCmH2O} hint="Coluna d'água no regulador" />
          <ParamCard icon={<Ruler className="h-5 w-5" />} label="Altura nipple" value={agua.alturaNipple} hint="Ajustar diariamente" />
          <ParamCard icon={<Ruler className="h-5 w-5" />} label="Altura prato/comedouro" value={agua.alturaPrato} hint="Borda no nível certo evita desperdício" />
        </div>

        <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
          <h3 className="font-display font-semibold text-lg mb-3 flex items-center gap-2"><Flame className="h-5 w-5 text-orange-500" /> Manejo do D{diaDisplay}</h3>
          <ul className="space-y-2">
            {deveBaterCama(diaDisplay) && (
              <li className="text-sm flex gap-2 font-semibold text-emerald-700 dark:text-emerald-400">
                <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
                <span>BATER CAMA hoje (rotina 3 em 3 dias) — revolver toda a área, soltar torrões, equalizar umidade. Reduz amônia, pododermatite e coccidiose.</span>
              </li>
            )}
            <li className="text-sm flex gap-2">
              <Waves className="h-4 w-4 shrink-0 mt-0.5 text-sky-500" />
              <span>Conferir vazão dos nipples ({agua.vazaoNipple}), pressão ({agua.pressaoCmH2O}) e altura ({agua.alturaNipple}). Lavar linha 1× por semana.</span>
            </li>
            {dia.manejo.length === 0 ? (
              <li className="text-sm text-muted-foreground">Manutenção da rotina. Monitorar temperatura, água e ração.</li>
            ) : (
              dia.manejo.map((m, i) => (
                <li key={i} className={`text-sm flex gap-2 ${m.startsWith("⚠️") ? "font-semibold text-amber-600 dark:text-amber-400" : ""}`}>
                  <ArrowRight className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                  <span>{m}</span>
                </li>
              ))
            )}
          </ul>
        </Card>

        {/* Tabs com guias completos */}
        <Tabs defaultValue="semanal">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="semanal">Semanal</TabsTrigger>
            <TabsTrigger value="equipamentos">Equipamentos</TabsTrigger>
            <TabsTrigger value="agua">Água & Cama</TabsTrigger>
            <TabsTrigger value="luz">Luz</TabsTrigger>
            <TabsTrigger value="ca">CA</TabsTrigger>
          </TabsList>



          <TabsContent value="semanal" className="mt-4">
            <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
              <h3 className="font-display font-semibold mb-3">Resumo por semana</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground uppercase">
                    <tr className="border-b border-border">
                      <th className="text-left py-2">Sem.</th><th className="text-left py-2">Dias</th>
                      <th className="text-right py-2">Peso meta</th><th className="text-right py-2">CA</th>
                      <th className="text-right py-2">Temp.</th><th className="text-left py-2 pl-3">Ração</th>
                      <th className="text-left py-2 pl-3">Foco</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { sem: 1, dias: "1-7",   peso: 205,  ca: 1.00, temp: "32→29°C", racao: "Pré-inicial", foco: "Pintinho · forno · papel · infantil" },
                      { sem: 2, dias: "8-14",  peso: 555,  ca: 1.23, temp: "29→25°C", racao: "Inicial",     foco: "Liberar galpão · subir nipples" },
                      { sem: 3, dias: "15-21", peso: 1150, ca: 1.49, temp: "25→22°C", racao: "Crescimento", foco: "Ventilação · uniformidade" },
                      { sem: 4, dias: "22-28", peso: 1960, ca: 1.77, temp: "22→20°C", racao: "Cresc/Final", foco: "Nebulizar · máx. consumo" },
                      { sem: 5, dias: "29-35", peso: 2760, ca: 1.98, temp: "20°C",    racao: "Final",       foco: "Pré-apanha · cama seca" },
                      { sem: 6, dias: "36-42", peso: 3460, ca: 2.18, temp: "20°C",    racao: "Retirada",    foco: "Jejum · embarque" },
                    ].map((s) => (
                      <tr key={s.sem} className="border-b border-border/50">
                        <td className="py-2 font-bold">{s.sem}ª</td>
                        <td className="py-2">{s.dias}</td>
                        <td className="py-2 text-right tabular-nums">{s.peso}g</td>
                        <td className="py-2 text-right tabular-nums">{s.ca.toFixed(2)}</td>
                        <td className="py-2 text-right">{s.temp}</td>
                        <td className="py-2 pl-3">{s.racao}</td>
                        <td className="py-2 pl-3 text-muted-foreground">{s.foco}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="equipamentos" className="mt-4 space-y-3">
            <EquipCard titulo="Forno / Campânula" itens={[
              "LIGADO: dia 1 ao 7 (24h)",
              "Reduzir potência: dia 8 ao 12 (madrugada)",
              "DESLIGAR: a partir do dia 13 (só clima frio)",
              "Pré-aquecer galpão 24h antes do alojamento (cama 30°C)",
            ]} />
            <EquipCard titulo="Comedouro infantil (bandejas/papel)" itens={[
              "USAR: dia 1 ao 7 — 1 bandeja para cada 80 aves",
              "Transição 50/50 com pratos: dia 4 ao 6",
              "RETIRAR: a partir do dia 7-8",
              "Sempre limpar e renovar o papel diariamente",
            ]} />
            <EquipCard titulo="Pratos automáticos" itens={[
              "Iniciar oferta: dia 4",
              "Altura: borda no nível do dorso da ave",
              "Subir gradativamente conforme crescimento",
              "1 prato para 60-70 aves (densidade Cobb)",
            ]} />
            <EquipCard titulo="Nipples (bebedouros)" itens={[
              "Dia 1-3: altura do OLHO do pintinho",
              "Dia 4-7: altura entre olho e dorso",
              "Dia 8-14: altura do DORSO",
              "Dia 15+: bico levemente erguido (45°)",
              "Pressão: 30-40 ml/min na 1ª semana, 50-80 ml/min depois",
              "1 nipple para 10-12 aves",
            ]} />
            <EquipCard titulo="Densidade" itens={[
              "Círculos iniciais: 40-50 aves/m²",
              "Liberação 100% galpão: dia 10",
              "Final: 12-14 aves/m² (frango pesado 3kg+)",
            ]} />
          </TabsContent>

          <TabsContent value="agua" className="mt-4 space-y-3">
            <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
              <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><Waves className="h-5 w-5 text-sky-500" /> Água: vazão, pressão e altura por idade</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground uppercase">
                    <tr className="border-b border-border">
                      <th className="text-left py-2">Fase</th>
                      <th className="text-left py-2 pl-3">Vazão nipple</th>
                      <th className="text-left py-2 pl-3">Consumo/ave</th>
                      <th className="text-left py-2 pl-3">Pressão</th>
                      <th className="text-left py-2 pl-3">Altura nipple</th>
                      <th className="text-left py-2 pl-3">Altura prato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {AGUA.map((a, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2 font-bold">{a.faseDia}</td>
                        <td className="py-2 pl-3">{a.vazaoNipple}</td>
                        <td className="py-2 pl-3">{a.vazaoAve}</td>
                        <td className="py-2 pl-3">{a.pressaoCmH2O}</td>
                        <td className="py-2 pl-3">{a.alturaNipple}</td>
                        <td className="py-2 pl-3">{a.alturaPrato}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-3 rounded-md bg-sky-500/10 border border-sky-500/30 text-sm space-y-1">
                <p><strong>Regra de ouro:</strong> consumo de água = ~1,8× consumo de ração. Queda &gt; 20% em 24h = alerta sanitário.</p>
                <p><strong>Teste de vazão:</strong> medir com copo graduado por 60s em 3 pontos da linha (início, meio, fim). Diferença &gt; 10% indica entupimento ou pressão desregulada.</p>
                <p><strong>Higiene:</strong> flush diário das linhas nos primeiros 7 dias; sanitização semanal (peróxido ou ácido orgânico) durante todo o lote.</p>
              </div>
            </Card>

            <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
              <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><Sparkles className="h-5 w-5 text-emerald-500" /> Manejo da cama (bater cama 3 em 3 dias)</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2"><ArrowRight className="h-4 w-4 shrink-0 mt-0.5 text-primary" /><span><strong>D0 ao D5:</strong> não revolver. Apenas retirar torrões úmidos pontuais embaixo de nipples.</span></li>
                <li className="flex gap-2"><ArrowRight className="h-4 w-4 shrink-0 mt-0.5 text-primary" /><span><strong>D6 em diante:</strong> bater cama a cada 3 dias (D6, D9, D12, D15…) com enxada ou rotativa leve, soltando torrões e equalizando umidade (ideal 20–25%).</span></li>
                <li className="flex gap-2"><ArrowRight className="h-4 w-4 shrink-0 mt-0.5 text-primary" /><span><strong>Linhas de bebedouro:</strong> revolver diariamente — é onde acumula mais umidade e amônia.</span></li>
                <li className="flex gap-2"><ArrowRight className="h-4 w-4 shrink-0 mt-0.5 text-primary" /><span><strong>Indicadores de cama ruim:</strong> amônia &gt; 20 ppm (arde no olho), torrões duros, pododermatite (lesão na pata), peito sujo.</span></li>
                <li className="flex gap-2"><ArrowRight className="h-4 w-4 shrink-0 mt-0.5 text-primary" /><span><strong>Correção:</strong> umidade alta → aumentar ventilação + cal virgem na linha do bebedouro (200 g/m²). Cama muito seca/poeira → leve umidificação por nebulizador.</span></li>
                <li className="flex gap-2"><ArrowRight className="h-4 w-4 shrink-0 mt-0.5 text-primary" /><span><strong>Última semana:</strong> manter cama o mais seca possível, suspender bater cama 3 dias antes da apanha.</span></li>
              </ul>
            </Card>
          </TabsContent>
          <TabsContent value="luz" className="mt-4">

            <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
              <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><Lightbulb className="h-5 w-5 text-amber-500" /> Programa de luz</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground uppercase">
                    <tr className="border-b border-border"><th className="text-left py-2">Período</th><th className="text-right py-2">Horas luz</th><th className="text-right py-2">Lux</th><th className="text-right py-2">% intensidade</th><th className="text-left py-2 pl-3">Objetivo</th></tr>
                  </thead>
                  <tbody>
                    {[
                      { p: "Dia 1-2", h: 23, lux: 30, pct: "100%", obj: "Estimular consumo · localizar comida/água" },
                      { p: "Dia 3-7", h: "22→20", lux: 25, pct: "80%", obj: "Reduzir gradualmente" },
                      { p: "Dia 8-13", h: "19→18", lux: 15, pct: "60%", obj: "Acostumar com escuro" },
                      { p: "Dia 14-21", h: 18, lux: 10, pct: "40%", obj: "Bem-estar · controle de consumo" },
                      { p: "Dia 22-42", h: 18, lux: 10, pct: "40%", obj: "Manter ritmo até abate" },
                      { p: "Pré-apanha", h: 24, lux: 5, pct: "20%", obj: "Acalmar antes do embarque" },
                    ].map((r, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2 font-medium">{r.p}</td><td className="py-2 text-right tabular-nums">{r.h}h</td>
                        <td className="py-2 text-right tabular-nums">{r.lux}</td><td className="py-2 text-right tabular-nums">{r.pct}</td>
                        <td className="py-2 pl-3 text-muted-foreground">{r.obj}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-sm">
                <strong>Dica pro:</strong> intervalo de escuro contínuo (4-6h, ex: 22h–04h) melhora ganho de peso e bem-estar.
                Use dimmer para reduzir intensidade gradualmente — nunca apagar de uma vez.
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="ca" className="mt-4 space-y-3">
            <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
              <h3 className="font-display font-semibold mb-2">Como calcular a Conversão Alimentar (CA)</h3>
              <p className="text-sm text-muted-foreground mb-3">CA = Ração consumida (kg) ÷ Peso vivo produzido (kg). Quanto MENOR, melhor.</p>
              <div className="space-y-2 text-sm">
                <p><strong>Exemplo:</strong> 28.000 aves abateram com peso médio de 3,2 kg = <strong>89.600 kg vivo</strong>.</p>
                <p>Consumo total do lote: <strong>156.800 kg</strong> de ração.</p>
                <p className="text-lg font-bold text-primary">CA = 156.800 ÷ 89.600 = 1,75</p>
              </div>
            </Card>
            <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
              <h3 className="font-display font-semibold mb-3">Metas de CA por idade</h3>
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase"><tr className="border-b border-border"><th className="text-left py-2">Idade</th><th className="text-right py-2">CA excelente</th><th className="text-right py-2">CA bom</th><th className="text-right py-2">CA ruim</th></tr></thead>
                <tbody>
                  {[{i:"21d",e:1.45,b:1.55,r:1.70},{i:"28d",e:1.70,b:1.85,r:2.00},{i:"35d",e:1.85,b:2.00,r:2.20},{i:"42d",e:1.95,b:2.15,r:2.40}].map((m,i)=>(
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2 font-bold">{m.i}</td>
                      <td className="py-2 text-right text-green-600 font-semibold">{m.e}</td>
                      <td className="py-2 text-right">{m.b}</td>
                      <td className="py-2 text-right text-destructive">{m.r}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
              <h3 className="font-display font-semibold mb-2">Fatores que pioram a CA</h3>
              <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                <li>Temperatura errada (frio = consumo extra para se aquecer)</li>
                <li>Água com pressão baixa nos nipples</li>
                <li>Densidade alta demais (estresse)</li>
                <li>Cama úmida → coccidiose, perdas</li>
                <li>Atraso na troca de fase de ração</li>
                <li>Iluminação contínua (sem descanso)</li>
                <li>Mortalidade alta (peso que vai embora sem virar carne)</li>
              </ul>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="text-center pt-4">
          <Button asChild variant="outline"><Link to="/granja">← Voltar para a Granja</Link></Button>
        </div>
      </div>
    </AppShell>
  );
}

function ParamCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4" style={{ background: "var(--gradient-surface)" }}>
      <div className="flex items-center gap-2 text-muted-foreground mb-1">{icon}<span className="text-xs uppercase tracking-wider">{label}</span></div>
      <p className="font-display font-bold text-2xl">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </Card>
  );
}

function EquipCard({ titulo, itens }: { titulo: string; itens: string[] }) {
  return (
    <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
      <h4 className="font-display font-semibold mb-2">{titulo}</h4>
      <ul className="space-y-1.5 text-sm">
        {itens.map((i, idx) => (
          <li key={idx} className="flex gap-2"><ArrowRight className="h-4 w-4 shrink-0 mt-0.5 text-primary" /><span>{i}</span></li>
        ))}
      </ul>
    </Card>
  );
}
