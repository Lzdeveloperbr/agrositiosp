import { useEffect, useState } from "react";
import { useFazenda } from "@/lib/cloud/fazenda";
import { calcularSilo, CFG_PADRAO, type Linhagem, type Sexo, type SiloCalc } from "@/lib/silo";
import type { Lote } from "@/lib/types";
import type { Database } from "@/integrations/supabase/types";

type Medicao = Database["public"]["Tables"]["lote_medicoes"]["Row"];
export function usePoultryOperation(lote: Lote | null, tick: number) {
  const { client, fazendaId } = useFazenda();
  const [state, setState] = useState<{
    silo: SiloCalc | null;
    medicoes: Medicao[];
    error: string | null;
    linhagem: Linhagem;
    sexo: Sexo;
  }>({ silo: null, medicoes: [], error: null, linhagem: "ross_ap95", sexo: "misto" });
  useEffect(() => {
    let cancelled = false;
    if (!lote || !fazendaId) {
      setState({ silo: null, medicoes: [], error: null, linhagem: "ross_ap95", sexo: "misto" });
      return;
    }
    setState((prev) => ({ ...prev, silo: null, medicoes: [], error: null }));
    void (async () => {
      const [ent, pes, conf, med] = await Promise.all([
        client
          .from("entregas_racao")
          .select("id,data,quantidade_kg")
          .eq("lote_id", lote.id)
          .order("data"),
        client
          .from("silo_pesagens")
          .select("id,medido_em,estoque_kg")
          .eq("lote_id", lote.id)
          .order("medido_em"),
        client
          .from("silo_config")
          .select("*")
          .eq("lote_id", lote.id)
          .order("updated_at", { ascending: false })
          .limit(1),
        client
          .from("lote_medicoes")
          .select("*")
          .eq("lote_id", lote.id)
          .order("data", { ascending: false })
          .limit(30),
      ]);
      if (cancelled) return;
      if ([ent, pes, conf, med].some((r) => r.error)) {
        setState((prev) => ({ ...prev, error: "Não foi possível atualizar silo e medições." }));
        return;
      }
      let linhagem: Linhagem = "ross_ap95",
        sexo: Sexo = "misto";
      try {
        const p = JSON.parse(localStorage.getItem(`silo_pref_${fazendaId}`) ?? "{}");
        if (["ross_ap95", "ross308", "cobb500"].includes(p.linhagem)) linhagem = p.linhagem;
        if (["misto", "macho", "femea"].includes(p.sexo)) sexo = p.sexo;
      } catch {
        /* defaults */
      }
      const c = conf.data?.[0];
      const cfg = c
        ? {
            capacidadeKg: Number(c.capacidade_kg),
            capacidadeOperacionalKg: c.capacidade_operacional_kg,
            estoqueMinimoKg: Number(c.estoque_minimo_kg),
            margemSegurancaKg: Number(c.margem_seguranca_kg),
            cargaPadraoKg: Number(c.carga_padrao_kg),
            leadTimeHoras: Number(c.lead_time_horas),
            erroBalancaKg: Number(c.erro_balanca_kg),
            perdaPct: Number(c.perda_pct),
          }
        : CFG_PADRAO;
      const silo =
        ent.data?.length || pes.data?.length
          ? calcularSilo({
              agora: new Date(),
              alojamento: lote.dataEntrada,
              qtdInicial: lote.quantidadeInicial,
              previsaoAbateDias: lote.previsaoAbateDias,
              linhagem,
              sexo,
              entries: lote.entries,
              entregas: (ent.data ?? []).map((e) => ({
                id: e.id,
                data: e.data,
                kg: Number(e.quantidade_kg),
              })),
              pesagens: (pes.data ?? []).map((p) => ({
                id: p.id,
                medidoEm: p.medido_em,
                kg: Number(p.estoque_kg),
              })),
              cfg,
            })
          : null;
      setState({ silo, medicoes: (med.data ?? []) as Medicao[], error: null, linhagem, sexo });
    })().catch(() => {
      if (!cancelled) setState((prev) => ({ ...prev, error: "Falha na atualização da granja." }));
    });
    return () => {
      cancelled = true;
    };
  }, [client, fazendaId, lote, tick]);
  return state;
}
