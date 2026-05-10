import { useState } from "react";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Loader2, GraduationCap, X, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { courseColors } from "@/lib/queries";
import { cn } from "@/lib/utils";

async function fetchDepartments(): Promise<{ name: string }[]> {
  const { data } = await supabase.from("departments").select("name").order("name");
  return data || [];
}

async function fetchAllCourses() {
  const { data, error } = await supabase
    .from("courses")
    .select("id, code, title, department, level")
    .order("code");
  if (error) throw error;
  return data || [];
}

async function ensureDepartment(name: string) {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return;
  // Case-insensitive duplicate check
  const { data } = await supabase
    .from("departments")
    .select("id")
    .ilike("name", trimmed)
    .maybeSingle();
  if (!data) {
    await supabase.from("departments").insert({ name: trimmed });
  }
}

const schema = z.object({
  name: z.string().trim().min(1, "Name required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Min 6 characters").max(72),
  department: z.string().trim().min(1, "Department required").max(100),
});

export default function NewLecturerDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", department: "" });
  const [deptInput, setDeptInput] = useState("");
  const [deptOpen, setDeptOpen] = useState(false);
  const [selectedExisting, setSelectedExisting] = useState<string[]>([]);
  const [newCourseCode, setNewCourseCode] = useState("");
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourses, setNewCourses] = useState<{ code: string; title: string }[]>([]);

  const { data: departmentOptions = [] } = useQuery({
    queryKey: ["admin-departments-list"],
    queryFn: fetchDepartments,
    enabled: open,
  });

  const { data: existingCourses = [] } = useQuery({
    queryKey: ["all-courses-pick"],
    queryFn: fetchAllCourses,
    enabled: open,
  });

  const filteredDepts = departmentOptions.filter(d =>
    d.name.toLowerCase().includes(deptInput.toLowerCase())
  );

  const selectDept = (name: string) => {
    setForm(f => ({ ...f, department: name }));
    setDeptInput(name);
    setDeptOpen(false);
  };

  const addNewCourse = () => {
    const code = newCourseCode.trim();
    const title = newCourseTitle.trim();
    if (!code || !title) { toast.error("Course code and title required"); return; }
    setNewCourses((arr) => [...arr, { code, title }]);
    setNewCourseCode(""); setNewCourseTitle("");
  };

  const toggleExisting = (id: string) => {
    setSelectedExisting((arr) => arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);
  };

  const reset = () => {
    setForm({ name: "", email: "", password: "", department: "" });
    setDeptInput("");
    setSelectedExisting([]); setNewCourses([]);
    setNewCourseCode(""); setNewCourseTitle("");
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const deptValue = deptInput.trim() || form.department;
      const parsed = schema.safeParse({ ...form, department: deptValue });
      if (!parsed.success) throw new Error(parsed.error.errors[0].message);

      // Auto-create department if it doesn't exist (case-insensitive dedup)
      await ensureDepartment(parsed.data.department);

      // Create lecturer auth user
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { ...parsed.data, role: "lecturer", level: "", matric_no: "" },
      });
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || "Failed to create lecturer");
      }
      const lecturerId = (data as any).user_id as string;

      // Reassign existing selected courses to this lecturer
      if (selectedExisting.length > 0) {
        const { error: uErr } = await supabase
          .from("courses")
          .update({ lecturer_id: lecturerId })
          .in("id", selectedExisting);
        if (uErr) console.warn("Reassign existing courses:", uErr.message);
      }

      // Create new courses owned by this lecturer
      if (newCourses.length > 0) {
        const rows = newCourses.map((c) => ({
          code: c.code,
          title: c.title,
          lecturer_id: lecturerId,
          department: parsed.data.department,
          level: "100",
          session: new Date().getFullYear() + "/" + (new Date().getFullYear() + 1),
          semester: "First",
          color: courseColors[Math.floor(Math.random() * courseColors.length)],
        }));
        const { error: iErr } = await supabase.from("courses").insert(rows);
        if (iErr) console.warn("Insert new courses:", iErr.message);
      }

      // Audit log
      await supabase.from("audit_log").insert({
        action: "lecturer_created",
        entity_type: "user",
        entity_id: lecturerId,
        details: { name: parsed.data.name, department: parsed.data.department },
      }).then();
    },
    onSuccess: () => {
      toast.success("Lecturer account created");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      qc.invalidateQueries({ queryKey: ["admin-departments-list"] });
      setOpen(false);
      reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-12 rounded-2xl border-border/40 font-bold px-6 shadow-soft hover:bg-muted">
          <GraduationCap className="mr-2 h-4 w-4" /> Add Lecturer
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-[2rem] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tight">Add Lecturer Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Lecturer's full name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. Jane Doe" />
          </div>
          <div>
            <Label>Email address</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@uni.edu" />
          </div>

          {/* Department — combobox with free-text + auto-create */}
          <div className="relative">
            <Label>Department</Label>
            <p className="text-[10px] text-muted-foreground mb-1">Select existing or type a new department name — it will be created automatically.</p>
            <div className="relative">
              <Input
                value={deptInput}
                onChange={(e) => { setDeptInput(e.target.value); setForm(f => ({ ...f, department: e.target.value })); setDeptOpen(true); }}
                onFocus={() => setDeptOpen(true)}
                onBlur={() => setTimeout(() => setDeptOpen(false), 150)}
                placeholder="e.g. Computer Science"
                className="pr-8"
              />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            {deptOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-xl border border-border/40 bg-popover shadow-lg overflow-hidden">
                {filteredDepts.length > 0 ? (
                  filteredDepts.map(d => (
                    <button
                      key={d.name}
                      type="button"
                      onMouseDown={() => selectDept(d.name)}
                      className={cn(
                        "flex w-full items-center px-4 py-2.5 text-sm font-medium hover:bg-muted text-left",
                        form.department === d.name && "bg-primary/10 text-primary"
                      )}
                    >
                      {d.name}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-xs text-muted-foreground">
                    {deptInput.trim()
                      ? <span>Press create to add <strong>"{deptInput.trim()}"</strong> as a new department</span>
                      : "Start typing to search or create a department"}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* COURSES TAUGHT */}
          <div className="space-y-3 rounded-2xl border border-border/40 p-4 bg-muted/20">
            <Label className="text-xs font-bold uppercase tracking-widest">Courses the lecturer is taking</Label>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Pick from existing</p>
              <div className="max-h-32 overflow-y-auto rounded-xl border border-border/40 bg-background/60 p-2 space-y-1">
                {existingCourses.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">No existing courses.</p>
                ) : existingCourses.map((c: any) => (
                  <label key={c.id} className="flex items-center gap-2 text-xs p-1.5 rounded-md hover:bg-muted cursor-pointer">
                    <input type="checkbox" checked={selectedExisting.includes(c.id)} onChange={() => toggleExisting(c.id)} />
                    <span className="font-mono font-bold">{c.code}</span>
                    <span className="text-muted-foreground truncate">— {c.title}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Or add new courses</p>
              <div className="flex gap-2">
                <Input value={newCourseCode} onChange={(e) => setNewCourseCode(e.target.value)} placeholder="CSC 321" className="w-28" />
                <Input value={newCourseTitle} onChange={(e) => setNewCourseTitle(e.target.value)} placeholder="Course title" />
                <Button type="button" variant="outline" size="sm" onClick={addNewCourse}><Plus className="h-3 w-3" /></Button>
              </div>
              {newCourses.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {newCourses.map((c, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">
                      {c.code} — {c.title}
                      <button onClick={() => setNewCourses(arr => arr.filter((_, j) => j !== i))} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <Label>Initial password</Label>
            <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" />
            <p className="text-[10px] text-muted-foreground mt-1">Share this with the lecturer. They can change it after first login.</p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gradient-primary">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-2 h-4 w-4" /> Create</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
