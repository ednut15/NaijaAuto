import type { MetadataRoute } from "next";

import { getRepository } from "@/server/store";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const repository = getRepository();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${appUrl}/`,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${appUrl}/listings`,
      changeFrequency: "hourly",
      priority: 0.9,
    },
  ];

  const listingRoutes: MetadataRoute.Sitemap = repository
    .allListings()
    .filter((listing) => listing.status === "approved")
    .map((listing) => ({
      url: `${appUrl}/listings/${listing.slug}`,
      lastModified: new Date(listing.updatedAt),
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));

  const cityRoutes: MetadataRoute.Sitemap = repository.listLocations().map((location) => ({
    url: `${appUrl}/cars/${encodeURIComponent(location.state)}/${encodeURIComponent(location.city)}`,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...listingRoutes, ...cityRoutes];
}
