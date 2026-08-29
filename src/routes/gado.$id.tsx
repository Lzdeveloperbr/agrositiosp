import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAnimais, usePastos, useFinanceiro } from "@/lib/state";
import { uid } from "@/lib/storage";
import { ArrowLeft, FileText, Trash2, Plus } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { gerarRelatorioAnimal } from "@/lib/pdf";
import { toast } from "sonner";
import { fmtData, hojeISO, isoLocal } from "@/lib/data";

export const Route = createFileRoute("/gado/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes do Animal — AgroSítio" },
      { name: "description", content: "Histórico completo do animal: pesagens, sanidade, reprodução e produção." },
      { property: "og:title", content: "Detalhes do Animal — AgroSítio" },
      { property: "og:description", content: "Histórico completo do animal: pesagens, sanidade, reprodução e produção." },
    ],
  }),
  component: AnimalDetalhe,
});

function AnimalDetalhe() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [animais, setAnimais] = useAnimais();
  const [pastos] = usePastos();
  const [, setFinanc] = useFinanceiro();
  const a = animais.find((x) => x.id === id);

  const [pesagem, setPesagem] = useState({ data: hojeISO(), pesoKg: 0, observacoes: "" });
  const [sani, setSani] = useState({ data: hojeISO(), tipo: "vacina" as any, produto: "", dose: "", proximaData: "", observacoes: "" });
  const [repro, setRepro] = useState({ data: hojeISO(), tipo: "cobertura" as any, resultado: "" as any, touroOuSemen: "", previsaoParto: "", observacoes: "" });
  const [saida, setSaida] = useState({ tipo: "vendido" as "vendido" | "morto" | "abatido", data: hojeISO(), pesoKg: 0, preco: 0, motivo: "" });

  if (!a) return <AppShell><p>Animal não encontrado.</p><Button asChild variant="link"><Link to="/gado">Voltar</Link></Button></AppShell>;

  const pesagensSorted = [...a.pesagens].sort((x, y) => x.data.localeCompare(y.data));
  const ultimo = pesagensSorted[pesagensSorted.length - 1];
  const primeiro = pesagensSorted[0];
  const dias = primeiro && ultimo && primeiro !== ultimo
    ? Math.max(1, Math.floor((new Date(ultimo.data).getTime() - new Date(primeiro.data).getTime()) / 86400000))
    : 0;
  const gmd = dias > 0 ? ((ultimo.pesoKg - primeiro.pesoKg) / dias).toFixed(3) : "—";
  const idade = a.nascimento ? Math.floor((Date.now() - new Date(a.nascimento).getTime()) / 86400000 / 30) : null;

  const addPesagem = () => {
    if (!pesagem.pesoKg) { toast.error("Informe o peso"); return; }
    setAnimais((p) => p.map((x) => x.id === id ? { ...x, pesagens: [...x.pesagens, { ...pesagem }] } : x));
    setPesagem({ data: hojeISO(), pesoKg: 0, observacoes: "" });
    toast.success("Pesagem registrada");
  };

  const addSani = () => {
    if (!sani.produto) { toast.error("Informe o produto"); return; }
    setAnimais((p) => p.map((x) => x.id === id ? { ...x, sanidade: [{ id: uid(), ...sani, proximaData: sani.proximaData || undefined }, ...x.sanidade] } : x));
    setSani({ data: hojeISO(), tipo: "vacina", produto: "", dose: "", proximaData: "", observacoes: "" });
    toast.success("Evento sanitário adicionado");
  };

  const remPesagem = (idx: number) => setAnimais((p) => p.map((x) => x.id === id ? { ...x, pesagens: x.pesagens.filter((_, i) => i !== idx) } : x));
  const remSani = (sid: string) => setAnimais((p) => p.map((x) => x.id === id ? { ...x, sanidade: x.sanidade.filter((s) => s.id !== sid) } : x));

  const addRepro = () => {
    if (!repro.tipo) { toast.error("Informe o tipo"); return; }
    const previsao = repro.tipo === "cobertura" || repro.tipo === "ia"
      ? (repro.previsaoParto || new isoLocal(Date(new Date(repro.data).getTime() + 283 * 86400000)))
      : (repro.previsaoParto || undefined);
    setAnimais((p) => p.map((x) => x.id === id ? { ...x, reproducao: [{ id: uid(), ...repro, resultado: repro.resultado || undefined, previsaoParto: previsao }, ...(x.reproducao || [])] } : x));
    setRepro({ data: hojeISO(), tipo: "cobertura", resultado: "", touroOuSemen: "", previsaoParto: "", observacoes: "" });
    toast.success("Evento reprodutivo registrado");
  };
  const remRepro = (rid: string) => setAnimais((p) => p.map((x) => x.id === id ? { ...x, reproducao: (x.reproducao || []).filter((r) => r.id !== rid) } : x));

  const darSaida = () => {
    setAnimais((p) => p.map((x) => x.id === id ? {
      ...x,
      status: saida.tipo,
      saidaData: saida.data,
      pesoVendaKg: saida.pesoKg || undefined,
      precoVenda: saida.preco || undefined,
      saidaMotivo: saida.motivo,
    } : x));
    if (saida.tipo === "vendido" && saida.preco) {
      setFinanc((p) => [{ id: uid(), data: saida.data, tipo: "receita", categoria: "Venda de gado", descricao: `Venda brinco ${a.brinco}`, valor: saida.preco, modulo: "gado", status: "pago" }, ...p]);
    }
    toast.success("Saída registrada");
  };

  const excluir = () => {
    if (!confirm("Excluir animal definitivamente?")) return;
    setAnimais((p) => p.filter((x) => x.id !== id));
    nav({ to: "/gado" });
  };

  const pasto = pastos.find((p) => p.id === a.pastoId);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <Button asChild variant="ghost" size="sm"><Link to="/gado"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link></Button>
          <div className="flex flex-wrap items-end justify-between gap-3 mt-2">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-display font-bold">#{a.brinco}</h1>
                <Badge variant={a.status === "ativo" ? "default" : "secondary"}>{a.status}</Badge>
              </div>
              <p className="text-muted-foreground mt-1">
                {a.sexo === "macho" ? "♂ Macho" : "♀ Fêmea"} · {a.categoria ?? "—"} · {a.raca ?? "—"}
                {idade !== null && ` · ${idade} meses`}
                {pasto && ` · ${pasto.nome}`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => gerarRelatorioAnimal(a)}><FileText className="h-4 w-4 mr-1" /> PDF</Button>
              <Button variant="ghost" size="icon" onClick={excluir}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI label="Peso atual" value={ultimo ? `${ultimo.pesoKg} kg` : "—"} />
          <KPI label="GMD" value={gmd === "—" ? "—" : `${gmd} kg/dia`} />
          <KPI label="Pesagens" value={a.pesagens.length.toString()} />
          <KPI label="Manejos" value={a.sanidade.length.toString()} />
        </div>

        <Tabs defaultValue="pesagens">
          <TabsList>
            <TabsTrigger value="pesagens">Pesagens</TabsTrigger>
            <TabsTrigger value="sanidade">Sanidade</TabsTrigger>
            {a.sexo === "femea" && <TabsTrigger value="reproducao">Reprodução</TabsTrigger>}
            {a.status === "ativo" && <TabsTrigger value="saida">Dar saída</TabsTrigger>}
          </TabsList>

          <TabsContent value="pesagens" className="mt-4 space-y-4">
            <div className="grid lg:grid-cols-3 gap-4">
              <Card className="p-5 lg:col-span-2" style={{ background: "var(--gradient-surface)" }}>
                <h3 className="font-display font-semibold mb-3">Evolução do peso</h3>
                {pesagensSorted.length > 1 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={pesagensSorted.map((p) => ({ data: fmtData(p.data, { day: "2-digit", month: "short" }), peso: p.pesoKg }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="data" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                      <Line type="monotone" dataKey="peso" stroke="var(--primary)" strokeWidth={2.5} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground py-12 text-center">Adicione pelo menos 2 pesagens.</p>}
              </Card>

              <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
                <h3 className="font-display font-semibold mb-3">Nova pesagem</h3>
                <div className="space-y-3">
                  <Field label="Data"><Input type="date" value={pesagem.data} onChange={(e) => setPesagem({ ...pesagem, data: e.target.value })} /></Field>
                  <Field label="Peso (kg)"><Input type="number" step="0.1" value={pesagem.pesoKg || ""} onChange={(e) => setPesagem({ ...pesagem, pesoKg: +e.target.value })} /></Field>
                  <Field label="Obs"><Input value={pesagem.observacoes} onChange={(e) => setPesagem({ ...pesagem, observacoes: e.target.value })} /></Field>
                  <Button onClick={addPesagem} className="w-full"><Plus className="h-4 w-4 mr-1" /> Registrar</Button>
                </div>
              </Card>
            </div>

            <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
              <h3 className="font-display font-semibold mb-3">Histórico</h3>
              {a.pesagens.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">Sem pesagens.</p> : (
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground uppercase"><tr className="border-b border-border"><th className="text-left py-2">Data</th><th className="text-right py-2">Peso</th><th></th></tr></thead>
                  <tbody>
                    {[...a.pesagens].sort((x, y) => y.data.localeCompare(x.data)).map((p, i) => {
                      const realIdx = a.pesagens.indexOf(p);
                      return (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2">{fmtData(p.data)}</td>
                          <td className="py-2 text-right tabular-nums">{p.pesoKg} kg</td>
                          <td className="py-2 text-right"><Button size="icon" variant="ghost" onClick={() => remPesagem(realIdx)}><Trash2 className="h-3.5 w-3.5" /></Button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="sanidade" className="mt-4 space-y-4">
            <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
              <h3 className="font-display font-semibold mb-3">Novo manejo sanitário</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Data"><Input type="date" value={sani.data} onChange={(e) => setSani({ ...sani, data: e.target.value })} /></Field>
                <Field label="Tipo">
                  <Select value={sani.tipo} onValueChange={(v) => setSani({ ...sani, tipo: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacina">Vacina</SelectItem>
                      <SelectItem value="vermifugo">Vermífugo</SelectItem>
                      <SelectItem value="medicamento">Medicamento</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Produto"><Input value={sani.produto} onChange={(e) => setSani({ ...sani, produto: e.target.value })} placeholder="Ex: Aftosa" /></Field>
                <Field label="Dose"><Input value={sani.dose} onChange={(e) => setSani({ ...sani, dose: e.target.value })} placeholder="5ml" /></Field>
                <Field label="Próxima aplicação"><Input type="date" value={sani.proximaData} onChange={(e) => setSani({ ...sani, proximaData: e.target.value })} /></Field>
                <Field label="Obs"><Input value={sani.observacoes} onChange={(e) => setSani({ ...sani, observacoes: e.target.value })} /></Field>
              </div>
              <Button onClick={addSani} className="mt-3 w-full md:w-auto"><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
            </Card>

            <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
              <h3 className="font-display font-semibold mb-3">Histórico sanitário</h3>
              {a.sanidade.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">Sem registros.</p> : (
                <div className="space-y-2">
                  {a.sanidade.map((s) => (
                    <div key={s.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-card/50">
                      <Badge variant="outline" className="capitalize">{s.tipo}</Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{s.produto} {s.dose && <span className="text-muted-foreground">· {s.dose}</span>}</p>
                        <p className="text-xs text-muted-foreground">{fmtData(s.data)}{s.proximaData && ` · próx: ${fmtData(s.proximaData)}`}</p>
                        {s.observacoes && <p className="text-xs text-muted-foreground mt-1">{s.observacoes}</p>}
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => remSani(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {a.sexo === "femea" && (
            <TabsContent value="reproducao" className="mt-4 space-y-4">
              <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
                <h3 className="font-display font-semibold mb-3">Novo evento reprodutivo</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  <Field label="Data"><Input type="date" value={repro.data} onChange={(e) => setRepro({ ...repro, data: e.target.value })} /></Field>
                  <Field label="Tipo">
                    <Select value={repro.tipo} onValueChange={(v) => setRepro({ ...repro, tipo: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cobertura">Cobertura</SelectItem>
                        <SelectItem value="ia">Inseminação</SelectItem>
                        <SelectItem value="diagnostico">Diagnóstico</SelectItem>
                        <SelectItem value="parto">Parto</SelectItem>
                        <SelectItem value="aborto">Aborto</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Touro / Sêmen"><Input value={repro.touroOuSemen} onChange={(e) => setRepro({ ...repro, touroOuSemen: e.target.value })} /></Field>
                  {repro.tipo === "diagnostico" && (
                    <Field label="Resultado">
                      <Select value={repro.resultado || ""} onValueChange={(v) => setRepro({ ...repro, resultado: v as any })}>
                        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="prenhe">Prenhe</SelectItem>
                          <SelectItem value="vazia">Vazia</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                  {repro.tipo === "parto" && (
                    <Field label="Cria">
                      <Select value={repro.resultado || ""} onValueChange={(v) => setRepro({ ...repro, resultado: v as any })}>
                        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="macho">Macho</SelectItem>
                          <SelectItem value="femea">Fêmea</SelectItem>
                          <SelectItem value="perda">Perda</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                  <Field label="Previsão de parto"><Input type="date" value={repro.previsaoParto} onChange={(e) => setRepro({ ...repro, previsaoParto: e.target.value })} /></Field>
                  <div className="md:col-span-2"><Field label="Obs"><Input value={repro.observacoes} onChange={(e) => setRepro({ ...repro, observacoes: e.target.value })} /></Field></div>
                </div>
                <Button onClick={addRepro} className="mt-3 w-full md:w-auto"><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
              </Card>

              <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
                <h3 className="font-display font-semibold mb-3">Histórico reprodutivo</h3>
                {(!a.reproducao || a.reproducao.length === 0) ? <p className="text-sm text-muted-foreground py-6 text-center">Sem registros.</p> : (
                  <div className="space-y-2">
                    {a.reproducao.map((r) => (
                      <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-card/50">
                        <Badge variant="outline" className="capitalize">{r.tipo}</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">
                            {fmtData(r.data)}
                            {r.resultado && <span className="text-muted-foreground"> · {r.resultado}</span>}
                            {r.touroOuSemen && <span className="text-muted-foreground"> · {r.touroOuSemen}</span>}
                          </p>
                          {r.previsaoParto && <p className="text-xs text-muted-foreground">Previsão de parto: {fmtData(r.previsaoParto)}</p>}
                          {r.observacoes && <p className="text-xs text-muted-foreground mt-1">{r.observacoes}</p>}
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => remRepro(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
          )}

          {a.status === "ativo" && (
            <TabsContent value="saida" className="mt-4">
              <Card className="p-5" style={{ background: "var(--gradient-surface)" }}>
                <h3 className="font-display font-semibold mb-3">Dar saída</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  <Field label="Tipo">
                    <Select value={saida.tipo} onValueChange={(v) => setSaida({ ...saida, tipo: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vendido">Vendido</SelectItem>
                        <SelectItem value="abatido">Abatido</SelectItem>
                        <SelectItem value="morto">Morto</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Data"><Input type="date" value={saida.data} onChange={(e) => setSaida({ ...saida, data: e.target.value })} /></Field>
                  <Field label="Peso final (kg)"><Input type="number" value={saida.pesoKg || ""} onChange={(e) => setSaida({ ...saida, pesoKg: +e.target.value })} /></Field>
                  {saida.tipo === "vendido" && <Field label="Valor da venda (R$)"><Input type="number" value={saida.preco || ""} onChange={(e) => setSaida({ ...saida, preco: +e.target.value })} /></Field>}
                  <div className="md:col-span-2">
                    <Field label="Motivo / observações"><Textarea value={saida.motivo} onChange={(e) => setSaida({ ...saida, motivo: e.target.value })} /></Field>
                  </div>
                </div>
                <Button onClick={darSaida} className="mt-3" variant="destructive">Confirmar saída</Button>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppShell>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return <Card className="p-3" style={{ background: "var(--gradient-surface)" }}><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="font-display font-bold text-xl tabular-nums">{value}</p></Card>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
