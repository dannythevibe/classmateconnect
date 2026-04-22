import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
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
import NotFound from "./pages/NotFound";

import SyncManager from "./components/SyncManager";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SyncManager />
      <Toaster />
      <Sonner />

      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Admin Routes */}
            <Route path="/admin/*" element={<ProtectedRoute roles={["admin"]}><AppLayout><AdminUsers /></AppLayout></ProtectedRoute>} />
            
            {/* Base Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/courses" element={<ProtectedRoute><AppLayout><Courses /></AppLayout></ProtectedRoute>} />
            <Route path="/students" element={<ProtectedRoute roles={["lecturer", "admin"]}><AppLayout><Students /></AppLayout></ProtectedRoute>} />
            <Route path="/attendance" element={<ProtectedRoute roles={["student", "lecturer"]}><AppLayout><Attendance /></AppLayout></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute roles={["lecturer", "admin"]}><AppLayout><Reports /></AppLayout></ProtectedRoute>} />
            <Route path="/ai-assistant" element={<ProtectedRoute><AppLayout><AIAssistant /></AppLayout></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><AppLayout><Notifications /></AppLayout></ProtectedRoute>} />
            <Route path="/timetable" element={<ProtectedRoute><AppLayout><Timetable /></AppLayout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
