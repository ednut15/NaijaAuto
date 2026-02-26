import { NextRequest } from "next/server";

import { requireUser } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/http";
import { marketplaceService } from "@/server/services/container";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request, ["buyer", "seller", "moderator", "super_admin"]);
    const listingIds = await marketplaceService.listFavoriteListingIds(user);

    return jsonOk({
      listingIds,
      total: listingIds.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
