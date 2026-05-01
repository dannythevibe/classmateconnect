import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCourses, fetchEnrollmentCounts, fetchAttendanceRates, fetchStudentEnrollments, enrollInCourse, unenrollFromCourse, fetchMyStudentRow } from "@/lib/queries";
import { Input } from "@/components/ui/input";
import { Search, Users, Clock, MapPin, TrendingUp, BookOpen, PlusCircle, CheckCircle2, Filter, GraduationCap, XCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import NewCourseDialog from "@/components/dialogs/NewCourseDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Courses() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "fit" | "enrolled">("fit");

  const { data: courses = [], isLoading } = useQuery({ queryKey: ["courses"], queryFn: fetchCourses });
  const ids = useMemo(() => courses.map((c) => c.id), [courses]);
  
  const { data: myStudent } = useQuery({ 
    queryKey: ["my-student", user?.matric_no], 
    queryFn: () => fetchMyStudentRow(user?.matric_no), 
    enabled: !!user && user.role === "student" 
  });

  const { data: myEnrollments = [] } = useQuery({
    queryKey: ["my-enrollments", myStudent?.id],
    queryFn: () => fetchStudentEnrollments(myStudent!.id),
    enabled: !!myStudent,
  });

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

  const enrollMutation = useMutation({
    mutationFn: async (courseId: string) => {
      if (!myStudent) throw new Error("Student profile not found. Contact Admin.");
      await enrollInCourse(myStudent.id, courseId);
    },
    onSuccess: () => {
      toast.success("Enrolled successfully");
      qc.invalidateQueries({ queryKey: ["my-enrollments"] });
      qc.invalidateQueries({ queryKey: ["enrollment-counts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unenrollMutation = useMutation({
    mutationFn: async (courseId: string) => {
      if (!myStudent) return;
      await unenrollFromCourse(myStudent.id, courseId);
    },
    onSuccess: () => {
      toast.success("Dropped course");
      qc.invalidateQueries({ queryKey: ["my-enrollments"] });
      qc.invalidateQueries({ queryKey: ["enrollment-counts"] });
    },
  });

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch = c.code.toLowerCase().includes(q.toLowerCase()) || c.title.toLowerCase().includes(q.toLowerCase());
      if (!matchesSearch) return false;

      if (user?.role === "student") {
        if (filterMode === "fit") {
          const deptMatch = !c.department || c.department.toLowerCase() === user.department?.toLowerCase();
          const levelMatch = !c.level || c.level === user.level || (user.matric_no && c.level === user.matric_no.substring(0, 1) + "00"); // Fallback for 100, 200 etc
          return deptMatch && levelMatch;
        }
        if (filterMode === "enrolled") {
          return myEnrollments.includes(c.id);
        }
      }
      return true;
    });
  }, [courses, q, filterMode, user, myEnrollments]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
           <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-glow">
             <BookOpen className="h-7 w-7 text-white" />
           </div>
           <div>
             <h1 className="font-display text-4xl font-black tracking-tighter text-foreground">Course Catalog</h1>
             <p className="text-sm text-muted-foreground font-medium">Explore and register for your academic path.</p>
           </div>
        </div>
        <div className="flex items-center gap-3">
           {user?.role !== "student" && <NewCourseDialog />}
        </div>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border-b border-border/40 pb-6">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            value={q} 
            onChange={(e) => setQ(e.target.value)} 
            placeholder="Search code, title or lecturer..." 
            className="h-12 pl-12 rounded-2xl bg-card border-border/40 font-medium shadow-soft" 
          />
        </div>

        {user?.role === "student" && (
          <div className="flex bg-muted/30 p-1.5 rounded-[1.25rem] border border-border/40 backdrop-blur-xl shrink-0">
             <button 
               onClick={() => setFilterMode("fit")}
               className={cn("px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all", filterMode === "fit" ? "bg-background shadow-lg text-primary" : "text-muted-foreground hover:text-foreground")}
             >
               My Fit
             </button>
             <button 
               onClick={() => setFilterMode("enrolled")}
               className={cn("px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all", filterMode === "enrolled" ? "bg-background shadow-lg text-primary" : "text-muted-foreground hover:text-foreground")}
             >
               Enrolled
             </button>
             <button 
               onClick={() => setFilterMode("all")}
               className={cn("px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all", filterMode === "all" ? "bg-background shadow-lg text-primary" : "text-muted-foreground hover:text-foreground")}
             >
               Discovery
             </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map(i => <div key={i} className="h-64 rounded-[2.5rem] bg-muted/20 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-border/60 bg-card/40 p-24 text-center">
          <div className="h-24 w-24 rounded-full bg-muted/60 flex items-center justify-center mb-8">
            <GraduationCap className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-black tracking-tighter">No courses found</h3>
          <p className="mt-4 max-w-sm text-muted-foreground font-medium leading-relaxed">
            {filterMode === "fit" 
              ? "We couldn't find any courses matching your level and department. Try 'Discovery' to browser all classes." 
              : "Try adjusting your search or switching filter modes."}
          </p>
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const isEnrolled = myEnrollments.includes(c.id);
            const isBusy = enrollMutation.isPending || unenrollMutation.isPending;

            return (
              <div key={c.id} className="group relative overflow-hidden rounded-[2.5rem] border border-border/40 bg-card/60 shadow-elevated backdrop-blur-xl transition-all hover:scale-[1.02] hover:shadow-2xl">
                <div className={cn("h-40 bg-gradient-to-br p-8 text-white relative", c.color)}>
                  <div className="absolute top-8 right-8 flex flex-col items-end gap-2">
                     {c.level && <Badge className="bg-white/20 backdrop-blur-md text-white border-none font-black text-[10px] py-1 px-3 rounded-lg uppercase tracking-widest">{c.level}L</Badge>}
                     {c.department && <Badge className="bg-white/20 backdrop-blur-md text-white border-none font-black text-[10px] py-1 px-3 rounded-lg uppercase tracking-widest truncate max-w-[100px]">{c.department}</Badge>}
                  </div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] opacity-80">{c.code}</p>
                  <h3 className="mt-2 font-display text-2xl font-black leading-tight tracking-tighter">{c.title}</h3>
                  <p className="text-xs font-bold opacity-70 mt-2 truncate">Lec: {c.lecturer_name}</p>
                </div>
                
                <div className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Schedule</p>
                       <p className="text-sm font-bold truncate flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-primary" /> {c.schedule || "TBA"}</p>
                    </div>
                    <div className="space-y-1 text-right">
                       <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Location</p>
                       <p className="text-sm font-bold truncate flex items-center justify-end gap-2"><MapPin className="h-3.5 w-3.5 text-primary" /> {c.room || "TBA"}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/20 pt-6">
                    <div className="flex items-center gap-4">
                      <div className="flex -space-x-2">
                        {[1,2,3].map(i => <div key={i} className="h-6 w-6 rounded-full border-2 border-card bg-muted" />)}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{counts[c.id] ?? 0} ENROLLED</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span className="font-black text-[10px] tracking-widest">{rates[c.id] ?? 0}%</span>
                    </div>
                  </div>

                  {user?.role === "student" && (
                    <div className="pt-2">
                      {isEnrolled ? (
                        <div className="flex gap-2">
                          <Button variant="outline" className="flex-1 h-12 rounded-2xl border-emerald-500/30 text-emerald-600 bg-emerald-500/5 font-black text-xs uppercase tracking-widest hover:bg-emerald-500/10 cursor-default">
                             <CheckCircle2 className="mr-2 h-4 w-4" /> Registered
                          </Button>
                          <Button 
                            disabled={isBusy} 
                            onClick={() => unenrollMutation.mutate(c.id)}
                            variant="ghost" 
                            className="h-12 w-12 rounded-2xl text-muted-foreground hover:text-white hover:bg-destructive"
                          >
                            <XCircle className="h-5 w-5" />
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          disabled={isBusy}
                          onClick={() => enrollMutation.mutate(c.id)}
                          className="w-full h-12 rounded-2xl gradient-primary font-black text-xs uppercase tracking-widest shadow-glow group"
                        >
                          {enrollMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><PlusCircle className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" /> Enroll Now</>}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
