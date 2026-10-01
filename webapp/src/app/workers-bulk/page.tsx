"use client";

import { useCallback, useEffect, useState } from "react";
import { UserCheck } from "lucide-react";
import { StationField } from "@/components/StationField";
import { Message } from "@/components/ui";
import { PageTitle, RecentList } from "@/components/form";
import { CountBox } from "@/components/CountBox";
import { apiGet, apiPost } from "@/lib/api-client";

interface RecentWorkerBulk {
  id: number;
  male: number;
  female: number;
  total: number;
  station: string;
}

export default function WorkersBulkPage() {
  const [station, setStation] = useState("");
  const [male, setMale] = useState("0");
  const [female, setFemale] = useState("0");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [recent, setRecent] = useState<RecentWorkerBulk[]>([]);

  const total = (parseInt(male) || 0) + (parseInt(female) || 0);

  const loadRecent = useCallback(() => {
    apiGet<{ recent: RecentWorkerBulk[] }>("/api/workers/bulk/recent", { limit: 8 })
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
    if (!confirm) return setMsg({ kind: "err", text: "Confirm that this count excludes individual registrations." });
    if (total <= 0) return setMsg({ kind: "err", text: "Enter male and/or female count (at least 1)." });
    setBusy(true);
    const res = await apiPost("/api/workers/bulk", {
      confirmedExcludesIndividuals: confirm,
      male: parseInt(male) || 0,
      female: parseInt(female) || 0,
      station,
      submittedBy: station,
    });
    setBusy(false);
    if (res.success) {
      setMsg({ kind: "ok", text: res.queued ? "Saved offline — sync pending." : `Saved ${total} workers / ministers.` });
      setMale("0");
      setFemale("0");
      setConfirm(false);
      loadRecent();
    } else {
      setMsg({ kind: "err", text: res.error || "Could not save." });
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <PageTitle icon={<UserCheck size={20} />} title="Workers / Ministers (Bulk)" subtitle="Headcount for people not registered individually" />
      <StationField onChange={setStation} placeholder="e.g. Desk 3 – Bola" />

      <form className="card p-5" onSubmit={submit}>
        <div className="grid grid-cols-2 gap-3">
          <CountBox label="Male Workers / Ministers" value={male} onChange={setMale} autoFocus />
          <CountBox label="Female Workers / Ministers" value={female} onChange={setFemale} />
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl bg-[var(--accent-weak)] px-4 py-3 font-semibold text-[var(--text)]">
          <span>Workers / Ministers (M:{parseInt(male) || 0}, F:{parseInt(female) || 0})</span>
          <span className="tabular rounded-full bg-[#1a1a1a] px-3 py-1 text-white">{total} Total</span>
        </div>

        <label className="mt-4 flex items-start gap-2.5 text-sm leading-relaxed text-slate-600">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
          <span>This bulk count excludes everyone already registered individually. I will not register these people individually afterwards.</span>
        </label>

        <button className="btn-primary btn-block mt-4" disabled={busy}>
          {busy ? "Saving…" : "Register Workers / Ministers"}
        </button>
        {msg && <Message kind={msg.kind}>{msg.text}</Message>}
      </form>

      <RecentList
        title="Recently registered"
        items={recent}
        empty="No entries yet."
        render={(m) => (
          <>
            <div>
              <div className="font-bold text-slate-900">Workers / Ministers</div>
              <div className="mt-0.5 text-xs text-slate-500">M:{m.male} | F:{m.female} {m.station ? `· ${m.station}` : ""}</div>
            </div>
            <span className="tabular rounded-full bg-[var(--accent-weak)] px-2.5 py-1 text-xs font-semibold text-[var(--text)]">{m.total} Total</span>
          </>
        )}
      />
    </div>
  );
}
