import type {
  AppUser,
  AuditLog,
  DealerProfile,
  Favorite,
  FeaturedPackage,
  Listing,
  ListingContactEvent,
  Location,
  ModerationReview,
  Notification,
  OtpVerification,
  PaymentTransaction,
  SellerProfile,
  SearchListingsInput,
  SellerType,
  UserRole,
} from "@/types/domain";

import { sha256 } from "@/lib/security";
import { getSupabaseAdminClient } from "@/server/supabase/client";
import type { DuplicateImageSignal, Repository, SearchResult } from "@/server/store/repository";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function toPhotoHash(url: string): string {
  return sha256(url.trim().toLowerCase());
}

function nowIso(): string {
  return new Date().toISOString();
}

const listingSelect = `
  id,
  seller_id,
  seller_type,
  status,
  title,
  description,
  price_ngn,
  year,
  make,
  model,
  body_type,
  mileage_km,
  transmission,
  fuel_type,
  vin,
  state,
  city,
  lat,
  lng,
  slug,
  contact_phone,
  contact_whatsapp,
  is_featured,
  featured_until,
  approved_at,
  created_at,
  updated_at,
  listing_photos(photo_url, sort_order)
`;

interface ListingPhotoRow {
  photo_url: string;
  sort_order: number;
}

interface ListingRow {
  id: string;
  seller_id: string;
  seller_type: SellerType;
  status: Listing["status"];
  title: string;
  description: string;
  price_ngn: number;
  year: number;
  make: string;
  model: string;
  body_type: Listing["bodyType"];
  mileage_km: number;
  transmission: Listing["transmission"];
  fuel_type: Listing["fuelType"];
  vin: string;
  state: string;
  city: string;
  lat: number | string;
  lng: number | string;
  slug: string;
  contact_phone: string;
  contact_whatsapp: string;
  is_featured: boolean;
  featured_until: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  listing_photos?: ListingPhotoRow[];
}

interface UserRow {
  id: string;
  role: UserRole;
  seller_type: SellerType | null;
  email: string | null;
  phone: string | null;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
}

interface SellerProfileRow {
  user_id: string;
  full_name: string;
  state: string | null;
  city: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

interface DealerProfileRow {
  user_id: string;
  business_name: string;
  cac_number: string | null;
  address: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

function mapUser(row: UserRow): AppUser {
  return {
    id: row.id,
    role: row.role,
    sellerType: row.seller_type ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    phoneVerified: row.phone_verified,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSellerProfile(row: SellerProfileRow): SellerProfile {
  return {
    userId: row.user_id,
    fullName: row.full_name,
    state: row.state,
    city: row.city,
    bio: row.bio,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDealerProfile(row: DealerProfileRow): DealerProfile {
  return {
    userId: row.user_id,
    businessName: row.business_name,
    cacNumber: row.cac_number,
    address: row.address,
    verified: row.verified,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapListing(row: ListingRow): Listing {
  const photos = (row.listing_photos ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((photo) => photo.photo_url);

  return {
    id: row.id,
    sellerId: row.seller_id,
    sellerType: row.seller_type,
    status: row.status,
    title: row.title,
    description: row.description,
    priceNgn: row.price_ngn,
    year: row.year,
    make: row.make,
    model: row.model,
    bodyType: row.body_type,
    mileageKm: row.mileage_km,
    transmission: row.transmission,
    fuelType: row.fuel_type,
    vin: row.vin,
    state: row.state,
    city: row.city,
    lat: Number(row.lat),
    lng: Number(row.lng),
    photos,
    isFeatured: row.is_featured,
    featuredUntil: row.featured_until,
    approvedAt: row.approved_at,
    slug: row.slug,
    contactPhone: row.contact_phone,
    contactWhatsapp: row.contact_whatsapp,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function ensureNoError(error: { message: string } | null, context: string): void {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

function ensureData<T>(data: T | null, context: string): T {
  if (data === null) {
    throw new Error(`${context}: empty response`);
  }

  return data;
}

export class SupabaseRepository implements Repository {
  private readonly client = getSupabaseAdminClient();

  async seedLocations(locations: Location[]): Promise<void> {
    const rows = locations.map((location) => ({
      state: location.state,
      city: location.city,
      lat: location.lat,
      lng: location.lng,
    }));

    const { error } = await this.client.from("locations").upsert(rows, {
      onConflict: "state,city",
      ignoreDuplicates: false,
    });

    ensureNoError(error, "Failed to seed locations");
  }

  async listLocations(): Promise<Location[]> {
    const { data, error } = await this.client
      .from("locations")
      .select("state, city, lat, lng")
      .order("state", { ascending: true })
      .order("city", { ascending: true });

    ensureNoError(error, "Failed to list locations");

    return (data ?? []).map((item) => ({
      state: item.state,
      city: item.city,
      lat: Number(item.lat),
      lng: Number(item.lng),
    }));
  }

  async getLocation(state: string, city: string): Promise<Location | null> {
    const { data, error } = await this.client
      .from("locations")
      .select("state, city, lat, lng")
      .eq("state", state)
      .eq("city", city)
      .maybeSingle();

    ensureNoError(error, "Failed to get location");

    if (!data) {
      return null;
    }

    return {
      state: data.state,
      city: data.city,
      lat: Number(data.lat),
      lng: Number(data.lng),
    };
  }

  async upsertUser(input: {
    id: string;
    role: UserRole;
    sellerType?: SellerType;
    phoneVerified?: boolean;
    email?: string;
    phone?: string;
  }): Promise<AppUser> {
    const existing = await this.getUserById(input.id);

    const payload = {
      id: input.id,
      auth_user_id: input.id,
      role: input.role,
      seller_type: input.sellerType ?? existing?.sellerType ?? null,
      email: input.email ?? existing?.email ?? null,
      phone: input.phone ?? existing?.phone ?? null,
      phone_verified: input.phoneVerified ?? existing?.phoneVerified ?? false,
    };

    const { data, error } = await this.client
      .from("users")
      .upsert(payload, { onConflict: "id" })
      .select("id, role, seller_type, email, phone, phone_verified, created_at, updated_at")
      .single<UserRow>();

    ensureNoError(error, "Failed to upsert user");

    return mapUser(ensureData(data, "Failed to upsert user"));
  }

  async getUserById(id: string): Promise<AppUser | null> {
    const { data, error } = await this.client
      .from("users")
      .select("id, role, seller_type, email, phone, phone_verified, created_at, updated_at")
      .eq("id", id)
      .maybeSingle<UserRow>();

    ensureNoError(error, "Failed to get user");

    return data ? mapUser(data) : null;
  }

  async markPhoneVerified(userId: string, phone: string): Promise<AppUser> {
    const { data, error } = await this.client
      .from("users")
      .update({ phone, phone_verified: true })
      .eq("id", userId)
      .select("id, role, seller_type, email, phone, phone_verified, created_at, updated_at")
      .single<UserRow>();

    ensureNoError(error, "Failed to mark phone verified");

    return mapUser(ensureData(data, "Failed to mark phone verified"));
  }

  async getSellerProfileByUserId(userId: string): Promise<SellerProfile | null> {
    const { data, error } = await this.client
      .from("seller_profiles")
      .select("user_id, full_name, state, city, bio, created_at, updated_at")
      .eq("user_id", userId)
      .maybeSingle<SellerProfileRow>();

    ensureNoError(error, "Failed to get seller profile");

    return data ? mapSellerProfile(data) : null;
  }

  async upsertSellerProfile(input: {
    userId: string;
    fullName: string;
    state?: string | null;
    city?: string | null;
    bio?: string | null;
  }): Promise<SellerProfile> {
    const payload = {
      user_id: input.userId,
      full_name: input.fullName,
      state: input.state ?? null,
      city: input.city ?? null,
      bio: input.bio ?? null,
    };

    const { data, error } = await this.client
      .from("seller_profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select("user_id, full_name, state, city, bio, created_at, updated_at")
      .single<SellerProfileRow>();

    ensureNoError(error, "Failed to upsert seller profile");

    return mapSellerProfile(ensureData(data, "Failed to upsert seller profile"));
  }

  async getDealerProfileByUserId(userId: string): Promise<DealerProfile | null> {
    const { data, error } = await this.client
      .from("dealer_profiles")
      .select("user_id, business_name, cac_number, address, verified, created_at, updated_at")
      .eq("user_id", userId)
      .maybeSingle<DealerProfileRow>();

    ensureNoError(error, "Failed to get dealer profile");

    return data ? mapDealerProfile(data) : null;
  }

  async upsertDealerProfile(input: {
    userId: string;
    businessName: string;
    cacNumber?: string | null;
    address?: string | null;
    verified?: boolean;
  }): Promise<DealerProfile> {
    const payload = {
      user_id: input.userId,
      business_name: input.businessName,
      cac_number: input.cacNumber ?? null,
      address: input.address ?? null,
      verified: input.verified ?? false,
    };

    const { data, error } = await this.client
      .from("dealer_profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select("user_id, business_name, cac_number, address, verified, created_at, updated_at")
      .single<DealerProfileRow>();

    ensureNoError(error, "Failed to upsert dealer profile");

    return mapDealerProfile(ensureData(data, "Failed to upsert dealer profile"));
  }

  async deleteDealerProfile(userId: string): Promise<void> {
    const { error } = await this.client.from("dealer_profiles").delete().eq("user_id", userId);

    ensureNoError(error, "Failed to delete dealer profile");
  }

  async createOtp(input: {
    userId: string;
    phone: string;
    codeHash: string;
    expiresAt: string;
    maxAttempts: number;
  }): Promise<OtpVerification> {
    const payload = {
      user_id: input.userId,
      phone: input.phone,
      code_hash: input.codeHash,
      expires_at: input.expiresAt,
      max_attempts: input.maxAttempts,
    };

    const { data, error } = await this.client
      .from("otp_verifications")
      .insert(payload)
      .select("id, user_id, phone, code_hash, expires_at, attempts, max_attempts, verified_at, created_at")
      .single();

    ensureNoError(error, "Failed to create OTP");
    const row = ensureData(data, "Failed to create OTP");

    return {
      id: row.id,
      userId: row.user_id,
      phone: row.phone,
      codeHash: row.code_hash,
      expiresAt: row.expires_at,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      verifiedAt: row.verified_at,
      createdAt: row.created_at,
    };
  }

  async getLatestOtp(userId: string, phone: string): Promise<OtpVerification | null> {
    const { data, error } = await this.client
      .from("otp_verifications")
      .select("id, user_id, phone, code_hash, expires_at, attempts, max_attempts, verified_at, created_at")
      .eq("user_id", userId)
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    ensureNoError(error, "Failed to get latest OTP");

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      phone: data.phone,
      codeHash: data.code_hash,
      expiresAt: data.expires_at,
      attempts: data.attempts,
      maxAttempts: data.max_attempts,
      verifiedAt: data.verified_at,
      createdAt: data.created_at,
    };
  }

  async incrementOtpAttempts(otpId: string): Promise<OtpVerification | null> {
    const { data: current, error: fetchError } = await this.client
      .from("otp_verifications")
      .select("id, attempts")
      .eq("id", otpId)
      .maybeSingle();

    ensureNoError(fetchError, "Failed to fetch OTP attempts");

    if (!current) {
      return null;
    }

    const { data, error } = await this.client
      .from("otp_verifications")
      .update({ attempts: current.attempts + 1 })
      .eq("id", otpId)
      .select("id, user_id, phone, code_hash, expires_at, attempts, max_attempts, verified_at, created_at")
      .maybeSingle();

    ensureNoError(error, "Failed to increment OTP attempts");

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      phone: data.phone,
      codeHash: data.code_hash,
      expiresAt: data.expires_at,
      attempts: data.attempts,
      maxAttempts: data.max_attempts,
      verifiedAt: data.verified_at,
      createdAt: data.created_at,
    };
  }

  async markOtpVerified(otpId: string): Promise<OtpVerification | null> {
    const { data, error } = await this.client
      .from("otp_verifications")
      .update({ verified_at: nowIso() })
      .eq("id", otpId)
      .select("id, user_id, phone, code_hash, expires_at, attempts, max_attempts, verified_at, created_at")
      .maybeSingle();

    ensureNoError(error, "Failed to mark OTP verified");

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      phone: data.phone,
      codeHash: data.code_hash,
      expiresAt: data.expires_at,
      attempts: data.attempts,
      maxAttempts: data.max_attempts,
      verifiedAt: data.verified_at,
      createdAt: data.created_at,
    };
  }

  async createListing(input: Omit<Listing, "createdAt" | "updatedAt">): Promise<Listing> {
    const listingPayload = {
      id: input.id,
      seller_id: input.sellerId,
      seller_type: input.sellerType,
      status: input.status,
      title: input.title,
      description: input.description,
      price_ngn: input.priceNgn,
      year: input.year,
      make: input.make,
      model: input.model,
      body_type: input.bodyType,
      mileage_km: input.mileageKm,
      transmission: input.transmission,
      fuel_type: input.fuelType,
      vin: input.vin,
      state: input.state,
      city: input.city,
      lat: input.lat,
      lng: input.lng,
      slug: input.slug,
      contact_phone: input.contactPhone,
      contact_whatsapp: input.contactWhatsapp,
      is_featured: input.isFeatured,
      featured_until: input.featuredUntil,
      approved_at: input.approvedAt,
    };

    const { error: listingError } = await this.client.from("listings").insert(listingPayload);
    ensureNoError(listingError, "Failed to create listing");

    if (input.photos.length) {
      const photoRows = input.photos.map((photoUrl, index) => ({
        listing_id: input.id,
        photo_url: photoUrl,
        photo_hash: toPhotoHash(photoUrl),
        sort_order: index,
      }));

      const { error: photosError } = await this.client.from("listing_photos").insert(photoRows);
      ensureNoError(photosError, "Failed to insert listing photos");
    }

    const created = await this.getListingById(input.id);
    if (!created) {
      throw new Error("Failed to fetch created listing");
    }

    return created;
  }

  async updateListing(id: string, patch: Partial<Listing>): Promise<Listing | null> {
    const listingPatch: Record<string, unknown> = {};

    if (patch.sellerType !== undefined) listingPatch.seller_type = patch.sellerType;
    if (patch.status !== undefined) listingPatch.status = patch.status;
    if (patch.title !== undefined) listingPatch.title = patch.title;
    if (patch.description !== undefined) listingPatch.description = patch.description;
    if (patch.priceNgn !== undefined) listingPatch.price_ngn = patch.priceNgn;
    if (patch.year !== undefined) listingPatch.year = patch.year;
    if (patch.make !== undefined) listingPatch.make = patch.make;
    if (patch.model !== undefined) listingPatch.model = patch.model;
    if (patch.bodyType !== undefined) listingPatch.body_type = patch.bodyType;
    if (patch.mileageKm !== undefined) listingPatch.mileage_km = patch.mileageKm;
    if (patch.transmission !== undefined) listingPatch.transmission = patch.transmission;
    if (patch.fuelType !== undefined) listingPatch.fuel_type = patch.fuelType;
    if (patch.vin !== undefined) listingPatch.vin = patch.vin;
    if (patch.state !== undefined) listingPatch.state = patch.state;
    if (patch.city !== undefined) listingPatch.city = patch.city;
    if (patch.lat !== undefined) listingPatch.lat = patch.lat;
    if (patch.lng !== undefined) listingPatch.lng = patch.lng;
    if (patch.slug !== undefined) listingPatch.slug = patch.slug;
    if (patch.contactPhone !== undefined) listingPatch.contact_phone = patch.contactPhone;
    if (patch.contactWhatsapp !== undefined) listingPatch.contact_whatsapp = patch.contactWhatsapp;
    if (patch.isFeatured !== undefined) listingPatch.is_featured = patch.isFeatured;
    if (patch.featuredUntil !== undefined) listingPatch.featured_until = patch.featuredUntil;
    if (patch.approvedAt !== undefined) listingPatch.approved_at = patch.approvedAt;

    if (Object.keys(listingPatch).length > 0) {
      const { error } = await this.client.from("listings").update(listingPatch).eq("id", id);
      ensureNoError(error, "Failed to update listing");
    }

    if (patch.photos) {
      const { error: deleteError } = await this.client.from("listing_photos").delete().eq("listing_id", id);
      ensureNoError(deleteError, "Failed to clear listing photos");

      if (patch.photos.length > 0) {
        const photoRows = patch.photos.map((photoUrl, index) => ({
          listing_id: id,
          photo_url: photoUrl,
          photo_hash: toPhotoHash(photoUrl),
          sort_order: index,
        }));

        const { error: insertError } = await this.client.from("listing_photos").insert(photoRows);
        ensureNoError(insertError, "Failed to replace listing photos");
      }
    }

    return this.getListingById(id);
  }

  async getListingById(id: string): Promise<Listing | null> {
    const { data, error } = await this.client
      .from("listings")
      .select(listingSelect)
      .eq("id", id)
      .maybeSingle<ListingRow>();

    ensureNoError(error, "Failed to get listing by id");

    return data ? mapListing(data) : null;
  }

  async getListingBySlug(slug: string): Promise<Listing | null> {
    const { data, error } = await this.client
      .from("listings")
      .select(listingSelect)
      .eq("slug", slug)
      .maybeSingle<ListingRow>();

    ensureNoError(error, "Failed to get listing by slug");

    return data ? mapListing(data) : null;
  }

  async listSellerListings(sellerId: string): Promise<Listing[]> {
    const { data, error } = await this.client
      .from("listings")
      .select(listingSelect)
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false });

    ensureNoError(error, "Failed to list seller listings");

    return (data ?? []).map((row) => mapListing(row as ListingRow));
  }

  async searchListings(input: SearchListingsInput): Promise<SearchResult> {
    let query = this.client.from("listings").select(listingSelect).eq("status", "approved");

    if (input.make) query = query.eq("make", input.make);
    if (input.model) query = query.eq("model", input.model);
    if (input.state) query = query.eq("state", input.state);
    if (input.city) query = query.eq("city", input.city);
    if (input.bodyType) query = query.eq("body_type", input.bodyType);
    if (input.minPriceNgn !== undefined) query = query.gte("price_ngn", input.minPriceNgn);
    if (input.maxPriceNgn !== undefined) query = query.lte("price_ngn", input.maxPriceNgn);
    if (input.minYear !== undefined) query = query.gte("year", input.minYear);
    if (input.maxYear !== undefined) query = query.lte("year", input.maxYear);

    const { data, error } = await query.order("created_at", { ascending: false });
    ensureNoError(error, "Failed to search listings");

    let items = (data ?? []).map((row) => mapListing(row as ListingRow));

    if (input.query) {
      const q = normalize(input.query);
      items = items.filter((item) =>
        `${item.title} ${item.make} ${item.model} ${item.city} ${item.state}`.toLowerCase().includes(q),
      );
    }

    const total = items.length;
    const offset = (input.page - 1) * input.pageSize;

    return {
      items: items.slice(offset, offset + input.pageSize),
      total,
    };
  }

  async allListings(): Promise<Listing[]> {
    const { data, error } = await this.client
      .from("listings")
      .select(listingSelect)
      .order("created_at", { ascending: false });

    ensureNoError(error, "Failed to list all listings");

    return (data ?? []).map((row) => mapListing(row as ListingRow));
  }

  async hasDuplicateVin(vin: string, excludeListingId?: string): Promise<boolean> {
    const statuses = ["draft", "pending_review", "approved", "sold"];

    let query = this.client.from("listings").select("id").eq("vin", vin).in("status", statuses);
    if (excludeListingId) {
      query = query.neq("id", excludeListingId);
    }

    const { data, error } = await query.limit(1);
    ensureNoError(error, "Failed to check duplicate VIN");

    return Boolean(data && data.length > 0);
  }

  async detectDuplicateImageHashes(
    imageHashes: string[],
    excludeListingId?: string,
  ): Promise<DuplicateImageSignal> {
    if (!imageHashes.length) {
      return {
        overlapCount: 0,
        existingListingIds: [],
      };
    }

    let query = this.client.from("listing_photos").select("listing_id, photo_hash").in("photo_hash", imageHashes);
    if (excludeListingId) {
      query = query.neq("listing_id", excludeListingId);
    }

    const { data, error } = await query;
    ensureNoError(error, "Failed to detect duplicate image hashes");

    const listingIds = new Set<string>();
    for (const row of data ?? []) {
      listingIds.add(row.listing_id as string);
    }

    return {
      overlapCount: (data ?? []).length,
      existingListingIds: [...listingIds],
    };
  }

  async addModerationReview(input: Omit<ModerationReview, "createdAt">): Promise<ModerationReview> {
    const payload = {
      id: input.id,
      listing_id: input.listingId,
      moderator_id: input.moderatorId,
      action: input.action,
      reason: input.reason ?? null,
    };

    const { data, error } = await this.client
      .from("moderation_reviews")
      .insert(payload)
      .select("id, listing_id, moderator_id, action, reason, created_at")
      .single();

    ensureNoError(error, "Failed to add moderation review");
    const row = ensureData(data, "Failed to add moderation review");

    return {
      id: row.id,
      listingId: row.listing_id,
      moderatorId: row.moderator_id,
      action: row.action,
      reason: row.reason ?? undefined,
      createdAt: row.created_at,
    };
  }

  async getModerationQueue(): Promise<Listing[]> {
    const { data, error } = await this.client
      .from("listings")
      .select(listingSelect)
      .eq("status", "pending_review")
      .order("created_at", { ascending: true });

    ensureNoError(error, "Failed to get moderation queue");

    return (data ?? []).map((row) => mapListing(row as ListingRow));
  }

  async addFavorite(input: Favorite): Promise<Favorite> {
    const payload = {
      user_id: input.userId,
      listing_id: input.listingId,
    };

    const { error } = await this.client.from("favorites").upsert(payload, {
      onConflict: "user_id,listing_id",
      ignoreDuplicates: false,
    });

    ensureNoError(error, "Failed to add favorite");

    return {
      userId: input.userId,
      listingId: input.listingId,
      createdAt: input.createdAt,
    };
  }

  async removeFavorite(userId: string, listingId: string): Promise<boolean> {
    const { error, count } = await this.client
      .from("favorites")
      .delete({ count: "exact" })
      .eq("user_id", userId)
      .eq("listing_id", listingId);

    ensureNoError(error, "Failed to remove favorite");

    return Boolean(count && count > 0);
  }

  async listFavoritesByUser(userId: string): Promise<Favorite[]> {
    const { data, error } = await this.client
      .from("favorites")
      .select("user_id, listing_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    ensureNoError(error, "Failed to list favorites");

    return (data ?? []).map((item) => ({
      userId: item.user_id,
      listingId: item.listing_id,
      createdAt: item.created_at,
    }));
  }

  async addContactEvent(input: Omit<ListingContactEvent, "createdAt">): Promise<ListingContactEvent> {
    const payload = {
      id: input.id,
      listing_id: input.listingId,
      user_id: input.userId,
      channel: input.channel,
      ip: input.ip,
      user_agent: input.userAgent,
    };

    const { data, error } = await this.client
      .from("listing_contact_events")
      .insert(payload)
      .select("id, listing_id, user_id, channel, ip, user_agent, created_at")
      .single();

    ensureNoError(error, "Failed to add contact event");
    const row = ensureData(data, "Failed to add contact event");

    return {
      id: row.id,
      listingId: row.listing_id,
      userId: row.user_id,
      channel: row.channel,
      ip: row.ip,
      userAgent: row.user_agent,
      createdAt: row.created_at,
    };
  }

  async listContactEventsByListingSince(
    listingId: string,
    sinceIso: string,
  ): Promise<ListingContactEvent[]> {
    const { data, error } = await this.client
      .from("listing_contact_events")
      .select("id, listing_id, user_id, channel, ip, user_agent, created_at")
      .eq("listing_id", listingId)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false });

    ensureNoError(error, "Failed to list contact events");

    return (data ?? []).map((event) => ({
      id: event.id,
      listingId: event.listing_id,
      userId: event.user_id,
      channel: event.channel,
      ip: event.ip,
      userAgent: event.user_agent,
      createdAt: event.created_at,
    }));
  }

  async listFeaturedPackages(): Promise<FeaturedPackage[]> {
    const { data, error } = await this.client
      .from("featured_packages")
      .select("id, code, name, duration_days, amount_ngn, created_at")
      .eq("is_active", true)
      .order("amount_ngn", { ascending: true });

    ensureNoError(error, "Failed to list featured packages");

    return (data ?? []).map((pkg) => ({
      id: pkg.id,
      code: pkg.code,
      name: pkg.name,
      durationDays: pkg.duration_days,
      amountNgn: pkg.amount_ngn,
      createdAt: pkg.created_at,
    }));
  }

  async getFeaturedPackageByCode(code: string): Promise<FeaturedPackage | null> {
    const { data, error } = await this.client
      .from("featured_packages")
      .select("id, code, name, duration_days, amount_ngn, created_at")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();

    ensureNoError(error, "Failed to get featured package");

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      code: data.code,
      name: data.name,
      durationDays: data.duration_days,
      amountNgn: data.amount_ngn,
      createdAt: data.created_at,
    };
  }

  async createPaymentTransaction(
    input: Omit<PaymentTransaction, "createdAt" | "paidAt">,
  ): Promise<PaymentTransaction> {
    const payload = {
      id: input.id,
      listing_id: input.listingId,
      seller_id: input.sellerId,
      package_code: input.packageCode,
      amount_ngn: input.amountNgn,
      provider: input.provider,
      reference: input.reference,
      status: input.status,
      webhook_event_id: input.webhookEventId,
      provider_transaction_id: input.providerTransactionId,
    };

    const { data, error } = await this.client
      .from("payment_transactions")
      .insert(payload)
      .select(
        "id, listing_id, seller_id, package_code, amount_ngn, provider, reference, status, webhook_event_id, provider_transaction_id, created_at, paid_at",
      )
      .single();

    ensureNoError(error, "Failed to create payment transaction");
    const row = ensureData(data, "Failed to create payment transaction");

    return {
      id: row.id,
      listingId: row.listing_id,
      sellerId: row.seller_id,
      packageCode: row.package_code,
      amountNgn: row.amount_ngn,
      provider: row.provider,
      reference: row.reference,
      status: row.status,
      webhookEventId: row.webhook_event_id,
      providerTransactionId: row.provider_transaction_id,
      createdAt: row.created_at,
      paidAt: row.paid_at,
    };
  }

  async getPaymentByReference(reference: string): Promise<PaymentTransaction | null> {
    const { data, error } = await this.client
      .from("payment_transactions")
      .select(
        "id, listing_id, seller_id, package_code, amount_ngn, provider, reference, status, webhook_event_id, provider_transaction_id, created_at, paid_at",
      )
      .eq("reference", reference)
      .maybeSingle();

    ensureNoError(error, "Failed to get payment by reference");

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      listingId: data.listing_id,
      sellerId: data.seller_id,
      packageCode: data.package_code,
      amountNgn: data.amount_ngn,
      provider: data.provider,
      reference: data.reference,
      status: data.status,
      webhookEventId: data.webhook_event_id,
      providerTransactionId: data.provider_transaction_id,
      createdAt: data.created_at,
      paidAt: data.paid_at,
    };
  }

  async getPaymentByWebhookEventId(webhookEventId: string): Promise<PaymentTransaction | null> {
    const { data, error } = await this.client
      .from("payment_transactions")
      .select(
        "id, listing_id, seller_id, package_code, amount_ngn, provider, reference, status, webhook_event_id, provider_transaction_id, created_at, paid_at",
      )
      .eq("webhook_event_id", webhookEventId)
      .maybeSingle();

    ensureNoError(error, "Failed to get payment by webhook event id");

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      listingId: data.listing_id,
      sellerId: data.seller_id,
      packageCode: data.package_code,
      amountNgn: data.amount_ngn,
      provider: data.provider,
      reference: data.reference,
      status: data.status,
      webhookEventId: data.webhook_event_id,
      providerTransactionId: data.provider_transaction_id,
      createdAt: data.created_at,
      paidAt: data.paid_at,
    };
  }

  async markPaymentPaid(input: {
    reference: string;
    webhookEventId: string;
    providerTransactionId?: string;
    paidAt: string;
  }): Promise<PaymentTransaction | null> {
    const payload = {
      status: "paid",
      webhook_event_id: input.webhookEventId,
      provider_transaction_id: input.providerTransactionId ?? null,
      paid_at: input.paidAt,
    };

    const { data, error } = await this.client
      .from("payment_transactions")
      .update(payload)
      .eq("reference", input.reference)
      .select(
        "id, listing_id, seller_id, package_code, amount_ngn, provider, reference, status, webhook_event_id, provider_transaction_id, created_at, paid_at",
      )
      .maybeSingle();

    ensureNoError(error, "Failed to mark payment paid");

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      listingId: data.listing_id,
      sellerId: data.seller_id,
      packageCode: data.package_code,
      amountNgn: data.amount_ngn,
      provider: data.provider,
      reference: data.reference,
      status: data.status,
      webhookEventId: data.webhook_event_id,
      providerTransactionId: data.provider_transaction_id,
      createdAt: data.created_at,
      paidAt: data.paid_at,
    };
  }

  async addNotification(input: Omit<Notification, "createdAt" | "readAt">): Promise<Notification> {
    const payload = {
      id: input.id,
      user_id: input.userId,
      title: input.title,
      body: input.body,
    };

    const { data, error } = await this.client
      .from("notifications")
      .insert(payload)
      .select("id, user_id, title, body, read_at, created_at")
      .single();

    ensureNoError(error, "Failed to add notification");
    const row = ensureData(data, "Failed to add notification");

    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      body: row.body,
      readAt: row.read_at,
      createdAt: row.created_at,
    };
  }

  async listNotificationsByUser(userId: string): Promise<Notification[]> {
    const { data, error } = await this.client
      .from("notifications")
      .select("id, user_id, title, body, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    ensureNoError(error, "Failed to list notifications");

    return (data ?? []).map((notification) => ({
      id: notification.id,
      userId: notification.user_id,
      title: notification.title,
      body: notification.body,
      readAt: notification.read_at,
      createdAt: notification.created_at,
    }));
  }

  async addAuditLog(input: Omit<AuditLog, "createdAt">): Promise<AuditLog> {
    const payload = {
      id: input.id,
      actor_user_id: input.actorUserId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      action: input.action,
      metadata: input.metadata,
    };

    const { data, error } = await this.client
      .from("audit_logs")
      .insert(payload)
      .select("id, actor_user_id, entity_type, entity_id, action, metadata, created_at")
      .single();

    ensureNoError(error, "Failed to add audit log");
    const row = ensureData(data, "Failed to add audit log");

    return {
      id: row.id,
      actorUserId: row.actor_user_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      action: row.action,
      metadata: row.metadata ?? {},
      createdAt: row.created_at,
    };
  }

  async listAuditLogs(): Promise<AuditLog[]> {
    const { data, error } = await this.client
      .from("audit_logs")
      .select("id, actor_user_id, entity_type, entity_id, action, metadata, created_at")
      .order("created_at", { ascending: false });

    ensureNoError(error, "Failed to list audit logs");

    return (data ?? []).map((item) => ({
      id: item.id,
      actorUserId: item.actor_user_id,
      entityType: item.entity_type,
      entityId: item.entity_id,
      action: item.action,
      metadata: item.metadata ?? {},
      createdAt: item.created_at,
    }));
  }
}
