import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ManagerEvent } from "@/data/managerEvents";
import { SEMESTER_OPTIONS, type TeamMemberDetails, type TeamRegistrationDetails } from "@/data/teamRegistration";
import { toast } from "sonner";

type MemberForm = {
  name: string;
  semester: string;
  branch: string;
  email: string;
  usn: string;
};

const emptyMember = (): MemberForm => ({
  name: "",
  semester: "1",
  branch: "",
  email: "",
  usn: "",
});

type Props = {
  event: ManagerEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLeaderName?: string;
  defaultLeaderEmail?: string;
  onSubmit: (details: TeamRegistrationDetails) => Promise<void>;
  submitting?: boolean;
};

export const TeamRegistrationDialog = ({
  event,
  open,
  onOpenChange,
  defaultLeaderName = "",
  defaultLeaderEmail = "",
  onSubmit,
  submitting = false,
}: Props) => {
  const [teamName, setTeamName] = useState("");
  const [leaderName, setLeaderName] = useState(defaultLeaderName);
  const [leaderPhone, setLeaderPhone] = useState("");
  const [leaderEmail, setLeaderEmail] = useState(defaultLeaderEmail);
  const [leaderUsn, setLeaderUsn] = useState("");
  const [leaderSemester, setLeaderSemester] = useState("1");
  const [leaderBranch, setLeaderBranch] = useState("");
  const [members, setMembers] = useState<MemberForm[]>([]);

  const minBound = Math.max(1, event?.minTeamSize ?? 1);
  const maxBound =
    event?.maxTeamSize != null ? Math.max(event.maxTeamSize, minBound) : Math.max(minBound, 2);
  const minMembers = Math.max(0, minBound - 1);
  const maxMembers = Math.max(0, maxBound - 1);
  const atMemberLimit = members.length >= maxMembers;

  useEffect(() => {
    if (!open) return;
    setTeamName("");
    setLeaderName(defaultLeaderName);
    setLeaderPhone("");
    setLeaderEmail(defaultLeaderEmail);
    setLeaderUsn("");
    setLeaderSemester("1");
    setLeaderBranch("");
    setMembers(Array.from({ length: minMembers }, () => emptyMember()));
  }, [open, event?.id, defaultLeaderName, defaultLeaderEmail, minMembers]);

  const semesterSelect = (value: string, onChange: (v: string) => void, id: string) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="bg-secondary/60 border-border/60">
        <SelectValue placeholder="Semester" />
      </SelectTrigger>
      <SelectContent>
        {SEMESTER_OPTIONS.map((s) => (
          <SelectItem key={s} value={String(s)}>
            Semester {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const parseMember = (m: MemberForm, index: number): TeamMemberDetails | null => {
    const sem = parseInt(m.semester, 10);
    if (!m.name.trim()) return null;
    if (!m.branch.trim()) throw new Error(`Member ${index + 1}: branch is required`);
    if (!m.email.trim()) throw new Error(`Member ${index + 1}: email is required`);
    if (!m.usn.trim()) throw new Error(`Member ${index + 1}: USN is required`);
    if (!sem || sem < 1 || sem > 8) throw new Error(`Member ${index + 1}: semester must be 1–8`);
    return {
      name: m.name.trim(),
      semester: sem,
      branch: m.branch.trim(),
      email: m.email.trim(),
      usn: m.usn.trim(),
    };
  };

  const handleSubmit = async () => {
    if (!event) return;

    if (!teamName.trim()) throw new Error("Team name is required");
    if (!leaderName.trim()) throw new Error("Team leader name is required");
    if (!leaderPhone.trim()) throw new Error("Phone number is required");
    if (!leaderEmail.trim()) throw new Error("Email is required");
    if (!leaderUsn.trim()) throw new Error("USN is required");
    if (!leaderBranch.trim()) throw new Error("Department/Branch is required");
    const leaderSem = parseInt(leaderSemester, 10);
    if (!leaderSem || leaderSem < 1 || leaderSem > 8) throw new Error("Semester must be 1–8");

    const parsedMembers: TeamMemberDetails[] = [];
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      const hasAny =
        member.name.trim() ||
        member.branch.trim() ||
        member.email.trim() ||
        member.usn.trim();
      if (!hasAny) {
        if (i < minMembers) {
          throw new Error(`Member ${i + 1} details are required for this event.`);
        }
        continue;
      }
      const parsed = parseMember(member, i);
      if (parsed) parsedMembers.push(parsed);
    }

    const totalParticipants = 1 + parsedMembers.length;
    if (totalParticipants < minBound) {
      throw new Error(
        `Team must have at least ${minBound} participants (including leader). Add ${minBound - totalParticipants} more member(s).`
      );
    }
    if (totalParticipants > maxBound) {
      throw new Error(`Team cannot exceed ${maxBound} participants (including leader).`);
    }

    await onSubmit({
      team_name: teamName.trim(),
      leader: {
        name: leaderName.trim(),
        phone: leaderPhone.trim(),
        email: leaderEmail.trim(),
        usn: leaderUsn.trim(),
        semester: leaderSem,
        branch: leaderBranch.trim(),
      },
      members: parsedMembers,
    });
  };

  const memberHint = useMemo(() => {
    if (maxMembers === 0) {
      return "This team size allows only the leader.";
    }
    if (minMembers === maxMembers) {
      return `Add exactly ${minMembers} team member${minMembers === 1 ? "" : "s"} (team size: ${maxBound}).`;
    }
    return `Add ${minMembers}–${maxMembers} team member${maxMembers === 1 ? "" : "s"} (team size: ${minBound}–${maxBound} including leader).`;
  }, [minMembers, maxMembers, minBound, maxBound]);

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-card border-border/60 sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Team Registration</DialogTitle>
          <DialogDescription>
            {event.title} — register your team (max {maxBound} participants including leader).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="space-y-2">
            <Label htmlFor="teamName">Team Name</Label>
            <Input
              id="teamName"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. Code Crushers"
              className="bg-secondary/60 border-border/60"
            />
          </div>

          <div className="space-y-3 rounded-xl border border-border/60 bg-secondary/30 p-4">
            <p className="text-sm font-medium">Team Leader Details</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="leaderName">Team Leader Name</Label>
                <Input
                  id="leaderName"
                  value={leaderName}
                  onChange={(e) => setLeaderName(e.target.value)}
                  className="bg-secondary/60 border-border/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leaderPhone">Phone Number</Label>
                <Input
                  id="leaderPhone"
                  value={leaderPhone}
                  onChange={(e) => setLeaderPhone(e.target.value)}
                  placeholder="+91 ..."
                  className="bg-secondary/60 border-border/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leaderEmail">Email ID</Label>
                <Input
                  id="leaderEmail"
                  type="email"
                  value={leaderEmail}
                  onChange={(e) => setLeaderEmail(e.target.value)}
                  className="bg-secondary/60 border-border/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leaderUsn">USN</Label>
                <Input
                  id="leaderUsn"
                  value={leaderUsn}
                  onChange={(e) => setLeaderUsn(e.target.value)}
                  className="bg-secondary/60 border-border/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leaderSemester">Semester</Label>
                {semesterSelect(leaderSemester, setLeaderSemester, "leaderSemester")}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="leaderBranch">Department / Branch</Label>
                <Input
                  id="leaderBranch"
                  value={leaderBranch}
                  onChange={(e) => setLeaderBranch(e.target.value)}
                  className="bg-secondary/60 border-border/60"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Team Members</p>
                <p className="text-xs text-muted-foreground">{memberHint}</p>
              </div>
              {maxMembers > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={atMemberLimit}
                  onClick={() => setMembers((prev) => [...prev, emptyMember()])}
                  className="gap-1 border-border/60"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Team Member
                </Button>
              )}
            </div>
            {maxMembers > 0 && atMemberLimit && (
              <p className="text-xs text-amber-300/90">Maximum team size reached</p>
            )}
            {members.map((member, index) => (
              <div
                key={index}
                className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Member {index + 1}
                    {index < minMembers ? (
                      <span className="text-destructive ml-1">*</span>
                    ) : null}
                  </p>
                  {members.length > minMembers && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setMembers((prev) => prev.filter((_, i) => i !== index))}
                      aria-label="Remove member"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Name</Label>
                    <Input
                      value={member.name}
                      onChange={(e) =>
                        setMembers((prev) =>
                          prev.map((m, i) => (i === index ? { ...m, name: e.target.value } : m))
                        )
                      }
                      className="bg-secondary/60 border-border/60"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Semester</Label>
                    {semesterSelect(
                      member.semester,
                      (v) =>
                        setMembers((prev) =>
                          prev.map((m, i) => (i === index ? { ...m, semester: v } : m))
                        ),
                      `member-semester-${index}`
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>USN</Label>
                    <Input
                      value={member.usn}
                      onChange={(e) =>
                        setMembers((prev) =>
                          prev.map((m, i) => (i === index ? { ...m, usn: e.target.value } : m))
                        )
                      }
                      className="bg-secondary/60 border-border/60"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Branch / Department</Label>
                    <Input
                      value={member.branch}
                      onChange={(e) =>
                        setMembers((prev) =>
                          prev.map((m, i) => (i === index ? { ...m, branch: e.target.value } : m))
                        )
                      }
                      className="bg-secondary/60 border-border/60"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={member.email}
                      onChange={(e) =>
                        setMembers((prev) =>
                          prev.map((m, i) => (i === index ? { ...m, email: e.target.value } : m))
                        )
                      }
                      className="bg-secondary/60 border-border/60"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={submitting}
            className="gap-2"
            onClick={() => {
              handleSubmit().catch((err) => {
                toast.error(err instanceof Error ? err.message : "Could not submit registration");
              });
            }}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Confirm Registration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
