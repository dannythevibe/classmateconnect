import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldCheck, Loader2, Eye, EyeOff, GraduationCap, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function AdminAuth() {
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "admin") navigate("/admin", { replace: true });
      else navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter your credentials");
      return;
    }
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password.trim());
    setSubmitting(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Security clearance verified");
      // Navigation handled by useEffect above once user state updates
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#f2f2ed",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px 16px",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{
        width: "100%", maxWidth: 900,
        borderRadius: 24,
        display: "grid", gridTemplateColumns: "2fr 3fr",
        overflow: "hidden",
        boxShadow: "0 24px 60px rgba(0,0,0,0.12)",
        minHeight: 540,
      }}>
        {/* LEFT */}
        <div style={{
          position: "relative", overflow: "hidden",
          backgroundColor: "#f2f2ed",
          display: "flex", flexDirection: "column",
          padding: "28px 28px 32px",
        }}>
          <div aria-hidden style={{
            position: "absolute", top: -60, right: -60,
            width: 280, height: 280, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,200,168,0.2) 0%, transparent 65%)",
            pointerEvents: "none",
          }} />
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
            <GraduationCap size={20} color="#0a0a0a" />
            <span style={{ fontSize: 16, fontWeight: 800, color: "#0a0a0a", letterSpacing: "-0.3px" }}>
              Attendly
            </span>
          </div>
          <div style={{ position: "relative", marginTop: "auto" }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: "#0a0a0a", display: "flex",
              alignItems: "center", justifyContent: "center", marginBottom: 20,
            }}>
              <ShieldCheck size={24} color="#fff" />
            </div>
            <p style={{
              margin: 0,
              fontFamily: "'Space Grotesk', system-ui",
              fontSize: 22, fontWeight: 800, lineHeight: 1.25,
              color: "#0a0a0a", letterSpacing: "-0.4px",
            }}>
              Administrative<br />
              <span style={{ color: "#00c8a8" }}>Command Center.</span>
            </p>
            <p style={{ fontSize: 13, color: "#6b6b6b", marginTop: 12, fontWeight: 500 }}>
              Management portal for course analytics and institutional reporting.
            </p>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{
          backgroundColor: "#ffffff",
          padding: "44px 48px",
          display: "flex", flexDirection: "column", justifyContent: "center",
        }}>
          <h2 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 700, color: "#0a0a0a", letterSpacing: "-0.5px" }}>
            Admin Login
          </h2>
          <p style={{ margin: "0 0 32px", fontSize: 13, color: "#6b6b6b" }}>
            Enter your credentials to access the admin console.
          </p>

          <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6b6b6b", marginLeft: 4 }}>
                Email
              </label>
              <input
                type="email"
                placeholder="admin@attendly.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6b6b6b", marginLeft: 4 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{
                    position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", color: "#aaa", cursor: "pointer", display: "flex",
                  }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                marginTop: 12, width: "100%", height: 48,
                background: submitting ? "#555" : "#0a0a0a",
                color: "#fff", border: "none", borderRadius: 10,
                fontSize: 14, fontWeight: 700,
                cursor: submitting ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : "Enter Dashboard"}
            </button>
          </form>

          <div style={{ marginTop: 32, textAlign: "center" }}>
            <button
              onClick={() => navigate("/")}
              style={{
                background: "none", border: "none", color: "#6b6b6b",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6, margin: "0 auto",
              }}
            >
              Return to Website <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", height: 44, borderRadius: 10,
  background: "#f8f8f4", border: "1px solid #e4e4e4",
  color: "#0a0a0a", fontSize: 13, padding: "0 14px",
  outline: "none", boxSizing: "border-box",
  fontFamily: "inherit",
};
