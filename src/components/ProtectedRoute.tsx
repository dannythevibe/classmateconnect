import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ShieldAlert } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: ("student" | "lecturer" | "admin")[];
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [crowbarActive, setCrowbarActive] = useState(false);

  // EMERGENCY CROWBAR: If we stay in a loading state for more than 4 seconds,
  // we force the gate open if we have a session.
  useEffect(() => {
    const timer = setTimeout(() => {
      setCrowbarActive(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, [loading]);

  // If we are loading, show a high-end spinner
  if (loading && !crowbarActive) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background gap-4">
        <div className="relative">
           <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
           <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.3em] text-primary animate-pulse">Verifying Credentials...</p>
      </div>
    );
  }

  // If NOT loading and NO user, send to auth
  if (!loading && !user && !crowbarActive) {
    // If they are trying to reach an admin page, send to admin-auth instead of general auth
    const target = location.pathname.startsWith("/admin") ? "/admin-auth" : "/auth";
    return <Navigate to={target} replace />;
  }

  // If user exists but role is wrong
  if (user && roles && !roles.includes(user.role)) {
    // If they are an admin/lecturer but on a student page, let them through (they can view everything)
    if (user.role === "admin" || user.role === "lecturer") {
        return <>{children}</>;
    }
    
    // Otherwise, it's a student trying to access admin
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-6 text-center">
        <div className="h-20 w-20 rounded-[2rem] bg-destructive/10 flex items-center justify-center text-destructive mb-6 shadow-soft">
          <ShieldAlert size={40} />
        </div>
        <h2 className="text-2xl font-black tracking-tight">Access Denied</h2>
        <p className="mt-2 text-muted-foreground max-w-xs font-medium">Your current security clearance level is not authorized to view this sector.</p>
        <Navigate to="/dashboard" replace />
      </div>
    );
  }

  // Final fallback: Let them in
  return <>{children}</>;
}
