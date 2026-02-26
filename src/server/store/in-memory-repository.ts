import crypto from "node:crypto";

import type {
  AppUser,
  AuditLog,
  Favorite,
  FeaturedPackage,
  Listing,
  ListingContactEvent,
  Location,
  ModerationReview,
  Notification,
  OtpVerification,
  PaymentTransaction,
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

  seedLocations(locations: Location[]): void {
    this.locations = locations;
  }

  listLocations(): Location[] {
    return [...this.locations];
  }

  getLocation(state: string, city: string): Location | null {
    const match = this.locations.find(
      (item) => normalize(item.state) === normalize(state) && normalize(item.city) === normalize(city),
    );
    return match ?? null;
  }

  upsertUser(input: {
    id: string;
    role: AppUser["role"];
    sellerType?: AppUser["sellerType"];
    phoneVerified?: boolean;
    email?: string;
    phone?: string;
  }): AppUser {
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

  getUserById(id: string): AppUser | null {
    return this.users.get(id) ?? null;
  }

  markPhoneVerified(userId: string, phone: string): AppUser {
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

  createOtp(input: {
    userId: string;
    phone: string;
    codeHash: string;
    expiresAt: string;
    maxAttempts: number;
  }): OtpVerification {
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

  getLatestOtp(userId: string, phone: string): OtpVerification | null {
    const records = [...this.otps.values()]
      .filter((item) => item.userId === userId && item.phone === phone)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return records[0] ?? null;
  }

  incrementOtpAttempts(otpId: string): OtpVerification | null {
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

  markOtpVerified(otpId: string): OtpVerification | null {
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

  createListing(input: Omit<Listing, "createdAt" | "updatedAt">): Listing {
    const listing: Listing = {
      ...input,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    this.listings.set(listing.id, listing);
    return listing;
  }

  updateListing(id: string, patch: Partial<Listing>): Listing | null {
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

  getListingById(id: string): Listing | null {
    return this.listings.get(id) ?? null;
  }

  getListingBySlug(slug: string): Listing | null {
    const normalizedSlug = normalize(slug);
    return (
      [...this.listings.values()].find((item) => normalize(item.slug) === normalizedSlug) ?? null
    );
  }

  listSellerListings(sellerId: string): Listing[] {
    return [...this.listings.values()].filter((item) => item.sellerId === sellerId);
  }

  searchListings(input: SearchListingsInput): SearchResult {
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

  allListings(): Listing[] {
    return [...this.listings.values()];
  }

  hasDuplicateVin(vin: string, excludeListingId?: string): boolean {
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

  detectDuplicateImageHashes(imageHashes: string[], excludeListingId?: string): DuplicateImageSignal {
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

  addModerationReview(input: Omit<ModerationReview, "createdAt">): ModerationReview {
    const review: ModerationReview = {
      ...input,
      createdAt: nowIso(),
    };

    this.reviews.push(review);
    return review;
  }

  getModerationQueue(): Listing[] {
    return [...this.listings.values()]
      .filter((item) => item.status === "pending_review")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  addFavorite(input: Favorite): Favorite {
    const exists = this.favorites.some(
      (item) => item.userId === input.userId && item.listingId === input.listingId,
    );

    if (!exists) {
      this.favorites.push(input);
    }

    return input;
  }

  removeFavorite(userId: string, listingId: string): boolean {
    const before = this.favorites.length;
    this.favorites = this.favorites.filter(
      (item) => !(item.userId === userId && item.listingId === listingId),
    );
    return this.favorites.length < before;
  }

  listFavoritesByUser(userId: string): Favorite[] {
    return this.favorites.filter((item) => item.userId === userId);
  }

  addContactEvent(input: Omit<ListingContactEvent, "createdAt">): ListingContactEvent {
    const event: ListingContactEvent = {
      ...input,
      createdAt: nowIso(),
    };
    this.contactEvents.push(event);
    return event;
  }

  listContactEventsByListingSince(listingId: string, sinceIso: string): ListingContactEvent[] {
    return this.contactEvents.filter(
      (event) => event.listingId === listingId && event.createdAt >= sinceIso,
    );
  }

  listFeaturedPackages(): FeaturedPackage[] {
    return [...this.featuredPackages];
  }

  getFeaturedPackageByCode(code: string): FeaturedPackage | null {
    return this.featuredPackages.find((pkg) => normalize(pkg.code) === normalize(code)) ?? null;
  }

  createPaymentTransaction(input: Omit<PaymentTransaction, "createdAt" | "paidAt">): PaymentTransaction {
    const transaction: PaymentTransaction = {
      ...input,
      createdAt: nowIso(),
      paidAt: null,
    };
    this.paymentTransactions.set(transaction.reference, transaction);
    return transaction;
  }

  getPaymentByReference(reference: string): PaymentTransaction | null {
    return this.paymentTransactions.get(reference) ?? null;
  }

  getPaymentByWebhookEventId(webhookEventId: string): PaymentTransaction | null {
    return (
      [...this.paymentTransactions.values()].find((item) => item.webhookEventId === webhookEventId) ??
      null
    );
  }

  markPaymentPaid(input: {
    reference: string;
    webhookEventId: string;
    providerTransactionId?: string;
    paidAt: string;
  }): PaymentTransaction | null {
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

  addNotification(input: Omit<Notification, "createdAt" | "readAt">): Notification {
    const notification: Notification = {
      ...input,
      createdAt: nowIso(),
      readAt: null,
    };

    this.notifications.push(notification);
    return notification;
  }

  listNotificationsByUser(userId: string): Notification[] {
    return this.notifications.filter((item) => item.userId === userId);
  }

  addAuditLog(input: Omit<AuditLog, "createdAt">): AuditLog {
    const log: AuditLog = {
      ...input,
      createdAt: nowIso(),
    };

    this.auditLogs.push(log);
    return log;
  }

  listAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }
}
