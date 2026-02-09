import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

import type { Database } from "@/lib/supabase/client";

export function supabaseRoute() {
  return createRouteHandlerClient<Database>({ cookies });
}
