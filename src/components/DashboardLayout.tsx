import { Outlet } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";

export const DashboardLayout = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <Navbar role={user.role} name={user.name} />
      <main className="container py-8 md:py-12">
        <Outlet />
      </main>
    </div>
  );
};
