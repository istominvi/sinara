import { NextResponse } from "next/server";

import { requireRouteRole } from "@/lib/auth/route";
import { supabaseAdmin } from "@/lib/supabase/admin";

type InviteRecord = {
  id: string;
  invite_type: "student" | "workspace_teacher" | "teacher";
  teacher_id: string | null;
  workspace_id: string | null;
  student_email: string | null;
  student_phone: string | null;
  expires_at: string | null;
  accepted_at: string | null;
};

type ProfileRecord = {
  role: "teacher" | "student" | "admin";
  phone: string | null;
};

function isExpired(expiresAt: string | null) {
  return Boolean(expiresAt && new Date(expiresAt) < new Date());
}

export async function GET(
  _request: Request,
  { params }: { params: { token: string } },
) {
  const auth = await requireRouteRole(["teacher", "student"]);

  if (!auth.ok) {
    return auth.response;
  }

  const admin = supabaseAdmin() as any;
  const { data, error } = await admin
    .from("invites")
    .select(
      "invite_type, student_email, student_phone, expires_at, accepted_at",
    )
    .eq("token", params.token)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (data.accepted_at) {
    return NextResponse.json(
      { error: "Invite already accepted" },
      { status: 400 },
    );
  }

  if (isExpired(data.expires_at)) {
    return NextResponse.json({ error: "Invite expired" }, { status: 400 });
  }

  return NextResponse.json({ invite: data });
}

export async function POST(
  _request: Request,
  { params }: { params: { token: string } },
) {
  const auth = await requireRouteRole(["teacher", "student"]);

  if (!auth.ok) {
    return auth.response;
  }

  const admin = supabaseAdmin() as any;
  const { data: inviteData, error } = await admin
    .from("invites")
    .select(
      "id, invite_type, teacher_id, workspace_id, student_email, student_phone, expires_at, accepted_at",
    )
    .eq("token", params.token)
    .single();

  const invite = inviteData as InviteRecord | null;

  if (error || !invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.accepted_at) {
    return NextResponse.json(
      { error: "Invite already accepted" },
      { status: 400 },
    );
  }

  if (isExpired(invite.expires_at)) {
    return NextResponse.json({ error: "Invite expired" }, { status: 400 });
  }

  const {
    data: { user },
  } = await auth.supabase.auth.getUser();

  const { data: profileData } = await auth.supabase
    .from("profiles")
    .select("role, phone")
    .eq("id", auth.user.id)
    .single();

  const profile = profileData as ProfileRecord | null;

  if (!profile) {
    return NextResponse.json({ error: "Profile missing" }, { status: 400 });
  }

  if (invite.invite_type === "student") {
    if (profile.role !== "student") {
      return NextResponse.json(
        { error: "Only students can accept" },
        { status: 403 },
      );
    }

    if (invite.student_email && user?.email !== invite.student_email) {
      return NextResponse.json(
        { error: "Invite email mismatch" },
        { status: 403 },
      );
    }

    if (invite.student_phone && profile.phone !== invite.student_phone) {
      return NextResponse.json(
        { error: "Invite phone mismatch" },
        { status: 403 },
      );
    }

    const { error: linkError } = await admin.from("teacher_students").insert({
      teacher_id: invite.teacher_id,
      student_id: auth.user.id,
      workspace_id: invite.workspace_id ?? null,
    });

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 400 });
    }
  }

  if (invite.invite_type === "workspace_teacher") {
    if (profile.role !== "teacher") {
      return NextResponse.json(
        { error: "Only teachers can accept" },
        { status: 403 },
      );
    }

    if (!invite.workspace_id) {
      return NextResponse.json({ error: "Workspace missing" }, { status: 400 });
    }

    const { error: memberError } = await admin
      .from("workspace_members")
      .insert({
        workspace_id: invite.workspace_id,
        user_id: auth.user.id,
        role: "member",
      });

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 400 });
    }
  }

  if (invite.invite_type === "teacher") {
    return NextResponse.json(
      { error: "Invite type teacher is not supported yet" },
      { status: 400 },
    );
  }

  await admin
    .from("invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  return NextResponse.json({ ok: true });
}
