import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchCourses, fetchStudents, fetchAttendanceRates } from "@/lib/queries";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, GraduationCap, TrendingUp, ShieldCheck, BarChart3 } from "lucide-react";

async function fetchLecturerCount() {
  const { count, error } = await supabase
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .eq("role", "lecturer");
  if (error) throw error;
  return count ?? 0;
}

async function fetchDeptBreakdown() {
  const { data: studs } = await supabase.from("students").select("department");
  const { data: cs } = await supabase.from("courses").select("department");
  const map: Record<string, { students: number; courses: number }> = {};
  (studs ?? []).forEach((s: any) => {
    const d = s.department || "Unspecified";
    map[d] = map[d] ?? { students: 0, courses: 0 };
    map[d].students += 1;
  });
  (cs ?? []).forEach((c: any) => {
    const d = c.department || "Unspecified";
    map[d] = map[d] ?? { students: 0, courses: 0 };
    map[d].courses += 1;
  });
  return Object.entries(map).map(([dept, v]) => ({ dept, ...v }));
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data: courses = [] } = useQuery({ queryKey: ["courses"], queryFn: fetchCourses, enabled: !!user });
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: fetchStudents, enabled: !!user });
  const { data: lecturers = 0 } = useQuery({ queryKey: ["lecturer-count"], queryFn: fetchLecturerCount, enabled: !!user });
  const { data: depts = [] } = useQuery({ queryKey: ["dept-breakdown"], queryFn: fetchDeptBreakdown, enabled: !!user });

  const ids = useMemo(() => courses.map(c => c.id), [courses]);
  const { data: rates = {} } = useQuery({
    queryKey: ["rates-all", ids],
    queryFn: () => fetchAttendanceRates(ids),
    enabled: ids.length > 0,
  });

  const overall = useMemo(() => {
    const vals = Object.values(rates);
    return vals.length === 0 ? 0 : Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [rates]);

  return (
    <div className="space-y-6 pb-20">
      <div className="rounded-2xl border bg-card p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              Admin Console · <span className="text-primary">{user?.name?.split(" ")[0]}</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Department-wide overview · {overall}% average attendance across {courses.length} courses
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link to="/reports"><BarChart3 className="mr-2 h-4 w-4" /> Reports</Link></Button>
            <Button asChild><Link to="/admin"><ShieldCheck className="mr-2 h-4 w-4" /> Manage Users</Link></Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Lecturers" value={lecturers} icon={<GraduationCap className="h-5 w-5" />} description="Total faculty" variant="primary" />
        <StatCard label="Students" value={students.length} icon={<Users className="h-5 w-5" />} description="Registered" />
        <StatCard label="Courses" value={courses.length} icon={<BookOpen className="h-5 w-5" />} description="In catalog" variant="accent" />
        <StatCard label="Avg Attendance" value={`${overall}%`} icon={<TrendingUp className="h-5 w-5" />} description="All courses" variant="success" />
      </div>

      <div className="rounded-2xl border bg-card p-6">
        <h2 className="mb-4 text-lg font-bold">Department Breakdown</h2>
        {depts.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No departments yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {depts.map(d => (
              <div key={d.dept} className="rounded-xl border bg-muted/30 p-4">
                <p className="font-bold">{d.dept}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Students</p>
                    <p className="text-lg font-bold text-foreground">{d.students}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Courses</p>
                    <p className="text-lg font-bold text-foreground">{d.courses}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
