"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const { error } = await createSupabaseBrowserClient().auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push("/admin"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Sign-in failed."); }
    finally { setBusy(false); }
  }
  return <section className="login-card"><span className="eyebrow">WELCOME BACK</span><h1>Your shop,<br/><em>at a glance.</em></h1><p>Sign in to manage KRP products and customer orders.</p><form onSubmit={signIn} className="checkout-form"><label>Email<input type="email" required autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)}/></label><label>Password<input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)}/></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="checkout-button" disabled={busy}>{busy ? "Signing in…" : "Sign in to dashboard"}<span>→</span></button></form><small className="login-help">Create your mom&apos;s account in Supabase Auth and add her email to ADMIN_EMAILS.</small></section>;
}
