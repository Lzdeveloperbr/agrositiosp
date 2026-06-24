import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sprout, FlaskConical, Tractor, Wheat, AlertCircle } from "lucide-react";
import { CULTURAS_GUIA } from "@/lib/culturasGuia";

export const Route = createFileRoute("/guia-cultivo")({
  head: () => ({
    meta: [
      { title: "Guia de Cultivo por Cultura — AgroSítio" },
      { name: "description", content: "Adubação NPK por hectare, preparo do solo, manejo e ponto de colheita para milho, soja, café, cana e mais." },
    ],
  }),
  component: GuiaCultivoPage,
});

function GuiaCultivoPage() {
  const [culturaId, setCulturaId] = useState(CULTURAS_GUIA[0].id);
  const [area, setArea] = useState(1);
  const [pctN, setPctN] = useState(45); // ureia
  const [pctP, setPctP] = useState(18); // SS
  const [pctK, setPctK] = useState(60); // KCl

  const cultura = useMemo(() => CULTURAS_GUIA.find((c) => c.id === culturaId)!, [culturaId]);

  const totalN = cultura.npk.n * area;
  const totalP = cultura.npk.p2o5 * area;
  const totalK = cultura.npk.k2o * area;
  const kgUreia = pctN > 0 ? totalN / (pctN / 100) : 0;
  const kgSS = pctP > 0 ? totalP / (pctP / 100) : 0;
  const kgKCl = pctK > 0 ? totalK / (pctK / 100) : 0;

  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
            <Sprout className="h-7 w-7 text-primary" /> Guia de Cultivo por Cultura
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quanto de adubo por hectare, como preparar a terra e quando colher.
          </p>
        </div>

        <Card className="p-4 space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Cultura</Label>
              <select
                value={culturaId}
                onChange={(e) => setCulturaId(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {CULTURAS_GUIA.map((c) => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Área (ha)</Label>
              <Input type="number" step="any" value={area} onChange={(e) => setArea(Number(e.target.value) || 0)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ciclo</Label>
              <div className="h-10 flex items-center px-3 rounded-md border border-border text-sm">{cultura.ciclo}</div>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="adubacao" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto w-full justify-start">
            <TabsTrigger value="adubacao"><FlaskConical className="h-4 w-4 mr-1" />Adubação</TabsTrigger>
            <TabsTrigger value="preparo"><Tractor className="h-4 w-4 mr-1" />Preparo da terra</TabsTrigger>
            <TabsTrigger value="manejo"><Sprout className="h-4 w-4 mr-1" />Plantio & Manejo</TabsTrigger>
            <TabsTrigger value="colheita"><Wheat className="h-4 w-4 mr-1" />Ponto de Colheita</TabsTrigger>
          </TabsList>

          <TabsContent value="adubacao" className="space-y-3">
            <Card className="p-4 space-y-3">
              <div className="text-sm font-semibold flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-primary" />
                Recomendação para {cultura.nome} — {cultura.npk.produtividadeRef}
              </div>
              <p className="text-xs text-muted-foreground">{cultura.npk.obs}</p>

              <div className="grid grid-cols-3 gap-2 pt-2">
                <KPI cor="bg-blue-500/10 text-blue-600 dark:text-blue-400" titulo="N" valor={`${cultura.npk.n} kg/ha`} total={`${totalN.toFixed(0)} kg`} />
                <KPI cor="bg-orange-500/10 text-orange-600 dark:text-orange-400" titulo="P₂O₅" valor={`${cultura.npk.p2o5} kg/ha`} total={`${totalP.toFixed(0)} kg`} />
                <KPI cor="bg-violet-500/10 text-violet-600 dark:text-violet-400" titulo="K₂O" valor={`${cultura.npk.k2o} kg/ha`} total={`${totalK.toFixed(0)} kg`} />
              </div>

              <div className="pt-3 border-t border-border space-y-2">
                <div className="text-xs uppercase font-semibold text-muted-foreground">Concentração do fertilizante</div>
                <div className="grid grid-cols-3 gap-3">
                  <Campo label="% N (ureia 45)" v={pctN} set={setPctN} />
                  <Campo label="% P (SS 18)" v={pctP} set={setPctP} />
                  <Campo label="% K (KCl 60)" v={pctK} set={setPctK} />
                </div>
              </div>

              <div className="pt-3 space-y-1">
                <Linha k="Ureia (ou equivalente N)" v={`${kgUreia.toFixed(0)} kg`} destaque />
                <Linha k="Superfosfato (ou equivalente P)" v={`${kgSS.toFixed(0)} kg`} destaque />
                <Linha k="Cloreto de potássio (ou equivalente K)" v={`${kgKCl.toFixed(0)} kg`} destaque />
                <Linha k="Sacos 50 kg (total)" v={`${((kgUreia + kgSS + kgKCl) / 50).toFixed(1)} sc`} />
              </div>

              <div className="pt-3 border-t border-border">
                <div className="text-xs font-semibold text-muted-foreground mb-1">Calagem</div>
                <p className="text-sm">{cultura.calagem}</p>
              </div>
            </Card>

            <Card className="p-4 space-y-2">
              <div className="text-sm font-semibold">Espaçamento e população</div>
              <Linha k="Espaçamento" v={cultura.espacamento} />
              <Linha k="População" v={cultura.populacao} />
              <Linha k="Sementes / mudas" v={cultura.sementesPorHa} />
            </Card>
          </TabsContent>

          <TabsContent value="preparo" className="space-y-3">
            <Card className="p-4 space-y-3">
              <div className="text-sm font-semibold flex items-center gap-2">
                <Tractor className="h-4 w-4 text-primary" /> Como preparar a terra
              </div>
              <ol className="space-y-2">
                {cultura.preparoSolo.map((p, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="flex-none w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ol>
            </Card>

            <Card className="p-4 space-y-2">
              <div className="text-sm font-semibold">Glossário de implementos</div>
              <Item k="Arado / Tombador" v="Vira a leiva 20-30 cm. Use 1× no início do preparo convencional. Não usar em SPD." />
              <Item k="Subsolador" v="Quebra camada compactada a 40-50 cm. A cada 3-4 anos ou quando teste de penetrômetro indicar." />
              <Item k="Grade aradora" v="Destorroa após o arado. 1-2 passadas cruzadas." />
              <Item k="Grade niveladora" v="Acaba o leito de plantio, deixa solo fino e nivelado. Última operação antes de plantar." />
              <Item k="Sulcador" v="Abre o sulco para semeadura/plantio. Profundidade 10-30 cm conforme cultura." />
              <Item k="Distribuidor de calcário" v="Aplica calcário 60-90 dias antes do plantio. Incorporar com grade." />
              <Item k="Plantio direto (SPD)" v="Sem revolvimento. Dessecação química + semeadora de disco corta a palhada. Preserva matéria orgânica." />
            </Card>

            <Card className="p-4 space-y-2 border-amber-500/30">
              <div className="text-sm font-semibold flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-500" /> Boas práticas</div>
              <p className="text-sm">• Nunca prepare solo encharcado — compacta.</p>
              <p className="text-sm">• Faça análise de solo a cada 2 anos.</p>
              <p className="text-sm">• Em terreno em declive, prepare em curvas de nível.</p>
              <p className="text-sm">• Mantenha palhada ≥ 4 t/ha para SPD eficiente.</p>
            </Card>
          </TabsContent>

          <TabsContent value="manejo" className="space-y-3">
            <Card className="p-4 space-y-2">
              <div className="text-sm font-semibold">Plantio</div>
              <ul className="space-y-1.5">
                {cultura.plantio.map((p, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-primary">•</span>
                    {p}
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-4 space-y-2">
              <div className="text-sm font-semibold">Tratos culturais</div>
              <ul className="space-y-1.5">
                {cultura.tratos.map((p, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-primary">•</span>
                    {p}
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-4 space-y-2">
              <div className="text-sm font-semibold">Principais pragas e doenças</div>
              <div className="flex flex-wrap gap-2">
                {cultura.pragas.map((p) => (
                  <Badge key={p} variant="secondary">{p}</Badge>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="colheita" className="space-y-3">
            <Card className="p-4 space-y-3">
              <div className="text-sm font-semibold flex items-center gap-2">
                <Wheat className="h-4 w-4 text-primary" /> Quando está bom pra colher?
              </div>
              <div>
                <div className="text-xs uppercase font-semibold text-muted-foreground mb-1">Ponto ideal</div>
                <ul className="space-y-1.5">
                  {cultura.colheita.pontoIdeal.map((p, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <span className="text-primary">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs uppercase font-semibold text-muted-foreground mb-1">Sinais visíveis no campo</div>
                <ul className="space-y-1.5">
                  {cultura.colheita.sinais.map((p, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <span className="text-primary">👁</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-3 rounded-md bg-primary/10 border border-primary/20">
                <div className="text-xs font-semibold text-primary">Umidade ideal</div>
                <div className="text-sm">{cultura.colheita.umidadeIdeal}</div>
              </div>
            </Card>

            <Card className="p-4 space-y-2">
              <div className="text-sm font-semibold">Dicas gerais de colheita</div>
              <p className="text-sm">• Colha cedo (antes das 10h) para evitar perdas por debulha.</p>
              <p className="text-sm">• Regule a colhedora: rotação do cilindro e abertura do côncavo.</p>
              <p className="text-sm">• Verifique perdas: até 1 sc/ha é aceitável; acima disso, regule.</p>
              <p className="text-sm">• Se umidade alta: secar antes de armazenar (evita fungo e ardidos).</p>
              <p className="text-sm">• Limpe o silo/armazém antes de receber a safra.</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function KPI({ cor, titulo, valor, total }: { cor: string; titulo: string; valor: string; total: string }) {
  return (
    <div className={`rounded-lg p-3 ${cor}`}>
      <div className="text-xs font-semibold opacity-80">{titulo}</div>
      <div className="font-bold text-lg leading-tight">{valor}</div>
      <div className="text-xs opacity-80 mt-1">Total: {total}</div>
    </div>
  );
}

function Linha({ k, v, destaque }: { k: string; v: string; destaque?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border last:border-0 gap-2">
      <span className="text-sm text-muted-foreground">{k}</span>
      <span className={destaque ? "font-bold text-primary text-right" : "text-sm text-right"}>{v}</span>
    </div>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div className="py-1.5 border-b border-border last:border-0">
      <div className="text-sm font-semibold">{k}</div>
      <div className="text-xs text-muted-foreground">{v}</div>
    </div>
  );
}

function Campo({ label, v, set }: { label: string; v: number; set: (n: number) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" step="any" value={v} onChange={(e) => set(Number(e.target.value) || 0)} />
    </div>
  );
}
