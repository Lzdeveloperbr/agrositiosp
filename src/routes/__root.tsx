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
      { property: "og:title", content: "AgroSítio — Gestão Rural" },
      { property: "og:description", content: "Agro Companion is a comprehensive farm and ranch management application for poultry and cattle operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Lovable App" },
      { name: "twitter:description", content: "Agro Companion is a comprehensive farm and ranch management application for poultry and cattle operations." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/adb12590-1a7e-469e-a5da-08cfc09fd347/id-preview-6e3dd7c3--aa4cceb7-0245-4ea6-a45a-b41234135f13.lovable.app-1777756907091.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/adb12590-1a7e-469e-a5da-08cfc09fd347/id-preview-6e3dd7c3--aa4cceb7-0245-4ea6-a45a-b41234135f13.lovable.app-1777756907091.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
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
