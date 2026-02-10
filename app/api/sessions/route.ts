import { NextResponse } from "next/server";

import { getRouteUser, requireRouteRole } from "@/lib/auth/route";

const ALLOWED_TARGET_TYPES = ["student", "group"] as const;

function isTargetType(
  value: string,
): value is (typeof ALLOWED_TARGET_TYPES)[number] {
  return ALLOWED_TARGET_TYPES.includes(value as "student" | "group");
}

function generateRoomKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Buffer.from(bytes).toString("base64url");
}

export async function GET() {
  const auth = await getRouteUser();

  if (!auth.ok) {
    return auth.response;
  }

  const { data, error } = await auth.supabase
    .from("class_sessions")
    .select(
      "id, starts_at, duration_min, meeting_room_key, target_type, target_id, status",
    )
    .order("starts_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ sessions: data });
}

export async function POST(request: Request) {
  const auth = await requireRouteRole("teacher");

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const targetType = body.targetType as string;
  const targetId = body.targetId as string;
  const startsAt = body.startsAt as string;
  const durationMin = Number(body.durationMin ?? 60);

  if (!targetType || !targetId || !startsAt) {
    return NextResponse.json(
      { error: "targetType, targetId, startsAt are required" },
      { status: 400 },
    );
  }

  if (!isTargetType(targetType)) {
    return NextResponse.json(
      { error: "targetType must be student or group" },
      { status: 400 },
    );
  }

  const meetingRoomKey = body.meetingRoomKey ?? generateRoomKey();

  const { data, error } = await auth.supabase
    .from("class_sessions")
    .insert({
      teacher_id: auth.user.id,
      target_type: targetType,
      target_id: targetId,
      starts_at: startsAt,
      duration_min: durationMin,
      meeting_room_key: meetingRoomKey,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ id: data.id });
}
