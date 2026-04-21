import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  description?: string;
  icon?: ReactNode;
  variant?: "default" | "primary" | "accent" | "success";
  trend?: string;
}

const variants = {
  default: "bg-card",
  primary: "gradient-primary text-primary-foreground",
  accent: "gradient-accent text-accent-foreground",
  success: "gradient-success text-success-foreground",
};

export function StatCard({ label, value, hint, description, icon, variant = "default", trend }: StatCardProps) {
  const isColored = variant !== "default";
  const subtitle = hint ?? description;
  return (
    <div className={cn("relative overflow-hidden rounded-2xl p-5 shadow-soft transition-bounce hover:-translate-y-1 hover:shadow-elevated", variants[variant])}>
      <div className="flex items-start justify-between">
        <div>
          <p className={cn("text-xs font-medium uppercase tracking-wider", isColored ? "opacity-80" : "text-muted-foreground")}>{label}</p>
          <p className="mt-2 font-display text-3xl font-bold">{value}</p>
          {subtitle && <p className={cn("mt-1 text-xs", isColored ? "opacity-80" : "text-muted-foreground")}>{subtitle}</p>}
        </div>
        {icon && (
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", isColored ? "bg-white/20" : "bg-primary/10 text-primary")}>
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <p className={cn("mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", isColored ? "bg-white/20" : "bg-success/10 text-success")}>
          {trend}
        </p>
      )}
    </div>
  );
}
