import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getPasswordRequirements,
  getPasswordStrength,
  type PasswordStrength,
} from "@/lib/passwordPolicy";

const STRENGTH_LABEL: Record<PasswordStrength, string> = {
  weak: "Weak",
  medium: "Medium",
  strong: "Strong",
};

const STRENGTH_BAR_CLASS: Record<PasswordStrength, string> = {
  weak: "bg-destructive w-1/3",
  medium: "bg-amber-500 w-2/3",
  strong: "bg-emerald-500 w-full",
};

const STRENGTH_TEXT_CLASS: Record<PasswordStrength, string> = {
  weak: "text-destructive",
  medium: "text-amber-500",
  strong: "text-emerald-500",
};

const REQUIREMENT_ITEMS: Array<{
  key: keyof ReturnType<typeof getPasswordRequirements>;
  label: string;
}> = [
  { key: "minLength", label: "At least 8 characters" },
  { key: "hasUpper", label: "One uppercase letter" },
  { key: "hasLower", label: "One lowercase letter" },
  { key: "hasNumber", label: "One number" },
  { key: "hasSpecial", label: "One special character" },
  { key: "noSpaces", label: "No spaces" },
];

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
}

export const PasswordStrengthMeter = ({ password, className }: PasswordStrengthMeterProps) => {
  if (!password) return null;

  const requirements = getPasswordRequirements(password);
  const strength = getPasswordStrength(password);

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="space-y-1.5">
        <div className="h-1.5 w-full rounded-full bg-secondary/60 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-300", STRENGTH_BAR_CLASS[strength])}
          />
        </div>
        <p className={cn("text-xs font-medium", STRENGTH_TEXT_CLASS[strength])}>
          Password strength: {STRENGTH_LABEL[strength]}
        </p>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
        {REQUIREMENT_ITEMS.map(({ key, label }) => {
          const met = requirements[key];
          return (
            <li
              key={key}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-colors",
                met ? "text-emerald-500" : "text-muted-foreground"
              )}
            >
              {met ? (
                <Check className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <X className="h-3.5 w-3.5 shrink-0 opacity-50" />
              )}
              {label}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
