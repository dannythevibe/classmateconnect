import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, FileSpreadsheet, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { fetchCourses } from "@/lib/queries";
import { buildCourseReport, downloadSummaryCSV, downloadSummaryPDF, downloadDetailsCSV, downloadDetailsPDF } from "@/lib/reports";

export default function CourseReportDialog() {
  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [busy, setBusy] = useState<null | string>(null);
  const { data: courses = [] } = useQuery({ queryKey: ["courses"], queryFn: fetchCourses });

  const run = async (kind: "summary-pdf" | "summary-csv" | "details-pdf" | "details-csv") => {
    if (!courseId) { toast.error("Pick a course"); return; }
    setBusy(kind);
    try {
      const report = await buildCourseReport(courseId);
      if (report.dates.length === 0) toast.message("No attendance recorded yet — generating empty report.");
      if (kind === "summary-pdf") downloadSummaryPDF(report);
      if (kind === "summary-csv") downloadSummaryCSV(report);
      if (kind === "details-pdf") downloadDetailsPDF(report);
      if (kind === "details-csv") downloadDetailsCSV(report);
      toast.success("Downloaded");
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally { setBusy(null); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-12 rounded-2xl border-border/40 font-bold px-6 shadow-soft">
          <Download className="mr-2 h-4 w-4" /> Course report
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl p-6 max-w-lg">
        <DialogHeader><DialogTitle className="text-2xl font-black">Download course report</DialogTitle></DialogHeader>

        <div className="space-y-2 mt-4">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Course</label>
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger><SelectValue placeholder="Select a course" /></SelectTrigger>
            <SelectContent>
              {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="border rounded-2xl p-4 space-y-3">
            <p className="font-bold">Summary</p>
            <p className="text-xs text-muted-foreground">Course info, S/N, matric, name, attended, total, %.</p>
            <Button disabled={!!busy} onClick={() => run("summary-pdf")} className="w-full" variant="outline">
              {busy === "summary-pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><FileText className="mr-2 h-4 w-4" /> PDF</>}
            </Button>
            <Button disabled={!!busy} onClick={() => run("summary-csv")} className="w-full" variant="outline">
              {busy === "summary-csv" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><FileSpreadsheet className="mr-2 h-4 w-4" /> CSV</>}
            </Button>
          </div>
          <div className="border rounded-2xl p-4 space-y-3">
            <p className="font-bold">Details</p>
            <p className="text-xs text-muted-foreground">All dates, status per day, totals & %.</p>
            <Button disabled={!!busy} onClick={() => run("details-pdf")} className="w-full" variant="outline">
              {busy === "details-pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><FileText className="mr-2 h-4 w-4" /> PDF</>}
            </Button>
            <Button disabled={!!busy} onClick={() => run("details-csv")} className="w-full" variant="outline">
              {busy === "details-csv" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><FileSpreadsheet className="mr-2 h-4 w-4" /> CSV</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
