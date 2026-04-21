import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getOfflineQueue, clearOfflineItem } from "@/lib/offline";
import { toast } from "sonner";

export default function SyncManager() {
  useEffect(() => {
    const handleSync = async () => {
      const queue = getOfflineQueue();
      if (queue.length === 0) return;

      toast.info(`Syncing ${queue.length} offline check-ins...`);
      
      for (const item of queue) {
        const { id, timestamp, ...payload } = item;
        // Adjust metadata to include original capture time
        const metadata = { ...payload.metadata, captured_at: timestamp, offline_sync: true };
        
        const { error } = await supabase.from("attendance_records").insert({
          ...payload,
          metadata
        } as any);

        if (!error || error.code === "23505") { // Success or already marked
          clearOfflineItem(id);
        } else {
          console.error("Sync failed for", id, error);
        }
      }
      
      toast.success("Offline sync complete!");
    };

    window.addEventListener("online", handleSync);
    // Also check on initial mount
    if (navigator.onLine) handleSync();

    return () => window.removeEventListener("online", handleSync);
  }, []);

  return null;
}
