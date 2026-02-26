import { describe, expect, it } from "vitest";

import { authSignInSchema, authSignUpSchema } from "@/lib/validation/auth";

describe("auth validation", () => {
  it("accepts valid sign-in payload", () => {
    const parsed = authSignInSchema.parse({
      email: "seller@example.com",
      password: "Passw0rd123",
      redirectTo: "/seller/dashboard",
    });

    expect(parsed.email).toBe("seller@example.com");
    expect(parsed.redirectTo).toBe("/seller/dashboard");
  });

  it("accepts valid sign-up payload for sellers", () => {
    const parsed = authSignUpSchema.parse({
      email: "dealer@example.com",
      password: "Passw0rd123",
      role: "seller",
      sellerType: "dealer",
      redirectTo: "/seller/dashboard",
    });

    expect(parsed.role).toBe("seller");
    expect(parsed.sellerType).toBe("dealer");
  });

  it("rejects unsafe redirect path", () => {
    const parsed = authSignInSchema.safeParse({
      email: "buyer@example.com",
      password: "Passw0rd123",
      redirectTo: "https://evil.site",
    });

    expect(parsed.success).toBe(false);
  });
});
