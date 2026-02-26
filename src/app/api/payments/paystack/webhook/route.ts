import { NextRequest } from "next/server";

import { handleApiError, jsonOk } from "@/lib/http";
import { marketplaceService } from "@/server/services/container";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    const result = await marketplaceService.handlePaystackWebhook(rawBody, signature);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
