"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { School } from "lucide-react";
import { StationField } from "@/components/StationField";
import { Message } from "@/components/ui";
import { BottomSheet, Field, Fieldset, PageTitle, RecentList } from "@/components/form";
import { apiGet, apiPost } from "@/lib/api-client";
import { fmt, timeOnly } from "@/lib/format";
import type { DuplicateMatch, SchoolRow } from "@/lib/types";

export default function RegisterSchoolPage() {
  const [station, setStation] = useState("");
  const [form, setForm] = useState({
    schoolName: "",
    location: "",
    coordinatorName: "",
    coordinatorPhone: "",
    coordinatorLocation: "",
    male: "0",
    female: "0",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [dupes, setDupes] = useState<DuplicateMatch[] | null>(null);
  const [recent, setRecent] = useState<SchoolRow[]>([]);

  const total = (parseInt(form.male) || 0) + (parseInt(form.female) || 0);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const loadRecent = useCallback(() => {
    apiGet<{ recent: SchoolRow[] }>("/api/schools/recent", { limit: 8 })
      .then((r) => setRecent(r.recent || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadRecent();
    const t = setInterval(loadRecent, 10000);
    return () => clearInterval(t);
  }, [loadRecent]);

  const submit = async (confirmedNotDuplicate: boolean) => {
    setBusy(true);
    setMsg(null);
    const payload = {
      ...form,
      male: parseInt(form.male) || 0,
      female: parseInt(form.female) || 0,
      station,
      confirmedNotDuplicate,
    };
    const res = await apiPost<{ duplicate?: boolean; matches?: DuplicateMatch[]; schoolName?: string }>(
      "/api/schools",
      payload,
    );
    setBusy(false);

    if (res.data?.duplicate) {
      setDupes(res.data.matches || []);
      return;
    }
    if (res.success) {
      setMsg({ kind: "ok", text: res.queued ? `Saved offline — sync pending.` : `Registered: ${form.schoolName}` });
      setForm({ schoolName: "", location: "", coordinatorName: "", coordinatorPhone: "", coordinatorLocation: "", male: "0", female: "0" });
      loadRecent();
    } else {
      setMsg({ kind: "err", text: res.error || "Could not register." });
    }
  };

  const nameRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mx-auto max-w-xl">
      <PageTitle icon={<School size={20} />} title="Register a School" subtitle="Student headcount by registration station" />
      <StationField onChange={setStation} placeholder="e.g. Station 1 – Bola" />

      <form
        className="card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit(false);
        }}
      >
        <Fieldset legend="School details">
          <Field label="School name" required>
            <input ref={nameRef} className="input" required value={form.schoolName} onChange={(e) => set("schoolName", e.target.value)} placeholder="e.g. Anthony Girls Secondary School" />
          </Field>
          <Field label="Location / area">
            <input className="input" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Maryland, Lagos" />
          </Field>
        </Fieldset>

        <Fieldset legend="Coordinator">
          <Field label="Coordinator's full name" required>
            <input className="input" required value={form.coordinatorName} onChange={(e) => set("coordinatorName", e.target.value)} placeholder="e.g. Mrs. Adebayo" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone number" required>
              <input className="input" inputMode="tel" required value={form.coordinatorPhone} onChange={(e) => set("coordinatorPhone", e.target.value)} placeholder="080…" />
            </Field>
            <Field label="Details (optional)">
              <input className="input" value={form.coordinatorLocation} onChange={(e) => set("coordinatorLocation", e.target.value)} placeholder="Optional" />
            </Field>
          </div>
        </Fieldset>

        <Fieldset legend="Students (headcount)">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Male students">
              <input className="input" type="number" inputMode="numeric" min={0} value={form.male} onChange={(e) => set("male", e.target.value)} />
            </Field>
            <Field label="Female students">
              <input className="input" type="number" inputMode="numeric" min={0} value={form.female} onChange={(e) => set("female", e.target.value)} />
            </Field>
          </div>
          <div className="mt-2 flex items-center justify-between rounded-xl bg-[var(--accent-weak)] px-4 py-3 font-semibold text-[var(--text)]">
            <span>Total students</span>
            <span className="tabular text-lg">{total}</span>
          </div>
        </Fieldset>

        <button className="btn-primary btn-block mt-2" disabled={busy}>
          {busy ? "Submitting…" : "Register School"}
        </button>
        {msg && <Message kind={msg.kind}>{msg.text}</Message>}
      </form>

      <RecentList
        title="Recently registered schools"
        items={recent}
        empty="No schools registered yet."
        render={(s) => (
          <>
            <div>
              <div className="font-bold text-slate-900">{s.schoolName}</div>
              <div className="mt-0.5 text-xs text-slate-500">
                {s.station || "Station —"} · M:{s.male} / F:{s.female} (Total: {s.total})
              </div>
            </div>
            <div className="text-xs text-slate-400">{timeOnly(s.createdAt)}</div>
          </>
        )}
      />

      {dupes && (
        <BottomSheet title="Possible duplicate school" onClose={() => setDupes(null)}>
          <p className="text-sm text-slate-500">This school looks similar to one already registered:</p>
          <div className="mt-3 space-y-2">
            {dupes.map((m, i) => (
              <div key={i} className="rounded-xl border border-[var(--border)] p-3 text-sm">
                <b className="block">{m.schoolName}</b>
                <span className="font-bold text-red-600">{m.similarity}% similar</span>
                <div className="mt-1 text-slate-500">
                  {m.coordinatorName || "—"} · {m.coordinatorPhone || "—"} — {fmt(m.total)} students (M:{m.male}/F:{m.female})
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2.5">
            <button className="btn-ghost flex-1" onClick={() => setDupes(null)}>Cancel</button>
            <button
              className="btn-primary flex-1 !bg-red-600 hover:!bg-red-700"
              onClick={() => {
                setDupes(null);
                submit(true);
              }}
            >
              Different school — proceed
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
