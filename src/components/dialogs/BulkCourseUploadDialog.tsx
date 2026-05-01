import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Upload, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import { courseColors } from "@/lib/queries";

interface Row {
  code: string;
  title: string;
  department: string;
  level: string;
  session: string;
  semester: string;
  lecturer_email: string;
  schedule?: string;
  room?: string;
}

const empty = (): Row => ({
  code: "", title: "", department: "", level: "100",
  session: "", semester: "1st", lecturer_email: "", schedule: "", room: "",
});

export default function BulkCourseUploadDialog() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([empty()]);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  const onCSV = (file: File) => {
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const cleaned = (res.data as any[]).map((r) => ({
          code: (r.code || r.Code || "").toString().trim(),
          title: (r.title || r.Title || "").toString().trim(),
          department: (r.department || r.Department || "").toString().trim(),
          level: (r.level || r.Level || "100").toString().trim(),
          session: (r.session || r.Session || "").toString().trim(),
          semester: (r.semester || r.Semester || "1st").toString().trim(),
          lecturer_email: (r.lecturer_email || r.LecturerEmail || r.email || "").toString().trim(),
          schedule: (r.schedule || r.Schedule || "").toString().trim(),
          room: (r.room || r.Room || "").toString().trim(),
        })).filter((r) => r.code && r.title);
        if (cleaned.length === 0) { toast.error("No valid rows found"); return; }
        setRows(cleaned);
        toast.success(`${cleaned.length} rows loaded`);
      },
      error: (err) => toast.error(err.message),
    });
  };

  const update = (i: number, k: keyof Row, v: string) => {
    setRows((r) => r.map((row, idx) => idx === i ? { ...row, [k]: v } : row));
  };

  const submit = async () => {
    setBusy(true);
    try {
      // Resolve lecturer emails -> user_ids
      const emails = Array.from(new Set(rows.map((r) => r.lecturer_email.toLowerCase()).filter(Boolean)));
      const { data: profs } = await supabase.from("profiles").select("user_id, email").in("email", emails);
      const emailToId = new Map((profs ?? []).map((p: any) => [p.email.toLowerCase(), p.user_id]));

      const inserts: any[] = [];
      const skipped: string[] = [];
      for (const r of rows) {
        if (!r.code || !r.title) continue;
        const lecturer_id = emailToId.get(r.lecturer_email.toLowerCase());
        if (!lecturer_id) { skipped.push(`${r.code}: lecturer ${r.lecturer_email} not found`); continue; }
        inserts.push({
          code: r.code, title: r.title, department: r.department, level: r.level,
          session: r.session, semester: r.semester, schedule: r.schedule || "", room: r.room || "",
          lecturer_id, color: courseColors[Math.floor(Math.random() * courseColors.length)],
        });
      }
      if (inserts.length === 0) {
        toast.error(`No courses to add. ${skipped.join(" | ")}`);
        return;
      }
      const { error } = await supabase.from("courses").insert(inserts);
      if (error) throw error;
      toast.success(`Added ${inserts.length} courses${skipped.length ? `; skipped ${skipped.length}` : ""}`);
      if (skipped.length) console.warn("Skipped:", skipped);
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      qc.invalidateQueries({ queryKey: ["courses"] });
      setOpen(false);
      setRows([empty()]);
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-12 rounded-2xl border-border/40 font-bold px-6 shadow-soft">
          <Upload className="mr-2 h-4 w-4" /> Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl p-6 max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-2xl font-black">Bulk add courses</DialogTitle></DialogHeader>

        <div className="flex items-center gap-3 my-4">
          <Label className="cursor-pointer">
            <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && onCSV(e.target.files[0])} />
            <span className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border bg-muted hover:bg-muted/80 text-sm font-bold">
              <Upload className="h-4 w-4" /> Import CSV
            </span>
          </Label>
          <span className="text-xs text-muted-foreground">Headers: code, title, department, level, session, semester, lecturer_email, schedule, room</span>
        </div>

        <div className="overflow-x-auto border rounded-2xl">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                {["Code","Title","Dept","Level","Session","Semester","Lecturer email","Schedule","Room",""].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  {(["code","title","department","level","session","semester","lecturer_email","schedule","room"] as const).map((k) => (
                    <td key={k} className="p-1"><Input value={(r as any)[k] || ""} onChange={(e) => update(i, k, e.target.value)} className="h-9 rounded-lg" /></td>
                  ))}
                  <td className="p-1">
                    <Button size="icon" variant="ghost" onClick={() => setRows((rs) => rs.length === 1 ? [empty()] : rs.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Button variant="outline" className="mt-3" onClick={() => setRows((r) => [...r, empty()])}>
          <Plus className="mr-2 h-4 w-4" /> Add row
        </Button>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy} className="gradient-primary">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Add ${rows.filter((r) => r.code && r.title).length} courses`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
