import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getCloudClient, publicClient } from "./client";
import type { SupabaseClient } from "@supabase/supabase-js";

type FazendaCtx = {
  fazendaId: string | null;
  fazendaNome: string | null;
  codigo: string | null;
  operador: string;
  setOperador: (s: string) => void;
  entrar: (codigo: string) => Promise<{ ok: boolean; nome?: string; erro?: string }>;
  criar: (nome: string, codigo: string) => Promise<{ ok: boolean; erro?: string }>;
  sair: () => void;
  client: SupabaseClient;
};

const Ctx = createContext<FazendaCtx | null>(null);

export function FazendaProvider({ children }: { children: ReactNode }) {
  const [fazendaId, setFazendaId] = useState<string | null>(null);
  const [fazendaNome, setFazendaNome] = useState<string | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [operador, setOperadorState] = useState<string>("");

  // restaurar do localStorage
  useEffect(() => {
    try {
      const c = localStorage.getItem("fazenda:codigo");
      const id = localStorage.getItem("fazenda:id");
      const n = localStorage.getItem("fazenda:nome");
      const op = localStorage.getItem("fazenda:operador") || "";
      if (c && id) {
        setCodigo(c);
        setFazendaId(id);
        setFazendaNome(n);
      }
      setOperadorState(op);
    } catch {}
  }, []);

  const setOperador = (s: string) => {
    setOperadorState(s);
    try { localStorage.setItem("fazenda:operador", s); } catch {}
  };

  const entrar = async (cod: string) => {
    const code = cod.trim().toUpperCase();
    const { data, error } = await publicClient.rpc("entrar_fazenda", { p_codigo: code });
    if (error) return { ok: false, erro: error.message };
    const row = (data as Array<{ id: string; nome: string }>)?.[0];
    if (!row) return { ok: false, erro: "Código não encontrado" };
    setCodigo(code);
    setFazendaId(row.id);
    setFazendaNome(row.nome);
    try {
      localStorage.setItem("fazenda:codigo", code);
      localStorage.setItem("fazenda:id", row.id);
      localStorage.setItem("fazenda:nome", row.nome);
    } catch {}
    return { ok: true, nome: row.nome };
  };

  const criar = async (nome: string, cod: string) => {
    const code = cod.trim().toUpperCase();
    const { data, error } = await publicClient.rpc("criar_fazenda", { p_nome: nome.trim(), p_codigo: code });
    if (error) return { ok: false, erro: error.message };
    const row = (data as Array<{ id: string; nome: string }>)?.[0];
    if (!row) return { ok: false, erro: "Não foi possível criar" };
    setCodigo(code);
    setFazendaId(row.id);
    setFazendaNome(row.nome);
    try {
      localStorage.setItem("fazenda:codigo", code);
      localStorage.setItem("fazenda:id", row.id);
      localStorage.setItem("fazenda:nome", row.nome);
    } catch {}
    return { ok: true };
  };

  const sair = () => {
    setCodigo(null); setFazendaId(null); setFazendaNome(null);
    try {
      localStorage.removeItem("fazenda:codigo");
      localStorage.removeItem("fazenda:id");
      localStorage.removeItem("fazenda:nome");
    } catch {}
  };

  const client = getCloudClient(codigo);

  return (
    <Ctx.Provider value={{ fazendaId, fazendaNome, codigo, operador, setOperador, entrar, criar, sair, client }}>
      {children}
    </Ctx.Provider>
  );
}

export function useFazenda() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useFazenda fora do FazendaProvider");
  return v;
}
