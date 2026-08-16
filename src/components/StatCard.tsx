import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "primary" | "accent" | "destructive" | "muted";
};

export function StatCard({ label, value, hint, icon: Icon, tone = "primary" }: Props) {
  const toneClass = {
    primary: "from-primary/20 to-primary/5 text-primary",
    accent: "from-accent/20 to-accent/5 text-accent",
    destructive: "from-destructive/20 to-destructive/5 text-destructive",
    muted: "from-muted to-muted/50 text-muted-foreground",
  }[tone];

  return (
    <Card className="reveal lift sheen group p-5 md:p-6 relative overflow-hidden border-border/60" style={{ background: "var(--gradient-surface)", boxShadow: "var(--shadow-card)" }}>
      <div className={cn("absolute -top-8 -right-8 h-32 w-32 rounded-full bg-linear-to-br opacity-50 blur-2xl transition-opacity duration-500 group-hover:opacity-80", toneClass)} />
      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <p className="eyebrow truncate">{label}</p>
          <p className="text-3xl md:text-[2rem] font-display font-bold tabular-nums leading-none tracking-[-0.03em]">{value}</p>
          {hint && <p className="text-xs leading-relaxed text-muted-foreground truncate">{hint}</p>}
        </div>
        <div className={cn("h-10 w-10 shrink-0 rounded-xl flex items-center justify-center bg-linear-to-br transition-transform duration-500 group-hover:scale-110", toneClass)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

