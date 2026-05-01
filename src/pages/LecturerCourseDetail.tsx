import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Users, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function LecturerCourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();

  const { data: course } = useQuery({
    queryKey: ["course-detail", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", courseId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: roster = [] } = useQuery({
    queryKey: ["course-roster", courseId],
    queryFn: async () => {
      const { data: enrolls } = await supabase.from("enrollments").select("student_id, students(id, name, matric_no)").eq("course_id", courseId!);
      const studentIds = (enrolls ?? []).map((e: any) => e.student_id);
      if (studentIds.length === 0) return [];
      const { data: sessRows } = await supabase.from("attendance_sessions").select("started_at").eq("course_id", courseId!);
      const totalDates = new Set((sessRows ?? []).map((s: any) => new Date(s.started_at).toISOString().slice(0, 10)));
      const totalClasses = totalDates.size;

      const { data: recs } = await supabase.from("attendance_records").select("student_id, status, marked_at").eq("course_id", courseId!);
      return (enrolls ?? []).map((e: any) => {
        const my = (recs ?? []).filter((r: any) => r.student_id === e.student_id && (r.status === "present" || r.status === "late" || r.status === "excused"));
        const attendedDates = new Set(my.map((r: any) => new Date(r.marked_at).toISOString().slice(0, 10)));
        const attended = attendedDates.size;
        const pct = totalClasses === 0 ? 0 : Math.round((attended / totalClasses) * 100);
        return { id: e.students.id, name: e.students.name, matric_no: e.students.matric_no, attended, totalClasses, pct };
      }).sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!courseId,
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <Link to="/courses"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" /> Back to courses</Button></Link>

      <header className="rounded-3xl border bg-card p-6 shadow-soft">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{course?.session || ""} {course?.semester ? `· ${course.semester} Sem` : ""}</p>
            <h1 className="font-display text-3xl font-black">{course?.code} — {course?.title}</h1>
            <p className="text-sm text-muted-foreground">{course?.department || ""} · {course?.level ? `${course.level} Level` : ""}</p>
          </div>
        </div>
      </header>

      <div className="rounded-3xl border bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-black flex items-center gap-2"><Users className="h-5 w-5" /> Enrolled students</h2>
          <Badge variant="secondary">{roster.length} students</Badge>
        </div>

        {roster.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground italic">No students enrolled yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground border-b">
              <th className="p-3">Name</th><th className="p-3">Matric</th><th className="p-3 text-right">Attended</th><th className="p-3 text-right">Classes</th><th className="p-3 text-right">%</th>
            </tr></thead>
            <tbody>
              {roster.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-bold">{r.name}</td>
                  <td className="p-3 font-mono text-xs">{r.matric_no}</td>
                  <td className="p-3 text-right">{r.attended}</td>
                  <td className="p-3 text-right">{r.totalClasses}</td>
                  <td className={`p-3 text-right font-bold ${r.pct < 50 ? "text-destructive" : r.pct < 80 ? "text-amber-600" : "text-emerald-600"}`}>{r.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
