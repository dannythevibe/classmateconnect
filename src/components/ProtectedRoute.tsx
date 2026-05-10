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

  // Show spinner while loading (unless crowbar has fired)
  if ((loading || !user) && !crowbarActive) {
    if (!user) {
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
  }

  // No user — always redirect to auth regardless of crowbar state
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If user exists but role is wrong
  if (user && roles && !roles.includes(user.role)) {
    // Admin bypasses ALL role restrictions — they can view every page
    if (user.role === "admin") return <>{children}</>;

    // Lecturer can bypass restrictions only on NON-admin-exclusive pages
    // (e.g. lecturer can view student pages, but NOT admin-only pages)
    const isAdminOnlyPage = roles.every(r => r === "admin");
    if (user.role === "lecturer" && !isAdminOnlyPage) return <>{children}</>;

    // All other cases: redirect to dashboard with access-denied message
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
