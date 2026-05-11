import { cn } from "@/lib/utils";
import type { ModalSize } from "@/types";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: ModalSize;
  footer?: React.ReactNode;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  title,
  children,
  onClose,
  size = "md",
  footer,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="presentation"
      aria-labelledby="modal-title"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={cn(
          "relative bg-card border border-border rounded-xl shadow-xl w-full outline-none",
          sizeClasses[size],
        )}
        data-ocid="modal.dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2
            id="modal-title"
            className="text-base font-semibold text-foreground"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded-md p-1 transition-smooth"
            aria-label="Close modal"
            data-ocid="modal.close_button"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto max-h-[calc(90vh-10rem)]">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border bg-muted/30 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
