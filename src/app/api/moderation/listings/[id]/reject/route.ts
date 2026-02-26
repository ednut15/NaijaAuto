import { NextRequest } from "next/server";

import { requireUser } from "@/lib/auth";
import { handleApiError, jsonOk, parseJsonBody } from "@/lib/http";
import { marketplaceService } from "@/server/services/container";

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const moderator = requireUser(request, ["moderator", "super_admin"]);
    const { id } = await context.params;
    const payload = await parseJsonBody<unknown>(request);

    const listing = marketplaceService.rejectListing(moderator, id, payload);
    return jsonOk({ listing });
  } catch (error) {
    return handleApiError(error);
  }
}
