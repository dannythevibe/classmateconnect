import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchCourses, fetchAttendanceRates } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText, BarChart3 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

async function fetchTrendData() {
  // Last 35 days of records, aggregated client-side
  const since = new Date();
  since.setDate(since.getDate() - 35);
  const { data, error } = await supabase
    .from("attendance_records")
    .select("status, marked_at")
    .gte("marked_at", since.toISOString());
  if (error) throw error;
  return data ?? [];
}

export default function Reports() {
  const { data: courses = [] } = useQuery({ queryKey: ["courses"], queryFn: fetchCourses });
  const ids = useMemo(() => courses.map((c) => c.id), [courses]);
  const { data: rates = {} } = useQuery({
    queryKey: ["attendance-rates", ids],
    queryFn: () => fetchAttendanceRates(ids),
    enabled: ids.length > 0,
  });
  const { data: records = [] } = useQuery({ queryKey: ["trend-records"], queryFn: fetchTrendData });

  // Weekly: last 5 days
  const weeklyTrend = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const last5: { day: string; rate: number }[] = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      const dayRecs = records.filter((r) => new Date(r.marked_at).toDateString() === key);
      const present = dayRecs.filter((r) => r.status === "present" || r.status === "late").length;
      const rate = dayRecs.length === 0 ? 0 : Math.round((present / dayRecs.length) * 100);
      last5.push({ day: days[d.getDay()], rate });
    }
    return last5;
  }, [records]);

  const monthlyTrend = useMemo(() => {
    const weeks: { week: string; attendance: number }[] = [];
    for (let w = 3; w >= 0; w--) {
      const start = new Date();
      start.setDate(start.getDate() - (w + 1) * 7);
      const end = new Date();
      end.setDate(end.getDate() - w * 7);
      const recs = records.filter((r) => {
        const d = new Date(r.marked_at);
        return d >= start && d < end;
      });
      const present = recs.filter((r) => r.status === "present" || r.status === "late").length;
      const attendance = recs.length === 0 ? 0 : Math.round((present / recs.length) * 100);
      weeks.push({ week: `W${4 - w}`, attendance });
    }
    return weeks;
  }, [records]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">Track attendance trends across courses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast.info("PDF export coming soon")}>
            <FileText className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" onClick={() => toast.info("Excel export coming soon")}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
          </Button>
          <Button onClick={() => toast.info("Report download coming soon")} className="gradient-primary shadow-glow">
            <Download className="mr-2 h-4 w-4" /> Download
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h3 className="font-display text-lg font-bold">Weekly trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
              <Line type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 5, fill: "hsl(var(--primary))" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h3 className="font-display text-lg font-bold">Monthly attendance</h3>
          <ResponsiveContainer width="100%" height={260}>
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

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h3 className="font-display text-lg font-bold">Per-course summary</h3>
        {courses.length === 0 ? (
          <div className="mt-6 flex flex-col items-center text-center text-sm text-muted-foreground">
            <BarChart3 className="h-8 w-8" />
            <p className="mt-2">No course data yet</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {courses.map((c) => {
              const rate = rates[c.id] ?? 0;
              return (
                <div key={c.id} className="flex items-center gap-4 rounded-xl border border-border/60 p-3">
                  <div className={`h-12 w-12 shrink-0 rounded-lg bg-gradient-to-br ${c.color}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{c.code} — {c.title}</p>
                      <span className="text-sm font-bold">{rate}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full bg-gradient-to-r ${c.color}`} style={{ width: `${rate}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
