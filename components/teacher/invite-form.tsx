"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InviteForm() {
  const [loading, setLoading] = React.useState(false);
  const [token, setToken] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setToken(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const studentEmail = String(formData.get("studentEmail") || "").trim();
    const studentPhone = String(formData.get("studentPhone") || "").trim();

    const response = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inviteType: "student",
        studentEmail: studentEmail || undefined,
        studentPhone: studentPhone || undefined,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Не удалось создать инвайт.");
      setLoading(false);
      return;
    }

    setToken(payload.token);
    setLoading(false);
  };

  const inviteLink =
    token && typeof window !== "undefined"
      ? `${window.location.origin}/invite/${token}`
      : "";

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="studentEmail">Email ученика</Label>
        <Input id="studentEmail" name="studentEmail" type="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="studentPhone">Телефон ученика</Label>
        <Input id="studentPhone" name="studentPhone" placeholder="+7" />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {token && (
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          Инвайт создан: <span className="font-medium">{token}</span>
          <div className="mt-2 break-all text-muted-foreground">
            {inviteLink}
          </div>
        </div>
      )}
      <Button type="submit" disabled={loading}>
        {loading ? "Создаем..." : "Создать инвайт"}
      </Button>
    </form>
  );
}
