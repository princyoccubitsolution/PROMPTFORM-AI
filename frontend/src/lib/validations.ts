import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(8, "Password must be at most 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address").optional(),
  password: z.string().optional(),
  idToken: z.string().optional(),
}).refine(data => data.idToken || (data.email && data.password), {
  message: "Either idToken (for Google Sign In) or email and password must be provided",
  path: ["email"]
});
