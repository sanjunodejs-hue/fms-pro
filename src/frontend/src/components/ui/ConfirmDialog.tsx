import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, Info } from "lucide-react";

interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "warning";
  confirmLabel?: string;
  isLoading?: boolean;
}

export function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  variant = "danger",
  confirmLabel = "Confirm",
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      data-ocid="confirm.dialog"
    >
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm">
        <div className="p-5">
          <div
            className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center mb-4",
              variant === "danger" ? "bg-red-100" : "bg-orange-100",
            )}
          >
            {variant === "danger" ? (
              <AlertTriangle size={20} className="text-red-600" />
            ) : (
              <Info size={20} className="text-orange-600" />
            )}
          </div>
          <h3 className="text-base font-semibold text-foreground mb-2">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <div className="flex gap-2 px-5 pb-5 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            data-ocid="confirm.cancel_button"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={variant === "danger" ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={isLoading}
            data-ocid="confirm.confirm_button"
          >
            {isLoading ? "Processing..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
