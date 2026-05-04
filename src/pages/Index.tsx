import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { StudentDashboard } from "@/components/dashboards/StudentDashboard";
import { ManagerDashboard } from "@/components/dashboards/ManagerDashboard";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";
import type { Role } from "@/lib/roles";

const Index = () => {
  const [role, setRole] = useState<Role>("student");

  return (
    <div className="min-h-screen">
      <Navbar role={role} onRoleChange={setRole} />
      <main className="container py-8 md:py-12">
        {role === "student" && <StudentDashboard />}
        {role === "manager" && <ManagerDashboard />}
        {role === "admin" && <AdminDashboard />}
      </main>
    </div>
  );
};

export default Index;
