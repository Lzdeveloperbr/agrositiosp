import { useEffect, useState, useCallback } from "react";

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback(
    (v: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    [key],
  );

  return [value, update] as const;
}

export const uid = () => {
  if (typeof crypto !== "undefined" && (crypto as any).randomUUID) return (crypto as any).randomUUID();
  // fallback v4
  const r = (n: number) => Math.floor(Math.random() * n);
  const hex = (n: number) => n.toString(16);
  return `${hex(r(0xffffffff)).padStart(8, "0")}-${hex(r(0xffff)).padStart(4, "0")}-4${hex(r(0xfff)).padStart(3, "0")}-${hex(0x8 | r(0x4)).padStart(1, "0")}${hex(r(0xfff)).padStart(3, "0")}-${hex(r(0xffffffff)).padStart(8, "0")}${hex(r(0xffff)).padStart(4, "0")}`;
};
