import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address.").max(254)),
  password: z.string().min(1, "Enter your password.").max(128, "Password is too long."),
});

export const signUpSchema = signInSchema.extend({
  password: z.string().min(12, "Use at least 12 characters.").max(128, "Use at most 128 characters."),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address.").max(254)),
});

export const updatePasswordSchema = z.object({
  password: z.string().min(12, "Use at least 12 characters.").max(128, "Use at most 128 characters."),
});

export type AuthInput = z.infer<typeof signInSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
export type AuthResult = { error?: string; message?: string };

// Only known in-app destinations; encoded protocol-relative URLs, backslashes,
// arbitrary origins and auth callback loops never become redirect targets.
export function safeNext(value: unknown): string {
  if (typeof value !== "string") return "/account";
  // Disallow external URLs or protocol-relative URLs
  if (value.startsWith("//") || value.includes("://")) return "/account";
  if (value.startsWith("/admin") || ["/account", "/shop", "/wishlist", "/orders", "/customize"].includes(value)) {
    return value;
  }
  return "/account";
}
