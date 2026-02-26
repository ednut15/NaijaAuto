import { describe, expect, it } from "vitest";

import { createListingSchema } from "@/lib/validation/listing";

const validPayload = {
  title: "2020 Toyota Corolla LE",
  description: "A clean and well-maintained vehicle with complete service records and smooth drive.",
  priceNgn: 15500000,
  year: 2020,
  make: "Toyota",
  model: "Corolla",
  bodyType: "car",
  mileageKm: 60000,
  transmission: "automatic",
  fuelType: "petrol",
  vin: "JTDBR32E530056781",
  state: "Lagos",
  city: "Ikeja",
  lat: 6.6018,
  lng: 3.3515,
  photos: ["https://picsum.photos/seed/validation/900/600"],
  contactPhone: "+2348091112233",
  contactWhatsapp: "+2348091112233",
};

describe("createListingSchema", () => {
  it("accepts a valid listing payload", () => {
    const result = createListingSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("rejects missing VIN", () => {
    const result = createListingSchema.safeParse({
      ...validPayload,
      vin: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid NGN price range", () => {
    const result = createListingSchema.safeParse({
      ...validPayload,
      priceNgn: 1000,
    });

    expect(result.success).toBe(false);
  });

  it("requires at least one photo at creation time", () => {
    const result = createListingSchema.safeParse({
      ...validPayload,
      photos: [],
    });

    expect(result.success).toBe(false);
  });
});
