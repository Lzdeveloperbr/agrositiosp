// Cliente Supabase customizado por fazenda (envia x-fazenda-codigo em todo request).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL!;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const cache = new Map<string, SupabaseClient>();

export function getCloudClient(codigo: string | null): SupabaseClient {
  const k = codigo ?? "_anon_";
  if (cache.has(k)) return cache.get(k)!;
  const client = createClient(URL, KEY, {
    // storageKey único evita o aviso "Multiple GoTrueClient instances"
    auth: { persistSession: false, autoRefreshToken: false, storageKey: `agro-nosess-${k}` },
    global: codigo ? { headers: { "x-fazenda-codigo": codigo } } : undefined,
    realtime: { params: { eventsPerSecond: 10 } },
  });
  cache.set(k, client);
  return client;
}

// Cliente "público" sem header — usado para entrar/criar fazenda (chama RPCs SECURITY DEFINER).
export const publicClient = getCloudClient(null);
