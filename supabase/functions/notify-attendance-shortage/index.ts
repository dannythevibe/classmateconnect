import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { z } from "https://esm.sh/zod@3.23.8";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

const BodySchema = z.object({
  recipients: z.array(z.object({
    email: z.string().email(),
    name: z.string().min(1),
    matric_no: z.string().optional().default(""),
    percentage: z.number(),
    course_code: z.string().optional().default(""),
  })).min(1).max(500),
  threshold: z.number().min(0).max(100),
  message: z.string().max(2000).optional(),
  from: z.string().optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id).maybeSingle();
    if (!roleRow || (roleRow.role !== "admin" && roleRow.role !== "lecturer")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { recipients, threshold, message, from } = parsed.data;
    const fromAddr = from || "Attendly <onboarding@resend.dev>";

    const sent: string[] = [];
    const failed: { email: string; error: string }[] = [];

    for (const r of recipients) {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a0b4d;">
          <h2 style="color: #00C8A8;">Attendance Notice</h2>
          <p>Hi <strong>${r.name}</strong>${r.matric_no ? ` (${r.matric_no})` : ""},</p>
          <p>Our records show your attendance ${r.course_code ? `for <strong>${r.course_code}</strong>` : ""} is currently <strong>${r.percentage}%</strong>, which is below the <strong>${threshold}%</strong> threshold.</p>
          ${message ? `<p>${message.replace(/</g, "&lt;")}</p>` : `<p>Please make sure to attend upcoming classes to avoid being barred from exams.</p>`}
          <p style="margin-top:24px; color:#777; font-size: 12px;">— Attendly Attendance System</p>
        </div>`;
      const res = await fetch(`${GATEWAY_URL}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": RESEND_API_KEY,
        },
        body: JSON.stringify({
          from: fromAddr,
          to: [r.email],
          subject: `Attendance below ${threshold}% — action needed`,
          html,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        failed.push({ email: r.email, error: `${res.status}: ${text.slice(0, 200)}` });
      } else {
        sent.push(r.email);
      }
    }

    return new Response(JSON.stringify({ sent: sent.length, failed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
