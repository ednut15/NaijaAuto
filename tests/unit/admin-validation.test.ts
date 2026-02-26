import { describe, expect, it } from "vitest";

import { updateFeaturedPackageSchema } from "@/lib/validation/admin";

describe("admin featured package validation", () => {
  it("accepts valid partial updates", () => {
    const parsed = updateFeaturedPackageSchema.parse({
      amountNgn: 35000,
      isActive: true,
    });

    expect(parsed.amountNgn).toBe(35000);
    expect(parsed.isActive).toBe(true);
  });

  it("requires at least one update field", () => {
    const parsed = updateFeaturedPackageSchema.safeParse({});

    expect(parsed.success).toBe(false);
  });

  it("rejects invalid duration and amount values", () => {
    const duration = updateFeaturedPackageSchema.safeParse({
      durationDays: 0,
    });
    const amount = updateFeaturedPackageSchema.safeParse({
      amountNgn: 500,
    });

    expect(duration.success).toBe(false);
    expect(amount.success).toBe(false);
  });
});
