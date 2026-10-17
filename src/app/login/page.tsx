"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Supabase Auth needs an email, so each name maps to a private placeholder address.
// No email is ever sent to it (email confirmation is off).
const NAME_DOMAIN = "trackerforme.app";
const nameToEmail = (name: string) => `${name.trim().toLowerCase()}@${NAME_DOMAIN}`;

export default function LoginPage() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Already signed in? Go straight to the homepage.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/");
    });
  }, [supabase, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: nameToEmail(name), password });
    setBusy(false);
    if (error) {
      return setMsg(error.message.toLowerCase().includes("invalid login") ? "Wrong name or password." : error.message);
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-fg">
          <Activity className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <h1 className="mt-3 text-[20px] font-semibold tracking-tight">Tracker For Me</h1>
      </div>

      <form onSubmit={submit} className="card space-y-3">
        <input
          className="input"
          required
          autoFocus
          autoCapitalize="none"
          autoComplete="username"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="input"
          type="password"
          required
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="btn w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {msg && <p className="text-center text-[13px] text-danger">{msg}</p>}
      </form>
    </main>
  );
}
