import { useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { StatCard } from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { fetchCourses, fetchStudents, fetchAttendanceRates, fetchMyStudentRow, fetchStudentEnrollments, NotificationRow, AttendanceRecord } from "@/lib/queries";
import { QrCode, Users, BookOpen, TrendingUp, Sparkles, AlertTriangle, CheckCircle2, Clock, Calendar, ChevronRight, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
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

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const { data: courses = [] } = useQuery({ queryKey: ["courses"], queryFn: fetchCourses, enabled: !!user });
  const { data: myStudent } = useQuery({
    queryKey: ["my-student", user?.matric_no],
    queryFn: () => fetchMyStudentRow(user?.matric_no),
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

  const overall = useMemo(() => {
    const vals = Object.values(rates);
    if (vals.length === 0) return 0;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [rates]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const recentRows = studentRecs;

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in duration-700 space-y-10 pb-20">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-[2rem] gradient-primary shadow-glow animate-float">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="font-display text-4xl font-black tracking-tighter text-foreground">{greeting}, {user?.name?.split(" ")[0]}</h1>
            <p className="text-sm text-muted-foreground font-medium">Your academic overview for today.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild className="h-12 rounded-2xl bg-black text-white font-bold px-6 shadow-soft hover:bg-neutral-800">
             <Link to="/attendance">
                <QrCode className="mr-2 h-4 w-4" /> Mark Attendance
             </Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Enrolled Courses" value={myEnrollments.length} icon={<BookOpen className="h-5 w-5" />} description="Active Semester" variant="primary" />
        <StatCard label="Overall Attendance" value={`${overall}%`} icon={<TrendingUp className="h-5 w-5" />} description="Average Rate" variant="success" />
        <StatCard label="Late Marks" value={studentRecs.filter(r => r.status === "late").length} icon={<Clock className="h-5 w-5" />} description="Last 30 days" variant="accent" />
        <StatCard label="Alerts" value={notifs.filter(n => n.type === "alert").length} icon={<AlertTriangle className="h-5 w-5" />} description="Attention needed" variant="danger" />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
         <Card className="lg:col-span-2 rounded-[2.5rem] border-border/40 bg-card/60 backdrop-blur-xl shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between">
               <div>
                  <CardTitle className="font-display text-xl font-black">Attendance History</CardTitle>
                  <CardDescription>Your recent classroom activity</CardDescription>
               </div>
               <Button variant="ghost" size="sm" asChild className="rounded-xl font-bold">
                  <Link to="/calendar">View Full Calendar <ChevronRight className="ml-1 h-4 w-4" /></Link>
               </Button>
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                  {recentRows.length === 0 ? (
                    <div className="py-10 text-center opacity-50">No recent activity found.</div>
                  ) : recentRows.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/10">
                       <div className="flex items-center gap-4">
                          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", r.status === "present" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500")}>
                             {r.status === "present" ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                          </div>
                          <div>
                             <p className="text-sm font-bold">{r.courses?.code} · {r.courses?.title}</p>
                             <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.marked_at), { addSuffix: true })}</p>
                          </div>
                       </div>
                       <Badge variant="outline" className="rounded-full font-bold uppercase text-[9px] tracking-widest">{r.status}</Badge>
                    </div>
                  ))}
               </div>
            </CardContent>
         </Card>

         <div className="space-y-8">
            <Card className="rounded-[2.5rem] border-border/40 bg-card/60 backdrop-blur-xl shadow-soft">
               <CardHeader>
                  <CardTitle className="font-display text-lg font-black">Notifications</CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                  {notifs.map((n) => (
                    <div key={n.id} className="flex gap-3">
                       <div className={cn("mt-1 h-2 w-2 rounded-full shrink-0", n.type === "alert" ? "bg-destructive" : "bg-primary")} />
                       <div>
                          <p className="text-xs font-bold leading-tight">{n.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                       </div>
                    </div>
                  ))}
                  {notifs.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">No notifications</p>}
               </CardContent>
            </Card>

            <div className="rounded-[2.5rem] gradient-primary p-8 text-white shadow-glow relative overflow-hidden group">
               <div className="relative z-10">
                  <h3 className="font-display text-2xl font-black leading-tight tracking-tighter">Classmate AI<br/>is here.</h3>
                  <p className="mt-2 text-xs font-medium opacity-80">Get help with your courses and attendance analytics.</p>
                  <Button asChild size="sm" className="mt-6 bg-white text-primary hover:bg-white/90 rounded-xl font-bold shadow-soft">
                     <Link to="/ai-assistant">Ask Assistant <Sparkles className="ml-2 h-3 w-3" /></Link>
                  </Button>
               </div>
               <Sparkles className="absolute -bottom-10 -right-10 h-40 w-40 opacity-10 group-hover:scale-110 transition-transform duration-700" />
            </div>
         </div>
      </div>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
