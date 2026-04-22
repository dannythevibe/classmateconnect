import { useState } from "react";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Loader2, GraduationCap } from "lucide-react";
import { toast } from "sonner";

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

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.errors[0].message);
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          ...parsed.data,
          role: "lecturer",
          level: "",
          matric_no: "",
        },
      });
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || "Failed to create lecturer");
      }
    },
    onSuccess: () => {
      toast.success("Lecturer account created");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setOpen(false);
      setForm({ name: "", email: "", password: "", department: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-12 rounded-2xl border-border/40 font-bold px-6 shadow-soft hover:bg-muted">
          <GraduationCap className="mr-2 h-4 w-4" /> Add Lecturer
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-[2rem] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tight">Add Lecturer Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Full name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. Jane Doe" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@uni.edu" />
          </div>
          <div>
            <Label>Initial password</Label>
            <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" />
            <p className="text-[10px] text-muted-foreground mt-1">Share this with the lecturer. They can change it after first login.</p>
          </div>
          <div>
            <Label>Department</Label>
            <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Computer Science" />
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
