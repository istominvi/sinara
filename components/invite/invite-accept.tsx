"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";

type Invite = {
  invite_type: string;
  teacher_id: string;
  workspace_id: string | null;
  student_email: string | null;
  student_phone: string | null;
  expires_at: string | null;
  accepted_at: string | null;
};

type InviteAcceptProps = {
  token: string;
};

export function InviteAccept({ token }: InviteAcceptProps) {
  const [invite, setInvite] = React.useState<Invite | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      const response = await fetch(`/api/invites/${token}`);
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Инвайт не найден.");
        setLoading(false);
        return;
      }

      setInvite(payload.invite);
      setLoading(false);
    };

    load();
  }, [token]);

  const handleAccept = async () => {
    setStatus(null);
    const response = await fetch(`/api/invites/${token}`, { method: "POST" });
    const payload = await response.json();

    if (!response.ok) {
      setStatus(payload.error ?? "Не удалось принять инвайт.");
      return;
    }

    setStatus("Инвайт принят! Теперь вы привязаны в системе.");
  };

  if (loading) {
    return <p className="text-muted-foreground">Загрузка...</p>;
  }

  if (error || !invite) {
    return <p className="text-red-500">{error ?? "Инвайт недоступен."}</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        Тип инвайта: <span className="font-medium">{invite.invite_type}</span>
      </p>
      {invite.accepted_at ? (
        <p className="text-sm text-muted-foreground">
          Инвайт уже был принят.
        </p>
      ) : (
        <Button onClick={handleAccept}>Принять инвайт</Button>
      )}
      {status && <p className="text-sm text-muted-foreground">{status}</p>}
    </div>
  );
}
