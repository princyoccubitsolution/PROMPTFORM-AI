import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().optional().or(z.literal('')),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be at most 100 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address").optional(),
  password: z.string().optional(),
  idToken: z.string().optional(),
}).refine(data => data.idToken || (data.email && data.password), {
  message: "Either idToken (for Google Sign In) or email and password must be provided",
  path: ["email"]
});
