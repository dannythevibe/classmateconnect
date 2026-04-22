import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Trash2, ShieldCheck, Users, Search, Filter, History, TrendingUp, CheckCircle2, ChevronRight, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { exportToCSV } from "@/lib/export";
import NewLecturerDialog from "@/components/dialogs/NewLecturerDialog";
import NewStudentDialog from "@/components/dialogs/NewStudentDialog";
import NewCourseDialog from "@/components/dialogs/NewCourseDialog";




type Role = "student" | "lecturer" | "admin";

interface UserRow {
  user_id: string;
  name: string;
  email: string;
  department: string | null;
  matric_no: string | null;
  role: Role;
}

interface AttendanceLog {
  id: string;
  marked_at: string;
  status: string;
  method: string;
  student_id: string;
  course_id: string;
  student_name?: string;
  course_title?: string;
}

async function fetchUsers(): Promise<UserRow[]> {
  const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
    supabase.from("profiles").select("user_id, name, email, department, matric_no"),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  if (pErr) throw pErr;
  if (rErr) throw rErr;
  const roleMap = new Map<string, Role>();
  (roles ?? []).forEach((r: any) => roleMap.set(r.user_id, r.role));
  return (profiles ?? []).map((p: any) => ({
    user_id: p.user_id,
    name: p.name || "—",
    email: p.email || "",
    department: p.department,
    matric_no: p.matric_no,
    role: roleMap.get(p.user_id) ?? "student",
  }));
}

async function fetchGlobalAttendance(): Promise<AttendanceLog[]> {
  const { data, error } = await supabase
    .from("attendance_records")
    .select(`
      id, marked_at, status, method, student_id, course_id,
      students(name),
      courses(title)
    `)
    .order("marked_at", { ascending: false })
    .limit(100);
  
  if (error) throw error;
  
  return (data ?? []).map((r: any) => ({
    ...r,
    student_name: r.students?.name || "Unknown",
    course_title: r.courses?.title || "Unknown",
  }));
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();
  const { data: users = [], isLoading: usersLoading } = useQuery({ queryKey: ["admin-users"], queryFn: fetchUsers });
  const { data: logs = [], isLoading: logsLoading } = useQuery({ queryKey: ["global-attendance"], queryFn: fetchGlobalAttendance });
  
  const [busyId, setBusyId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.matric_no && u.matric_no.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const stats = useMemo(() => {
    return {
      total: users.length,
      students: users.filter(u => u.role === "student").length,
      lecturers: users.filter(u => u.role === "lecturer").length,
      admins: users.filter(u => u.role === "admin").length,
    };
  }, [users]);

  const changeRole = async (userId: string, newRole: Role) => {
    setBusyId(userId);
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delErr) { toast.error(delErr.message); setBusyId(null); return; }
    const { error: insErr } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    setBusyId(null);
    if (insErr) { toast.error(insErr.message); return; }
    toast.success("Role updated");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const deleteUser = async (userId: string) => {
    setBusyId(userId);
    const { data, error } = await supabase.functions.invoke("admin-delete-user", { body: { user_id: userId } });
    setBusyId(null);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Failed to remove user");
      return;
    }
    toast.success("User removed successfully");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in duration-700 space-y-10 pb-20">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-5">
           <div className="flex h-16 w-16 items-center justify-center rounded-[2rem] gradient-primary shadow-glow animate-float">
             <ShieldCheck className="h-8 w-8 text-white" />
           </div>
           <div>
             <h1 className="font-display text-4xl font-black tracking-tighter text-foreground">Admin Console</h1>
             <p className="text-sm text-muted-foreground font-medium">Global governance and user orchestration.</p>
           </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
           <NewLecturerDialog />
           <NewStudentDialog />
           <NewCourseDialog />
           <Button variant="outline" className="h-12 rounded-2xl border-border/40 font-bold px-6 shadow-soft hover:bg-muted" onClick={() => qc.invalidateQueries()}>
             <RefreshCw className="mr-2 h-4 w-4" /> Sync
           </Button>
            <Button
              onClick={() => {
                const data = filteredUsers.map(u => ({
                  Name: u.name,
                  Email: u.email,
                  Role: u.role,
                  Department: u.department || "N/A",
                  MatricNo: u.matric_no || "N/A"
                }));
                exportToCSV(data, "user_roster");
                toast.success("Roster exported");
              }}
              className="h-12 rounded-2xl gradient-primary font-bold px-6 text-white shadow-glow"
            >
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>

        </div>
      </header>

      {/* Stats Cluster */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Accounts" value={stats.total} icon={Users} color="text-primary" bgColor="bg-primary/10" desc="Registered Users" />
        <StatCard title="Attendance Active" value={logs.length} icon={TrendingUp} color="text-emerald-500" bgColor="bg-emerald-500/10" desc="Last 100 Logs" />
        <StatCard title="Teaching Staff" value={stats.lecturers} icon={ShieldCheck} color="text-blue-500" bgColor="bg-blue-500/10" desc="Active Lecturers" />
        <StatCard title="System Admins" value={stats.admins} icon={CheckCircle2} color="text-purple-500" bgColor="bg-purple-500/10" desc="Full Permissions" />
      </div>

      <Tabs defaultValue="users" className="space-y-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border-b border-border/40 pb-4">
          <TabsList className="h-14 bg-muted/30 p-1.5 rounded-[1.5rem] backdrop-blur-xl border border-border/40 shrink-0">
            <TabsTrigger value="users" className="h-full rounded-xl data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg px-8 font-bold text-xs uppercase tracking-widest">
              Users Management
            </TabsTrigger>
            <TabsTrigger value="attendance" className="h-full rounded-xl data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg px-8 font-bold text-xs uppercase tracking-widest">
              Global Logs
            </TabsTrigger>
          </TabsList>
          
          <div className="flex flex-1 max-w-xl gap-4">
             <div className="relative flex-1">
               <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
               <Input 
                 placeholder="Search name, ID, or email..." 
                 className="h-12 pl-12 rounded-2xl bg-muted/20 border-border/40 font-medium"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
             </div>
             <div className="flex items-center gap-2">
               <Select value={roleFilter} onValueChange={setRoleFilter}>
                 <SelectTrigger className="h-12 w-[160px] rounded-2xl bg-muted/20 border-border/40 font-bold text-xs">
                    <Filter className="mr-2 h-3.5 w-3.5" />
                    <SelectValue placeholder="All Roles" />
                 </SelectTrigger>
                 <SelectContent className="rounded-2xl">
                   <SelectItem value="all">All Roles</SelectItem>
                   <SelectItem value="student">Students</SelectItem>
                   <SelectItem value="lecturer">Lecturers</SelectItem>
                   <SelectItem value="admin">System Admins</SelectItem>
                 </SelectContent>
               </Select>
             </div>
          </div>
        </div>

        <TabsContent value="users" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="rounded-[2.5rem] border border-border/40 bg-card/60 backdrop-blur-3xl shadow-elevated overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/40">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">User Identity</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Dept / ID</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Permission</th>
                    <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {usersLoading ? (
                    <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" /></td></tr>
                  ) : filteredUsers.map((u) => {
                    const isSelf = u.user_id === currentUser?.id;
                    const roleColor = u.role === "admin" ? "text-destructive" : u.role === "lecturer" ? "text-primary" : "text-emerald-500";
                    
                    return (
                      <tr key={u.user_id} className="group hover:bg-muted/20 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12 border-2 border-border/40 shadow-soft transition-transform group-hover:scale-110">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm font-black uppercase">{u.name.substring(0, 2)}</AvatarFallback>
                            </Avatar>
                            <div>
                               <div className="flex items-center gap-2">
                                 <p className="font-bold text-foreground leading-none">{u.name}</p>
                                 {isSelf && <Badge className="h-4 px-1.5 rounded-sm bg-primary/20 text-primary text-[8px] font-black uppercase tracking-widest border-none">You</Badge>}
                               </div>
                               <p className="text-xs text-muted-foreground mt-1">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-sm font-bold text-foreground">{u.department || "—"}</p>
                          <p className="text-[10px] font-black text-muted-foreground uppercase mt-1 tracking-tighter">{u.matric_no || "PROVISIONAL"}</p>
                        </td>
                        <td className="px-8 py-5">
                          <Select 
                            value={u.role} 
                            disabled={busyId === u.user_id || isSelf}
                            onValueChange={(v) => changeRole(u.user_id, v as Role)}
                          >
                            <SelectTrigger className={cn("h-9 w-28 rounded-xl border-none font-black text-[10px] uppercase tracking-widest bg-muted/40", roleColor)}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              <SelectItem value="student">Student</SelectItem>
                              <SelectItem value="lecturer">Lecturer</SelectItem>
                              <SelectItem value="admin">System Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" disabled={isSelf || busyId === u.user_id} className="h-10 w-10 text-muted-foreground hover:text-white hover:bg-destructive rounded-xl transition-all">
                                <Trash2 className="h-4.5 w-4.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-[2.5rem] border border-border/40 bg-card/95 backdrop-blur-xl p-10">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-3xl font-black tracking-tighter">De-authorize {u.name.split(" ")[0]}?</AlertDialogTitle>
                                <AlertDialogDescription className="text-base font-medium text-muted-foreground mt-4">
                                  This action will permanently strip this user's digital identity and remove all associated analytical records.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="mt-10 gap-3">
                                <AlertDialogCancel className="h-12 rounded-2xl border-border/40 font-bold shadow-soft">Retain User</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteUser(u.user_id)} className="h-12 rounded-2xl bg-destructive text-white font-bold shadow-glow border-none px-8">
                                  Purge Identity
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredUsers.length === 0 && !usersLoading && (
              <div className="flex flex-col items-center justify-center p-20 opacity-40">
                <Users className="h-12 w-12 mb-4" />
                <p className="font-bold italic">Zero subjects matching the criteria.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="rounded-[2.5rem] border border-border/40 bg-card/60 backdrop-blur-3xl shadow-elevated overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/40">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Subject</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Target Activity</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Timestamp</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Method</th>
                    <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {logs.map((log) => (
                    <tr key={log.id} className="group hover:bg-muted/20 transition-colors">
                      <td className="px-8 py-5 font-black text-sm text-foreground">{log.student_name}</td>
                      <td className="px-8 py-5 text-xs font-bold text-muted-foreground truncate max-w-[200px]">{log.course_title}</td>
                      <td className="px-8 py-5">
                        <div className="text-xs font-black text-foreground uppercase tracking-tighter">{new Date(log.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        <div className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-widest">{new Date(log.marked_at).toLocaleDateString()}</div>
                      </td>
                      <td className="px-8 py-5">
                        <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary border-none px-3 font-black text-[9px] uppercase tracking-widest">
                          {log.method} Verified
                        </Badge>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <Badge className={`rounded-full px-4 py-1.5 text-[10px] font-black tracking-widest border-none ${log.status === 'present' ? 'bg-emerald-500/10 text-emerald-600' : log.status === 'late' ? 'bg-amber-500/10 text-amber-600' : 'bg-destructive/10 text-destructive'}`}>
                          {log.status.toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && !logsLoading && (
                    <tr><td colSpan={5} className="py-20 text-center text-muted-foreground italic font-bold">Historical data is clean.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bgColor, desc }: any) {
  return (
    <div className="group rounded-[2.5rem] border border-border/40 bg-card/60 p-8 shadow-soft backdrop-blur-xl transition-all hover:shadow-elevated hover:scale-[1.02] hover:bg-card">
      <div className="flex items-center justify-between">
        <div className={`flex h-14 w-14 items-center justify-center rounded-[1.25rem] ${bgColor} transition-transform group-hover:rotate-6`}>
          <Icon className={`h-7 w-7 ${color}`} />
        </div>
        <div className="text-right">
           <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div className="mt-8">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
        <h4 className="text-4xl font-display font-black mt-2 tracking-tighter text-foreground">{value}</h4>
      </div>
    </div>
  );
}
