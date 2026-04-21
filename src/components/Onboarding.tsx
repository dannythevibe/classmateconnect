import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sparkles, ChevronRight, X, LayoutDashboard, QrCode, BookOpen, Calendar, ClipboardCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Step {
  title: string;
  description: string;
  icon: any;
  highlight?: string; // CSS selector to highlight
}

const STUDENT_STEPS: Step[] = [
  { title: "Welcome to Attendly", description: "Your academic command center. Track your attendance, grades, and schedule in one place.", icon: Sparkles },
  { title: "Join Courses", description: "Head to 'My Courses' to register for your classes this semester.", icon: BookOpen },
  { title: "Verify Attendance", description: "Use the 'Attendance' page to scan QR codes or enter tokens provided by your lecturers.", icon: ClipboardCheck },
  { title: "Weekly Timetable", description: "Check your dedicated Timetable to stay on top of your weekly routine.", icon: Calendar },
];

const LECTURER_STEPS: Step[] = [
  { title: "Command Center", description: "Welcome, Lecturer. Manage your courses and track student engagement with ease.", icon: LayoutDashboard },
  { title: "Run Sessions", description: "Start a live session in seconds. The system generates a high-security QR code for your students.", icon: QrCode },
  { title: "Manage Excuses", description: "Review and approve student justifications for absences directly in the Attendance Center.", icon: Sparkles },
  { title: "Analytics Depth", description: "View per-student trends and identify at-risk students before they fall behind.", icon: BookOpen },
];

export default function Onboarding() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    if (!user) return;
    const hasSeen = localStorage.getItem(`onboarding_seen_${user.id}`);
    if (!hasSeen) setShow(true);
  }, [user]);

  const steps = user?.role === "student" ? STUDENT_STEPS : LECTURER_STEPS;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      complete();
    }
  };

  const complete = () => {
    localStorage.setItem(`onboarding_seen_${user?.id}`, "true");
    setShow(false);
  };

  const reset = () => {
    setCurrentStep(0);
    setShow(true);
  };

  // Expose reset to window for the Profile page to call
  useEffect(() => {
    (window as any).restartOnboarding = reset;
    return () => delete (window as any).restartOnboarding;
  }, []);

  if (!show || !user || user.role === "admin") return null;

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/60 backdrop-blur-sm" 
          onClick={complete}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg overflow-hidden rounded-[3rem] border border-border/40 bg-card/95 p-10 shadow-2xl backdrop-blur-2xl"
        >
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-[100px]" />
          
          <button onClick={complete} className="absolute right-6 top-6 rounded-full p-2 hover:bg-muted text-muted-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>

          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] gradient-primary shadow-glow mb-8 animate-float">
               <Icon className="h-8 w-8 text-white" />
            </div>

            <div className="space-y-4">
               <div className="flex items-center gap-3">
                 <Badge variant="outline" className="rounded-full border-primary/30 text-primary text-[10px] font-black uppercase tracking-widest px-3">
                   Step {currentStep + 1} of {steps.length}
                 </Badge>
                 <div className="h-px flex-1 bg-border/20" />
               </div>
               <h2 className="font-display text-4xl font-black tracking-tighter text-foreground leading-tight">
                 {step.title}
               </h2>
               <p className="text-lg font-medium text-muted-foreground leading-relaxed">
                 {step.description}
               </p>
            </div>

            <div className="mt-12 flex items-center justify-between">
               <div className="flex gap-1.5">
                  {steps.map((_, i) => (
                    <div key={i} className={cn("h-1.5 rounded-full transition-all duration-500", i === currentStep ? "w-8 bg-primary" : "w-1.5 bg-border/40")} />
                  ))}
               </div>
               <Button onClick={handleNext} size="lg" className="h-14 rounded-2xl bg-primary px-8 text-base font-bold text-white shadow-glow transition-all hover:scale-105 active:scale-95">
                 {currentStep === steps.length - 1 ? "Get Started" : "Next Step"}
                 <ChevronRight className="ml-2 h-5 w-5" />
               </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
