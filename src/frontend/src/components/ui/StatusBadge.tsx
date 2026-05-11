import { cn } from "@/lib/utils";
import type { BadgeVariant } from "@/types";

// Dot colors for status indicators
const dotColors: Record<BadgeVariant, string> = {
  new: "bg-primary",
  followUp: "bg-amber-500",
  converted: "bg-emerald-500",
  dropped: "bg-destructive",
  pending: "bg-amber-500",
  confirmed: "bg-emerald-500",
  rejected: "bg-destructive",
  paid: "bg-emerald-500",
  overdue: "bg-destructive",
  active: "bg-emerald-500",
  inactive: "bg-muted-foreground",
  completed: "bg-violet-500",
};

const badgeClasses: Record<BadgeVariant, string> = {
  new: "bg-primary/10 text-primary border-primary/20",
  followUp: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  converted: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  dropped: "bg-destructive/10 text-destructive border-destructive/20",
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  confirmed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  paid: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  inactive: "bg-muted text-muted-foreground border-border",
  completed: "bg-violet-500/10 text-violet-700 border-violet-500/20",
};

const labelMap: Record<BadgeVariant, string> = {
  new: "New",
  followUp: "Follow-up",
  converted: "Converted",
  dropped: "Dropped",
  pending: "Pending",
  confirmed: "Confirmed",
  rejected: "Rejected",
  paid: "Paid",
  overdue: "Overdue",
  active: "Active",
  inactive: "Inactive",
  completed: "Completed",
};

interface StatusBadgeProps {
  variant: BadgeVariant;
  label?: string;
  className?: string;
  dot?: boolean;
}

export function StatusBadge({
  variant,
  label,
  className,
  dot = true,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
        badgeClasses[variant],
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0",
            dotColors[variant],
          )}
        />
      )}
      {label ?? labelMap[variant]}
    </span>
  );
}
