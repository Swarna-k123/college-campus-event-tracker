import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import NotFound from "./pages/NotFound.tsx";
import Landing from "./pages/Landing.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import { AuthProvider, getDashboardPathForRole, useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/routing/ProtectedRoute";
import { PublicOnlyRoute } from "@/components/routing/PublicOnlyRoute";
import StudentDashboardPage from "@/pages/StudentDashboardPage";
import ManagerDashboardPage from "@/pages/ManagerDashboardPage";
import AdminDashboardPage from "@/pages/AdminDashboardPage";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ManagerDashboardView } from "@/components/manager/views/ManagerDashboardView";
import { ManagerClubEventsView } from "@/components/manager/views/ManagerClubEventsView";
import { ManagerMyEventsView } from "@/components/manager/views/ManagerMyEventsView";
import { ManagerCreateEventView } from "@/components/manager/views/ManagerCreateEventView";
import { ManagerRegistrationsView } from "@/components/manager/views/ManagerRegistrationsView";
import { ManagerMembersView } from "@/components/manager/views/ManagerMembersView";
import { ManagerAttendanceView } from "@/components/manager/views/ManagerAttendanceView";
import {
  ManagerAnalyticsView,
  ManagerActivityView,
  ManagerSettingsView,
} from "@/components/manager/views/ManagerPlaceholders";

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
  if (!isAuthenticated || !user) return <Landing />;
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
                <Route
                  path="/student-dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["student"]}>
                      <StudentLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<StudentDashboardPage />} />
                  <Route path="events" element={<StudentDashboardPage />} />
                  <Route path="registrations" element={<StudentDashboardPage />} />
                  <Route path="notifications" element={<StudentDashboardPage />} />
                  <Route path="profile" element={<StudentDashboardPage />} />
                  <Route path="settings" element={<StudentDashboardPage />} />
                </Route>

                <Route
                  path="/admin-dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AdminDashboardPage />} />
                  <Route path="pending" element={<AdminDashboardPage />} />
                  <Route path="events" element={<AdminDashboardPage />} />
                  <Route path="clubs" element={<AdminDashboardPage />} />
                  <Route path="venue-conflicts" element={<AdminDashboardPage />} />
                  <Route path="analytics" element={<AdminDashboardPage />} />
                  <Route path="activity" element={<AdminDashboardPage />} />
                  <Route path="settings" element={<AdminDashboardPage />} />
                </Route>

                {/* Club Manager uses its own sidebar layout and sub-views */}
                <Route
                  path="/manager-dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["manager"]}>
                      <ManagerDashboardPage />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<ManagerDashboardView />} />
                  <Route path="club-events" element={<ManagerClubEventsView />} />
                  <Route path="my-events" element={<ManagerMyEventsView />} />
                  <Route path="create" element={<ManagerCreateEventView />} />
                  <Route path="members" element={<ManagerMembersView />} />
                  <Route path="registrations" element={<ManagerRegistrationsView />} />
                  <Route path="attendance" element={<ManagerAttendanceView />} />
                  <Route path="analytics" element={<ManagerAnalyticsView />} />
                  <Route path="activity" element={<ManagerActivityView />} />
                  <Route path="settings" element={<ManagerSettingsView />} />
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
