import { toast } from "sonner";

export interface OfflineCheckin {
  id: string;
  session_id: string | null;
  course_id: string;
  student_id: string;
  status: string;
  method: string;
  latitude: number | null;
  longitude: number | null;
  metadata: any;
  timestamp: string;
}

const QUEUE_KEY = "attendly_offline_queue";

export function getOfflineQueue(): OfflineCheckin[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addToOfflineQueue(checkin: Omit<OfflineCheckin, "id" | "timestamp">) {
  const queue = getOfflineQueue();
  const newItem: OfflineCheckin = {
    ...checkin,
    id: Math.random().toString(36).substring(2, 11),
    timestamp: new Date().toISOString()
  };
  localStorage.setItem(QUEUE_KEY, JSON.stringify([...queue, newItem]));
  toast.success("Offline: Your check-in is queued and will sync when reconnected.");
}

export function clearOfflineItem(id: string) {
  const queue = getOfflineQueue().filter(i => i.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function hasOfflineItems(): boolean {
  return getOfflineQueue().length > 0;
}
