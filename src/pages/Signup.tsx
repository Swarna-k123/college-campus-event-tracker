import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Eye, EyeOff, GraduationCap, Loader2, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getDashboardPathForRole, useAuth } from "@/context/AuthContext";

const INTERESTS = ["Technical", "Cultural", "Sports", "Hackathons", "Workshops"] as const;
type Interest = typeof INTERESTS[number];
type Role = "student" | "manager";

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be under 72 characters"),
  role: z.enum(["student", "manager"]),
});

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clubName, setClubName] = useState("");
  const [managerAccessCode, setManagerAccessCode] = useState("");
  const [show, setShow] = useState(false);
  const [role, setRole] = useState<Role>("student");
  const [interests, setInterests] = useState<Set<Interest>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const toggle = (i: Interest) => {
    setInterests((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = schema.safeParse({ name, email, password, role });
    const accessCode = managerAccessCode.trim();
    const club = clubName.trim();
    if (!result.success || (role === "manager" && (!accessCode || !club))) {
      const fieldErrors: Record<string, string> = {};
      if (!result.success) {
        result.error.issues.forEach((i) => (fieldErrors[i.path[0] as string] = i.message));
      }
      if (role === "manager" && !club) {
        fieldErrors.clubName = "Club name is required.";
      }
      if (role === "manager" && !accessCode) {
        fieldErrors.managerAccessCode = "Manager access code is required.";
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const user = await signup({
        name,
        email,
        password,
        role,
        clubId: null,
        managerAccessCode: role === "manager" ? accessCode : undefined,
        managerClubName: role === "manager" ? club : undefined,
      });
      if (user) {
        toast.success("Account created — welcome to CampusHub!");
        navigate(getDashboardPathForRole(user.role), { replace: true });
        return;
      }
      toast.success("Signup successful! Check your email to confirm your account.");
      navigate("/login", { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to sign up. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="text-lg font-semibold tracking-tight">CampusHub</span>
        </div>

        <div className="rounded-2xl border border-border/60 bg-gradient-card shadow-soft backdrop-blur-xl p-8">
          <header className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
            <p className="text-sm text-muted-foreground mt-1">Join campus events in seconds.</p>
          </header>

          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label>I am a</Label>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary/60 border border-border/60 p-1">
                {([
                  { value: "student", label: "Student", icon: <User className="h-4 w-4" /> },
                  { value: "manager", label: "Club Manager", icon: <Users className="h-4 w-4" /> },
                ] as const).map((r) => (
                  <button
                    type="button"
                    key={r.value}
                    onClick={() => setRole(r.value)}
                    className={cn(
                      "h-10 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all",
                      role === r.value
                        ? "bg-gradient-primary text-primary-foreground shadow-glow"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {r.icon} {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aarav Sharma"
                maxLength={80}
                className="h-11 rounded-xl bg-secondary/60 border-border/60 focus-visible:ring-primary/40"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@campus.edu"
                maxLength={255}
                className="h-11 rounded-xl bg-secondary/60 border-border/60 focus-visible:ring-primary/40"
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  maxLength={72}
                  className="h-11 pr-10 rounded-xl bg-secondary/60 border-border/60 focus-visible:ring-primary/40"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            {role === "manager" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="space-y-2">
                  <Label htmlFor="clubName">Club Name</Label>
                  <Input
                    id="clubName"
                    value={clubName}
                    onChange={(e) => setClubName(e.target.value)}
                    placeholder="Enter club name"
                    maxLength={120}
                    className="h-11 rounded-xl bg-secondary/60 border-border/60 focus-visible:ring-primary/40"
                  />
                  {errors.clubName && <p className="text-xs text-destructive">{errors.clubName}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="managerAccessCode">Manager Access Code</Label>
                  <Input
                    id="managerAccessCode"
                    value={managerAccessCode}
                    onChange={(e) => setManagerAccessCode(e.target.value)}
                    placeholder="Enter manager access code"
                    maxLength={120}
                    className="h-11 rounded-xl bg-secondary/60 border-border/60 focus-visible:ring-primary/40"
                  />
                  {errors.managerAccessCode && (
                    <p className="text-xs text-destructive">{errors.managerAccessCode}</p>
                  )}
                </div>
              </div>
            )}

            {role === "student" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <Label>Interests <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((i) => {
                    const active = interests.has(i);
                    return (
                      <button
                        type="button"
                        key={i}
                        onClick={() => toggle(i)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs border transition-all",
                          active
                            ? "bg-primary/20 text-primary border-primary/50 shadow-glow"
                            : "bg-secondary/60 text-muted-foreground border-border/60 hover:text-foreground hover:border-primary/30"
                        )}
                      >
                        {i}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-gradient-primary text-primary-foreground border-0 shadow-glow hover:opacity-90"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </main>
  );
};

export default Signup;