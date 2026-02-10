import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { supabaseServer } from "@/lib/supabase/server";

export default async function AuthPage() {
  const supabase = supabaseServer() as any;
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (profile?.role === "teacher") {
      redirect("/teacher");
    }

    if (profile?.role === "student") {
      redirect("/student");
    }

    if (profile?.role === "admin") {
      redirect("/admin");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-xl rounded-lg border bg-background p-6 shadow">
        <Suspense fallback={null}>
          <AuthCard />
        </Suspense>
      </div>
    </div>
  );
}
