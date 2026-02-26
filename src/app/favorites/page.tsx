import Link from "next/link";

import { FavoriteToggleButton } from "@/components/favorite-toggle-button";
import { ListingCard } from "@/components/listing-card";
import { getServerUser } from "@/lib/auth";
import { marketplaceService } from "@/server/services/container";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Favorites",
  description: "Saved cars you are monitoring on NaijaAuto.",
  alternates: {
    canonical: "/favorites",
  },
};

export default async function FavoritesPage() {
  const user = await getServerUser();

  if (!user) {
    return (
      <div className="page-shell">
        <header className="top-nav">
          <Link className="brand-mark" href="/">
            NaijaAuto Marketplace
          </Link>
          <nav className="nav-links">
            <Link className="nav-link" href="/listings">
              Browse Cars
            </Link>
            <Link className="nav-link" href="/sign-in?next=/favorites">
              Sign In
            </Link>
          </nav>
        </header>

        <section className="section">
          <div className="empty-state">
            Sign in to view and manage saved favorites. You can still browse listings publicly.
          </div>
        </section>
      </div>
    );
  }

  const favorites = await marketplaceService.listFavoriteListings(user);

  return (
    <div className="page-shell">
      <header className="top-nav">
        <Link className="brand-mark" href="/">
          NaijaAuto Marketplace
        </Link>
        <nav className="nav-links">
          <Link className="nav-link" href="/listings">
            Browse Cars
          </Link>
          <Link className="nav-link" href="/seller/dashboard">
            Seller Dashboard
          </Link>
          <Link className="nav-link" href="/sign-out">
            Sign Out
          </Link>
        </nav>
      </header>

      <section className="section-head section">
        <div>
          <h2>My Favorites</h2>
          <p>{favorites.length} saved listing(s).</p>
        </div>
      </section>

      <section className="section">
        {favorites.length ? (
          <div className="card-grid">
            {favorites.map((listing) => (
              <div key={listing.id}>
                <ListingCard listing={listing} />
                <div style={{ marginTop: 8 }}>
                  <FavoriteToggleButton listingId={listing.id} initiallySaved refreshOnChange />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            You have no saved favorites yet. Browse listings and tap save to build your shortlist.
          </div>
        )}
      </section>
    </div>
  );
}
