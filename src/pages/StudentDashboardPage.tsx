import { StudentEventsProvider } from "@/components/student/StudentEventsContext";
import { useLocation } from "react-router-dom";
import { StudentDashboardView } from "@/components/student/views/StudentDashboardView";
import { StudentEventsView } from "@/components/student/views/StudentEventsView";
import { StudentRegistrationsView } from "@/components/student/views/StudentRegistrationsView";
import { StudentProfileView } from "@/components/student/views/StudentProfileView";

const StudentDashboardPage = () => {
  const location = useLocation();
  const segment = location.pathname.replace("/student-dashboard", "").replace(/^\//, "") || "";

  const renderView = () => {
    if (segment === "events") return <StudentEventsView />;
    if (segment === "registrations") return <StudentRegistrationsView />;
    // Profile + merged settings (settings and notifications redirect here)
    if (segment === "profile" || segment === "settings" || segment === "notifications") {
      return <StudentProfileView />;
    }
    return <StudentDashboardView />;
  };

  return (
    <StudentEventsProvider>
      {renderView()}
    </StudentEventsProvider>
  );
};

export default StudentDashboardPage;
