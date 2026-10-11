import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Session refresh for authenticated and auth-sensitive paths
export const config = {
  matcher: ["/account/:path*", "/auth/:path*", "/admin/:path*", "/login", "/signup"],
};
