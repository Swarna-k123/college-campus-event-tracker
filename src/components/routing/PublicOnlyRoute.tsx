import { Navigate, Outlet } from "react-router-dom";
import { getDashboardPathForRole, useAuth } from "@/context/AuthContext";

export const PublicOnlyRoute = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <Outlet />;
  }

  if (isAuthenticated && user) {
    return <Navigate to={getDashboardPathForRole(user.role)} replace />;
  }

  return <Outlet />;
};
