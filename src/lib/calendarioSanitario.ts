import { isoLocal } from "@/lib/data";
// Calendário sanitário automático para frango de corte.
// Baseado em protocolos padrão de integradoras (Cobb/Ross). Ajustável.

export type ProtocoloItem = {
  codigo: string;          // id estável
  dia: number;             // idade em dias para aplicação
  tipo: "vacina" | "medicamento" | "desinfeccao" | "manejo" | "biosseguranca";
  nome: string;
  via?: "agua" | "spray" | "ocular" | "injetavel" | "racao" | "ambiente";
  dose?: string;
  obs?: string;
  obrigatorio?: boolean;
};

export const PROTOCOLO_PADRAO: ProtocoloItem[] = [
  { codigo: "preparo", dia: -1, tipo: "biosseguranca", nome: "Limpeza e desinfecção do galpão", via: "ambiente", obs: "Vazio sanitário mínimo 14 dias. Cama nova ou tratada.", obrigatorio: true },
  { codigo: "marek", dia: 0, tipo: "vacina", nome: "Marek (no incubatório)", via: "injetavel", dose: "0,2 mL subcutâneo", obs: "Geralmente aplicada pelo incubatório/integradora.", obrigatorio: true },
  { codigo: "newcastle-1", dia: 1, tipo: "vacina", nome: "Newcastle + Bronquite (1ª dose)", via: "spray", dose: "Conforme bula", obs: "Spray grosso, 1.000 doses/galpão típico.", obrigatorio: true },
  { codigo: "antibiotico-prev", dia: 1, tipo: "medicamento", nome: "Antibiótico preventivo (se protocolo)", via: "agua", dose: "Consultar integradora", obs: "Apenas se houver indicação técnica." },
  { codigo: "gumboro-1", dia: 7, tipo: "vacina", nome: "Gumboro (1ª dose)", via: "agua", dose: "Conforme bula", obs: "Suspender cloro 4h antes e após. Leite em pó 2g/L como estabilizante.", obrigatorio: true },
  { codigo: "newcastle-2", dia: 10, tipo: "vacina", nome: "Newcastle (reforço)", via: "agua", dose: "Conforme bula", obs: "Apenas em regiões de risco. Confirmar com integradora." },
  { codigo: "gumboro-2", dia: 14, tipo: "vacina", nome: "Gumboro (reforço)", via: "agua", dose: "Conforme bula", obrigatorio: true },
  { codigo: "cocci", dia: 18, tipo: "medicamento", nome: "Anticoccidiano (se sinais de coccidiose)", via: "agua", obs: "Observar fezes — sangue/diarréia indica tratamento." },
  { codigo: "vitamina", dia: 21, tipo: "medicamento", nome: "Vitaminas + eletrólitos", via: "agua", dose: "1g/L por 3 dias", obs: "Reforço para enfrentar pico de consumo e ventilação." },
  { codigo: "carencia", dia: 35, tipo: "manejo", nome: "Início do período de carência", via: "ambiente", obs: "Suspender qualquer antibiótico/coccidiostático com carência ≥7d.", obrigatorio: true },
  { codigo: "jejum", dia: 41, tipo: "manejo", nome: "Jejum pré-abate (8h antes da apanha)", obs: "Manter água até a apanha. Reduzir luz.", obrigatorio: true },
];

export type AplicacaoSanitaria = {
  codigo: string;
  data: string;            // data aplicada
  status: "feito" | "ignorado";
  dose?: string;
  responsavel?: string;
  observacoes?: string;
};

export type ItemCalendario = ProtocoloItem & {
  dataPrevista: string;
  diaAtual: number;
  vencido: boolean;
  hoje: boolean;
  aplicado?: AplicacaoSanitaria;
  status: "pendente" | "atraso" | "hoje" | "futuro" | "feito" | "ignorado";
};

export function gerarCalendario(opts: {
  dataEntrada: string;
  aplicacoes: AplicacaoSanitaria[];
  protocolo?: ProtocoloItem[];
  hoje?: Date;
}): ItemCalendario[] {
  const proto = opts.protocolo ?? PROTOCOLO_PADRAO;
  const hoje = opts.hoje ?? new Date();
  const entrada = new Date(opts.dataEntrada);
  const idade = Math.floor((hoje.getTime() - entrada.getTime()) / 86400000);

  return proto.map((p) => {
    const dataPrevista = new isoLocal(Date(entrada.getTime() + p.dia * 86400000));
    const aplicado = opts.aplicacoes.find((a) => a.codigo === p.codigo);
    let status: ItemCalendario["status"];
    if (aplicado?.status === "feito") status = "feito";
    else if (aplicado?.status === "ignorado") status = "ignorado";
    else if (p.dia === idade) status = "hoje";
    else if (p.dia < idade) status = "atraso";
    else status = "futuro";

    return {
      ...p,
      dataPrevista,
      diaAtual: idade,
      vencido: p.dia < idade && !aplicado,
      hoje: p.dia === idade,
      aplicado,
      status,
    };
  }).sort((a, b) => a.dia - b.dia);
}
