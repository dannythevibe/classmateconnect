import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, ShieldCheck, QrCode, MapPin, Brain, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const roleCards: { role: Role; title: string; desc: string; icon: any; gradient: string }[] = [
  { role: "student", title: "Student", desc: "Scan QR, track attendance", icon: GraduationCap, gradient: "from-violet-500 to-fuchsia-500" },
  { role: "lecturer", title: "Lecturer", desc: "Run sessions, mark students", icon: BookOpen, gradient: "from-cyan-500 to-blue-500" },
  { role: "admin", title: "Admin", desc: "Manage users & analytics", icon: ShieldCheck, gradient: "from-pink-500 to-orange-400" },
];

const features = [
  { icon: QrCode, label: "QR Sessions" },
  { icon: MapPin, label: "GPS Verified" },
  { icon: Brain, label: "AI Insights" },
  { icon: Sparkles, label: "Real-time" },
];

export default function Landing() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Role | null>(null);

  if (user) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const handleEnter = () => {
    if (!selected) return;
    login(selected);
    navigate("/dashboard");
  };

  return (
    <div className="relative min-h-screen overflow-hidden gradient-mesh">
      {/* Floating decorative blobs */}
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-primary/30 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -right-24 top-40 h-72 w-72 rounded-full bg-accent/30 blur-3xl animate-float" style={{ animationDelay: "1s" }} />
      <div className="pointer-events-none absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-secondary/30 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <div className="container relative mx-auto px-4 py-10 lg:py-16">
        <header className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-glow">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">Attendly</span>
          </div>
          <span className="hidden rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium backdrop-blur md:inline-flex">
            ✨ v1.0 Demo
          </span>
        </header>

        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* LEFT */}
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Smart Student Attendance
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
              Mark attendance in <span className="text-gradient">seconds</span>, not minutes.
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground sm:text-lg">
              QR + GPS-verified sessions, real-time analytics, and AI insights — built for modern campuses.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {features.map((f) => (
                <div key={f.label} className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-2 backdrop-blur">
                  <f.icon className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold">{f.label}</span>
                </div>
              ))}
            </div>

            <ul className="mt-8 space-y-2 text-sm text-muted-foreground">
              {["No setup required — fully demo data", "Try every role: student, lecturer, admin", "Mobile-first, beautifully responsive"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" /> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* RIGHT — role picker */}
          <div className="animate-fade-up" style={{ animationDelay: "0.15s" }}>
            <div className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-elevated backdrop-blur-xl sm:p-8">
              <h2 className="font-display text-xl font-bold">Continue as</h2>
              <p className="mt-1 text-sm text-muted-foreground">Pick a role to explore the dashboard.</p>

              <div className="mt-5 space-y-3">
                {roleCards.map((r) => {
                  const Icon = r.icon;
                  const active = selected === r.role;
                  return (
                    <button
                      key={r.role}
                      onClick={() => setSelected(r.role)}
                      className={cn(
                        "group flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-bounce",
                        active
                          ? "border-primary bg-primary/5 shadow-glow"
                          : "border-border bg-background hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft"
                      )}
                    >
                      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md", r.gradient)}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{r.title}</p>
                        <p className="text-xs text-muted-foreground">{r.desc}</p>
                      </div>
                      <div className={cn("h-5 w-5 rounded-full border-2 transition-smooth", active ? "border-primary bg-primary" : "border-border")}>
                        {active && <CheckCircle2 className="h-full w-full text-primary-foreground" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <Button
                size="lg"
                onClick={handleEnter}
                disabled={!selected}
                className="mt-6 h-12 w-full gradient-primary text-base font-semibold shadow-glow transition-bounce hover:-translate-y-0.5 hover:shadow-elevated disabled:opacity-50"
              >
                Enter Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                Demo mode — no password needed
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
