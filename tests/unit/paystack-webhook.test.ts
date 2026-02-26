import { describe, expect, it } from "vitest";

import { MarketplaceService } from "@/server/services/marketplace-service";
import { InMemoryRepository } from "@/server/store/in-memory-repository";
import type { RequestUser } from "@/lib/auth";

class FakeTermii {
  async sendOtp() {
    return { messageId: "mock-termii", mocked: true };
  }
}

class FakePaystack {
  verifyWebhookSignature() {
    return true;
  }

  async initializeTransaction(input: { reference: string }) {
    return {
      authorizationUrl: `https://checkout.mock/${input.reference}`,
      accessCode: "access",
      reference: input.reference,
      mocked: true,
    };
  }
}

class FakeMailer {
  async send() {
    return;
  }
}

const seller: RequestUser = {
  id: "00000000-0000-0000-0000-000000000111",
  role: "seller",
  sellerType: "dealer",
  phoneVerified: true,
  email: "dealer@naijaauto.app",
};

const moderator: RequestUser = {
  id: "00000000-0000-0000-0000-000000000131",
  role: "moderator",
  phoneVerified: true,
};

describe("Paystack webhook", () => {
  it("is idempotent for duplicate event ids", async () => {
    const repo = new InMemoryRepository();
    const service = new MarketplaceService(
      repo,
      new FakeTermii() as never,
      new FakePaystack() as never,
      new FakeMailer() as never,
    );

    repo.upsertUser({ id: seller.id, role: seller.role, sellerType: "dealer", phoneVerified: true });
    repo.upsertUser({ id: moderator.id, role: moderator.role, phoneVerified: true });

    const listing = service.createListing(seller, {
      title: "2021 Toyota Corolla LE",
      description: "Very clean vehicle from a dealer with complete papers and maintenance history.",
      priceNgn: 16000000,
      year: 2021,
      make: "Toyota",
      model: "Corolla",
      bodyType: "car",
      mileageKm: 35000,
      transmission: "automatic",
      fuelType: "petrol",
      vin: "JTDBR32E530056781",
      state: "Lagos",
      city: "Ikeja",
      lat: 6.60,
      lng: 3.35,
      photos: Array.from({ length: 15 }, (_, idx) => `https://picsum.photos/seed/pay-${idx}/900/600`),
      contactPhone: "+2348091112233",
      contactWhatsapp: "+2348091112233",
    });

    service.submitListing(seller, listing.id);
    service.approveListing(moderator, listing.id, { reason: "Looks good" });

    const checkout = await service.createFeaturedCheckout(seller, {
      listingId: listing.id,
      packageCode: "feature_7_days",
    });

    const eventPayload = {
      event: "charge.success",
      data: {
        id: 90901,
        reference: checkout.reference,
        status: "success",
        amount: 2500000,
      },
    };

    const body = JSON.stringify(eventPayload);

    const first = await service.handlePaystackWebhook(body, "signature");
    const second = await service.handlePaystackWebhook(body, "signature");

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
  });
});
