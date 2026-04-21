import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertCircle, FileText, Send } from "lucide-react";

interface SubmitExcuseProps {
  studentId: string;
  courseId: string;
  sessionId?: string;
  courseCode: string;
  onSuccess?: () => void;
}

export default function SubmitExcuseDialog({ studentId, courseId, sessionId, courseCode, onSuccess }: SubmitExcuseProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [attachment, setAttachment] = useState("");
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!reason.trim()) throw new Error("Please provide a reason");
      
      const { error } = await supabase.from("attendance_excuses").insert({
        student_id: studentId,
        course_id: courseId,
        session_id: sessionId || null,
        reason: reason.trim(),
        attachment_url: attachment.trim() || null,
        status: "pending"
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Excuse submitted for review");
      setReason("");
      setAttachment("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["my-attendance"] });
      onSuccess?.();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 rounded-lg border-primary/30 text-primary bg-primary/5 hover:bg-primary/10">
          <AlertCircle className="mr-2 h-3.5 w-3.5" /> Submit Excuse
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-[2.5rem] border border-border/40 bg-card/95 backdrop-blur-xl p-8 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tighter">Submit Justification</DialogTitle>
          <DialogDescription className="text-sm font-medium text-muted-foreground mt-2">
            Providing an excuse for your absence in <span className="font-bold text-foreground">{courseCode}</span>.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-8 space-y-6">
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reason for Absence</Label>
            <Textarea 
              placeholder="Explain why you missed the session (medical, personal emergency, etc.)" 
              className="h-32 rounded-2xl bg-muted/40 border-border/40 font-medium resize-none"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Evidence Link (Optional)</Label>
            <div className="relative">
               <FileText className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input 
                 placeholder="Link to medical report or document..." 
                 className="h-12 pl-12 rounded-xl bg-muted/40 border-border/40 font-medium"
                 value={attachment}
                 onChange={(e) => setAttachment(e.target.value)}
               />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-10">
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="h-12 w-full rounded-2xl gradient-primary font-bold shadow-glow">
            {mutation.isPending ? "Submitting..." : <><Send className="mr-2 h-4 w-4" /> Send for Approval</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
