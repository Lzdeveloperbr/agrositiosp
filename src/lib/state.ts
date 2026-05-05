import { useLocalStorage } from "@/lib/storage";
import type {
  Lote,
  Medidor,
  Animal,
  Pasto,
  DiarioEntry,
  Tarefa,
  ItemEstoque,
  Lancamento,
} from "@/lib/types";

const DEFAULT_MEDIDORES: Medidor[] = [
  { id: "fab", nome: "Fábrica de Ração", codigoInstalacao: "38563436", codigoRelogio: "RM0523424", leituras: [] },
  { id: "ger", nome: "Gerador de Energia", codigoInstalacao: "1059742", codigoRelogio: "AR0248488", leituras: [] },
  { id: "gra", nome: "Granja Velha", codigoInstalacao: "1059700", codigoRelogio: "3T3138330", leituras: [] },
];

export function useLotes() { return useLocalStorage<Lote[]>("agro:lotes", []); }
export function useMedidores() { return useLocalStorage<Medidor[]>("agro:medidores", DEFAULT_MEDIDORES); }
export function useAnimais() { return useLocalStorage<Animal[]>("agro:animais", []); }
export function usePastos() { return useLocalStorage<Pasto[]>("agro:pastos", []); }
export function useDiario() { return useLocalStorage<DiarioEntry[]>("agro:diario", []); }
export function useTarefas() { return useLocalStorage<Tarefa[]>("agro:tarefas", []); }
export function useEstoque() { return useLocalStorage<ItemEstoque[]>("agro:estoque", []); }
export function useFinanceiro() { return useLocalStorage<Lancamento[]>("agro:financeiro", []); }

export const STORAGE_KEYS = [
  "agro:lotes",
  "agro:medidores",
  "agro:animais",
  "agro:pastos",
  "agro:diario",
  "agro:tarefas",
  "agro:estoque",
  "agro:financeiro",
];
