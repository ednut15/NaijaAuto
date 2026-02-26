import { NextRequest } from "next/server";

import { requireUser } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/http";
import { marketplaceService } from "@/server/services/container";

export async function GET(request: NextRequest) {
  try {
    requireUser(request, ["moderator", "super_admin"]);
    const queue = marketplaceService.getModerationQueue();
    return jsonOk({ queue });
  } catch (error) {
    return handleApiError(error);
  }
}
