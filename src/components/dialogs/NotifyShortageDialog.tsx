import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { fetchCourses, fetchAttendanceRates } from "@/lib/queries";

interface StudentBelow {
  email: string;
  name: string;
  matric_no: string;
  percentage: number;
  course_code?: string;
}

export default function NotifyShortageDialog() {
  const [open, setOpen] = useState(false);
  const [threshold, setThreshold] = useState(80);
  const [scope, setScope] = useState<string>("all"); // all | <courseId>
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const { data: courses = [] } = useQuery({ queryKey: ["courses"], queryFn: fetchCourses });

  // Fetch all per-student per-course attendance and resolve to email
  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["shortage-candidates", scope],
    queryFn: async (): Promise<StudentBelow[]> => {
      const courseFilter = scope === "all" ? null : scope;

      // Active sessions count per course (= total classes)
      const sessQ = supabase.from("attendance_sessions").select("id, course_id");
      const { data: sessions } = courseFilter ? await sessQ.eq("course_id", courseFilter) : await sessQ;
      const totalsByCourse = new Map<string, number>();
      const sessionDates = new Map<string, Set<string>>();
      // Use distinct dates to count classes
      const recsQ = supabase.from("attendance_records").select("course_id, student_id, status, marked_at");
      const { data: records } = courseFilter ? await recsQ.eq("course_id", courseFilter) : await recsQ;

      // total classes = distinct dates of sessions per course
      const { data: sessRows } = courseFilter
        ? await supabase.from("attendance_sessions").select("course_id, started_at").eq("course_id", courseFilter)
        : await supabase.from("attendance_sessions").select("course_id, started_at");
      (sessRows ?? []).forEach((s: any) => {
        const day = new Date(s.started_at).toISOString().slice(0, 10);
        if (!sessionDates.has(s.course_id)) sessionDates.set(s.course_id, new Set());
        sessionDates.get(s.course_id)!.add(day);
      });
      sessionDates.forEach((set, cid) => totalsByCourse.set(cid, set.size));

      // enrollments
      const enrQ = supabase.from("enrollments").select("course_id, student_id");
      const { data: enrolls } = courseFilter ? await enrQ.eq("course_id", courseFilter) : await enrQ;

      // Build attended map: courseId|studentId -> set of dates attended
      const attendedMap = new Map<string, Set<string>>();
      (records ?? []).forEach((r: any) => {
        if (r.status === "present" || r.status === "late" || r.status === "excused") {
          const key = `${r.course_id}|${r.student_id}`;
          const day = new Date(r.marked_at).toISOString().slice(0, 10);
          if (!attendedMap.has(key)) attendedMap.set(key, new Set());
          attendedMap.get(key)!.add(day);
        }
      });

      // Collect student ids
      const studentIds = Array.from(new Set((enrolls ?? []).map((e: any) => e.student_id)));
      if (studentIds.length === 0) return [];
      const { data: students } = await supabase.from("students").select("id, name, matric_no").in("id", studentIds);
      const studentMap = new Map((students ?? []).map((s: any) => [s.id, s]));

      // Match matric_no to profile email
      const matrics = Array.from(new Set((students ?? []).map((s: any) => s.matric_no).filter(Boolean)));
      let emailMap = new Map<string, string>();
      if (matrics.length) {
        const { data: profs } = await supabase.from("profiles").select("matric_no, email").in("matric_no", matrics);
        emailMap = new Map((profs ?? []).filter((p: any) => p.email).map((p: any) => [p.matric_no, p.email]));
      }

      const courseMap = new Map(courses.map((c) => [c.id, c.code]));
      const out: StudentBelow[] = [];
      (enrolls ?? []).forEach((e: any) => {
        const total = totalsByCourse.get(e.course_id) || 0;
        if (total === 0) return;
        const attended = attendedMap.get(`${e.course_id}|${e.student_id}`)?.size || 0;
        const pct = Math.round((attended / total) * 100);
        if (pct < threshold) {
          const stu = studentMap.get(e.student_id);
          if (!stu) return;
          const email = emailMap.get(stu.matric_no);
          if (!email) return;
          out.push({
            email,
            name: stu.name,
            matric_no: stu.matric_no,
            percentage: pct,
            course_code: courseMap.get(e.course_id),
          });
        }
      });
      // dedupe by email+course
      return out;
    },
    enabled: open,
  });

  const filtered = useMemo(() => candidates.filter((c) => c.percentage < threshold), [candidates, threshold]);

  const toggleAll = (on: boolean) => {
    setSelected(on ? new Set(filtered.map((c) => `${c.email}|${c.course_code || ""}`)) : new Set());
  };

  const send = async () => {
    const recipients = filtered.filter((c) => selected.has(`${c.email}|${c.course_code || ""}`));
    if (recipients.length === 0) { toast.error("Select at least one student"); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("notify-attendance-shortage", {
      body: { recipients, threshold, message },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Failed to send");
      return;
    }
    toast.success(`Sent to ${(data as any).sent} student(s)`);
    setOpen(false);
    setSelected(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-12 rounded-2xl border-amber-500/30 text-amber-700 bg-amber-50 font-bold px-6 hover:bg-amber-100">
          <AlertTriangle className="mr-2 h-4 w-4" /> Notify attendance shortage
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl p-6 max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-2xl font-black">Notify students below threshold</DialogTitle></DialogHeader>

        <div className="grid gap-4 sm:grid-cols-3 mt-4">
          <div className="space-y-1">
            <Label>Threshold (%)</Label>
            <Input type="number" min={0} max={100} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Scope</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All courses</SelectItem>
                {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1 mt-4">
          <Label>Optional custom message</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Encourage students to attend remaining classes..." rows={3} />
        </div>

        <div className="mt-4 border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-3 bg-muted/40 border-b">
            <p className="font-bold text-sm">{filtered.length} student-course matches below {threshold}%</p>
            <div className="flex items-center gap-2 text-xs">
              <Checkbox checked={filtered.length > 0 && selected.size === filtered.length} onCheckedChange={(v) => toggleAll(!!v)} /> Select all
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">No students below this threshold 🎉</div>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground border-b"><th className="p-2"></th><th className="p-2">Name</th><th className="p-2">Matric</th><th className="p-2">Email</th><th className="p-2">Course</th><th className="p-2 text-right">%</th></tr></thead>
                <tbody>
                  {filtered.map((c) => {
                    const k = `${c.email}|${c.course_code || ""}`;
                    return (
                      <tr key={k} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-2"><Checkbox checked={selected.has(k)} onCheckedChange={(v) => {
                          setSelected((s) => { const n = new Set(s); v ? n.add(k) : n.delete(k); return n; });
                        }} /></td>
                        <td className="p-2 font-bold">{c.name}</td>
                        <td className="p-2 font-mono text-xs">{c.matric_no}</td>
                        <td className="p-2 text-xs">{c.email}</td>
                        <td className="p-2">{c.course_code || "—"}</td>
                        <td className="p-2 text-right font-bold text-destructive">{c.percentage}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={send} disabled={busy || selected.size === 0} className="gradient-primary">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Mail className="mr-2 h-4 w-4" /> Send to {selected.size}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
