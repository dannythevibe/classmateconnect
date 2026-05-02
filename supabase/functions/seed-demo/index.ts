// Demo seed: creates/refreshes demo admin, lecturer, student accounts + sample data.
// Returns credentials so the UI can sign in immediately.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEMO_PASSWORD = "Demo1234!";
const DEMO = {
  admin:    { email: "demo.admin@attendly.dev",    name: "Demo Admin",    role: "admin",    department: "Administration", level: "",    matric_no: "" },
  lecturer: { email: "demo.lecturer@attendly.dev", name: "Dr. Demo Lect", role: "lecturer", department: "Computer Science", level: "",   matric_no: "" },
  student:  { email: "demo.student@attendly.dev",  name: "Demo Student",  role: "student",  department: "Computer Science", level: "300", matric_no: "VUG/CSC/21/045" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    const body = await req.json().catch(() => ({}));
    const which: "admin" | "lecturer" | "student" = body.role ?? "admin";

    // Ensure all 3 demo users exist
    const ids: Record<string, string> = {};
    for (const [key, u] of Object.entries(DEMO)) {
      // Try to find existing user
      const { data: list } = await admin.auth.admin.listUsers();
      const existing = list?.users?.find((x) => x.email === u.email);
      let userId = existing?.id;

      if (!userId) {
        const { data: created, error } = await admin.auth.admin.createUser({
          email: u.email,
          password: DEMO_PASSWORD,
          email_confirm: true,
          user_metadata: {
            name: u.name, role: u.role, department: u.department,
            level: u.level, matric_no: u.matric_no,
          },
        });
        if (error) throw new Error(`Create ${key}: ${error.message}`);
        userId = created.user!.id;
      } else {
        // Reset password so it always works
        await admin.auth.admin.updateUserById(userId, { password: DEMO_PASSWORD });
      }
      ids[key] = userId!;

      // Upsert profile
      await admin.from("profiles").upsert({
        user_id: userId, name: u.name, email: u.email,
        department: u.department, level: u.level, matric_no: u.matric_no,
      }, { onConflict: "user_id" });

      // Ensure role row
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
      if (!roles?.some((r) => r.role === u.role)) {
        await admin.from("user_roles").insert({ user_id: userId, role: u.role });
      }
    }

    // Department
    await admin.from("departments").upsert({ name: "Computer Science", description: "Demo dept" }, { onConflict: "name" });

    // Student row
    const { data: stuRow } = await admin.from("students")
      .upsert({
        name: DEMO.student.name, matric_no: DEMO.student.matric_no,
        department: DEMO.student.department, level: DEMO.student.level,
        created_by: ids.admin,
      }, { onConflict: "matric_no" })
      .select().single();

    // Course taught by demo lecturer
    let { data: course } = await admin.from("courses").select("*").eq("code", "CSC301").maybeSingle();
    if (!course) {
      const { data: c } = await admin.from("courses").insert({
        code: "CSC301", title: "Software Engineering",
        lecturer_id: ids.lecturer, department: "Computer Science",
        level: "300", session: "2025/2026", semester: "First",
        schedule: "Mon 10:00", room: "LT1", faculty: "Science",
      }).select().single();
      course = c;
    }

    // Enroll student
    if (course && stuRow) {
      const { data: enr } = await admin.from("enrollments")
        .select("id").eq("course_id", course.id).eq("student_id", stuRow.id).maybeSingle();
      if (!enr) await admin.from("enrollments").insert({ course_id: course.id, student_id: stuRow.id });

      // Seed a few attendance records
      const { count } = await admin.from("attendance_records")
        .select("*", { count: "exact", head: true })
        .eq("course_id", course.id).eq("student_id", stuRow.id);
      if (!count) {
        const now = Date.now();
        const recs = [
          { status: "present", days: 1 },
          { status: "present", days: 8 },
          { status: "absent",  days: 15 },
          { status: "late",    days: 22 },
          { status: "present", days: 29 },
        ].map((r) => ({
          course_id: course!.id, student_id: stuRow!.id,
          status: r.status, method: "qr",
          marked_at: new Date(now - r.days * 86400000).toISOString(),
        }));
        await admin.from("attendance_records").insert(recs);
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      credentials: { email: DEMO[which].email, password: DEMO_PASSWORD },
      all: Object.fromEntries(Object.entries(DEMO).map(([k, v]) => [k, { email: v.email, password: DEMO_PASSWORD }])),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("seed-demo error:", e);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
