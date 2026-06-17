import { createServerFn } from "@tanstack/react-start";

export type Noticia = {
  titulo: string;
  link: string;
  resumo: string;
  data: string;
  fonte: string;
  imagem?: string;
};

const FONTES = [
  { nome: "Canal Rural", url: "https://www.canalrural.com.br/feed/" },
  { nome: "Notícias Agrícolas", url: "https://www.noticiasagricolas.com.br/rss/noticias" },
];

function stripTags(s: string) {
  return s
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function extractTag(item: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = item.match(re);
  return m ? stripTags(m[1]) : "";
}

function extractImage(item: string): string | undefined {
  const enc = item.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
  if (enc) return enc[1];
  const media = item.match(/<media:content[^>]+url=["']([^"']+)["']/i);
  if (media) return media[1];
  const img = item.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (img) return img[1];
  return undefined;
}

async function fetchFeed(fonte: { nome: string; url: string }): Promise<Noticia[]> {
  try {
    const res = await fetch(fonte.url, {
      headers: { "User-Agent": "AgroSitio/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = xml.split(/<item[\s>]/i).slice(1).map((s) => "<item " + s.split("</item>")[0] + "</item>");
    return items.slice(0, 12).map((item) => ({
      titulo: extractTag(item, "title"),
      link: extractTag(item, "link"),
      resumo: extractTag(item, "description").slice(0, 280),
      data: extractTag(item, "pubDate"),
      fonte: fonte.nome,
      imagem: extractImage(item),
    })).filter((n) => n.titulo && n.link);
  } catch {
    return [];
  }
}

export const buscarNoticiasAgro = createServerFn({ method: "GET" }).handler(async (): Promise<Noticia[]> => {
  const results = await Promise.all(FONTES.map(fetchFeed));
  const todas = results.flat();
  todas.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  return todas.slice(0, 24);
});

export type CotacaoMoeda = { codigo: string; nome: string; valor: number; variacao_pct: number; atualizado: string };

export const buscarCotacoesMoedas = createServerFn({ method: "GET" }).handler(async (): Promise<CotacaoMoeda[]> => {
  try {
    const res = await fetch("https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL", {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const data = await res.json() as Record<string, { code: string; name: string; bid: string; pctChange: string; create_date: string }>;
    return Object.values(data).map((c) => ({
      codigo: c.code,
      nome: c.name,
      valor: Number(c.bid),
      variacao_pct: Number(c.pctChange),
      atualizado: c.create_date,
    }));
  } catch {
    return [];
  }
});
