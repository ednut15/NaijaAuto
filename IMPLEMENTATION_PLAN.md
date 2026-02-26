# Nigeria AutoTrader MVP Plan (Responsive Web PWA, 8-10 Weeks)

## Summary
Build a Nigeria-first car marketplace where dealers and private sellers post listings, and buyers discover cars then contact sellers by phone or WhatsApp.
MVP focuses on trust (phone verification + manual moderation), monetization (paid featured listings via Paystack), and SEO-led growth.

Success criteria for MVP launch:
1. Users can create, moderate, publish, and manage listings end-to-end.
2. Every approved listing has at least 15 photos and a VIN.
3. Moderation operations can consistently hit a 2-hour SLA.
4. Featured listing payments activate placement automatically after Paystack webhook confirmation.
5. SEO pages are crawlable and indexed (listings + city/category landing pages).

## Product Scope

In scope:
1. Roles: Guest, Buyer, Seller (Dealer or Private), Moderator, Super Admin.
2. Inventory: Cars, SUVs, Pickups.
3. Geography: Nigeria, with launch focus on major cities (Lagos, Abuja, Port Harcourt, Kano).
4. Buyer features: Search, filters, map pins, listing detail, favorites.
5. Seller features: Manual listing creation/edit, media upload, listing status tracking.
6. Contact flow: Phone call and WhatsApp click-through.
7. Verification: Phone OTP plus account auth with phone OTP + email/password.
8. Monetization: Paid featured listing boosts.
9. Notifications: Email + in-app.
10. Analytics: PostHog + GA4.
11. SEO: High SEO implementation for listing and location/category pages.

Out of scope for MVP:
1. In-app chat.
2. Escrow/full checkout.
3. Vehicle financing.
4. Multi-country support.
5. Native iOS/Android apps.

## Architecture and Platform

1. Frontend and backend: Next.js (App Router) + TypeScript on Vercel.
2. Database and storage: Supabase PostgreSQL + Supabase Storage.
3. Auth:
- Email/password via Supabase Auth.
- Phone OTP via custom OTP service (Termii) with verification records in Postgres.
- Account access requires verified phone state.
4. Payments: Paystack inline payment + webhook verification endpoint.
5. Maps: Google Maps Places + Geocoding for map pins and location normalization.
6. Notifications:
- Email provider: Resend.
- In-app notifications stored in `notifications` table and shown in dashboard.
7. Observability:
- Sentry for error tracking.
- PostHog for product analytics.
- GA4 for acquisition and traffic analytics.
8. Search strategy:
- PostgreSQL full-text + indexed filters for MVP.
- No external search engine in first release.

## Public APIs, Interfaces, and Types

New REST endpoints:
1. `POST /api/auth/phone/send-otp`
2. `POST /api/auth/phone/verify-otp`
3. `POST /api/listings`
4. `PATCH /api/listings/:id`
5. `GET /api/listings` (public search with filters)
6. `GET /api/listings/:slug`
7. `POST /api/listings/:id/submit` (submit for moderation)
8. `POST /api/listings/:id/contact-click` (phone/WhatsApp analytics)
9. `POST /api/favorites/:listingId`
10. `DELETE /api/favorites/:listingId`
11. `POST /api/featured/checkout` (init Paystack transaction)
12. `POST /api/payments/paystack/webhook`
13. `POST /api/moderation/listings/:id/approve`
14. `POST /api/moderation/listings/:id/reject`
15. `GET /api/admin/moderation-queue`

Core TypeScript contracts:
```ts
type UserRole = "buyer" | "seller" | "moderator" | "super_admin";
type SellerType = "dealer" | "private";
type ListingStatus = "draft" | "pending_review" | "approved" | "rejected" | "archived" | "sold";
type FuelType = "petrol" | "diesel" | "hybrid" | "electric";
type Transmission = "automatic" | "manual";

interface Listing {
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
  bodyType: "car" | "suv" | "pickup";
  mileageKm: number;
  transmission: Transmission;
  fuelType: FuelType;
  vin: string; // required
  state: string;
  city: string;
  lat: number;
  lng: number;
  photos: string[]; // min 15
  isFeatured: boolean;
  featuredUntil: string | null;
  approvedAt: string | null;
  createdAt: string;
}
```

DB tables to create:
1. `users`
2. `seller_profiles`
3. `dealer_profiles`
4. `listings`
5. `listing_photos`
6. `favorites`
7. `listing_contact_events`
8. `moderation_reviews`
9. `featured_packages`
10. `payment_transactions`
11. `notifications`
12. `otp_verifications`
13. `audit_logs`
14. `locations` (state/city canonical data)

## Core Workflows

1. Seller onboarding:
- Register/login with email/password.
- Verify phone by OTP.
- Complete seller profile (dealer or private).
- Start creating listing drafts.

2. Listing publish:
- Seller uploads at least 15 photos and VIN.
- Listing submitted enters `pending_review`.
- Moderator approves/rejects with reason.
- Approved listing becomes public and indexable.

3. Buyer discovery:
- Filter by make/model/year/price/body type/location.
- Browse map pins and list view.
- Save favorites.
- Click phone/WhatsApp tracked as lead event.

4. Featured listing payment:
- Seller selects feature package.
- Paystack checkout initiated.
- Webhook validates payment status and signature.
- Listing receives `isFeatured=true` with `featuredUntil`.
- Placement updates instantly in search ordering.

5. Admin operations:
- Moderation queue sorted by SLA risk.
- Fraud flags and audit logs visible to moderators/super admin.
- Super admin manages package pricing and moderation policies.

## Security, Trust, and Abuse Controls

1. Enforce phone verification before listing submission.
2. Require VIN and 15-photo minimum at API validation layer.
3. Rate limit auth, listing submit, and contact-click endpoints.
4. Validate Paystack webhook signatures and enforce idempotency keys.
5. Sanitize uploads and enforce file type/size limits.
6. Keep immutable moderation and payment audit logs.
7. Add automated checks:
- Duplicate VIN detection.
- Duplicate image hash detection.
- Excessive reposting or suspicious contact patterns.

## Testing and Acceptance Criteria

Unit tests:
1. Listing validation rules (VIN required, 15-photo minimum, valid NGN price).
2. Search query parser and filter combinator logic.
3. Paystack webhook verification and idempotency handler.
4. Ranking logic (featured precedence + relevance + freshness).

Integration tests:
1. Seller creates listing draft and submits for moderation.
2. Moderator approval publishes listing and makes it searchable.
3. Favorite add/remove behavior per user.
4. Featured purchase activates listing after webhook callback.
5. OTP lifecycle: send, verify, expiry, retry limits.

E2E tests (Playwright):
1. Buyer searches by city and price, opens listing, clicks WhatsApp.
2. Seller signs up, verifies phone, posts compliant listing, sees pending status.
3. Moderator approves listing and sees it live on public page.
4. Seller buys featured package and listing moves to featured slots.

Performance and SEO checks:
1. Public listing page LCP under 2.5s on 4G baseline.
2. XML sitemap generation for listings and city/category pages.
3. Schema.org Vehicle markup present on listing detail pages.
4. Correct canonical URLs and meta tags on search and listing pages.

## Delivery Plan (8-10 Weeks)

1. Week 1-2: Foundation
- Project scaffold, CI, environments, Supabase schema, auth baseline, role model.

2. Week 3-4: Seller and Listing Core
- Seller dashboard, listing CRUD, media uploads, validation, submit flow.

3. Week 5: Moderation and Admin
- Moderator queue, approve/reject workflow, audit logs, notification hooks.

4. Week 6-7: Buyer Experience and SEO
- Public search/filter pages, map pins, favorites, listing detail pages, metadata, sitemap.

5. Week 8: Payments and Ranking
- Featured packages, Paystack checkout + webhooks, featured ranking.

6. Week 9: Analytics, Hardening, SLA Ops
- PostHog/GA4 events, Sentry, rate limits, abuse checks, moderation SLA dashboard.

7. Week 10: Launch Readiness
- Full regression, load sanity checks, seed content, runbooks, production rollout.

## Assumptions and Defaults Chosen

1. Marketplace is lead-generation only; sales close offline.
2. English-only UI and NGN currency for MVP.
3. Phone OTP uses Termii; email/password uses Supabase Auth.
4. Map experience uses Google Maps APIs.
5. Moderation team coverage is staffed to meet a 2-hour SLA.
6. Dealer bulk CSV import is deferred until post-MVP.
7. No in-app chat in MVP; phone and WhatsApp are the only contact channels.
