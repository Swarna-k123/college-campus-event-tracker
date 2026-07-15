import { NavLink, useNavigate } from "react-router-dom";
import { GraduationCap, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { navByRole, roleBasePath, type SidebarNavItem } from "@/config/sidebarNav";
import type { Role } from "@/lib/roles";

type AppSidebarProps = {
  role: Role;
  roleLabel: string;
};

export const AppSidebar = ({ role, roleLabel }: AppSidebarProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const basePath = roleBasePath[role];
  const items = navByRole[role];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200",
      isActive
        ? "bg-primary/10 text-primary font-semibold shadow-glow-sm"
        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
    );

  // Grouping logic for the manager role
  const getManagerGroups = (navItems: SidebarNavItem[]) => {
    return [
      {
        label: "", // Standalone Dashboard
        items: navItems.filter((i) => i.segment === ""),
      },
      {
        label: "Events",
        items: navItems.filter((i) => ["club-events", "my-events", "create"].includes(i.segment)),
      },
      {
        label: "Management",
        items: navItems.filter((i) => ["members", "registrations"].includes(i.segment)),
      },
      {
        label: "Insights",
        items: navItems.filter((i) => ["analytics", "activity"].includes(i.segment)),
      },
      {
        label: "System",
        items: navItems.filter((i) => ["settings"].includes(i.segment)),
      },
    ];
  };

  const renderContent = () => {
    if (role === "manager") {
      const groups = getManagerGroups(items);
      return (
        <SidebarContent className="px-2 py-3 gap-3">
          {groups.map((group, idx) => {
            if (group.items.length === 0) return null;
            return (
              <SidebarGroup key={idx} className="p-0">
                {group.label && (
                  <SidebarGroupLabel className="px-3 text-[10px] uppercase font-bold tracking-wider text-muted-foreground/50 h-6">
                    {group.label}
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu className="gap-0.5">
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.segment || "index"}>
                        <SidebarMenuButton
                          asChild
                          tooltip={item.label}
                          className="h-9 p-0 hover:bg-transparent hover:text-inherit data-[active=true]:bg-transparent"
                        >
                          <NavLink
                            to={item.segment ? `${basePath}/${item.segment}` : basePath}
                            end={item.end}
                            className={navClass}
                          >
                            <item.icon className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-105" />
                            <span>{item.label}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })}
        </SidebarContent>
      );
    }

    // Default flat rendering for non-manager roles
    return (
      <SidebarContent className="px-2 py-3">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="px-3 text-[10px] uppercase font-bold tracking-wider text-muted-foreground/50 h-6">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {items.map((item) => (
                <SidebarMenuItem key={item.segment || "index"}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.label}
                    className="h-9 p-0 hover:bg-transparent hover:text-inherit data-[active=true]:bg-transparent"
                  >
                    <NavLink
                      to={item.segment ? `${basePath}/${item.segment}` : basePath}
                      end={item.end}
                      className={navClass}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40 bg-background/95 backdrop-blur-xl">
      <SidebarHeader className="border-b border-border/40 p-4">
        <NavLink
          to={basePath}
          className="flex items-center gap-3 font-semibold tracking-tight hover:opacity-90 transition-opacity"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </span>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-base font-extrabold text-foreground tracking-tight">CampusHub</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 mt-0.5">
              {roleLabel}
            </span>
          </div>
        </NavLink>
      </SidebarHeader>

      {renderContent()}

      <SidebarFooter className="border-t border-border/40 p-4">
        <div className="mb-3 truncate text-xs font-medium text-muted-foreground/90 px-3 group-data-[collapsible=icon]:hidden">
          Logged in as: <span className="text-foreground font-semibold">{user?.name}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2.5 px-3 py-2 h-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors duration-200"
          onClick={() => void handleLogout()}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden font-medium text-sm">Logout</span>
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};
