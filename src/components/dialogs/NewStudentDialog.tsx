import { useState } from "react";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

async function fetchDepartments(): Promise<{ name: string }[]> {
  const { data } = await supabase.from("departments").select("name").order("name");
  return data || [];
}

async function ensureDepartment(name: string) {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return;
  const { data } = await supabase.from("departments").select("id").ilike("name", trimmed).maybeSingle();
  if (!data) {
    await supabase.from("departments").insert({ name: trimmed });
  }
}

const schema = z.object({
  first_name: z.string().trim().min(1, "First name required").max(60),
  last_name: z.string().trim().min(1, "Last name required").max(60),
  matric_no: z.string().trim().min(1, "Matric number required").max(50),
  department: z.string().trim().min(1, "Department required").max(100),
  faculty: z.string().trim().max(100).optional(),
  level: z.string().trim().max(20).optional(),
});

export default function NewStudentDialog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", matric_no: "", department: "", faculty: "", level: "100" });
  const [deptInput, setDeptInput] = useState("");
  const [deptOpen, setDeptOpen] = useState(false);

  const { data: departmentOptions = [] } = useQuery({
    queryKey: ["admin-departments-list"],
    queryFn: fetchDepartments,
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

  const reset = () => {
    setForm({ first_name: "", last_name: "", matric_no: "", department: "", faculty: "", level: "100" });
    setDeptInput("");
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const deptValue = deptInput.trim() || form.department;
      const parsed = schema.safeParse({ ...form, department: deptValue });
      if (!parsed.success) throw new Error(parsed.error.errors[0].message);

      const fullName = `${parsed.data.first_name} ${parsed.data.last_name}`.trim();

      // Auto-create department if needed
      await ensureDepartment(parsed.data.department);

      // Check for duplicate matric_no before insert
      const { data: existing } = await supabase
        .from("students")
        .select("id")
        .eq("matric_no", parsed.data.matric_no)
        .maybeSingle();
      if (existing) throw new Error(`A student with matric number "${parsed.data.matric_no}" already exists.`);

      const { error } = await supabase.from("students").insert({
        name: fullName,
        matric_no: parsed.data.matric_no,
        department: parsed.data.department,
        faculty: parsed.data.faculty ?? "",
        level: parsed.data.level ?? "100",
        created_by: user?.id,
      });
      if (error) throw error;

      // Audit
      await supabase.from("audit_log").insert({
        actor_id: user?.id,
        action: "student_created",
        entity_type: "student",
        details: { name: fullName, matric_no: parsed.data.matric_no, department: parsed.data.department },
      }).then();
    },
    onSuccess: () => {
      toast.success("Student added successfully");
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["admin-students"] });
      qc.invalidateQueries({ queryKey: ["admin-departments-list"] });
      setOpen(false);
      reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button className="gradient-primary shadow-glow h-12 rounded-2xl font-bold px-6">
          <Plus className="mr-2 h-4 w-4" /> Add Student
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-[2rem]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tight">Add Student</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>First name</Label>
              <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder="Jane" />
            </div>
            <div>
              <Label>Last name</Label>
              <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} placeholder="Doe" />
            </div>
          </div>

          <div>
            <Label>Matric number</Label>
            <Input value={form.matric_no} onChange={(e) => setForm({ ...form, matric_no: e.target.value })} placeholder="VUG/CSC/21/045" />
          </div>

          {/* Department combobox with auto-create */}
          <div className="relative">
            <Label>Department</Label>
            <p className="text-[10px] text-muted-foreground mb-1">Select existing or type a new one — created automatically.</p>
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
                      ? <span>Will create <strong>"{deptInput.trim()}"</strong> as new department</span>
                      : "Start typing to search or create"}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Faculty</Label>
              <Input value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })} placeholder="e.g. Science" />
            </div>
            <div>
              <Label>Level</Label>
              <Input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} placeholder="100" />
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gradient-primary">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Student"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
