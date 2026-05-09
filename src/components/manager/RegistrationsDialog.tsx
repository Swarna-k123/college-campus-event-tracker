import { format } from "date-fns";
import { Download, Loader2, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    const header = ["Name", "Email", "Phone", "Branch", "Semester", "Registered At"];
    const rows = registrants.map((r) => [
      r.name,
      r.email,
      r.phone,
      r.branch,
      r.semester,
      new Date(r.registeredAt).toISOString(),
    ]);
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
          <DialogDescription>Registered students and contact details.</DialogDescription>
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
            <Table>
              <TableHeader className="sticky top-0 bg-card/95 backdrop-blur">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead className="text-center">Sem</TableHead>
                  <TableHead>Registered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrants.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>
                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="h-3 w-3" /> {r.email}
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="h-3 w-3" /> {r.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{r.branch}</TableCell>
                    <TableCell className="text-center text-sm">{r.semester}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(r.registeredAt), "MMM d, p")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
