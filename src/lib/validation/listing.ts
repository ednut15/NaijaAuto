import { z } from "zod";

const bodyTypeEnum = z.enum(["car", "suv", "pickup"]);
const fuelTypeEnum = z.enum(["petrol", "diesel", "hybrid", "electric"]);
const transmissionEnum = z.enum(["automatic", "manual"]);

export const createListingSchema = z.object({
  title: z.string().min(10).max(120),
  description: z.string().min(40).max(5_000),
  priceNgn: z.number().int().min(500_000).max(500_000_000),
  year: z.number().int().min(1980).max(new Date().getFullYear() + 1),
  make: z.string().min(2).max(50),
  model: z.string().min(1).max(50),
  bodyType: bodyTypeEnum,
  mileageKm: z.number().int().min(0).max(2_000_000),
  transmission: transmissionEnum,
  fuelType: fuelTypeEnum,
  vin: z.string().trim().length(17).toUpperCase(),
  state: z.string().min(2).max(40),
  city: z.string().min(2).max(50),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  photos: z.array(z.string().url()).min(1).max(30),
  contactPhone: z.string().min(10).max(20),
  contactWhatsapp: z.string().min(10).max(20),
});

export const updateListingSchema = createListingSchema.partial();

export const listingSearchSchema = z.object({
  query: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  bodyType: bodyTypeEnum.optional(),
  minPriceNgn: z.coerce.number().int().positive().optional(),
  maxPriceNgn: z.coerce.number().int().positive().optional(),
  minYear: z.coerce.number().int().min(1980).optional(),
  maxYear: z.coerce.number().int().max(new Date().getFullYear() + 1).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const sendOtpSchema = z.object({
  phone: z.string().min(10).max(20),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(20),
  code: z.string().length(6),
});

export const contactClickSchema = z.object({
  channel: z.enum(["phone", "whatsapp"]),
});

export const featuredCheckoutSchema = z.object({
  listingId: z.string().uuid(),
  packageCode: z.string().min(2).max(30),
});

export const moderationDecisionSchema = z.object({
  reason: z.string().trim().min(5).max(500).optional(),
});
