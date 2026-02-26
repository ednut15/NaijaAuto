import type { MetadataRoute } from "next";

import { getRepository } from "@/server/store";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  let listingRoutes: MetadataRoute.Sitemap = [];
  let cityRoutes: MetadataRoute.Sitemap = [];

  try {
    listingRoutes = (await repository.allListings())
      .filter((listing) => listing.status === "approved")
      .map((listing) => ({
        url: `${appUrl}/listings/${listing.slug}`,
        lastModified: new Date(listing.updatedAt),
        changeFrequency: "daily" as const,
        priority: 0.8,
      }));

    cityRoutes = (await repository.listLocations()).map((location) => ({
      url: `${appUrl}/cars/${encodeURIComponent(location.state)}/${encodeURIComponent(location.city)}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));
  } catch (error) {
    console.warn("Sitemap generated without dynamic listing/location routes", error);
  }

  return [...staticRoutes, ...listingRoutes, ...cityRoutes];
}
