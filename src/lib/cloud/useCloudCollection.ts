// Hook genérico que substitui useLocalStorage por sincronização em nuvem com realtime.
// API compatível: const [items, set] = useCloudCollection<T>("tabela");
// `set` aceita um array (substitui — usado raramente) ou função reducer (ignorado e tratado por addItem/updateItem/removeItem nos métodos auxiliares).
import { useEffect, useState, useCallback } from "react";
import { useFazenda } from "./fazenda";

export type WithId = { id: string };

export function useCloudCollection<T extends WithId>(table: string, orderBy: { col: string; asc?: boolean } = { col: "created_at", asc: false }) {
  const { client, fazendaId, codigo } = useFazenda();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar
  useEffect(() => {
    if (!fazendaId || !codigo) { setItems([]); setLoading(false); return; }
    let cancel = false;
    setLoading(true);
    client.from(table).select("*").order(orderBy.col, { ascending: !!orderBy.asc })
      .then(({ data, error }) => {
        if (cancel) return;
        if (error) console.error(`[${table}] load`, error);
        setItems((data as T[]) || []);
        setLoading(false);
      });

    const ch = client.channel(`rt:${table}:${fazendaId}:${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table, filter: `fazenda_id=eq.${fazendaId}` },
        (payload) => {
          setItems((prev) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as T;
              if (prev.some((i) => i.id === row.id)) return prev;
              return orderBy.asc ? [...prev, row] : [row, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              return prev.map((i) => (i.id === (payload.new as T).id ? (payload.new as T) : i));
            }
            if (payload.eventType === "DELETE") {
              return prev.filter((i) => i.id !== (payload.old as T).id);
            }
            return prev;
          });
        }).subscribe();

    return () => { cancel = true; client.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fazendaId, codigo, table]);

  const add = useCallback(async (row: Partial<T>) => {
    if (!fazendaId) return null;
    const payload: any = { ...row, fazenda_id: fazendaId };
    delete payload.id;
    const { data, error } = await client.from(table).insert(payload).select().single();
    if (error) { console.error(`[${table}] add`, error); return null; }
    setItems((prev) => prev.some((i) => i.id === (data as T).id) ? prev : (orderBy.asc ? [...prev, data as T] : [data as T, ...prev]));
    return data as T;
  }, [client, fazendaId, table, orderBy.asc]);

  const update = useCallback(async (id: string, patch: Partial<T>) => {
    const clean: any = { ...patch }; delete clean.id; delete clean.fazenda_id; delete clean.created_at;
    const { data, error } = await client.from(table).update(clean).eq("id", id).select().single();
    if (error) { console.error(`[${table}] update`, error); return null; }
    setItems((prev) => prev.map((i) => (i.id === id ? (data as T) : i)));
    return data as T;
  }, [client, table]);

  const remove = useCallback(async (id: string) => {
    const { error } = await client.from(table).delete().eq("id", id);
    if (error) { console.error(`[${table}] remove`, error); return false; }
    setItems((prev) => prev.filter((i) => i.id !== id));
    return true;
  }, [client, table]);

  return { items, setItems, loading, add, update, remove };
}
