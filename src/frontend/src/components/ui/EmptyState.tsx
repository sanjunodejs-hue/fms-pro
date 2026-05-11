import { Button } from "@/components/ui/button";
import { InboxIcon } from "lucide-react";

interface EmptyStateProps {
  message?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({
  message = "No data found",
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 text-center"
      data-ocid="empty_state"
    >
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
        {icon ?? <InboxIcon size={24} className="text-muted-foreground" />}
      </div>
      <p className="text-sm font-medium text-foreground mb-1">{message}</p>
      {description && (
        <p className="text-xs text-muted-foreground mb-4 max-w-xs">
          {description}
        </p>
      )}
      {action && (
        <Button
          type="button"
          size="sm"
          onClick={action.onClick}
          className="mt-2"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
