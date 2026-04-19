import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchStudents } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Upload, Users } from "lucide-react";
import { toast } from "sonner";
import NewStudentDialog from "@/components/dialogs/NewStudentDialog";

export default function Students() {
  const [q, setQ] = useState("");
  const { data: students = [], isLoading } = useQuery({ queryKey: ["students"], queryFn: fetchStudents });

  const filtered = students.filter(
    (s) => s.name.toLowerCase().includes(q.toLowerCase()) || s.matric_no.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Students</h1>
          <p className="text-sm text-muted-foreground">{students.length} enrolled</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast.info("Bulk upload (CSV) coming soon")}>
            <Upload className="mr-2 h-4 w-4" /> Bulk upload
          </Button>
          <NewStudentDialog />
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or matric no..." className="pl-9" />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border p-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-semibold">No students yet</p>
          <p className="text-sm text-muted-foreground">Click 'Add student' to build your roster.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          <div className="hidden grid-cols-12 gap-4 border-b border-border bg-muted/40 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
            <div className="col-span-6">Student</div>
            <div className="col-span-3">Matric No</div>
            <div className="col-span-2">Level</div>
            <div className="col-span-1">Dept</div>
          </div>
          {filtered.map((s) => (
            <div key={s.id} className="grid grid-cols-1 gap-2 border-b border-border px-5 py-4 transition-smooth last:border-0 hover:bg-muted/30 sm:grid-cols-12 sm:items-center">
              <div className="col-span-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary text-sm font-bold text-primary-foreground">
                  {s.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-semibold">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.department}</p>
                </div>
              </div>
              <div className="col-span-3 text-sm text-muted-foreground">{s.matric_no}</div>
              <div className="col-span-2 text-sm">{s.level || "—"}</div>
              <div className="col-span-1 text-xs text-muted-foreground">{s.department || "—"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
