import { describe, expect, it } from "vitest";

import type { RequestUser } from "@/lib/auth";
import { canViewModerationQueue, canViewSellerDashboard } from "@/lib/authorization";

const sellerUser: RequestUser = {
  id: "00000000-0000-0000-0000-000000000111",
  role: "seller",
  sellerType: "dealer",
  phoneVerified: true,
  email: "seller@test.local",
};

const moderatorUser: RequestUser = {
  id: "00000000-0000-0000-0000-000000000131",
  role: "moderator",
  phoneVerified: true,
};

const superAdminUser: RequestUser = {
  id: "00000000-0000-0000-0000-000000000191",
  role: "super_admin",
  phoneVerified: true,
};

const buyerUser: RequestUser = {
  id: "00000000-0000-0000-0000-000000000101",
  role: "buyer",
  phoneVerified: true,
};

describe("role-based nav visibility", () => {
  it("shows seller dashboard link only for sellers", () => {
    expect(canViewSellerDashboard(sellerUser)).toBe(true);
    expect(canViewSellerDashboard(buyerUser)).toBe(false);
    expect(canViewSellerDashboard(moderatorUser)).toBe(false);
    expect(canViewSellerDashboard(superAdminUser)).toBe(false);
    expect(canViewSellerDashboard(null)).toBe(false);
  });

  it("shows moderation queue link only for moderator and super admin", () => {
    expect(canViewModerationQueue(moderatorUser)).toBe(true);
    expect(canViewModerationQueue(superAdminUser)).toBe(true);
    expect(canViewModerationQueue(sellerUser)).toBe(false);
    expect(canViewModerationQueue(buyerUser)).toBe(false);
    expect(canViewModerationQueue(undefined)).toBe(false);
  });
});
