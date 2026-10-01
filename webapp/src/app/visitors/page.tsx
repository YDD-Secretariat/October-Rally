"use client";

import { useCallback, useEffect, useState } from "react";
import { HeartHandshake } from "lucide-react";
import { StationField } from "@/components/StationField";
import { Message } from "@/components/ui";
import { PageTitle, Field, RecentList } from "@/components/form";
import { CountBox } from "@/components/CountBox";
import { apiGet, apiPost, getStation } from "@/lib/api-client";
import { timeOnly } from "@/lib/format";
import type { VisitorRow } from "@/lib/types";

export default function VisitorsPage() {
  const [station, setStation] = useState("");
  const [male, setMale] = useState("0");
  const [female, setFemale] = useState("0");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [recent, setRecent] = useState<VisitorRow[]>([]);

  const total = (parseInt(male) || 0) + (parseInt(female) || 0);

  const loadRecent = useCallback(() => {
    apiGet<{ recent: VisitorRow[] }>("/api/visitors/recent", { limit: 8 })
      .then((r) => setRecent(r.recent || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadRecent();
    const t = setInterval(loadRecent, 10000);
    return () => clearInterval(t);
  }, [loadRecent]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (total <= 0) return setMsg({ kind: "err", text: "Please enter at least 1 male or female visitor." });
    setBusy(true);
    const res = await apiPost("/api/visitors", {
      category: "Visitors",
      male: parseInt(male) || 0,
      female: parseInt(female) || 0,
      notes,
      station: station || getStation(),
    });
    setBusy(false);
    if (res.success) {
      setMsg({ kind: "ok", text: res.queued ? "Saved offline — sync pending." : `Registered ${total} visitor(s) (M:${male}, F:${female}).` });
      setMale("0");
      setFemale("0");
      setNotes("");
      loadRecent();
    } else {
      setMsg({ kind: "err", text: res.error || "Could not save visitors." });
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <PageTitle icon={<HeartHandshake size={20} />} title="Register Visitors" subtitle="Counted under Members → Others / Visitors" />
      <StationField onChange={setStation} placeholder="e.g. Entrance desk" />

      <form className="card p-5" onSubmit={submit}>
        <div className="grid grid-cols-2 gap-3">
          <CountBox label="Male Visitors" value={male} onChange={setMale} autoFocus />
          <CountBox label="Female Visitors" value={female} onChange={setFemale} />
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl bg-[var(--accent-weak)] px-4 py-3 font-semibold text-[var(--text)]">
          <span>Total Visitors</span>
          <span className="tabular rounded-full bg-[#1a1a1a] px-3.5 py-1 text-white">{total}</span>
        </div>

        <div className="mt-4">
          <Field label="Notes / location / source (optional)">
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Guests from Anthony / Invited" />
          </Field>
        </div>

        <button className="btn-primary btn-block mt-4" disabled={busy}>
          {busy ? "Saving…" : "Register Visitors"}
        </button>
        {msg && <Message kind={msg.kind}>{msg.text}</Message>}
      </form>

      <RecentList
        title="Recently registered visitors"
        items={recent}
        empty="No visitors registered yet."
        render={(v) => (
          <>
            <div>
              <div className="font-bold text-slate-900">{v.notes || "Visitors"}</div>
              <div className="mt-0.5 text-xs text-slate-500">M:{v.male} | F:{v.female} · {timeOnly(v.createdAt)}</div>
            </div>
            <span className="tabular rounded-full bg-[var(--accent-weak)] px-2.5 py-1 text-xs font-semibold text-[var(--text)]">{v.total} Total</span>
          </>
        )}
      />
    </div>
  );
}
