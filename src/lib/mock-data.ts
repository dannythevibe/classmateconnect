export type Role = "student" | "lecturer" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  matricNo?: string;
  department: string;
  avatar?: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  lecturer: string;
  schedule: string;
  room: string;
  students: number;
  attendanceRate: number;
  color: string;
}

export interface Student {
  id: string;
  name: string;
  matricNo: string;
  department: string;
  level: string;
  attendanceRate: number;
  status: "active" | "at-risk" | "excellent";
}

export interface AttendanceRecord {
  id: string;
  date: string;
  course: string;
  status: "present" | "absent" | "late";
  method: "qr" | "manual" | "gps";
  location?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "info" | "warning" | "success";
  read: boolean;
}

export const mockUsers: Record<Role, User> = {
  student: {
    id: "s1",
    name: "Amara Okafor",
    email: "amara.o@uni.edu",
    role: "student",
    matricNo: "CSC/2021/045",
    department: "Computer Science",
  },
  lecturer: {
    id: "l1",
    name: "Dr. Tunde Adeyemi",
    email: "tunde.a@uni.edu",
    role: "lecturer",
    department: "Computer Science",
  },
  admin: {
    id: "a1",
    name: "Prof. Bello Hassan",
    email: "bello.h@uni.edu",
    role: "admin",
    department: "Administration",
  },
};

export const mockCourses: Course[] = [
  { id: "c1", code: "CSC 401", title: "Advanced Algorithms", lecturer: "Dr. Tunde Adeyemi", schedule: "Mon 10:00 - 12:00", room: "LH-3", students: 64, attendanceRate: 87, color: "from-violet-500 to-fuchsia-500" },
  { id: "c2", code: "CSC 405", title: "Machine Learning", lecturer: "Dr. Ngozi Eze", schedule: "Tue 14:00 - 16:00", room: "Lab-2", students: 48, attendanceRate: 92, color: "from-cyan-500 to-blue-500" },
  { id: "c3", code: "CSC 411", title: "Mobile Computing", lecturer: "Dr. Tunde Adeyemi", schedule: "Wed 09:00 - 11:00", room: "LH-1", students: 52, attendanceRate: 78, color: "from-pink-500 to-rose-500" },
  { id: "c4", code: "CSC 421", title: "Cloud Systems", lecturer: "Dr. Femi Okoye", schedule: "Thu 11:00 - 13:00", room: "LH-2", students: 41, attendanceRate: 81, color: "from-amber-500 to-orange-500" },
];

export const mockStudents: Student[] = [
  { id: "st1", name: "Amara Okafor", matricNo: "CSC/2021/045", department: "Computer Science", level: "400", attendanceRate: 92, status: "excellent" },
  { id: "st2", name: "Chidi Nwosu", matricNo: "CSC/2021/021", department: "Computer Science", level: "400", attendanceRate: 78, status: "active" },
  { id: "st3", name: "Funke Adebayo", matricNo: "CSC/2021/008", department: "Computer Science", level: "400", attendanceRate: 65, status: "at-risk" },
  { id: "st4", name: "Ibrahim Musa", matricNo: "CSC/2021/067", department: "Computer Science", level: "400", attendanceRate: 88, status: "active" },
  { id: "st5", name: "Kemi Olatunji", matricNo: "CSC/2021/033", department: "Computer Science", level: "400", attendanceRate: 95, status: "excellent" },
  { id: "st6", name: "Segun Bakare", matricNo: "CSC/2021/051", department: "Computer Science", level: "400", attendanceRate: 58, status: "at-risk" },
  { id: "st7", name: "Zainab Yusuf", matricNo: "CSC/2021/012", department: "Computer Science", level: "400", attendanceRate: 84, status: "active" },
];

export const mockAttendance: AttendanceRecord[] = [
  { id: "a1", date: "2026-04-15", course: "CSC 401", status: "present", method: "qr", location: "LH-3" },
  { id: "a2", date: "2026-04-14", course: "CSC 405", status: "present", method: "gps", location: "Lab-2" },
  { id: "a3", date: "2026-04-13", course: "CSC 411", status: "late", method: "qr", location: "LH-1" },
  { id: "a4", date: "2026-04-12", course: "CSC 421", status: "absent", method: "manual" },
  { id: "a5", date: "2026-04-11", course: "CSC 401", status: "present", method: "qr", location: "LH-3" },
  { id: "a6", date: "2026-04-10", course: "CSC 405", status: "present", method: "gps", location: "Lab-2" },
  { id: "a7", date: "2026-04-09", course: "CSC 411", status: "present", method: "qr", location: "LH-1" },
];

export const weeklyTrend = [
  { day: "Mon", rate: 88 },
  { day: "Tue", rate: 92 },
  { day: "Wed", rate: 78 },
  { day: "Thu", rate: 85 },
  { day: "Fri", rate: 90 },
];

export const monthlyTrend = [
  { week: "W1", attendance: 82 },
  { week: "W2", attendance: 88 },
  { week: "W3", attendance: 85 },
  { week: "W4", attendance: 91 },
];

export const mockNotifications: Notification[] = [
  { id: "n1", title: "Attendance is open", message: "CSC 401 — scan QR within 5 minutes", time: "2 min ago", type: "info", read: false },
  { id: "n2", title: "Low attendance warning", message: "You're at 65% in CSC 411", time: "1 hr ago", type: "warning", read: false },
  { id: "n3", title: "Marked present ✓", message: "CSC 405 attendance confirmed via GPS", time: "Yesterday", type: "success", read: true },
  { id: "n4", title: "Class reminder", message: "CSC 421 starts in 30 minutes — LH-2", time: "Yesterday", type: "info", read: true },
];
