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
    primary: "bg-primary/10 text-primary border-primary/15",
    accent: "bg-accent/10 text-accent border-accent/15",
    destructive: "bg-destructive/10 text-destructive border-destructive/15",
    muted: "bg-muted text-muted-foreground border-border",
  }[tone];

  return (
    <Card className="reveal lift sheen group p-4 md:p-5 relative overflow-hidden operational-surface">
      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <p className="eyebrow truncate">{label}</p>
           <p className="text-2xl md:text-[2rem] font-display font-bold tabular-nums leading-none">{value}</p>
          {hint && <p className="text-xs leading-relaxed text-muted-foreground truncate">{hint}</p>}
        </div>
         <div className={cn("h-10 w-10 shrink-0 rounded-md border flex items-center justify-center transition-transform duration-300 group-hover:scale-105", toneClass)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

