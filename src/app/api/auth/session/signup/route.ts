import { NextRequest } from "next/server";

import { authSignUpSchema } from "@/lib/validation/auth";
import { ApiError, handleApiError, jsonOk, parseJsonBody } from "@/lib/http";
import { createSupabaseRouteClient } from "@/server/supabase/route-client";

interface SignUpResponse {
  ok: true;
  redirectTo: string;
  requiresEmailVerification: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const payload = await parseJsonBody<unknown>(request);
    const parsed = authSignUpSchema.safeParse(payload);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid sign-up payload.");
    }

    const sellerType =
      parsed.data.role === "seller" ? (parsed.data.sellerType ?? "private") : undefined;

    const response = jsonOk<SignUpResponse>({
      ok: true,
      redirectTo: parsed.data.redirectTo ?? "/",
      requiresEmailVerification: false,
    });

    const supabase = createSupabaseRouteClient(request, response);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          role: parsed.data.role,
          ...(sellerType ? { seller_type: sellerType } : {}),
        },
      },
    });

    if (error || !data.user) {
      throw new ApiError(400, error?.message ?? "Unable to create account.");
    }

    if (!data.session) {
      return jsonOk<SignUpResponse>({
        ok: true,
        redirectTo: "/sign-in?message=Check%20your%20email%20to%20confirm%20your%20account.",
        requiresEmailVerification: true,
      });
    }

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
