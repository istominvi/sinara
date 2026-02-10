"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabaseBrowser } from "@/lib/supabase/client";

type Role = "teacher" | "student";

type AuthFormProps = {
  role: Role;
};

export function AuthForm({ role }: AuthFormProps) {
  const router = useRouter();
  const supabase = React.useMemo(() => supabaseBrowser() as any, []);
  const [mode, setMode] = React.useState<"login" | "register">("login");
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const syncProfile = React.useCallback(
    async (userId: string, fallback: { fullName: string; phone: string }) => {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        return { error: profileError.message };
      }

      if (profile) {
        return { role: profile.role as "teacher" | "student" | "admin" };
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const userMetadata = (user?.user_metadata ?? {}) as {
        full_name?: string;
        phone?: string;
      };

      const { error: insertError } = await supabase.from("profiles").insert({
        id: userId,
        role,
        full_name: userMetadata.full_name ?? fallback.fullName,
        phone:
          role === "student"
            ? (userMetadata.phone ?? fallback.phone) || null
            : null,
      });

      if (insertError) {
        return { error: insertError.message };
      }

      return { role };
    },
    [role, supabase],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const fullName = String(formData.get("fullName") || "").trim();
    const phone = String(formData.get("phone") || "").trim();

    if (!email || !password || (mode === "register" && !fullName)) {
      setMessage("Пожалуйста, заполните обязательные поля.");
      setLoading(false);
      return;
    }

    if (mode === "register") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
            full_name: fullName,
            phone: role === "student" ? phone || null : null,
          },
        },
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      if (data.user && data.session) {
        const result = await syncProfile(data.user.id, { fullName, phone });
        if (result.error) {
          setMessage(result.error);
          setLoading(false);
          return;
        }
      }

      setMessage(
        "Регистрация успешна. Проверьте почту для подтверждения, затем войдите.",
      );
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      setMessage("Не удалось получить пользователя.");
      setLoading(false);
      return;
    }

    const result = await syncProfile(userId, { fullName: "", phone: "" });

    if (result.error || !result.role) {
      setMessage(result.error ?? "Профиль не найден. Обратитесь в поддержку.");
      setLoading(false);
      return;
    }

    setLoading(false);
    if (result.role === "teacher") {
      router.push("/teacher");
      router.refresh();
      return;
    }

    if (result.role === "student") {
      router.push("/student");
      router.refresh();
      return;
    }

    router.push("/admin");
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === "login" ? "default" : "outline"}
          onClick={() => setMode("login")}
        >
          Вход
        </Button>
        <Button
          type="button"
          variant={mode === "register" ? "default" : "outline"}
          onClick={() => setMode("register")}
        >
          Регистрация
        </Button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {mode === "register" && (
          <div className="space-y-2">
            <Label htmlFor={`${role}-fullName`}>Имя</Label>
            <Input
              id={`${role}-fullName`}
              name="fullName"
              placeholder="Ваше имя"
              required
            />
          </div>
        )}
        {mode === "register" && role === "student" && (
          <div className="space-y-2">
            <Label htmlFor={`${role}-phone`}>Телефон</Label>
            <Input id={`${role}-phone`} name="phone" placeholder="+7" />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor={`${role}-email`}>Email</Label>
          <Input
            id={`${role}-email`}
            name="email"
            type="email"
            placeholder="email@example.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${role}-password`}>Пароль</Label>
          <Input
            id={`${role}-password`}
            name="password"
            type="password"
            placeholder="••••••••"
            required
          />
        </div>
        {message && (
          <p className="text-sm text-muted-foreground" role="status">
            {message}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading
            ? "Подождите..."
            : mode === "login"
              ? "Войти"
              : "Создать аккаунт"}
        </Button>
      </form>
    </div>
  );
}
