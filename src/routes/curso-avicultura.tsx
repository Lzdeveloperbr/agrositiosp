import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, PlayCircle } from "lucide-react";

const PLAYLIST_ID = "PL8PskvJpL8J1RFxH2sNAYOXHp5WbWaOiL";
const PLAYLIST_URL = "https://www.youtube.com/playlist?list=" + PLAYLIST_ID;
const EMBED_URL = "https://www.youtube.com/embed/videoseries?list=" + PLAYLIST_ID;

export const Route = createFileRoute("/curso-avicultura")({
  head: () => ({ meta: [
    { title: "Curso Avicultura na Prática — Academia Avícola | Agro Sítio SP" },
    { name: "description", content: "Assista às videoaulas da playlist Curso Avicultura na Prática em sequência." },
  ] }),
  component: CursoAviculturaPage,
});

function CursoAviculturaPage() {
  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl space-y-4 p-1 sm:p-3">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <PlayCircle className="h-5 w-5 text-primary" />
            Academia Avícola
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Curso Avicultura na Prática</h1>
          <p className="text-sm text-muted-foreground">Assista aos vídeos da playlist em ordem. Ao terminar uma aula, escolha a próxima no próprio player.</p>
        </header>

        <Card className="overflow-hidden">
          <div className="aspect-video w-full bg-black">
            <iframe
              className="h-full w-full"
              src={EMBED_URL}
              title="Playlist completa — Curso Avicultura na Prática"
              loading="eager"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Playlist completa do YouTube</p>
              <p className="text-sm text-muted-foreground">Os vídeos são reproduzidos diretamente pelo YouTube, sem aulas de outros canais misturadas.</p>
            </div>
            <Button asChild className="w-full sm:w-auto">
              <a href={PLAYLIST_URL} target="_blank" rel="noreferrer">
                Abrir playlist <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </Card>
      </main>
    </AppShell>
  );
}
