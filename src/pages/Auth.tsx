import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/lib/mock-data";
import { GraduationCap, Loader2, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const signUpSchema = z.object({
  name:       z.string().trim().min(1, "Name required").max(100),
  email:      z.string().trim().email("Invalid email").max(255),
  password:   z.string().min(6, "Min 6 characters").max(72),
  role:       z.enum(["student", "lecturer"]),
  department: z.string().trim().min(1, "Department required").max(100),
  level:      z.string().min(1, "Level required"),
  matric_no:  z.string().trim().max(50).optional(),
});

const signInSchema = z.object({
  email:    z.string().trim().email("Invalid email").max(255),
  password: z.string().min(1, "Password required").max(72),
});

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab]               = useState<"signin" | "signup">("signin");
  const [showPass, setShowPass]     = useState(false);

  const [signInData, setSignInData] = useState({ email: "", password: "" });
  const [signUpData, setSignUpData] = useState({
    name: "", email: "", password: "",
    role: "student" as Role,
    department: "", level: "100", matric_no: "",
  });

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signInSchema.safeParse(signInData);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setSubmitting(true);
    const { error } = await signIn(parsed.data.email, parsed.data.password);
    setSubmitting(false);
    if (error) toast.error(error); else toast.success("Welcome back");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signUpSchema.safeParse(signUpData);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setSubmitting(true);
    const { error } = await signUp({
      email: parsed.data.email, password: parsed.data.password,
      name: parsed.data.name, role: parsed.data.role,
      department: parsed.data.department, level: parsed.data.level,
      matric_no: parsed.data.matric_no,
    });
    if (error) { setSubmitting(false); toast.error(error); return; }
    const { error: siErr } = await signIn(parsed.data.email, parsed.data.password);
    setSubmitting(false);
    if (siErr) toast.success("Account created! Please sign in.");
    else toast.success("Welcome to Attendly!");
  };


  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#f2f2ed",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px 16px",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* ── card ────────────────────────────────────────────────────────────── */}
      <div style={{
        width: "100%", maxWidth: 900,
        borderRadius: 24,
        display: "grid", gridTemplateColumns: "2fr 3fr",
        overflow: "hidden",
        boxShadow: "0 24px 60px rgba(0,0,0,0.12)",
        minHeight: 540,
      }} className="auth-card">

        {/* ── LEFT PANEL ──────────────────────────────────────────────────── */}
        <div style={{
          position: "relative", overflow: "hidden",
          backgroundColor: "#f2f2ed",
          display: "flex", flexDirection: "column",
          padding: "28px 28px 32px",
        }} className="auth-left">

          {/* teal glow blob */}
          <div aria-hidden style={{
            position: "absolute", top: -60, right: -60,
            width: 280, height: 280, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,200,168,0.2) 0%, transparent 65%)",
            pointerEvents: "none",
          }} />
          {/* bottom soft blob */}
          <div aria-hidden style={{
            position: "absolute", bottom: -40, left: -40,
            width: 220, height: 220, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,200,168,0.12) 0%, transparent 65%)",
            pointerEvents: "none",
          }} />

          {/* Logo */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
            <GraduationCap size={20} color="#0a0a0a" />
            <span style={{ fontSize: 16, fontWeight: 800, color: "#0a0a0a", letterSpacing: "-0.3px" }}>
              Attendly
            </span>
          </div>

          {/* Back to website (Desktop Only) */}
          <button
            onClick={() => navigate("/")}
            style={{
              position: "absolute", top: 28, right: 28,
              background: "rgba(10,10,10,0.06)", border: "1px solid rgba(10,10,10,0.1)",
              borderRadius: 999, padding: "6px 14px",
              fontSize: 12, fontWeight: 600, color: "#0a0a0a",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
            }}
          >
            Back to website <ArrowRight size={12} />
          </button>

          {/* Tagline */}
          <div style={{ position: "relative", marginTop: "auto" }}>
            <p style={{
              margin: 0,
              fontFamily: "'Space Grotesk', system-ui",
              fontSize: 22, fontWeight: 800, lineHeight: 1.25,
              color: "#0a0a0a", letterSpacing: "-0.4px",
            }}>
              Track Attendance,<br />
              <span style={{ color: "#00c8a8" }}>Build Integrity.</span>
            </p>

            {/* Dots */}
            <div style={{ display: "flex", gap: 6, marginTop: 20 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  height: 3, borderRadius: 999,
                  width: i === 2 ? 24 : 16,
                  background: i === 2 ? "#0a0a0a" : "rgba(10,10,10,0.2)",
                }} />
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ─────────────────────────────────────────────────── */}
        <div style={{
          backgroundColor: "#ffffff",
          padding: "44px 48px",
          display: "flex", flexDirection: "column", justifyContent: "center",
          overflowY: "auto",
        }}>

           {/* Mobile Logo Link (Common for both tabs) */}
           <div 
              onClick={() => navigate("/")}
              style={{ cursor: "pointer" }}
              className="mobile-logo-link hidden"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
                <div style={{ background: "#0a0a0a", color: "#fff", borderRadius: 8, padding: 6 }}>
                  <GraduationCap size={18} />
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#0a0a0a" }}>Attendly</span>
              </div>
            </div>

          {tab === "signup" ? (
            <>
              <h2 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 700, color: "#0a0a0a", letterSpacing: "-0.5px" }}>
                Create an account
              </h2>
              <p style={{ margin: "0 0 28px", fontSize: 13, color: "#6b6b6b" }}>
                Already have an account?{" "}
                <button onClick={() => setTab("signin")} style={{ background: "none", border: "none", cursor: "pointer", color: "#0a0a0a", fontWeight: 700, fontSize: 13, padding: 0, textDecoration: "underline" }}>
                  Log in
                </button>
              </p>

              <form onSubmit={handleSignUp} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <LightInput placeholder="Full name" value={signUpData.name}
                    onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })} />
                  <Select value={signUpData.role} onValueChange={(v) => setSignUpData({ ...signUpData, role: v as Role })}>
                    <SelectTrigger style={selStyle}>
                      <SelectValue placeholder="I am a..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="lecturer">Lecturer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <LightInput type="email" placeholder="Email" value={signUpData.email}
                    onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })} />
                  <LightInput placeholder="Department" value={signUpData.department}
                    onChange={(e) => setSignUpData({ ...signUpData, department: e.target.value })} />
                </div>

                <div style={{ position: "relative" }}>
                  <LightInput
                    type={showPass ? "text" : "password"}
                    placeholder="Enter your password"
                    value={signUpData.password}
                    onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                    style={{ paddingRight: 44 }}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#aaa", display: "flex" }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {signUpData.role === "student" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <LightInput placeholder="Matric no. (VUG/CSC/21/045)" value={signUpData.matric_no}
                      onChange={(e) => setSignUpData({ ...signUpData, matric_no: e.target.value })} />
                    <Select value={signUpData.level} onValueChange={(v) => setSignUpData({ ...signUpData, level: v })}>
                      <SelectTrigger style={selStyle}>
                        <SelectValue placeholder="Level" />
                      </SelectTrigger>
                      <SelectContent>
                        {["100","200","300","400","500"].map(l => (
                          <SelectItem key={l} value={l}>{l} Level</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginTop: 2 }}>
                  <input type="checkbox" required style={{ width: 15, height: 15, accentColor: "#0a0a0a", cursor: "pointer" }} />
                  <span style={{ fontSize: 12, color: "#6b6b6b" }}>
                    I agree to the{" "}
                    <a href="#" style={{ color: "#0a0a0a", textDecoration: "underline", fontWeight: 600 }}>Terms &amp; Conditions</a>
                  </span>
                </label>

                <BlackBtn type="submit" disabled={submitting}>
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : "Create account"}
                </BlackBtn>
              </form>
            </>
          ) : (
            <>
              <h2 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 700, color: "#0a0a0a", letterSpacing: "-0.5px" }}>
                Welcome back
              </h2>
              <p style={{ margin: "0 0 28px", fontSize: 13, color: "#6b6b6b" }}>
                Don't have an account?{" "}
                <button onClick={() => setTab("signup")} style={{ background: "none", border: "none", cursor: "pointer", color: "#0a0a0a", fontWeight: 700, fontSize: 13, padding: 0, textDecoration: "underline" }}>
                  Sign up
                </button>
              </p>

              <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <LightInput type="email" placeholder="Email" value={signInData.email}
                  onChange={(e) => setSignInData({ ...signInData, email: e.target.value })} />

                <div style={{ position: "relative" }}>
                  <LightInput
                    type={showPass ? "text" : "password"}
                    placeholder="Enter your password"
                    value={signInData.password}
                    onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                    style={{ paddingRight: 44 }}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#aaa", display: "flex" }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <BlackBtn type="submit" disabled={submitting}>
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : "Log in"}
                </BlackBtn>
              </form>
            </>
          )}

        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .auth-card { grid-template-columns: 1fr !important; }
          .auth-left { display: none !important; }
          .mobile-logo-link { display: flex !important; }
        }

        @media (min-width: 641px) {
          .mobile-back-btn { display: none !important; }
        }

        /* Override shadcn SelectItem highlight from pink → teal */
        [role="option"]:focus,
        [role="option"][data-highlighted] {
          background-color: #e6faf6 !important;
          color: #00875a !important;
          outline: none;
        }
      `}</style>
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────
function LightInput({ style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: "100%", height: 44, borderRadius: 10,
        background: "#f8f8f4", border: "1px solid #e4e4e4",
        color: "#0a0a0a", fontSize: 13, padding: "0 14px",
        outline: "none", boxSizing: "border-box",
        fontFamily: "inherit",
        ...style,
      }}
      onFocus={e => (e.currentTarget.style.borderColor = "#0a0a0a")}
      onBlur={e  => (e.currentTarget.style.borderColor = "#e4e4e4")}
    />
  );
}

const selStyle: React.CSSProperties = {
  height: 44, borderRadius: 10,
  background: "#f8f8f4", border: "1px solid #e4e4e4",
  fontSize: 13, color: "#0a0a0a",
};

function BlackBtn({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      style={{
        marginTop: 6, width: "100%", height: 46,
        background: props.disabled ? "#555" : "#0a0a0a",
        color: "#fff", border: "none", borderRadius: 10,
        fontSize: 14, fontWeight: 700,
        cursor: props.disabled ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        transition: "opacity 0.15s", letterSpacing: "-0.1px",
      }}
    >
      {children}
    </button>
  );
}
