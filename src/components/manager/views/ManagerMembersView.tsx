import { format } from "date-fns";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useManagerWorkspace } from "@/components/manager/ManagerWorkspace";
import { ManagerLoadingState } from "@/components/manager/ManagerWorkspace";

export const ManagerMembersView = () => {
  const { members, isLoading, error } = useManagerWorkspace();

  if (isLoading) return <ManagerLoadingState />;
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Members</h1>
        <p className="text-muted-foreground mt-2">
          View all members assigned to your club.
        </p>
      </div>

      <div className="rounded-3xl border border-border/60 bg-gradient-card p-6 shadow-soft backdrop-blur-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>{member.name}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell className="capitalize">{member.role.toLowerCase()}</TableCell>
                <TableCell>{member.joinedAt ? format(new Date(member.joinedAt), "MMM d, yyyy") : "—"}</TableCell>
              </TableRow>
            ))}
            {members.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                  No members found for your club.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
