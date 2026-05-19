import type { Role } from "@/lib/roles";
import type { DbAppRole } from "@/lib/db";

export function dbRoleToUi(role: DbAppRole | string | null | undefined): Role {
  const r = typeof role === "string" ? role.trim().toLowerCase() : "";
  if (r === "club_manager") return "manager";
  if (r === "admin") return "admin";
  return "student";
}

export function uiRoleToDb(role: Exclude<Role, "admin">): Exclude<DbAppRole, "admin"> {
  return role === "manager" ? "club_manager" : "student";
}
