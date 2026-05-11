import { cn } from "@/lib/utils";
import type { StatCardProps } from "@/types";
import { TrendingDown, TrendingUp } from "lucide-react";

const variantStyles: Record<
  string,
  { icon: string; gradient: string; glow: string }
> = {
  blue: {
    icon: "bg-primary/10 text-primary border border-primary/20",
    gradient: "from-primary/8 to-primary/3",
    glow: "shadow-primary/10",
  },
  green: {
    icon: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
    gradient: "from-emerald-500/8 to-emerald-500/3",
    glow: "shadow-emerald-500/10",
  },
  orange: {
    icon: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
    gradient: "from-amber-500/8 to-amber-500/3",
    glow: "shadow-amber-500/10",
  },
  red: {
    icon: "bg-destructive/10 text-destructive border border-destructive/20",
    gradient: "from-destructive/8 to-destructive/3",
    glow: "shadow-destructive/10",
  },
  purple: {
    icon: "bg-violet-500/10 text-violet-600 border border-violet-500/20",
    gradient: "from-violet-500/8 to-violet-500/3",
    glow: "shadow-violet-500/10",
  },
  indigo: {
    icon: "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20",
    gradient: "from-indigo-500/8 to-indigo-500/3",
    glow: "shadow-indigo-500/10",
  },
};

const trendColors = {
  up: "text-emerald-600",
  down: "text-destructive",
};

export function StatCard({
  icon,
  label,
  value,
  trend,
  variant = "blue",
}: StatCardProps) {
  const styles = variantStyles[variant] ?? variantStyles.blue;
  return (
    <div
      className={cn(
        "relative bg-card border border-border rounded-2xl p-5 flex items-start gap-4 transition-smooth overflow-hidden",
        "hover:-translate-y-0.5 hover:shadow-card shadow-subtle",
      )}
    >
      {/* Subtle gradient bg accent */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none",
          styles.gradient,
        )}
      />
      <div
        className={cn(
          "relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
          styles.icon,
        )}
      >
        {icon}
      </div>
      <div className="relative flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide truncate">
          {label}
        </p>
        <p className="text-2xl font-bold text-foreground mt-1 font-display">
          {value}
        </p>
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 mt-1.5 text-xs font-medium",
              trendColors[trend.direction],
            )}
          >
            {trend.direction === "up" ? (
              <TrendingUp size={12} />
            ) : (
              <TrendingDown size={12} />
            )}
            <span>{Math.abs(trend.value)}% from last month</span>
          </div>
        )}
      </div>
    </div>
  );
}
