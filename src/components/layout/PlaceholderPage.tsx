import { Construction } from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";

type PlaceholderPageProps = {
  title: string;
  description?: string;
};

export const PlaceholderPage = ({
  title,
  description = "This section is coming soon. Check back later.",
}: PlaceholderPageProps) => (
  <div className="animate-in fade-in duration-300">
    <DashboardCard title={title} subtitle={description}>
      <div className="py-16 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-secondary/60 text-muted-foreground mb-4">
          <Construction className="h-7 w-7" />
        </div>
        <p className="text-sm text-muted-foreground">Feature under development</p>
      </div>
    </DashboardCard>
  </div>
);
