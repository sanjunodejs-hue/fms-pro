import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  fullPage?: boolean;
}

const sizeClasses = {
  sm: "w-4 h-4 border-2",
  md: "w-8 h-8 border-2",
  lg: "w-12 h-12 border-3",
};

export function LoadingSpinner({
  size = "md",
  className,
  fullPage,
}: LoadingSpinnerProps) {
  const spinner = (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "rounded-full border-muted border-t-primary animate-spin",
        sizeClasses[size],
        className,
      )}
    />
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 z-50">
        {spinner}
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center py-4"
      data-ocid="loading_state"
    >
      {spinner}
    </div>
  );
}
