import { describe, expect, it } from "vitest";

import type { RequestUser } from "@/lib/auth";
import { MarketplaceService } from "@/server/services/marketplace-service";
import { InMemoryRepository } from "@/server/store/in-memory-repository";

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

function buildService() {
  const repo = new InMemoryRepository();
  const service = new MarketplaceService(
    repo,
    new FakeTermii() as never,
    new FakePaystack() as never,
    new FakeMailer() as never,
  );
  return { repo, service };
}

const seller: RequestUser = {
  id: "00000000-0000-0000-0000-000000000111",
  role: "seller",
  sellerType: "dealer",
  phoneVerified: true,
  email: "seller@test.local",
};

const buyer: RequestUser = {
  id: "00000000-0000-0000-0000-000000000101",
  role: "buyer",
  phoneVerified: true,
};

const moderator: RequestUser = {
  id: "00000000-0000-0000-0000-000000000131",
  role: "moderator",
  phoneVerified: true,
};

describe("MVP workflows", () => {
  it("supports create -> submit -> approve -> searchable lifecycle", () => {
    const { repo, service } = buildService();
    repo.upsertUser({ id: seller.id, role: seller.role, sellerType: "dealer", phoneVerified: true });
    repo.upsertUser({ id: moderator.id, role: moderator.role, phoneVerified: true });

    const listing = service.createListing(seller, {
      title: "2021 Toyota Corolla LE",
      description: "Dealer vehicle with complete documents and solid maintenance history.",
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
      photos: Array.from({ length: 15 }, (_, idx) => `https://picsum.photos/seed/wf-${idx}/900/600`),
      contactPhone: "+2348091112233",
      contactWhatsapp: "+2348091112233",
    });

    const pending = service.submitListing(seller, listing.id);
    expect(pending.status).toBe("pending_review");

    const approved = service.approveListing(moderator, listing.id, { reason: "Clean listing" });
    expect(approved.status).toBe("approved");

    const search = service.searchListings({ query: "Corolla", page: 1, pageSize: 10 });
    expect(search.total).toBe(1);
    expect(search.items[0].id).toBe(listing.id);
  });

  it("supports favorites add/remove", () => {
    const { repo, service } = buildService();
    repo.upsertUser({ id: seller.id, role: seller.role, sellerType: "dealer", phoneVerified: true });
    repo.upsertUser({ id: buyer.id, role: buyer.role, phoneVerified: true });
    repo.upsertUser({ id: moderator.id, role: moderator.role, phoneVerified: true });

    const listing = service.createListing(seller, {
      title: "2019 Honda Accord",
      description: "Approved vehicle with verified papers and inspection report available.",
      priceNgn: 17000000,
      year: 2019,
      make: "Honda",
      model: "Accord",
      bodyType: "car",
      mileageKm: 55000,
      transmission: "automatic",
      fuelType: "petrol",
      vin: "1HGCV1F39KA123456",
      state: "FCT",
      city: "Abuja",
      lat: 9.07,
      lng: 7.40,
      photos: Array.from({ length: 15 }, (_, idx) => `https://picsum.photos/seed/fav-${idx}/900/600`),
      contactPhone: "+2347010042200",
      contactWhatsapp: "+2347010042200",
    });

    service.submitListing(seller, listing.id);
    service.approveListing(moderator, listing.id, { reason: "Approved" });

    const added = service.addFavorite(buyer, listing.id);
    expect(added.saved).toBe(true);

    const removed = service.removeFavorite(buyer, listing.id);
    expect(removed.removed).toBe(true);
  });

  it("activates featured listing after webhook", async () => {
    const { repo, service } = buildService();
    repo.upsertUser({ id: seller.id, role: seller.role, sellerType: "dealer", phoneVerified: true, email: seller.email });
    repo.upsertUser({ id: moderator.id, role: moderator.role, phoneVerified: true });

    const listing = service.createListing(seller, {
      title: "2022 Ford Ranger",
      description: "Pickup in excellent condition with complete dealer service records.",
      priceNgn: 35500000,
      year: 2022,
      make: "Ford",
      model: "Ranger",
      bodyType: "pickup",
      mileageKm: 28000,
      transmission: "automatic",
      fuelType: "diesel",
      vin: "6FPPXXMJ2PMS76543",
      state: "Rivers",
      city: "Port Harcourt",
      lat: 4.81,
      lng: 7.04,
      photos: Array.from({ length: 15 }, (_, idx) => `https://picsum.photos/seed/ft-${idx}/900/600`),
      contactPhone: "+2348127804500",
      contactWhatsapp: "+2348127804500",
    });

    service.submitListing(seller, listing.id);
    service.approveListing(moderator, listing.id, { reason: "Approved" });

    const checkout = await service.createFeaturedCheckout(seller, {
      listingId: listing.id,
      packageCode: "feature_7_days",
    });

    await service.handlePaystackWebhook(
      JSON.stringify({
        event: "charge.success",
        data: {
          id: 445566,
          reference: checkout.reference,
          status: "success",
          amount: 2500000,
        },
      }),
      "valid-signature",
    );

    const refreshed = repo.getListingById(listing.id);
    expect(refreshed?.isFeatured).toBe(true);
    expect(refreshed?.featuredUntil).toBeTruthy();
  });

  it("supports OTP send/verify and enforces max retries", async () => {
    const { repo, service } = buildService();
    repo.upsertUser({ id: buyer.id, role: buyer.role, phoneVerified: false });

    const sendResult = await service.sendPhoneOtp(buyer, {
      phone: "+2348011234567",
    });

    expect(sendResult.debugCode).toHaveLength(6);

    expect(() =>
      service.verifyPhoneOtp(buyer, {
        phone: "+2348011234567",
        code: "000000",
      }),
    ).toThrow("Invalid OTP code");

    const verified = service.verifyPhoneOtp(buyer, {
      phone: "+2348011234567",
      code: sendResult.debugCode,
    });
    expect(verified.verified).toBe(true);

    const resend = await service.sendPhoneOtp(buyer, {
      phone: "+2348019998888",
    });

    for (let i = 0; i < 5; i += 1) {
      expect(() =>
        service.verifyPhoneOtp(buyer, {
          phone: "+2348019998888",
          code: "123456",
        }),
      ).toThrow("Invalid OTP code");
    }

    expect(() =>
      service.verifyPhoneOtp(buyer, {
        phone: "+2348019998888",
        code: resend.debugCode,
      }),
    ).toThrow("Too many OTP attempts");
  });
});
