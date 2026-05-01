import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fetchCourses, fetchMyStudentRow } from "@/lib/queries";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AttendanceCalendar() {
  const { user } = useAuth();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [courseId, setCourseId] = useState<string>("all");

  const { data: courses = [] } = useQuery({ queryKey: ["courses"], queryFn: fetchCourses });
  const myCourses = useMemo(() => {
    if (!user) return [];
    if (user.role === "lecturer") return courses.filter((c) => c.lecturer_id === user.id);
    return courses;
  }, [courses, user]);

  const { data: student } = useQuery({
    queryKey: ["my-student", user?.matricNo],
    queryFn: () => fetchMyStudentRow(user?.matricNo),
    enabled: !!user && user.role === "student",
  });

  const dateStr = date ? date.toISOString().slice(0, 10) : "";

  const { data: records = [] } = useQuery({
    queryKey: ["calendar-records", dateStr, courseId, user?.id, student?.id],
    queryFn: async () => {
      if (!date) return [];
      const start = new Date(date); start.setHours(0, 0, 0, 0);
      const end = new Date(date); end.setHours(23, 59, 59, 999);
      let q = supabase.from("attendance_records")
        .select("id, status, marked_at, student_id, course_id, students(name, matric_no)")
        .gte("marked_at", start.toISOString())
        .lte("marked_at", end.toISOString());
      if (courseId !== "all") q = q.eq("course_id", courseId);
      if (user?.role === "student" && student?.id) q = q.eq("student_id", student.id);
      if (user?.role === "lecturer") {
        const ids = myCourses.map((c) => c.id);
        if (ids.length) q = q.in("course_id", ids);
      }
      const { data, error } = await q.order("marked_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!date,
  });

  const codeMap = new Map(courses.map((c) => [c.id, c.code]));

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <header className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-glow">
          <CalendarDays className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-black tracking-tighter">Attendance Calendar</h1>
          <p className="text-sm text-muted-foreground">Browse past attendance by date and course.</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <div className="rounded-3xl border bg-card p-4 shadow-soft">
          <Calendar mode="single" selected={date} onSelect={setDate} />
        </div>

        <div className="rounded-3xl border bg-card p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Showing</p>
              <p className="font-display text-xl font-black">{date?.toDateString() || "—"}</p>
            </div>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All courses</SelectItem>
                {myCourses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {records.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground italic">No attendance recorded for this day.</div>
          ) : (
            <div className="divide-y">
              {records.map((r: any) => (
                <div key={r.id} className="flex items-center gap-3 py-3">
                  {r.status === "present" || r.status === "excused" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> :
                    r.status === "late" ? <Clock className="h-4 w-4 text-amber-600" /> :
                    <XCircle className="h-4 w-4 text-destructive" />}
                  <div className="flex-1">
                    <p className="font-bold text-sm">{r.students?.name || "—"} <span className="text-muted-foreground font-normal text-xs">({r.students?.matric_no})</span></p>
                    <p className="text-xs text-muted-foreground">{codeMap.get(r.course_id) || "—"} · {new Date(r.marked_at).toLocaleTimeString()}</p>
                  </div>
                  <Badge variant="outline" className="capitalize">{r.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
