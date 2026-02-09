import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseRoute } from "@/lib/supabase/route";

export async function GET(
  _request: Request,
  { params }: { params: { token: string } },
) {
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("invites")
    .select("invite_type, teacher_id, workspace_id, student_email, student_phone, expires_at, accepted_at")
    .eq("token", params.token)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  return NextResponse.json({ invite: data });
}

export async function POST(
  _request: Request,
  { params }: { params: { token: string } },
) {
  const authSupabase = supabaseRoute();
  const {
    data: { session },
  } = await authSupabase.auth.getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = supabaseAdmin();
  const { data: invite, error } = await admin
    .from("invites")
    .select("id, invite_type, teacher_id, workspace_id, expires_at, accepted_at")
    .eq("token", params.token)
    .single();

  if (error || !invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.accepted_at) {
    return NextResponse.json({ error: "Invite already accepted" }, { status: 400 });
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 400 });
  }

  const { data: profile } = await authSupabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile missing" }, { status: 400 });
  }

  if (invite.invite_type === "student") {
    if (profile.role !== "student") {
      return NextResponse.json({ error: "Only students can accept" }, { status: 403 });
    }

    const { error: linkError } = await admin
      .from("teacher_students")
      .insert({
        teacher_id: invite.teacher_id,
        student_id: session.user.id,
        workspace_id: invite.workspace_id ?? null,
      });

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 400 });
    }
  }

  if (invite.invite_type === "workspace_teacher") {
    if (profile.role !== "teacher") {
      return NextResponse.json({ error: "Only teachers can accept" }, { status: 403 });
    }

    if (!invite.workspace_id) {
      return NextResponse.json({ error: "Workspace missing" }, { status: 400 });
    }

    const { error: memberError } = await admin
      .from("workspace_members")
      .insert({
        workspace_id: invite.workspace_id,
        user_id: session.user.id,
        role: "member",
      });

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 400 });
    }
  }

  await admin
    .from("invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  return NextResponse.json({ ok: true });
}
