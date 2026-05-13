import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://granja-flow-smart-agri.lovable.app";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/diario", changefreq: "weekly", priority: "0.7" },
          { path: "/tarefas", changefreq: "weekly", priority: "0.6" },
          { path: "/lembretes", changefreq: "monthly", priority: "0.6" },
          { path: "/granja", changefreq: "weekly", priority: "0.8" },
          { path: "/manejo", changefreq: "monthly", priority: "0.7" },
          { path: "/gado", changefreq: "weekly", priority: "0.8" },
          { path: "/plantios", changefreq: "weekly", priority: "0.8" },
          { path: "/chuvas", changefreq: "weekly", priority: "0.6" },
          { path: "/monitoramento", changefreq: "weekly", priority: "0.6" },
          { path: "/estoque", changefreq: "weekly", priority: "0.6" },
          { path: "/compras", changefreq: "weekly", priority: "0.6" },
          { path: "/maquinas", changefreq: "monthly", priority: "0.6" },
          { path: "/energia", changefreq: "monthly", priority: "0.7" },
          { path: "/financeiro", changefreq: "weekly", priority: "0.7" },
          { path: "/relatorios", changefreq: "monthly", priority: "0.6" },
          { path: "/backup", changefreq: "monthly", priority: "0.4" },
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ].filter(Boolean).join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
