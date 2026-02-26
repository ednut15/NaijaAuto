import { NextRequest } from "next/server";

import { requireUser } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/http";
import { marketplaceService } from "@/server/services/container";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request, ["super_admin"]);
    const packages = await marketplaceService.listFeaturedPackagesForAdmin(user);
    return jsonOk({ packages });
  } catch (error) {
    return handleApiError(error);
  }
}
