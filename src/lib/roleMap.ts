import type { Role } from "@/lib/roles";
import type { DbAppRole } from "@/lib/db";

export function dbRoleToUi(role: DbAppRole | string): Role {
  if (role === "club_manager") return "manager";
  if (role === "admin") return "admin";
  return "student";
}

export function uiRoleToDb(role: Exclude<Role, "admin">): Exclude<DbAppRole, "admin"> {
  return role === "manager" ? "club_manager" : "student";
}
