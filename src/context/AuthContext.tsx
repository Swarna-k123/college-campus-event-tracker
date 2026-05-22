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
  managerClubName?: string;
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

function clubNameFromRow(clubs: unknown): string | undefined {
  if (clubs == null) return undefined;
  if (Array.isArray(clubs) && clubs[0] && typeof clubs[0] === "object" && "name" in clubs[0]) {
    return String((clubs[0] as { name: string }).name);
  }
  if (typeof clubs === "object" && "name" in (clubs as object)) {
    return String((clubs as { name: string }).name);
  }
  return undefined;
}

async function fetchProfile(userId: string, authEmail?: string | null): Promise<AuthUser | null> {
  const selectWithClub = "id, full_name, email, role, club_id, clubs ( name )";
  const selectBase = "id, full_name, email, role, club_id";

  let { data, error } = await supabase.from("profiles").select(selectWithClub).eq("id", userId).maybeSingle();

  if (error) {
    console.error(error);
    ({ data, error } = await supabase.from("profiles").select(selectBase).eq("id", userId).maybeSingle());
  }

  if (error) {
    console.error(error);
    return null;
  }

  if (!data && authEmail?.trim()) {
    const norm = authEmail.trim().toLowerCase();
    let r2 = await supabase.from("profiles").select(selectWithClub).ilike("email", norm).maybeSingle();
    if (r2.error) {
      console.error(r2.error);
      r2 = await supabase.from("profiles").select(selectBase).ilike("email", norm).maybeSingle();
    }
    if (r2.error) {
      console.error(r2.error);
    } else if (r2.data?.id === userId) {
      data = r2.data;
    }
  }

  if (!data) return null;

  return {
    id: data.id,
    name: data.full_name,
    email: data.email,
    role: dbRoleToUi(data.role as DbAppRole),
    clubId: data.club_id,
    clubName: clubNameFromRow((data as { clubs?: unknown }).clubs),
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

  if (role === "club_manager" && !meta.club_id) {
    console.error("[ensureProfileFromSession] club_manager missing club_id — skipping profile insert");
    return;
  }

  await supabase.from("profiles").insert({
    id: userId,
    full_name,
    email: email.toLowerCase(),
    role,
    club_id: role === "club_manager" ? meta.club_id! : null,
  });
}

/** Validates manager signup against club_manager_access only (codes are reusable). */
async function validateManagerSignupAccess(
  accessCode: string,
  enteredClubName: string
): Promise<{ clubName: string }> {
  const code = accessCode.trim();
  const club = enteredClubName.trim();

  console.log("[manager signup] entered access code:", code);
  console.log("[manager signup] entered club name:", club);

  if (!code) throw new Error("Manager access code is required.");
  if (!club) throw new Error("Club name is required.");

  const { data: rows, error } = await supabase
    .from("club_manager_access")
    .select("id, club_name, access_code")
    .ilike("access_code", code);

  console.log("[manager signup] club_manager_access response:", { data: rows, error });
  if (error) {
    console.error("[manager signup] club_manager_access query error:", error);
    throw new Error(getSupabaseErrorMessage(error));
  }

  const normalizedCode = code.toLowerCase();
  const enteredClub = club.toLowerCase();
  const accessRow = (rows ?? []).find(
    (r) =>
      (r.access_code ?? "").trim().toLowerCase() === normalizedCode &&
      (r.club_name ?? "").trim().toLowerCase() === enteredClub
  );

  if (!accessRow) {
    const hasCode = (rows ?? []).some(
      (r) => (r.access_code ?? "").trim().toLowerCase() === normalizedCode
    );
    if (!hasCode) throw new Error("Invalid manager access code");
    throw new Error("Club name does not match this access code.");
  }

  return { clubName: accessRow.club_name.trim() };
}

/** Finds or creates a club row; returns a non-null club id for manager profiles. */
async function ensureClubIdByName(clubName: string): Promise<string> {
  const name = clubName.trim();

  const { data: existing, error: findErr } = await supabase
    .from("clubs")
    .select("id, name")
    .ilike("name", name)
    .limit(1)
    .maybeSingle();

  console.log("[manager signup] clubs lookup response:", { data: existing, error: findErr });
  if (findErr) {
    console.error("[manager signup] clubs lookup error:", findErr);
    throw new Error(getSupabaseErrorMessage(findErr));
  }
  if (existing?.id) {
    console.log("[manager signup] fetched club_id:", existing.id);
    return existing.id;
  }

  const { data: created, error: createErr } = await supabase
    .from("clubs")
    .insert({ name })
    .select("id")
    .single();

  console.log("[manager signup] club creation result:", { data: created, error: createErr });
  if (createErr) {
    console.error("[manager signup] club creation error:", createErr);
    const { data: retry, error: retryErr } = await supabase
      .from("clubs")
      .select("id")
      .ilike("name", name)
      .limit(1)
      .maybeSingle();
    if (!retryErr && retry?.id) {
      console.log("[manager signup] fetched club_id after race:", retry.id);
      return retry.id;
    }
    throw new Error(getSupabaseErrorMessage(createErr));
  }
  if (!created?.id) throw new Error("Could not create club record.");

  console.log("[manager signup] fetched club_id:", created.id);
  return created.id;
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
    const profile = await fetchProfile(session.user.id, session.user.email);
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
    const profile = await fetchProfile(session.user.id, session.user.email);
    setUser(profile);
  }, []);

  const login = useCallback(async ({ email, password }: LoginInput) => {
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error) throw new Error(getSupabaseErrorMessage(error));

    const profile = await fetchProfile(data.session.user.id, data.session.user.email ?? normalizedEmail);

    if (!profile) {
      await supabase.auth.signOut();
      throw new Error("Could not load your account profile. If your account exists, contact support.");
    }
    setUser(profile);
    return profile;
  }, []);

  const signup = useCallback(async (input: SignupInput) => {
    const email = input.email.trim().toLowerCase();
    const roleDb: DbAppRole = input.role === "manager" ? "club_manager" : "student";

    let resolvedClubId: string | null = null;

    if (input.role === "manager") {
      const validated = await validateManagerSignupAccess(
        input.managerAccessCode ?? "",
        input.managerClubName ?? ""
      );
      console.log("[manager signup] access code validation: ok", validated.clubName);
      resolvedClubId = await ensureClubIdByName(validated.clubName);
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: {
        data: {
          full_name: input.name.trim(),
          role: roleDb,
          club_id: resolvedClubId,
        },
      },
    });

    if (error) {
      console.error("[manager signup] auth signUp error:", error);
      throw new Error(getSupabaseErrorMessage(error));
    }

    if (!data.user) throw new Error("Signup failed");

    console.log("[manager signup] auth user created:", data.user.id);

    if (data.session) {
      if (roleDb === "club_manager" && !resolvedClubId) {
        await supabase.auth.signOut();
        throw new Error("Club could not be assigned. Please try again.");
      }

      const { error: insErr } = await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: input.name.trim(),
        email,
        role: roleDb,
        club_id: roleDb === "club_manager" ? resolvedClubId! : null,
      });

      console.log("[manager signup] profile insert result:", { error: insErr });
      if (insErr) {
        console.error("[manager signup] profile insert error:", insErr);
        await supabase.auth.signOut();
        throw new Error(getSupabaseErrorMessage(insErr));
      }

      const profile = await fetchProfile(data.user.id, data.user.email ?? email);
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
