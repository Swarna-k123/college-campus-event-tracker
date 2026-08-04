import { useEffect, useState } from "react";
import { Loader2, Search, CheckCircle2, XCircle, Users, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DashboardCard } from "@/components/DashboardCard";
import type { ManagerEvent, Registrant } from "@/data/managerEvents";
import { fetchEventAttendance, saveAttendance, type StudentAttendance, type AttendanceStatus, type DatabaseAttendanceStatus } from "@/lib/attendance";
import { useAuth } from "@/context/AuthContext";

function fromDatabaseStatus(status: DatabaseAttendanceStatus): AttendanceStatus {
  return status === "PRESENT" ? "present" : "absent";
}

const DURATION_OPTIONS = [
  { label: "15 minutes", value: "15" },
  { label: "30 minutes", value: "30" },
  { label: "60 minutes", value: "60" },
  { label: "120 minutes", value: "120" },
];

type FilterType = "all" | "present" | "absent";
type ActiveTab = "manual" | "scan";

interface Props {
  event: ManagerEvent | null;
  registrants: Registrant[];
  loading?: boolean;
  onClose: () => void;
  onStartQrSession?: (durationMinutes: number) => void;
}

export const AttendanceDialog = ({ event, registrants, loading, onClose, onStartQrSession }: Props) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [attendanceData, setAttendanceData] = useState<StudentAttendance[]>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("manual");
  const [sessionDuration, setSessionDuration] = useState("60");

  useEffect(() => {
    if (event && registrants.length > 0) {
      loadAttendance();
    }
  }, [event, registrants]);

  const loadAttendance = async () => {
    if (!event) return;
    setIsLoadingAttendance(true);
    try {
      const attendanceMap = await fetchEventAttendance(event.id);
      
      const studentAttendance: StudentAttendance[] = registrants.map((reg) => {
        const existingRecord = attendanceMap.get(reg.studentId);
        return {
          registrationId: reg.id,
          studentId: reg.studentId,
          name: reg.name,
          email: reg.email,
          usn: reg.teamDetails?.leader.usn || null,
          department: reg.branch,
          status: existingRecord ? fromDatabaseStatus(existingRecord.status) : "absent",
        };
      });
      
      setAttendanceData(studentAttendance);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load attendance");
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  const handleStatusChange = (studentId: string, newStatus: AttendanceStatus) => {
    setAttendanceData((prev) =>
      prev.map((student) =>
        student.studentId === studentId ? { ...student, status: newStatus } : student
      )
    );
  };

  const handleMarkAllPresent = () => {
    setAttendanceData((prev) => prev.map((student) => ({ ...student, status: "present" })));
  };

  const handleSaveAttendance = async () => {
    if (!event || !user) return;
    setIsSaving(true);
    try {
      await saveAttendance(event.id, attendanceData, user.id);
      toast.success("Attendance saved successfully");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save attendance");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStudents = attendanceData.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.usn && student.usn.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter =
      filter === "all" || student.status === filter;

    return matchesSearch && matchesFilter;
  });

  const totalStudents = attendanceData.length;
  const presentCount = attendanceData.filter((s) => s.status === "present").length;
  const absentCount = attendanceData.filter((s) => s.status === "absent").length;
  const markedCount = attendanceData.filter((s) => s.status === "present").length;
  const progressPercent = totalStudents > 0 ? Math.round((markedCount / totalStudents) * 100) : 0;

  if (!event) return null;

  return (
    <Dialog open={!!event} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl bg-gradient-card border-border/60 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{event.title}</DialogTitle>
          <DialogDescription>Manage attendance for registered students.</DialogDescription>
        </DialogHeader>

        {isLoadingAttendance ? (
          <div className="py-12 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading attendance…
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4">
              <DashboardCard className="bg-secondary/30 border-border/60">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{totalStudents}</p>
                    <p className="text-xs text-muted-foreground">Total Registered</p>
                  </div>
                </div>
              </DashboardCard>
              <DashboardCard className="bg-emerald-500/10 border-emerald-500/30">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <div>
                    <p className="text-2xl font-bold text-emerald-400">{presentCount}</p>
                    <p className="text-xs text-muted-foreground">Present</p>
                  </div>
                </div>
              </DashboardCard>
              <DashboardCard className="bg-destructive/10 border-destructive/30">
                <div className="flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="text-2xl font-bold text-destructive">{absentCount}</p>
                    <p className="text-xs text-muted-foreground">Absent</p>
                  </div>
                </div>
              </DashboardCard>
            </div>

            {/* Progress Indicator */}
            <div className="py-2">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Attendance Progress</span>
                <span className="font-medium">{markedCount} / {totalStudents} Students Marked</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            <div className="flex flex-wrap gap-2 py-2">
              <Button
                variant={activeTab === "manual" ? "default" : "outline"}
                onClick={() => setActiveTab("manual")}
                className={cn(activeTab === "manual" ? "bg-primary" : "border-border/60")}
              >
                <Users className="h-4 w-4 mr-2" /> Manual Attendance
              </Button>
              <Button
                variant={activeTab === "scan" ? "default" : "outline"}
                onClick={() => setActiveTab("scan")}
                className={cn(activeTab === "scan" ? "bg-primary" : "border-border/60")}
              >
                <QrCode className="h-4 w-4 mr-2" /> Scan QR
              </Button>
            </div>

            {activeTab === "scan" ? (
              <div className="space-y-4 rounded-2xl border border-border/60 bg-card/70 p-6">
                <div className="text-center space-y-2">
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                    <QrCode className="h-7 w-7 text-primary" />
                  </div>
                  <p className="font-semibold text-lg">QR Attendance Session</p>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    Start a live QR session. A full-screen QR code will be displayed for students to scan and mark their attendance automatically.
                  </p>
                </div>

                <div className="max-w-xs mx-auto space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">Session Duration</p>
                    <Select value={sessionDuration} onValueChange={setSessionDuration}>
                      <SelectTrigger className="bg-secondary/60 border-border/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full gap-2 bg-gradient-primary hover:opacity-90 border-0 text-primary-foreground shadow-glow"
                    onClick={() => {
                      onClose();
                      onStartQrSession?.(parseInt(sessionDuration, 10));
                    }}
                  >
                    <QrCode className="h-4 w-4" />
                    Launch QR Session
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center pt-2">
                  Students scan the QR to mark themselves present. Results update in real time.
                </p>
              </div>
            ) : (
              <>
                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-3 py-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or USN..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-secondary/30 border-border/60"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={filter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilter("all")}
                      className={cn(filter === "all" ? "bg-primary" : "border-border/60")}
                    >
                      All
                    </Button>
                    <Button
                      variant={filter === "present" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilter("present")}
                      className={cn(
                        filter === "present" ? "bg-emerald-600 hover:bg-emerald-700" : "border-border/60"
                      )}
                    >
                      Present
                    </Button>
                    <Button
                      variant={filter === "absent" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilter("absent")}
                      className={cn(
                        filter === "absent" ? "bg-destructive hover:bg-destructive/90" : "border-border/60"
                      )}
                    >
                      Absent
                    </Button>
                  </div>
                </div>

                {/* Students List */}
                <div className="max-h-[50vh] overflow-auto rounded-xl border border-border/60">
                  {filteredStudents.length === 0 ? (
                    <div className="p-12 text-center text-sm text-muted-foreground">
                      {attendanceData.length === 0
                        ? "No registrations yet."
                        : "No students match your search."}
                    </div>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {filteredStudents.map((student) => (
                        <div
                          key={student.studentId}
                          className="p-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center text-sm"
                        >
                          <div>
                            <p className="font-medium">{student.name}</p>
                            {student.usn && (
                              <p className="text-xs text-muted-foreground">USN: {student.usn}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Email</p>
                            <p className="text-muted-foreground">{student.email}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Department</p>
                            <p>{student.department || "—"}</p>
                          </div>
                          <div className="lg:col-span-2 flex items-center gap-2">
                            <Button
                              variant={student.status === "present" ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleStatusChange(student.studentId, "present")}
                              className={cn(
                                "flex-1",
                                student.status === "present"
                                  ? "bg-emerald-600 hover:bg-emerald-700"
                                  : "border-border/60"
                              )}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" /> Present
                            </Button>
                            <Button
                              variant={student.status === "absent" ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleStatusChange(student.studentId, "absent")}
                              className={cn(
                                "flex-1",
                                student.status === "absent"
                                  ? "bg-destructive hover:bg-destructive/90"
                                  : "border-border/60"
                              )}
                            >
                              <XCircle className="h-4 w-4 mr-1" /> Absent
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 py-4">
              <Button
                variant="outline"
                onClick={handleMarkAllPresent}
                className="border-border/60"
                disabled={attendanceData.length === 0}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" /> Mark All Present
              </Button>
              <div className="flex-1" />
              <Button variant="outline" onClick={onClose} className="border-border/60">
                Cancel
              </Button>
              <Button
                onClick={handleSaveAttendance}
                disabled={isSaving || attendanceData.length === 0}
                className="bg-primary hover:bg-primary/90"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
                  </>
                ) : (
                  "Save Attendance"
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
