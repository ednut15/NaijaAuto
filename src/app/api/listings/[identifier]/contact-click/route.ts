import { NextRequest } from "next/server";

import { getRequestUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { handleApiError, jsonOk, parseJsonBody, requestIp } from "@/lib/http";
import { marketplaceService } from "@/server/services/container";

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ identifier: string }>;
  },
) {
  try {
    const user = getRequestUser(request);
    const { identifier } = await context.params;

    enforceRateLimit(`contact-click:${identifier}:${requestIp(request)}`, 120, 60 * 1000);

    const payload = await parseJsonBody<unknown>(request);
    const result = marketplaceService.trackContactClick(request, user, identifier, payload);

    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
