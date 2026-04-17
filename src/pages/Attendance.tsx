import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { mockCourses, mockAttendance } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, MapPin, Clock, RefreshCw, CheckCircle2, ScanLine, Shield, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Attendance() {
  const { user } = useAuth();
  if (!user) return null;
  return user.role === "lecturer" ? <LecturerView /> : <StudentView />;
}

function LecturerView() {
  const [courseId, setCourseId] = useState(mockCourses[0].id);
  const [active, setActive] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { setActive(false); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [active]);

  const start = () => {
    setToken(`${courseId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    setSecondsLeft(300);
    setActive(true);
    toast.success("Session started — students can now scan");
  };

  const course = mockCourses.find((c) => c.id === courseId)!;
  const presentCount = active ? Math.floor(((300 - secondsLeft) / 300) * course.students) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Run a session</h1>
        <p className="text-sm text-muted-foreground">Generate a time-limited QR with GPS verification</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Setup */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h3 className="font-display text-lg font-bold">Session settings</h3>
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Course</label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                disabled={active}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              >
                {mockCourses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Schedule</p>
                <p className="mt-1 text-sm font-semibold">{course.schedule}</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Room</p>
                <p className="mt-1 text-sm font-semibold">{course.room}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"><QrCode className="h-3 w-3" /> QR enabled</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary/20 px-2.5 py-1 text-xs font-semibold text-secondary-foreground"><MapPin className="h-3 w-3" /> GPS required</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning"><Shield className="h-3 w-3" /> Anti-duplicate</span>
            </div>
            {!active ? (
              <Button onClick={start} size="lg" className="w-full gradient-primary shadow-glow">
                <QrCode className="mr-2 h-4 w-4" /> Start session (5 min)
              </Button>
            ) : (
              <Button onClick={() => setActive(false)} size="lg" variant="outline" className="w-full">
                Close session
              </Button>
            )}
          </div>
        </div>

        {/* QR display */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-soft">
          {active ? (
            <div className="flex flex-col items-center text-center">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-success animate-pulse" />
                <p className="text-sm font-semibold text-success">Session live</p>
              </div>
              <div className="rounded-3xl bg-white p-5 shadow-elevated animate-pulse-glow">
                <QRCodeSVG value={token} size={200} bgColor="#ffffff" fgColor="#1a0b4d" level="H" />
              </div>
              <div className="mt-5 flex items-center gap-2 text-2xl font-bold tabular-nums text-primary">
                <Clock className="h-5 w-5" />
                {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">QR refreshes when session ends</p>

              <div className="mt-5 grid w-full grid-cols-2 gap-3">
                <div className="rounded-xl bg-success/10 p-3">
                  <p className="text-xs text-success/80">Marked present</p>
                  <p className="mt-1 font-display text-2xl font-bold text-success">{presentCount}</p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Total enrolled</p>
                  <p className="mt-1 font-display text-2xl font-bold">{course.students}</p>
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
    </div>
  );
}

function StudentView() {
  const [step, setStep] = useState<"idle" | "scanning" | "verifying" | "success">("idle");
  const [course] = useState(mockCourses[0]);

  const startScan = () => {
    setStep("scanning");
    setTimeout(() => setStep("verifying"), 1800);
    setTimeout(() => {
      setStep("success");
      toast.success("Attendance marked successfully");
    }, 3300);
  };

  const reset = () => setStep("idle");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Mark attendance</h1>
        <p className="text-sm text-muted-foreground">Scan your lecturer's QR code</p>
      </div>

      <div className="mx-auto max-w-md">
        {step === "idle" && (
          <div className="rounded-3xl border border-border bg-card p-6 shadow-elevated">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl gradient-primary shadow-glow">
              <QrCode className="h-10 w-10 text-primary-foreground" />
            </div>
            <h3 className="mt-5 text-center font-display text-xl font-bold">Ready to scan</h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">Point your camera at the QR code shown by your lecturer.</p>

            <div className="mt-5 space-y-2">
              {[
                { icon: QrCode, text: "Scan the session QR code" },
                { icon: MapPin, text: "Confirm you're inside the classroom" },
                { icon: CheckCircle2, text: "Get instant confirmation" },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                  <s.icon className="h-4 w-4 text-primary" />
                  <p className="text-sm">{s.text}</p>
                </div>
              ))}
            </div>

            <Button onClick={startScan} size="lg" className="mt-6 w-full gradient-primary shadow-glow">
              <ScanLine className="mr-2 h-4 w-4" /> Start scanning
            </Button>
          </div>
        )}

        {step === "scanning" && (
          <div className="rounded-3xl border border-border bg-card p-6 shadow-elevated">
            <p className="text-center text-sm font-semibold text-primary">Scanning QR code...</p>
            <div className="relative mx-auto mt-4 h-64 w-64 overflow-hidden rounded-2xl bg-foreground">
              <div className="absolute inset-6 rounded-xl border-2 border-dashed border-white/40" />
              <div className="absolute left-6 right-6 top-6 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent shadow-glow animate-scan-line" />
              {/* corners */}
              {["top-4 left-4 border-t-4 border-l-4", "top-4 right-4 border-t-4 border-r-4", "bottom-4 left-4 border-b-4 border-l-4", "bottom-4 right-4 border-b-4 border-r-4"].map((c, i) => (
                <div key={i} className={cn("absolute h-6 w-6 rounded border-primary", c)} />
              ))}
            </div>
            <Button variant="ghost" className="mt-4 w-full" onClick={reset}>Cancel</Button>
          </div>
        )}

        {step === "verifying" && (
          <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-elevated">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-secondary/20">
              <MapPin className="h-10 w-10 text-secondary animate-pulse" />
            </div>
            <h3 className="mt-5 font-display text-xl font-bold">Verifying location...</h3>
            <p className="mt-2 text-sm text-muted-foreground">Checking you're inside {course.room}</p>
            <RefreshCw className="mx-auto mt-4 h-5 w-5 animate-spin text-primary" />
          </div>
        )}

        {step === "success" && (
          <div className="rounded-3xl gradient-success p-6 text-center text-success-foreground shadow-elevated animate-fade-up">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h3 className="mt-5 font-display text-2xl font-bold">You're marked present!</h3>
            <p className="mt-2 text-sm opacity-90">{course.code} · {course.title}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-left">
              <div className="rounded-xl bg-white/15 p-3">
                <p className="text-xs opacity-80">Time</p>
                <p className="mt-1 font-bold">{new Date().toLocaleTimeString()}</p>
              </div>
              <div className="rounded-xl bg-white/15 p-3">
                <p className="text-xs opacity-80">Location</p>
                <p className="mt-1 font-bold">{course.room}</p>
              </div>
            </div>
            <Button onClick={reset} variant="secondary" className="mt-5 w-full bg-white text-success hover:bg-white/90">Done</Button>
          </div>
        )}
      </div>

      {/* Recent history */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h3 className="font-display text-lg font-bold">My history</h3>
        <div className="mt-3 space-y-2">
          {mockAttendance.map((a) => {
            const color = a.status === "present" ? "text-success" : a.status === "late" ? "text-warning" : "text-destructive";
            return (
              <div key={a.id} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{a.course}</p>
                  <p className="text-xs text-muted-foreground">{a.date} · {a.method.toUpperCase()}</p>
                </div>
                <span className={cn("text-xs font-bold capitalize", color)}>{a.status}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
