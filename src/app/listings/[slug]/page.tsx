import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatNgn } from "@/lib/format";
import { marketplaceService } from "@/server/services/container";

interface ListingDetailProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ListingDetailProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const listing = marketplaceService.getPublicListing(slug);

    return {
      title: listing.title,
      description: `${listing.year} ${listing.make} ${listing.model} in ${listing.city}, ${listing.state}. ${formatNgn(
        listing.priceNgn,
      )}.`,
      alternates: {
        canonical: `/listings/${listing.slug}`,
      },
      openGraph: {
        title: listing.title,
        description: listing.description,
        images: [listing.photos[0]],
      },
    };
  } catch {
    return {
      title: "Listing not found",
    };
  }
}

export default async function ListingDetailPage({ params }: ListingDetailProps) {
  const { slug } = await params;

  let listing;
  try {
    listing = marketplaceService.getPublicListing(slug);
  } catch {
    notFound();
  }

  const vehicleSchema = {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    name: listing.title,
    description: listing.description,
    brand: listing.make,
    model: listing.model,
    vehicleModelDate: listing.year,
    mileageFromOdometer: {
      "@type": "QuantitativeValue",
      value: listing.mileageKm,
      unitCode: "KMT",
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "NGN",
      price: listing.priceNgn,
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <div className="page-shell">
      <header className="top-nav">
        <Link className="brand-mark" href="/">
          NaijaAuto Marketplace
        </Link>
      </header>

      <section className="section">
        <h1 style={{ marginBottom: 6 }}>{listing.title}</h1>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          {listing.city}, {listing.state} • VIN: {listing.vin}
        </p>
      </section>

      <section className="listing-detail section">
        <div className="gallery">
          <div className="gallery-main">
            <Image src={listing.photos[0]} alt={listing.title} fill priority />
          </div>
          <div className="gallery-strip">
            {listing.photos.slice(1, 6).map((photo) => (
              <div key={photo} className="gallery-thumb">
                <Image src={photo} alt={listing.title} fill />
              </div>
            ))}
          </div>
        </div>

        <aside className="detail-aside">
          <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>{formatNgn(listing.priceNgn)}</p>
          <p style={{ color: "var(--muted)", marginTop: 6 }}>{listing.description}</p>

          <ul className="detail-list">
            <li>Year: {listing.year}</li>
            <li>Body: {listing.bodyType.toUpperCase()}</li>
            <li>Transmission: {listing.transmission}</li>
            <li>Fuel: {listing.fuelType}</li>
            <li>Mileage: {listing.mileageKm.toLocaleString("en-NG")} km</li>
          </ul>

          <div className="quick-actions">
            <a className="button" href={`tel:${listing.contactPhone}`}>
              Call Seller
            </a>
            <a
              className="button secondary"
              href={`https://wa.me/${listing.contactWhatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp Seller
            </a>
          </div>
        </aside>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(vehicleSchema) }} />
    </div>
  );
}
