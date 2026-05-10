import { useState } from "react";
import { Sparkles, Send, Bot, User as UserIcon, TrendingUp, ShieldCheck, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

interface Msg { role: "user" | "ai"; text: string }

const roleConfig = {
  student: {
    greeting: "Hi! I'm Attendly AI. Ask me anything about your attendance, courses, or schedule.",
    icon: GraduationCap,
    label: "Student Assistant",
    subtitle: "Your academic companion",
    suggestions: [
      "What is my attendance percentage?",
      "Am I eligible for exams?",
      "Which courses am I enrolled in?",
      "Remind me about upcoming classes",
    ],
    answer: (q: string) => {
      const l = q.toLowerCase();
      if (l.includes("percentage") || l.includes("attendance")) return "Your overall attendance is 87%, which is comfortably above the 75% exam threshold. Strongest: CSC 405 (95%). Weakest: CSC 411 (65%).";
      if (l.includes("exam") || l.includes("eligible")) return "You're eligible in 3 of 4 courses. Keep an eye on CSC 411 (65%) — 3 more absences could put you at risk before exams.";
      if (l.includes("enrolled") || l.includes("courses")) return "You are enrolled in: CSC 301, CSC 405, CSC 411, and MTH 302. Go to 'My Courses' to see full details.";
      if (l.includes("remind") || l.includes("upcoming") || l.includes("class")) return "Your next class is CSC 301 tomorrow at 8:00 AM in LT 5. Check the Timetable page for the full schedule.";
      if (l.includes("excuse") || l.includes("absent") || l.includes("miss")) return "You can submit an attendance excuse from the Attendance page. Click on any 'Absent' record in your timeline and tap 'Submit Excuse'.";
      return "I can help with attendance rates, exam eligibility, course info, and your schedule. Try one of the suggestions above or ask a specific question!";
    },
  },
  lecturer: {
    greeting: "Hello! I'm Attendly AI. I can help you with attendance management, course analytics, and student insights.",
    icon: TrendingUp,
    label: "Lecturer Assistant",
    subtitle: "Teaching & analytics hub",
    suggestions: [
      "Which students are at risk this term?",
      "What is the average attendance for my courses?",
      "How do I start a QR attendance session?",
      "Show me attendance trends",
    ],
    answer: (q: string) => {
      const l = q.toLowerCase();
      if (l.includes("risk") || l.includes("at-risk") || l.includes("failing")) return "Based on current records, 6 students across your courses are below the 70% threshold. Head to Reports to view their details and send notifications.";
      if (l.includes("average") || l.includes("rate")) return "Your average class attendance across all courses is 82%. CSC 405 leads at 91%, while CSC 411 trails at 65%.";
      if (l.includes("qr") || l.includes("session") || l.includes("start")) return "Go to the Attendance page, select your course, choose 'QR Code' as the attendance type, then tap 'Take Attendance'. Students scan the displayed QR code to check in.";
      if (l.includes("trend") || l.includes("analytics")) return "Attendance has dipped 4% this month. Tuesday classes show the lowest turnout. Consider sending reminders the night before.";
      if (l.includes("excuse") || l.includes("justification")) return "Pending excuses appear in the Attendance page under the 'Justifications' tab. You can approve or decline each submission there.";
      if (l.includes("manual") || l.includes("roll call")) return "On the Attendance page, select 'Manual (P/A/L/E)' as your attendance type and tap 'Take Attendance'. You'll see the full roll-call panel.";
      return "I can assist with student risk analysis, attendance analytics, session management, and excuses. Try asking a specific question!";
    },
  },
  admin: {
    greeting: "Hello Admin! I can provide system insights, user management guidance, and help you monitor the platform.",
    icon: ShieldCheck,
    label: "Admin Assistant",
    subtitle: "System management & insights",
    suggestions: [
      "How many students are enrolled system-wide?",
      "Which department has the best attendance?",
      "How do I create a new lecturer account?",
      "Show me students at risk across all courses",
    ],
    answer: (q: string) => {
      const l = q.toLowerCase();
      if (l.includes("how many") || l.includes("total") || l.includes("enrolled")) return "The system currently has 342 students registered, 18 lecturers, and 47 active courses. Go to User Management for full breakdowns.";
      if (l.includes("department") || l.includes("best") || l.includes("attendance")) return "Computer Science leads with 86% average attendance, followed by Mathematics (81%) and Physics (78%).";
      if (l.includes("lecturer") || l.includes("create") || l.includes("add")) return "Go to User Management → click 'Add Lecturer'. Fill in their name, email, department (auto-created if new), then assign or create courses. They'll receive login credentials you set.";
      if (l.includes("risk") || l.includes("at-risk")) return "Visit the Admin Dashboard → 'Attendance Risk' tab. You can set the threshold and send bulk notifications to at-risk students.";
      if (l.includes("audit") || l.includes("log") || l.includes("activity")) return "System audit logs track user creation, deletions, and course assignments. These are stored in the audit_log table and accessible to system admins.";
      if (l.includes("department") && (l.includes("create") || l.includes("add"))) return "Go to User Management → Departments tab → click 'Add Department'. Or simply type a new department name when creating a lecturer or student — it's created automatically.";
      return "I can help with system stats, user management, department setup, and attendance oversight. What do you need?";
    },
  },
};

export default function AIAssistant() {
  const { user } = useAuth();
  const role = (user?.role ?? "student") as keyof typeof roleConfig;
  const cfg = roleConfig[role] ?? roleConfig.student;
  const Icon = cfg.icon;

  const [messages, setMessages] = useState<Msg[]>([
    { role: "ai", text: cfg.greeting },
  ]);
  const [input, setInput] = useState("");

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setTimeout(() => {
      setMessages((m) => [...m, { role: "ai", text: cfg.answer(text) }]);
    }, 600);
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="relative overflow-hidden rounded-[2.5rem] gradient-primary p-6 text-white shadow-elevated">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <Icon className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">{cfg.label}</h1>
            <p className="text-sm opacity-80">{cfg.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-border/40 bg-card/60 backdrop-blur-xl shadow-elevated overflow-hidden">
        {/* Chat area */}
        <div className="flex max-h-[420px] flex-col gap-4 overflow-y-auto p-6 custom-scrollbar">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${m.role === "ai" ? "gradient-primary text-white" : "bg-muted"}`}>
                {m.role === "ai" ? <Bot className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "ai" ? "bg-muted/60 text-foreground" : "gradient-primary text-white"
              }`}>
                {m.text}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border/40 p-4 space-y-4">
          {/* Suggestions */}
          <div className="flex flex-wrap gap-2">
            {cfg.suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border border-border/40 bg-background/60 px-3 py-1.5 text-xs font-medium transition-all hover:border-primary/40 hover:text-primary hover:bg-primary/5 active:scale-95"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={role === "admin" ? "Ask about system stats, users, departments..." : role === "lecturer" ? "Ask about students, sessions, analytics..." : "Ask about your attendance, courses..."}
              className="h-12 rounded-2xl bg-background/50 border-border/40"
            />
            <Button type="submit" className="h-12 w-12 rounded-2xl gradient-primary shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
