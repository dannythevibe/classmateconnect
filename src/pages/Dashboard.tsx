import { useAuth } from "@/contexts/AuthContext";
import { StatCard } from "@/components/StatCard";
import { mockCourses, mockStudents, mockAttendance, weeklyTrend, monthlyTrend, mockNotifications } from "@/lib/mock-data";
import { QrCode, Users, BookOpen, TrendingUp, Sparkles, MapPin, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl gradient-hero p-6 text-primary-foreground shadow-elevated sm:p-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <p className="text-sm opacity-90">{greeting},</p>
          <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{user.name.split(" ")[0]} 👋</h1>
          <p className="mt-2 max-w-md text-sm opacity-90">
            {user.role === "student" && "You have 2 classes today. Stay on top of your attendance."}
            {user.role === "lecturer" && "You have 1 session ready to start. Generate a QR to begin."}
            {user.role === "admin" && "Campus attendance is steady at 87% this week."}
          </p>
          {user.role === "lecturer" && (
            <Button asChild size="lg" className="mt-5 bg-white text-primary hover:bg-white/90">
              <Link to="/attendance"><QrCode className="mr-2 h-4 w-4" /> Start a session</Link>
            </Button>
          )}
          {user.role === "student" && (
            <Button asChild size="lg" className="mt-5 bg-white text-primary hover:bg-white/90">
              <Link to="/attendance"><QrCode className="mr-2 h-4 w-4" /> Mark attendance</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {user.role === "student" && (
          <>
            <StatCard label="Overall attendance" value="87%" hint="Above 75% threshold" icon={<TrendingUp className="h-5 w-5" />} variant="primary" trend="+3% this week" />
            <StatCard label="Classes today" value="2" hint="Next: CSC 401 at 10:00" icon={<Clock className="h-5 w-5" />} />
            <StatCard label="Total present" value="42" hint="of 48 sessions" icon={<CheckCircle2 className="h-5 w-5" />} variant="success" />
            <StatCard label="At risk" value="1" hint="CSC 411 — 65%" icon={<AlertTriangle className="h-5 w-5" />} variant="accent" />
          </>
        )}
        {user.role === "lecturer" && (
          <>
            <StatCard label="My courses" value={mockCourses.filter(c => c.lecturer === user.name).length} icon={<BookOpen className="h-5 w-5" />} variant="primary" />
            <StatCard label="Students" value="116" icon={<Users className="h-5 w-5" />} />
            <StatCard label="Avg attendance" value="83%" trend="+2.1%" icon={<TrendingUp className="h-5 w-5" />} variant="success" />
            <StatCard label="Sessions this week" value="6" icon={<QrCode className="h-5 w-5" />} variant="accent" />
          </>
        )}
        {user.role === "admin" && (
          <>
            <StatCard label="Total students" value="2,184" trend="+48 this term" icon={<Users className="h-5 w-5" />} variant="primary" />
            <StatCard label="Active courses" value="148" icon={<BookOpen className="h-5 w-5" />} />
            <StatCard label="Campus attendance" value="87%" trend="+2.4%" icon={<TrendingUp className="h-5 w-5" />} variant="success" />
            <StatCard label="At-risk students" value="124" icon={<AlertTriangle className="h-5 w-5" />} variant="accent" />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold">Weekly attendance</h3>
              <p className="text-xs text-muted-foreground">Last 5 working days</p>
            </div>
            <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">Healthy</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weeklyTrend}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
              <Area type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#g1)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-4">
            <h3 className="font-display text-lg font-bold">Monthly trend</h3>
            <p className="text-xs text-muted-foreground">Past 4 weeks</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
              <Bar dataKey="attendance" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent attendance */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Recent activity</h3>
            <Link to="/attendance" className="text-xs font-semibold text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {mockAttendance.slice(0, 5).map((a) => {
              const color = a.status === "present" ? "bg-success/10 text-success" : a.status === "late" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive";
              return (
                <div key={a.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary text-primary-foreground">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{a.course}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      {a.method === "gps" && <MapPin className="h-3 w-3" />}
                      {a.method === "qr" && <QrCode className="h-3 w-3" />}
                      {a.location || a.method.toUpperCase()} · {a.date}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${color}`}>{a.status}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI insight */}
        <div className="relative overflow-hidden rounded-2xl gradient-accent p-5 text-accent-foreground shadow-soft">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
          <Sparkles className="h-6 w-6" />
          <h3 className="mt-3 font-display text-lg font-bold">AI Insight</h3>
          <p className="mt-2 text-sm opacity-90">
            {user.role === "student"
              ? "Your CSC 411 attendance dropped 12% this month. Try setting reminders for Wednesday 9am classes."
              : "3 students in CSC 411 are at risk of failing the 75% threshold. Send a reminder?"}
          </p>
          <Button asChild variant="secondary" size="sm" className="mt-4 bg-white/95 text-accent hover:bg-white">
            <Link to="/ai-assistant">Ask the AI <Sparkles className="ml-1 h-3.5 w-3.5" /></Link>
          </Button>
        </div>
      </div>

      {/* Notifications preview */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">Latest notifications</h3>
          <Link to="/notifications" className="text-xs font-semibold text-primary hover:underline">See all</Link>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {mockNotifications.slice(0, 4).map((n) => (
            <div key={n.id} className="flex items-start gap-3 rounded-xl border border-border/60 bg-background p-3">
              <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${n.type === "success" ? "bg-success" : n.type === "warning" ? "bg-warning" : "bg-primary"}`} />
              <div>
                <p className="text-sm font-semibold">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.message}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{n.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
