import { NextRequest } from "next/server";

import { requireUser } from "@/lib/auth";
import { handleApiError, jsonOk, parseJsonBody } from "@/lib/http";
import { marketplaceService } from "@/server/services/container";

interface RouteContext {
  params: Promise<{
    code: string;
  }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireUser(request, ["super_admin"]);
    const payload = await parseJsonBody<unknown>(request);
    const { code } = await context.params;

    const updated = await marketplaceService.updateFeaturedPackageForAdmin(
      user,
      decodeURIComponent(code),
      payload,
    );
    return jsonOk({ package: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
