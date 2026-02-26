import { z } from "zod";

const sellerTypeEnum = z.enum(["dealer", "private"]);

function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => {
      if (value === undefined) {
        return undefined;
      }

      return value.length ? value : undefined;
    });
}

export const sellerOnboardingSchema = z
  .object({
    sellerType: sellerTypeEnum,
    fullName: z.string().trim().min(2).max(100),
    state: z.string().trim().min(2).max(40),
    city: z.string().trim().min(2).max(50),
    bio: optionalText(500),
    businessName: optionalText(120),
    cacNumber: optionalText(80),
    address: optionalText(200),
  })
  .superRefine((value, context) => {
    if (value.sellerType === "dealer" && !value.businessName) {
      context.addIssue({
        path: ["businessName"],
        code: z.ZodIssueCode.custom,
        message: "Business name is required for dealer accounts.",
      });
    }
  });
