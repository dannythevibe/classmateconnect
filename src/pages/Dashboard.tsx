import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { StatCard } from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { fetchCourses, fetchStudents, fetchAttendanceRates, fetchMyStudentRow, NotificationRow, AttendanceRecord } from "@/lib/queries";
import { QrCode, Users, BookOpen, TrendingUp, Sparkles, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDistanceToNow } from "date-fns";

async function fetchRecentRecordsForUser(studentId: string | null) {
  if (!studentId) return [] as (AttendanceRecord & { courses: { code: string; title: string } | null })[];
  const { data, error } = await supabase
    .from("attendance_records")
    .select("*, courses(code, title)")
    .eq("student_id", studentId)
    .order("marked_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  return (data ?? []) as (AttendanceRecord & { courses: { code: string; title: string } | null })[];
}

async function fetchRecentRecordsForLecturer(lecturerId: string) {
  const { data: cs } = await supabase.from("courses").select("id").eq("lecturer_id", lecturerId);
  const ids = (cs ?? []).map((c: { id: string }) => c.id);
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("attendance_records")
    .select("*, courses(code, title), students(name)")
    .in("course_id", ids)
    .order("marked_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  return data ?? [];
}

async function fetchTrendRecords() {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const { data, error } = await supabase
    .from("attendance_records")
    .select("status, marked_at")
    .gte("marked_at", since.toISOString());
  if (error) throw error;
  return data ?? [];
}

async function fetchLatestNotifications(userId: string): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(4);
  if (error) throw error;
  return (data ?? []) as NotificationRow[];
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: courses = [] } = useQuery({ queryKey: ["courses"], queryFn: fetchCourses, enabled: !!user });
  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: fetchStudents,
    enabled: !!user && user.role !== "student",
  });
  const { data: myStudent } = useQuery({
    queryKey: ["my-student", user?.matricNo],
    queryFn: () => fetchMyStudentRow(user?.matricNo),
    enabled: !!user && user.role === "student",
  });
  const ids = useMemo(() => courses.map((c) => c.id), [courses]);
  const { data: rates = {} } = useQuery({
    queryKey: ["attendance-rates", ids],
    queryFn: () => fetchAttendanceRates(ids),
    enabled: ids.length > 0,
  });
  const { data: trendRecs = [] } = useQuery({ queryKey: ["dash-trend"], queryFn: fetchTrendRecords, enabled: !!user });
  const { data: notifs = [] } = useQuery({
    queryKey: ["notifications-preview", user?.id],
    queryFn: () => fetchLatestNotifications(user!.id),
    enabled: !!user,
  });
  const { data: studentRecs = [] } = useQuery({
    queryKey: ["recent-records-student", myStudent?.id],
    queryFn: () => fetchRecentRecordsForUser(myStudent?.id ?? null),
    enabled: !!user && user.role === "student" && !!myStudent,
  });
  const { data: lecturerRecs = [] } = useQuery({
    queryKey: ["recent-records-lecturer", user?.id],
    queryFn: () => fetchRecentRecordsForLecturer(user!.id),
    enabled: !!user && (user.role === "lecturer" || user.role === "admin"),
  });

  const myCourses = courses.filter((c) => c.lecturer_id === user?.id);

  const overall = useMemo(() => {
    const vals = Object.values(rates);
    if (vals.length === 0) return 0;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [rates]);

  const weeklyTrend = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const out = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      const recs = trendRecs.filter((r) => new Date(r.marked_at).toDateString() === key);
      const present = recs.filter((r) => r.status === "present" || r.status === "late").length;
      out.push({ day: days[d.getDay()], rate: recs.length === 0 ? 0 : Math.round((present / recs.length) * 100) });
    }
    return out;
  }, [trendRecs]);

  const monthlyTrend = useMemo(() => {
    const weeks = [];
    for (let w = 3; w >= 0; w--) {
      const start = new Date();
      start.setDate(start.getDate() - (w + 1) * 7);
      const end = new Date();
      end.setDate(end.getDate() - w * 7);
      const recs = trendRecs.filter((r) => {
        const d = new Date(r.marked_at);
        return d >= start && d < end;
      });
      const present = recs.filter((r) => r.status === "present" || r.status === "late").length;
      weeks.push({ week: `W${4 - w}`, attendance: recs.length === 0 ? 0 : Math.round((present / recs.length) * 100) });
    }
    return weeks;
  }, [trendRecs]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const recentRows = user?.role === "student" ? studentRecs : lecturerRecs;

  if (!user) return null;

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
            {user.role === "student" && `${courses.length} courses available · keep your attendance up.`}
            {user.role === "lecturer" && `You manage ${myCourses.length} course${myCourses.length === 1 ? "" : "s"}. Generate a QR to begin.`}
            {user.role === "admin" && `Campus attendance is at ${overall}% overall.`}
          </p>
          {(user.role === "lecturer" || user.role === "student") && (
            <Button asChild size="lg" className="mt-5 bg-white text-primary hover:bg-white/90">
              <Link to="/attendance">
                <QrCode className="mr-2 h-4 w-4" /> {user.role === "lecturer" ? "Start a session" : "Mark attendance"}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {user.role === "student" && (
          <>
            <StatCard label="Overall attendance" value={`${overall}%`} icon={<TrendingUp className="h-5 w-5" />} variant="primary" />
            <StatCard label="My courses" value={courses.length} icon={<BookOpen className="h-5 w-5" />} />
            <StatCard label="Records" value={studentRecs.length} icon={<CheckCircle2 className="h-5 w-5" />} variant="success" />
            <StatCard label="Notifications" value={notifs.filter((n) => !n.read).length} icon={<AlertTriangle className="h-5 w-5" />} variant="accent" />
          </>
        )}
        {user.role === "lecturer" && (
          <>
            <StatCard label="My courses" value={myCourses.length} icon={<BookOpen className="h-5 w-5" />} variant="primary" />
            <StatCard label="Students" value={students.length} icon={<Users className="h-5 w-5" />} />
            <StatCard label="Avg attendance" value={`${overall}%`} icon={<TrendingUp className="h-5 w-5" />} variant="success" />
            <StatCard label="Records (30d)" value={trendRecs.length} icon={<QrCode className="h-5 w-5" />} variant="accent" />
          </>
        )}
        {user.role === "admin" && (
          <>
            <StatCard label="Total students" value={students.length} icon={<Users className="h-5 w-5" />} variant="primary" />
            <StatCard label="Active courses" value={courses.length} icon={<BookOpen className="h-5 w-5" />} />
            <StatCard label="Campus attendance" value={`${overall}%`} icon={<TrendingUp className="h-5 w-5" />} variant="success" />
            <StatCard label="Records (30d)" value={trendRecs.length} icon={<Clock className="h-5 w-5" />} variant="accent" />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft lg:col-span-2">
          <div className="mb-4">
            <h3 className="font-display text-lg font-bold">Weekly attendance</h3>
            <p className="text-xs text-muted-foreground">Last 5 days</p>
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
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Recent activity</h3>
            <Link to="/attendance" className="text-xs font-semibold text-primary hover:underline">View all</Link>
          </div>
          {recentRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No records yet.</p>
          ) : (
            <div className="space-y-3">
              {recentRows.map((a: any) => {
                const color = a.status === "present" ? "bg-success/10 text-success" : a.status === "late" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive";
                return (
                  <div key={a.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary text-primary-foreground">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{a.courses?.code ?? "—"}{a.students?.name ? ` · ${a.students.name}` : ""}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.method?.toUpperCase()} · {formatDistanceToNow(new Date(a.marked_at), { addSuffix: true })}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${color}`}>{a.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="relative overflow-hidden rounded-2xl gradient-accent p-5 text-accent-foreground shadow-soft">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
          <Sparkles className="h-6 w-6" />
          <h3 className="mt-3 font-display text-lg font-bold">AI Insight</h3>
          <p className="mt-2 text-sm opacity-90">
            Ask the AI assistant for personalized attendance insights and recommendations.
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
        {notifs.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No notifications yet.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {notifs.map((n) => (
              <div key={n.id} className="flex items-start gap-3 rounded-xl border border-border/60 bg-background p-3">
                <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${n.type === "success" ? "bg-success" : n.type === "warning" ? "bg-warning" : "bg-primary"}`} />
                <div>
                  <p className="text-sm font-semibold">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
