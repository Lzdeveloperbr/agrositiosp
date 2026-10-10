import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useFazenda } from "@/lib/cloud/fazenda";
import { useLotes, useEstoque, useFinanceiro } from "@/lib/state";
import { Zap, Bell, CheckCircle2, Bird, PackageX, Wallet, Syringe, Thermometer, Scale, Gauge, ExternalLink, Copy, Cpu, RefreshCw, Droplets } from "lucide-react";
import { hojeISO, isoLocal, diffDias } from "@/lib/data";
import { metaPeso, sensacaoTermica, statusTermico, LINHAGEM_LABEL } from "@/lib/linhagens";
import { fetchWeather } from "@/lib/weather";
import { lerGalpaoCfg, montarContexto, aviSmartUrl, resumoTexto, AVI_SMART_URL, type AviContexto } from "@/lib/aviSmart";
import { gerarCalendario } from "@/lib/calendarioSanitario";
import { toast } from "sonner";

export const Route = createFileRoute("/automacoes")({
  head: () => ({
    meta: [
      { title: "Central de Automação da Granja — Aviário Pro" },
      { name: "description", content: "Motor de regras que vigia mortalidade, peso vs. meta, conversão, estoque de ração, ambiência, vacinas e contas — e integra com o AVI Smart Config do SMAAI-03." },
      { property: "og:title", content: "Central de Automação da Granja — Aviário Pro" },
      { property: "og:description", content: "Regras automáticas de granja com alertas em tempo real e integração com o consultor IA do controlador SMAAI-03." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AutomacoesPage,
});

type Sev = "info" | "alerta" | "critico";
type Disparo = { severidade: Sev; mensagem: string; acao?: { to: string; label: string } };
type Regra = { id: string; titulo: string; descricao: string; icon: any; grupo: string; ativa: boolean; gatilho: () => Disparo[] };

function AutomacoesPage() {
  const [lotes] = useLotes();
  const [estoque] = useEstoque();
  const [fin] = useFinanceiro();
  const { fazendaId, coords } = useFazenda();
  const storageKey = `agro:automacoes:${fazendaId ?? "_"}`;
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [tick, setTick] = useState(0);
  const [clima, setClima] = useState<{ tempC: number; umidade: number; vento: number; cidade?: string } | null>(null);

  useEffect(() => {
    try { setEnabled(JSON.parse(localStorage.getItem(storageKey) || "{}")); } catch {}
  }, [storageKey]);

  // Motor roda a cada 60s
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!coords) return;
    let vivo = true;
    fetchWeather(coords.lat, coords.lon)
      .then((w) => { if (vivo) setClima({ tempC: w.current.tempC, umidade: w.current.umidade, vento: w.current.vento, cidade: coords.cidade }); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [coords, tick]);

  const toggle = (id: string, v: boolean) => {
    const next = { ...enabled, [id]: v };
    setEnabled(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  };
  const isOn = (id: string) => enabled[id] !== false; // padrão ligado

  const hoje = hojeISO();
  const em7 = isoLocal(new Date(Date.now() + 7 * 86400000));
  const em30 = isoLocal(new Date(Date.now() + 30 * 86400000));

  const cfg = useMemo(() => lerGalpaoCfg(), [tick]);
  const loteAtivo = lotes.find((l) => !l.encerrado) ?? null;
  const ctx: AviContexto | null = useMemo(
    () => (loteAtivo ? montarContexto(loteAtivo, cfg, clima ?? undefined) : null),
    [loteAtivo, cfg, clima],
  );

  const regras: Regra[] = useMemo(() => [
    {
      id: "mortalidade-alta", grupo: "Granja", titulo: "Mortalidade acima do padrão", icon: Bird,
      descricao: "Compara a mortalidade acumulada com a curva aceitável (0,15%/dia) do lote ativo.",
      ativa: isOn("mortalidade-alta"),
      gatilho: () => {
        if (!loteAtivo) return [];
        const m = loteAtivo.entries.reduce((s, e) => s + e.mortalidade + (e.eliminados ?? 0), 0);
        const pct = (m / loteAtivo.quantidadeInicial) * 100;
        const idade = Math.max(1, diffDias(loteAtivo.dataEntrada));
        const limite = Math.max(1, idade * 0.15);
        if (pct > limite) {
          return [{
            severidade: pct > limite * 1.6 ? "critico" : "alerta",
            mensagem: `Lote ${loteAtivo.numero}: ${pct.toFixed(2)}% acumulado (${m} aves) — padrão para D${idade} é até ${limite.toFixed(2)}%.`,
            acao: { to: "/granja", label: "Ver lote" },
          }];
        }
        return [];
      },
    },
    {
      id: "peso-meta", grupo: "Granja", titulo: "Peso abaixo da meta da linhagem", icon: Scale,
      descricao: "Confere a última pesagem contra a curva oficial da linhagem para a idade do lote.",
      ativa: isOn("peso-meta"),
      gatilho: () => {
        if (!loteAtivo) return [];
        const ult = [...loteAtivo.entries].reverse().find((e) => e.pesoMedioG);
        if (!ult?.pesoMedioG) return [{ severidade: "info", mensagem: `Lote ${loteAtivo.numero} sem pesagem registrada — o motor está usando a curva teórica.`, acao: { to: "/pesagem-pro", label: "Pesar" } }];
        const idade = Math.max(1, diffDias(loteAtivo.dataEntrada));
        const meta = metaPeso(cfg.linhagem, idade);
        const desvio = ((ult.pesoMedioG - meta) / meta) * 100;
        if (desvio < -4) return [{ severidade: desvio < -8 ? "critico" : "alerta", mensagem: `D${idade}: ${ult.pesoMedioG} g vs. meta ${meta} g ${LINHAGEM_LABEL[cfg.linhagem]} (${desvio.toFixed(1)}%).`, acao: { to: "/excelencia-lote", label: "Analisar" } }];
        if (desvio > 4) return [{ severidade: "info", mensagem: `D${idade}: ${ult.pesoMedioG} g, ${desvio.toFixed(1)}% acima da meta. Ótimo desempenho.` }];
        return [];
      },
    },
    {
      id: "pesagem-atrasada", grupo: "Granja", titulo: "Pesagem atrasada", icon: Gauge,
      descricao: "Cobra nova pesagem quando passam mais de 3 dias sem peso registrado.",
      ativa: isOn("pesagem-atrasada"),
      gatilho: () => {
        if (!loteAtivo) return [];
        const ult = [...loteAtivo.entries].reverse().find((e) => e.pesoMedioG);
        if (!ult) return [];
        const dias = diffDias(ult.date);
        if (dias >= 3) return [{ severidade: dias >= 5 ? "alerta" : "info", mensagem: `Última pesagem há ${dias} dias — a projeção de ração perde precisão.`, acao: { to: "/pesagem-pro", label: "Registrar" } }];
        return [];
      },
    },
    {
      id: "ambiencia", grupo: "Ambiência", titulo: "Conforto térmico das aves", icon: Thermometer,
      descricao: "Calcula a sensação térmica (temperatura, umidade e vento) contra a faixa ideal por idade.",
      ativa: isOn("ambiencia"),
      gatilho: () => {
        if (!loteAtivo || !clima) return [];
        const idade = Math.max(0, diffDias(loteAtivo.dataEntrada));
        const et = sensacaoTermica(clima.tempC, clima.umidade, clima.vento);
        const st = statusTermico(et, idade);
        if (st.faixa === "Conforto") return [];
        const critico = st.faixa.includes("Estresse") || st.faixa.includes("crítico");
        return [{ severidade: critico ? "critico" : "alerta", mensagem: `${st.faixa}: sensação ${et}ºC em D${idade}. ${st.recomendacao}`, acao: { to: "/ambiencia", label: "Ambiência" } }];
      },
    },
    {
      id: "estoque-racao", grupo: "Ração", titulo: "Autonomia de ração", icon: Droplets,
      descricao: "Estima quantos dias de ração restam no silo pelo consumo esperado do lote ativo.",
      ativa: isOn("estoque-racao"),
      gatilho: () => {
        if (!loteAtivo) return [];
        const silo = estoque.filter((i) => i.loteId === loteAtivo.id).filter((i) => /ra[çc][ãa]o/i.test(i.categoria) || /ra[çc][ãa]o/i.test(i.nome))
          .reduce((s, i) => s + (i.unidade?.toLowerCase() === "t" ? i.quantidade * 1000 : i.quantidade), 0);
        if (silo <= 0) return [];
        const idade = Math.max(1, diffDias(loteAtivo.dataEntrada));
        const mortas = loteAtivo.entries.reduce((s, e) => s + e.mortalidade + (e.eliminados ?? 0), 0);
        const vivas = Math.max(1, loteAtivo.quantidadeInicial - mortas);
        const consumoDiaKg = ((metaPeso(cfg.linhagem, idade + 1) - metaPeso(cfg.linhagem, idade)) * 1.55 * vivas) / 1000;
        if (consumoDiaKg <= 0) return [];
        const dias = silo / consumoDiaKg;
        if (dias < 3) return [{ severidade: dias < 1.5 ? "critico" : "alerta", mensagem: `Silo com ${silo.toLocaleString("pt-BR")} kg — autonomia de ${dias.toFixed(1)} dia(s) a ${consumoDiaKg.toFixed(0)} kg/dia.`, acao: { to: "/entregas-racao", label: "Pedir carga" } }];
        return [];
      },
    },
    {
      id: "estoque-baixo", grupo: "Estoque", titulo: "Item abaixo do mínimo", icon: PackageX,
      descricao: "Avisa quando qualquer insumo fica igual ou abaixo do estoque mínimo definido.",
      ativa: isOn("estoque-baixo"),
      gatilho: () => estoque.filter((i) => i.minimo !== undefined && i.quantidade <= (i.minimo ?? 0))
        .map((i) => ({ severidade: "alerta" as Sev, mensagem: `${i.nome}: ${i.quantidade} ${i.unidade} (mín ${i.minimo}).`, acao: { to: "/estoque", label: "Estoque" } })),
    },
    {
      id: "vacina-proxima", grupo: "Sanidade", titulo: "Vacina/medicação programada", icon: Syringe,
      descricao: "Lista aplicações atrasadas e as previstas para os próximos 30 dias.",
      ativa: isOn("vacina-proxima"),
      gatilho: () => {
        if (!loteAtivo) return [];
        const evts = gerarCalendario({ dataEntrada: loteAtivo.dataEntrada, aplicacoes: loteAtivo.aplicacoes ?? [] });
        const atras = evts.filter(e => e.status === "atraso");
        const prox = evts.filter(e => (e.status === "hoje" || e.status === "futuro") && e.dataPrevista <= em30);
        const out: Disparo[] = [];
        if (atras.length) out.push({ severidade: "critico", mensagem: `${atras.length} aplicação(ões) atrasada(s).`, acao: { to: "/calendario-sanitario", label: "Sanitário" } });
        if (prox.length) out.push({ severidade: "info", mensagem: `${prox.length} aplicação(ões) nos próximos 30 dias.`, acao: { to: "/calendario-sanitario", label: "Sanitário" } });
        return out;
      },
    },
    {
      id: "contas-vencendo", grupo: "Financeiro", titulo: "Contas a vencer", icon: Wallet,
      descricao: "Cobra contas pendentes nos próximos 7 dias e destaca as já atrasadas.",
      ativa: isOn("contas-vencendo"),
      gatilho: () => {
        const pend = fin.filter((l) => l.status !== "pago" && l.vencimento && l.vencimento <= em7);
        const atr = pend.filter((l) => l.vencimento && l.vencimento < hoje);
        const out: Disparo[] = [];
        if (atr.length) out.push({ severidade: "critico", mensagem: `${atr.length} conta(s) atrasada(s).`, acao: { to: "/financeiro", label: "Financeiro" } });
        if (pend.length - atr.length > 0) out.push({ severidade: "alerta", mensagem: `${pend.length - atr.length} conta(s) vencendo em 7 dias.`, acao: { to: "/financeiro", label: "Financeiro" } });
        return out;
      },
    },
    {
      id: "lote-abate", grupo: "Granja", titulo: "Janela de abate", icon: Bird,
      descricao: "Aciona a preparação de jejum e logística quando faltam 7 dias ou menos para o abate.",
      ativa: isOn("lote-abate"),
      gatilho: () => {
        if (!loteAtivo) return [];
        const idade = diffDias(loteAtivo.dataEntrada);
        const faltam = loteAtivo.previsaoAbateDias - idade;
        if (faltam <= 7 && faltam >= 0) return [{ severidade: faltam <= 2 ? "alerta" : "info", mensagem: `Lote ${loteAtivo.numero}: ${faltam} dia(s) para o abate — programar jejum e retirada de comedouros.`, acao: { to: "/manejo", label: "Manejo" } }];
        return [];
      },
    },
  ], [lotes, estoque, fin, enabled, clima, cfg, loteAtivo, tick]);

  const ativos = regras.filter((r) => r.ativa).flatMap((r) => r.gatilho().map((g) => ({ ...g, regra: r })));
  const criticos = ativos.filter((a) => a.severidade === "critico");
  const grupos = Array.from(new Set(regras.map((r) => r.grupo)));

  const copiarResumo = async () => {
    if (!ctx) return;
    try { await navigator.clipboard.writeText(resumoTexto(ctx)); toast.success("Resumo do lote copiado"); }
    catch { toast.error("Não foi possível copiar"); }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-primary/80 font-semibold mb-1">Motor de regras</div>
            <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2"><Zap className="h-6 w-6 text-primary" /> Central de Automação</h1>
            <p className="text-muted-foreground text-sm">Recalculado a cada 60 segundos com dados do lote, do silo, do clima e do financeiro.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setTick((n) => n + 1)}><RefreshCw className="h-4 w-4 mr-1" /> Recalcular</Button>
        </header>

        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4"><div className="text-xs text-muted-foreground">Regras ativas</div><div className="text-2xl font-bold">{regras.filter((r) => r.ativa).length}/{regras.length}</div></Card>
          <Card className="p-4 border-accent/40"><div className="text-xs text-muted-foreground">Alertas agora</div><div className="text-2xl font-bold text-accent">{ativos.length}</div></Card>
          <Card className="p-4 border-destructive/40"><div className="text-xs text-muted-foreground">Críticos</div><div className="text-2xl font-bold text-destructive">{criticos.length}</div></Card>
        </div>

        {/* Integração AVI Smart Config */}
        <Card className="p-5" style={{ background: "var(--gradient-surface)", boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-start gap-3 mb-4">
            <div className="h-9 w-9 rounded-lg grid place-items-center shrink-0" style={{ background: "var(--gradient-primary)" }}>
              <Cpu className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-semibold leading-tight">AVI Smart Config — SMAAI-03</h3>
              <p className="text-xs text-muted-foreground">Envia o contexto real do lote (idade, aves vivas, peso, galpão e clima) para o consultor IA gerar a configuração do controlador Inobram.</p>
            </div>
          </div>

          {ctx ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                <Mini label="Lote" value={ctx.loteNumero} />
                <Mini label="Idade" value={`D${ctx.idadeDias}`} />
                <Mini label="Aves vivas" value={ctx.avesVivas.toLocaleString("pt-BR")} />
                <Mini label="Peso médio" value={`${Math.round(ctx.pesoMedioG)} g`} sub={ctx.pesoFonte === "pesagem" ? "pesagem real" : "curva"} />
                <Mini label="Linhagem" value={LINHAGEM_LABEL[ctx.linhagem]} />
                <Mini label="Galpão" value={`${ctx.larguraM}×${ctx.comprimentoM} m`} sub={`${ctx.exaustores} exaustores`} />
                <Mini label="Clima" value={ctx.tempC !== undefined ? `${ctx.tempC}ºC` : "—"} sub={ctx.umidade !== undefined ? `${ctx.umidade}% UR` : "sem GPS"} />
                <Mini label="Vento" value={ctx.ventoMs !== undefined ? `${ctx.ventoMs} m/s` : "—"} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm"><a href={aviSmartUrl(ctx)} target="_blank" rel="noopener noreferrer">Abrir com dados do lote <ExternalLink className="h-3.5 w-3.5 ml-1" /></a></Button>
                <Button size="sm" variant="outline" onClick={copiarResumo}><Copy className="h-3.5 w-3.5 mr-1" /> Copiar resumo</Button>
                <Button asChild size="sm" variant="ghost"><Link to="/ambiencia">Ajustar galpão</Link></Button>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              Nenhum lote ativo. Cadastre um lote na <Link to="/granja" className="text-primary underline">Granja</Link> para enviar o contexto automaticamente.{" "}
              <a href={AVI_SMART_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline">Abrir AVI Smart</a>
            </div>
          )}
        </Card>

        {ativos.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-3"><Bell className="h-4 w-4 text-accent" /> Alertas ativos</h3>
            <div className="space-y-2">
              {ativos.map((a, i) => (
                <div key={i} className={`flex items-center gap-3 p-2.5 rounded-md border ${a.severidade === "critico" ? "border-destructive/50 bg-destructive/5" : a.severidade === "alerta" ? "border-accent/50 bg-accent/5" : "border-border/60"}`}>
                  <a.regra.icon className={`h-4 w-4 shrink-0 ${a.severidade === "critico" ? "text-destructive" : a.severidade === "alerta" ? "text-accent" : "text-primary"}`} />
                  <div className="flex-1 text-sm min-w-0"><span className="font-medium">{a.regra.titulo}:</span> {a.mensagem}</div>
                  {a.acao && <Button asChild size="sm" variant="ghost" className="shrink-0 h-7 text-xs"><Link to={a.acao.to}>{a.acao.label}</Link></Button>}
                  <Badge variant={a.severidade === "critico" ? "destructive" : "secondary"} className="text-[10px] shrink-0">{a.severidade}</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {ativos.length === 0 && (
          <Card className="p-6 text-center border-dashed">
            <CheckCircle2 className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="font-medium">Tudo dentro do padrão</p>
            <p className="text-sm text-muted-foreground">Nenhuma regra disparou nesta verificação.</p>
          </Card>
        )}

        {grupos.map((g) => (
          <Card key={g} className="p-4">
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">{g}</h3>
            <div className="space-y-2">
              {regras.filter((r) => r.grupo === g).map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-md border border-border/60">
                  <r.icon className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{r.titulo}</div>
                    <div className="text-xs text-muted-foreground">{r.descricao}</div>
                  </div>
                  <Switch checked={r.ativa} onCheckedChange={(v) => toggle(r.id, v)} />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

function Mini({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-muted/40 rounded-md p-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display font-bold text-base tabular-nums leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
