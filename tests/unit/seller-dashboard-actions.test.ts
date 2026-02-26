import { describe, expect, it, vi, beforeEach } from "vitest";

import type { RequestUser } from "@/lib/auth";
import { ApiError } from "@/lib/http";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  revalidatePath: vi.fn(),
  requireServerUser: vi.fn(),
  upsertSellerOnboarding: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/auth", () => ({
  requireServerUser: mocks.requireServerUser,
}));

vi.mock("@/server/services/container", () => ({
  marketplaceService: {
    upsertSellerOnboarding: mocks.upsertSellerOnboarding,
  },
}));

import { saveSellerOnboardingAction } from "@/app/seller/dashboard/actions";

const sellerUser: RequestUser = {
  id: "00000000-0000-0000-0000-000000000111",
  role: "seller",
  sellerType: "private",
  phoneVerified: true,
  email: "seller@naijaauto.app",
};

function buildFormData(): FormData {
  const formData = new FormData();
  formData.set("sellerType", "private");
  formData.set("fullName", "Flow Seller");
  formData.set("state", "Lagos");
  formData.set("city", "Lekki");
  formData.set("bio", "Seller profile for regression checks.");
  return formData;
}

describe("saveSellerOnboardingAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to saved state when onboarding update succeeds", async () => {
    mocks.requireServerUser.mockResolvedValue(sellerUser);
    mocks.upsertSellerOnboarding.mockResolvedValue({
      isComplete: true,
    });

    await expect(saveSellerOnboardingAction(buildFormData())).rejects.toThrow(
      "REDIRECT:/seller/dashboard?saved=1",
    );

    expect(mocks.upsertSellerOnboarding).toHaveBeenCalledWith(
      sellerUser,
      expect.objectContaining({
        fullName: "Flow Seller",
        state: "Lagos",
        city: "Lekki",
      }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/seller/dashboard");
  });

  it("redirects with encoded message when onboarding update fails", async () => {
    mocks.requireServerUser.mockResolvedValue(sellerUser);
    mocks.upsertSellerOnboarding.mockRejectedValue(new ApiError(400, "Profile invalid"));

    await expect(saveSellerOnboardingAction(buildFormData())).rejects.toThrow(
      "REDIRECT:/seller/dashboard?error=Profile%20invalid",
    );

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
