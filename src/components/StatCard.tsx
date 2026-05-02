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
    <Card className="p-5 relative overflow-hidden border-border/60" style={{ background: "var(--gradient-surface)", boxShadow: "var(--shadow-card)" }}>
      <div className={cn("absolute -top-8 -right-8 h-32 w-32 rounded-full bg-gradient-to-br opacity-50 blur-2xl", toneClass)} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-display font-bold tabular-nums">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center bg-gradient-to-br", toneClass)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
