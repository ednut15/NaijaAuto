import { NextRequest } from "next/server";

import { requireUser } from "@/lib/auth";
import { handleApiError, jsonOk, parseJsonBody } from "@/lib/http";
import { marketplaceService } from "@/server/services/container";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request, ["seller"]);
    const profile = await marketplaceService.getSellerOnboarding(user);

    return jsonOk({ profile });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireUser(request, ["seller"]);
    const payload = await parseJsonBody<unknown>(request);
    const profile = await marketplaceService.upsertSellerOnboarding(user, payload);

    return jsonOk({ profile });
  } catch (error) {
    return handleApiError(error);
  }
}
