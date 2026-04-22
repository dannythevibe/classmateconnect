import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { 
  LayoutDashboard, BookOpen, Users, ClipboardCheck, 
  BarChart3, Sparkles, Bell, User as UserIcon, 
  LogOut, Menu, X, ShieldCheck, ChevronRight, GraduationCap, Calendar
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Onboarding from "./Onboarding";


type Role = "student" | "lecturer" | "admin";

interface NavItem {
  to: string;
  label: string;
  icon: any;
  roles: Role[];
}

const navItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["student", "lecturer", "admin"] },
  { to: "/courses", label: "My Courses", icon: BookOpen, roles: ["student", "lecturer", "admin"] },
  { to: "/students", label: "Students", icon: Users, roles: ["lecturer", "admin"] },
  { to: "/attendance", label: "Attendance", icon: ClipboardCheck, roles: ["student", "lecturer"] },
  { to: "/reports", label: "Reports", icon: BarChart3, roles: ["lecturer", "admin"] },
  { to: "/ai-assistant", label: "AI Assistant", icon: Sparkles, roles: ["student", "lecturer", "admin"] },
  { to: "/notifications", label: "Notifications", icon: Bell, roles: ["student", "lecturer", "admin"] },

  { to: "/timetable", label: "Timetable", icon: Calendar, roles: ["student", "lecturer", "admin"] },
  { to: "/profile", label: "Profile", icon: UserIcon, roles: ["student", "lecturer", "admin"] },

  { to: "/admin", label: "Admin Panel", icon: ShieldCheck, roles: ["admin"] },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!user) return <>{children}</>;

  const filteredItems = navItems.filter((i) => i.roles.includes(user.role as Role));

  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-20 items-center px-6">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-glow transition-transform group-hover:scale-105 active:scale-95">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="font-display text-lg font-bold leading-tight tracking-tight text-foreground">Attendly</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Smart Attendance</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1.5 px-4 py-4 overflow-y-auto custom-scrollbar">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.to || (item.to === "/admin" && location.pathname.startsWith("/admin"));
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 transition-colors", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary")} />
              <span className="flex-1 truncate">{item.label}</span>
              {isActive && <ChevronRight className="h-4 w-4 animate-in fade-in slide-in-from-left-2" />}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-border/40 p-4 bg-muted/30 backdrop-blur-md">
        <div className="flex items-center gap-3 px-2 py-3">
          <Avatar className="h-10 w-10 border-2 border-primary/10">
            <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold font-display uppercase">
              {user.name.substring(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-bold text-foreground leading-none">{user.name}</p>
            <p className="truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">{user.role}</p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full hover:bg-destructive/10 hover:text-destructive shrink-0">
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign out</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background font-sans selection:bg-primary/10">
      <Onboarding />
      {/* Mobile Header */}

      <header className="fixed top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border/40 bg-background/80 px-4 backdrop-blur-md lg:hidden">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="font-display font-bold tracking-tight">Attendly</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} className="rounded-full">
          <Menu className="h-6 w-6" />
        </Button>
      </header>

      {/* Desktop Sidebar */}
      <aside
        className="hidden fixed inset-y-0 left-0 z-50 w-72 flex-col border-r border-border/40 bg-card/50 backdrop-blur-xl lg:flex"
      >
        {SidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm transition-opacity" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 border-r border-border/40 bg-card shadow-2xl animate-in slide-in-from-left duration-300">
            {SidebarContent}
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-full">
              <X className="h-5 w-5" />
            </Button>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 pt-16 lg:pt-0 lg:ml-72 min-h-screen flex flex-col">
        <div className="flex-1 mx-auto w-full px-4 py-8 lg:px-10 lg:py-12 animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
