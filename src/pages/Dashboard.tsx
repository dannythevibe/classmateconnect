import { useAuth } from "@/contexts/AuthContext";
import StudentDashboard from "./dashboards/StudentDashboard";
import LecturerDashboard from "./dashboards/LecturerDashboard";
import AdminDashboard from "./dashboards/AdminDashboard";

export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "admin") return <AdminDashboard />;
  if (user.role === "lecturer") return <LecturerDashboard />;
  return <StudentDashboard />;
}
