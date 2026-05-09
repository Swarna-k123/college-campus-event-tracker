import { Navigate, Outlet } from "react-router-dom";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { getDashboardPathForRole, useAuth } from "@/context/AuthContext";
import type { Role } from "@/lib/roles";

type ProtectedRouteProps = {
  allowedRoles?: Role[];
  children?: ReactNode;
};

export const ProtectedRoute = ({ allowedRoles, children }: ProtectedRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Loading…</span>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDashboardPathForRole(user.role)} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
