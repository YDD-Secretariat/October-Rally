"use client";

import { useCallback, useEffect, useState } from "react";
import { Users } from "lucide-react";
import { StationField } from "@/components/StationField";
import { Message } from "@/components/ui";
import { PageTitle, RecentList } from "@/components/form";
import { CountBox } from "@/components/CountBox";
import { apiGet, apiPost } from "@/lib/api-client";
import { MEMBER_GROUPS } from "@/lib/types";

const GROUP_LABELS: Record<string, string> = {
  "Group 1": "Group 1",
  "Group 2": "Group 2",
  "Group 3": "Group 3",
  "Group 4": "Group 4",
  Others: "Others / Visitors (outside Anthony)",
};

interface RecentBulk {
  id: number;
  groupName: string;
  male: number;
  female: number;
  count: number;
  station: string;
}

export default function MembersPage() {
  const [station, setStation] = useState("");
  const [group, setGroup] = useState<string>("Group 1");
  const [male, setMale] = useState("0");
  const [female, setFemale] = useState("0");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [recent, setRecent] = useState<RecentBulk[]>([]);

  const total = (parseInt(male) || 0) + (parseInt(female) || 0);

  const loadRecent = useCallback(() => {
    apiGet<{ recent: RecentBulk[] }>("/api/members/recent", { limit: 8 })
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
    if (total <= 0) return setMsg({ kind: "err", text: "Enter male and/or female count (at least 1)." });
    setBusy(true);
    const res = await apiPost("/api/members", {
      group,
      male: parseInt(male) || 0,
      female: parseInt(female) || 0,
      station,
      submittedBy: station,
    });
    setBusy(false);
    if (res.success) {
      setMsg({
        kind: "ok",
        text: res.queued ? `Saved offline — sync pending.` : `Saved ${total} members (M:${male} / F:${female}) to ${group}.`,
      });
      setMale("0");
      setFemale("0");
      loadRecent();
    } else {
      setMsg({ kind: "err", text: res.error || "Could not save." });
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <PageTitle icon={<Users size={20} />} title="Register Members" subtitle="Bulk group headcount — no names needed" />
      <StationField onChange={setStation} placeholder="e.g. Desk 3 – Bola" />

      <form className="card p-5" onSubmit={submit}>
        <span className="label">Group</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {MEMBER_GROUPS.map((g) => (
            <button
              type="button"
              key={g}
              onClick={() => setGroup(g)}
              className={`chip ${group === g ? "chip-active" : ""} ${g === "Others" ? "col-span-2 sm:col-span-4" : ""}`}
            >
              {GROUP_LABELS[g]}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <CountBox label="Male Members" value={male} onChange={setMale} autoFocus />
          <CountBox label="Female Members" value={female} onChange={setFemale} />
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl bg-[var(--accent-weak)] px-4 py-3 font-semibold text-[var(--text)]">
          <span>{group} (M:{parseInt(male) || 0}, F:{parseInt(female) || 0})</span>
          <span className="tabular rounded-full bg-[#1a1a1a] px-3 py-1 text-white">{total} Total</span>
        </div>

        <button className="btn-primary btn-block mt-4" disabled={busy}>
          {busy ? "Saving…" : "Register Members"}
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
              <div className="font-bold text-slate-900">{m.groupName}</div>
              <div className="mt-0.5 text-xs text-slate-500">M:{m.male} | F:{m.female} {m.station ? `· ${m.station}` : ""}</div>
            </div>
            <span className="tabular rounded-full bg-[var(--accent-weak)] px-2.5 py-1 text-xs font-semibold text-[var(--text)]">{m.count} Total</span>
          </>
        )}
      />
    </div>
  );
}
