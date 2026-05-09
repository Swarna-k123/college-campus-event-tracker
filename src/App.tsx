import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import { AuthProvider, getDashboardPathForRole, useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/routing/ProtectedRoute";
import { PublicOnlyRoute } from "@/components/routing/PublicOnlyRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import StudentDashboardPage from "@/pages/StudentDashboardPage";
import ManagerDashboardPage from "@/pages/ManagerDashboardPage";
import AdminDashboardPage from "@/pages/AdminDashboardPage";

const queryClient = new QueryClient();

const RootRedirect = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  return <Navigate to={getDashboardPathForRole(user.role)} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
            <Routes>
              <Route path="/" element={<RootRedirect />} />

              <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
              </Route>

              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route
                    path="/student-dashboard"
                    element={
                      <ProtectedRoute allowedRoles={["student"]}>
                        <StudentDashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/manager-dashboard"
                    element={
                      <ProtectedRoute allowedRoles={["manager"]}>
                        <ManagerDashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin-dashboard"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminDashboardPage />
                      </ProtectedRoute>
                    }
                  />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
