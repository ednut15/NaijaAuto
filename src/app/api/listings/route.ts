import { NextRequest } from "next/server";

import { requireUser } from "@/lib/auth";
import { handleApiError, jsonCreated, jsonOk, parseJsonBody } from "@/lib/http";
import { marketplaceService } from "@/server/services/container";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request, ["seller"]);
    const payload = await parseJsonBody<unknown>(request);
    const listing = await marketplaceService.createListing(user, payload);

    return jsonCreated({ listing });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const result = await marketplaceService.searchListings(searchParams);

    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
