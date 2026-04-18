import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { GraduationCap, QrCode, MapPin, Brain, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";

const features = [
  { icon: QrCode, label: "QR Sessions" },
  { icon: MapPin, label: "GPS Verified" },
  { icon: Brain, label: "AI Insights" },
  { icon: Sparkles, label: "Real-time" },
];

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden gradient-mesh">
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
          <Button variant="outline" onClick={() => navigate("/auth")}>Sign in</Button>
        </header>

        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
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
              {["Secure auth with role-based access", "Student, lecturer & admin dashboards", "Mobile-first, beautifully responsive"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" /> {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: "0.15s" }}>
            <div className="rounded-3xl border border-border/60 bg-card/80 p-8 shadow-elevated backdrop-blur-xl">
              <h2 className="font-display text-2xl font-bold">Get started</h2>
              <p className="mt-2 text-sm text-muted-foreground">Create an account or sign in to access your dashboard.</p>
              <div className="mt-6 flex flex-col gap-3">
                <Button size="lg" onClick={() => navigate("/auth")}
                  className="h-12 w-full gradient-primary text-base font-semibold shadow-glow transition-bounce hover:-translate-y-0.5 hover:shadow-elevated">
                  Sign up / Sign in <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Real authentication — backed by Supabase
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
