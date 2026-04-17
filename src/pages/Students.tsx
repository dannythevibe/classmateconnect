import { useState } from "react";
import { mockStudents } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Upload, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const statusStyles = {
  excellent: "bg-success/10 text-success",
  active: "bg-primary/10 text-primary",
  "at-risk": "bg-destructive/10 text-destructive",
};

export default function Students() {
  const [q, setQ] = useState("");
  const filtered = mockStudents.filter(
    (s) => s.name.toLowerCase().includes(q.toLowerCase()) || s.matricNo.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Students</h1>
          <p className="text-sm text-muted-foreground">{mockStudents.length} enrolled</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast.success("Bulk upload (CSV) coming soon")}>
            <Upload className="mr-2 h-4 w-4" /> Bulk upload
          </Button>
          <Button onClick={() => toast.success("Add student form coming soon")} className="gradient-primary shadow-glow">
            <Plus className="mr-2 h-4 w-4" /> Add student
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or matric no..." className="pl-9" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="hidden grid-cols-12 gap-4 border-b border-border bg-muted/40 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
          <div className="col-span-5">Student</div>
          <div className="col-span-2">Matric No</div>
          <div className="col-span-2">Level</div>
          <div className="col-span-2">Attendance</div>
          <div className="col-span-1">Status</div>
        </div>
        {filtered.map((s) => (
          <div key={s.id} className="grid grid-cols-1 gap-2 border-b border-border px-5 py-4 transition-smooth last:border-0 hover:bg-muted/30 sm:grid-cols-12 sm:items-center">
            <div className="col-span-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary text-sm font-bold text-primary-foreground">
                {s.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-semibold">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.department}</p>
              </div>
            </div>
            <div className="col-span-2 text-sm text-muted-foreground">{s.matricNo}</div>
            <div className="col-span-2 text-sm">{s.level}</div>
            <div className="col-span-2">
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      s.attendanceRate >= 85 ? "bg-success" : s.attendanceRate >= 70 ? "bg-warning" : "bg-destructive"
                    )}
                    style={{ width: `${s.attendanceRate}%` }}
                  />
                </div>
                <span className="text-xs font-semibold">{s.attendanceRate}%</span>
              </div>
            </div>
            <div className="col-span-1">
              <span className={cn("inline-block rounded-full px-2 py-1 text-[10px] font-semibold capitalize", statusStyles[s.status])}>
                {s.status.replace("-", " ")}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
