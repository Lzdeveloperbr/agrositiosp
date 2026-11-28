import { describe, expect, it, vi } from "vitest";
import { addDias } from "./data";

const hoje = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
const entrada = addDias(hoje, -22);
const entries = Array.from({ length: 21 }, (_, i) => ({
  date: addDias(entrada, i + 1),
  mortalidade: 6,
  eliminados: 1,
  ...(i + 1 === 21 ? { pesoMedioG: 950 } : {}),
}));
const tabelas: Record<string, unknown> = {
  lotes: {
    id: "L",
    numero: "12",
    data_entrada: entrada,
    quantidade_inicial: 20000,
    integradora: "",
    previsao_abate_dias: 42,
    percentual_lucro: 0,
    entries,
    encerrado: false,
    linhagem: "ross_ap95",
    sexo: "misto",
    galpao: "G1",
  },
  lote_medicoes: [
    {
      data: hoje,
      consumo_agua_l: 3000,
      consumo_racao_kg: 2100,
      temperatura_c: 30,
      umidade_pct: 60,
      cama: null,
      horas_luz: null,
      iluminacao_lux: null,
      uniformidade_pct: null,
      ventilacao: null,
      observacoes: null,
    },
  ],
  entregas_racao: [{ id: "e", data: addDias(entrada, 1), quantidade_kg: 30000 }],
  silo_pesagens: [],
  silo_config: [],
  tarefas: [],
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    rpc: async () => ({ data: [{ id: "F", nome: "Granja Teste" }], error: null }),
    from(table: string) {
      const resp = { data: tabelas[table], error: null };
      const b: Record<string, unknown> = {};
      for (const m of ["select", "lte", "order", "eq", "limit"]) b[m] = () => b;
      b.maybeSingle = async () => resp;
      b.then = (ok: (v: unknown) => unknown) => Promise.resolve(resp).then(ok);
      return b;
    },
  }),
}));

describe("contexto do assistente", () => {
  it("includes autopilot plan, feed phases, diagnosis and slaughter day from the shared engines", async () => {
    process.env.SUPABASE_URL = "https://x.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "k";
    const { getPoultryContext } = await import("./poultry-context.server");
    const ctx = (await getPoultryContext("GRANJA")) as Record<string, any>;
    const a = ctx.analises;
    expect(a.piloto_automatico.indice_0_100).toBeGreaterThan(0);
    expect(
      a.piloto_automatico.plano_de_acao.some((x: { acao: string }) =>
        /Estresse calórico/.test(x.acao),
      ),
    ).toBe(true);
    expect(a.fases_racao.fase_atual).toBe("Crescimento");
    expect(a.diagnostico_conversao_peso.consumo_medido_por_pesagem_do_silo).toBe(false);
    expect(a.abate.dia_maior_iep).toBeGreaterThanOrEqual(28);
  });
});
