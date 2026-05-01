import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCourses, fetchMyStudentRow, fetchStudentEnrollments } from "@/lib/queries";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, Clock, MapPin, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 8 PM

export default function Timetable() {
  const { user } = useAuth();
  const { data: courses = [] } = useQuery({ queryKey: ["courses"], queryFn: fetchCourses });
  const { data: myStudent } = useQuery({
    queryKey: ["my-student", user?.matric_no],
    queryFn: () => fetchMyStudentRow(user?.matric_no),
    enabled: !!user && user.role === "student",
  });
  const { data: myEnrollments = [] } = useQuery({
    queryKey: ["my-enrollments", myStudent?.id],
    queryFn: () => fetchStudentEnrollments(myStudent!.id),
    enabled: !!myStudent,
  });

  const enrolledCourses = useMemo(() => {
    if (user?.role !== "student") return courses.filter(c => c.lecturer_id === user?.id);
    return courses.filter(c => myEnrollments.includes(c.id));
  }, [courses, myEnrollments, user]);

  const timetableData = useMemo(() => {
    const data: any[] = [];
    enrolledCourses.forEach(course => {
      if (!course.schedule) return;
      
      // Basic parser for "Mon 10:00 - 12:00"
      const parts = course.schedule.split(" ");
      if (parts.length < 4) return;
      
      const dayMap: Record<string, string> = { 
        Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday",
        Monday: "Monday", Tuesday: "Tuesday", Wednesday: "Wednesday", Thursday: "Thursday", Friday: "Friday"
      };
      
      const day = dayMap[parts[0].replace(/,/g, "")] || parts[0];
      const startTime = parts[1];
      const endTime = parts[3];
      
      const startHour = parseInt(startTime.split(":")[0]);
      const endHour = parseInt(endTime.split(":")[0]);
      const duration = endHour - startHour;

      data.push({
        ...course,
        day,
        startHour,
        duration,
        timeRange: `${startTime} - ${endTime}`
      });
    });
    return data;
  }, [enrolledCourses]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
           <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-glow">
             <Calendar className="h-7 w-7 text-white" />
           </div>
           <div>
             <h1 className="font-display text-4xl font-black tracking-tighter text-foreground">Academic Timetable</h1>
             <p className="text-sm text-muted-foreground font-medium">Your weekly orchestration of knowledge.</p>
           </div>
        </div>
        <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-border/40">
           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><ChevronLeft className="h-4 w-4" /></Button>
           <span className="text-xs font-black uppercase tracking-widest px-4">Current Week</span>
           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </header>

      <div className="rounded-[2.5rem] border border-border/40 bg-card/60 shadow-elevated backdrop-blur-xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Header */}
            <div className="grid grid-cols-6 border-b border-border/40 bg-muted/30">
              <div className="p-4 border-r border-border/40" />
              {DAYS.map(day => (
                <div key={day} className="p-4 text-center border-r border-border/40 last:border-r-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{day}</p>
                </div>
              ))}
            </div>

            {/* Grid Body */}
            <div className="relative">
              {HOURS.map(hour => (
                <div key={hour} className="grid grid-cols-6 h-24 border-b border-border/20 last:border-b-0">
                  <div className="p-4 border-r border-border/40 flex items-start justify-center">
                    <span className="text-[10px] font-bold text-muted-foreground">{hour}:00</span>
                  </div>
                  {DAYS.map(day => (
                    <div key={day} className="border-r border-border/20 last:border-r-0" />
                  ))}
                </div>
              ))}

              {/* Events Overlay */}
              <div className="absolute inset-0 grid grid-cols-6 pointer-events-none">
                <div /> {/* Time column spacer */}
                {DAYS.map(day => (
                  <div key={day} className="relative h-full">
                    {timetableData.filter(e => e.day === day).map((event, idx) => (
                      <div 
                        key={idx}
                        className={cn(
                          "absolute inset-x-1 rounded-2xl p-3 border border-white/20 shadow-lg pointer-events-auto transition-transform hover:scale-[1.02] hover:z-20",
                          "bg-gradient-to-br text-white",
                          event.color
                        )}
                        style={{
                          top: `${(event.startHour - 8) * 6}rem`,
                          height: `${event.duration * 6}rem`
                        }}
                      >
                         <p className="text-[9px] font-black uppercase opacity-70 tracking-widest">{event.code}</p>
                         <h4 className="text-xs font-black mt-1 leading-tight line-clamp-2">{event.title}</h4>
                         <div className="mt-auto space-y-1">
                            <div className="flex items-center gap-1.5 opacity-80">
                               <Clock className="h-2.5 w-2.5" />
                               <span className="text-[9px] font-bold">{event.timeRange}</span>
                            </div>
                            <div className="flex items-center gap-1.5 opacity-80">
                               <MapPin className="h-2.5 w-2.5" />
                               <span className="text-[9px] font-bold">{event.room}</span>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
         <div className="lg:col-span-2 rounded-[2rem] border border-border/40 bg-card/40 p-6 flex items-center gap-6">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
               <BookOpen className="h-6 w-6" />
            </div>
            <div>
               <h4 className="font-bold">Sync to Calendar</h4>
               <p className="text-xs text-muted-foreground font-medium">Export your academic schedule to Google Calendar or Outlook.</p>
            </div>
            <Button variant="outline" className="ml-auto rounded-xl font-bold text-xs uppercase tracking-widest">Connect</Button>
         </div>
      </div>
    </div>
  );
}
