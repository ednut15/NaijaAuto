import Image from "next/image";
import Link from "next/link";

import { formatNgn, timeAgo } from "@/lib/format";
import type { Listing } from "@/types/domain";

interface ListingCardProps {
  listing: Listing;
}

export function ListingCard({ listing }: ListingCardProps) {
  const cityLink = `/cars/${encodeURIComponent(listing.state)}/${encodeURIComponent(listing.city)}`;

  return (
    <article className="listing-card">
      <div className="listing-card__media">
        <Image
          src={listing.photos[0]}
          alt={listing.title}
          fill
          sizes="(max-width: 640px) 100vw, 33vw"
          className="listing-card__image"
        />
        {listing.isFeatured ? <span className="listing-card__pill">Featured</span> : null}
      </div>

      <div className="listing-card__body">
        <p className="listing-card__price">{formatNgn(listing.priceNgn)}</p>
        <h3>
          <Link href={`/listings/${listing.slug}`} className="listing-card__title">
            {listing.title}
          </Link>
        </h3>

        <p className="listing-card__meta">
          {listing.year} • {listing.mileageKm.toLocaleString("en-NG")} km • {listing.transmission}
        </p>

        <div className="listing-card__footer">
          <Link href={cityLink} className="listing-card__location">
            {listing.city}, {listing.state}
          </Link>
          <span>{timeAgo(listing.createdAt)}</span>
        </div>
      </div>
    </article>
  );
}
