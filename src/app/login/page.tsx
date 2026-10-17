"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Supabase Auth needs an email, so each name maps to a private placeholder address.
// No email is ever sent to it (email confirmation is off).
const NAME_DOMAIN = "trackerforme.app";
const nameToEmail = (name: string) => `${name.trim().toLowerCase()}@${NAME_DOMAIN}`;
const VALID_NAME = /^[a-zA-Z0-9._-]{3,30}$/;

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const trimmed = name.trim();
    if (!VALID_NAME.test(trimmed)) {
      return setMsg("Name must be 3–30 letters or numbers (no spaces).");
    }
    setBusy(true);
    const email = nameToEmail(trimmed);
    const { data, error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { data: { username: trimmed } } });
    setBusy(false);

    if (error) {
      if (mode === "signin" && error.message.toLowerCase().includes("invalid login")) {
        return setMsg("Wrong name or password. First time here? Use the Create account tab.");
      }
      if (mode === "signup" && error.message.toLowerCase().includes("already registered")) {
        return setMsg("That name is taken — try signing in instead.");
      }
      return setMsg(error.message);
    }
    if (data.session) {
      router.replace("/");
      router.refresh();
    } else {
      setMsg("Account created — now sign in.");
      setMode("signin");
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <div className="mb-8 text-center">
        <div className="text-5xl">🔥</div>
        <h1 className="mt-2 text-2xl font-bold">Tracker For Me</h1>
        <p className="text-sm text-muted">Log your weight & meals. Keep the streak alive.</p>
      </div>

      <form onSubmit={submit} className="card space-y-3">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-background p-1 text-sm">
          {(["signin", "signup"] as const).map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => {
                setMode(m);
                setMsg(null);
              }}
              className={`rounded-lg py-1.5 font-medium ${mode === m ? "bg-card shadow-sm" : "text-muted"}`}
            >
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>
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
          minLength={6}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="btn w-full" disabled={busy}>
          {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
        {msg && <p className="text-center text-sm text-muted">{msg}</p>}
      </form>

    </main>
  );
}
