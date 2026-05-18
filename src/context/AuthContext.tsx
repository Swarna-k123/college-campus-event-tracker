import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { DbAppRole } from "@/lib/db";
import { getSupabaseErrorMessage } from "@/lib/db";
import { dbRoleToUi } from "@/lib/roleMap";
import type { Role } from "@/lib/roles";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  clubId: string | null;
  clubName?: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type SignupInput = {
  name: string;
  email: string;
  password: string;
  role: Exclude<Role, "admin">;
  clubId: string | null;
  managerAccessCode?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<AuthUser>;
  signup: (input: SignupInput) => Promise<AuthUser | null>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const getDashboardPathForRole = (role: Role) => {
  if (role === "student") return "/student-dashboard";
  if (role === "manager") return "/manager-dashboard";
  return "/admin-dashboard";
};

async function fetchProfile(userId: string): Promise<AuthUser | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, club_id, clubs ( name )")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }
  if (!data) return null;

  const club = data.clubs as { name: string }[] | null | undefined;

  return {
    id: data.id,
    name: data.full_name,
    email: data.email,
    role: dbRoleToUi(data.role as DbAppRole),
    clubId: data.club_id,
    clubName: club?.[0]?.name,
  };
}

/** If the user confirmed email after signup, create profile from auth metadata. */
async function ensureProfileFromSession(session: Session) {
  const userId = session.user.id;
  const { data: existing } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (existing) return;

  const meta = session.user.user_metadata as {
    full_name?: string;
    role?: DbAppRole;
    club_id?: string | null;
    access_code_id?: string;
  };

  const role = (meta.role ?? "student") as DbAppRole;
  const full_name = meta.full_name?.trim() || session.user.email?.split("@")[0] || "User";
  const email = session.user.email ?? "";

  await supabase.from("profiles").insert({
    id: userId,
    full_name,
    email: email.toLowerCase(),
    role,
    club_id: role === "club_manager" ? meta.club_id ?? null : null,
  });

  if (role === "club_manager" && meta.access_code_id) {
    await supabase
      .from("club_manager_access")
      .update({ is_used: true })
      .eq("id", meta.access_code_id);
  }
}

async function resolveClubIdFromAccessCode(accessCode: string): Promise<{
  clubId: string;
  accessRowId: string;
}> {
  const code = accessCode.trim();
  if (!code) throw new Error("Manager access code is required.");

  const { data: accessRow, error } = await supabase
    .from("club_manager_access")
    .select("id, club_name, is_used")
    .eq("access_code", code)
    .maybeSingle();

  if (error) throw new Error(getSupabaseErrorMessage(error));
  if (!accessRow) throw new Error("Invalid manager access code");
  if (accessRow.is_used) throw new Error("This manager access code has already been used");

  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("id")
    .ilike("name", accessRow.club_name.trim())
    .limit(1)
    .maybeSingle();

  if (clubError) throw new Error(getSupabaseErrorMessage(clubError));
  if (!club?.id) {
    throw new Error("Club not found for this access code. Contact an administrator.");
  }

  return { clubId: club.id, accessRowId: accessRow.id };
}

async function markManagerAccessCodeUsed(accessRowId: string) {
  const { error } = await supabase
    .from("club_manager_access")
    .update({ is_used: true })
    .eq("id", accessRowId);
  if (error) throw new Error(getSupabaseErrorMessage(error));
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hydrateUser = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setUser(null);
      return;
    }
    await ensureProfileFromSession(session);
    const profile = await fetchProfile(session.user.id);
    setUser(profile);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      await hydrateUser(session ?? null);
      setIsLoading(false);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void hydrateUser(session ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [hydrateUser]);

  const refreshProfile = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      setUser(null);
      return;
    }
    const profile = await fetchProfile(session.user.id);
    setUser(profile);
  }, []);

  const login = useCallback(async ({ email, password }: LoginInput) => {
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error) throw new Error(getSupabaseErrorMessage(error));

    let profile = await fetchProfile(data.session.user.id);

    if (!profile) {
      const isAdmin = normalizedEmail === "your_admin_email@example.com";

      if (!isAdmin) {
        await supabase.auth.signOut();
        throw new Error("Please sign up first before logging in.");
      }

      const { error: adminInsertError } = await supabase.from("profiles").insert({
        id: data.session.user.id,
        full_name: "Admin",
        email: normalizedEmail,
        role: "admin",
        club_id: null,
      });
      if (adminInsertError) throw new Error(getSupabaseErrorMessage(adminInsertError));

      profile = await fetchProfile(data.session.user.id);
    }

    if (!profile) throw new Error("Profile not found. Contact support.");
    setUser(profile);
    return profile;
  }, []);

  const signup = useCallback(async (input: SignupInput) => {
    const email = input.email.trim().toLowerCase();
    const roleDb: DbAppRole = input.role === "manager" ? "club_manager" : "student";

    let resolvedClubId: string | null = null;
    let accessRowId: string | null = null;

    if (input.role === "manager") {
      const resolved = await resolveClubIdFromAccessCode(input.managerAccessCode ?? "");
      resolvedClubId = resolved.clubId;
      accessRowId = resolved.accessRowId;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: {
        data: {
          full_name: input.name.trim(),
          role: roleDb,
          club_id: resolvedClubId,
          ...(accessRowId ? { access_code_id: accessRowId } : {}),
        },
      },
    });

    if (error) throw new Error(getSupabaseErrorMessage(error));

    if (!data.user) throw new Error("Signup failed");

    if (data.session) {
      const { error: insErr } = await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: input.name.trim(),
        email,
        role: roleDb,
        club_id: roleDb === "club_manager" ? resolvedClubId : null,
      });
      if (insErr) throw new Error(getSupabaseErrorMessage(insErr));

      if (accessRowId) {
        await markManagerAccessCodeUsed(accessRowId);
      }

      const profile = await fetchProfile(data.user.id);
      if (profile) setUser(profile);
      return profile;
    }

    return null;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      signup,
      logout,
      refreshProfile,
    }),
    [user, isLoading, login, signup, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
