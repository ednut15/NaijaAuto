import { describe, expect, it, vi } from "vitest";

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
  it("supports create -> submit -> approve -> searchable lifecycle", async () => {
    const { repo, service } = buildService();
    await repo.upsertUser({ id: seller.id, role: seller.role, sellerType: "dealer", phoneVerified: true });
    await repo.upsertUser({ id: moderator.id, role: moderator.role, phoneVerified: true });
    await service.upsertSellerOnboarding(seller, {
      sellerType: "dealer",
      fullName: "Adewale Motors",
      state: "Lagos",
      city: "Ikeja",
      businessName: "Adewale Motors Ltd",
    });

    const listing = await service.createListing(seller, {
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
      lat: 6.6,
      lng: 3.35,
      photos: Array.from({ length: 15 }, (_, idx) => `https://picsum.photos/seed/wf-${idx}/900/600`),
      contactPhone: "+2348091112233",
      contactWhatsapp: "+2348091112233",
    });

    const pending = await service.submitListing(seller, listing.id);
    expect(pending.status).toBe("pending_review");

    const approved = await service.approveListing(moderator, listing.id, { reason: "Clean listing" });
    expect(approved.status).toBe("approved");

    const search = await service.searchListings({ query: "Corolla", page: 1, pageSize: 10 });
    expect(search.total).toBe(1);
    expect(search.items[0].id).toBe(listing.id);
  });

  it("supports favorites add/remove", async () => {
    const { repo, service } = buildService();
    await repo.upsertUser({ id: seller.id, role: seller.role, sellerType: "dealer", phoneVerified: true });
    await repo.upsertUser({ id: buyer.id, role: buyer.role, phoneVerified: true });
    await repo.upsertUser({ id: moderator.id, role: moderator.role, phoneVerified: true });
    await service.upsertSellerOnboarding(seller, {
      sellerType: "dealer",
      fullName: "Adewale Autos",
      state: "FCT",
      city: "Abuja",
      businessName: "Adewale Autos Ltd",
    });

    const listing = await service.createListing(seller, {
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
      lng: 7.4,
      photos: Array.from({ length: 15 }, (_, idx) => `https://picsum.photos/seed/fav-${idx}/900/600`),
      contactPhone: "+2347010042200",
      contactWhatsapp: "+2347010042200",
    });

    await service.submitListing(seller, listing.id);
    await service.approveListing(moderator, listing.id, { reason: "Approved" });

    const added = await service.addFavorite(buyer, listing.id);
    expect(added.saved).toBe(true);

    const favoriteIds = await service.listFavoriteListingIds(buyer);
    expect(favoriteIds).toContain(listing.id);

    const favoriteListings = await service.listFavoriteListings(buyer);
    expect(favoriteListings).toHaveLength(1);
    expect(favoriteListings[0].id).toBe(listing.id);

    const removed = await service.removeFavorite(buyer, listing.id);
    expect(removed.removed).toBe(true);

    const afterRemove = await service.listFavoriteListingIds(buyer);
    expect(afterRemove).toHaveLength(0);
  });

  it("activates featured listing after webhook", async () => {
    const { repo, service } = buildService();
    await repo.upsertUser({
      id: seller.id,
      role: seller.role,
      sellerType: "dealer",
      phoneVerified: true,
      email: seller.email,
    });
    await repo.upsertUser({ id: moderator.id, role: moderator.role, phoneVerified: true });
    await service.upsertSellerOnboarding(seller, {
      sellerType: "dealer",
      fullName: "Adewale Trucks",
      state: "Rivers",
      city: "Port Harcourt",
      businessName: "Adewale Trucks Ltd",
    });

    const listing = await service.createListing(seller, {
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

    await service.submitListing(seller, listing.id);
    await service.approveListing(moderator, listing.id, { reason: "Approved" });

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

    const refreshed = await repo.getListingById(listing.id);
    expect(refreshed?.isFeatured).toBe(true);
    expect(refreshed?.featuredUntil).toBeTruthy();
  });

  it("supports OTP send/verify and enforces max retries", async () => {
    const { repo, service } = buildService();
    await repo.upsertUser({ id: buyer.id, role: buyer.role, phoneVerified: false });

    const sendResult = await service.sendPhoneOtp(buyer, {
      phone: "+2348011234567",
    });

    expect(sendResult.debugCode).toHaveLength(6);

    await expect(
      service.verifyPhoneOtp(buyer, {
        phone: "+2348011234567",
        code: "000000",
      }),
    ).rejects.toThrow("Invalid OTP code");

    const verified = await service.verifyPhoneOtp(buyer, {
      phone: "+2348011234567",
      code: sendResult.debugCode,
    });
    expect(verified.verified).toBe(true);

    const resend = await service.sendPhoneOtp(buyer, {
      phone: "+2348019998888",
    });

    for (let i = 0; i < 5; i += 1) {
      await expect(
        service.verifyPhoneOtp(buyer, {
          phone: "+2348019998888",
          code: "123456",
        }),
      ).rejects.toThrow("Invalid OTP code");
    }

    await expect(
      service.verifyPhoneOtp(buyer, {
        phone: "+2348019998888",
        code: resend.debugCode,
      }),
    ).rejects.toThrow("Too many OTP attempts");
  });

  it("persists seller onboarding profile and dealer details", async () => {
    const { service } = buildService();

    const initial = await service.getSellerOnboarding(seller);
    expect(initial.isComplete).toBe(false);

    const saved = await service.upsertSellerOnboarding(seller, {
      sellerType: "dealer",
      fullName: "Adewale Motors",
      state: "Lagos",
      city: "Ikeja",
      bio: "Trusted dealership with inspected inventory.",
      businessName: "Adewale Motors Ltd",
      cacNumber: "RC1234567",
      address: "12 Allen Avenue, Ikeja",
    });

    expect(saved.isComplete).toBe(true);
    expect(saved.user.sellerType).toBe("dealer");
    expect(saved.sellerProfile?.fullName).toBe("Adewale Motors");
    expect(saved.dealerProfile?.businessName).toBe("Adewale Motors Ltd");
  });

  it("supports rejected listing edit and resubmit flow", async () => {
    const { repo, service } = buildService();
    await repo.upsertUser({ id: seller.id, role: seller.role, sellerType: "dealer", phoneVerified: true });
    await repo.upsertUser({ id: moderator.id, role: moderator.role, phoneVerified: true });
    await service.upsertSellerOnboarding(seller, {
      sellerType: "dealer",
      fullName: "Adewale Motors",
      state: "Lagos",
      city: "Ikeja",
      businessName: "Adewale Motors Ltd",
    });

    const listing = await service.createListing(seller, {
      title: "2018 Toyota Camry",
      description: "Well maintained sedan with service history and all documents available.",
      priceNgn: 13000000,
      year: 2018,
      make: "Toyota",
      model: "Camry",
      bodyType: "car",
      mileageKm: 76000,
      transmission: "automatic",
      fuelType: "petrol",
      vin: "4T1B11HK7JU654321",
      state: "Lagos",
      city: "Ikeja",
      lat: 6.6018,
      lng: 3.3515,
      photos: Array.from({ length: 15 }, (_, idx) => `https://picsum.photos/seed/rej-${idx}/900/600`),
      contactPhone: "+2348001112233",
      contactWhatsapp: "+2348001112233",
    });

    await service.submitListing(seller, listing.id);
    const rejected = await service.rejectListing(moderator, listing.id, { reason: "Update details and photos." });
    expect(rejected.status).toBe("rejected");

    const updated = await service.updateListing(seller, listing.id, {
      title: "2018 Toyota Camry XLE",
      photos: Array.from({ length: 15 }, (_, idx) => `https://picsum.photos/seed/rej2-${idx}/900/600`),
    });

    expect(updated.status).toBe("draft");

    const resubmitted = await service.submitListing(seller, listing.id);
    expect(resubmitted.status).toBe("pending_review");
  });

  it("computes moderation SLA metrics with queue distribution and throughput trend", async () => {
    vi.useFakeTimers();

    try {
      const { repo, service } = buildService();
      await repo.upsertUser({ id: seller.id, role: seller.role, sellerType: "dealer", phoneVerified: true });
      await repo.upsertUser({ id: moderator.id, role: moderator.role, phoneVerified: true });
      await service.upsertSellerOnboarding(seller, {
        sellerType: "dealer",
        fullName: "Adewale Motors",
        state: "Lagos",
        city: "Ikeja",
        businessName: "Adewale Motors Ltd",
      });

      async function createPendingAt(input: {
        dateIso: string;
        vin: string;
        title: string;
        seed: string;
      }): Promise<void> {
        vi.setSystemTime(new Date(input.dateIso));
        const listing = await service.createListing(seller, {
          title: input.title,
          description: "Moderation queue item with complete vehicle documentation and valid media set.",
          priceNgn: 12000000,
          year: 2020,
          make: "Toyota",
          model: "Corolla",
          bodyType: "car",
          mileageKm: 65000,
          transmission: "automatic",
          fuelType: "petrol",
          vin: input.vin,
          state: "Lagos",
          city: "Ikeja",
          lat: 6.6018,
          lng: 3.3515,
          photos: Array.from({ length: 15 }, (_, idx) => `https://picsum.photos/seed/${input.seed}-${idx}/900/600`),
          contactPhone: "+2348000000000",
          contactWhatsapp: "+2348000000000",
        });
        await service.submitListing(seller, listing.id);
      }

      async function createReviewedAt(input: {
        dateIso: string;
        vin: string;
        title: string;
        seed: string;
        action: "approve" | "reject";
      }): Promise<void> {
        vi.setSystemTime(new Date(input.dateIso));
        const listing = await service.createListing(seller, {
          title: input.title,
          description: "Moderation reviewed item with compliant details and complete listing information.",
          priceNgn: 14000000,
          year: 2021,
          make: "Honda",
          model: "Accord",
          bodyType: "car",
          mileageKm: 54000,
          transmission: "automatic",
          fuelType: "petrol",
          vin: input.vin,
          state: "FCT",
          city: "Abuja",
          lat: 9.0765,
          lng: 7.3986,
          photos: Array.from({ length: 15 }, (_, idx) => `https://picsum.photos/seed/${input.seed}-${idx}/900/600`),
          contactPhone: "+2348111111111",
          contactWhatsapp: "+2348111111111",
        });
        await service.submitListing(seller, listing.id);
        if (input.action === "approve") {
          await service.approveListing(moderator, listing.id, { reason: "Approved for SLA metrics test." });
        } else {
          await service.rejectListing(moderator, listing.id, { reason: "Rejected for SLA metrics test." });
        }
      }

      await createPendingAt({
        dateIso: "2026-01-08T08:00:00.000Z",
        vin: "1HGCM82633A100001",
        title: "Pending Listing Old",
        seed: "sla-p1",
      });
      await createPendingAt({
        dateIso: "2026-01-08T10:45:00.000Z",
        vin: "1HGCM82633A100002",
        title: "Pending Listing Medium",
        seed: "sla-p2",
      });
      await createPendingAt({
        dateIso: "2026-01-08T11:40:00.000Z",
        vin: "1HGCM82633A100003",
        title: "Pending Listing Fresh",
        seed: "sla-p3",
      });

      await createReviewedAt({
        dateIso: "2026-01-08T11:10:00.000Z",
        vin: "1HGCM82633A100004",
        title: "Reviewed Today",
        seed: "sla-r1",
        action: "approve",
      });
      await createReviewedAt({
        dateIso: "2026-01-07T09:00:00.000Z",
        vin: "1HGCM82633A100005",
        title: "Reviewed Yesterday",
        seed: "sla-r2",
        action: "reject",
      });
      await createReviewedAt({
        dateIso: "2026-01-05T14:00:00.000Z",
        vin: "1HGCM82633A100006",
        title: "Reviewed Earlier Week",
        seed: "sla-r3",
        action: "approve",
      });

      vi.setSystemTime(new Date("2026-01-08T12:00:00.000Z"));
      const dashboard = await service.getModerationSlaDashboard();

      expect(dashboard.metrics.totalPending).toBe(3);
      expect(dashboard.metrics.highRiskCount).toBe(1);
      expect(dashboard.metrics.mediumRiskCount).toBe(1);
      expect(dashboard.metrics.lowRiskCount).toBe(1);
      expect(dashboard.metrics.breachedOver120Count).toBe(1);
      expect(dashboard.metrics.oldestAgeMinutes).toBe(240);
      expect(dashboard.metrics.averageAgeMinutes).toBe(112);
      expect(dashboard.metrics.processedLast24h).toBe(1);
      expect(dashboard.metrics.processedLast7d).toBe(3);
      expect(dashboard.metrics.queueAgeDistribution).toEqual({
        under60: 1,
        between60And119: 1,
        between120And179: 0,
        over180: 1,
      });

      expect(dashboard.throughputByDay).toHaveLength(7);
      const day8 = dashboard.throughputByDay.find((point) => point.date === "2026-01-08");
      const day7 = dashboard.throughputByDay.find((point) => point.date === "2026-01-07");
      const day5 = dashboard.throughputByDay.find((point) => point.date === "2026-01-05");

      expect(day8).toMatchObject({ approved: 1, rejected: 0, total: 1 });
      expect(day7).toMatchObject({ approved: 0, rejected: 1, total: 1 });
      expect(day5).toMatchObject({ approved: 1, rejected: 0, total: 1 });
    } finally {
      vi.useRealTimers();
    }
  });
});
