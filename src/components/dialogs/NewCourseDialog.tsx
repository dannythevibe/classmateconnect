import { useState } from "react";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { courseColors } from "@/lib/queries";


const schema = z.object({
  code: z.string().trim().min(1).max(20),
  title: z.string().trim().min(1).max(120),
  schedule: z.string().trim().max(120).optional(),
  room: z.string().trim().max(60).optional(),
  level: z.string().min(1, "Level required"),
  department: z.string().trim().min(1, "Department required"),
  lecturer_id: z.string().uuid("Pick a lecturer"),
  session: z.string().min(1, "Session required"),
  semester: z.string().min(1, "Semester required"),
  faculty: z.string().trim().min(1, "Faculty required"),
});

async function fetchLecturers() {
  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "lecturer");
  if (error) throw error;
  const ids = (roles ?? []).map((r: { user_id: string }) => r.user_id);
  if (ids.length === 0) return [] as { user_id: string; name: string }[];
  const { data: profs } = await supabase
    .from("profiles")
    .select("user_id, name")
    .in("user_id", ids);
  return (profs ?? []) as { user_id: string; name: string }[];
}

export default function NewCourseDialog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const isAdmin = user?.role === "admin";

  const [form, setForm] = useState({
    code: "",
    title: "",
    schedule: "",
    room: "",
    level: "100",
    department: user?.department || "",
    lecturer_id: user?.id || "",
    session: "2023/2024",
    semester: "First",
    faculty: "",
  });

  const { data: lecturers = [] } = useQuery({
    queryKey: ["lecturers-list"],
    queryFn: fetchLecturers,
    enabled: open && isAdmin,
  });

const mutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, lecturer_id: isAdmin ? form.lecturer_id : user!.id };
      const parsed = schema.safeParse(payload);
      if (!parsed.success) throw new Error(parsed.error.errors[0].message);
      if (!user) throw new Error("Not signed in");
      const color = courseColors[Math.floor(Math.random() * courseColors.length)];
      const { error } = await supabase.from("courses").insert({
        code: parsed.data.code,
        title: parsed.data.title,
        schedule: parsed.data.schedule ?? "",
        room: parsed.data.room ?? "",
        level: parsed.data.level,
        department: parsed.data.department,
        session: parsed.data.session,
        semester: parsed.data.semester,
        faculty: parsed.data.faculty,
        color,
        lecturer_id: parsed.data.lecturer_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Course created");
      qc.invalidateQueries({ queryKey: ["courses"] });
      setOpen(false);
      setForm({ code: "", title: "", schedule: "", room: "", level: "100", department: user?.department || "", lecturer_id: user?.id || "", session: "2023/2024", semester: "First", faculty: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary shadow-glow"><Plus className="mr-2 h-4 w-4" /> New course</Button>
      </DialogTrigger>
      <DialogContent className="rounded-[2.5rem] p-8 max-w-lg">
        <DialogHeader><DialogTitle className="text-2xl font-black tracking-tight">Create New Course</DialogTitle></DialogHeader>
        <div className="grid gap-5 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground pl-1">Course Code</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CSC 401" className="h-12 rounded-2xl bg-muted/20" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground pl-1">Academic Level</Label>
              <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                <SelectTrigger className="h-12 rounded-2xl bg-muted/20">
                  <SelectValue placeholder="Select Level" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="100">100 Level</SelectItem>
                  <SelectItem value="200">200 Level</SelectItem>
                  <SelectItem value="300">300 Level</SelectItem>
                  <SelectItem value="400">400 Level</SelectItem>
                  <SelectItem value="500">500 Level</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground pl-1">Course Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Advanced Algorithms & Complexity" className="h-12 rounded-2xl bg-muted/20" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground pl-1">Department</Label>
            <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="e.g. Computer Science" className="h-12 rounded-2xl bg-muted/20" />
          </div>

          {isAdmin && (
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground pl-1">Assign Lecturer</Label>
              <Select value={form.lecturer_id} onValueChange={(v) => setForm({ ...form, lecturer_id: v })}>
                <SelectTrigger className="h-12 rounded-2xl bg-muted/20">
                  <SelectValue placeholder="Select a lecturer" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {lecturers.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">No lecturers — add one first.</div>
                  ) : lecturers.map((l) => (
                    <SelectItem key={l.user_id} value={l.user_id}>{l.name || l.user_id.slice(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground pl-1">Session</Label>
              <Select value={form.session} onValueChange={(v) => setForm({ ...form, session: v })}>
                <SelectTrigger className="h-12 rounded-2xl bg-muted/20">
                  <SelectValue placeholder="Select Session" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="2023/2024">2023/2024</SelectItem>
                  <SelectItem value="2024/2025">2024/2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground pl-1">Semester</Label>
              <Select value={form.semester} onValueChange={(v) => setForm({ ...form, semester: v })}>
                <SelectTrigger className="h-12 rounded-2xl bg-muted/20">
                  <SelectValue placeholder="Select Semester" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="First">First Semester</SelectItem>
                  <SelectItem value="Second">Second Semester</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground pl-1">Faculty</Label>
            <Input value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })} placeholder="e.g. Science" className="h-12 rounded-2xl bg-muted/20" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground pl-1">Schedule</Label>
              <Input value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} placeholder="Mon 10:00 - 12:00" className="h-12 rounded-2xl bg-muted/20" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground pl-1">Venue / Room</Label>
              <Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="LH-3" className="h-12 rounded-2xl bg-muted/20" />
            </div>
          </div>


        </div>
        <DialogFooter className="mt-8 gap-3 sm:justify-start">
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="h-12 flex-1 rounded-2xl gradient-primary font-bold shadow-glow text-base">
            {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Deploy Course"}
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)} className="h-12 px-8 rounded-2xl border-border/40 font-bold">Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
