"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ApiError } from "@/lib/http";
import { requireServerUser } from "@/lib/auth";
import { marketplaceService } from "@/server/services/container";

function readField(formData: FormData, key: string): string | undefined {
  const raw = formData.get(key);
  if (typeof raw !== "string") {
    return undefined;
  }

  const trimmed = raw.trim();
  return trimmed.length ? trimmed : undefined;
}

export async function saveSellerOnboardingAction(formData: FormData): Promise<void> {
  try {
    const user = await requireServerUser(["seller"]);

    await marketplaceService.upsertSellerOnboarding(user, {
      sellerType: readField(formData, "sellerType") ?? "private",
      fullName: readField(formData, "fullName"),
      state: readField(formData, "state"),
      city: readField(formData, "city"),
      bio: readField(formData, "bio"),
      businessName: readField(formData, "businessName"),
      cacNumber: readField(formData, "cacNumber"),
      address: readField(formData, "address"),
    });

    revalidatePath("/seller/dashboard");
    redirect("/seller/dashboard?saved=1");
  } catch (error) {
    const message =
      error instanceof ApiError ? error.message : error instanceof Error ? error.message : "Unable to save profile.";
    redirect(`/seller/dashboard?error=${encodeURIComponent(message)}`);
  }
}
