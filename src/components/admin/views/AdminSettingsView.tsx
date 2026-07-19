import { useAuth } from "@/context/AuthContext";
import { DashboardCard } from "@/components/DashboardCard";
import { ProfilePhotoUploader } from "@/components/ui/ProfilePhotoUploader";
import { Badge } from "@/components/ui/badge";
import { Mail, Shield, User } from "lucide-react";

export const AdminSettingsView = () => {
  const { user, refreshProfile } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure platform preferences and admin settings here.</p>
      </header>

      <DashboardCard title="Admin Profile" subtitle="Your administrator account details and profile photo.">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
          <ProfilePhotoUploader
            userId={user.id}
            currentUrl={null}
            userName={user.name}
            size="lg"
            onUploaded={() => void refreshProfile()}
          />

          <div className="space-y-4 flex-1">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Display Name
              </p>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-base font-semibold">{user.name ?? "Admin"}</p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Email
              </p>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground">{user.email ?? "No email available"}</p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Role
              </p>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                <Badge variant="secondary" className="capitalize text-xs">
                  {user.role ?? "admin"}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
};
