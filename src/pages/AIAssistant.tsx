import { useState } from "react";
import { Sparkles, Send, Bot, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Msg { role: "user" | "ai"; text: string }

const suggestions = [
  "What is my attendance percentage?",
  "Am I eligible for exams?",
  "Which course has the lowest attendance?",
  "Predict students at risk this term",
];

const fakeAnswer = (q: string) => {
  const lower = q.toLowerCase();
  if (lower.includes("percentage") || lower.includes("attendance")) return "Your overall attendance is 87%, which is comfortably above the 75% exam threshold. Strongest: CSC 405 (95%). Weakest: CSC 411 (65%).";
  if (lower.includes("exam") || lower.includes("eligible")) return "Yes — you're eligible. You meet the 75% requirement in 3 of 4 courses. Watch CSC 411 (65%): 3 more absences would put you at risk.";
  if (lower.includes("lowest") || lower.includes("risk")) return "CSC 411 (Mobile Computing) sits at 78% class-wide. 6 students are below 70%; recommend sending automated reminders.";
  if (lower.includes("predict")) return "Based on the last 4 weeks, 3 students show declining patterns: Funke Adebayo (-8%), Segun Bakare (-12%), and Chidi Nwosu (-5%). Consider intervention.";
  return "I can answer questions about attendance, eligibility, trends, and at-risk students. Try one of the suggestions above.";
};

export default function AIAssistant() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "ai", text: "Hi! I'm Attendly AI. Ask me anything about your attendance, courses or students." },
  ]);
  const [input, setInput] = useState("");

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setTimeout(() => setMessages((m) => [...m, { role: "ai", text: fakeAnswer(text) }]), 600);
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl gradient-accent p-6 text-accent-foreground shadow-elevated">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">AI Assistant</h1>
            <p className="text-sm opacity-90">Smart answers about your attendance</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <div className="flex max-h-[420px] flex-col gap-3 overflow-y-auto p-2">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.role === "ai" ? "gradient-primary text-primary-foreground" : "bg-muted"}`}>
                {m.role === "ai" ? <Bot className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "ai" ? "bg-muted" : "gradient-primary text-primary-foreground"}`}>
                {m.text}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button key={s} onClick={() => send(s)} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium transition-smooth hover:border-primary hover:text-primary">
              {s}
            </button>
          ))}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="mt-3 flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything..." />
          <Button type="submit" className="gradient-primary"><Send className="h-4 w-4" /></Button>
        </form>
      </div>
    </div>
  );
}
