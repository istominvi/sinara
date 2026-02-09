import { NextResponse } from "next/server";

import { supabaseRoute } from "@/lib/supabase/route";

function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Buffer.from(bytes).toString("base64url");
}

export async function POST(request: Request) {
  const supabase = supabaseRoute();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (!profile || profile.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const inviteType = body.inviteType as string;
  const studentEmail = body.studentEmail as string | undefined;
  const studentPhone = body.studentPhone as string | undefined;
  const workspaceId = body.workspaceId as string | undefined;

  if (!inviteType) {
    return NextResponse.json(
      { error: "inviteType is required" },
      { status: 400 },
    );
  }

  const token = generateToken();

  const { data, error } = await supabase
    .from("invites")
    .insert({
      token,
      invite_type: inviteType,
      teacher_id: session.user.id,
      workspace_id: workspaceId ?? null,
      student_email: studentEmail ?? null,
      student_phone: studentPhone ?? null,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("token")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ token: data.token });
}
