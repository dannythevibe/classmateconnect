import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchCourses, fetchAttendanceRates } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText, BarChart3, GraduationCap } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { exportToCSV } from "@/lib/export";
import { useAuth } from "@/contexts/AuthContext";

export default function Reports() {
  const { user } = useAuth();
  const { data: allCourses = [] } = useQuery({ queryKey: ["courses"], queryFn: fetchCourses });
  
  const myCourses = useMemo(() => {
    if (!user) return [];
    if (user.role === "admin") return allCourses;
    return allCourses.filter(c => c.lecturer_id === user.id);
  }, [allCourses, user]);

  const ids = useMemo(() => myCourses.map((c) => c.id), [myCourses]);

  const { data: rates = {} } = useQuery({
    queryKey: ["attendance-rates", ids],
    queryFn: () => fetchAttendanceRates(ids),
    enabled: ids.length > 0,
  });

  const { data: records = [] } = useQuery({ 
    queryKey: ["trend-records", ids], 
    queryFn: async () => {
        if (ids.length === 0) return [];
        const since = new Date();
        since.setDate(since.getDate() - 35);
        const { data, error } = await supabase
            .from("attendance_records")
            .select("status, marked_at, course_id")
            .in("course_id", ids)
            .gte("marked_at", since.toISOString());
        if (error) throw error;
        return data ?? [];
    },
    enabled: ids.length > 0
  });

  // Weekly: last 5 days
  const weeklyTrend = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const last5: { day: string; rate: number }[] = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      const dayRecs = records.filter((r) => new Date(r.marked_at).toDateString() === key);
      const present = dayRecs.filter((r) => r.status === "present" || r.status === "late" || r.status === "excused").length;
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
      const present = recs.filter((r) => r.status === "present" || r.status === "late" || r.status === "excused").length;
      const attendance = recs.length === 0 ? 0 : Math.round((present / recs.length) * 100);
      weeks.push({ week: `W${4 - w}`, attendance });
    }
    return weeks;
  }, [records]);

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in duration-700 space-y-10 pb-20">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-[2rem] gradient-primary shadow-glow animate-float">
            <BarChart3 className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="font-display text-4xl font-black tracking-tighter text-foreground">Reports & Analytics</h1>
            <p className="text-sm text-muted-foreground font-medium">Track performance trends across your assigned courses.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="h-12 rounded-2xl border-border/40 font-bold px-6 shadow-soft hover:bg-muted" onClick={() => {
            if (records.length === 0) { toast.error("No data to export"); return; }
            exportToCSV(records, "attendance_trends");
            toast.success("Trends exported as CSV");
          }}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel / CSV
          </Button>
          <Button onClick={() => {
            const summary = myCourses.map(c => ({
              code: c.code,
              title: c.title,
              lecturer: c.lecturer_name,
              attendance_rate: `${rates[c.id] ?? 0}%`
            }));
            exportToCSV(summary, "course_attendance_summary");
            toast.success("Summary exported");
          }} className="h-12 rounded-2xl gradient-primary text-white font-bold px-6 shadow-glow">
            <Download className="mr-2 h-4 w-4" /> Export Summary
          </Button>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-[2.5rem] border border-border/40 bg-card/60 p-8 shadow-elevated backdrop-blur-xl">
          <h3 className="font-display text-xl font-black mb-6">Weekly Performance Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip 
                contentStyle={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "16px" }}
              />
              <Line 
                type="monotone" 
                dataKey="rate" 
                stroke="hsl(var(--primary))" 
                strokeWidth={4} 
                dot={{ r: 6, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "#fff" }} 
                activeDot={{ r: 8, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-[2.5rem] border border-border/40 bg-card/60 p-8 shadow-elevated backdrop-blur-xl">
          <h3 className="font-display text-xl font-black mb-6">Monthly Attendance Rate</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip 
                contentStyle={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "16px" }}
              />
              <Bar dataKey="attendance" fill="hsl(var(--primary))" radius={[8, 8, 8, 8]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-[3rem] border border-border/40 bg-card/60 p-10 shadow-elevated backdrop-blur-xl">
        <h3 className="font-display text-2xl font-black mb-8">Academic Catalog Performance</h3>
        {myCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
            <GraduationCap className="h-16 w-16 mb-4" />
            <p className="font-bold">No academic data available for report.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {myCourses.map((c) => {
              const rate = rates[c.id] ?? 0;
              return (
                <div key={c.id} className="group relative rounded-3xl border border-border/40 bg-muted/20 p-6 transition-all hover:bg-muted/40">
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn("h-10 w-10 rounded-xl bg-gradient-to-br shadow-soft", c.color)} />
                    <span className="text-2xl font-black tracking-tighter">{rate}%</span>
                  </div>
                  <p className="font-display text-lg font-black leading-tight truncate">{c.code}</p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{c.title}</p>
                  <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-muted/40">
                    <div className={cn("h-full transition-all duration-1000", c.color)} style={{ width: `${rate}%` }} />
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
