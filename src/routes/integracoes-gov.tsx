import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Landmark, Search, ExternalLink, MapPin, FileText, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/integracoes-gov")({
  head: () => ({
    meta: [
      { title: "Integrações Gov — AgroSítio" },
      { name: "description", content: "Consultas oficiais: CNPJ, CEP, CAR/SICAR, INCRA, NF-e e GTA — direto dos sistemas do governo." },
    ],
  }),
  component: IntegracoesGovPage,
});

function IntegracoesGovPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl md:text-4xl font-display font-bold flex items-center gap-2">
            <Landmark className="h-7 w-7 text-primary" /> Integrações Gov
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Consultas oficiais BrasilAPI, CAR/SICAR, INCRA, NF-e e SISBOV/GTA</p>
        </header>

        <Tabs defaultValue="cnpj">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
            <TabsTrigger value="cnpj">CNPJ</TabsTrigger>
            <TabsTrigger value="cep">CEP</TabsTrigger>
            <TabsTrigger value="car">CAR / SICAR</TabsTrigger>
            <TabsTrigger value="incra">INCRA / CCIR</TabsTrigger>
            <TabsTrigger value="sisbov">SISBOV / GTA</TabsTrigger>
          </TabsList>

          <TabsContent value="cnpj" className="mt-4"><CnpjLookup /></TabsContent>
          <TabsContent value="cep" className="mt-4"><CepLookup /></TabsContent>
          <TabsContent value="car" className="mt-4"><CarPanel /></TabsContent>
          <TabsContent value="incra" className="mt-4"><IncraPanel /></TabsContent>
          <TabsContent value="sisbov" className="mt-4"><SisbovPanel /></TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

/* -------- CNPJ via BrasilAPI (Receita Federal pública) -------- */
function CnpjLookup() {
  const [cnpj, setCnpj] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const consultar = async () => {
    const num = cnpj.replace(/\D/g, "");
    if (num.length !== 14) { toast.error("CNPJ deve ter 14 dígitos"); return; }
    setLoading(true); setData(null);
    try {
      const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${num}`);
      if (!r.ok) throw new Error("CNPJ não encontrado");
      setData(await r.json());
    } catch (e: any) {
      toast.error(e.message || "Falha na consulta");
    } finally { setLoading(false); }
  };

  return (
    <Card className="p-5 space-y-4">
      <div>
        <Label className="text-xs">CNPJ do produtor, integradora ou fornecedor</Label>
        <div className="flex gap-2 mt-1.5">
          <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
          <Button onClick={consultar} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Consultar
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">Fonte oficial: Receita Federal via BrasilAPI</p>
      </div>

      {data && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <div>
            <div className="font-display font-bold text-lg">{data.razao_social}</div>
            {data.nome_fantasia && <div className="text-sm text-muted-foreground">{data.nome_fantasia}</div>}
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge variant={data.descricao_situacao_cadastral === "ATIVA" ? "default" : "destructive"}>{data.descricao_situacao_cadastral}</Badge>
              {data.opcao_pelo_simples && <Badge variant="secondary">Simples Nacional</Badge>}
              {data.porte && <Badge variant="outline">{data.porte}</Badge>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Info label="CNPJ" value={data.cnpj} />
            <Info label="Abertura" value={data.data_inicio_atividade} />
            <Info label="Capital social" value={`R$ ${Number(data.capital_social ?? 0).toLocaleString("pt-BR")}`} />
            <Info label="Natureza jurídica" value={data.natureza_juridica} />
            <Info label="CNAE principal" value={`${data.cnae_fiscal} — ${data.cnae_fiscal_descricao}`} full />
            <Info label="Endereço" value={`${data.logradouro ?? ""}, ${data.numero ?? ""} — ${data.bairro ?? ""}, ${data.municipio ?? ""}/${data.uf ?? ""} CEP ${data.cep ?? ""}`} full />
            {data.ddd_telefone_1 && <Info label="Telefone" value={data.ddd_telefone_1} />}
            {data.email && <Info label="E-mail" value={data.email} />}
          </div>
        </div>
      )}
    </Card>
  );
}

/* -------- CEP via BrasilAPI / ViaCEP -------- */
function CepLookup() {
  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const consultar = async () => {
    const num = cep.replace(/\D/g, "");
    if (num.length !== 8) { toast.error("CEP deve ter 8 dígitos"); return; }
    setLoading(true); setData(null);
    try {
      const r = await fetch(`https://brasilapi.com.br/api/cep/v2/${num}`);
      if (!r.ok) throw new Error("CEP não encontrado");
      setData(await r.json());
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  return (
    <Card className="p-5 space-y-4">
      <div>
        <Label className="text-xs">CEP da propriedade ou endereço de entrega</Label>
        <div className="flex gap-2 mt-1.5">
          <Input value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" />
          <Button onClick={consultar} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Buscar
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">Fonte: Correios + IBGE via BrasilAPI (com coordenadas)</p>
      </div>
      {data && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Info label="CEP" value={data.cep} />
            <Info label="UF" value={data.state} />
            <Info label="Cidade" value={data.city} />
            <Info label="Bairro" value={data.neighborhood ?? "—"} />
            <Info label="Logradouro" value={data.street ?? "—"} full />
            {data.location?.coordinates && (
              <Info label="Coordenadas" value={`${data.location.coordinates.latitude}, ${data.location.coordinates.longitude}`} full />
            )}
          </div>
          {data.location?.coordinates?.latitude && (
            <a className="text-xs underline inline-flex items-center gap-1 text-primary" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${data.location.coordinates.latitude},${data.location.coordinates.longitude}`}>
              Abrir no Google Maps <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
    </Card>
  );
}

/* -------- CAR / SICAR (Ambiental) -------- */
function CarPanel() {
  const [codigo, setCodigo] = useState("");
  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start gap-3">
        <MapPin className="h-5 w-5 text-primary mt-0.5" />
        <div>
          <h3 className="font-display font-bold">Cadastro Ambiental Rural</h3>
          <p className="text-sm text-muted-foreground">Consulte sua propriedade no SICAR (Serviço Florestal Brasileiro).</p>
        </div>
      </div>
      <div>
        <Label className="text-xs">Código do imóvel (CAR)</Label>
        <Input className="mt-1.5" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ex: SP-3550308-XXXXXXX..." />
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <a href="https://consultapublica.car.gov.br/publico/imoveis/index" target="_blank" rel="noreferrer">
          <Button variant="outline" className="w-full justify-start"><ExternalLink className="h-4 w-4 mr-2" />Consulta pública SICAR</Button>
        </a>
        <a href={`https://www.car.gov.br/publico/municipios/downloads`} target="_blank" rel="noreferrer">
          <Button variant="outline" className="w-full justify-start"><ExternalLink className="h-4 w-4 mr-2" />Baixar shapefile do município</Button>
        </a>
        <a href="https://www.gov.br/agricultura/pt-br/assuntos/regularizacao-ambiental-rural" target="_blank" rel="noreferrer">
          <Button variant="outline" className="w-full justify-start"><ExternalLink className="h-4 w-4 mr-2" />Regularização ambiental (MAPA)</Button>
        </a>
        <a href="https://www.car.gov.br/" target="_blank" rel="noreferrer">
          <Button variant="outline" className="w-full justify-start"><ExternalLink className="h-4 w-4 mr-2" />Portal CAR</Button>
        </a>
      </div>
      <div className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-3">
        <strong className="text-foreground">Por que importa:</strong> sem CAR ativo o produtor perde acesso a crédito rural, PRA e regularização fundiária.
      </div>
    </Card>
  );
}

/* -------- INCRA / CCIR -------- */
function IncraPanel() {
  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start gap-3">
        <FileText className="h-5 w-5 text-primary mt-0.5" />
        <div>
          <h3 className="font-display font-bold">INCRA — Cadastro de Imóvel Rural</h3>
          <p className="text-sm text-muted-foreground">Emissão de CCIR, consulta SNCR e módulos fiscais.</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <a href="https://sncr.serpro.gov.br/sncr-web/consultaPublica.jsf?windowId=ad9" target="_blank" rel="noreferrer">
          <Button variant="outline" className="w-full justify-start"><ExternalLink className="h-4 w-4 mr-2" />Consulta SNCR (Serpro)</Button>
        </a>
        <a href="https://ccir.serpro.gov.br/ccir/" target="_blank" rel="noreferrer">
          <Button variant="outline" className="w-full justify-start"><ExternalLink className="h-4 w-4 mr-2" />Emitir CCIR online</Button>
        </a>
        <a href="https://www.gov.br/incra/pt-br/assuntos/governanca-fundiaria/modulo-fiscal" target="_blank" rel="noreferrer">
          <Button variant="outline" className="w-full justify-start"><ExternalLink className="h-4 w-4 mr-2" />Módulo fiscal por município</Button>
        </a>
        <a href="https://certificacao.incra.gov.br/csv_shp/export/" target="_blank" rel="noreferrer">
          <Button variant="outline" className="w-full justify-start"><ExternalLink className="h-4 w-4 mr-2" />Certificação SIGEF</Button>
        </a>
      </div>
      <div className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-3">
        <strong className="text-foreground">Dica:</strong> CCIR é exigido em venda, hipoteca, partilha e financiamento. Validade anual.
      </div>
    </Card>
  );
}

/* -------- SISBOV / GTA -------- */
function SisbovPanel() {
  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
        <div>
          <h3 className="font-display font-bold">SISBOV / GTA — Trânsito Animal</h3>
          <p className="text-sm text-muted-foreground">Rastreabilidade bovina e Guia de Trânsito Animal (Defesa Agropecuária estadual).</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <a href="https://sistemasweb.agricultura.gov.br/pages/SISBOV.html" target="_blank" rel="noreferrer">
          <Button variant="outline" className="w-full justify-start"><ExternalLink className="h-4 w-4 mr-2" />SISBOV (MAPA)</Button>
        </a>
        <a href="https://www.defesa.agricultura.sp.gov.br/gta/" target="_blank" rel="noreferrer">
          <Button variant="outline" className="w-full justify-start"><ExternalLink className="h-4 w-4 mr-2" />GTA — São Paulo (CDA)</Button>
        </a>
        <a href="https://www.gov.br/agricultura/pt-br/assuntos/sanidade-animal-e-vegetal/saude-animal/transito-animal" target="_blank" rel="noreferrer">
          <Button variant="outline" className="w-full justify-start"><ExternalLink className="h-4 w-4 mr-2" />Trânsito animal (MAPA)</Button>
        </a>
        <a href="https://www.gov.br/agricultura/pt-br/assuntos/sanidade-animal-e-vegetal/saude-animal/programas-de-saude-animal/febre-aftosa" target="_blank" rel="noreferrer">
          <Button variant="outline" className="w-full justify-start"><ExternalLink className="h-4 w-4 mr-2" />Programa de febre aftosa</Button>
        </a>
      </div>
      <div className="text-xs text-muted-foreground border-l-2 border-warning/40 pl-3">
        <strong className="text-foreground">Importante:</strong> emissão de GTA é estadual e exige login no sistema da defesa do seu estado (SP usa o GEDAVE/CDA). O AgroSítio mantém o registro local e gera o resumo para preenchimento.
      </div>
    </Card>
  );
}

function Info({ label, value, full }: { label: string; value: any; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium">{value ?? "—"}</div>
    </div>
  );
}
