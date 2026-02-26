import { NextRequest } from "next/server";

import { authSignInSchema } from "@/lib/validation/auth";
import { ApiError, handleApiError, jsonOk, parseJsonBody } from "@/lib/http";
import { createSupabaseRouteClient } from "@/server/supabase/route-client";

interface LoginResponse {
  ok: true;
  redirectTo: string;
}

export async function POST(request: NextRequest) {
  try {
    const payload = await parseJsonBody<unknown>(request);
    const parsed = authSignInSchema.safeParse(payload);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid sign-in payload.");
    }

    const response = jsonOk<LoginResponse>({
      ok: true,
      redirectTo: parsed.data.redirectTo ?? "/",
    });

    const supabase = createSupabaseRouteClient(request, response);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error || !data.user || !data.session) {
      throw new ApiError(401, "Invalid email or password.");
    }

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
