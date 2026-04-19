import { supabase } from "@/integrations/supabase/client";

export type Course = {
  id: string;
  code: string;
  title: string;
  lecturer_id: string;
  schedule: string;
  room: string;
  color: string;
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
  lecturer_id: string;
  token: string;
  started_at: string;
  expires_at: string;
  room: string;
};

export type AttendanceRecord = {
  id: string;
  session_id: string | null;
  course_id: string;
  student_id: string;
  status: "present" | "late" | "absent";
  method: "qr" | "manual" | "gps";
  marked_at: string;
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

export async function fetchCourses(): Promise<Course[]> {
  const { data, error } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Course[];
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

export async function fetchActiveSessionByToken(token: string): Promise<AttendanceSession | null> {
  const { data, error } = await supabase
    .from("attendance_sessions")
    .select("*")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  return data as AttendanceSession | null;
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
