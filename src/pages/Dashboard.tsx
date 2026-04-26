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
    <div className="space-y-6 pb-20" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Hero Welcome */}
      <div style={{ background: "#fff", border: "1px solid #e4e4e4", borderRadius: 20, padding: "32px 36px", display: "flex", flexDirection: "column", gap: 20 }} className="lg:flex-row lg:items-center lg:justify-between" >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: "'Space Grotesk', system-ui", fontSize: "clamp(1.6rem,3vw,2.2rem)", fontWeight: 800, letterSpacing: "-0.5px", color: "#0a0a0a" }}>
              {greeting},{" "}
              <span style={{ color: "#00c8a8" }}>{user.name.split(" ")[0]}</span>!
            </h1>
            <p style={{ margin: "8px 0 0", fontSize: 14, color: "#6b6b6b", maxWidth: 520, lineHeight: 1.65 }}>
              {user.role === "student" && `You're registered for ${myEnrollments.length} courses this semester. Keep showing up to stay eligible!`}
              {user.role === "lecturer" && `You have ${lecturerCourses.length} active courses today. Start a verification session to begin.`}
              {user.role === "admin" && `Campus-wide attendance is currently at ${overall}% across all departments.`}
            </p>
          </div>
          <Button asChild size="lg" style={{ background: "#0a0a0a", color: "#fff", borderRadius: 12, padding: "0 28px", height: 48, fontSize: 14, fontWeight: 700, border: "none" }}>
            <Link to="/attendance">
              <QrCode className="mr-2 h-4 w-4" />
              {user.role === "lecturer" ? "Run Session" : "Mark Attendance"}
            </Link>
          </Button>
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
      <div className="grid gap-6 lg:grid-cols-3">
        <div style={{ background: "#fff", border: "1px solid #e4e4e4", borderRadius: 20, padding: "28px 28px" }} className="lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0a0a0a" }}>Personal Engagement</h3>
              <p style={{ margin: "3px 0 0", fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.1em" }}>Activity over 5 days</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#e6faf6", borderRadius: 999, padding: "4px 12px", fontSize: 10, fontWeight: 700, color: "#00c8a8", textTransform: "uppercase" }}>
              <Calendar className="h-3 w-3" /> Real-time
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={weeklyTrend}>
              <defs>
                <linearGradient id="tealGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00c8a8" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#00c8a8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="#ccc" fontSize={11} fontWeight={600} tick={{ fill: "#999" }} axisLine={false} tickLine={false} />
              <YAxis stroke="#ccc" fontSize={11} fontWeight={600} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e4e4e4", borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }} itemStyle={{ color: "#00c8a8", fontWeight: "bold" }} />
              <Area type="monotone" dataKey="rate" stroke="#00c8a8" strokeWidth={3} fill="url(#tealGradient)" animationDuration={1500} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "#fff", border: "1px solid #e4e4e4", borderRadius: 20, padding: "28px 28px" }}>
          <div className="mb-6">
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0a0a0a" }}>Monthly Tally</h3>
            <p style={{ margin: "3px 0 0", fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.1em" }}>Four-week progression</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyTrend}>
              <XAxis dataKey="week" stroke="#ccc" fontSize={11} fontWeight={600} axisLine={false} tickLine={false} tick={{ fill: "#999" }} />
              <YAxis hide />
              <Tooltip cursor={{ fill: "rgba(0,200,168,0.05)" }} contentStyle={{ borderRadius: 12, border: "1px solid #e4e4e4", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }} />
              <Bar dataKey="attendance" fill="#0a0a0a" radius={[8, 8, 0, 0]} animationDuration={2000} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity & Insight Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div style={{ background: "#fff", border: "1px solid #e4e4e4", borderRadius: 20, padding: "28px" }} className="lg:col-span-2">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0a0a0a" }}>Recent Activity</h3>
            <Link to="/attendance" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#00c8a8", textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              History <ChevronRight size={13} />
            </Link>
          </div>
          {recentRows.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", opacity: 0.35 }}>
              <History size={36} style={{ marginBottom: 8, color: "#999" }} />
              <p style={{ margin: 0, fontSize: 13, color: "#999", fontStyle: "italic" }}>No recent activity detected.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recentRows.map((a: any) => {
                const isPresent = a.status === "present" || a.status === "late";
                return (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, background: "#f8f8f4", borderRadius: 14, padding: "12px 16px", border: "1px solid #e4e4e4" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "#e6faf6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <BookOpen size={18} color="#00c8a8" />
                    </div>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0a0a0a" }}>{a.courses?.code ?? "CORE-101"}</p>
                        <Badge variant="outline" style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "#999", borderColor: "#e4e4e4" }}>{a.method?.toUpperCase() || "SCAN"}</Badge>
                      </div>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "#999" }}>{a.students?.name || a.courses?.title || "Class Session"}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: isPresent ? "#00875a" : "#dc2626" }}>{a.status}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 10, color: "#bbb" }}>{formatDistanceToNow(new Date(a.marked_at), { addSuffix: true })}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ background: "#0a0a0a", borderRadius: 20, padding: "28px", display: "flex", flexDirection: "column" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(0,200,168,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={22} color="#00c8a8" />
          </div>
          <h3 style={{ margin: "24px 0 0", fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px", fontFamily: "'Space Grotesk', system-ui" }}>AI Intelligence</h3>
          <p style={{ margin: "12px 0 0", fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.65, flex: 1 }}>
            "Your attendance has increased by 12% this week. Keep showing up to your registered classes to secure eligibility!"
          </p>
          <Button asChild style={{ marginTop: 28, background: "#00c8a8", color: "#fff", borderRadius: 10, height: 44, fontSize: 14, fontWeight: 700, border: "none", width: "100%" }}>
            <Link to="/ai-assistant">Consult Assistant</Link>
          </Button>
        </div>
      </div>

      {/* Notifications Grid */}
      <div style={{ background: "#fff", border: "1px solid #e4e4e4", borderRadius: 20, padding: "28px" }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "#0a0a0a" }}>Recent Broadcasts</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {notifs.map((n) => (
            <div key={n.id} style={{ display: "flex", alignItems: "flex-start", gap: 14, background: "#f8f8f4", borderRadius: 14, padding: "14px 16px", border: "1px solid #e4e4e4" }}>
              <div style={{ marginTop: 5, width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: n.type === "success" ? "#00875a" : n.type === "warning" ? "#d97706" : "#00c8a8" }} />
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0a0a0a" }}>{n.title}</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b6b6b", lineHeight: 1.5 }}>{n.message}</p>
                <p style={{ margin: "10px 0 0", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#00c8a8" }}>
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
          {notifs.length === 0 && <p className="col-span-2" style={{ textAlign: "center", padding: "40px 0", fontSize: 13, color: "#999", fontStyle: "italic" }}>Your inbox is clear.</p>}
        </div>
      </div>
    </div>
  );
}
