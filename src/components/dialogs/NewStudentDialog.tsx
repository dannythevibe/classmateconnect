import { useState } from "react";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

async function fetchDepartments() {
  const { data, error } = await supabase
    .from("departments")
    .select("name")
    .order("name", { ascending: true });
  if (error) throw error;
  return data || [];
}

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  matric_no: z.string().trim().min(1).max(50),
  department: z.string().trim().max(100).optional(),
  level: z.string().trim().max(20).optional(),
});

export default function NewStudentDialog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", matric_no: "", department: "", level: "100" });

  const { data: departmentOptions = [] } = useQuery({
    queryKey: ["admin-departments-list"],
    queryFn: fetchDepartments,
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.errors[0].message);
      const { error } = await supabase.from("students").insert({
        name: parsed.data.name,
        matric_no: parsed.data.matric_no,
        department: parsed.data.department ?? "",
        level: parsed.data.level ?? "",
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Student added");
      qc.invalidateQueries({ queryKey: ["students"] });
      setOpen(false);
      setForm({ name: "", matric_no: "", department: "", level: "100" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary shadow-glow"><Plus className="mr-2 h-4 w-4" /> Add student</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add student</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Full name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Matric number</Label><Input value={form.matric_no} onChange={(e) => setForm({ ...form, matric_no: e.target.value })} placeholder="CSC/2021/045" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Department</Label>
              <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Dept" />
                </SelectTrigger>
                <SelectContent>
                  {departmentOptions.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">No departments.</div>
                  ) : departmentOptions.map((d) => (
                    <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Level</Label><Input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gradient-primary">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
