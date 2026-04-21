import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchCourses, fetchMyStudentRow, fetchStudentEnrollments, AttendanceSession, AttendanceRecord } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, MapPin, Clock, RefreshCw, CheckCircle2, ScanLine, Shield, ShieldCheck, BookOpen, AlertTriangle, History, Loader2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { getCurrentLocation, getDistance } from "@/lib/location";
import { addToOfflineQueue } from "@/lib/offline";


import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createNotification, fetchAttendanceRates } from "@/lib/queries";
import SubmitExcuseDialog from "@/components/dialogs/SubmitExcuseDialog";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip } from "recharts";


export default function Attendance() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="mx-auto max-w-5xl">
      {user.role === "lecturer" || user.role === "admin" ? <LecturerView /> : <StudentView />}
    </div>
  );
}

/* ================== LECTURER COMMAND CENTER ================== */

function LecturerView() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: courses = [] } = useQuery({ queryKey: ["courses"], queryFn: fetchCourses });
  const myCourses = useMemo(
    () => courses.filter((c) => user?.role === "admin" || c.lecturer_id === user?.id),
    [courses, user]
  );
  const [courseId, setCourseId] = useState<string>("");

  useEffect(() => {
    if (!courseId && myCourses[0]) setCourseId(myCourses[0].id);
  }, [myCourses, courseId]);

  const { data: activeSession } = useQuery({
    queryKey: ["active-session", courseId],
    queryFn: async (): Promise<AttendanceSession | null> => {
      if (!courseId) return null;
      const { data, error } = await supabase
        .from("attendance_sessions")
        .select("*")
        .eq("course_id", courseId)
        .gt("expires_at", new Date().toISOString())
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as AttendanceSession | null;
    },
    enabled: !!courseId,
    refetchInterval: 5000,
  });

  const { data: presentRecs = [] } = useQuery({
    queryKey: ["session-records", activeSession?.id],
    queryFn: async () => {
      if (!activeSession) return [];
      const { data, error } = await supabase
        .from("attendance_records")
        .select("id, students(name), marked_at")
        .eq("session_id", activeSession.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!activeSession,
    refetchInterval: 3000,
  });

  const { data: pendingExcuses = [] } = useQuery({
    queryKey: ["pending-excuses", courseId],
    queryFn: async () => {
      if (!courseId) return [];
      const { data, error } = await supabase
        .from("attendance_excuses")
        .select("*, students(name)")
        .eq("course_id", courseId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!courseId,
  });

  const excuseMutation = useMutation({
    mutationFn: async ({ id, status, studentId }: { id: string, status: "approved" | "rejected", studentId: string }) => {
      const { error } = await supabase
        .from("attendance_excuses")
        .update({ status })
        .eq("id", id);
      if (error) throw error;

      if (status === "approved") {
        // Update corresponding record
        const { error: rErr } = await supabase
          .from("attendance_records")
          .update({ status: "excused" })
          .eq("excuse_id", id);
          // If no record link yet, we'd need to find the session. For simplicity:
          if (rErr) console.warn("Record update failed", rErr);
      }

      const { data: sRow } = await supabase.from("students").select("matric_no").eq("id", studentId).single();
      if (sRow?.matric_no) {
        const { data: prof } = await supabase.from("profiles").select("user_id").eq("matric_no", sRow.matric_no).maybeSingle();
        if (prof?.user_id) {
          await createNotification(
            prof.user_id,
            `Excuse ${status === "approved" ? "Approved ✅" : "Rejected ❌"}`,
            `Your justification for ${course?.code} attendance has been ${status}.`,
            status === "approved" ? "success" : "warning"
          );
        }
      }
    },
    onSuccess: () => {
      toast.success("Decision recorded");
      qc.invalidateQueries({ queryKey: ["pending-excuses"] });
    }
  });


  const [secondsLeft, setSecondsLeft] = useState(0);
  useEffect(() => {
    if (!activeSession) { setSecondsLeft(0); return; }
    const tick = () => {
      const ms = new Date(activeSession.expires_at).getTime() - Date.now();
      setSecondsLeft(Math.max(0, Math.floor(ms / 1000)));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [activeSession]);

  const startMutation = useMutation({
    mutationFn: async () => {
      if (!user || !courseId) throw new Error("Pick a course");
      const course = myCourses.find((c) => c.id === courseId)!;
      const token = `${courseId.slice(0, 8)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const loc = await getCurrentLocation().catch(() => null);
      const { error } = await supabase.from("attendance_sessions").insert({
        course_id: courseId,
        lecturer_id: user.id,
        token,
        expires_at: expiresAt,
        room: course.room,
        latitude: loc?.latitude,
        longitude: loc?.longitude,
      });

      if (error) throw error;
      const { data: enrollmentRows } = await supabase.from("enrollments").select("student_id").eq("course_id", courseId);
      if (enrollmentRows) {
        for (const row of enrollmentRows) {
          // Note: In a real app, do this in parallel or use a Supabase Edge Function
          const { data: student } = await supabase.from("students").select("matric_no").eq("id", row.student_id).single();
          if (student?.matric_no) {
            const { data: prof } = await supabase.from("profiles").select("user_id").eq("matric_no", student.matric_no).maybeSingle();
            if (prof?.user_id) {
               await createNotification(
                 prof.user_id,
                 "Class Session Live!",
                 `The session for ${course.code} (${course.title}) has started in ${course.room}. Join now!`,
                 "info"
               );
            }
          }
        }
      }

    },
    onSuccess: () => {
      toast.success("Live session started");
      qc.invalidateQueries({ queryKey: ["active-session", courseId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession) return;
      const { error } = await supabase
        .from("attendance_sessions")
        .update({ expires_at: new Date().toISOString() })
        .eq("id", activeSession.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Session closed");
      qc.invalidateQueries({ queryKey: ["active-session", courseId] });
    },
  });

  const course = myCourses.find((c) => c.id === courseId);
  const isActive = !!activeSession && secondsLeft > 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <QrCode className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Attendance Center</h1>
            <p className="text-sm text-muted-foreground">Manage real-time attendance verification.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <Badge variant="outline" className="h-8 rounded-full border-primary/30 bg-primary/5 text-primary animate-pulse font-bold px-4">
              <span className="mr-2 h-2 w-2 rounded-full bg-primary" /> LIVE SESSION
            </Badge>
          )}
        </div>
      </header>

      {myCourses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-border/60 bg-card/40 p-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/60">
            <BookOpen className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="mt-6 text-xl font-bold">No active courses</h3>
          <p className="mt-2 max-w-sm text-muted-foreground">You need to create a course in the "My Courses" section before starting a session.</p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-[2.5rem] border border-border/40 bg-card/60 p-6 shadow-elevated backdrop-blur-xl">
              <h3 className="font-display text-xl font-bold flex items-center gap-2">
                 Session Config
              </h3>
              <div className="mt-6 space-y-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Select Course</Label>
                  <Select value={courseId} onValueChange={setCourseId} disabled={isActive}>
                    <SelectTrigger className="h-12 rounded-2xl bg-background/50">
                      <SelectValue placeholder="Choose a course" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {myCourses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                {course && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-muted/40 p-4 border border-border/40">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Schedule</p>
                      <p className="mt-1 font-bold text-sm truncate">{course.schedule || "None"}</p>
                    </div>
                    <div className="rounded-2xl bg-muted/40 p-4 border border-border/40">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Venue</p>
                      <p className="mt-1 font-bold text-sm truncate">{course.room || "TBA"}</p>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  {!isActive ? (
                    <Button onClick={() => startMutation.mutate()} disabled={startMutation.isPending} size="lg" className="h-14 w-full rounded-2xl gradient-primary text-base font-bold shadow-glow transition-all active:scale-95">
                      {startMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><QrCode className="mr-2 h-5 w-5" /> Start Live Session</>}
                    </Button>
                  ) : (
                    <Button onClick={() => closeMutation.mutate()} size="lg" variant="outline" className="h-14 w-full rounded-2xl border-destructive/30 text-destructive hover:bg-destructive/10 font-bold">
                      Terminate Session
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {isActive && (
              <div className="rounded-[2.5rem] border border-border/40 bg-card/60 p-6 shadow-elevated backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-xl font-bold">Live Roster</h3>
                  <Badge className="bg-emerald-500 text-white border-none">{presentRecs.length} present</Badge>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                  {presentRecs.map((r: any) => (
                    <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-background/40 border border-border/20 animate-in fade-in">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-[10px] font-bold uppercase">{r.students?.name.substring(0,2)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-bold truncate">{r.students?.name}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(r.marked_at).toLocaleTimeString()}</p>
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                  ))}
                  {presentRecs.length === 0 && <p className="text-center py-10 text-sm text-muted-foreground italic">Waiting for students...</p>}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-3 space-y-6">
            <Tabs defaultValue="session" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-muted/30 p-1 mb-6 border border-border/20">
                <TabsTrigger value="session" className="rounded-xl font-bold font-display text-sm data-[state=active]:bg-card data-[state=active]:shadow-soft">Session Control</TabsTrigger>
                <TabsTrigger value="excuses" className="rounded-xl font-bold font-display text-sm relative data-[state=active]:bg-card data-[state=active]:shadow-soft">
                  Justifications
                  {pendingExcuses.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] text-white animate-pulse">
                      {pendingExcuses.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="session">
                <div className="relative h-full min-h-[500px] flex flex-col items-center justify-center rounded-[2.5rem] border border-border/40 bg-card/60 p-8 shadow-elevated backdrop-blur-xl overflow-hidden">
                  {isActive && activeSession ? (
                    <>
                      <div className="absolute top-0 right-0 p-8 text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Time Remaining</p>
                        <div className="mt-1 flex items-center justify-end gap-2 text-3xl font-display font-black text-primary tabular-nums">
                          <Clock className="h-6 w-6" />
                          {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}
                        </div>
                      </div>
                      
                      <div className="relative group">
                        <div className="absolute -inset-8 bg-primary/20 blur-[100px] rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
                        <div className="relative rounded-[3rem] bg-white p-8 shadow-2xl animate-pulse-glow hover:scale-[1.02] transition-transform">
                          <QRCodeSVG value={activeSession.token} size={300} bgColor="#ffffff" fgColor="#1a0b4d" level="H" includeMargin={true} />
                          <div className="absolute inset-x-8 top-8 h-1 bg-primary/40 animate-scan-line blur-[2px]" />
                        </div>
                      </div>
                      
                      <div className="mt-10 text-center">
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground mb-4">Session Token</p>
                        <div className="rounded-xl bg-muted/60 px-6 py-3 border border-border/40 select-none cursor-pointer hover:bg-muted transition-colors active:scale-95" 
                          onClick={() => { navigator.clipboard.writeText(activeSession.token); toast.success("Token copied"); }}>
                          <p className="font-mono text-sm font-bold tracking-tight text-foreground">{activeSession.token}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-center max-w-sm">
                      <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] bg-muted/60 mb-8 border border-border/40 shadow-soft animate-float">
                        <QrCode className="h-12 w-12 text-muted-foreground" />
                      </div>
                      <h3 className="font-display text-3xl font-bold tracking-tight text-foreground">Ready?</h3>
                      <p className="mt-4 text-muted-foreground">Choose a course and start a session to generate a high-security attendance verification token.</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="excuses">
                <div className="rounded-[2.5rem] border border-border/40 bg-card/60 p-8 shadow-elevated backdrop-blur-xl min-h-[500px]">
                  <h3 className="font-display text-xl font-bold mb-6">Pending Justifications</h3>
                  <div className="space-y-4">
                    {pendingExcuses.map((e: any) => (
                      <div key={e.id} className="p-5 rounded-3xl border border-border/10 bg-background/40 hover:bg-background/60 transition-all">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                             <Avatar className="h-10 w-10 border-2 border-primary/10">
                               <AvatarFallback className="font-black text-xs">{e.students?.name.substring(0,2)}</AvatarFallback>
                             </Avatar>
                             <div>
                               <p className="font-bold text-sm tracking-tight">{e.students?.name}</p>
                               <p className="text-[10px] text-muted-foreground uppercase font-black">{new Date(e.created_at).toLocaleDateString()}</p>
                             </div>
                          </div>
                          <div className="flex gap-2">
                             <Button onClick={() => excuseMutation.mutate({ id: e.id, status: "rejected", studentId: e.student_id })} size="sm" variant="ghost" className="h-8 rounded-lg text-destructive hover:bg-destructive/10 font-bold">Declined</Button>
                             <Button onClick={() => excuseMutation.mutate({ id: e.id, status: "approved", studentId: e.student_id })} size="sm" className="h-8 rounded-lg gradient-primary text-white font-bold px-4">Approve</Button>
                          </div>
                        </div>
                        <div className="mt-4 relative">
                           <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20 rounded-full" />
                           <p className="pl-4 text-xs font-medium text-foreground italic leading-relaxed py-1">
                             "{e.reason}"
                           </p>
                        </div>
                        {e.attachment_url && (
                          <a href={e.attachment_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest hover:underline">
                            <FileText className="h-3.5 w-3.5" /> View Evidence
                          </a>
                        )}
                      </div>
                    ))}
                    {pendingExcuses.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                        <CheckCircle2 className="h-12 w-12 mb-4" />
                        <p className="font-bold">No pending excuses.</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

        </div>
      )}
    </div>
  );
}

/* ================== STUDENT CHECK-IN ================== */

function StudentView() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: myStudent } = useQuery({ queryKey: ["my-student", user?.matricNo], queryFn: () => fetchMyStudentRow(user?.matricNo), enabled: !!user });
  const { data: history = [] } = useQuery({
    queryKey: ["my-attendance", myStudent?.id],
    queryFn: async () => {
      if (!myStudent) return [];
      const { data, error } = await supabase.from("attendance_records").select("*, courses(id, code, title)").eq("student_id", myStudent.id).order("marked_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!myStudent,
  });

  const trendData = useMemo(() => {
    return [...history].reverse().slice(-10).map((h, i) => ({
      index: i + 1,
      status: h.status === "present" || h.status === "late" || h.status === "excused" ? 100 : 0
    }));
  }, [history]);

  const [step, setStep] = useState<"idle" | "verifying" | "success" | "error">("idle");

  const [tokenInput, setTokenInput] = useState("");
  const [lastRecord, setLastRecord] = useState<{ courseCode: string; room: string } | null>(null);

  const markMutation = useMutation({
    mutationFn: async (token: string) => {
      if (!myStudent) throw new Error("Please ask an admin to add you to the roster.");
      
      const { data: session, error: sErr } = await supabase
        .from("attendance_sessions")
        .select("*, courses(code, room)")
        .eq("token", token.trim())
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (sErr) throw sErr;
      if (!session) throw new Error("Invalid or expired session token");

      // Verify Enrollment
      const enrollments = await fetchStudentEnrollments(myStudent.id);
      if (!enrollments.includes(session.course_id)) {
        throw new Error("You are not registered for this course. Please join it from the Courses page first.");
      }

      // 📍 Location Validation
      const studentLoc = await getCurrentLocation();
      const metadata: any = {};
      
      if (session.latitude && session.longitude) {
        const dist = getDistance(studentLoc.latitude, studentLoc.longitude, session.latitude, session.longitude);
        metadata.distance_from_center = Math.round(dist * 10) / 10;
        
        if (dist > 100) {
          throw new Error(`Location Out of Range: You are ${Math.round(dist)}m away from the class. Maximum radius is 100m.`);
        }
      } else {
        metadata.warning = "Session location not set by lecturer";
      }

      // ⏱️ Late Detection
      const minsDiff = (Date.now() - new Date(session.started_at).getTime()) / 60000;
      const status = minsDiff > (session.late_cutoff_mins || 15) ? "late" : "present";
      if (status === "late") metadata.late_minutes = Math.round(minsDiff);

      // 📊 Anomaly & Threshold Detection
      const { data: records } = await supabase.from("attendance_records").select("status").eq("student_id", myStudent.id).eq("course_id", session.course_id);
      const totalRecs = (records?.length || 0) + 1;
      const presentRecs = (records?.filter((r: any) => r.status === "present" || r.status === "late" || r.status === "excused").length || 0) + 1;
      const rate = Math.round((presentRecs / totalRecs) * 100);

      if (rate < 70 && totalRecs >= 3) {
        await createNotification(
          user.id, 
          "Low Attendance Warning", 
          `Your attendance in ${session.courses?.code} has dropped to ${rate}%. Stay above 70% to remain eligible!`,
          "warning"
        );
        // Also notify lecturer (via course)
        const { data: cData } = await supabase.from("courses").select("lecturer_id").eq("id", session.course_id).single();
        if (cData?.lecturer_id) {
          await createNotification(
            cData.lecturer_id,
            "Student at Risk",
            `${user.name} has dropped below 70% attendance in ${session.courses?.code}.`,
            "warning"
          );
        }

      }

      const { data: recentCheckins } = await supabase
        .from("attendance_records")
        .select("marked_at, latitude, longitude")
        .eq("student_id", myStudent.id)
        .order("marked_at", { ascending: false })
        .limit(1);

      if (recentCheckins && recentCheckins[0]) {
        const last = recentCheckins[0];
        const timeDiff = (Date.now() - new Date(last.marked_at).getTime()) / 60000;
        if (timeDiff < 5) {
          metadata.anomaly = "Multiple check-ins within 5 minutes";
        }
        if (last.latitude && last.longitude) {
           const travelDist = getDistance(studentLoc.latitude, studentLoc.longitude, last.latitude, last.longitude);
           if (travelDist > 1000 && timeDiff < 10) {
             metadata.anomaly = "Excessive travel speed (Integrity Flag)";
           }
        }
      }

      const payload = { 
        session_id: session.id, 
        course_id: session.course_id, 
        student_id: myStudent.id, 
        status, 
        method: "qr" as const,
        latitude: studentLoc.latitude,
        longitude: studentLoc.longitude,
        metadata
      };

      if (!navigator.onLine) {
        addToOfflineQueue(payload);
        setStep("success");
        setLastRecord({ courseCode: session.courses.code, room: session.courses.room });
        return;
      }

      const { error } = await supabase.from("attendance_records").insert(payload as any);

      if (error) { 
        if (error.code === "23505") throw new Error("Already marked!"); 
        // If it's a network error, queue it
        if (error.message.includes("fetch") || error.message.includes("network")) {
          addToOfflineQueue(payload);
          setStep("success");
          setLastRecord({ courseCode: session.courses.code, room: session.courses.room });
          return;
        }
        throw error; 
      }

      return { courseCode: session.courses?.code ?? "Course", room: session.room };
    },
    onSuccess: (rec) => { setLastRecord(rec); setStep("success"); toast.success("Checked in!"); qc.invalidateQueries({ queryKey: ["my-attendance", myStudent?.id] }); },
    onError: (e: Error) => { setStep("error"); toast.error(e.message); },
  });

  const submitToken = () => { if (!tokenInput.trim()) return; setStep("verifying"); markMutation.mutate(tokenInput); };
  const reset = () => { setStep("idle"); setTokenInput(""); setLastRecord(null); };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-black tracking-tighter text-foreground">Check-In</h1>
        <p className="text-sm text-muted-foreground font-medium">Verify your attendance for today's lectures.</p>
      </header>

      <div className="mx-auto max-w-md">
        {step === "idle" && (
          <div className="rounded-[2.5rem] border border-border/40 bg-card/60 p-8 shadow-elevated backdrop-blur-xl animate-fade-up">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] gradient-primary shadow-glow animate-float">
              <ScanLine className="h-10 w-10 text-white" />
            </div>
            <h3 className="mt-8 text-center font-display text-2xl font-bold text-foreground">Ready to Scan?</h3>
            <p className="mt-2 text-center text-sm text-muted-foreground px-4">Paste the session token displayed by your lecturer or enter it below.</p>

            <div className="mt-8 space-y-3">
              <div className="relative">
                <Input value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder="Type session token..." 
                  className="h-14 rounded-2xl bg-background/50 pl-6 font-mono text-xs uppercase tracking-widest placeholder:tracking-normal placeholder:font-sans" />
              </div>
              <Button onClick={submitToken} disabled={!myStudent || markMutation.isPending} size="lg" className="h-14 w-full rounded-2xl gradient-primary text-base font-black shadow-glow transition-all active:scale-95">
                {markMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify Attendance"}
              </Button>
            </div>
            {!myStudent && <p className="mt-6 text-center text-[10px] text-destructive font-black uppercase tracking-widest">Student profile missing from system</p>}
          </div>
        )}

        {step === "verifying" && (
          <div className="rounded-[2.5rem] border border-border/40 bg-card/60 p-12 text-center shadow-elevated backdrop-blur-xl">
            <div className="mx-auto relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl animate-pulse" />
              <div className="relative flex h-24 w-24 mx-auto items-center justify-center rounded-[2rem] bg-primary/10">
                <ShieldCheck className="h-12 w-12 text-primary animate-pulse" />
              </div>
            </div>
            <h3 className="mt-8 font-display text-2xl font-bold">Securing Entry...</h3>
            <p className="mt-2 text-sm text-muted-foreground animate-pulse">Running cryptographic verification</p>
          </div>
        )}

        {step === "success" && lastRecord && (
          <div className="rounded-[2.5rem] gradient-success p-1 h-[400px]">
            <div className="h-full w-full rounded-[2.25rem] bg-card/40 backdrop-blur-xl p-8 flex flex-col items-center justify-center text-center animate-fade-up">
              <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-emerald-500 text-white shadow-lg animate-float">
                <CheckCircle2 className="h-14 w-14" />
              </div>
              <h3 className="mt-8 font-display text-3xl font-black text-foreground tracking-tight">Verified!</h3>
              <p className="mt-2 text-lg font-bold text-primary">{lastRecord.courseCode}</p>
              
              <div className="mt-8 flex gap-4 w-full">
                <div className="flex-1 rounded-2xl bg-background/50 p-4 border border-border/20">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</p>
                  <p className="mt-1 font-bold text-emerald-500">PRESENT</p>
                </div>
                <div className="flex-1 rounded-2xl bg-background/50 p-4 border border-border/20">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Room</p>
                  <p className="mt-1 font-bold truncate">{lastRecord.room || "Campus"}</p>
                </div>
              </div>
              <Button onClick={reset} size="lg" className="mt-8 w-full rounded-2xl gradient-primary font-bold shadow-glow">Sweet!</Button>
            </div>
          </div>
        )}

        {step === "error" && (
          <div className="rounded-[2.5rem] border border-destructive/20 bg-destructive/5 p-8 text-center shadow-lg animate-fade-up">
             <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-6">
               <AlertTriangle className="h-10 w-10" />
             </div>
            <h3 className="text-xl font-bold text-destructive">Verification Failed</h3>
            <p className="mt-2 text-sm text-destructive/80 font-medium">This token might be expired or invalid. Please try scanning again.</p>
            <Button onClick={reset} variant="outline" className="mt-8 rounded-2xl border-destructive/20 text-destructive hover:bg-destructive/10">Back to Scanner</Button>
          </div>
        )}
      </div>

      {user.role === "student" && history.length > 0 && (
        <div className="rounded-[2.5rem] border border-border/40 bg-card/60 p-8 shadow-elevated backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display text-xl font-bold tracking-tight">Personal Attendance Trend</h3>
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest text-primary border-primary/30">Last 10 Days</Badge>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis hide dataKey="index" />
              <YAxis hide domain={[0, 100]} />
              <RechartsTooltip 
                contentStyle={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "16px" }}
                labelClassName="hidden"
                formatter={(value: number) => [value === 100 ? "Present" : "Absent", "Status"]}
              />
              <Area type="monotone" dataKey="status" stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#trendGradient)" animationDuration={1000} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-12 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
             <History className="h-5 w-5 text-primary" />
             <h3 className="font-display text-xl font-bold tracking-tight text-foreground">Attendance Timeline</h3>
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{history.length} Records</p>
        </div>
        
        <div className="relative space-y-6 before:absolute before:left-[19px] before:top-2 before:h-[calc(100%-16px)] before:w-0.5 before:bg-border/40">
          {history.map((a: any, idx: number) => {
            const status = a.status;
            return (
              <div key={a.id} className="relative pl-12 animate-in fade-in slide-in-from-left-4" style={{ animationDelay: `${idx * 50}ms` }}>
                <div className={cn(
                  "absolute left-0 top-1 h-10 w-10 rounded-full border-4 border-background flex items-center justify-center shadow-lg z-10",
                  status === "present" ? "bg-emerald-500 text-white" : status === "late" ? "bg-amber-500 text-white" : status === "excused" ? "bg-blue-500 text-white" : "bg-destructive text-white"
                )}>
                  {status === "present" ? <CheckCircle2 className="h-5 w-5" /> : status === "late" ? <Clock className="h-5 w-5" /> : status === "excused" ? <Shield className="h-5 w-5" /> : <ScanLine className="h-5 w-5" />}
                </div>
                
                <div className="rounded-3xl border border-border/40 bg-card/40 p-6 backdrop-blur-xl transition-all hover:bg-card/60 hover:shadow-elevated">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-base font-black tracking-tight">{a.courses?.code}</p>
                        <Badge className={cn(
                          "rounded-md border-none font-black text-[9px] uppercase tracking-widest",
                          status === "late" ? "bg-amber-500/10 text-amber-600" : status === "excused" ? "bg-blue-500/10 text-blue-600" : status === "present" ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
                        )}>
                          {status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm font-bold text-muted-foreground mt-1">{a.courses?.title}</p>
                    </div>
                    <div className="flex items-center gap-4">
                       {(status === "absent" || status === "late") && !a.excuse_id && (
                         <SubmitExcuseDialog 
                           studentId={myStudent!.id} 
                           courseId={a.courses.id} 
                           sessionId={a.session_id} 
                           courseCode={a.courses.code} 
                         />
                       )}
                       <div className="text-left sm:text-right">
                          <p className="text-xs font-black text-foreground uppercase tracking-tighter">{new Date(a.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          <p className="text-[10px] font-bold text-muted-foreground mt-0.5 uppercase tracking-widest">{new Date(a.marked_at).toLocaleDateString()}</p>
                       </div>
                    </div>
                  </div>


                  {a.metadata && Object.keys(a.metadata).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border/20 grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {a.metadata.distance_from_center && (
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Proximity</p>
                          <p className="text-xs font-bold mt-1 flex items-center gap-1"><MapPin className="h-3 w-3" /> {a.metadata.distance_from_center}m</p>
                        </div>
                      )}
                      {a.metadata.late_minutes && (
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Delay</p>
                          <p className="text-xs font-bold mt-1 text-amber-600">{a.metadata.late_minutes} mins</p>
                        </div>
                      )}
                      {a.metadata.anomaly && (
                        <div className="col-span-2 sm:col-span-1">
                          <p className="text-[9px] font-black uppercase tracking-widest text-destructive">Anomaly Flag</p>
                          <p className="text-[10px] font-bold mt-1 text-destructive italic">{a.metadata.anomaly}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {history.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
              <History className="h-12 w-12 mb-4" />
              <p className="font-bold">No academic footprint detected.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
