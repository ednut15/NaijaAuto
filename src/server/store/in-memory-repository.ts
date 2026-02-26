import crypto from "node:crypto";

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
} from "@/types/domain";

import type { DuplicateImageSignal, Repository, SearchResult } from "@/server/store/repository";

function nowIso(): string {
  return new Date().toISOString();
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function hashPhoto(url: string): string {
  return crypto.createHash("sha256").update(url.trim().toLowerCase()).digest("hex");
}

export class InMemoryRepository implements Repository {
  private users = new Map<string, AppUser>();
  private sellerProfiles = new Map<string, SellerProfile>();
  private dealerProfiles = new Map<string, DealerProfile>();
  private listings = new Map<string, Listing>();
  private otps = new Map<string, OtpVerification>();
  private favorites: Favorite[] = [];
  private reviews: ModerationReview[] = [];
  private contactEvents: ListingContactEvent[] = [];
  private notifications: Notification[] = [];
  private auditLogs: AuditLog[] = [];
  private paymentTransactions = new Map<string, PaymentTransaction>();
  private featuredPackages: FeaturedPackage[] = [
    {
      id: crypto.randomUUID(),
      code: "feature_7_days",
      name: "Featured - 7 Days",
      durationDays: 7,
      amountNgn: 25000,
      createdAt: nowIso(),
    },
    {
      id: crypto.randomUUID(),
      code: "feature_14_days",
      name: "Featured - 14 Days",
      durationDays: 14,
      amountNgn: 45000,
      createdAt: nowIso(),
    },
    {
      id: crypto.randomUUID(),
      code: "feature_30_days",
      name: "Featured - 30 Days",
      durationDays: 30,
      amountNgn: 80000,
      createdAt: nowIso(),
    },
  ];
  private locations: Location[] = [];

  async seedLocations(locations: Location[]): Promise<void> {
    this.locations = locations;
  }

  async listLocations(): Promise<Location[]> {
    return [...this.locations];
  }

  async getLocation(state: string, city: string): Promise<Location | null> {
    const match = this.locations.find(
      (item) => normalize(item.state) === normalize(state) && normalize(item.city) === normalize(city),
    );
    return match ?? null;
  }

  async upsertUser(input: {
    id: string;
    role: AppUser["role"];
    sellerType?: AppUser["sellerType"];
    phoneVerified?: boolean;
    email?: string;
    phone?: string;
  }): Promise<AppUser> {
    const existing = this.users.get(input.id);
    const timestamp = nowIso();

    const user: AppUser = {
      id: input.id,
      role: input.role,
      sellerType: input.sellerType,
      phoneVerified: input.phoneVerified ?? existing?.phoneVerified ?? false,
      email: input.email ?? existing?.email,
      phone: input.phone ?? existing?.phone,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };

    this.users.set(user.id, user);
    return user;
  }

  async getUserById(id: string): Promise<AppUser | null> {
    return this.users.get(id) ?? null;
  }

  async markPhoneVerified(userId: string, phone: string): Promise<AppUser> {
    const existing = this.users.get(userId);
    if (!existing) {
      throw new Error("User not found.");
    }

    const user: AppUser = {
      ...existing,
      phone,
      phoneVerified: true,
      updatedAt: nowIso(),
    };

    this.users.set(user.id, user);
    return user;
  }

  async getSellerProfileByUserId(userId: string): Promise<SellerProfile | null> {
    return this.sellerProfiles.get(userId) ?? null;
  }

  async upsertSellerProfile(input: {
    userId: string;
    fullName: string;
    state?: string | null;
    city?: string | null;
    bio?: string | null;
  }): Promise<SellerProfile> {
    const existing = this.sellerProfiles.get(input.userId);
    const timestamp = nowIso();

    const profile: SellerProfile = {
      userId: input.userId,
      fullName: input.fullName,
      state: input.state ?? null,
      city: input.city ?? null,
      bio: input.bio ?? null,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };

    this.sellerProfiles.set(input.userId, profile);
    return profile;
  }

  async getDealerProfileByUserId(userId: string): Promise<DealerProfile | null> {
    return this.dealerProfiles.get(userId) ?? null;
  }

  async upsertDealerProfile(input: {
    userId: string;
    businessName: string;
    cacNumber?: string | null;
    address?: string | null;
    verified?: boolean;
  }): Promise<DealerProfile> {
    const existing = this.dealerProfiles.get(input.userId);
    const timestamp = nowIso();

    const profile: DealerProfile = {
      userId: input.userId,
      businessName: input.businessName,
      cacNumber: input.cacNumber ?? null,
      address: input.address ?? null,
      verified: input.verified ?? existing?.verified ?? false,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };

    this.dealerProfiles.set(input.userId, profile);
    return profile;
  }

  async deleteDealerProfile(userId: string): Promise<void> {
    this.dealerProfiles.delete(userId);
  }

  async createOtp(input: {
    userId: string;
    phone: string;
    codeHash: string;
    expiresAt: string;
    maxAttempts: number;
  }): Promise<OtpVerification> {
    const otp: OtpVerification = {
      id: crypto.randomUUID(),
      userId: input.userId,
      phone: input.phone,
      codeHash: input.codeHash,
      expiresAt: input.expiresAt,
      attempts: 0,
      maxAttempts: input.maxAttempts,
      verifiedAt: null,
      createdAt: nowIso(),
    };

    this.otps.set(otp.id, otp);
    return otp;
  }

  async getLatestOtp(userId: string, phone: string): Promise<OtpVerification | null> {
    const records = [...this.otps.values()]
      .filter((item) => item.userId === userId && item.phone === phone)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return records[0] ?? null;
  }

  async incrementOtpAttempts(otpId: string): Promise<OtpVerification | null> {
    const otp = this.otps.get(otpId);
    if (!otp) {
      return null;
    }

    const updated: OtpVerification = {
      ...otp,
      attempts: otp.attempts + 1,
    };
    this.otps.set(otp.id, updated);
    return updated;
  }

  async markOtpVerified(otpId: string): Promise<OtpVerification | null> {
    const otp = this.otps.get(otpId);
    if (!otp) {
      return null;
    }

    const updated: OtpVerification = {
      ...otp,
      verifiedAt: nowIso(),
    };
    this.otps.set(otp.id, updated);
    return updated;
  }

  async createListing(input: Omit<Listing, "createdAt" | "updatedAt">): Promise<Listing> {
    const listing: Listing = {
      ...input,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    this.listings.set(listing.id, listing);
    return listing;
  }

  async updateListing(id: string, patch: Partial<Listing>): Promise<Listing | null> {
    const existing = this.listings.get(id);
    if (!existing) {
      return null;
    }

    const merged: Listing = {
      ...existing,
      ...patch,
      id: existing.id,
      sellerId: existing.sellerId,
      updatedAt: nowIso(),
    };

    this.listings.set(id, merged);
    return merged;
  }

  async getListingById(id: string): Promise<Listing | null> {
    return this.listings.get(id) ?? null;
  }

  async getListingBySlug(slug: string): Promise<Listing | null> {
    const normalizedSlug = normalize(slug);
    return (
      [...this.listings.values()].find((item) => normalize(item.slug) === normalizedSlug) ?? null
    );
  }

  async listSellerListings(sellerId: string): Promise<Listing[]> {
    return [...this.listings.values()].filter((item) => item.sellerId === sellerId);
  }

  async searchListings(input: SearchListingsInput): Promise<SearchResult> {
    let records = [...this.listings.values()].filter((item) => item.status === "approved");

    if (input.make) {
      records = records.filter((item) => normalize(item.make) === normalize(input.make!));
    }

    if (input.model) {
      records = records.filter((item) => normalize(item.model) === normalize(input.model!));
    }

    if (input.state) {
      records = records.filter((item) => normalize(item.state) === normalize(input.state!));
    }

    if (input.city) {
      records = records.filter((item) => normalize(item.city) === normalize(input.city!));
    }

    if (input.bodyType) {
      records = records.filter((item) => item.bodyType === input.bodyType);
    }

    if (input.minPriceNgn !== undefined) {
      records = records.filter((item) => item.priceNgn >= input.minPriceNgn!);
    }

    if (input.maxPriceNgn !== undefined) {
      records = records.filter((item) => item.priceNgn <= input.maxPriceNgn!);
    }

    if (input.minYear !== undefined) {
      records = records.filter((item) => item.year >= input.minYear!);
    }

    if (input.maxYear !== undefined) {
      records = records.filter((item) => item.year <= input.maxYear!);
    }

    if (input.query) {
      const query = normalize(input.query);
      records = records.filter((item) => {
        const haystack = `${item.title} ${item.make} ${item.model} ${item.city} ${item.state}`.toLowerCase();
        return haystack.includes(query);
      });
    }

    const total = records.length;
    const offset = (input.page - 1) * input.pageSize;

    return {
      items: records.slice(offset, offset + input.pageSize),
      total,
    };
  }

  async allListings(): Promise<Listing[]> {
    return [...this.listings.values()];
  }

  async hasDuplicateVin(vin: string, excludeListingId?: string): Promise<boolean> {
    const normalizedVin = normalize(vin);

    return [...this.listings.values()].some((item) => {
      if (excludeListingId && item.id === excludeListingId) {
        return false;
      }
      if (item.status === "rejected" || item.status === "archived") {
        return false;
      }
      return normalize(item.vin) === normalizedVin;
    });
  }

  async detectDuplicateImageHashes(
    imageHashes: string[],
    excludeListingId?: string,
  ): Promise<DuplicateImageSignal> {
    const hashes = new Set(imageHashes);
    const listingIds = new Set<string>();
    let overlapCount = 0;

    for (const listing of this.listings.values()) {
      if (excludeListingId && listing.id === excludeListingId) {
        continue;
      }

      for (const photo of listing.photos) {
        if (hashes.has(hashPhoto(photo))) {
          overlapCount += 1;
          listingIds.add(listing.id);
        }
      }
    }

    return {
      overlapCount,
      existingListingIds: [...listingIds],
    };
  }

  async addModerationReview(
    input: Omit<ModerationReview, "createdAt">,
  ): Promise<ModerationReview> {
    const review: ModerationReview = {
      ...input,
      createdAt: nowIso(),
    };

    this.reviews.push(review);
    return review;
  }

  async getModerationQueue(): Promise<Listing[]> {
    return [...this.listings.values()]
      .filter((item) => item.status === "pending_review")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async addFavorite(input: Favorite): Promise<Favorite> {
    const exists = this.favorites.some(
      (item) => item.userId === input.userId && item.listingId === input.listingId,
    );

    if (!exists) {
      this.favorites.push(input);
    }

    return input;
  }

  async removeFavorite(userId: string, listingId: string): Promise<boolean> {
    const before = this.favorites.length;
    this.favorites = this.favorites.filter(
      (item) => !(item.userId === userId && item.listingId === listingId),
    );
    return this.favorites.length < before;
  }

  async listFavoritesByUser(userId: string): Promise<Favorite[]> {
    return this.favorites.filter((item) => item.userId === userId);
  }

  async addContactEvent(
    input: Omit<ListingContactEvent, "createdAt">,
  ): Promise<ListingContactEvent> {
    const event: ListingContactEvent = {
      ...input,
      createdAt: nowIso(),
    };
    this.contactEvents.push(event);
    return event;
  }

  async listContactEventsByListingSince(
    listingId: string,
    sinceIso: string,
  ): Promise<ListingContactEvent[]> {
    return this.contactEvents.filter(
      (event) => event.listingId === listingId && event.createdAt >= sinceIso,
    );
  }

  async listFeaturedPackages(): Promise<FeaturedPackage[]> {
    return [...this.featuredPackages];
  }

  async getFeaturedPackageByCode(code: string): Promise<FeaturedPackage | null> {
    return this.featuredPackages.find((pkg) => normalize(pkg.code) === normalize(code)) ?? null;
  }

  async createPaymentTransaction(
    input: Omit<PaymentTransaction, "createdAt" | "paidAt">,
  ): Promise<PaymentTransaction> {
    const transaction: PaymentTransaction = {
      ...input,
      createdAt: nowIso(),
      paidAt: null,
    };
    this.paymentTransactions.set(transaction.reference, transaction);
    return transaction;
  }

  async getPaymentByReference(reference: string): Promise<PaymentTransaction | null> {
    return this.paymentTransactions.get(reference) ?? null;
  }

  async getPaymentByWebhookEventId(webhookEventId: string): Promise<PaymentTransaction | null> {
    return (
      [...this.paymentTransactions.values()].find((item) => item.webhookEventId === webhookEventId) ??
      null
    );
  }

  async markPaymentPaid(input: {
    reference: string;
    webhookEventId: string;
    providerTransactionId?: string;
    paidAt: string;
  }): Promise<PaymentTransaction | null> {
    const existing = this.paymentTransactions.get(input.reference);
    if (!existing) {
      return null;
    }

    const updated: PaymentTransaction = {
      ...existing,
      status: "paid",
      webhookEventId: input.webhookEventId,
      providerTransactionId: input.providerTransactionId ?? existing.providerTransactionId,
      paidAt: input.paidAt,
    };

    this.paymentTransactions.set(input.reference, updated);
    return updated;
  }

  async addNotification(input: Omit<Notification, "createdAt" | "readAt">): Promise<Notification> {
    const notification: Notification = {
      ...input,
      createdAt: nowIso(),
      readAt: null,
    };

    this.notifications.push(notification);
    return notification;
  }

  async listNotificationsByUser(userId: string): Promise<Notification[]> {
    return this.notifications.filter((item) => item.userId === userId);
  }

  async addAuditLog(input: Omit<AuditLog, "createdAt">): Promise<AuditLog> {
    const log: AuditLog = {
      ...input,
      createdAt: nowIso(),
    };

    this.auditLogs.push(log);
    return log;
  }

  async listAuditLogs(): Promise<AuditLog[]> {
    return [...this.auditLogs];
  }
}
