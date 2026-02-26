import { describe, expect, it } from "vitest";

import { rankListings } from "@/server/search/ranking";
import type { Listing } from "@/types/domain";

function listingFactory(partial: Partial<Listing>): Listing {
  const now = new Date().toISOString();

  return {
    id: partial.id ?? crypto.randomUUID(),
    sellerId: partial.sellerId ?? crypto.randomUUID(),
    sellerType: partial.sellerType ?? "dealer",
    status: partial.status ?? "approved",
    title: partial.title ?? "Default Listing",
    description: partial.description ?? "description",
    priceNgn: partial.priceNgn ?? 10000000,
    year: partial.year ?? 2020,
    make: partial.make ?? "Toyota",
    model: partial.model ?? "Corolla",
    bodyType: partial.bodyType ?? "car",
    mileageKm: partial.mileageKm ?? 50000,
    transmission: partial.transmission ?? "automatic",
    fuelType: partial.fuelType ?? "petrol",
    vin: partial.vin ?? "JTDBR32E530056781",
    state: partial.state ?? "Lagos",
    city: partial.city ?? "Ikeja",
    lat: partial.lat ?? 6.6,
    lng: partial.lng ?? 3.35,
    photos: partial.photos ?? ["https://picsum.photos/seed/x/900/600"],
    isFeatured: partial.isFeatured ?? false,
    featuredUntil: partial.featuredUntil ?? null,
    approvedAt: partial.approvedAt ?? now,
    slug: partial.slug ?? "slug-default",
    contactPhone: partial.contactPhone ?? "+2348091112233",
    contactWhatsapp: partial.contactWhatsapp ?? "+2348091112233",
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  };
}

describe("rankListings", () => {
  it("prioritizes active featured listings", () => {
    const featured = listingFactory({
      id: "1",
      title: "Featured Corolla",
      slug: "featured-corolla",
      isFeatured: true,
      featuredUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    const regular = listingFactory({
      id: "2",
      title: "Regular Corolla",
      slug: "regular-corolla",
      isFeatured: false,
    });

    const ranked = rankListings([regular, featured], "corolla");
    expect(ranked[0].id).toBe("1");
  });

  it("uses relevance when featured state is equal", () => {
    const exact = listingFactory({ id: "a", title: "Toyota Corolla LE", slug: "toyota-corolla-le" });
    const loose = listingFactory({ id: "b", title: "Reliable Sedan", slug: "reliable-sedan" });

    const ranked = rankListings([loose, exact], "corolla");
    expect(ranked[0].id).toBe("a");
  });
});
