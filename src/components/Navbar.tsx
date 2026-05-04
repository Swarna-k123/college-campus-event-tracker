import { useState } from "react";
import { NavLink } from "react-router-dom";
import { GraduationCap, LogOut, Menu, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/roles";

const linksByRole: Record<Role, { label: string; to: string }[]> = {
  student: [
    { label: "Browse Events", to: "/student" },
    { label: "My Registrations", to: "/student?tab=registrations" },
    { label: "Calendar", to: "/student?tab=calendar" },
  ],
  manager: [
    { label: "My Events", to: "/manager" },
    { label: "Create Event", to: "/manager?tab=create" },
    { label: "Attendees", to: "/manager?tab=attendees" },
  ],
  admin: [
    { label: "Overview", to: "/admin" },
    { label: "Clubs", to: "/admin?tab=clubs" },
    { label: "Users", to: "/admin?tab=users" },
    { label: "Reports", to: "/admin?tab=reports" },
  ],
};

const roleLabel: Record<Role, string> = {
  student: "Student",
  manager: "Club Manager",
  admin: "Admin",
};

interface NavbarProps {
  role: Role;
  onRoleChange: (role: Role) => void;
}

export const Navbar = ({ role, onRoleChange }: NavbarProps) => {
  const [open, setOpen] = useState(false);
  const links = linksByRole[role];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/60 border-b border-border/60">
      <div className="container flex h-16 items-center justify-between gap-4">
        <NavLink to="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="hidden sm:inline tracking-tight">CampusHub</span>
        </NavLink>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.to}
              className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full bg-secondary/60 p-1 border border-border/60">
            {(Object.keys(linksByRole) as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => onRoleChange(r)}
                className={cn(
                  "px-3 py-1 text-xs rounded-full transition-all",
                  role === r
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {roleLabel[r]}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="icon" className="rounded-full">
            <User className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="gap-2">
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/60 bg-background/90 backdrop-blur-xl">
          <div className="container py-4 flex flex-col gap-3">
            <div className="flex flex-wrap gap-1 rounded-xl bg-secondary/60 p-1 border border-border/60">
              {(Object.keys(linksByRole) as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => onRoleChange(r)}
                  className={cn(
                    "flex-1 px-3 py-1.5 text-xs rounded-lg transition-all",
                    role === r
                      ? "bg-gradient-primary text-primary-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {roleLabel[r]}
                </button>
              ))}
            </div>
            {links.map((l) => (
              <a
                key={l.label}
                href={l.to}
                className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              >
                {l.label}
              </a>
            ))}
            <div className="flex items-center justify-between border-t border-border/60 pt-3">
              <Button variant="ghost" size="sm" className="gap-2">
                <User className="h-4 w-4" /> Profile
              </Button>
              <Button variant="ghost" size="sm" className="gap-2">
                <LogOut className="h-4 w-4" /> Logout
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};