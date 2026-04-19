import { useState } from "react";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { courseColors } from "@/lib/queries";

const schema = z.object({
  code: z.string().trim().min(1).max(20),
  title: z.string().trim().min(1).max(120),
  schedule: z.string().trim().max(120).optional(),
  room: z.string().trim().max(60).optional(),
});

export default function NewCourseDialog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", title: "", schedule: "", room: "" });

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.errors[0].message);
      if (!user) throw new Error("Not signed in");
      const color = courseColors[Math.floor(Math.random() * courseColors.length)];
      const { error } = await supabase.from("courses").insert({
        code: parsed.data.code,
        title: parsed.data.title,
        schedule: parsed.data.schedule ?? "",
        room: parsed.data.room ?? "",
        color,
        lecturer_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Course created");
      qc.invalidateQueries({ queryKey: ["courses"] });
      setOpen(false);
      setForm({ code: "", title: "", schedule: "", room: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary shadow-glow"><Plus className="mr-2 h-4 w-4" /> New course</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create course</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CSC 401" /></div>
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Advanced Algorithms" /></div>
          <div><Label>Schedule</Label><Input value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} placeholder="Mon 10:00 - 12:00" /></div>
          <div><Label>Room</Label><Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="LH-3" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gradient-primary">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
