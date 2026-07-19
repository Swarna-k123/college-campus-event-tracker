import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { DashboardCard } from "@/components/DashboardCard";
import { ProfilePhotoUploader } from "@/components/ui/ProfilePhotoUploader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Shield, User, Loader2, CheckCircle2, GraduationCap, Hash } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const StudentProfileView = () => {
  const { user, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync if auth context updates
  useEffect(() => {
    setFullName(user?.name ?? "");
  }, [user?.name]);

  const handleSave = async () => {
    if (!user) return;
    const trimmed = fullName.trim();
    if (!trimmed) {
      toast.error("Name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: trimmed })
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      setSaved(true);
      toast.success("Profile updated successfully.");
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const isDirty = fullName.trim() !== (user.name ?? "");

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your personal information and account details.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">
        {/* ── Left: Photo card ── */}
        <DashboardCard className="flex flex-col items-center gap-4 lg:w-64 text-center">
          <div className="w-full text-left mb-1">
            <h3 className="text-base font-semibold">Profile Photo</h3>
            <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG or WEBP. Max size 5MB.</p>
          </div>

          <ProfilePhotoUploader
            userId={user.id}
            currentUrl={null}
            userName={user.name}
            size="lg"
            onUploaded={() => void refreshProfile()}
          />

          {/* Name + role summary under photo */}
          <div className="mt-1">
            <p className="font-semibold text-base">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            <Badge variant="outline" className="mt-2 text-xs bg-primary/10 text-primary border-primary/30 capitalize">
              {user.role}
            </Badge>
          </div>
        </DashboardCard>

        {/* ── Right: Personal information ── */}
        <div className="space-y-5">
          <DashboardCard title="Personal Information" subtitle="Update your display name and view your account details.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-2">
              {/* Editable: Full Name */}
              <div className="space-y-2">
                <Label htmlFor="full-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="full-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-9 bg-secondary/60 border-border/60 focus:border-primary/60"
                    placeholder="Your full name"
                  />
                </div>
              </div>

              {/* Read-only: Email */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    readOnly
                    value={user.email ?? ""}
                    className="pl-9 bg-secondary/30 border-border/40 text-muted-foreground cursor-default"
                  />
                </div>
              </div>

              {/* Read-only: Role */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Role
                </Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    readOnly
                    value="Student"
                    className="pl-9 bg-secondary/30 border-border/40 text-muted-foreground cursor-default capitalize"
                  />
                </div>
              </div>

              {/* Read-only: Club ID shown as club (if any) */}
              {user.clubName && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Club
                  </Label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      readOnly
                      value={user.clubName}
                      className="pl-9 bg-secondary/30 border-border/40 text-muted-foreground cursor-default"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Save button */}
            <div className="mt-6 flex items-center gap-3">
              <Button
                onClick={() => void handleSave()}
                disabled={saving || !isDirty}
                className="bg-gradient-primary border-0 text-primary-foreground shadow-glow gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                ) : saved ? (
                  <><CheckCircle2 className="h-4 w-4" /> Saved</>
                ) : (
                  "Save Changes"
                )}
              </Button>
              {isDirty && !saving && (
                <button
                  onClick={() => setFullName(user.name ?? "")}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </DashboardCard>

          {/* Account info card */}
          <DashboardCard title="Account Details" subtitle="Your account identifiers and security information.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div className="rounded-xl border border-border/40 bg-secondary/30 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">User ID</p>
                <p className="text-xs font-mono text-muted-foreground truncate">{user.id}</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-secondary/30 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Account Status</p>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              </div>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
};
