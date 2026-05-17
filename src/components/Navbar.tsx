import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { GraduationCap, LogOut, Menu, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/roles";
import { useAuth } from "@/context/AuthContext";

const linksByRole: Record<Role, { label: string; to: string }[]> = {
  student: [{ label: "Student Dashboard", to: "/student-dashboard" }],
  manager: [{ label: "Manager Dashboard", to: "/manager-dashboard" }],
  admin: [{ label: "Admin Dashboard", to: "/admin-dashboard" }],
};

interface NavbarProps {
  role: Role;
  name: string;
}

export const Navbar = ({ role, name }: NavbarProps) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();
  const links = linksByRole[role];
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/40 border-b border-border/30 shadow-soft">
      <div className="container flex h-16 items-center justify-between gap-4">
        <NavLink to="/" className="flex items-center gap-2.5 font-black text-lg tracking-tight">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-primary shadow-glow">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="hidden sm:inline bg-gradient-to-r from-foreground to-primary/80 bg-clip-text text-transparent">CampusHub</span>
        </NavLink>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.label}
              to={l.to}
              className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-200 hover:shadow-md"
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/40 border border-border/40">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">{name}</span>
          </div>
          <Button variant="ghost" size="sm" className="gap-2 hover:bg-destructive/10 hover:text-destructive" onClick={handleLogout}>
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
        <div className="md:hidden border-t border-border/40 bg-background/60 backdrop-blur-xl animate-slideInDown">
          <div className="container py-4 flex flex-col gap-3">
            {links.map((l) => (
              <NavLink
                key={l.label}
                to={l.to}
                onClick={() => setOpen(false)}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                {l.label}
              </NavLink>
            ))}
            <div className="flex items-center justify-between border-t border-border/40 pt-3 mt-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/40">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">{name}</span>
              </div>
              <Button variant="ghost" size="sm" className="gap-2 hover:bg-destructive/10 hover:text-destructive" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};