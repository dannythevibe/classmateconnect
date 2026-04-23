import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function NewDepartmentDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Department name is required");
      const { error } = await supabase.from("departments").insert({
        name: name.trim(),
        description: description.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Department created successfully");
      qc.invalidateQueries({ queryKey: ["admin-departments"] });
      setOpen(false);
      setName("");
      setDescription("");
    },
    onError: (e: Error) => {
      if (e.message.includes("unique constraint")) {
        toast.error("A department with this name already exists");
      } else {
        toast.error(e.message);
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-12 rounded-2xl gradient-primary shadow-glow font-bold px-6">
          <Plus className="mr-2 h-4 w-4" /> Add Department
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-[2.5rem] p-8 max-w-md">
        <DialogHeader>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 mb-4">
            <Building2 className="h-6 w-6 text-purple-500" />
          </div>
          <DialogTitle className="text-2xl font-black tracking-tight text-foreground">Add New Department</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-6">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground pl-1">Department Name</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Computer Science" 
              className="h-12 rounded-2xl bg-muted/20 border-border/40 font-medium" 
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground pl-1">Description (Optional)</Label>
            <Textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Brief description of the department..." 
              className="min-h-[100px] rounded-2xl bg-muted/20 border-border/40 font-medium p-4" 
            />
          </div>
        </div>
        <DialogFooter className="mt-4 gap-3 sm:justify-start">
          <Button 
            onClick={() => mutation.mutate()} 
            disabled={mutation.isPending} 
            className="h-12 flex-1 rounded-2xl gradient-primary font-bold shadow-glow text-base"
          >
            {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create Department"}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)} 
            className="h-12 px-8 rounded-2xl border-border/40 font-bold"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
