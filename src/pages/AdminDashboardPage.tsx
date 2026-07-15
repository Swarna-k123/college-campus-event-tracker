import { useLocation } from "react-router-dom";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";
import { AdminDashboardView } from "@/components/admin/views/AdminDashboardView";
import { AdminPendingApprovalsView } from "@/components/admin/views/AdminPendingApprovalsView";
import { AdminAllEventsView } from "@/components/admin/views/AdminAllEventsView";
import { AdminClubsView } from "@/components/admin/views/AdminClubsView";
import { AdminVenueConflictsView } from "@/components/admin/views/AdminVenueConflictsView";
import { AdminAnalyticsView } from "@/components/admin/views/AdminAnalyticsView";
import { AdminActivityView } from "@/components/admin/views/AdminActivityView";
import { AdminSettingsView } from "@/components/admin/views/AdminSettingsView";

const AdminDashboardPage = () => {
  const location = useLocation();
  const segment = location.pathname.replace("/admin-dashboard", "").replace(/^\//, "") || "";

  if (segment === "pending") return <AdminPendingApprovalsView />;
  if (segment === "events") return <AdminAllEventsView />;
  if (segment === "clubs") return <AdminClubsView />;
  if (segment === "venue-conflicts") return <AdminVenueConflictsView />;
  if (segment === "analytics") return <AdminAnalyticsView />;
  if (segment === "activity") return <AdminActivityView />;
  if (segment === "settings") return <AdminSettingsView />;

  return <AdminDashboardView />;
};

export default AdminDashboardPage;
