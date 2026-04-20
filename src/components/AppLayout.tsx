import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, BookOpen, Users, QrCode, BarChart3, Bell, User as UserIcon,
  LogOut, GraduationCap, Sparkles, Menu, X, ShieldCheck
} from "lucide-react";
import { useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface NavItem { to: string; label: string; icon: any; roles: string[] }

const navItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["student", "lecturer", "admin"] },
  { to: "/courses", label: "Courses", icon: BookOpen, roles: ["student", "lecturer", "admin"] },
  { to: "/students", label: "Students", icon: Users, roles: ["lecturer", "admin"] },
  { to: "/attendance", label: "Attendance", icon: QrCode, roles: ["student", "lecturer"] },
  { to: "/reports", label: "Reports", icon: BarChart3, roles: ["lecturer", "admin"] },
  { to: "/ai-assistant", label: "AI Assistant", icon: Sparkles, roles: ["student", "lecturer", "admin"] },
  { to: "/notifications", label: "Notifications", icon: Bell, roles: ["student", "lecturer", "admin"] },
  { to: "/profile", label: "Profile", icon: UserIcon, roles: ["student", "lecturer", "admin"] },
  { to: "/admin/users", label: "Users", icon: ShieldCheck, roles: ["admin"] },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  if (!user) return <>{children}</>;

  const items = navItems.filter((i) => i.roles.includes(user.role));

  const handleLogout = () => { logout(); navigate("/"); };

  const SidebarBody = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-glow">
          <GraduationCap className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <p className="font-display text-lg font-bold leading-none">Attendly</p>
          <p className="text-xs text-muted-foreground">Smart Attendance</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-smooth",
                active
                  ? "gradient-primary text-primary-foreground shadow-md"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4.5 w-4.5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full gradient-accent text-sm font-bold text-accent-foreground">
            {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground capitalize">{user.role}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen gradient-mesh">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/50 bg-background/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold">Attendly</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setOpen((o) => !o)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" />
          <aside className="absolute left-0 top-0 h-full w-72 bg-sidebar shadow-elevated" onClick={(e) => e.stopPropagation()}>
            {SidebarBody}
          </aside>
        </div>
      )}

      <div className="lg:flex">
        {/* Desktop sidebar */}
        <aside className="hidden h-screen w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:sticky lg:top-0 lg:block">
          {SidebarBody}
        </aside>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
