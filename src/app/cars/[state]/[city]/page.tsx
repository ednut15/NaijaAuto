import type { Metadata } from "next";
import Link from "next/link";

import { ListingCard } from "@/components/listing-card";
import { marketplaceService } from "@/server/services/container";

export const dynamic = "force-dynamic";

interface CityCarsPageProps {
  params: Promise<{ state: string; city: string }>;
}

function decode(value: string): string {
  return decodeURIComponent(value);
}

export async function generateMetadata({ params }: CityCarsPageProps): Promise<Metadata> {
  const { state, city } = await params;
  const readableState = decode(state);
  const readableCity = decode(city);

  return {
    title: `Cars in ${readableCity}, ${readableState}`,
    description: `Browse approved cars for sale in ${readableCity}, ${readableState} on NaijaAuto.`,
    alternates: {
      canonical: `/cars/${encodeURIComponent(readableState)}/${encodeURIComponent(readableCity)}`,
    },
  };
}

export default async function CityCarsPage({ params }: CityCarsPageProps) {
  const { state, city } = await params;
  const readableState = decode(state);
  const readableCity = decode(city);

  const result = await marketplaceService.searchListings({
    page: 1,
    pageSize: 30,
    state: readableState,
    city: readableCity,
  });

  return (
    <div className="page-shell">
      <header className="top-nav">
        <Link className="brand-mark" href="/">
          NaijaAuto Marketplace
        </Link>
      </header>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>
              Cars in {readableCity}, {readableState}
            </h2>
            <p>{result.total} approved listings in this city.</p>
          </div>
          <Link className="button secondary" href="/listings">
            Browse all
          </Link>
        </div>

        {result.items.length ? (
          <div className="card-grid">
            {result.items.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="empty-state">No approved listings yet for this city.</div>
        )}
      </section>
    </div>
  );
}
