import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchCourses, fetchMyStudentRow, AttendanceSession, AttendanceRecord } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, MapPin, Clock, RefreshCw, CheckCircle2, ScanLine, Shield, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function Attendance() {
  const { user } = useAuth();
  if (!user) return null;
  return user.role === "lecturer" || user.role === "admin" ? <LecturerView /> : <StudentView />;
}

/* ================== LECTURER ================== */

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

  // Currently active session for the selected course
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
        .select("id")
        .eq("session_id", activeSession.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!activeSession,
    refetchInterval: 3000,
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
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const { error } = await supabase.from("attendance_sessions").insert({
        course_id: courseId,
        lecturer_id: user.id,
        token,
        expires_at: expiresAt,
        room: course.room,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Session started — students can now scan");
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
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Run a session</h1>
        <p className="text-sm text-muted-foreground">Generate a time-limited QR for students to scan</p>
      </div>

      {myCourses.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border p-12 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-semibold">No courses yet</p>
          <p className="text-sm text-muted-foreground">Create a course first on the Courses page.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h3 className="font-display text-lg font-bold">Session settings</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Course</label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  disabled={isActive}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                >
                  {myCourses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
                </select>
              </div>
              {course && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs text-muted-foreground">Schedule</p>
                    <p className="mt-1 text-sm font-semibold">{course.schedule || "—"}</p>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs text-muted-foreground">Room</p>
                    <p className="mt-1 text-sm font-semibold">{course.room || "—"}</p>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"><QrCode className="h-3 w-3" /> QR enabled</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning"><Shield className="h-3 w-3" /> Anti-duplicate</span>
              </div>
              {!isActive ? (
                <Button onClick={() => startMutation.mutate()} disabled={startMutation.isPending} size="lg" className="w-full gradient-primary shadow-glow">
                  <QrCode className="mr-2 h-4 w-4" /> Start session (5 min)
                </Button>
              ) : (
                <Button onClick={() => closeMutation.mutate()} size="lg" variant="outline" className="w-full">
                  Close session
                </Button>
              )}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-soft">
            {isActive && activeSession ? (
              <div className="flex flex-col items-center text-center">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-success animate-pulse" />
                  <p className="text-sm font-semibold text-success">Session live</p>
                </div>
                <div className="rounded-3xl bg-white p-5 shadow-elevated animate-pulse-glow">
                  <QRCodeSVG value={activeSession.token} size={200} bgColor="#ffffff" fgColor="#1a0b4d" level="H" />
                </div>
                <p className="mt-2 break-all px-4 text-[10px] font-mono text-muted-foreground">{activeSession.token}</p>
                <div className="mt-3 flex items-center gap-2 text-2xl font-bold tabular-nums text-primary">
                  <Clock className="h-5 w-5" />
                  {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}
                </div>

                <div className="mt-5 grid w-full grid-cols-1 gap-3">
                  <div className="rounded-xl bg-success/10 p-3">
                    <p className="text-xs text-success/80">Marked present</p>
                    <p className="mt-1 font-display text-2xl font-bold text-success">{presentRecs.length}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
                  <QrCode className="h-10 w-10 text-muted-foreground" />
                </div>
                <p className="mt-4 font-display text-lg font-bold">No active session</p>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">Configure your settings and start a session to display the QR code</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================== STUDENT ================== */

function StudentView() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: myStudent } = useQuery({
    queryKey: ["my-student", user?.matricNo],
    queryFn: () => fetchMyStudentRow(user?.matricNo),
    enabled: !!user,
  });

  // History of my own attendance records
  const { data: history = [] } = useQuery({
    queryKey: ["my-attendance", myStudent?.id],
    queryFn: async () => {
      if (!myStudent) return [];
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*, courses(code, title)")
        .eq("student_id", myStudent.id)
        .order("marked_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!myStudent,
  });

  const [step, setStep] = useState<"idle" | "scanning" | "verifying" | "success" | "error">("idle");
  const [tokenInput, setTokenInput] = useState("");
  const [lastRecord, setLastRecord] = useState<{ courseCode: string; room: string } | null>(null);

  const markMutation = useMutation({
    mutationFn: async (token: string) => {
      if (!myStudent) throw new Error("Your matric number doesn't match a roster entry. Ask a lecturer to add you.");
      // Find active session by token
      const { data: session, error: sErr } = await supabase
        .from("attendance_sessions")
        .select("*, courses(code, room)")
        .eq("token", token.trim())
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (sErr) throw sErr;
      if (!session) throw new Error("Invalid or expired QR code");

      const { error } = await supabase.from("attendance_records").insert({
        session_id: session.id,
        course_id: session.course_id,
        student_id: myStudent.id,
        status: "present",
        method: "qr",
      });
      if (error) {
        if (error.code === "23505") throw new Error("Already marked for this session");
        throw error;
      }
      return { courseCode: session.courses?.code ?? "Course", room: session.room };
    },
    onSuccess: (rec) => {
      setLastRecord(rec);
      setStep("success");
      toast.success("Attendance marked");
      qc.invalidateQueries({ queryKey: ["my-attendance", myStudent?.id] });
    },
    onError: (e: Error) => {
      setStep("error");
      toast.error(e.message);
    },
  });

  const submitToken = () => {
    if (!tokenInput.trim()) { toast.error("Paste the QR token"); return; }
    setStep("verifying");
    markMutation.mutate(tokenInput);
  };

  const reset = () => { setStep("idle"); setTokenInput(""); setLastRecord(null); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Mark attendance</h1>
        <p className="text-sm text-muted-foreground">Enter the QR token shown by your lecturer</p>
      </div>

      {!myStudent && (
        <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
          Your matric number <strong>{user?.matricNo || "(not set)"}</strong> isn't on any roster yet. Ask a lecturer or admin to add you on the Students page.
        </div>
      )}

      <div className="mx-auto max-w-md">
        {step === "idle" && (
          <div className="rounded-3xl border border-border bg-card p-6 shadow-elevated">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl gradient-primary shadow-glow">
              <QrCode className="h-10 w-10 text-primary-foreground" />
            </div>
            <h3 className="mt-5 text-center font-display text-xl font-bold">Ready to scan</h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">Enter the session token shown under the lecturer's QR code.</p>

            <div className="mt-5 space-y-2">
              {[
                { icon: QrCode, text: "Read the token under the QR code" },
                { icon: ScanLine, text: "Paste it below" },
                { icon: CheckCircle2, text: "Get instant confirmation" },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                  <s.icon className="h-4 w-4 text-primary" />
                  <p className="text-sm">{s.text}</p>
                </div>
              ))}
            </div>

            <input
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Paste session token"
              className="mt-4 w-full rounded-xl border border-input bg-background px-3 py-2.5 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button onClick={submitToken} disabled={!myStudent || markMutation.isPending} size="lg" className="mt-3 w-full gradient-primary shadow-glow">
              <ScanLine className="mr-2 h-4 w-4" /> Submit
            </Button>
          </div>
        )}

        {step === "verifying" && (
          <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-elevated">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-secondary/20">
              <MapPin className="h-10 w-10 text-secondary animate-pulse" />
            </div>
            <h3 className="mt-5 font-display text-xl font-bold">Verifying...</h3>
            <RefreshCw className="mx-auto mt-4 h-5 w-5 animate-spin text-primary" />
          </div>
        )}

        {step === "success" && lastRecord && (
          <div className="rounded-3xl gradient-success p-6 text-center text-success-foreground shadow-elevated animate-fade-up">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h3 className="mt-5 font-display text-2xl font-bold">You're marked present!</h3>
            <p className="mt-2 text-sm opacity-90">{lastRecord.courseCode}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-left">
              <div className="rounded-xl bg-white/15 p-3">
                <p className="text-xs opacity-80">Time</p>
                <p className="mt-1 font-bold">{new Date().toLocaleTimeString()}</p>
              </div>
              <div className="rounded-xl bg-white/15 p-3">
                <p className="text-xs opacity-80">Location</p>
                <p className="mt-1 font-bold">{lastRecord.room || "—"}</p>
              </div>
            </div>
            <Button onClick={reset} variant="secondary" className="mt-5 w-full bg-white text-success hover:bg-white/90">Done</Button>
          </div>
        )}

        {step === "error" && (
          <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-6 text-center shadow-elevated">
            <p className="font-semibold text-destructive">Couldn't mark attendance</p>
            <Button onClick={reset} variant="outline" className="mt-4 w-full">Try again</Button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h3 className="font-display text-lg font-bold">My history</h3>
        {history.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No records yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {history.map((a: AttendanceRecord & { courses: { code: string; title: string } | null }) => {
              const color = a.status === "present" ? "text-success" : a.status === "late" ? "text-warning" : "text-destructive";
              return (
                <div key={a.id} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{a.courses?.code ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(a.marked_at), { addSuffix: true })} · {a.method.toUpperCase()}
                    </p>
                  </div>
                  <span className={cn("text-xs font-bold capitalize", color)}>{a.status}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
