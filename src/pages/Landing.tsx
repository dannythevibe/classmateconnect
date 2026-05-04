import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { GraduationCap, CheckCircle2, ChevronDown, ArrowRight, Menu, X } from "lucide-react";

// ── colour tokens (Lawtrades-exact palette) ──────────────────────────────────
const C = {
  bg:         "#f2f2ed",   // warm cream
  black:      "#0a0a0a",
  textMuted:  "#6b6b6b",
  teal:       "#00c8a8",   // accent / highlight
  tealLight:  "#e6faf6",
  cardBg:     "#ffffff",
  cardBorder: "#e4e4e4",
  tagDark:    "#1a1a1a",
  tagDarkBg:  "#f0f0f0",
  tagGreen:   "#00875a",
  tagGreenBg: "#e3f9f0",
};

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  return (
    <div style={{ backgroundColor: C.bg, height: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Inter', system-ui, sans-serif", color: C.black, overflow: "hidden" }}>

      {/* Teal glow blob — top right (matches reference) */}
      <div
        aria-hidden
        style={{
          position: "fixed", top: -120, right: -120,
          width: 580, height: 520, borderRadius: "50%", pointerEvents: "none", zIndex: 0,
          background: "radial-gradient(circle, rgba(0,200,168,0.22) 0%, transparent 65%)",
        }}
      />

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <header style={{ 
        position: "relative", zIndex: 100, width: "100%", 
        display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box" 
      }} className="landing-header">

        {/* Logo — far left */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ background: C.black, borderRadius: 8, padding: 6 }}>
            <GraduationCap size={18} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.4px", color: C.black }}>Attendly</span>
        </div>

        {/* Nav links — centre (Desktop only) */}
        <nav style={{ display: "flex", alignItems: "center", gap: 32, position: "absolute", left: "50%", transform: "translateX(-50%)" }} className="desktop-nav">
          {[["For Students", true], ["For Lecturers", true], ["About", false], ["Features", true]].map(([label, arrow]) => (
            <a
              key={label as string}
              href="#"
              style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 500, color: C.black, textDecoration: "none", opacity: 0.75 }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "0.75")}
            >
              {label as string}
              {arrow && <ChevronDown size={13} />}
            </a>
          ))}
        </nav>

        {/* CTA buttons + Hamburger */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div className="desktop-ctas" style={{ alignItems: "center", gap: 4 }}>
            <button
              onClick={() => navigate("/auth")}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, color: C.black, padding: "0 12px" }}
            >
              Log In
            </button>
            <button
              onClick={() => navigate("/auth")}
              style={{ background: C.black, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              Get Started
            </button>
          </div>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{ 
              background: "rgba(10,10,10,0.05)", border: "none", borderRadius: 8, 
              width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", 
              cursor: "pointer", zIndex: 110 
            }}
            className="mobile-hamburger"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Drawer */}
        {isMenuOpen && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: C.bg, zIndex: 105, display: "flex", flexDirection: "column",
            padding: "80px 24px 40px", animateIn: "fade-in"
          }} className="mobile-drawer">
            <nav style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {[["For Students", true], ["For Lecturers", true], ["About", false], ["Features", true]].map(([label]) => (
                <a
                  key={label as string}
                  href="#"
                  onClick={() => setIsMenuOpen(false)}
                  style={{ fontSize: 24, fontWeight: 700, color: C.black, textDecoration: "none", letterSpacing: "-0.5px" }}
                >
                  {label as string}
                </a>
              ))}
            </nav>
            
            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                onClick={() => navigate("/auth")}
                style={{ width: "100%", height: 54, background: "transparent", border: `1.5px solid ${C.cardBorder}`, borderRadius: 12, fontSize: 16, fontWeight: 700 }}
              >
                Log In
              </button>
              <button
                onClick={() => navigate("/auth")}
                style={{ width: "100%", height: 54, background: C.black, color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700 }}
              >
                Get Started Free
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <main style={{ position: "relative", zIndex: 10, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 1200, width: "100%", margin: "0 auto", padding: "0 48px", paddingTop: "48px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }} className="hero-grid">

          {/* Left — copy */}
          <div>
            <h1 style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", fontSize: "clamp(2.8rem, 5vw, 4rem)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-1.5px", color: C.black, margin: "0 0 24px" }}>
              Top attendance tracking,<br />
              on{" "}
              <span style={{ color: C.teal, position: "relative", display: "inline-block" }}>
                demand.
                <svg viewBox="0 0 160 8" fill="none" style={{ position: "absolute", bottom: -4, left: 0, width: "100%", overflow: "visible" }} aria-hidden>
                  <path d="M2 5.5C32 2 68 7 104 4.5 128 3 148 6 158 4.5" stroke={C.teal} strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            <p style={{ fontSize: 15.5, color: C.textMuted, lineHeight: 1.7, maxWidth: 400, margin: "0 0 36px", fontWeight: 400 }}>
              Departments of all sizes — from small colleges to federal universities — use
              Attendly's tech-enabled platform to track attendance accurately and
              scale their academic integrity work.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => navigate("/auth")}
                style={{ background: C.black, color: "#fff", border: "none", borderRadius: 8, padding: "13px 26px", fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: "-0.2px" }}
              >
                Start Tracking
              </button>
              <button
                onClick={() => navigate("/auth")}
                style={{ background: "transparent", color: C.black, border: `1.5px solid ${C.cardBorder}`, borderRadius: 8, padding: "13px 26px", fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
              >
                Join as Lecturer <ArrowRight size={15} />
              </button>
            </div>
          </div>

          {/* Right — floating cards */}
          <div style={{ position: "relative", height: 440 }} className="hero-cards">

            {/* Dashed connector arc */}
            <svg viewBox="0 0 480 440" fill="none" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
              <path d="M 305 105 C 365 190, 185 285, 148 375" stroke="#cccccc" strokeWidth="1.5" strokeDasharray="6 5" strokeLinecap="round" />
            </svg>

            {/* Card 1 — student profile (top right) */}
            <div style={{ position: "absolute", top: 0, right: 0, width: 240, background: C.cardBg, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: "16px", boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                {/* Greyscale avatar — matches Lawtrades b&w photo style */}
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "linear-gradient(135deg,#555 0%,#222 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                  C
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: C.black }}>Chioma Obi</p>
                  <p style={{ margin: 0, fontSize: 11.5, color: C.textMuted }}>Student</p>
                  <p style={{ margin: "1px 0 0", fontSize: 10, color: "#aaa" }}>Less 4 absences</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Tag bg={C.tagDarkBg} color={C.tagDark}>GPS Verified</Tag>
                <Tag bg={C.tagGreenBg} color={C.tagGreen}>Present</Tag>
              </div>
            </div>

            {/* Card 2 — session type tags (middle left) */}
            <div style={{ position: "absolute", top: "42%", left: 0, background: C.cardBg, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: "14px 16px", boxShadow: "0 4px 24px rgba(0,0,0,0.07)", minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CheckCircle2 size={15} color={C.textMuted} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.black }}>Adaeze Eze</p>
                  <p style={{ margin: 0, fontSize: 11, color: C.textMuted }}>Lecturer · Computer Science</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Tag bg="#fff3e0" color="#b45309">QR Code</Tag>
                <Tag bg={C.tagGreenBg} color={C.tagGreen}>Full Session</Tag>
              </div>
            </div>

            {/* Card 3 — live session log (bottom right) */}
            <div style={{ position: "absolute", bottom: 4, right: 20, width: 224, background: C.cardBg, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: "14px 16px", boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#aaa" }}>New Session Log</p>
                <Tag bg={C.tealLight} color={C.teal}>Live</Tag>
              </div>
              <p style={{ margin: "6px 0", fontFamily: "'Space Grotesk', system-ui", fontSize: 32, fontWeight: 800, letterSpacing: "-1px", color: C.black, lineHeight: 1 }}>9:42</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                <p style={{ margin: 0, fontSize: 11.5, color: C.textMuted, fontWeight: 500 }}>CSC 301 · Soft. Eng.</p>
                <Tag bg={C.tagDarkBg} color={C.tagDark}>Attendance</Tag>
              </div>
            </div>
          </div>
        </div>

        {/* ── Trust bar ticker ──────────────────────────────────────────────── */}
        <div style={{ marginTop: 48, paddingTop: 28, borderTop: "1px solid #e0e0d8" }}>
          <p style={{ textAlign: "center", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", color: "#aaa", marginBottom: 20 }}>
            Trusted at universities across Nigeria
          </p>
          {/* ticker track — overflow hidden so items slide in/out */}
          <div style={{ overflow: "hidden", position: "relative" }}>
            {/* fade edges */}
            <div aria-hidden style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 80, background: `linear-gradient(to right, ${C.bg}, transparent)`, zIndex: 2, pointerEvents: "none" }} />
            <div aria-hidden style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 80, background: `linear-gradient(to left, ${C.bg}, transparent)`, zIndex: 2, pointerEvents: "none" }} />

            <div className="ticker-track">
              {/* duplicate list twice so the loop is seamless */}
              {[...Array(2)].map((_, gi) => (
                <div key={gi} className="ticker-group">
                  {["UNILAG", "OAU", "UNIBEN", "ABU Zaria", "UI", "LASU", "FUTA", "UNIPORT"].map((name) => (
                    <span key={name} className="ticker-item">
                      {name}
                      <span className="ticker-dot" />
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Responsive Styles */}
      <style>{`
        .landing-header { padding: 22px 48px; }
        .desktop-nav { display: flex !important; }
        .desktop-ctas { display: flex !important; }
        .mobile-hamburger { display: none !important; }
        .mobile-drawer { display: none !important; }

        @media (max-width: 1024px) {
          .landing-header { padding: 16px 24px !important; }
          .desktop-nav { display: none !important; }
          .desktop-ctas { display: none !important; }
          .mobile-hamburger { display: flex !important; }
          .mobile-drawer { display: flex !important; }
        }

        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; padding-top: 20px !important; }
          .hero-cards { display: none !important; }
        }

        .ticker-track {
          display: flex;
          width: max-content;
          animation: ticker 22s linear infinite;
        }
        .ticker-track:hover { animation-play-state: paused; }

        .ticker-group {
          display: flex;
          align-items: center;
        }

        .ticker-item {
          display: inline-flex;
          align-items: center;
          gap: 0;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: #555;
          opacity: 0.5;
          padding: 0 32px;
          white-space: nowrap;
        }

        .ticker-dot {
          display: inline-block;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #bbb;
          margin-left: 32px;
        }

        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

// ── tiny helper ──────────────────────────────────────────────────────────────
function Tag({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) {
  return (
    <span style={{ background: bg, color, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" as const }}>
      {children}
    </span>
  );
}
