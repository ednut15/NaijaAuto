import { z } from "zod";

const redirectPathSchema = z
  .string()
  .min(1)
  .max(300)
  .refine((value) => value.startsWith("/") && !value.startsWith("//"), {
    message: "Redirect path must be an internal route.",
  });

export const authSignInSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8).max(128),
  redirectTo: redirectPathSchema.optional(),
});

export const authSignUpSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8).max(128),
  role: z.enum(["buyer", "seller"]).default("buyer"),
  sellerType: z.enum(["dealer", "private"]).optional(),
  redirectTo: redirectPathSchema.optional(),
});
