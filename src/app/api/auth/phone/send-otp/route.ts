import { NextRequest } from "next/server";

import { requireUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { handleApiError, jsonOk, parseJsonBody, requestIp } from "@/lib/http";
import { marketplaceService } from "@/server/services/container";

export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request, ["buyer", "seller", "moderator", "super_admin"]);
    enforceRateLimit(`send-otp:${user.id}:${requestIp(request)}`, 5, 10 * 60 * 1000);

    const payload = await parseJsonBody<unknown>(request);
    const result = await marketplaceService.sendPhoneOtp(user, payload);

    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
