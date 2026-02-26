import Link from "next/link";

import { FavoriteToggleButton } from "@/components/favorite-toggle-button";
import { ListingCard } from "@/components/listing-card";
import { getServerUser } from "@/lib/auth";
import { canViewModerationQueue, canViewSellerDashboard } from "@/lib/authorization";
import { marketplaceService } from "@/server/services/container";

export const dynamic = "force-dynamic";

interface ListingsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getStringParam(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export const metadata = {
  title: "Browse Cars in Nigeria",
  description: "Search approved cars, SUVs and pickups by city, price, make, and model.",
  alternates: {
    canonical: "/listings",
  },
};

export default async function ListingsPage({ searchParams }: ListingsPageProps) {
  const params = await searchParams;

  const filters = {
    query: getStringParam(params.query),
    make: getStringParam(params.make),
    model: getStringParam(params.model),
    state: getStringParam(params.state),
    city: getStringParam(params.city),
    bodyType: getStringParam(params.bodyType),
    minPriceNgn: getStringParam(params.minPriceNgn),
    maxPriceNgn: getStringParam(params.maxPriceNgn),
    page: getStringParam(params.page),
    pageSize: getStringParam(params.pageSize),
  };

  const [result, user] = await Promise.all([marketplaceService.searchListings(filters), getServerUser()]);
  const favoriteListingIds = user
    ? new Set(await marketplaceService.listFavoriteListingIds(user))
    : new Set<string>();

  return (
    <div className="page-shell">
      <header className="top-nav">
        <Link className="brand-mark" href="/">
          NaijaAuto Marketplace
        </Link>
        <nav className="nav-links">
          {!user ? (
            <Link className="nav-link" href="/sign-in?next=/listings">
              Sign In
            </Link>
          ) : null}
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
          {user ? (
            <Link className="nav-link" href="/sign-out">
              Sign Out
            </Link>
          ) : null}
        </nav>
      </header>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>Search Listings</h2>
            <p>{result.total} listings matched your filters.</p>
          </div>
        </div>

        <form className="filter-panel" method="get">
          <div className="filter-grid">
            <div>
              <label className="label" htmlFor="query">
                Keyword
              </label>
              <input className="input" name="query" id="query" defaultValue={filters.query} />
            </div>
            <div>
              <label className="label" htmlFor="make">
                Make
              </label>
              <input className="input" name="make" id="make" defaultValue={filters.make} />
            </div>
            <div>
              <label className="label" htmlFor="model">
                Model
              </label>
              <input className="input" name="model" id="model" defaultValue={filters.model} />
            </div>
            <div>
              <label className="label" htmlFor="state">
                State
              </label>
              <input className="input" name="state" id="state" defaultValue={filters.state} />
            </div>
            <div>
              <label className="label" htmlFor="city">
                City
              </label>
              <input className="input" name="city" id="city" defaultValue={filters.city} />
            </div>
            <div>
              <label className="label" htmlFor="bodyType">
                Body
              </label>
              <select className="select" name="bodyType" id="bodyType" defaultValue={filters.bodyType}>
                <option value="">Any</option>
                <option value="car">Car</option>
                <option value="suv">SUV</option>
                <option value="pickup">Pickup</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="minPriceNgn">
                Min Price
              </label>
              <input
                className="input"
                type="number"
                name="minPriceNgn"
                id="minPriceNgn"
                defaultValue={filters.minPriceNgn}
              />
            </div>
            <div>
              <label className="label" htmlFor="maxPriceNgn">
                Max Price
              </label>
              <input
                className="input"
                type="number"
                name="maxPriceNgn"
                id="maxPriceNgn"
                defaultValue={filters.maxPriceNgn}
              />
            </div>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button className="button" type="submit">
              Apply Filters
            </button>
            <Link className="button secondary" href="/listings">
              Reset
            </Link>
          </div>
        </form>
      </section>

      <section className="section">
        {result.items.length ? (
          <div className="card-grid">
            {result.items.map((listing) => (
              <div key={listing.id}>
                <ListingCard listing={listing} />
                {user ? (
                  <div style={{ marginTop: 8 }}>
                    <FavoriteToggleButton
                      listingId={listing.id}
                      initiallySaved={favoriteListingIds.has(listing.id)}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">No listings matched this query. Try a wider price range or city.</div>
        )}
      </section>

      <section className="section map-board">
        <h3 style={{ marginTop: 0 }}>Map pin preview</h3>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          API-ready coordinates are attached to each listing for interactive map rendering.
        </p>
        <ul>
          {result.items.slice(0, 6).map((listing) => (
            <li key={`${listing.id}-pin`}>
              {listing.title}: {listing.lat}, {listing.lng}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
