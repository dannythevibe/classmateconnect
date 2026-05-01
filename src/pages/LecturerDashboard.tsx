import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  BookOpen, Users, CheckCircle2, TrendingUp, Calendar, 
  Search, ChevronRight, QrCode, Clock, Filter, ListChecks,
  ChevronLeft, ArrowRight, GraduationCap
} from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from "date-fns";
import { cn } from "@/lib/utils";

export default function LecturerDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [view, setView] = useState<"overview" | "course-detail" | "calendar">("overview");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");

  // Queries
  const { data: myCourses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ["lecturer-courses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("lecturer_id", user?.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  const { data: reportData = [] } = useQuery({
    queryKey: ["lecturer-student-stats", selectedCourse?.id],
    queryFn: async () => {
      if (!selectedCourse) return [];
      const { data, error } = await supabase
        .from("attendance_summary_report")
        .select("*")
        .eq("course_code", selectedCourse.code);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCourse
  });

  const { data: pastAttendance = [] } = useQuery({
    queryKey: ["lecturer-past-attendance", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_sessions")
        .select("*, courses(code, title)")
        .eq("lecturer_id", user?.id)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  // Calendar logic
  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    });
  }, [currentMonth]);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    pastAttendance.forEach(s => {
      const dateKey = format(new Date(s.started_at), "yyyy-MM-dd");
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(s);
    });
    return map;
  }, [pastAttendance]);

  // Enrollment counts
  const { data: enrollmentCounts = {} } = useQuery({
    queryKey: ["lecturer-enrollment-counts"],
    queryFn: async () => {
      const { data: enrolls } = await supabase.from("enrollments").select("course_id");
      const counts: Record<string, number> = {};
      enrolls?.forEach(e => counts[e.course_id] = (counts[e.course_id] || 0) + 1);
      return counts;
    }
  });

  const filteredReportData = useMemo(() => {
    if (!searchQuery) return reportData;
    return reportData.filter(s => 
      s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.matric_no.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [reportData, searchQuery]);

  // Handlers
  const openCourse = (course: any) => {
    setSelectedCourse(course);
    setView("course-detail");
  };

  const backToOverview = () => {
    setSelectedCourse(null);
    setView("overview");
  };

  const changeMonth = (offset: number) => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + offset);
    setCurrentMonth(next);
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in duration-700 space-y-10 pb-20">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-[2rem] gradient-primary shadow-glow animate-float">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="font-display text-4xl font-black tracking-tighter text-foreground">Lecturer Workspace</h1>
            <p className="text-sm text-muted-foreground font-medium">Manage your courses and track student performance.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild className="h-12 rounded-2xl bg-black text-white font-bold px-6 shadow-soft hover:bg-neutral-800">
             <Link to="/attendance">
                <QrCode className="mr-2 h-4 w-4" /> Start New Session
             </Link>
          </Button>
          <Button 
            variant={view === "calendar" ? "default" : "outline"} 
            onClick={() => setView(view === "calendar" ? "overview" : "calendar")} 
            className={cn("h-12 rounded-2xl font-bold px-6 shadow-soft", view === "calendar" && "gradient-primary text-white border-none")}
          >
            <Calendar className="mr-2 h-4 w-4" /> Calendar
          </Button>
        </div>
      </header>

      {view === "overview" && (
        <div className="space-y-8">
           <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {myCourses.map((c) => (
                <div key={c.id} onClick={() => openCourse(c)} className="group relative overflow-hidden rounded-[2.5rem] border border-border/40 bg-card/60 shadow-soft backdrop-blur-xl transition-all hover:scale-[1.02] hover:shadow-elevated cursor-pointer">
                  <div className={cn("h-32 bg-gradient-to-br p-6 text-white relative", c.color || "from-violet-500 to-fuchsia-500")}>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{c.code}</p>
                    <h3 className="mt-1 font-display text-xl font-black leading-tight tracking-tighter">{c.title}</h3>
                    <div className="absolute bottom-6 right-6">
                       <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0" />
                     </div>
                  </div>
                  <div className="p-6">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                           <Users size={14} className="text-primary" />
                           <span>STUDENTS REGISTERED</span>
                        </div>
                        <span className="font-black text-lg">{enrollmentCounts[c.id] || 0}</span>
                     </div>
                  </div>
                </div>
              ))}
              {myCourses.length === 0 && !coursesLoading && (
                <div className="col-span-full py-20 text-center rounded-[2.5rem] border-2 border-dashed border-border/40 bg-muted/10">
                   <BookOpen className="mx-auto h-12 w-12 text-muted-foreground opacity-40 mb-4" />
                   <h3 className="text-xl font-black">No courses assigned</h3>
                   <p className="text-muted-foreground">Contact Admin if you believe this is an error.</p>
                </div>
              )}
           </div>

           <Card className="rounded-[2.5rem] border-border/40 bg-card/60 backdrop-blur-xl shadow-soft">
              <CardHeader>
                 <CardTitle className="font-display text-xl font-black">Recent Attendance Logs</CardTitle>
                 <CardDescription>The last few sessions you've conducted.</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="space-y-4">
                    {pastAttendance.slice(0, 5).map((s) => (
                      <div key={s.id} className="flex items-center gap-4 p-4 rounded-2xl bg-muted/20 border border-border/10">
                         <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <CheckCircle2 size={18} />
                         </div>
                         <div className="flex-1">
                            <p className="text-sm font-bold">{s.courses?.code} · {s.courses?.title}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(s.started_at), "PPP @ p")}</p>
                         </div>
                         <Badge variant="outline" className="rounded-full font-bold uppercase text-[9px] tracking-widest">{s.room || "LH"}</Badge>
                      </div>
                    ))}
                 </div>
              </CardContent>
           </Card>
        </div>
      )}

      {view === "course-detail" && selectedCourse && (
        <div className="space-y-8 animate-in slide-in-from-right-10 duration-500">
           <Button variant="ghost" onClick={backToOverview} className="mb-2 font-bold text-muted-foreground hover:text-foreground">
              <ChevronLeft size={16} className="mr-2" /> Back to Workspace
           </Button>

           <div className={cn("rounded-[3rem] p-10 text-white shadow-glow relative overflow-hidden", selectedCourse.color || "from-violet-500 to-fuchsia-500")}>
              <div className="relative z-10">
                <p className="text-xs font-black uppercase tracking-[0.3em] opacity-80">{selectedCourse.code}</p>
                <h2 className="mt-2 font-display text-5xl font-black tracking-tighter leading-none">{selectedCourse.title}</h2>
                <div className="mt-8 flex flex-wrap gap-8">
                   <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Enrolled Students</p>
                      <p className="text-2xl font-black">{enrollmentCounts[selectedCourse.id] || 0}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Avg. Attendance</p>
                      <p className="text-2xl font-black">
                         {reportData.length > 0 
                            ? Math.round(reportData.reduce((a, b) => a + b.attendance_percentage, 0) / reportData.length) 
                            : 0}%
                      </p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Venue</p>
                      <p className="text-2xl font-black">{selectedCourse.room || "TBA"}</p>
                   </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 p-10 opacity-10">
                 <BookOpen size={200} />
              </div>
           </div>

           <Card className="rounded-[2.5rem] border-border/40 bg-card/60 backdrop-blur-xl shadow-soft">
              <CardHeader className="flex flex-row items-center justify-between">
                 <div>
                    <CardTitle className="font-display text-2xl font-black">Student Attendance Roster</CardTitle>
                    <CardDescription>Detailed statistics for every student in this course.</CardDescription>
                 </div>
                 <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                       placeholder="Search student..." 
                       className="pl-10 h-10 rounded-xl bg-muted/20 border-none"
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                    />
                 </div>
              </CardHeader>
              <CardContent>
                 <div className="rounded-[2rem] border border-border/40 overflow-hidden">
                    <table className="w-full text-left">
                       <thead>
                          <tr className="bg-muted/30 border-b border-border/40">
                             <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Student Name</th>
                             <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Matric Number</th>
                             <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Attended</th>
                             <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Percentage</th>
                             <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Status</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-border/10">
                          {filteredReportData.map((s, i) => (
                            <tr key={i} className="hover:bg-muted/10 transition-colors">
                               <td className="px-8 py-5 font-bold text-sm">{s.student_name}</td>
                               <td className="px-8 py-5 font-mono text-xs">{s.matric_no}</td>
                               <td className="px-8 py-5 text-sm font-bold">{s.attended_count} / {s.total_sessions}</td>
                               <td className="px-8 py-5">
                                  <div className="flex items-center gap-3">
                                     <Progress value={s.attendance_percentage} className="w-20 h-2 rounded-full" />
                                     <span className="font-black text-xs">{s.attendance_percentage}%</span>
                                  </div>
                               </td>
                               <td className="px-8 py-5">
                                  {s.attendance_percentage < 80 ? (
                                    <Badge className="bg-destructive/10 text-destructive border-none font-black text-[9px] uppercase tracking-widest">At Risk</Badge>
                                  ) : (
                                    <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-black text-[9px] uppercase tracking-widest">Safe</Badge>
                                  )}
                               </td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </CardContent>
           </Card>
        </div>
      )}

      {view === "calendar" && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <Card className="rounded-[2.5rem] border-border/40 bg-card/60 backdrop-blur-xl shadow-soft overflow-hidden">
              <CardHeader className="bg-muted/20 border-b border-border/10">
                 <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="font-display text-2xl font-black">{format(currentMonth, "MMMM yyyy")}</CardTitle>
                      <CardDescription>Past attendance history across all your courses.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                       <Button variant="outline" size="icon" onClick={() => changeMonth(-1)} className="rounded-xl h-10 w-10"><ChevronLeft size={18} /></Button>
                       <Button variant="outline" size="icon" onClick={() => changeMonth(1)} className="rounded-xl h-10 w-10"><ChevronRight size={18} /></Button>
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="p-0">
                 <div className="grid grid-cols-7 border-b border-border/10">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                       <div key={d} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-center text-muted-foreground border-r border-border/5">{d}</div>
                    ))}
                 </div>
                 <div className="grid grid-cols-7">
                    {daysInMonth.map((day, i) => {
                       const dateKey = format(day, "yyyy-MM-dd");
                       const sessions = sessionsByDate.get(dateKey) || [];
                       
                       return (
                          <div key={i} className={cn(
                            "min-h-[140px] p-4 border-r border-b border-border/5 transition-colors hover:bg-muted/5",
                            !isSameDay(day, currentMonth) && "opacity-30 bg-muted/5",
                            isToday(day) && "bg-primary/5"
                          )}>
                             <p className={cn("text-xs font-black", isToday(day) && "text-primary")}>{format(day, "d")}</p>
                             <div className="mt-3 space-y-2">
                                {sessions.map(s => (
                                   <div key={s.id} className="p-2 rounded-lg bg-background border border-border/40 shadow-sm text-[10px] font-bold">
                                      <p className="text-primary truncate">{s.courses?.code}</p>
                                      <p className="text-muted-foreground opacity-70 truncate">{s.room || "LH"}</p>
                                   </div>
                                ))}
                             </div>
                          </div>
                       );
                    })}
                 </div>
              </CardContent>
           </Card>
        </div>
      )}
    </div>
  );
}
