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
            <NavLink
              key={l.label}
              to={l.to}
              className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full" title={name}>
            <User className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="gap-2" onClick={handleLogout}>
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
            {links.map((l) => (
              <NavLink
                key={l.label}
                to={l.to}
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              >
                {l.label}
              </NavLink>
            ))}
            <div className="flex items-center justify-between border-t border-border/60 pt-3">
              <Button variant="ghost" size="sm" className="gap-2">
                <User className="h-4 w-4" /> {name}
              </Button>
              <Button variant="ghost" size="sm" className="gap-2" onClick={handleLogout}>
                <LogOut className="h-4 w-4" /> Logout
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};