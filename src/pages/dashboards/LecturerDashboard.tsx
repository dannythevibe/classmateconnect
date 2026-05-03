import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchCourses, fetchEnrollmentCounts, fetchAttendanceRates } from "@/lib/queries";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, ClipboardCheck, TrendingUp, QrCode, ChevronRight } from "lucide-react";

async function fetchRecordCounts(courseIds: string[]): Promise<Record<string, number>> {
  if (!courseIds.length) return {};
  const { data, error } = await supabase
    .from("attendance_records")
    .select("course_id")
    .in("course_id", courseIds);
  if (error) throw error;
  const out: Record<string, number> = {};
  (data ?? []).forEach((r: any) => { out[r.course_id] = (out[r.course_id] ?? 0) + 1; });
  return out;
}

export default function LecturerDashboard() {
  const { user } = useAuth();
  const { data: allCourses = [] } = useQuery({ queryKey: ["courses"], queryFn: fetchCourses, enabled: !!user });
  const myCourses = useMemo(() => allCourses.filter(c => c.lecturer_id === user?.id), [allCourses, user]);
  const ids = useMemo(() => myCourses.map(c => c.id), [myCourses]);

  const { data: enrollCounts = {} } = useQuery({
    queryKey: ["enroll-counts", ids],
    queryFn: () => fetchEnrollmentCounts(ids),
    enabled: ids.length > 0,
  });
  const { data: rates = {} } = useQuery({
    queryKey: ["rates", ids],
    queryFn: () => fetchAttendanceRates(ids),
    enabled: ids.length > 0,
  });
  const { data: recCounts = {} } = useQuery({
    queryKey: ["rec-counts", ids],
    queryFn: () => fetchRecordCounts(ids),
    enabled: ids.length > 0,
  });

  const totalStudents = Object.values(enrollCounts).reduce((a, b) => a + b, 0);
  const totalRecords = Object.values(recCounts).reduce((a, b) => a + b, 0);
  const avgRate = ids.length === 0 ? 0 : Math.round(Object.values(rates).reduce((a, b) => a + b, 0) / Math.max(ids.length, 1));

  return (
    <div className="space-y-6 pb-20">
      <div className="rounded-2xl border bg-card p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              Welcome, <span className="text-primary">Dr. {user?.name?.split(" ")[0]}</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You have {myCourses.length} active course{myCourses.length === 1 ? "" : "s"} · {totalStudents} students enrolled
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/attendance"><QrCode className="mr-2 h-4 w-4" /> Run Session</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="My Courses" value={myCourses.length} icon={<BookOpen className="h-5 w-5" />} description="Teaching" variant="primary" />
        <StatCard label="Total Students" value={totalStudents} icon={<Users className="h-5 w-5" />} description="Across courses" />
        <StatCard label="Records" value={totalRecords} icon={<ClipboardCheck className="h-5 w-5" />} description="All-time logs" variant="accent" />
        <StatCard label="Avg Attendance" value={`${avgRate}%`} icon={<TrendingUp className="h-5 w-5" />} description="Across courses" variant="success" />
      </div>

      <div className="rounded-2xl border bg-card p-6">
        <h2 className="mb-4 text-lg font-bold">My Courses</h2>
        {myCourses.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">You don't have any courses yet. Create one in <Link to="/courses" className="text-primary underline">My Courses</Link>.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {myCourses.map(c => (
              <Link key={c.id} to={`/courses/${c.id}`} className="group flex items-center justify-between rounded-xl border bg-muted/30 p-4 transition hover:border-primary hover:bg-muted">
                <div>
                  <p className="font-bold">{c.code}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{c.title}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-[10px]">{enrollCounts[c.id] ?? 0} students</Badge>
                    <Badge variant="outline" className="text-[10px]">{recCounts[c.id] ?? 0} records</Badge>
                    <Badge variant={(rates[c.id] ?? 0) >= 75 ? "default" : "secondary"} className="text-[10px]">
                      {rates[c.id] ?? 0}% avg
                    </Badge>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
