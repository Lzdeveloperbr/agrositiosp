import { createServerFn } from "@tanstack/react-start";

export type Noticia = {
  titulo: string;
  resumo: string;
  link: string;
  data: string | null;
  imagem: string | null;
  fonte: string;
};

const FEEDS: { fonte: string; url: string }[] = [
  { fonte: "Notícias Agrícolas", url: "https://www.noticiasagricolas.com.br/rss/ultimas" },
  { fonte: "Canal Rural", url: "https://www.canalrural.com.br/feed/" },
  { fonte: "Globo Rural", url: "https://revistagloborural.globo.com/rss/ultimas-noticias/" },
  { fonte: "Ministério da Agricultura", url: "https://www.gov.br/agricultura/pt-br/assuntos/noticias/RSS" },
];

function pick(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  if (!m) return null;
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}

function findImg(item: string, desc: string): string | null {
  // <enclosure url="..."/>
  let m = item.match(/<enclosure[^>]+url="([^"]+)"/i);
  if (m) return m[1];
  // <media:content url="..."/> or <media:thumbnail url="..."/>
  m = item.match(/<media:(?:content|thumbnail)[^>]+url="([^"]+)"/i);
  if (m) return m[1];
  // <image><url>...</url></image>
  m = item.match(/<image>[\s\S]*?<url>([^<]+)<\/url>/i);
  if (m) return m[1];
  // first <img src=""> in description / content
  m = (desc || "").match(/<img[^>]+src=["']([^"']+)["']/i);
  if (m) return m[1];
  return null;
}

async function parseFeed(fonte: string, url: string, signal: AbortSignal): Promise<Noticia[]> {
  try {
    const r = await fetch(url, {
      signal,
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; AgroSitioBot/1.0)",
        accept: "application/rss+xml, application/xml, text/xml, */*",
      },
    });
    if (!r.ok) return [];
    const xml = await r.text();
    const items = xml.split(/<item[\s>]/i).slice(1).map((c) => c.split(/<\/item>/i)[0]);
    return items.slice(0, 12).map((it) => {
      const titulo = stripHtml(pick(it, "title") || "");
      const link = (pick(it, "link") || "").trim();
      const desc = pick(it, "description") || pick(it, "content:encoded") || "";
      const pub = pick(it, "pubDate") || pick(it, "dc:date") || pick(it, "published");
      const imagem = findImg(it, desc);
      return {
        titulo,
        resumo: stripHtml(desc).slice(0, 220),
        link,
        data: pub ? new Date(pub).toISOString() : null,
        imagem,
        fonte,
      };
    }).filter((n) => n.titulo && n.link);
  } catch {
    return [];
  }
}

export const buscarNoticiasAgro = createServerFn({ method: "GET" }).handler(async () => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const results = await Promise.all(FEEDS.map((f) => parseFeed(f.fonte, f.url, ctrl.signal)));
    const todas = results.flat();
    todas.sort((a, b) => {
      const da = a.data ? new Date(a.data).getTime() : 0;
      const db = b.data ? new Date(b.data).getTime() : 0;
      return db - da;
    });
    return todas.slice(0, 40);
  } finally {
    clearTimeout(t);
  }
});
