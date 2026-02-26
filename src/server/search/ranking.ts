import type { Listing } from "@/types/domain";

function relevanceScore(listing: Listing, query?: string): number {
  if (!query) {
    return 0;
  }

  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return 0;
  }

  let score = 0;
  const title = listing.title.toLowerCase();
  const makeModel = `${listing.make} ${listing.model}`.toLowerCase();
  const location = `${listing.city} ${listing.state}`.toLowerCase();

  if (title.includes(normalizedQuery)) {
    score += 6;
  }

  if (makeModel.includes(normalizedQuery)) {
    score += 5;
  }

  if (location.includes(normalizedQuery)) {
    score += 2;
  }

  return score;
}

function featuredScore(listing: Listing): number {
  if (!listing.isFeatured || !listing.featuredUntil) {
    return 0;
  }

  return new Date(listing.featuredUntil).getTime() > Date.now() ? 30 : 0;
}

function freshnessScore(listing: Listing): number {
  const createdAt = new Date(listing.createdAt).getTime();
  const ageHours = Math.max(1, (Date.now() - createdAt) / (60 * 60 * 1000));
  return Math.max(0, 20 - ageHours / 24);
}

export function rankListings(listings: Listing[], query?: string): Listing[] {
  return [...listings].sort((a, b) => {
    const scoreA = featuredScore(a) + relevanceScore(a, query) + freshnessScore(a);
    const scoreB = featuredScore(b) + relevanceScore(b, query) + freshnessScore(b);

    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }

    return b.createdAt.localeCompare(a.createdAt);
  });
}
