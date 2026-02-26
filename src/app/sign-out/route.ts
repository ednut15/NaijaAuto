import { NextRequest, NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/server/supabase/route-client";

export async function GET(request: NextRequest) {
  const redirectUrl = new URL("/sign-in?message=Signed%20out%20successfully.", request.url);
  const response = NextResponse.redirect(redirectUrl);

  const supabase = createSupabaseRouteClient(request, response);
  await supabase.auth.signOut();

  return response;
}
