import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) { return updateSession(request); }

// The public catalogue is cookieless; only account and auth use sessions now.
export const config = { matcher: ["/account/:path*", "/auth/:path*"] };
