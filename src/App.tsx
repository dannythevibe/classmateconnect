import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import AdminAuth from "./pages/AdminAuth";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import Students from "./pages/Students";
import Attendance from "./pages/Attendance";
import Reports from "./pages/Reports";
import AIAssistant from "./pages/AIAssistant";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Timetable from "./pages/Timetable";
import AdminUsers from "./pages/AdminUsers";
import AdminAudit from "./pages/AdminAudit";
import AdminDashboard from "./pages/AdminDashboard";
import LecturerDashboard from "./pages/LecturerDashboard";
import AttendanceCalendar from "./pages/AttendanceCalendar";
import LecturerCourseDetail from "./pages/LecturerCourseDetail";
import NotFound from "./pages/NotFound";
import SyncManager from "./components/SyncManager";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SyncManager />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin/login" element={<AdminAuth />} />

              {/* Admin only */}
              <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AppLayout><AdminDashboard /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/dashboard" element={<ProtectedRoute roles={["admin"]}><AppLayout><AdminDashboard /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute roles={["admin"]}><AppLayout><AdminUsers /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/audit" element={<ProtectedRoute roles={["admin"]}><AppLayout><AdminAudit /></AppLayout></ProtectedRoute>} />

              {/* App — authenticated users */}
              <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
              <Route path="/lecturer" element={<ProtectedRoute roles={["lecturer", "admin"]}><AppLayout><LecturerDashboard /></AppLayout></ProtectedRoute>} />
              <Route path="/courses" element={<ProtectedRoute><AppLayout><Courses /></AppLayout></ProtectedRoute>} />
              <Route path="/courses/:courseId" element={<ProtectedRoute><AppLayout><LecturerCourseDetail /></AppLayout></ProtectedRoute>} />
              <Route path="/students" element={<ProtectedRoute roles={["lecturer", "admin"]}><AppLayout><Students /></AppLayout></ProtectedRoute>} />
              <Route path="/attendance" element={<ProtectedRoute><AppLayout><Attendance /></AppLayout></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute roles={["lecturer", "admin"]}><AppLayout><Reports /></AppLayout></ProtectedRoute>} />
              <Route path="/ai-assistant" element={<ProtectedRoute><AppLayout><AIAssistant /></AppLayout></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><AppLayout><Notifications /></AppLayout></ProtectedRoute>} />
              <Route path="/timetable" element={<ProtectedRoute><AppLayout><Timetable /></AppLayout></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />
              <Route path="/calendar" element={<ProtectedRoute><AppLayout><AttendanceCalendar /></AppLayout></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
