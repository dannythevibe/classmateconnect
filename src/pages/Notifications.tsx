import { mockNotifications } from "@/lib/mock-data";
import { Bell, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const icons = { success: CheckCircle2, warning: AlertTriangle, info: Info };
const colors = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning",
  info: "bg-primary/10 text-primary",
};

export default function Notifications() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Notifications</h1>
        <p className="text-sm text-muted-foreground">Reminders, alerts and class updates</p>
      </div>

      <div className="space-y-3">
        {mockNotifications.map((n) => {
          const Icon = icons[n.type];
          return (
            <div key={n.id} className={cn("flex items-start gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft transition-smooth hover:shadow-elevated", !n.read && "border-primary/30 bg-primary/5")}>
              <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", colors[n.type])}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{n.title}</p>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">{n.time}</p>
              </div>
            </div>
          );
        })}
      </div>

      {mockNotifications.length === 0 && (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border p-12 text-center">
          <Bell className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-semibold">No notifications</p>
          <p className="text-sm text-muted-foreground">You're all caught up</p>
        </div>
      )}
    </div>
  );
}
