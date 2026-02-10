import { NextResponse } from "next/server";

type AppRole = "teacher" | "student" | "admin";

type RouteAuthFailure = {
  ok: false;
  response: NextResponse;
};

type RouteUserSuccess = {
  ok: true;
  supabase: any;
  user: any;
};

type RouteRoleSuccess = RouteUserSuccess & {
  role: AppRole;
};

import { supabaseRoute } from "@/lib/supabase/route";

export async function getRouteUser(): Promise<
  RouteAuthFailure | RouteUserSuccess
> {
  const supabase = supabaseRoute() as any;
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true, supabase, user: session.user };
}

export async function requireRouteRole(
  roles: AppRole | AppRole[],
): Promise<RouteAuthFailure | RouteRoleSuccess> {
  const auth = await getRouteUser();

  if (!auth.ok) {
    return auth;
  }

  const requiredRoles = Array.isArray(roles) ? roles : [roles];

  const { data: profile, error } = await auth.supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (error || !profile) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Profile missing" },
        { status: 400 },
      ),
    };
  }

  if (!requiredRoles.includes(profile.role as AppRole)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    supabase: auth.supabase,
    user: auth.user,
    role: profile.role as AppRole,
  };
}
