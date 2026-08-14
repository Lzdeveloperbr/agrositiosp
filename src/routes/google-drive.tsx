import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFazenda } from "@/lib/cloud/fazenda";
import { gdriveStatus, gdriveListar, gdriveSincronizar, gdriveReprocessar, type ArquivoDrive } from "@/lib/gdrive.functions";
import { toast } from "sonner";
import {
  HardDrive, CloudOff, RefreshCw, Folder, FileText, CheckCircle2, AlertTriangle,
  Sparkles, ChevronRight, Home, Clock, Database,
} from "lucide-react";

export const Route = createFileRoute("/google-drive")({
  head: () => ({
    meta: [
      { title: "Google Drive + IA — AgroSítio" },
      { name: "description", content: "A IA lê planilhas, PDFs e fotos da sua pasta do Google Drive e preenche sozinha prioridades, finanças, estoque, chuvas, tarefas e diário do sítio." },
      { property: "og:title", content: "Google Drive + IA — AgroSítio" },
      { property: "og:description", content: "Importação automática de arquivos do Google Drive para os módulos do sítio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GoogleDrivePage,
});

type Linha = {
  id: string; nome: string; status: string; destino: string | null; confianca: number | null;
  resumo: string | null; registros: number; erro: string | null; processado_em: string | null;
  modificado_em: string | null;
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  processado: { label: "Processado", cls: "bg-primary/15 text-primary border-primary/30" },
  pendente: { label: "Pendente", cls: "bg-accent/15 text-accent border-accent/30" },
  ignorado: { label: "Ignorado", cls: "bg-muted text-muted-foreground border-border" },
  erro: { label: "Erro", cls: "bg-destructive/15 text-destructive border-destructive/30" },
};

const DESTINO_LABEL: Record<string, string> = {
  prioridades: "Prioridades", financeiro: "Finanças", estoque: "Estoque",
  chuvas: "Chuvas", tarefas: "Tarefas", diario: "Diário", ignorar: "—",
};

function GoogleDrivePage() {
  const { client, fazendaId, codigo } = useFazenda();
  const status = useServerFn(gdriveStatus);
  const listar = useServerFn(gdriveListar);
  const sincronizar = useServerFn(gdriveSincronizar);
  const reprocessar = useServerFn(gdriveReprocessar);

  const [conn, setConn] = useState<{ conectado: boolean; conta: string | null; erro: string | null } | null>(null);
  const [trilha, setTrilha] = useState<{ id: string | null; nome: string }[]>([{ id: null, nome: "Meu Drive" }]);
  const [itens, setItens] = useState<ArquivoDrive[]>([]);
  const [carregandoPasta, setCarregandoPasta] = useState(false);
  const [pastaMonitorada, setPastaMonitorada] = useState<{ id: string | null; nome: string } | null>(null);
  const [auto, setAuto] = useState(false);
  const [sync, setSync] = useState(false);
  const [ultima, setUltima] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>([]);

  useEffect(() => { status({}).then(setConn).catch(() => setConn({ conectado: false, conta: null, erro: "Falha ao verificar" })); }, [status]);

  const carregarHistorico = useCallback(async () => {
    if (!fazendaId) return;
    const [{ data: arq }, { data: cfg }] = await Promise.all([
      client.from("gdrive_arquivos").select("*").order("updated_at", { ascending: false }).limit(100),
      client.from("gdrive_config").select("*").maybeSingle(),
    ]);
    setLinhas((arq as Linha[]) ?? []);
    if (cfg) {
      setUltima(cfg.ultima_verificacao ?? null);
      if (cfg.pasta_id || cfg.pasta_nome) setPastaMonitorada({ id: cfg.pasta_id, nome: cfg.pasta_nome ?? "Meu Drive" });
    }
  }, [client, fazendaId]);

  useEffect(() => { carregarHistorico(); }, [carregarHistorico]);

  const abrir = useCallback(async (id: string | null, nome: string, empilhar: boolean) => {
    setCarregandoPasta(true);
    try {
      const r = await listar({ data: { pastaId: id } });
      setItens(r.itens);
      setTrilha((t) => (empilhar ? [...t, { id, nome }] : t));
    } catch (e: any) {
      toast.error(String(e?.message ?? e));
    } finally { setCarregandoPasta(false); }
  }, [listar]);

  useEffect(() => { if (conn?.conectado) abrir(null, "Meu Drive", false); }, [conn?.conectado, abrir]);

  const rodarSync = useCallback(async (silencioso = false) => {
    if (!codigo) return;
    setSync(true);
    try {
      const r = await sincronizar({ data: { codigo, pastaId: pastaMonitorada?.id ?? null } });
      setUltima(new Date().toISOString());
      await carregarHistorico();
      if (!silencioso || r.registros > 0) {
        toast.success(`${r.processados} arquivo(s) lido(s) · ${r.registros} registro(s) importado(s)${r.erros ? ` · ${r.erros} erro(s)` : ""}`);
      }
    } catch (e: any) {
      if (!silencioso) toast.error(String(e?.message ?? e));
    } finally { setSync(false); }
  }, [codigo, pastaMonitorada, sincronizar, carregarHistorico]);

  useEffect(() => {
    if (!auto || !conn?.conectado) return;
    const t = setInterval(() => rodarSync(true), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [auto, conn?.conectado, rodarSync]);

  async function definirPasta(id: string | null, nome: string) {
    if (!fazendaId) return;
    setPastaMonitorada({ id, nome });
    await client.from("gdrive_config").upsert({ fazenda_id: fazendaId, pasta_id: id, pasta_nome: nome, ativo: true }, { onConflict: "fazenda_id" });
    toast.success(`Pasta monitorada: ${nome}`);
  }

  const totalRegistros = linhas.reduce((s, l) => s + (l.registros || 0), 0);
  const comErro = linhas.filter((l) => l.status === "erro").length;

  return (
    <AppShell>
      <div className="space-y-5">
        <header className="rounded-2xl border border-border/60 p-5" style={{ background: "var(--gradient-hero)" }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Integração inteligente</p>
              <h1 className="text-2xl md:text-3xl font-display font-bold mt-1 flex items-center gap-2">
                <HardDrive className="h-6 w-6 text-primary" /> Google Drive + IA
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                Jogue planilhas, PDFs, notas e fotos numa pasta do Drive. A IA lê, entende e preenche sozinha
                Prioridades, Finanças, Estoque, Chuvas, Tarefas e Diário do sítio.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => rodarSync()} disabled={!conn?.conectado || sync}>
                <RefreshCw className={`h-4 w-4 mr-1.5 ${sync ? "animate-spin" : ""}`} /> Sincronizar agora
              </Button>
            </div>
          </div>
        </header>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {conn?.conectado ? <HardDrive className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />} Conexão
            </div>
            <p className={`font-display text-lg font-bold mt-1 ${conn?.conectado ? "text-primary" : "text-destructive"}`}>
              {conn === null ? "Verificando…" : conn.conectado ? "Conectado" : "Desconectado"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">{conn?.conta ?? conn?.erro ?? ""}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Folder className="h-3.5 w-3.5" /> Pasta monitorada</div>
            <p className="font-display text-lg font-bold mt-1 truncate">{pastaMonitorada?.nome ?? "Meu Drive"}</p>
            <p className="text-[11px] text-muted-foreground">{linhas.length} arquivo(s) conhecidos</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Database className="h-3.5 w-3.5" /> Registros importados</div>
            <p className="font-display text-lg font-bold mt-1 text-primary">{totalRegistros}</p>
            <p className="text-[11px] text-muted-foreground">{comErro ? `${comErro} arquivo(s) com erro` : "Sem erros"}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Última verificação</div>
            <p className="font-display text-lg font-bold mt-1">{ultima ? new Date(ultima).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}</p>
            <div className="flex items-center gap-2 mt-1">
              <Switch checked={auto} onCheckedChange={setAuto} id="auto-gdrive" />
              <label htmlFor="auto-gdrive" className="text-[11px] text-muted-foreground">Verificar a cada 5 min</label>
            </div>
          </Card>
        </div>

        {conn && !conn.conectado && (
          <Card className="p-4 border-accent/40 bg-accent/10 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Google Drive ainda não está ligado a este projeto.</p>
              <p className="text-muted-foreground">Peça a conexão do Google Drive no chat do Lovable — depois é só escolher a pasta aqui.</p>
            </div>
          </Card>
        )}

        <Tabs defaultValue="historico">
          <TabsList>
            <TabsTrigger value="historico">Arquivos processados</TabsTrigger>
            <TabsTrigger value="pasta">Escolher pasta</TabsTrigger>
          </TabsList>

          <TabsContent value="historico" className="mt-4 space-y-2">
            {!linhas.length && <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum arquivo processado ainda. Escolha a pasta e toque em “Sincronizar agora”.</Card>}
            {linhas.map((l) => {
              const b = STATUS_BADGE[l.status] ?? STATUS_BADGE.pendente!;
              return (
                <Card key={l.id} className="p-3">
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-sm truncate">{l.nome}</p>
                        <Badge variant="outline" className={b.cls}>{b.label}</Badge>
                        {l.destino && l.destino !== "ignorar" && <Badge variant="secondary">{DESTINO_LABEL[l.destino] ?? l.destino}</Badge>}
                        {l.registros > 0 && <Badge variant="outline" className="gap-1"><CheckCircle2 className="h-3 w-3" />{l.registros} registro(s)</Badge>}
                        {l.confianca != null && <span className="text-[11px] text-muted-foreground">confiança {Math.round(Number(l.confianca) * 100)}%</span>}
                      </div>
                      {l.resumo && <p className="text-xs text-muted-foreground mt-1">{l.resumo}</p>}
                      {l.erro && <p className="text-xs text-destructive mt-1">{l.erro}</p>}
                    </div>
                    <Button
                      size="sm" variant="ghost"
                      onClick={async () => { if (codigo) { await reprocessar({ data: { codigo, arquivoId: l.id } }); toast.info("Marcado para reprocessar"); await carregarHistorico(); } }}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="pasta" className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-1 text-sm">
              {trilha.map((t, i) => (
                <span key={`${t.id}-${i}`} className="flex items-center gap-1">
                  <button
                    className="text-primary hover:underline inline-flex items-center gap-1"
                    onClick={() => { setTrilha(trilha.slice(0, i + 1)); abrir(t.id, t.nome, false); }}
                  >
                    {i === 0 && <Home className="h-3.5 w-3.5" />}{t.nome}
                  </button>
                  {i < trilha.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                </span>
              ))}
              <div className="flex-1" />
              <Button size="sm" variant="secondary" onClick={() => { const a = trilha[trilha.length - 1]!; definirPasta(a.id, a.nome); }} disabled={!conn?.conectado}>
                <Sparkles className="h-4 w-4 mr-1.5" /> Monitorar esta pasta
              </Button>
            </div>

            {carregandoPasta && <p className="text-sm text-muted-foreground">Carregando…</p>}
            {!carregandoPasta && conn?.conectado && !itens.length && <p className="text-sm text-muted-foreground">Pasta vazia.</p>}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {itens.map((it) => (
                <button
                  key={it.id}
                  disabled={!it.pasta}
                  onClick={() => abrir(it.id, it.nome, true)}
                  className="card-elevated p-3 flex items-center gap-2 text-left disabled:opacity-70"
                >
                  {it.pasta ? <Folder className="h-4 w-4 text-primary shrink-0" /> : <FileText className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <span className="text-sm truncate flex-1">{it.nome}</span>
                  {!it.pasta && it.tamanho > 0 && <span className="text-[10px] text-muted-foreground">{(it.tamanho / 1024).toFixed(0)} KB</span>}
                </button>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
