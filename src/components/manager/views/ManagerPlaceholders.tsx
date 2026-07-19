import { useAuth } from "@/context/AuthContext";
import { DashboardCard } from "@/components/DashboardCard";
import { ProfilePhotoUploader } from "@/components/ui/ProfilePhotoUploader";
import { ClubLogoUploader } from "@/components/ui/ClubLogoUploader";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Activity, Mail, Shield, User, Building2 } from "lucide-react";




export const ManagerSettingsView = () => {
  const { user, refreshProfile } = useAuth();

  if (!user) return null;

  const clubId = user.clubId;
  const clubName = user.clubName ?? "My Club";

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure club preferences and profile settings.</p>
      </header>

      {/* Profile Photo */}
      <DashboardCard title="Profile Photo" subtitle="Upload a personal profile photo for your account.">
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
                <p className="text-base font-semibold">{user.name ?? "Club Manager"}</p>
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
                  Club Manager
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </DashboardCard>

      {/* Club Logo */}
      {clubId && (
        <DashboardCard title="Club Logo" subtitle="Upload or update the logo for your club.">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
            <ClubLogoUploader
              clubId={clubId}
              currentUrl={null}
              clubName={clubName}
              size="lg"
            />

            <div className="space-y-4 flex-1">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Club Name
                </p>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-base font-semibold">{clubName}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                The club logo appears on your dashboard and across club pages.
                Upload a square image for best results. Accepted: JPG, PNG, WEBP — max 5 MB.
              </p>
            </div>
          </div>
        </DashboardCard>
      )}
    </div>
  );
};
