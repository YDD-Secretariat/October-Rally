"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { Message } from "@/components/ui";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        router.replace(next);
        router.refresh();
      } else {
        setError(data.error || "Incorrect passcode.");
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card w-full max-w-sm p-6" onSubmit={submit}>
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white">
          <Lock size={20} />
        </span>
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">October Rally 2026</h1>
          <p className="text-sm text-slate-500">Enter the event passcode to continue</p>
        </div>
      </div>
      <label className="label" htmlFor="passcode">Passcode</label>
      <input
        id="passcode"
        className="input"
        type="password"
        autoFocus
        autoComplete="current-password"
        value={passcode}
        onChange={(e) => setPasscode(e.target.value)}
        placeholder="••••••••"
      />
      <button className="btn-primary btn-block mt-4" disabled={busy || !passcode}>
        {busy ? "Checking…" : "Unlock"}
      </button>
      {error && <Message kind="err">{error}</Message>}
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
