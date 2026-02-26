import Link from "next/link";

import { getServerUser } from "@/lib/auth";
import { canViewModerationQueue, canViewSellerDashboard } from "@/lib/authorization";
import { ListingCard } from "@/components/listing-card";
import { compactNumber } from "@/lib/format";
import { marketplaceService } from "@/server/services/container";
import { getRepository } from "@/server/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const listingResult = await marketplaceService.searchListings({ page: 1, pageSize: 6 });
  const repository = getRepository();
  const [locations, user] = await Promise.all([repository.listLocations(), getServerUser()]);

  return (
    <div className="page-shell">
      <header className="top-nav">
        <span className="brand-mark">NaijaAuto Marketplace</span>
        <nav className="nav-links">
          <Link className="nav-link" href="/listings">
            Browse Cars
          </Link>
          <Link className="nav-link" href="/favorites">
            Favorites
          </Link>
          {canViewSellerDashboard(user) ? (
            <Link className="nav-link" href="/seller/dashboard">
              Seller Dashboard
            </Link>
          ) : null}
          {canViewModerationQueue(user) ? (
            <Link className="nav-link" href="/moderator/queue">
              Moderation Queue
            </Link>
          ) : null}
        </nav>
      </header>

      <section className="hero">
        <h1>Find verified cars across Nigeria.</h1>
        <p>
          Search trusted listings from dealers and private sellers, compare prices in NGN, and contact
          sellers instantly through phone or WhatsApp.
        </p>

        <div className="metrics">
          <div className="metric-card">
            <strong>{compactNumber(listingResult.total)}</strong>
            <span>Approved listings</span>
          </div>
          <div className="metric-card">
            <strong>{compactNumber(locations.length)}</strong>
            <span>Covered locations</span>
          </div>
          <div className="metric-card">
            <strong>&lt;2h</strong>
            <span>Moderation SLA target</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>Featured and Fresh Listings</h2>
            <p>Featured vehicles rank first, then relevance and freshness.</p>
          </div>
          <Link href="/listings" className="button secondary">
            See all listings
          </Link>
        </div>

        <div className="card-grid">
          {listingResult.items.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>Popular City Pages</h2>
            <p>SEO-ready landing pages for Nigeria major city searches.</p>
          </div>
        </div>
        <div className="city-link-grid">
          {locations.slice(0, 10).map((location) => (
            <Link
              key={`${location.state}-${location.city}`}
              className="city-link"
              href={`/cars/${encodeURIComponent(location.state)}/${encodeURIComponent(location.city)}`}
            >
              Cars in {location.city}, {location.state}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
