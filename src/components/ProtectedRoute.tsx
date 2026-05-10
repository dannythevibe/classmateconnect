import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ShieldAlert } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: ("student" | "lecturer" | "admin")[];
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary animate-pulse">
          Verifying credentials...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    // Admin overrides all role restrictions
    if (user.role === "admin") return <>{children}</>;

    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 p-6 text-center bg-background">
        <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-destructive/10 text-destructive">
          <ShieldAlert size={40} />
        </div>
        <h2 className="text-2xl font-black tracking-tight">Access Denied</h2>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Your account does not have permission to view this page.
        </p>
        <Navigate to="/dashboard" replace />
      </div>
    );
  }

  return <>{children}</>;
}
