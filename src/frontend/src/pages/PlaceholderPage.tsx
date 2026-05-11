import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/ui/EmptyState";
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
}

export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <AppLayout title={title}>
      <div className="flex items-center justify-center min-h-[400px]">
        <EmptyState
          icon={<Construction size={24} className="text-muted-foreground" />}
          message={`${title} — Coming Soon`}
          description="This section is being built. Check back soon."
        />
      </div>
    </AppLayout>
  );
}
