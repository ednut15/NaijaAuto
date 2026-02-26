import { NextRequest } from "next/server";

import { requireUser } from "@/lib/auth";
import { handleApiError, jsonOk, parseJsonBody } from "@/lib/http";
import { marketplaceService } from "@/server/services/container";

export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request, ["seller"]);
    const payload = await parseJsonBody<unknown>(request);

    const result = await marketplaceService.createFeaturedCheckout(user, payload);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
