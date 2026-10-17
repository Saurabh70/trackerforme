"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Dashboard from "@/components/Dashboard";
import type { Profile } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace("/login");
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>();
      if (!data || data.start_weight == null || data.target_weight == null) return router.replace("/onboarding");
      setProfile(data);
    })();
  }, [router]);

  if (!profile) {
    return (
      <main className="mx-auto max-w-xl space-y-3 px-4 pt-6">
        <div className="h-12 w-40 animate-pulse rounded-lg bg-border/60" />
        <div className="card h-[260px] animate-pulse" />
        <div className="card h-80 animate-pulse" />
      </main>
    );
  }
  return <Dashboard profile={profile} />;
}
