/**
 * Centralized password policy for CampusHub.
 *
 * This module is the single source of truth for password strength rules and
 * MUST be used both by UI forms (Signup / password-change) and by the
 * authentication layer (AuthContext) so that weak passwords cannot bypass
 * validation by calling the auth functions directly.
 *
 * NOTE: Never log the raw password value anywhere (console, errors, etc).
 */

export interface PasswordRequirements {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  noSpaces: boolean;
}

export type PasswordStrength = "weak" | "medium" | "strong";

const SPECIAL_CHARS_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/;

// A short list of well-known / trivially weak passwords that must always be
// rejected even if they happen to satisfy the character-class rules above.
// Matched case-insensitively as an exact full match (not a substring) so we
// don't accidentally reject strong passwords that merely contain a common
// word (e.g. "Password@1" is fine; "password" alone is not).
const COMMON_WEAK_PASSWORDS = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "password",
  "password1",
  "password@",
  "qwerty123",
  "qwertyuiop",
  "abcdefgh",
  "11111111",
  "admin123",
  "letmein1",
  "welcome1",
  "iloveyou",
  "monkey123",
  "dragon123",
  "football1",
  "master123",
  "campushub",
  "changeme1",
]);

export function getPasswordRequirements(password: string): PasswordRequirements {
  return {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: SPECIAL_CHARS_REGEX.test(password),
    noSpaces: password.length > 0 && !/\s/.test(password),
  };
}

export function isCommonWeakPassword(password: string): boolean {
  return COMMON_WEAK_PASSWORDS.has(password.trim().toLowerCase());
}

/** True only when every mandatory requirement is satisfied and the password isn't a known weak one. */
export function isPasswordValid(password: string): boolean {
  const req = getPasswordRequirements(password);
  const allMet = req.minLength && req.hasUpper && req.hasLower && req.hasNumber && req.hasSpecial && req.noSpaces;
  return allMet && !isCommonWeakPassword(password);
}

export function getPasswordStrength(password: string): PasswordStrength {
  const req = getPasswordRequirements(password);
  const score = [req.minLength, req.hasUpper, req.hasLower, req.hasNumber, req.hasSpecial, req.noSpaces].filter(Boolean).length;

  if (!password || isCommonWeakPassword(password)) return "weak";
  if (score <= 3) return "weak";
  if (score <= 5) return "medium";
  // All 6 checks satisfied — reward longer passwords with "strong".
  return password.length >= 12 ? "strong" : "medium";
}

export const PASSWORD_POLICY_ERROR =
  "Please create a stronger password that meets all requirements.";

export const PASSWORDS_MISMATCH_ERROR = "Passwords do not match.";
