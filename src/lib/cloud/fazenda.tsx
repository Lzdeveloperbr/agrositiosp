import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { getCloudClient, publicClient } from "./client";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Coords = { lat: number; lon: number; cidade?: string };

type FazendaCtx = {
  fazendaId: string | null;
  fazendaNome: string | null;
  codigo: string | null;
  operador: string;
  coords: Coords | null;
  setOperador: (s: string) => void;
  setCoords: (c: Coords) => Promise<void>;
  entrar: (codigo: string) => Promise<{ ok: boolean; nome?: string; erro?: string }>;
  criar: (nome: string, codigo: string) => Promise<{ ok: boolean; erro?: string }>;
  sair: () => void;
  client: SupabaseClient;
};

const Ctx = createContext<FazendaCtx | null>(null);

function persist(k: string, v: string | null) {
  try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {}
}

export function FazendaProvider({ children }: { children: ReactNode }) {
  const [fazendaId, setFazendaId] = useState<string | null>(null);
  const [fazendaNome, setFazendaNome] = useState<string | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [operador, setOperadorState] = useState<string>("");
  const [coords, setCoordsState] = useState<Coords | null>(null);

  useEffect(() => {
    try {
      const c = localStorage.getItem("fazenda:codigo");
      const id = localStorage.getItem("fazenda:id");
      const n = localStorage.getItem("fazenda:nome");
      const op = localStorage.getItem("fazenda:operador") || "";
      const co = localStorage.getItem("fazenda:coords");
      if (c && id) { setCodigo(c); setFazendaId(id); setFazendaNome(n); }
      setOperadorState(op);
      if (co) setCoordsState(JSON.parse(co));
    } catch {}
  }, []);

  const setOperador = (s: string) => { setOperadorState(s); persist("fazenda:operador", s); };

  const setCoords = useCallback(async (c: Coords) => {
    setCoordsState(c);
    persist("fazenda:coords", JSON.stringify(c));
    if (codigo) {
      await publicClient.rpc("atualizar_coords_fazenda", {
        p_codigo: codigo, p_lat: c.lat, p_lon: c.lon, p_cidade: c.cidade ?? null,
      });
    }
  }, [codigo]);

  const applyAccess = (cod: string, row: { id: string; nome: string; latitude?: number | null; longitude?: number | null; cidade?: string | null }) => {
    setCodigo(cod); setFazendaId(row.id); setFazendaNome(row.nome);
    persist("fazenda:codigo", cod); persist("fazenda:id", row.id); persist("fazenda:nome", row.nome);
    if (row.latitude != null && row.longitude != null) {
      const c: Coords = { lat: Number(row.latitude), lon: Number(row.longitude), cidade: row.cidade ?? undefined };
      setCoordsState(c);
      persist("fazenda:coords", JSON.stringify(c));
    }
  };

  const entrar = async (cod: string) => {
    const code = cod.trim().toUpperCase();
    const { data, error } = await publicClient.rpc("entrar_fazenda", { p_codigo: code });
    if (error) return { ok: false, erro: error.message };
    const row = (data as any[])?.[0];
    if (!row) return { ok: false, erro: "Código não encontrado" };
    applyAccess(code, row);
    return { ok: true, nome: row.nome };
  };

  const criar = async (nome: string, cod: string) => {
    const code = cod.trim().toUpperCase();
    const { data, error } = await publicClient.rpc("criar_fazenda", { p_nome: nome.trim(), p_codigo: code });
    if (error) return { ok: false, erro: error.message };
    const row = (data as any[])?.[0];
    if (!row) return { ok: false, erro: "Não foi possível criar" };
    applyAccess(code, row);
    return { ok: true };
  };

  const sair = () => {
    setCodigo(null); setFazendaId(null); setFazendaNome(null); setCoordsState(null);
    persist("fazenda:codigo", null); persist("fazenda:id", null); persist("fazenda:nome", null); persist("fazenda:coords", null);
  };

  const client = getCloudClient(codigo);

  return (
    <Ctx.Provider value={{ fazendaId, fazendaNome, codigo, operador, coords, setOperador, setCoords, entrar, criar, sair, client }}>
      {children}
    </Ctx.Provider>
  );
}

export function useFazenda() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useFazenda fora do FazendaProvider");
  return v;
}
