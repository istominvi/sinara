import { InviteAccept } from "@/components/invite/invite-accept";

export default function InvitePage({ params }: { params: { token: string } }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow">
        <h1 className="text-2xl font-semibold">Инвайт</h1>
        <p className="mt-2 text-muted-foreground">
          Примите инвайт, чтобы связать аккаунт с учителем или workspace.
        </p>
        <div className="mt-4">
          <InviteAccept token={params.token} />
        </div>
      </div>
    </div>
  );
}
