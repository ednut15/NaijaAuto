import { NextRequest } from "next/server";

import { requireUser } from "@/lib/auth";
import { handleApiError, jsonOk, requestIp } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { marketplaceService } from "@/server/services/container";

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ identifier: string }>;
  },
) {
  try {
    const user = await requireUser(request, ["seller"]);
    const { identifier } = await context.params;

    enforceRateLimit(`submit-listing:${user.id}:${requestIp(request)}`, 20, 60 * 60 * 1000);
    const listing = await marketplaceService.submitListing(user, identifier);

    return jsonOk({ listing });
  } catch (error) {
    return handleApiError(error);
  }
}
