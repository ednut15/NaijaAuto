import crypto from "node:crypto";

import type { NextRequest } from "next/server";

import {
  contactClickSchema,
  createListingSchema,
  featuredCheckoutSchema,
  listingSearchSchema,
  moderationDecisionSchema,
  sendOtpSchema,
  updateListingSchema,
  verifyOtpSchema,
} from "@/lib/validation/listing";
import type {
  ContactChannel,
  Listing,
  SearchListingsInput,
  UserRole,
} from "@/types/domain";

import type { RequestUser } from "@/lib/auth";

import { env, isProduction } from "@/lib/env";
import { ApiError, requestIp } from "@/lib/http";
import { rankListings } from "@/server/search/ranking";
import type { Repository } from "@/server/store/repository";
import { createSlug, generateSixDigitOtp, sha256, timingSafeEqualHex } from "@/lib/security";
import { Mailer } from "@/server/integrations/mailer";
import { PaystackClient, type PaystackWebhookPayload } from "@/server/integrations/paystack";
import { TermiiClient } from "@/server/integrations/termii";

const SUBMIT_MIN_PHOTOS = 15;

function nowIso(): string {
  return new Date().toISOString();
}

function toImageHash(url: string): string {
  return sha256(url.trim().toLowerCase());
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function assertRole(user: RequestUser, allowed: UserRole[]): void {
  if (!allowed.includes(user.role)) {
    throw new ApiError(403, "You do not have permission for this action.");
  }
}

export class MarketplaceService {
  constructor(
    private readonly repo: Repository,
    private readonly termii: TermiiClient,
    private readonly paystack: PaystackClient,
    private readonly mailer: Mailer,
  ) {}

  upsertActor(user: RequestUser): void {
    this.repo.upsertUser({
      id: user.id,
      role: user.role,
      sellerType: user.sellerType,
      phoneVerified: user.phoneVerified,
      email: user.email,
    });
  }

  async sendPhoneOtp(user: RequestUser, payload: unknown): Promise<{ phone: string; messageId: string; debugCode?: string }> {
    this.upsertActor(user);

    const parsed = sendOtpSchema.safeParse(payload);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid phone payload.");
    }

    const code = generateSixDigitOtp();
    const codeHash = sha256(code);
    const expiryMs = Date.now() + 10 * 60 * 1000;

    const otp = this.repo.createOtp({
      userId: user.id,
      phone: parsed.data.phone,
      codeHash,
      expiresAt: new Date(expiryMs).toISOString(),
      maxAttempts: 5,
    });

    const sendResult = await this.termii.sendOtp(parsed.data.phone, code);

    this.repo.addAuditLog({
      id: crypto.randomUUID(),
      actorUserId: user.id,
      entityType: "otp_verifications",
      entityId: otp.id,
      action: "phone_otp_sent",
      metadata: {
        phone: parsed.data.phone,
        mockedProvider: sendResult.mocked,
      },
    });

    return {
      phone: parsed.data.phone,
      messageId: sendResult.messageId,
      debugCode: isProduction ? undefined : code,
    };
  }

  verifyPhoneOtp(user: RequestUser, payload: unknown): { verified: true; phone: string } {
    this.upsertActor(user);

    const parsed = verifyOtpSchema.safeParse(payload);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid verify OTP payload.");
    }

    const otp = this.repo.getLatestOtp(user.id, parsed.data.phone);
    if (!otp) {
      throw new ApiError(404, "OTP request was not found for this phone number.");
    }

    if (otp.verifiedAt) {
      return {
        verified: true,
        phone: otp.phone,
      };
    }

    if (new Date(otp.expiresAt).getTime() < Date.now()) {
      throw new ApiError(400, "OTP has expired. Please request a new code.");
    }

    if (otp.attempts >= otp.maxAttempts) {
      throw new ApiError(429, "Too many OTP attempts. Request a new code.");
    }

    const providedHash = sha256(parsed.data.code);
    const isValid = timingSafeEqualHex(otp.codeHash, providedHash);
    if (!isValid) {
      this.repo.incrementOtpAttempts(otp.id);
      throw new ApiError(400, "Invalid OTP code.");
    }

    this.repo.markOtpVerified(otp.id);
    this.repo.markPhoneVerified(user.id, parsed.data.phone);

    this.repo.addAuditLog({
      id: crypto.randomUUID(),
      actorUserId: user.id,
      entityType: "users",
      entityId: user.id,
      action: "phone_verified",
      metadata: {
        phone: parsed.data.phone,
      },
    });

    return {
      verified: true,
      phone: parsed.data.phone,
    };
  }

  createListing(user: RequestUser, payload: unknown): Listing {
    assertRole(user, ["seller"]);
    this.upsertActor(user);

    if (!user.phoneVerified) {
      throw new ApiError(403, "Verify phone number before creating listings.");
    }

    const parsed = createListingSchema.safeParse(payload);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid listing payload.");
    }

    const input = parsed.data;

    if (this.repo.hasDuplicateVin(input.vin)) {
      throw new ApiError(409, "A live listing with this VIN already exists.");
    }

    const duplicateImageSignal = this.repo.detectDuplicateImageHashes(
      input.photos.map(toImageHash),
    );

    const slug = this.createUniqueSlug(input.make, input.model, input.city, input.year);
    const listing = this.repo.createListing({
      id: crypto.randomUUID(),
      sellerId: user.id,
      sellerType: user.sellerType ?? "private",
      status: "draft",
      title: input.title,
      description: input.description,
      priceNgn: input.priceNgn,
      year: input.year,
      make: input.make,
      model: input.model,
      bodyType: input.bodyType,
      mileageKm: input.mileageKm,
      transmission: input.transmission,
      fuelType: input.fuelType,
      vin: input.vin,
      state: input.state,
      city: input.city,
      lat: input.lat,
      lng: input.lng,
      photos: input.photos,
      isFeatured: false,
      featuredUntil: null,
      approvedAt: null,
      slug,
      contactPhone: input.contactPhone,
      contactWhatsapp: input.contactWhatsapp,
    });

    this.repo.addAuditLog({
      id: crypto.randomUUID(),
      actorUserId: user.id,
      entityType: "listings",
      entityId: listing.id,
      action: "listing_created",
      metadata: {
        duplicateImageOverlap: duplicateImageSignal.overlapCount,
      },
    });

    return listing;
  }

  updateListing(user: RequestUser, listingId: string, payload: unknown): Listing {
    assertRole(user, ["seller"]);
    this.upsertActor(user);

    const listing = this.repo.getListingById(listingId);
    if (!listing) {
      throw new ApiError(404, "Listing not found.");
    }

    if (listing.sellerId !== user.id) {
      throw new ApiError(403, "You can only edit your own listings.");
    }

    if (listing.status === "approved") {
      throw new ApiError(409, "Approved listings cannot be edited directly. Duplicate and resubmit.");
    }

    const parsed = updateListingSchema.safeParse(payload);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid listing update payload.");
    }

    const input = parsed.data;

    if (input.vin && this.repo.hasDuplicateVin(input.vin, listing.id)) {
      throw new ApiError(409, "A live listing with this VIN already exists.");
    }

    if (input.photos) {
      const duplicateImageSignal = this.repo.detectDuplicateImageHashes(
        input.photos.map(toImageHash),
        listing.id,
      );
      if (duplicateImageSignal.overlapCount >= 8) {
        throw new ApiError(
          409,
          "Photos appear duplicated from existing listings. Use original vehicle photos.",
        );
      }
    }

    const nextSlug =
      input.make || input.model || input.city || input.year
        ? this.createUniqueSlug(
            input.make ?? listing.make,
            input.model ?? listing.model,
            input.city ?? listing.city,
            input.year ?? listing.year,
            listing.id,
          )
        : listing.slug;

    const updated = this.repo.updateListing(listing.id, {
      ...input,
      slug: nextSlug,
      status: listing.status === "rejected" ? "draft" : listing.status,
    });

    if (!updated) {
      throw new ApiError(500, "Unable to update listing.");
    }

    this.repo.addAuditLog({
      id: crypto.randomUUID(),
      actorUserId: user.id,
      entityType: "listings",
      entityId: listing.id,
      action: "listing_updated",
      metadata: {
        fields: Object.keys(input),
      },
    });

    return updated;
  }

  submitListing(user: RequestUser, listingId: string): Listing {
    assertRole(user, ["seller"]);
    this.upsertActor(user);

    if (!user.phoneVerified) {
      throw new ApiError(403, "Phone verification is required before submission.");
    }

    const listing = this.repo.getListingById(listingId);
    if (!listing) {
      throw new ApiError(404, "Listing not found.");
    }

    if (listing.sellerId !== user.id) {
      throw new ApiError(403, "You can only submit your own listings.");
    }

    if (!listing.vin || listing.vin.trim().length !== 17) {
      throw new ApiError(400, "VIN is required before submission.");
    }

    if (listing.photos.length < SUBMIT_MIN_PHOTOS) {
      throw new ApiError(400, `At least ${SUBMIT_MIN_PHOTOS} photos are required before submission.`);
    }

    if (this.repo.hasDuplicateVin(listing.vin, listing.id)) {
      throw new ApiError(409, "A live listing with this VIN already exists.");
    }

    const duplicateImages = this.repo.detectDuplicateImageHashes(
      listing.photos.map(toImageHash),
      listing.id,
    );

    if (duplicateImages.overlapCount >= 8) {
      throw new ApiError(409, "Too many duplicate images detected with existing listings.");
    }

    const updated = this.repo.updateListing(listing.id, {
      status: "pending_review",
    });

    if (!updated) {
      throw new ApiError(500, "Unable to submit listing.");
    }

    this.repo.addAuditLog({
      id: crypto.randomUUID(),
      actorUserId: user.id,
      entityType: "listings",
      entityId: listing.id,
      action: "listing_submitted",
      metadata: {
        duplicateImageOverlap: duplicateImages.overlapCount,
      },
    });

    return updated;
  }

  searchListings(input: unknown): {
    items: Listing[];
    total: number;
    page: number;
    pageSize: number;
  } {
    const parsed = listingSearchSchema.safeParse(input);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid listing search params.");
    }

    const filters = parsed.data;
    const approved = this.repo.allListings().filter((item) => item.status === "approved");

    const filtered = this.applyListingFilters(approved, filters);
    const ranked = rankListings(filtered, filters.query);

    const offset = (filters.page - 1) * filters.pageSize;
    const items = ranked.slice(offset, offset + filters.pageSize);

    return {
      items,
      total: ranked.length,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }

  getPublicListing(identifier: string): Listing {
    const listing = this.resolveListing(identifier);
    if (!listing || listing.status !== "approved") {
      throw new ApiError(404, "Listing not found.");
    }
    return listing;
  }

  trackContactClick(
    request: NextRequest,
    user: RequestUser | null,
    identifier: string,
    payload: unknown,
  ): { tracked: true; channel: ContactChannel } {
    const parsed = contactClickSchema.safeParse(payload);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid contact tracking payload.");
    }

    const listing = this.getPublicListing(identifier);
    const channel = parsed.data.channel;

    this.repo.addContactEvent({
      id: crypto.randomUUID(),
      listingId: listing.id,
      channel,
      userId: user?.id ?? null,
      ip: requestIp(request),
      userAgent: request.headers.get("user-agent"),
    });

    this.repo.addAuditLog({
      id: crypto.randomUUID(),
      actorUserId: user?.id ?? null,
      entityType: "listings",
      entityId: listing.id,
      action: `contact_click_${channel}`,
      metadata: {
        ip: requestIp(request),
      },
    });

    return {
      tracked: true,
      channel,
    };
  }

  addFavorite(user: RequestUser, listingId: string): { saved: true } {
    this.upsertActor(user);

    const listing = this.repo.getListingById(listingId);
    if (!listing || listing.status !== "approved") {
      throw new ApiError(404, "Listing not found.");
    }

    this.repo.addFavorite({
      userId: user.id,
      listingId,
      createdAt: nowIso(),
    });

    return { saved: true };
  }

  removeFavorite(user: RequestUser, listingId: string): { removed: boolean } {
    this.upsertActor(user);

    return {
      removed: this.repo.removeFavorite(user.id, listingId),
    };
  }

  async createFeaturedCheckout(user: RequestUser, payload: unknown): Promise<{
    checkoutUrl: string;
    accessCode: string;
    reference: string;
    amountNgn: number;
  }> {
    assertRole(user, ["seller"]);
    this.upsertActor(user);

    const parsed = featuredCheckoutSchema.safeParse(payload);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid featured checkout payload.");
    }

    const listing = this.repo.getListingById(parsed.data.listingId);
    if (!listing) {
      throw new ApiError(404, "Listing not found.");
    }

    if (listing.sellerId !== user.id) {
      throw new ApiError(403, "You can only feature your own listing.");
    }

    if (listing.status !== "approved") {
      throw new ApiError(409, "Only approved listings can be featured.");
    }

    const featurePackage = this.repo.getFeaturedPackageByCode(parsed.data.packageCode);
    if (!featurePackage) {
      throw new ApiError(404, "Featured package not found.");
    }

    const reference = `naija_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const callbackUrl = `${env.NEXT_PUBLIC_APP_URL}/seller/dashboard?reference=${reference}`;

    const transaction = this.repo.createPaymentTransaction({
      id: crypto.randomUUID(),
      listingId: listing.id,
      sellerId: user.id,
      packageCode: featurePackage.code,
      amountNgn: featurePackage.amountNgn,
      provider: "paystack",
      reference,
      status: "initiated",
      webhookEventId: null,
      providerTransactionId: null,
    });

    const initialized = await this.paystack.initializeTransaction({
      email: user.email ?? `seller-${user.id}@naijaauto.local`,
      amountKobo: featurePackage.amountNgn * 100,
      reference,
      callbackUrl,
      metadata: {
        listingId: listing.id,
        packageCode: featurePackage.code,
      },
    });

    this.repo.addAuditLog({
      id: crypto.randomUUID(),
      actorUserId: user.id,
      entityType: "payment_transactions",
      entityId: transaction.id,
      action: "featured_checkout_initialized",
      metadata: {
        reference,
        mockedProvider: initialized.mocked,
      },
    });

    return {
      checkoutUrl: initialized.authorizationUrl,
      accessCode: initialized.accessCode,
      reference: initialized.reference,
      amountNgn: featurePackage.amountNgn,
    };
  }

  async handlePaystackWebhook(
    rawBody: string,
    signature: string | null,
  ): Promise<{ processed: boolean; duplicate: boolean }> {
    if (!this.paystack.verifyWebhookSignature(rawBody, signature)) {
      throw new ApiError(401, "Invalid webhook signature.");
    }

    const payload = JSON.parse(rawBody) as PaystackWebhookPayload;
    const eventId = String(payload.data.id);

    const duplicate = this.repo.getPaymentByWebhookEventId(eventId);
    if (duplicate) {
      return {
        processed: true,
        duplicate: true,
      };
    }

    if (payload.event !== "charge.success" || payload.data.status !== "success") {
      return {
        processed: true,
        duplicate: false,
      };
    }

    const transaction = this.repo.getPaymentByReference(payload.data.reference);
    if (!transaction) {
      throw new ApiError(404, "Payment transaction not found.");
    }

    const updatedTransaction = this.repo.markPaymentPaid({
      reference: payload.data.reference,
      webhookEventId: eventId,
      providerTransactionId: String(payload.data.id),
      paidAt: nowIso(),
    });

    if (!updatedTransaction) {
      throw new ApiError(500, "Unable to finalize payment.");
    }

    const listing = this.repo.getListingById(updatedTransaction.listingId);
    const featurePackage = this.repo.getFeaturedPackageByCode(updatedTransaction.packageCode);

    if (listing && featurePackage) {
      const start = listing.featuredUntil && new Date(listing.featuredUntil).getTime() > Date.now()
        ? new Date(listing.featuredUntil).getTime()
        : Date.now();
      const nextFeaturedUntil = new Date(start + featurePackage.durationDays * 24 * 60 * 60 * 1000).toISOString();

      this.repo.updateListing(listing.id, {
        isFeatured: true,
        featuredUntil: nextFeaturedUntil,
      });
    }

    this.repo.addNotification({
      id: crypto.randomUUID(),
      userId: updatedTransaction.sellerId,
      title: "Featured listing activated",
      body: `Your listing has been boosted for ${featurePackage?.durationDays ?? 0} days.`,
    });

    const user = this.repo.getUserById(updatedTransaction.sellerId);
    if (user?.email) {
      await this.mailer.send({
        to: user.email,
        subject: "NaijaAuto Featured Listing Activated",
        html: `<p>Your featured listing payment has been confirmed for reference <b>${updatedTransaction.reference}</b>.</p>`,
      });
    }

    this.repo.addAuditLog({
      id: crypto.randomUUID(),
      actorUserId: null,
      entityType: "payment_transactions",
      entityId: updatedTransaction.id,
      action: "paystack_charge_success",
      metadata: {
        reference: updatedTransaction.reference,
      },
    });

    return {
      processed: true,
      duplicate: false,
    };
  }

  approveListing(moderator: RequestUser, listingId: string, payload: unknown): Listing {
    assertRole(moderator, ["moderator", "super_admin"]);
    this.upsertActor(moderator);

    const parsed = moderationDecisionSchema.safeParse(payload);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid moderation payload.");
    }

    const listing = this.repo.getListingById(listingId);
    if (!listing) {
      throw new ApiError(404, "Listing not found.");
    }

    if (listing.status !== "pending_review") {
      throw new ApiError(409, "Listing is not awaiting moderation.");
    }

    const updated = this.repo.updateListing(listing.id, {
      status: "approved",
      approvedAt: nowIso(),
    });

    if (!updated) {
      throw new ApiError(500, "Unable to approve listing.");
    }

    this.repo.addModerationReview({
      id: crypto.randomUUID(),
      listingId: listing.id,
      moderatorId: moderator.id,
      action: "approve",
      reason: parsed.data.reason,
    });

    this.repo.addNotification({
      id: crypto.randomUUID(),
      userId: listing.sellerId,
      title: "Listing approved",
      body: `${listing.title} is now live on NaijaAuto.`,
    });

    this.repo.addAuditLog({
      id: crypto.randomUUID(),
      actorUserId: moderator.id,
      entityType: "listings",
      entityId: listing.id,
      action: "listing_approved",
      metadata: {
        reason: parsed.data.reason,
      },
    });

    return updated;
  }

  rejectListing(moderator: RequestUser, listingId: string, payload: unknown): Listing {
    assertRole(moderator, ["moderator", "super_admin"]);
    this.upsertActor(moderator);

    const parsed = moderationDecisionSchema.safeParse(payload);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid moderation payload.");
    }

    if (!parsed.data.reason) {
      throw new ApiError(400, "Rejection reason is required.");
    }

    const listing = this.repo.getListingById(listingId);
    if (!listing) {
      throw new ApiError(404, "Listing not found.");
    }

    if (listing.status !== "pending_review") {
      throw new ApiError(409, "Listing is not awaiting moderation.");
    }

    const updated = this.repo.updateListing(listing.id, {
      status: "rejected",
    });

    if (!updated) {
      throw new ApiError(500, "Unable to reject listing.");
    }

    this.repo.addModerationReview({
      id: crypto.randomUUID(),
      listingId: listing.id,
      moderatorId: moderator.id,
      action: "reject",
      reason: parsed.data.reason,
    });

    this.repo.addNotification({
      id: crypto.randomUUID(),
      userId: listing.sellerId,
      title: "Listing rejected",
      body: `Listing rejected: ${parsed.data.reason}`,
    });

    this.repo.addAuditLog({
      id: crypto.randomUUID(),
      actorUserId: moderator.id,
      entityType: "listings",
      entityId: listing.id,
      action: "listing_rejected",
      metadata: {
        reason: parsed.data.reason,
      },
    });

    return updated;
  }

  getModerationQueue() {
    const pending = this.repo.getModerationQueue();

    return pending.map((listing) => {
      const ageMinutes = Math.max(0, Math.floor((Date.now() - new Date(listing.createdAt).getTime()) / 60000));
      const slaRisk = ageMinutes >= 90 ? "high" : ageMinutes >= 60 ? "medium" : "low";

      return {
        listing,
        ageMinutes,
        slaRisk,
      };
    });
  }

  getSellerDashboard(user: RequestUser): {
    listings: Listing[];
    notifications: ReturnType<Repository["listNotificationsByUser"]>;
    favoritesCount: number;
  } {
    assertRole(user, ["seller"]);
    this.upsertActor(user);

    return {
      listings: this.repo.listSellerListings(user.id),
      notifications: this.repo.listNotificationsByUser(user.id),
      favoritesCount: this.repo.listFavoritesByUser(user.id).length,
    };
  }

  private applyListingFilters(listings: Listing[], filters: SearchListingsInput): Listing[] {
    return listings.filter((item) => {
      if (filters.make && normalize(item.make) !== normalize(filters.make)) {
        return false;
      }

      if (filters.model && normalize(item.model) !== normalize(filters.model)) {
        return false;
      }

      if (filters.state && normalize(item.state) !== normalize(filters.state)) {
        return false;
      }

      if (filters.city && normalize(item.city) !== normalize(filters.city)) {
        return false;
      }

      if (filters.bodyType && item.bodyType !== filters.bodyType) {
        return false;
      }

      if (filters.minPriceNgn !== undefined && item.priceNgn < filters.minPriceNgn) {
        return false;
      }

      if (filters.maxPriceNgn !== undefined && item.priceNgn > filters.maxPriceNgn) {
        return false;
      }

      if (filters.minYear !== undefined && item.year < filters.minYear) {
        return false;
      }

      if (filters.maxYear !== undefined && item.year > filters.maxYear) {
        return false;
      }

      if (filters.query) {
        const query = normalize(filters.query);
        const haystack = `${item.title} ${item.make} ${item.model} ${item.city} ${item.state}`.toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }

  private createUniqueSlug(
    make: string,
    model: string,
    city: string,
    year: number,
    excludeListingId?: string,
  ): string {
    const base = createSlug(`${make}-${model}-${city}-${year}`);
    let slug = base;
    let index = 1;

    while (true) {
      const existing = this.repo.getListingBySlug(slug);
      if (!existing || (excludeListingId && existing.id === excludeListingId)) {
        return slug;
      }

      index += 1;
      slug = `${base}-${index}`;
    }
  }

  private resolveListing(identifier: string): Listing | null {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier)) {
      return this.repo.getListingById(identifier);
    }

    return this.repo.getListingBySlug(identifier);
  }
}
