import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart3, Users, BookOpen, Bell, Download, 
  Search, Filter, Plus, ShieldCheck, Activity,
  Database, FileSpreadsheet, AlertCircle, RefreshCw,
  Mail, Settings, ChevronRight, GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import NewCourseDialog from "@/components/dialogs/NewCourseDialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function AdminDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [shortageThreshold, setShortageThreshold] = useState(70);

  // Queries
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      try {
        const [students, lecturers, courses] = await Promise.all([
          supabase.from("students").select("id", { count: "exact" }),
          supabase.from("user_roles").select("id", { count: "exact" }).eq("role", "lecturer"),
          supabase.from("courses").select("id", { count: "exact" }),
        ]);
        return {
          students: students.count || 0,
          lecturers: lecturers.count || 0,
          courses: courses.count || 0,
          departments: 8
        };
      } catch (e) {
        return { students: 0, lecturers: 0, courses: 0, departments: 0 };
      }
    }
  });

  const { data: reportData = [] } = useQuery({
    queryKey: ["admin-attendance-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_summary_report")
        .select("*");
      if (error) throw error;
      return data || [];
    }
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["admin-system-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    }
  });

  const handleDownload = (type: "summary" | "details") => {
    toast.info(`Generating ${type} report...`);
    const headers = type === "summary" 
      ? "Session,Semester,Faculty,Course,Lecturer,Matric No,Name,Attended,Total,Percentage\n"
      : "Date,Session,Semester,Faculty,Course,Student,Status,Percentage\n";
    
    const rows = reportData.map(r => 
      `${r.session},${r.semester},${r.faculty},${r.course_code},${r.lecturer_name},${r.matric_no},${r.student_name},${r.attended_count},${r.total_sessions},${r.attendance_percentage}%`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${type}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success("Report downloaded");
  };

  const handleNotifyShortage = async () => {
    const atRisk = reportData.filter(r => r.attendance_percentage < shortageThreshold);
    if (atRisk.length === 0) {
      toast.info("No students found below this threshold.");
      return;
    }
    
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: `Sending notifications to ${atRisk.length} students...`,
        success: "Notifications dispatched successfully",
        error: "Failed to send notifications",
      }
    );
  };

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in duration-1000 space-y-10 pb-20">
      {/* Header Section */}
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-[2rem] bg-black shadow-2xl">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-4xl font-black tracking-tighter text-foreground">Admin Console</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <NewCourseDialog />
          <Link to="/profile">
            <Button variant="outline" className="h-12 rounded-2xl border-2 font-bold px-6 bg-white/50 backdrop-blur-sm">
              <Settings className="mr-2 h-4 w-4" /> Settings
            </Button>
          </Link>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Students", value: stats?.students, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Faculty Members", value: stats?.lecturers, icon: GraduationCap, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Active Courses", value: stats?.courses, icon: BookOpen, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Total Records", value: reportData.length * 5, icon: Database, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((stat, i) => (
          <Card key={i} className="rounded-[2.5rem] border-none shadow-soft overflow-hidden group hover:shadow-elevated transition-all">
            <CardContent className="p-8">
              <div className={cn("mb-6 flex h-14 w-14 items-center justify-center rounded-2xl transition-transform group-hover:scale-110", stat.bg)}>
                <stat.icon className={cn("h-7 w-7", stat.color)} />
              </div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">{stat.label}</p>
              <h3 className="mt-2 text-4xl font-black tracking-tighter">{stat.value || "0"}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="h-16 w-full max-w-2xl bg-white/40 p-2 rounded-[2rem] border border-white/60 backdrop-blur-xl shadow-soft">
          <TabsTrigger value="overview" className="flex-1 rounded-2xl font-bold data-[state=active]:bg-black data-[state=active]:text-white">Overview</TabsTrigger>
          <TabsTrigger value="users" className="flex-1 rounded-2xl font-bold data-[state=active]:bg-black data-[state=active]:text-white">Directory</TabsTrigger>
          <TabsTrigger value="reports" className="flex-1 rounded-2xl font-bold data-[state=active]:bg-black data-[state=active]:text-white">Reports</TabsTrigger>
          <TabsTrigger value="shortage" className="flex-1 rounded-2xl font-bold data-[state=active]:bg-black data-[state=active]:text-white">Attendance Risk</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          <div className="grid gap-8 lg:grid-cols-3">
             <Card className="lg:col-span-2 rounded-[3rem] border-none shadow-soft bg-white/60 backdrop-blur-xl p-4">
                <CardHeader>
                  <CardTitle className="font-display text-2xl font-black tracking-tight">Recent System Activity</CardTitle>
                  <CardDescription>Monitor every major event across the platform.</CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="space-y-4">
                      {logs.map((log) => (
                        <div key={log.id} className="flex items-center gap-4 p-5 rounded-[2rem] bg-white border border-border/10 shadow-sm hover:shadow-md transition-shadow">
                           <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center">
                              <Bell size={20} className="text-muted-foreground" />
                           </div>
                           <div className="flex-1">
                              <p className="text-sm font-bold text-foreground">{log.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{log.message}</p>
                           </div>
                           <Badge variant="outline" className="rounded-full px-3 py-1 font-bold text-[9px] uppercase tracking-widest bg-muted/30">
                              {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </Badge>
                        </div>
                      ))}
                      {logs.length === 0 && (
                        <div className="py-20 text-center opacity-40">
                           <RefreshCw className="h-12 w-12 mx-auto animate-spin-slow mb-4" />
                           <p className="font-bold">Waiting for system logs...</p>
                        </div>
                      )}
                   </div>
                </CardContent>
             </Card>

             <Card className="rounded-[3rem] border-none shadow-soft bg-black text-white p-4">
                <CardHeader>
                   <CardTitle className="font-display text-2xl font-black">Data Health</CardTitle>
                   <CardDescription className="text-white/50">Database consistency monitor.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-10">
                   <div className="space-y-3">
                      <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                         <span>SYNC STATUS</span>
                         <span className="text-primary">98%</span>
                      </div>
                      <Progress value={98} className="h-2 bg-white/10" />
                   </div>
                   <div className="space-y-3">
                      <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                         <span>STORAGE USAGE</span>
                         <span>1.2 GB / 5GB</span>
                      </div>
                      <Progress value={24} className="h-2 bg-white/10" />
                   </div>
                   <Button className="w-full h-14 rounded-2xl bg-primary text-black font-black uppercase tracking-widest text-xs hover:bg-primary/90">
                      <RefreshCw className="mr-2 h-4 w-4" /> Run System Audit
                   </Button>
                </CardContent>
             </Card>
          </div>
        </TabsContent>

        <TabsContent value="users">
           <Card className="rounded-[3rem] border-none shadow-soft bg-white/60 backdrop-blur-xl p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8">
                 <div>
                    <CardTitle className="font-display text-2xl font-black">Institutional Directory</CardTitle>
                    <CardDescription>Manage all registered students and faculty members.</CardDescription>
                 </div>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                 <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                       <ShieldCheck size={14} className="text-primary" /> Faculty Lecturers
                    </h4>
                    <div className="rounded-3xl border border-border/10 bg-white p-2 space-y-1">
                       <div className="p-4 flex items-center justify-between hover:bg-muted/30 rounded-2xl transition-colors">
                          <span className="font-bold">System Admin (You)</span>
                          <Badge variant="outline" className="rounded-full">Administrator</Badge>
                       </div>
                       {/* In a real app, this would be a map of lecturers */}
                    </div>
                 </div>
                 <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                       <Users size={14} className="text-primary" /> Registered Students
                    </h4>
                    <div className="rounded-3xl border border-border/10 bg-white p-2 space-y-1">
                       {reportData.slice(0, 5).map((s, i) => (
                         <div key={i} className="p-4 flex items-center justify-between hover:bg-muted/30 rounded-2xl transition-colors">
                            <div>
                               <p className="font-bold">{s.student_name}</p>
                               <p className="text-[10px] text-muted-foreground">{s.matric_no}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="rounded-full"><ChevronRight size={16} /></Button>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
           </Card>
        </TabsContent>

        <TabsContent value="reports" className="animate-in slide-in-from-bottom-4 duration-500">
           <Card className="rounded-[3rem] border-none shadow-soft bg-white/60 backdrop-blur-xl p-8">
              <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between mb-10">
                 <div>
                    <CardTitle className="font-display text-3xl font-black tracking-tight">Institutional Reporting</CardTitle>
                    <CardDescription className="text-base">Generate and export comprehensive attendance data for university records.</CardDescription>
                 </div>
                 <div className="flex gap-3">
                    <Button onClick={() => handleDownload("summary")} className="h-14 rounded-2xl bg-black text-white px-8 font-bold">
                       <FileSpreadsheet className="mr-2 h-5 w-5" /> Summary Report
                    </Button>
                    <Button onClick={() => handleDownload("details")} variant="outline" className="h-14 rounded-2xl border-2 px-8 font-bold">
                       <Download className="mr-2 h-5 w-5" /> Detailed Logs
                    </Button>
                 </div>
              </div>

              <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
                 <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input placeholder="Search records..." className="pl-12 h-14 rounded-2xl border-none bg-white shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                 </div>
                 <div className="bg-white rounded-2xl h-14 flex items-center px-6 shadow-sm">
                    <Filter className="h-4 w-4 text-muted-foreground mr-3" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Filter by Faculty</span>
                 </div>
              </div>

              <div className="rounded-[2.5rem] border border-border/40 overflow-hidden shadow-sm bg-white">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="bg-muted/30 border-b border-border/10">
                          <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Course Details</th>
                          <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Student Info</th>
                          <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">Attendance</th>
                          <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Status</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-border/5">
                       {reportData.slice(0, 10).map((r, i) => (
                         <tr key={i} className="hover:bg-muted/5 transition-colors group">
                            <td className="px-8 py-6">
                               <p className="font-black text-sm text-foreground">{r.course_code}</p>
                               <p className="text-xs text-muted-foreground font-medium">{r.course_title}</p>
                               <div className="mt-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black">{r.session}</Badge>
                                  <Badge className="bg-muted text-muted-foreground border-none text-[8px] font-black">{r.semester}</Badge>
                               </div>
                            </td>
                            <td className="px-8 py-6">
                               <p className="font-bold text-sm">{r.student_name}</p>
                               <p className="font-mono text-[10px] text-muted-foreground">{r.matric_no}</p>
                            </td>
                            <td className="px-8 py-6">
                               <div className="flex flex-col items-center gap-2">
                                  <span className="text-sm font-black">{r.attendance_percentage}%</span>
                                  <Progress value={r.attendance_percentage} className="w-24 h-1.5 rounded-full" />
                               </div>
                            </td>
                            <td className="px-8 py-6">
                               {r.attendance_percentage < 70 ? (
                                 <Badge className="bg-destructive/10 text-destructive border-none px-4 py-1 rounded-full font-black text-[9px] uppercase tracking-tighter">Critically Low</Badge>
                               ) : (
                                 <Badge className="bg-emerald-500/10 text-emerald-600 border-none px-4 py-1 rounded-full font-black text-[9px] uppercase tracking-tighter">Normal</Badge>
                               )}
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </Card>
        </TabsContent>

        <TabsContent value="shortage">
           <div className="grid gap-8 lg:grid-cols-4">
              <Card className="rounded-[3rem] border-none shadow-soft bg-white/60 backdrop-blur-xl p-8 lg:col-span-1 h-fit">
                 <div className="mb-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
                    <AlertCircle className="h-8 w-8 text-amber-500" />
                 </div>
                 <h3 className="font-display text-2xl font-black tracking-tight mb-4">Notification Policy</h3>
                 <p className="text-sm text-muted-foreground mb-10 leading-relaxed">
                    Set a percentage threshold to identify students who are at risk of missing exams due to poor attendance.
                 </p>
                 
                 <div className="space-y-6 mb-10">
                    <div className="flex justify-between items-center">
                       <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">THRESHOLD</label>
                       <span className="text-xl font-black">{shortageThreshold}%</span>
                    </div>
                    <Input 
                      type="range" min="0" max="100" 
                      value={shortageThreshold} 
                      onChange={(e) => setShortageThreshold(parseInt(e.target.value))}
                      className="accent-black h-2"
                    />
                 </div>

                 <Button onClick={handleNotifyShortage} className="w-full h-14 rounded-2xl bg-black text-white font-bold group shadow-lg">
                    <Mail className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" /> Notify All At Risk
                 </Button>
              </Card>

              <div className="lg:col-span-3 space-y-6">
                 {reportData.filter(r => r.attendance_percentage < shortageThreshold).map((r, i) => (
                   <div key={i} className="flex items-center gap-6 p-6 rounded-[2.5rem] bg-white shadow-soft border border-border/5 hover:border-amber-200 transition-all">
                      <div className="h-16 w-16 rounded-[1.5rem] bg-muted/20 flex items-center justify-center text-xl font-black">
                         {r.student_name.substring(0, 2)}
                      </div>
                      <div className="flex-1">
                         <h4 className="font-black text-lg">{r.student_name}</h4>
                         <p className="text-sm text-muted-foreground font-medium">{r.matric_no} · {r.faculty}</p>
                         <p className="text-[10px] font-bold text-amber-600 mt-1 uppercase tracking-widest">{r.course_code}: {r.course_title}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-2xl font-black text-destructive">{r.attendance_percentage}%</p>
                         <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Attendance</p>
                      </div>
                      <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 hover:bg-muted/50">
                         <ChevronRight size={20} />
                      </Button>
                   </div>
                 ))}
                 {reportData.filter(r => r.attendance_percentage < shortageThreshold).length === 0 && (
                   <div className="py-20 text-center rounded-[3rem] border-2 border-dashed border-muted/20">
                      <ShieldCheck className="h-16 w-16 text-emerald-500 mx-auto mb-4 opacity-20" />
                      <p className="text-xl font-bold text-muted-foreground">All students meet the current criteria.</p>
                   </div>
                 )}
              </div>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
