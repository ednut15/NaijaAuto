export type UserRole = "buyer" | "seller" | "moderator" | "super_admin";

export type SellerType = "dealer" | "private";

export type ListingStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "archived"
  | "sold";

export type FuelType = "petrol" | "diesel" | "hybrid" | "electric";

export type Transmission = "automatic" | "manual";

export type BodyType = "car" | "suv" | "pickup";

export type ContactChannel = "phone" | "whatsapp";

export interface Listing {
  id: string;
  sellerId: string;
  sellerType: SellerType;
  status: ListingStatus;
  title: string;
  description: string;
  priceNgn: number;
  year: number;
  make: string;
  model: string;
  bodyType: BodyType;
  mileageKm: number;
  transmission: Transmission;
  fuelType: FuelType;
  vin: string;
  state: string;
  city: string;
  lat: number;
  lng: number;
  photos: string[];
  isFeatured: boolean;
  featuredUntil: string | null;
  approvedAt: string | null;
  slug: string;
  contactPhone: string;
  contactWhatsapp: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppUser {
  id: string;
  role: UserRole;
  sellerType?: SellerType;
  email?: string;
  phone?: string;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ModerationReview {
  id: string;
  listingId: string;
  moderatorId: string;
  action: "approve" | "reject";
  reason?: string;
  createdAt: string;
}

export interface FeaturedPackage {
  id: string;
  code: string;
  name: string;
  durationDays: number;
  amountNgn: number;
  createdAt: string;
}

export interface PaymentTransaction {
  id: string;
  listingId: string;
  sellerId: string;
  packageCode: string;
  amountNgn: number;
  provider: "paystack";
  reference: string;
  status: "initiated" | "paid" | "failed";
  webhookEventId: string | null;
  providerTransactionId: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface OtpVerification {
  id: string;
  userId: string;
  phone: string;
  codeHash: string;
  expiresAt: string;
  attempts: number;
  maxAttempts: number;
  verifiedAt: string | null;
  createdAt: string;
}

export interface Favorite {
  userId: string;
  listingId: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface ListingContactEvent {
  id: string;
  listingId: string;
  channel: ContactChannel;
  userId: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorUserId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface Location {
  state: string;
  city: string;
  lat: number;
  lng: number;
}

export interface SearchListingsInput {
  query?: string;
  make?: string;
  model?: string;
  state?: string;
  city?: string;
  minPriceNgn?: number;
  maxPriceNgn?: number;
  minYear?: number;
  maxYear?: number;
  bodyType?: BodyType;
  page: number;
  pageSize: number;
}
