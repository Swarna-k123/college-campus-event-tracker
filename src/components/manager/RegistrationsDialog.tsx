import { format } from "date-fns";
import { Download, Loader2, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { ManagerEvent, Registrant } from "@/data/managerEvents";

interface Props {
  event: ManagerEvent | null;
  registrants: Registrant[];
  loading?: boolean;
  onClose: () => void;
}

export const RegistrationsDialog = ({ event, registrants, loading, onClose }: Props) => {
  if (!event) return null;
  const pct = Math.min(
    100,
    Math.round((registrants.length / event.maxRegistrations) * 100)
  );

  const exportCsv = () => {
    const header = [
      "Type",
      "Team Name",
      "Leader Name",
      "Leader Email",
      "Leader Phone",
      "Leader USN",
      "Leader Branch",
      "Leader Semester",
      "Members",
      "Registered At",
    ];
    const rows = registrants.map((r) => {
      if (r.teamDetails) {
        const members = r.teamDetails.members
          .map((m) => `${m.name} (${m.usn}, ${m.email})`)
          .join("; ");
        return [
          "Team",
          r.teamDetails.team_name,
          r.teamDetails.leader.name,
          r.teamDetails.leader.email,
          r.teamDetails.leader.phone,
          r.teamDetails.leader.usn,
          r.teamDetails.leader.branch,
          r.teamDetails.leader.semester,
          members,
          new Date(r.registeredAt).toISOString(),
        ];
      }
      return [
        "Individual",
        "",
        r.name,
        r.email,
        r.phone,
        "",
        r.branch,
        r.semester,
        "",
        new Date(r.registeredAt).toISOString(),
      ];
    });
    const csv = [header, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.title.replace(/\s+/g, "_")}_registrations.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={!!event} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl bg-gradient-card border-border/60">
        <DialogHeader>
          <DialogTitle className="text-xl">{event.title}</DialogTitle>
          <DialogDescription>Registered students and team details.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-2">
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight">{registrants.length}</span>
              <span className="text-sm text-muted-foreground">/ {event.maxRegistrations} registered</span>
              <span className="text-xs text-muted-foreground">({pct}%)</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <Button variant="outline" onClick={exportCsv} className="gap-2 border-border/60" type="button">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>

        <div className="max-h-[55vh] overflow-auto rounded-xl border border-border/60">
          {loading ? (
            <div className="p-12 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : registrants.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No registrations yet.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {registrants.map((r) =>
                r.teamDetails ? (
                  <div key={r.id} className="p-4 space-y-3">
                    <div>
                      <p className="font-semibold">{r.teamDetails.team_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Team registration · {format(new Date(r.registeredAt), "MMM d, p")}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-secondary/30 p-3 space-y-2 text-sm">
                      <p className="text-xs font-medium text-primary uppercase tracking-wide">Team Leader</p>
                      <p>Name: {r.teamDetails.leader.name}</p>
                      <p>Email: {r.teamDetails.leader.email}</p>
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3" /> {r.teamDetails.leader.phone}
                      </p>
                      <p>USN: {r.teamDetails.leader.usn}</p>
                      <p>Branch: {r.teamDetails.leader.branch}</p>
                      <p>Semester: {r.teamDetails.leader.semester}</p>
                    </div>
                    {r.teamDetails.members.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-primary uppercase tracking-wide">Team Members</p>
                        {r.teamDetails.members.map((m, idx) => (
                          <div
                            key={`${r.id}-member-${idx}`}
                            className="rounded-lg border border-border/60 bg-card/40 p-3 text-sm space-y-1"
                          >
                            <p className="font-medium">{m.name}</p>
                            <p className="text-muted-foreground text-xs">{m.email} · USN {m.usn}</p>
                            <p className="text-muted-foreground text-xs">
                              {m.branch} · Semester {m.semester}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div key={r.id} className="p-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Name</p>
                      <p className="font-medium">{r.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3" /> {r.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3" /> {r.phone}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Branch / Sem</p>
                      <p>
                        {r.branch} · Sem {r.semester}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Registered</p>
                      <p>{format(new Date(r.registeredAt), "MMM d, p")}</p>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
