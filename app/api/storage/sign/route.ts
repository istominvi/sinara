import { NextResponse } from "next/server";

const ALLOWED_BUCKETS = ["cinara-content", "branding-assets"] as const;
type AllowedBucket = (typeof ALLOWED_BUCKETS)[number];

type SignRequest = {
  bucket: AllowedBucket;
  path: string;
  expiresIn?: number;
};

function isAllowedBucket(value: string): value is AllowedBucket {
  return (ALLOWED_BUCKETS as readonly string[]).includes(value);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Partial<SignRequest> | null;

  if (!body || typeof body.bucket !== "string" || typeof body.path !== "string") {
    return NextResponse.json(
      { error: "Invalid payload", message: "bucket и path обязательны" },
      { status: 400 },
    );
  }

  if (!isAllowedBucket(body.bucket)) {
    return NextResponse.json(
      { error: "Invalid bucket", message: "bucket должен быть cinara-content или branding-assets" },
      { status: 400 },
    );
  }

  if (!body.path.trim()) {
    return NextResponse.json(
      { error: "Invalid path", message: "path не может быть пустым" },
      { status: 400 },
    );
  }

  const expiresIn =
    typeof body.expiresIn === "number" && Number.isFinite(body.expiresIn)
      ? Math.min(Math.max(Math.trunc(body.expiresIn), 60), 180)
      : 120;

  // TODO: проверить auth и права доступа к workspace/methodic перед подписью URL.
  // TODO: использовать server-side Supabase client/service role только на сервере.
  return NextResponse.json(
    {
      error: "Not implemented",
      message: "TODO: проверить права и выдать signed URL",
      request: {
        bucket: body.bucket,
        path: body.path,
        expiresIn,
      },
    },
    { status: 501 },
  );
}
