import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchCourses, fetchMyStudentRow, fetchStudentEnrollments, AttendanceRecord } from "@/lib/queries";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckCircle2, XCircle, TrendingUp, QrCode, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

async function fetchMyRecords(studentId: string) {
  const { data, error } = await supabase
    .from("attendance_records")
    .select("*, courses(code, title)")
    .eq("student_id", studentId)
    .order("marked_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as (AttendanceRecord & { courses: { code: string; title: string } | null })[];
}

export default function StudentDashboard() {
  const { user } = useAuth();

  const { data: myStudent } = useQuery({
    queryKey: ["my-student", user?.matric_no],
    queryFn: () => fetchMyStudentRow(user?.matric_no),
    enabled: !!user?.matric_no,
  });

  const { data: enrollIds = [] } = useQuery({
    queryKey: ["my-enrollments", myStudent?.id],
    queryFn: () => fetchStudentEnrollments(myStudent!.id),
    enabled: !!myStudent,
  });

  const { data: allCourses = [] } = useQuery({ queryKey: ["courses"], queryFn: fetchCourses, enabled: !!user });
  const myCourses = useMemo(() => allCourses.filter(c => enrollIds.includes(c.id)), [allCourses, enrollIds]);

  const { data: records = [] } = useQuery({
    queryKey: ["my-records", myStudent?.id],
    queryFn: () => fetchMyRecords(myStudent!.id),
    enabled: !!myStudent,
  });

  const presentCount = records.filter(r => r.status === "present" || r.status === "late").length;
  const absentCount = records.filter(r => r.status === "absent").length;
  const total = records.length;
  const pct = total === 0 ? 0 : Math.round((presentCount / total) * 100);

  const perCourse = useMemo(() => {
    return myCourses.map(c => {
      const recs = records.filter(r => r.course_id === c.id);
      const p = recs.filter(r => r.status === "present" || r.status === "late").length;
      const a = recs.filter(r => r.status === "absent").length;
      const t = recs.length;
      return { course: c, present: p, absent: a, total: t, pct: t === 0 ? 0 : Math.round((p / t) * 100) };
    });
  }, [myCourses, records]);

  return (
    <div className="space-y-6 pb-20">
      <div className="rounded-2xl border bg-card p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              Welcome, <span className="text-primary">{user?.name?.split(" ")[0]}</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Matric No: <span className="font-bold text-foreground">{user?.matric_no || "—"}</span> · {user?.department} · {user?.level} Level
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/attendance"><QrCode className="mr-2 h-4 w-4" /> Mark Attendance</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="My Courses" value={myCourses.length} icon={<BookOpen className="h-5 w-5" />} description="Enrolled" />
        <StatCard label="Present" value={presentCount} icon={<CheckCircle2 className="h-5 w-5" />} description="Classes attended" variant="success" />
        <StatCard label="Absent" value={absentCount} icon={<XCircle className="h-5 w-5" />} description="Classes missed" variant="accent" />
        <StatCard label="Attendance" value={`${pct}%`} icon={<TrendingUp className="h-5 w-5" />} description="Overall rate" variant="primary" />
      </div>

      <div className="rounded-2xl border bg-card p-6">
        <h2 className="mb-4 text-lg font-bold">Per-Course Attendance</h2>
        {perCourse.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">You haven't enrolled in any courses yet.</p>
        ) : (
          <div className="space-y-3">
            {perCourse.map(({ course, present, absent, total, pct }) => (
              <Link key={course.id} to="/attendance" className="flex items-center justify-between rounded-xl border bg-muted/30 p-4 transition hover:bg-muted">
                <div>
                  <p className="font-bold">{course.code} <span className="ml-2 text-xs font-normal text-muted-foreground">{course.title}</span></p>
                  <p className="mt-1 text-xs text-muted-foreground">{present} present · {absent} absent · {total} total</p>
                </div>
                <Badge variant={pct >= 75 ? "default" : pct >= 50 ? "secondary" : "destructive"}>
                  {pct}%
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Recent Attendance</h2>
          <Link to="/calendar" className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary">
            <Calendar className="h-3 w-3" /> Calendar
          </Link>
        </div>
        {records.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No attendance records yet.</p>
        ) : (
          <div className="space-y-2">
            {records.slice(0, 8).map(r => {
              const ok = r.status === "present" || r.status === "late";
              return (
                <div key={r.id} className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
                  <div>
                    <p className="text-sm font-bold">{r.courses?.code ?? "Course"}</p>
                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.marked_at), { addSuffix: true })}</p>
                  </div>
                  <Badge variant={ok ? "default" : "destructive"} className="uppercase">{r.status}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
