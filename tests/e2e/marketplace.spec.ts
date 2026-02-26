import { expect, test } from "@playwright/test";

const sellerHeaders = {
  "x-user-id": "00000000-0000-0000-0000-000000000111",
  "x-user-role": "seller",
  "x-seller-type": "dealer",
  "x-phone-verified": "true",
  "x-user-email": "dealer@naijaauto.app",
};

const moderatorHeaders = {
  "x-user-id": "00000000-0000-0000-0000-000000000131",
  "x-user-role": "moderator",
  "x-phone-verified": "true",
};

test("buyer can search listings and access WhatsApp contact", async ({ page }) => {
  await page.goto("/listings?city=Ikeja");
  await expect(page.getByRole("heading", { name: "Search Listings" })).toBeVisible();

  await page.getByRole("link", { name: /Toyota Corolla/i }).first().click();
  await expect(page.getByRole("heading", { name: /Toyota Corolla/i })).toBeVisible();

  const whatsappLink = page.getByRole("link", { name: "WhatsApp Seller" });
  await expect(whatsappLink).toHaveAttribute("href", /wa\.me/);
});

test("seller creates listing, moderator approves, listing is publicly visible", async ({ page, request }) => {
  const createPayload = {
    title: "2021 Kia Sportage E2E",
    description: "E2E listing for moderation workflow with valid details and complete media assets.",
    priceNgn: 19800000,
    year: 2021,
    make: "Kia",
    model: "Sportage",
    bodyType: "suv",
    mileageKm: 47000,
    transmission: "automatic",
    fuelType: "petrol",
    vin: `KNDP${Date.now().toString().slice(-13)}`.slice(0, 17),
    state: "Lagos",
    city: "Lekki",
    lat: 6.4698,
    lng: 3.5852,
    photos: Array.from({ length: 15 }, (_, idx) => `https://picsum.photos/seed/e2e-${idx}-${Date.now()}/900/600`),
    contactPhone: "+2348030000000",
    contactWhatsapp: "+2348030000000",
  };

  const createResponse = await request.post("/api/listings", {
    headers: {
      ...sellerHeaders,
      "content-type": "application/json",
    },
    data: createPayload,
  });
  expect(createResponse.ok()).toBeTruthy();

  const created = await createResponse.json();
  const listingId = created.listing.id as string;
  const listingSlug = created.listing.slug as string;

  const submitResponse = await request.post(`/api/listings/${listingId}/submit`, {
    headers: sellerHeaders,
  });
  expect(submitResponse.ok()).toBeTruthy();

  const approveResponse = await request.post(`/api/moderation/listings/${listingId}/approve`, {
    headers: {
      ...moderatorHeaders,
      "content-type": "application/json",
    },
    data: {
      reason: "E2E moderation approval",
    },
  });
  expect(approveResponse.ok()).toBeTruthy();

  await page.goto(`/listings/${listingSlug}`);
  await expect(page.getByRole("heading", { name: /Kia Sportage E2E/i })).toBeVisible();
});
