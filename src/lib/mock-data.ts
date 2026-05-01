// Type definitions used across the app. All data now lives in Supabase.
export type Role = "student" | "lecturer" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  matric_no?: string;
  department: string;
  level: string;
  avatar?: string;
}

