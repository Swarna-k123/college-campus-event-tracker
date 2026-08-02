import { Outlet } from "react-router-dom";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useAuth } from "@/context/AuthContext";
import type { Role } from "@/lib/roles";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

type RoleDashboardLayoutProps = {
  role: Role;
  roleLabel: string;
};

export const RoleDashboardLayout = ({ role, roleLabel }: RoleDashboardLayoutProps) => {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <SidebarProvider style={{ "--sidebar-width": "250px" } as React.CSSProperties}>
      <AppSidebar role={role} roleLabel={roleLabel} />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border/40 bg-background/80 px-4 backdrop-blur-xl">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="truncate text-sm font-medium text-muted-foreground">{user.name}</span>
          <div className="ml-auto flex items-center gap-2">
            {role === "student" && (
              <>
                <Button variant="ghost" size="icon" className="rounded-full" aria-label="Profile" title="Profile">
                  <User className="h-4 w-4" />
                </Button>
                <NotificationBell />
              </>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          <div className="px-6 md:px-12 py-8 md:py-10 max-w-7xl mx-auto animate-in fade-in duration-300">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};
