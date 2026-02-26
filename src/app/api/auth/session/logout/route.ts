import { NextRequest } from "next/server";

import { handleApiError, jsonOk } from "@/lib/http";
import { createSupabaseRouteClient } from "@/server/supabase/route-client";

interface LogoutResponse {
  ok: true;
  redirectTo: string;
}

export async function POST(request: NextRequest) {
  try {
    const response = jsonOk<LogoutResponse>({
      ok: true,
      redirectTo: "/sign-in?message=Signed%20out%20successfully.",
    });

    const supabase = createSupabaseRouteClient(request, response);
    await supabase.auth.signOut();

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
