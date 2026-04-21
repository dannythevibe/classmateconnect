import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { StatCard } from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { fetchCourses, fetchStudents, fetchAttendanceRates, fetchMyStudentRow, fetchStudentEnrollments, NotificationRow, AttendanceRecord } from "@/lib/queries";
import { QrCode, Users, BookOpen, TrendingUp, Sparkles, AlertTriangle, CheckCircle2, Clock, Calendar, ChevronRight, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
  const { data: myEnrollments = [] } = useQuery({
    queryKey: ["my-enrollments", myStudent?.id],
    queryFn: () => fetchStudentEnrollments(myStudent!.id),
    enabled: !!myStudent,
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

  const lecturerCourses = courses.filter((c) => c.lecturer_id === user?.id);

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
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Hero Welcome */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-border/40 bg-card/60 p-8 shadow-elevated backdrop-blur-3xl lg:p-10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-[100px] animate-float" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-accent/10 blur-[100px] animate-float" style={{ animationDelay: "1s" }} />
        
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h1 className="font-display text-4xl font-black tracking-tighter text-foreground sm:text-5xl">
              {greeting}, <span className="text-gradient">{user.name.split(" ")[0]}</span>!
            </h1>
            <p className="max-w-xl text-base text-muted-foreground font-medium leading-relaxed">
              {user.role === "student" && `You're registered for ${myEnrollments.length} courses this semester. Keep showing up to stay eligible!`}
              {user.role === "lecturer" && `You have ${lecturerCourses.length} active courses today. Start a verification session to begin.`}
              {user.role === "admin" && `Campus-wide attendance is currently at ${overall}% across all departments.`}
            </p>
          </div>
          <div className="flex shrink-0 items-center justify-center">
            <Button asChild size="lg" className="h-14 rounded-2xl bg-primary px-8 text-base font-bold text-white shadow-glow transition-all hover:scale-105 active:scale-95">
              <Link to="/attendance">
                <QrCode className="mr-3 h-5 w-5" /> 
                {user.role === "lecturer" ? "Run Session" : "Mark Attendance"}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Dynamic Stats Section */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {user.role === "student" && (
          <>
            <StatCard label="My Rate" value={`${overall}%`} icon={<TrendingUp className="h-5 w-5" />} description="Across All Classes" variant="primary" />
            <StatCard label="My Courses" value={myEnrollments.length} icon={<BookOpen className="h-5 w-5" />} description="Active Enrollment" />
            <StatCard label="Verified" value={studentRecs.length} icon={<CheckCircle2 className="h-5 w-5" />} description="Recent Presence" variant="success" />
            <StatCard label="Alerts" value={notifs.filter((n) => !n.read).length} icon={<AlertTriangle className="h-5 w-5" />} description="Unread Messages" variant="accent" />
          </>
        )}
        {(user.role === "lecturer" || user.role === "admin") && (
          <>
            <StatCard label="Student Base" value={students.length} icon={<Users className="h-5 w-5" />} description="Total Enrolled" variant="primary" />
            <StatCard label="App Usage" value={`${overall}%`} icon={<TrendingUp className="h-5 w-5" />} description="Engagement Rate" variant="success" />
            <StatCard label="Curriculum" value={courses.length} icon={<BookOpen className="h-5 w-5" />} description="Global Courses" />
            <StatCard label="Logs (30d)" value={trendRecs.length} icon={<History className="h-5 w-5" />} description="Total Records" variant="accent" />
          </>
        )}
      </div>

      {/* Analytics Rows */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="rounded-[2.5rem] border border-border/40 bg-card/60 p-8 shadow-elevated backdrop-blur-xl lg:col-span-2">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl font-bold tracking-tight">Personal Engagement</h3>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1">Activity over 5 days</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black text-primary uppercase">
              <Calendar className="h-3 w-3" /> Real-time
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={weeklyTrend}>
              <defs>
                <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} fontWeight={600} tick={{ fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} fontWeight={600} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "16px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                itemStyle={{ color: "hsl(var(--primary))", fontWeight: "bold" }}
              />
              <Area type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={4} fill="url(#primaryGradient)" animationDuration={1500} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-[2.5rem] border border-border/40 bg-card/60 p-8 shadow-elevated backdrop-blur-xl">
          <div className="mb-8">
            <h3 className="font-display text-xl font-bold tracking-tight text-foreground">Monthly Tally</h3>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1">Four-week progression</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyTrend}>
              <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={11} fontWeight={600} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="attendance" fill="hsl(var(--accent))" radius={[10, 10, 0, 0]} animationDuration={2000} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity & Insight Section */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="rounded-[2.5rem] border border-border/40 bg-card/60 p-8 shadow-elevated backdrop-blur-xl lg:col-span-2">
          <div className="mb-8 flex items-center justify-between">
            <h3 className="font-display text-xl font-bold tracking-tight">Recent Activity</h3>
            <Link to="/attendance" className="group flex items-center gap-1 text-xs font-bold text-primary uppercase tracking-widest hover:opacity-80">
              History <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          {recentRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 opacity-40">
              <History className="h-10 w-10 mb-2" />
              <p className="text-sm italic">No recent activity detected.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentRows.map((a: any) => {
                const isPresent = a.status === "present" || a.status === "late";
                return (
                  <div key={a.id} className="group flex items-center gap-4 rounded-3xl border border-border/20 bg-background/40 p-4 transition-all hover:border-primary/30 hover:bg-background/60">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                         <p className="text-sm font-bold truncate text-foreground">{a.courses?.code ?? "CORE-101"}</p>
                         <Badge variant="outline" className="text-[9px] font-black uppercase text-muted-foreground border-border/50">{a.method?.toUpperCase() || "SCAN"}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{a.students?.name || a.courses?.title || "Class Session"}</p>
                    </div>
                    <div className="text-right">
                       <p className={`text-xs font-black uppercase tracking-tighter ${isPresent ? "text-emerald-500" : "text-destructive"}`}>
                         {a.status}
                       </p>
                       <p className="text-[10px] font-bold text-muted-foreground mt-1">
                         {formatDistanceToNow(new Date(a.marked_at), { addSuffix: true })}
                       </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="group relative overflow-hidden rounded-[2.5rem] border border-accent/20 bg-card/60 shadow-elevated backdrop-blur-xl">
           <div className="absolute inset-0 gradient-accent opacity-5 transition-opacity group-hover:opacity-10" />
           <div className="relative p-8">
             <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent transition-transform group-hover:rotate-12 animate-float">
               <Sparkles className="h-8 w-8 shadow-accent-glow" />
             </div>
             <h3 className="mt-8 font-display text-2xl font-black tracking-tight text-foreground">AI Intelligence</h3>
             <p className="mt-4 text-sm font-medium leading-relaxed text-muted-foreground">
               "Your attendance has increased by 12% this week. Keep showing up to your registered classes to secure eligibility!"
             </p>
             <Button asChild size="lg" className="mt-8 w-full rounded-2xl bg-accent text-white shadow-accent-glow hover:scale-105 active:scale-95 transition-all">
               <Link to="/ai-assistant" className="font-bold">Consult Assistant</Link>
             </Button>
           </div>
        </div>
      </div>

      {/* Notifications Grid */}
      <div className="rounded-[2.5rem] border border-border/40 bg-card/60 p-8 shadow-elevated backdrop-blur-xl">
        <h3 className="mb-6 font-display text-xl font-bold tracking-tight">Recent Broadcasts</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {notifs.map((n) => (
            <div key={n.id} className="relative flex items-start gap-4 rounded-3xl border border-border/10 bg-background/20 p-5 transition-all hover:bg-background/40">
              <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full animate-pulse ${n.type === "success" ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : n.type === "warning" ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" : "bg-primary shadow-[0_0_10px_rgba(124,58,237,0.5)]"}`} />
              <div>
                <p className="text-sm font-black text-foreground">{n.title}</p>
                <p className="mt-1 text-xs font-medium text-muted-foreground leading-snug">{n.message}</p>
                <p className="mt-3 text-[9px] font-black uppercase tracking-widest text-primary/60">
                   {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
          {notifs.length === 0 && <p className="col-span-2 text-center py-10 text-sm text-muted-foreground italic">Your inbox is clear.</p>}
        </div>
      </div>
    </div>
  );
}
