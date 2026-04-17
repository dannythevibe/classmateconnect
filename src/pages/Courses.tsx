import { useState } from "react";
import { mockCourses } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Users, Clock, MapPin, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Courses() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const filtered = mockCourses.filter(
    (c) => c.code.toLowerCase().includes(q.toLowerCase()) || c.title.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Courses</h1>
          <p className="text-sm text-muted-foreground">Manage classes and schedules</p>
        </div>
        {user?.role !== "student" && (
          <Button onClick={() => toast.success("Course creation coming soon")} className="gradient-primary shadow-glow">
            <Plus className="mr-2 h-4 w-4" /> New course
          </Button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses..." className="pl-9" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <div key={c.id} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-bounce hover:-translate-y-1 hover:shadow-elevated">
            <div className={`h-24 bg-gradient-to-br ${c.color} p-4 text-white`}>
              <p className="text-xs font-bold opacity-90">{c.code}</p>
              <h3 className="font-display text-lg font-bold leading-tight">{c.title}</h3>
            </div>
            <div className="space-y-3 p-4">
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> {c.schedule}</p>
                <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {c.room}</p>
                <p className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> {c.students} students</p>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <div className="flex items-center gap-1 text-xs">
                  <TrendingUp className="h-3.5 w-3.5 text-success" />
                  <span className="font-semibold">{c.attendanceRate}%</span>
                </div>
                <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/10">View</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
