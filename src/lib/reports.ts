import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { exportToCSV } from "@/lib/export";

export interface CourseMeta {
  id: string;
  code: string;
  title: string;
  department?: string | null;
  level?: string | null;
  session?: string | null;
  semester?: string | null;
  lecturer_name?: string;
}

export interface SummaryRow {
  serial: number;
  matric_no: string;
  name: string;
  attended: number;
  total: number;
  percentage: number;
}

export interface DetailedRow extends SummaryRow {
  perDate: { date: string; status: "present" | "late" | "absent" | "excused" | "—" }[];
}

export async function buildCourseReport(courseId: string): Promise<{
  course: CourseMeta;
  dates: string[];
  startDate: string | null;
  endDate: string | null;
  summary: SummaryRow[];
  detailed: DetailedRow[];
}> {
  const { data: course } = await supabase.from("courses").select("*").eq("id", courseId).single();
  if (!course) throw new Error("Course not found");

  let lecturer_name = "—";
  if (course.lecturer_id) {
    const { data: prof } = await supabase.from("profiles").select("name").eq("user_id", course.lecturer_id).maybeSingle();
    lecturer_name = prof?.name || "—";
  }

  const { data: sessions } = await supabase
    .from("attendance_sessions")
    .select("id, started_at")
    .eq("course_id", courseId)
    .order("started_at", { ascending: true });

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("student_id, students(id, name, matric_no)")
    .eq("course_id", courseId);

  const { data: records } = await supabase
    .from("attendance_records")
    .select("student_id, status, marked_at, session_id")
    .eq("course_id", courseId);

  const dateSet = new Set<string>();
  (sessions ?? []).forEach((s: any) => dateSet.add(new Date(s.started_at).toISOString().slice(0, 10)));
  // also include record dates without a session
  (records ?? []).forEach((r: any) => dateSet.add(new Date(r.marked_at).toISOString().slice(0, 10)));
  const dates = Array.from(dateSet).sort();

  const totalClasses = dates.length;

  // Build per-student aggregates
  const summary: SummaryRow[] = [];
  const detailed: DetailedRow[] = [];

  (enrollments ?? []).forEach((e: any, idx: number) => {
    const stu = e.students;
    if (!stu) return;
    const myRecs = (records ?? []).filter((r: any) => r.student_id === stu.id);
    const attendedDates = new Set<string>();
    myRecs.forEach((r: any) => {
      if (r.status === "present" || r.status === "late" || r.status === "excused") {
        attendedDates.add(new Date(r.marked_at).toISOString().slice(0, 10));
      }
    });
    const attended = attendedDates.size;
    const percentage = totalClasses === 0 ? 0 : Math.round((attended / totalClasses) * 100);

    const summaryRow: SummaryRow = {
      serial: idx + 1,
      matric_no: stu.matric_no,
      name: stu.name,
      attended,
      total: totalClasses,
      percentage,
    };
    summary.push(summaryRow);

    const perDate = dates.map((d) => {
      const rec = myRecs.find((r: any) => new Date(r.marked_at).toISOString().slice(0, 10) === d);
      return { date: d, status: (rec?.status as DetailedRow["perDate"][0]["status"]) || "absent" };
    });
    detailed.push({ ...summaryRow, perDate });
  });

  return {
    course: {
      id: course.id,
      code: course.code,
      title: course.title,
      department: course.department,
      level: course.level,
      session: course.session,
      semester: course.semester,
      lecturer_name,
    },
    dates,
    startDate: dates[0] || null,
    endDate: dates[dates.length - 1] || null,
    summary,
    detailed,
  };
}

export function downloadSummaryCSV(report: Awaited<ReturnType<typeof buildCourseReport>>) {
  const { course, summary, startDate, endDate } = report;
  const rows = summary.map((s) => ({
    Session: course.session || "",
    Semester: course.semester || "",
    Faculty: course.department || "",
    Course: course.code,
    Lecturer: course.lecturer_name || "",
    StartDate: startDate || "",
    EndDate: endDate || "",
    Serial: s.serial,
    MatricNo: s.matric_no,
    Name: s.name,
    Attended: s.attended,
    Total: s.total,
    Percentage: `${s.percentage}%`,
  }));
  exportToCSV(rows, `${course.code}_summary`);
}

export function downloadDetailsCSV(report: Awaited<ReturnType<typeof buildCourseReport>>) {
  const { course, detailed, dates } = report;
  const rows = detailed.map((s) => {
    const base: Record<string, any> = {
      Session: course.session || "",
      Semester: course.semester || "",
      Faculty: course.department || "",
      Course: course.code,
      Lecturer: course.lecturer_name || "",
      Serial: s.serial,
      MatricNo: s.matric_no,
      Name: s.name,
    };
    s.perDate.forEach((p) => (base[p.date] = p.status));
    base["Attended"] = s.attended;
    base["Total"] = s.total;
    base["Percentage"] = `${s.percentage}%`;
    return base;
  });
  exportToCSV(rows, `${course.code}_details`);
}

function pdfHeader(doc: jsPDF, course: CourseMeta, startDate: string | null, endDate: string | null, kind: "Summary" | "Details") {
  doc.setFontSize(16);
  doc.text(`${course.code} — ${course.title}`, 14, 16);
  doc.setFontSize(10);
  const meta = [
    `Session: ${course.session || "—"}`,
    `Semester: ${course.semester || "—"}`,
    `Faculty: ${course.department || "—"}`,
    `Lecturer: ${course.lecturer_name || "—"}`,
    `Period: ${startDate || "—"} → ${endDate || "—"}`,
    `Report: ${kind}`,
  ];
  meta.forEach((m, i) => doc.text(m, 14, 24 + i * 5));
}

export function downloadSummaryPDF(report: Awaited<ReturnType<typeof buildCourseReport>>) {
  const { course, summary, startDate, endDate } = report;
  const doc = new jsPDF();
  pdfHeader(doc, course, startDate, endDate, "Summary");
  autoTable(doc, {
    startY: 60,
    head: [["S/N", "Matric No", "Name", "Attended", "Total", "%"]],
    body: summary.map((s) => [s.serial, s.matric_no, s.name, s.attended, s.total, `${s.percentage}%`]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [0, 200, 168] },
  });
  doc.save(`${course.code}_summary.pdf`);
}

export function downloadDetailsPDF(report: Awaited<ReturnType<typeof buildCourseReport>>) {
  const { course, detailed, dates, startDate, endDate } = report;
  const doc = new jsPDF({ orientation: "landscape" });
  pdfHeader(doc, course, startDate, endDate, "Details");
  const head = [["S/N", "Matric No", "Name", ...dates.map((d) => d.slice(5)), "Att", "Tot", "%"]];
  const body = detailed.map((s) => [
    s.serial, s.matric_no, s.name,
    ...s.perDate.map((p) => p.status[0].toUpperCase()),
    s.attended, s.total, `${s.percentage}%`,
  ]);
  autoTable(doc, {
    startY: 60,
    head,
    body,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [0, 200, 168] },
  });
  doc.save(`${course.code}_details.pdf`);
}
