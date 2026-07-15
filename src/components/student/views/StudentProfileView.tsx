import { useAuth } from "@/context/AuthContext";
import { DashboardCard } from "@/components/DashboardCard";
import { UserCircle2 } from "lucide-react";

export const StudentProfileView = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Your account details and student information.</p>
      </header>

      <DashboardCard title="Account Overview" subtitle="Basic student profile details.">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary/20 text-primary border border-primary/30">
            <UserCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold">{user?.name ?? "Student"}</p>
            <p className="text-sm text-muted-foreground">{user?.email ?? "No email available"}</p>
            <p className="text-sm text-muted-foreground">Role: {user?.role ?? "student"}</p>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
};
