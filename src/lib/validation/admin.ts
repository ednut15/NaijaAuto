import { z } from "zod";

export const updateFeaturedPackageSchema = z
  .object({
    name: z.string().trim().min(3).max(100).optional(),
    durationDays: z.coerce.number().int().min(1).max(90).optional(),
    amountNgn: z.coerce.number().int().min(1_000).max(500_000_000).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.durationDays !== undefined ||
      value.amountNgn !== undefined ||
      value.isActive !== undefined,
    {
      message: "At least one field is required for update.",
    },
  );
