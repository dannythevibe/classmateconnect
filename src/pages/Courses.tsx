import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCourses, fetchEnrollmentCounts, fetchAttendanceRates } from "@/lib/queries";
import { Input } from "@/components/ui/input";
import { Search, Users, Clock, MapPin, TrendingUp, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import NewCourseDialog from "@/components/dialogs/NewCourseDialog";

export default function Courses() {
  const { user } = useAuth();
  const [q, setQ] = useState("");

  const { data: courses = [], isLoading } = useQuery({ queryKey: ["courses"], queryFn: fetchCourses });
  const ids = useMemo(() => courses.map((c) => c.id), [courses]);
  const { data: counts = {} } = useQuery({
    queryKey: ["enrollment-counts", ids],
    queryFn: () => fetchEnrollmentCounts(ids),
    enabled: ids.length > 0,
  });
  const { data: rates = {} } = useQuery({
    queryKey: ["attendance-rates", ids],
    queryFn: () => fetchAttendanceRates(ids),
    enabled: ids.length > 0,
  });

  const filtered = courses.filter(
    (c) => c.code.toLowerCase().includes(q.toLowerCase()) || c.title.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Courses</h1>
          <p className="text-sm text-muted-foreground">Manage classes and schedules</p>
        </div>
        {user?.role !== "student" && <NewCourseDialog />}
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses..." className="pl-9" />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border p-12 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-semibold">No courses yet</p>
          <p className="text-sm text-muted-foreground">{user?.role === "student" ? "Ask a lecturer to add courses." : "Click 'New course' to create your first one."}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div key={c.id} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-bounce hover:-translate-y-1 hover:shadow-elevated">
              <div className={`h-24 bg-gradient-to-br ${c.color} p-4 text-white`}>
                <p className="text-xs font-bold opacity-90">{c.code}</p>
                <h3 className="font-display text-lg font-bold leading-tight">{c.title}</h3>
              </div>
              <div className="space-y-3 p-4">
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> {c.schedule || "—"}</p>
                  <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {c.room || "—"}</p>
                  <p className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> {counts[c.id] ?? 0} students</p>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-1 text-xs">
                    <TrendingUp className="h-3.5 w-3.5 text-success" />
                    <span className="font-semibold">{rates[c.id] ?? 0}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
