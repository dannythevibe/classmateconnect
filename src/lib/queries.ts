import { supabase } from "@/integrations/supabase/client";

export type Course = {
  id: string;
  code: string;
  title: string;
  lecturer_id: string;
  schedule: string;
  room: string;
  color: string;
  level: string | null;
  department: string | null;
  lecturer_name?: string;
  created_at: string;
};

export type Student = {
  id: string;
  name: string;
  matric_no: string;
  department: string;
  level: string;
  created_at: string;
};

export type AttendanceSession = {
  id: string;
  course_id: string;
  token: string;
  started_at: string;
  expires_at: string;
  room: string;
  latitude: number | null;
  longitude: number | null;
  late_cutoff_mins: number;
};


export type AttendanceRecord = {
  id: string;
  session_id: string | null;
  course_id: string;
  student_id: string;
  status: "present" | "late" | "absent" | "excused";
  method: "qr" | "manual" | "gps";
  marked_at: string;
  latitude: number | null;
  longitude: number | null;
  metadata: any;
  excuse_id?: string;
};

export type AttendanceExcuse = {
  id: string;
  student_id: string;
  course_id: string;
  session_id: string | null;
  reason: string;
  attachment_url: string | null;
  status: "pending" | "approved" | "rejected";
  lecturer_comment: string | null;
  created_at: string;
  student_name?: string;
  course_code?: string;
};



export type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success";
  read: boolean;
  created_at: string;
};

export const courseColors = [
  "from-violet-500 to-fuchsia-500",
  "from-cyan-500 to-blue-500",
  "from-pink-500 to-rose-500",
  "from-amber-500 to-orange-500",
  "from-emerald-500 to-teal-500",
  "from-indigo-500 to-purple-500",
];

export async function fetchCourses() {
  const { data, error } = await supabase.from("courses").select("*");
  if (error) throw error;

  const lecturerIds = Array.from(new Set((data ?? []).map((c: any) => c.lecturer_id).filter(Boolean)));
  let nameMap: Record<string, string> = {};
  if (lecturerIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, name")
      .in("user_id", lecturerIds);
    nameMap = Object.fromEntries((profs ?? []).map((p: any) => [p.user_id, p.name]));
  }

  return (data ?? []).map((c: any) => ({
    ...c,
    lecturer_name: nameMap[c.lecturer_id] || "Unknown Lecturer",
  })) as Course[];
}

export async function fetchStudents(): Promise<Student[]> {
  const { data, error } = await supabase.from("students").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as Student[];
}

export async function fetchEnrollmentCounts(courseIds: string[]): Promise<Record<string, number>> {
  if (courseIds.length === 0) return {};
  const { data, error } = await supabase
    .from("enrollments")
    .select("course_id")
    .in("course_id", courseIds);
  if (error) throw error;
  const counts: Record<string, number> = {};
  (data ?? []).forEach((r: { course_id: string }) => {
    counts[r.course_id] = (counts[r.course_id] ?? 0) + 1;
  });
  return counts;
}

export async function fetchAttendanceRates(courseIds: string[]): Promise<Record<string, number>> {
  if (courseIds.length === 0) return {};
  const { data, error } = await supabase
    .from("attendance_records")
    .select("course_id, status")
    .in("course_id", courseIds);
  if (error) throw error;
  const totals: Record<string, { p: number; t: number }> = {};
  (data ?? []).forEach((r: { course_id: string; status: string }) => {
    const t = (totals[r.course_id] = totals[r.course_id] ?? { p: 0, t: 0 });
    t.t += 1;
    if (r.status === "present" || r.status === "late") t.p += 1;
  });
  const out: Record<string, number> = {};
  Object.entries(totals).forEach(([k, v]) => (out[k] = v.t === 0 ? 0 : Math.round((v.p / v.t) * 100)));
  return out;
}

export async function fetchActiveSessionForCourse(courseId: string): Promise<AttendanceSession | null> {
  const { data, error } = await supabase
    .from("attendance_sessions")
    .select("*")
    .eq("course_id", courseId)
    .gt("expires_at", new Date().toISOString())
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as AttendanceSession | null;
}

export async function fetchActiveSessionByToken(token: string): Promise<(AttendanceSession & { courses: { code: string; room: string } }) | null> {
  const { data, error } = await supabase
    .from("attendance_sessions")
    .select("*, courses(code, room)")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  return data as any;
}


export async function fetchMyStudentRow(matricNo: string | undefined): Promise<Student | null> {
  if (!matricNo) return null;
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("matric_no", matricNo)
    .maybeSingle();
  if (error) throw error;
  return data as Student | null;
}

export async function fetchStudentEnrollments(studentId: string) {
  const { data, error } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", studentId);
  if (error) throw error;
  return (data ?? []).map(e => e.course_id);
}

export async function enrollInCourse(studentId: string, courseId: string) {
  const { error } = await supabase
    .from("enrollments")
    .insert({ student_id: studentId, course_id: courseId });
  if (error) throw error;
}

export async function unenrollFromCourse(studentId: string, courseId: string) {
  const { error } = await supabase
    .from("enrollments")
    .delete()
    .eq("student_id", studentId)
    .eq("course_id", courseId);
  if (error) throw error;
}

export async function createNotification(userId: string, title: string, message: string, type: "info" | "warning" | "success" = "info") {
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    title,
    message,
    type
  });
  if (error) console.error("Notification Error:", error);
}

export async function fetchAllAttendanceRecords() {
  const { data, error } = await supabase.from("attendance_records").select("*");
  if (error) throw error;
  return data ?? [];
}


