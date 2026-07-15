import { StudentEventsProvider } from "@/components/student/StudentEventsContext";
import { useLocation } from "react-router-dom";
import { StudentDashboardView } from "@/components/student/views/StudentDashboardView";
import { StudentEventsView } from "@/components/student/views/StudentEventsView";
import { StudentRegistrationsView } from "@/components/student/views/StudentRegistrationsView";
import { StudentNotificationsView } from "@/components/student/views/StudentNotificationsView";
import { StudentProfileView } from "@/components/student/views/StudentProfileView";
import { StudentSettingsView } from "@/components/student/views/StudentSettingsView";

const StudentDashboardPage = () => {
  const location = useLocation();
  const segment = location.pathname.replace("/student-dashboard", "").replace(/^\//, "") || "";

  const renderView = () => {
    if (segment === "events") return <StudentEventsView />;
    if (segment === "registrations") return <StudentRegistrationsView />;
    if (segment === "notifications") return <StudentNotificationsView />;
    if (segment === "profile") return <StudentProfileView />;
    if (segment === "settings") return <StudentSettingsView />;
    return <StudentDashboardView />;
  };

  return (
    <StudentEventsProvider>
      {renderView()}
    </StudentEventsProvider>
  );
};

export default StudentDashboardPage;
