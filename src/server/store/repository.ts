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

export interface SearchResult {
  items: Listing[];
  total: number;
}

export interface DuplicateImageSignal {
  overlapCount: number;
  existingListingIds: string[];
}

export interface Repository {
  seedLocations(locations: Location[]): Promise<void>;
  listLocations(): Promise<Location[]>;
  getLocation(state: string, city: string): Promise<Location | null>;

  upsertUser(input: {
    id: string;
    role: UserRole;
    sellerType?: SellerType;
    phoneVerified?: boolean;
    email?: string;
    phone?: string;
  }): Promise<AppUser>;
  getUserById(id: string): Promise<AppUser | null>;
  markPhoneVerified(userId: string, phone: string): Promise<AppUser>;
  getSellerProfileByUserId(userId: string): Promise<SellerProfile | null>;
  upsertSellerProfile(input: {
    userId: string;
    fullName: string;
    state?: string | null;
    city?: string | null;
    bio?: string | null;
  }): Promise<SellerProfile>;
  getDealerProfileByUserId(userId: string): Promise<DealerProfile | null>;
  upsertDealerProfile(input: {
    userId: string;
    businessName: string;
    cacNumber?: string | null;
    address?: string | null;
    verified?: boolean;
  }): Promise<DealerProfile>;
  deleteDealerProfile(userId: string): Promise<void>;

  createOtp(input: {
    userId: string;
    phone: string;
    codeHash: string;
    expiresAt: string;
    maxAttempts: number;
  }): Promise<OtpVerification>;
  getLatestOtp(userId: string, phone: string): Promise<OtpVerification | null>;
  incrementOtpAttempts(otpId: string): Promise<OtpVerification | null>;
  markOtpVerified(otpId: string): Promise<OtpVerification | null>;

  createListing(input: Omit<Listing, "createdAt" | "updatedAt">): Promise<Listing>;
  updateListing(id: string, patch: Partial<Listing>): Promise<Listing | null>;
  getListingById(id: string): Promise<Listing | null>;
  getListingBySlug(slug: string): Promise<Listing | null>;
  listSellerListings(sellerId: string): Promise<Listing[]>;
  searchListings(input: SearchListingsInput): Promise<SearchResult>;
  allListings(): Promise<Listing[]>;

  hasDuplicateVin(vin: string, excludeListingId?: string): Promise<boolean>;
  detectDuplicateImageHashes(
    imageHashes: string[],
    excludeListingId?: string,
  ): Promise<DuplicateImageSignal>;

  addModerationReview(input: Omit<ModerationReview, "createdAt">): Promise<ModerationReview>;
  getModerationQueue(): Promise<Listing[]>;
  listModerationReviewsSince(sinceIso: string): Promise<ModerationReview[]>;

  addFavorite(input: Favorite): Promise<Favorite>;
  removeFavorite(userId: string, listingId: string): Promise<boolean>;
  listFavoritesByUser(userId: string): Promise<Favorite[]>;

  addContactEvent(input: Omit<ListingContactEvent, "createdAt">): Promise<ListingContactEvent>;
  listContactEventsByListingSince(
    listingId: string,
    sinceIso: string,
  ): Promise<ListingContactEvent[]>;

  listFeaturedPackages(): Promise<FeaturedPackage[]>;
  getFeaturedPackageByCode(code: string): Promise<FeaturedPackage | null>;

  createPaymentTransaction(
    input: Omit<PaymentTransaction, "createdAt" | "paidAt">,
  ): Promise<PaymentTransaction>;
  getPaymentByReference(reference: string): Promise<PaymentTransaction | null>;
  getPaymentByWebhookEventId(webhookEventId: string): Promise<PaymentTransaction | null>;
  markPaymentPaid(input: {
    reference: string;
    webhookEventId: string;
    providerTransactionId?: string;
    paidAt: string;
  }): Promise<PaymentTransaction | null>;

  addNotification(input: Omit<Notification, "createdAt" | "readAt">): Promise<Notification>;
  listNotificationsByUser(userId: string): Promise<Notification[]>;

  addAuditLog(input: Omit<AuditLog, "createdAt">): Promise<AuditLog>;
  listAuditLogs(): Promise<AuditLog[]>;
}
