import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, Trash2, ShieldCheck, Users, Search, BookOpen,
  GraduationCap, Building2, Download, RefreshCw, TrendingUp, CheckCircle2,
} from "lucide-react";
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
import NewDepartmentDialog from "@/components/dialogs/NewDepartmentDialog";
import BulkCourseUploadDialog from "@/components/dialogs/BulkCourseUploadDialog";
import NotifyShortageDialog from "@/components/dialogs/NotifyShortageDialog";
import CourseReportDialog from "@/components/dialogs/CourseReportDialog";

type Role = "student" | "lecturer" | "admin";

interface UserRow {
  user_id: string;
  name: string;
  email: string;
  department: string | null;
  matric_no: string | null;
  role: Role;
}

interface StudentRow {
  id: string;
  name: string;
  matric_no: string;
  department: string;
  level: string;
}

interface CourseRow {
  id: string;
  code: string;
  title: string;
  department: string | null;
  level: string | null;
  room: string;
  schedule: string;
  session: string | null;
  semester: string | null;
  lecturer_id: string;
  lecturer_name?: string;
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

async function fetchStudents(): Promise<StudentRow[]> {
  const { data, error } = await supabase
    .from("students")
    .select("id, name, matric_no, department, level")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as StudentRow[];
}

async function fetchCourses(): Promise<CourseRow[]> {
  const { data: courses, error } = await supabase
    .from("courses")
    .select("id, code, title, department, level, room, schedule, session, semester, lecturer_id")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const ids = Array.from(new Set((courses ?? []).map((c: any) => c.lecturer_id).filter(Boolean)));
  let nameMap = new Map<string, string>();
  if (ids.length) {
    const { data: profs } = await supabase.from("profiles").select("user_id, name").in("user_id", ids);
    (profs ?? []).forEach((p: any) => nameMap.set(p.user_id, p.name));
  }
  return (courses ?? []).map((c: any) => ({ ...c, lecturer_name: nameMap.get(c.lecturer_id) || "Unassigned" }));
}

async function fetchDepartments() {
  const { data, error } = await supabase
    .from("departments")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data || [];
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();
  const { data: users = [], isLoading: usersLoading } = useQuery({ queryKey: ["admin-users"], queryFn: fetchUsers });
  const { data: studentRecords = [], isLoading: studentsLoading } = useQuery({ queryKey: ["admin-students"], queryFn: fetchStudents });
  const { data: courses = [], isLoading: coursesLoading } = useQuery({ queryKey: ["admin-courses"], queryFn: fetchCourses });
  const { data: officialDepartments = [], isLoading: deptsLoading } = useQuery({ queryKey: ["admin-departments"], queryFn: fetchDepartments });

  const [busyId, setBusyId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("lecturers");

  const lecturers = useMemo(() => users.filter(u => u.role === "lecturer"), [users]);
  const studentUsers = useMemo(() => users.filter(u => u.role === "student"), [users]);
  const admins = useMemo(() => users.filter(u => u.role === "admin"), [users]);

  // Combined student list: profiles (self sign-up) + students table records
  const allStudents = useMemo(() => {
    type MergedStudent = {
      key: string; name: string; email: string; matric_no: string;
      department: string; level: string; source: "self-signup" | "admin-added";
      user_id?: string; record_id?: string;
    };
    const fromProfiles: MergedStudent[] = studentUsers.map(u => ({
      key: `p-${u.user_id}`,
      name: u.name,
      email: u.email,
      matric_no: u.matric_no || "",
      department: u.department || "",
      level: "",
      source: "self-signup",
      user_id: u.user_id,
    }));
    // Exclude student table records that belong to a lecturer/admin account
    const lecturerIds = new Set(lecturers.map(l => l.user_id));
    const fromRecords: MergedStudent[] = studentRecords
      .filter(s => !s.user_id || !lecturerIds.has(s.user_id))
      .map(s => ({
        key: `s-${s.id}`,
        name: s.name,
        email: "",
        matric_no: s.matric_no,
        department: s.department,
        level: s.level,
        source: "admin-added",
        record_id: s.id,
      }));
    // Dedupe by matric_no when both exist
    const seen = new Set<string>();
    const merged: MergedStudent[] = [];
    [...fromProfiles, ...fromRecords].forEach(s => {
      const k = s.matric_no?.trim().toLowerCase();
      if (k && seen.has(k)) return;
      if (k) seen.add(k);
      merged.push(s);
    });
    return merged;
  }, [studentUsers, studentRecords]);

  const departments = useMemo(() => {
    const map = new Map<string, { lecturers: number; students: number; courses: number; isOfficial: boolean; id?: string }>();
    
    // Initialize with official departments
    officialDepartments.forEach(d => {
      map.set(d.name, { lecturers: 0, students: 0, courses: 0, isOfficial: true, id: d.id });
    });

    const bump = (dept: string, key: "lecturers" | "students" | "courses") => {
      const d = (dept || "Unassigned").trim() || "Unassigned";
      if (!map.has(d)) map.set(d, { lecturers: 0, students: 0, courses: 0, isOfficial: false });
      map.get(d)![key]++;
    };
    lecturers.forEach(l => bump(l.department || "", "lecturers"));
    allStudents.forEach(s => bump(s.department || "", "students"));
    courses.forEach(c => bump(c.department || "", "courses"));
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => (b.lecturers + b.students + b.courses) - (a.lecturers + a.students + a.courses));
  }, [lecturers, allStudents, courses, officialDepartments]);

  const filterText = (val: string) => val.toLowerCase().includes(searchTerm.toLowerCase());

  const filteredLecturers = useMemo(() => lecturers.filter(l =>
    !searchTerm || filterText(l.name) || filterText(l.email) || filterText(l.department || "")
  ), [lecturers, searchTerm]);

  const filteredStudents = useMemo(() => allStudents.filter(s =>
    !searchTerm || filterText(s.name) || filterText(s.matric_no) || filterText(s.department)
  ), [allStudents, searchTerm]);

  const filteredCourses = useMemo(() => courses.filter(c =>
    !searchTerm || filterText(c.code) || filterText(c.title) || filterText(c.department || "") || filterText(c.lecturer_name || "")
  ), [courses, searchTerm]);

  const deleteUser = async (userId: string) => {
    setBusyId(userId);
    const { data, error } = await supabase.functions.invoke("admin-delete-user", { body: { user_id: userId } });
    setBusyId(null);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Failed to remove user");
      return;
    }
    toast.success("User removed");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const deleteStudentRecord = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase.from("students").delete().eq("id", id);
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Student removed");
    qc.invalidateQueries({ queryKey: ["admin-students"] });
  };

  const deleteCourse = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase.from("courses").delete().eq("id", id);
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Course removed");
    qc.invalidateQueries({ queryKey: ["admin-courses"] });
  };

  const deleteDepartment = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase.from("departments").delete().eq("id", id);
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Department removed");
    qc.invalidateQueries({ queryKey: ["admin-departments"] });
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
            <p className="text-sm text-muted-foreground font-medium">Manage lecturers, students, courses and departments.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {activeTab === "departments" ? (
            <NewDepartmentDialog />
          ) : (
            <>
              <NewLecturerDialog />
              <NewStudentDialog />
              <NewCourseDialog />
              <BulkCourseUploadDialog />
            </>
          )}
          <CourseReportDialog />
          <NotifyShortageDialog />
          <Button variant="outline" className="h-12 rounded-2xl border-border/40 font-bold px-6 shadow-soft hover:bg-muted" onClick={() => qc.invalidateQueries()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Sync
          </Button>
        </div>
      </header>

      {/* Totals */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Lecturers" value={lecturers.length} icon={GraduationCap} color="text-primary" bgColor="bg-primary/10" desc="Teaching staff" />
        <StatCard title="Students" value={allStudents.length} icon={Users} color="text-primary" bgColor="bg-primary/10" desc="Enrolled" />
        <StatCard title="Courses" value={courses.length} icon={BookOpen} color="text-black" bgColor="bg-black/10" desc="In catalog" />
        <StatCard title="Departments" value={departments.length} icon={Building2} color="text-primary" bgColor="bg-primary/10" desc="Active" />
      </div>

      <Tabs defaultValue="lecturers" className="space-y-6" onValueChange={setActiveTab}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-border/40 pb-4">
          <TabsList className="h-14 bg-muted/30 p-1.5 rounded-[1.5rem] backdrop-blur-xl border border-border/40 shrink-0">
            <TabsTrigger value="lecturers" className="h-full rounded-xl data-[state=active]:bg-background data-[state=active]:text-primary px-6 font-bold text-xs uppercase tracking-widest">Lecturers</TabsTrigger>
            <TabsTrigger value="students" className="h-full rounded-xl data-[state=active]:bg-background data-[state=active]:text-primary px-6 font-bold text-xs uppercase tracking-widest">Students</TabsTrigger>
            <TabsTrigger value="courses" className="h-full rounded-xl data-[state=active]:bg-background data-[state=active]:text-primary px-6 font-bold text-xs uppercase tracking-widest">Courses</TabsTrigger>
            <TabsTrigger value="departments" className="h-full rounded-xl data-[state=active]:bg-background data-[state=active]:text-primary px-6 font-bold text-xs uppercase tracking-widest">Departments</TabsTrigger>
          </TabsList>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="h-12 pl-12 rounded-2xl bg-muted/20 border-border/40 font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* LECTURERS */}
        <TabsContent value="lecturers" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <SectionCard
            empty={!usersLoading && filteredLecturers.length === 0}
            emptyMsg="No lecturers yet — use Add Lecturer."
            loading={usersLoading}
            onExport={() => {
              exportToCSV(filteredLecturers.map(l => ({ Name: l.name, Email: l.email, Department: l.department || "" })), "lecturers");
              toast.success("Exported");
            }}
          >
            <table className="w-full text-left">
              <thead><tr className="bg-muted/30 border-b border-border/40">
                <Th>Lecturer</Th><Th>Department</Th><Th className="text-right">Action</Th>
              </tr></thead>
              <tbody className="divide-y divide-border/20">
                {filteredLecturers.map(l => (
                  <tr key={l.user_id} className="group hover:bg-muted/20 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-11 w-11 border-2 border-border/40"><AvatarFallback className="bg-primary/10 text-primary font-black text-xs uppercase">{l.name.substring(0, 2)}</AvatarFallback></Avatar>
                        <div>
                          <p className="font-bold text-foreground leading-none">{l.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{l.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5"><Badge variant="secondary" className="rounded-full font-bold">{l.department || "—"}</Badge></td>
                    <td className="px-8 py-5 text-right">
                      <DeleteBtn disabled={l.user_id === currentUser?.id || busyId === l.user_id} onConfirm={() => deleteUser(l.user_id)} name={l.name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        </TabsContent>

        {/* STUDENTS */}
        <TabsContent value="students" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <SectionCard
            empty={!studentsLoading && !usersLoading && filteredStudents.length === 0}
            emptyMsg="No students yet."
            loading={studentsLoading || usersLoading}
            onExport={() => {
              exportToCSV(filteredStudents.map(s => ({ Name: s.name, MatricNo: s.matric_no, Department: s.department, Level: s.level, Source: s.source })), "students");
              toast.success("Exported");
            }}
          >
            <table className="w-full text-left">
              <thead><tr className="bg-muted/30 border-b border-border/40">
                <Th>Student</Th><Th>Matric No</Th><Th>Department</Th><Th>Level</Th><Th>Source</Th><Th className="text-right">Action</Th>
              </tr></thead>
              <tbody className="divide-y divide-border/20">
                {filteredStudents.map(s => (
                  <tr key={s.key} className="group hover:bg-muted/20 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-11 w-11 border-2 border-border/40"><AvatarFallback className="bg-primary/10 text-primary font-black text-xs uppercase">{s.name.substring(0, 2)}</AvatarFallback></Avatar>
                        <div>
                          <p className="font-bold text-foreground leading-none">{s.name}</p>
                          {s.email && <p className="text-xs text-muted-foreground mt-1">{s.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 font-mono text-xs font-bold">{s.matric_no || "—"}</td>
                    <td className="px-8 py-5 text-sm font-bold">{s.department || "—"}</td>
                    <td className="px-8 py-5"><Badge variant="outline" className="rounded-full">{s.level || "—"}</Badge></td>
                    <td className="px-8 py-5">
                      <Badge className={cn("rounded-full text-[9px] font-black uppercase tracking-widest border-none",
                        s.source === "self-signup" ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-600")}>
                        {s.source === "self-signup" ? "Self sign-up" : "Admin added"}
                      </Badge>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <DeleteBtn
                        disabled={busyId === (s.user_id || s.record_id)}
                        onConfirm={() => s.user_id ? deleteUser(s.user_id) : s.record_id && deleteStudentRecord(s.record_id)}
                        name={s.name}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        </TabsContent>

        {/* COURSES */}
        <TabsContent value="courses" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <SectionCard
            empty={!coursesLoading && filteredCourses.length === 0}
            emptyMsg="No courses yet — use New Course."
            loading={coursesLoading}
            onExport={() => {
              exportToCSV(filteredCourses.map(c => ({ Code: c.code, Title: c.title, Department: c.department || "", Level: c.level || "", Lecturer: c.lecturer_name || "", Room: c.room, Schedule: c.schedule })), "courses");
              toast.success("Exported");
            }}
          >
            <table className="w-full text-left">
              <thead><tr className="bg-muted/30 border-b border-border/40">
                <Th>Course</Th><Th>Lecturer</Th><Th>Department</Th><Th>Level</Th><Th>Session</Th><Th>Semester</Th><Th>Schedule</Th><Th className="text-right">Action</Th>
              </tr></thead>
              <tbody className="divide-y divide-border/20">
                {filteredCourses.map(c => (
                  <tr key={c.id} className="group hover:bg-muted/20 transition-colors">
                    <td className="px-8 py-5">
                      <p className="font-black text-sm text-foreground">{c.code}</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate max-w-[280px]">{c.title}</p>
                    </td>
                    <td className="px-8 py-5 text-sm font-bold">{c.lecturer_name}</td>
                    <td className="px-8 py-5"><Badge variant="secondary" className="rounded-full font-bold">{c.department || "—"}</Badge></td>
                    <td className="px-8 py-5"><Badge variant="outline" className="rounded-full">{c.level || "—"}</Badge></td>
                    <td className="px-8 py-5 text-xs font-bold">{c.session || "—"}</td>
                    <td className="px-8 py-5 text-xs font-bold">{c.semester || "—"}</td>
                    <td className="px-8 py-5 text-xs text-muted-foreground font-medium">{c.schedule || "—"} {c.room && <span className="opacity-60">· {c.room}</span>}</td>
                    <td className="px-8 py-5 text-right">
                      <DeleteBtn disabled={busyId === c.id} onConfirm={() => deleteCourse(c.id)} name={c.code} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        </TabsContent>

        {/* DEPARTMENTS */}
        <TabsContent value="departments" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {deptsLoading ? (
            <div className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" /></div>
          ) : departments.length === 0 ? (
            <div className="rounded-[2.5rem] border border-border/40 bg-card/60 p-20 text-center text-muted-foreground italic font-bold">
              No department data yet.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {departments.map(d => (
                <div key={d.name} className="rounded-[2rem] border border-border/40 bg-card/60 backdrop-blur-xl p-7 shadow-soft hover:shadow-elevated transition-all group relative">
                  {d.isOfficial && (
                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DeleteBtn disabled={busyId === d.id} onConfirm={() => d.id && deleteDepartment(d.id)} name={d.name} />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-lg font-black tracking-tight text-foreground leading-tight">{d.name}</h3>
                        {d.isOfficial && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
                        {d.isOfficial ? "Official System Dept" : "Ad-hoc (from records)"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <DeptStat icon={GraduationCap} label="Lecturers" value={d.lecturers} color="text-primary" />
                    <DeptStat icon={Users} label="Students" value={d.students} color="text-primary" />
                    <DeptStat icon={BookOpen} label="Courses" value={d.courses} color="text-black" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground", className)}>{children}</th>;
}

function SectionCard({ children, loading, empty, emptyMsg, onExport }: any) {
  return (
    <div className="rounded-[2.5rem] border border-border/40 bg-card/60 backdrop-blur-3xl shadow-elevated overflow-hidden">
      {onExport && (
        <div className="flex justify-end p-4 border-b border-border/40">
          <Button variant="outline" size="sm" onClick={onExport} className="rounded-xl font-bold">
            <Download className="mr-2 h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      )}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" /></div>
        ) : empty ? (
          <div className="flex flex-col items-center justify-center p-20 opacity-40">
            <Users className="h-12 w-12 mb-4" />
            <p className="font-bold italic">{emptyMsg}</p>
          </div>
        ) : children}
      </div>
    </div>
  );
}

function DeleteBtn({ disabled, onConfirm, name }: { disabled: boolean; onConfirm: () => void; name: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" disabled={disabled} className="h-10 w-10 text-muted-foreground hover:text-white hover:bg-destructive rounded-xl">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-[2rem] p-8">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-black tracking-tight">Remove {name}?</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground mt-2">
            This is permanent and cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 gap-2">
          <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="rounded-xl bg-destructive text-white font-bold">Remove</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeptStat({ icon: Icon, label, value, color }: any) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-muted/20 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <Icon className={cn("h-4 w-4", color)} />
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <span className="font-display text-xl font-black text-foreground">{value}</span>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bgColor, desc }: any) {
  return (
    <div className="group rounded-[2.5rem] border border-border/40 bg-card/60 p-8 shadow-soft backdrop-blur-xl transition-all hover:shadow-elevated hover:scale-[1.02]">
      <div className="flex items-center justify-between">
        <div className={`flex h-14 w-14 items-center justify-center rounded-[1.25rem] ${bgColor} transition-transform group-hover:rotate-6`}>
          <Icon className={`h-7 w-7 ${color}`} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{desc}</p>
      </div>
      <div className="mt-8">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
        <h4 className="text-4xl font-display font-black mt-2 tracking-tighter text-foreground">{value}</h4>
      </div>
    </div>
  );
}
