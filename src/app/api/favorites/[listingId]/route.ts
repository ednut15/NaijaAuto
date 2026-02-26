import { NextRequest } from "next/server";

import { requireUser } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/http";
import { marketplaceService } from "@/server/services/container";

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ listingId: string }>;
  },
) {
  try {
    const user = requireUser(request, ["buyer", "seller", "moderator", "super_admin"]);
    const { listingId } = await context.params;

    const result = marketplaceService.addFavorite(user, listingId);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{ listingId: string }>;
  },
) {
  try {
    const user = requireUser(request, ["buyer", "seller", "moderator", "super_admin"]);
    const { listingId } = await context.params;

    const result = marketplaceService.removeFavorite(user, listingId);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
