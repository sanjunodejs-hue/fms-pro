import { cn } from "@/lib/utils";
import type { ToastMessage, ToastVariant } from "@/types";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const iconMap: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 size={16} className="shrink-0" />,
  error: <AlertCircle size={16} className="shrink-0" />,
  warning: <AlertTriangle size={16} className="shrink-0" />,
  info: <Info size={16} className="shrink-0" />,
};

const styleMap: Record<ToastVariant, string> = {
  success:
    "bg-card border-l-4 border-l-green-500 shadow-elevated text-foreground",
  error:
    "bg-card border-l-4 border-l-destructive shadow-elevated text-foreground",
  warning:
    "bg-card border-l-4 border-l-yellow-500 shadow-elevated text-foreground",
  info: "bg-card border-l-4 border-l-primary shadow-elevated text-foreground",
};

const iconColorMap: Record<ToastVariant, string> = {
  success: "text-green-500",
  error: "text-destructive",
  warning: "text-yellow-500",
  info: "text-primary",
};

function ToastItem({
  toast,
  onRemove,
}: {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const duration = toast.duration ?? 4500;

  useEffect(() => {
    timerRef.current = setTimeout(() => onRemove(toast.id), duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, duration, onRemove]);

  return (
    <div
      className={cn(
        "flex items-start gap-3 w-80 rounded-lg px-4 py-3 border border-border",
        "animate-in slide-in-from-right-4 fade-in duration-300",
        styleMap[toast.variant],
      )}
      role="alert"
      aria-live="polite"
      data-ocid={`toast.${toast.variant}`}
    >
      <span className={cn("mt-0.5", iconColorMap[toast.variant])}>
        {iconMap[toast.variant]}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug">{toast.title}</p>
        {toast.description && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {toast.description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        className="text-muted-foreground hover:text-foreground transition-smooth shrink-0 mt-0.5"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Context ──────────────────────────────────
interface ToastContextValue {
  toast: (msg: Omit<ToastMessage, "id">) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((msg: Omit<ToastMessage, "id">) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [
      ...prev.slice(-4), // max 5 at once
      { ...msg, id },
    ]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Portal */}
      <div
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
