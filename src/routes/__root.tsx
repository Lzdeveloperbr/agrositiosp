import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { FazendaProvider, useFazenda } from "@/lib/cloud/fazenda";
import { EntrarFazenda } from "@/components/EntrarFazenda";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0b1410" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "AgroSítio" },
      { name: "mobile-web-app-capable", content: "yes" },
      { title: "AgroSítio — Gestão Rural" },
      { name: "description", content: "App de gestão de granja de frango de corte e consumo de energia." },
      { name: "author", content: "AgroSítio" },
      { property: "og:site_name", content: "AgroSítio — Gestão Rural" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "AgroSítio — Gestão Rural" },
      { property: "og:description", content: "Gestão profissional de granja, gado, plantios, energia e finanças com clima ao vivo, IA e relatórios em PDF." },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "AgroSítio — Gestão Rural" },
      { name: "twitter:description", content: "Gestão profissional de granja, gado, plantios, energia e finanças com clima ao vivo, IA e relatórios em PDF." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "AgroSítio",
              url: "https://granja-flow-smart-agri.lovable.app",
              logo: "https://granja-flow-smart-agri.lovable.app/icon-512.png",
              description: "Sistema profissional de gestão rural para granja, gado, plantios, energia e finanças.",
            },
            {
              "@type": "WebSite",
              name: "AgroSítio — Gestão Rural",
              url: "https://granja-flow-smart-agri.lovable.app",
              description: "App de gestão de fazenda: granja de frango, gado de corte, plantios, energia e finanças.",
              inLanguage: "pt-BR",
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Toaster richColors position="top-right" />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <FazendaProvider>
      <Gate />
    </FazendaProvider>
  );
}

function Gate() {
  const { fazendaId } = useFazenda();
  if (!fazendaId) return <EntrarFazenda />;
  return <Outlet />;
}
