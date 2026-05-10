import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldCheck, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

type AuditRow = {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

async function fetchLogs(): Promise<AuditRow[]> {
  const { data, error } = await supabase
    .from("audit_logs" as any)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data as any) ?? [];
}

const actionColor = (a: string) => {
  if (a.endsWith(".delete")) return "bg-destructive/10 text-destructive";
  if (a.endsWith(".create")) return "bg-emerald-500/10 text-emerald-600";
  if (a.startsWith("attendance.")) return "bg-primary/10 text-primary";
  return "bg-muted text-muted-foreground";
};

export default function AdminAudit() {
  const qc = useQueryClient();
  const { data: logs = [], isLoading } = useQuery({ queryKey: ["audit-logs"], queryFn: fetchLogs });

  useEffect(() => {
    const ch = supabase
      .channel("audit-logs-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, () => {
        qc.invalidateQueries({ queryKey: ["audit-logs"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20 animate-in fade-in duration-500">
      <header className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-glow">
          <ShieldCheck className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tighter">System Audit</h1>
          <p className="text-sm text-muted-foreground font-medium">Live trail of changes across the platform.</p>
        </div>
      </header>

      {isLoading ? (
        <div className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" /></div>
      ) : logs.length === 0 ? (
        <div className="rounded-3xl border border-dashed p-20 text-center text-muted-foreground">
          <Activity className="h-10 w-10 mx-auto mb-3 opacity-60" />
          <p className="font-bold">No audit events yet.</p>
        </div>
      ) : (
        <div className="rounded-3xl border border-border/40 bg-card/60 backdrop-blur-xl divide-y divide-border/30">
          {logs.map(l => (
            <div key={l.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4">
              <Badge className={`${actionColor(l.action)} border-none font-black text-[10px] uppercase tracking-widest shrink-0`}>
                {l.action}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{l.entity_type} <span className="text-muted-foreground font-mono text-xs">{l.entity_id?.slice(0, 8)}</span></p>
                <p className="text-xs text-muted-foreground truncate">{JSON.stringify(l.details)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{l.actor_role || "system"}</p>
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
