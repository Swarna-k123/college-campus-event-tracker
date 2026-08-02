import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, CheckCircle2, XCircle, Users, QrCode, Camera, CameraOff, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DashboardCard } from "@/components/DashboardCard";
import type { ManagerEvent, Registrant } from "@/data/managerEvents";
import { extractRegistrationIdFromQr, fetchEventAttendance, saveAttendance, type StudentAttendance, type AttendanceStatus, type DatabaseAttendanceStatus } from "@/lib/attendance";
import { useAuth } from "@/context/AuthContext";
import { notifyCertificateAvailableForPresentStudents } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import { Html5Qrcode } from "html5-qrcode";

function fromDatabaseStatus(status: DatabaseAttendanceStatus): AttendanceStatus {
  return status === "PRESENT" ? "present" : "absent";
}

type FilterType = "all" | "present" | "absent";
type ActiveTab = "manual" | "scan";

interface Props {
  event: ManagerEvent | null;
  registrants: Registrant[];
  loading?: boolean;
  onClose: () => void;
}

export const AttendanceDialog = ({ event, registrants, loading, onClose }: Props) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [attendanceData, setAttendanceData] = useState<StudentAttendance[]>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("manual");
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string>("");
  const [scanState, setScanState] = useState<"idle" | "success" | "error">("idle");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement | null>(null);
  const scanInProgressRef = useRef(false);
  const activeCameraIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (event && registrants.length > 0) {
      loadAttendance();
    }
  }, [event, registrants]);

  useEffect(() => {
    if (activeTab !== "scan" || !event || !scannerContainerRef.current) {
      return;
    }

    const startScanner = async () => {
      if (scannerRef.current) {
        return;
      }

      setIsScanning(true);
      setScanMessage("Scanning...");
      setScanState("idle");

      const scanner = new Html5Qrcode(scannerContainerRef.current!.id);
      scannerRef.current = scanner;

      try {
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras?.length) {
          throw new Error("No camera found");
        }

        const backCamera = cameras.find((camera) => /back|rear|environment/i.test(camera.label)) ?? cameras[0];
        const cameraId = backCamera.id;
        activeCameraIdRef.current = cameraId;

        await scanner.start(
          cameraId,
          {
            fps: 10,
            qrbox: {
              width: 250,
              height: 250,
            },
          },
          async (decodedText) => {
            if (scanInProgressRef.current) return;
            scanInProgressRef.current = true;
            try {
              await handleQrAttendance(decodedText);
            } finally {
              scanInProgressRef.current = false;
            }
          },
          () => undefined,
        );
      } catch (error) {
        const friendlyMessage = error instanceof Error ? error.message : "Unable to start camera";
        setScanState("error");
        setScanMessage(friendlyMessage === "NotFoundError" || friendlyMessage === "NotAllowedError"
          ? "Camera permission was denied."
          : friendlyMessage);
        setIsScanning(false);
        await stopScanner();
      }
    };

    void startScanner();

    return () => {
      void stopScanner();
    };
  }, [activeTab, event]);

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

  const handleQrAttendance = async (decodedText: string) => {
    if (!event || !user) return;

    let payload: { registrationId?: string; eventId?: string } | null = null;
    try {
      const parsed = JSON.parse(decodedText);
      if (parsed && typeof parsed === "object") {
        payload = parsed as { registrationId?: string; eventId?: string };
      }
    } catch {
      payload = null;
    }

    const registrationId = payload?.registrationId ?? extractRegistrationIdFromQr(decodedText);
    const scannedEventId = payload?.eventId ?? null;

    if (!registrationId) {
      setScanState("error");
      setScanMessage("Invalid QR code.");
      toast.error("Invalid QR code.");
      return;
    }

    if (scannedEventId && scannedEventId !== event.id) {
      setScanState("error");
      setScanMessage("This QR belongs to another event.");
      toast.error("This QR belongs to another event.");
      return;
    }

    try {
      console.debug("[QR Scan] Querying event_registrations for id:", registrationId, "event:", event.id);

      const { data, error } = await supabase
        .from("event_registrations")
        .select("id, student_id, event_id")
        .eq("id", registrationId)
        .maybeSingle();

      console.debug("[QR Scan] event_registrations result:", { data, error });

      if (error || !data) {
        setScanState("error");
        setScanMessage("Invalid QR code.");
        toast.error("Invalid QR code.");
        return;
      }

      if (data.event_id !== event.id) {
        setScanState("error");
        setScanMessage("This QR belongs to another event.");
        toast.error("This QR belongs to another event.");
        return;
      }

      // Registration exists and belongs to this event — no further status check needed.

      const registrationStudentId = data.student_id;
      const existingAttendance = await supabase
        .from("attendance")
        .select("id, status")
        .eq("event_id", event.id)
        .eq("student_id", registrationStudentId)
        .maybeSingle();

      console.debug("[QR Scan] Existing attendance record:", existingAttendance.data);

      if (existingAttendance.data?.id) {
        const currentStatus = existingAttendance.data.status === "PRESENT" ? "present" : "absent";
        if (currentStatus === "present") {
          setScanState("error");
          setScanMessage("Attendance already recorded.");
          toast.warning("Attendance already recorded.");
          return;
        }
      }

      const { error: upsertError } = existingAttendance.data?.id
        ? await supabase
            .from("attendance")
            .update({
              status: "PRESENT",
              marked_by: user.id,
              marked_at: new Date().toISOString(),
            })
            .eq("id", existingAttendance.data.id)
        : await supabase.from("attendance").insert({
            event_id: event.id,
            student_id: registrationStudentId,
            status: "PRESENT",
            marked_by: user.id,
            marked_at: new Date().toISOString(),
          });

      if (upsertError) {
        throw upsertError;
      }

      setAttendanceData((prev) =>
        prev.map((student) =>
          student.studentId === registrationStudentId ? { ...student, status: "present" } : student
        )
      );

      setScanState("success");
      setScanMessage("Attendance marked successfully.");
      toast.success("Attendance marked successfully.");
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {
          // Ignore stop errors while finalizing the successful scan.
        }
      }
      setIsScanning(false);
    } catch (error) {
      setScanState("error");
      setScanMessage("Invalid QR code.");
      toast.error(error instanceof Error ? error.message : "Invalid QR code.");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // Ignore stop errors while cleaning up
      }
      try {
        await scannerRef.current.clear();
      } catch {
        // Ignore clear errors while cleaning up
      }
      scannerRef.current = null;
    }
    scanInProgressRef.current = false;
    activeCameraIdRef.current = null;
    setIsScanning(false);
    setScanState("idle");
    setScanMessage("");
  };

  const handleScanAnother = async () => {
    if (!scannerRef.current) {
      setScanState("idle");
      setScanMessage("Scanning...");
      setIsScanning(true);
      return;
    }

    try {
      await scannerRef.current.stop();
      const cameraId = activeCameraIdRef.current ?? "user";
      await scannerRef.current.start(
        cameraId,
        {
          fps: 10,
          qrbox: {
            width: 250,
            height: 250,
          },
        },
        async (decodedText) => {
          if (scanInProgressRef.current) return;
          scanInProgressRef.current = true;
          try {
            await handleQrAttendance(decodedText);
          } finally {
            scanInProgressRef.current = false;
          }
        },
        () => undefined,
      );
      setScanState("idle");
      setScanMessage("Scanning...");
      setIsScanning(true);
    } catch (error) {
      const friendlyMessage = error instanceof Error ? error.message : "Unable to restart camera";
      setScanState("error");
      setScanMessage(friendlyMessage);
      setIsScanning(false);
      await stopScanner();
    }
  };

  const handleStopCamera = async () => {
    await stopScanner();
  };

  const handleMarkAllPresent = () => {
    setAttendanceData((prev) => prev.map((student) => ({ ...student, status: "present" })));
  };

  const handleSaveAttendance = async () => {
    if (!event || !user) return;
    setIsSaving(true);
    try {
      await saveAttendance(event.id, attendanceData, user.id);
      await notifyCertificateAvailableForPresentStudents(event.id, event.title);
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
  const scannerId = useMemo(() => `attendance-scanner-${event?.id ?? "dialog"}`, [event?.id]);

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
              <div className="space-y-4 rounded-2xl border border-border/60 bg-card/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">QR Attendance Scanner</p>
                    <p className="text-sm text-muted-foreground">Point the camera at the student entry pass to mark attendance.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleStopCamera} className="border-border/60">
                      <CameraOff className="h-4 w-4 mr-2" /> Stop Camera
                    </Button>
                    {scanState === "success" && (
                      <Button variant="outline" onClick={handleScanAnother} className="border-border/60">
                        <ScanLine className="h-4 w-4 mr-2" /> Scan Another
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/60 p-4">
                  <div
                    id={scannerId}
                    ref={scannerContainerRef}
                    className={cn(
                      "w-full max-w-[420px] overflow-hidden rounded-2xl border border-border/60 bg-black/90",
                      scanState === "success" && "ring-4 ring-emerald-500/70",
                      scanState === "error" && "ring-4 ring-destructive/70"
                    )}
                  />
                  <div className="mt-4 flex min-h-10 items-center justify-center px-2 text-center">
                    {isScanning ? (
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <Camera className="h-4 w-4" />
                        <span>{scanMessage || "Scanning..."}</span>
                      </div>
                    ) : (
                      <span className={cn(
                        "text-sm font-medium",
                        scanState === "success" ? "text-emerald-600" : scanState === "error" ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {scanMessage || "Camera stopped."}
                      </span>
                    )}
                  </div>
                </div>
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
