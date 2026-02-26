import Link from "next/link";

import { ListingCard } from "@/components/listing-card";
import { requireServerUser } from "@/lib/auth";
import { marketplaceService } from "@/server/services/container";
import { saveSellerOnboardingAction } from "@/app/seller/dashboard/actions";
import { SellerListingComposer } from "@/app/seller/dashboard/seller-listing-composer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Seller Dashboard",
  description: "Manage drafts, approvals, and featured listing checkout.",
};

interface SellerDashboardPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getStringParam(value: string | string[] | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return Array.isArray(value) ? value[0] : value;
}

export default async function SellerDashboardPage({ searchParams }: SellerDashboardPageProps) {
  const params = await searchParams;
  const saveSuccess = getStringParam(params.saved) === "1";
  const saveError = getStringParam(params.error);

  let user;
  let accessError: string | null = null;

  try {
    user = await requireServerUser(["seller"]);
  } catch (error) {
    accessError = error instanceof Error ? error.message : "Unable to load seller dashboard.";
  }

  if (!user) {
    return (
      <div className="page-shell">
        <header className="top-nav">
          <Link className="brand-mark" href="/">
            NaijaAuto Marketplace
          </Link>
        </header>

        <section className="section">
          <div className="empty-state">
            <h2 style={{ marginTop: 0 }}>Seller access required</h2>
            <p>{accessError ?? "Sign in with a seller account to continue."}</p>
            <p>
              For local sandbox access, send `x-user-id`, `x-user-role: seller`, and `x-phone-verified` request
              headers.
            </p>
          </div>
        </section>
      </div>
    );
  }

  const [dashboard, onboarding] = await Promise.all([
    marketplaceService.getSellerDashboard(user),
    marketplaceService.getSellerOnboarding(user),
  ]);
  const selectedSellerType = onboarding.user.sellerType ?? "private";

  return (
    <div className="page-shell">
      <header className="top-nav">
        <Link className="brand-mark" href="/">
          NaijaAuto Marketplace
        </Link>
      </header>

      <section className="section-head section">
        <div>
          <h2>Seller Dashboard</h2>
          <p>
            Seller type: <strong>{selectedSellerType}</strong> • Favorites: <strong>{dashboard.favoritesCount}</strong>
          </p>
        </div>
      </section>

      {saveSuccess ? (
        <section className="section">
          <div className="filter-panel">Seller profile saved successfully.</div>
        </section>
      ) : null}

      {saveError ? (
        <section className="section">
          <div className="empty-state">{saveError}</div>
        </section>
      ) : null}

      {!user.phoneVerified ? (
        <section className="section">
          <div className="empty-state">
            Phone verification is required before listing submission. Complete OTP verification from the API flow.
          </div>
        </section>
      ) : null}

      {!onboarding.isComplete ? (
        <section className="section">
          <div className="section-head">
            <div>
              <h3>Complete Seller Profile</h3>
              <p>Missing fields: {onboarding.missingFields.join(", ")}</p>
            </div>
          </div>

          <form action={saveSellerOnboardingAction} className="filter-panel">
            <div className="filter-grid">
              <div>
                <label className="label" htmlFor="sellerType">
                  Seller Type
                </label>
                <select className="select" id="sellerType" name="sellerType" defaultValue={selectedSellerType}>
                  <option value="private">Private</option>
                  <option value="dealer">Dealer</option>
                </select>
              </div>

              <div>
                <label className="label" htmlFor="fullName">
                  Full Name
                </label>
                <input
                  className="input"
                  id="fullName"
                  name="fullName"
                  defaultValue={onboarding.sellerProfile?.fullName ?? ""}
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="state">
                  State
                </label>
                <input
                  className="input"
                  id="state"
                  name="state"
                  defaultValue={onboarding.sellerProfile?.state ?? ""}
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="city">
                  City
                </label>
                <input
                  className="input"
                  id="city"
                  name="city"
                  defaultValue={onboarding.sellerProfile?.city ?? ""}
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="businessName">
                  Business Name
                </label>
                <input
                  className="input"
                  id="businessName"
                  name="businessName"
                  defaultValue={onboarding.dealerProfile?.businessName ?? ""}
                />
              </div>

              <div>
                <label className="label" htmlFor="cacNumber">
                  CAC Number
                </label>
                <input
                  className="input"
                  id="cacNumber"
                  name="cacNumber"
                  defaultValue={onboarding.dealerProfile?.cacNumber ?? ""}
                />
              </div>

              <div>
                <label className="label" htmlFor="address">
                  Business Address
                </label>
                <input
                  className="input"
                  id="address"
                  name="address"
                  defaultValue={onboarding.dealerProfile?.address ?? ""}
                />
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <label className="label" htmlFor="bio">
                Seller Bio
              </label>
              <textarea
                className="input"
                id="bio"
                name="bio"
                defaultValue={onboarding.sellerProfile?.bio ?? ""}
                rows={4}
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <button className="button" type="submit">
                Save Profile
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {onboarding.isComplete && user.phoneVerified ? (
        <SellerListingComposer />
      ) : (
        <section className="section">
          <div className="empty-state">
            Complete seller profile and phone verification to create and submit listings.
          </div>
        </section>
      )}

      <section className="section">
        <h3 style={{ marginBottom: 10 }}>My Listings</h3>
        {dashboard.listings.length ? (
          <div className="card-grid">
            {dashboard.listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="empty-state">You do not have any listing yet.</div>
        )}
      </section>

      <section className="section">
        <h3 style={{ marginBottom: 8 }}>Notifications</h3>
        {dashboard.notifications.length ? (
          <ul className="detail-list">
            {dashboard.notifications.map((note) => (
              <li key={note.id}>
                <strong>{note.title}:</strong> {note.body}
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">No notifications yet.</div>
        )}
      </section>
    </div>
  );
}
