import { NextRequest } from "next/server";

import { requireUser } from "@/lib/auth";
import { ApiError, handleApiError, jsonOk, parseJsonBody } from "@/lib/http";
import { marketplaceService } from "@/server/services/container";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(
  _: NextRequest,
  context: {
    params: Promise<{ identifier: string }>;
  },
) {
  try {
    const { identifier } = await context.params;
    const listing = await marketplaceService.getPublicListing(identifier);

    return jsonOk({ listing });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ identifier: string }>;
  },
) {
  try {
    const user = await requireUser(request, ["seller"]);
    const { identifier } = await context.params;

    if (!isUuid(identifier)) {
      throw new ApiError(400, "Listing ID must be a valid UUID for PATCH operations.");
    }

    const payload = await parseJsonBody<unknown>(request);
    const listing = await marketplaceService.updateListing(user, identifier, payload);

    return jsonOk({ listing });
  } catch (error) {
    return handleApiError(error);
  }
}
