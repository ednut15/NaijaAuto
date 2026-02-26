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
  seedLocations(locations: Location[]): void;
  listLocations(): Location[];
  getLocation(state: string, city: string): Location | null;

  upsertUser(input: {
    id: string;
    role: UserRole;
    sellerType?: SellerType;
    phoneVerified?: boolean;
    email?: string;
    phone?: string;
  }): AppUser;
  getUserById(id: string): AppUser | null;
  markPhoneVerified(userId: string, phone: string): AppUser;

  createOtp(input: {
    userId: string;
    phone: string;
    codeHash: string;
    expiresAt: string;
    maxAttempts: number;
  }): OtpVerification;
  getLatestOtp(userId: string, phone: string): OtpVerification | null;
  incrementOtpAttempts(otpId: string): OtpVerification | null;
  markOtpVerified(otpId: string): OtpVerification | null;

  createListing(input: Omit<Listing, "createdAt" | "updatedAt">): Listing;
  updateListing(id: string, patch: Partial<Listing>): Listing | null;
  getListingById(id: string): Listing | null;
  getListingBySlug(slug: string): Listing | null;
  listSellerListings(sellerId: string): Listing[];
  searchListings(input: SearchListingsInput): SearchResult;
  allListings(): Listing[];

  hasDuplicateVin(vin: string, excludeListingId?: string): boolean;
  detectDuplicateImageHashes(imageHashes: string[], excludeListingId?: string): DuplicateImageSignal;

  addModerationReview(input: Omit<ModerationReview, "createdAt">): ModerationReview;
  getModerationQueue(): Listing[];

  addFavorite(input: Favorite): Favorite;
  removeFavorite(userId: string, listingId: string): boolean;
  listFavoritesByUser(userId: string): Favorite[];

  addContactEvent(input: Omit<ListingContactEvent, "createdAt">): ListingContactEvent;
  listContactEventsByListingSince(listingId: string, sinceIso: string): ListingContactEvent[];

  listFeaturedPackages(): FeaturedPackage[];
  getFeaturedPackageByCode(code: string): FeaturedPackage | null;

  createPaymentTransaction(input: Omit<PaymentTransaction, "createdAt" | "paidAt">): PaymentTransaction;
  getPaymentByReference(reference: string): PaymentTransaction | null;
  getPaymentByWebhookEventId(webhookEventId: string): PaymentTransaction | null;
  markPaymentPaid(input: {
    reference: string;
    webhookEventId: string;
    providerTransactionId?: string;
    paidAt: string;
  }): PaymentTransaction | null;

  addNotification(input: Omit<Notification, "createdAt" | "readAt">): Notification;
  listNotificationsByUser(userId: string): Notification[];

  addAuditLog(input: Omit<AuditLog, "createdAt">): AuditLog;
  listAuditLogs(): AuditLog[];
}
