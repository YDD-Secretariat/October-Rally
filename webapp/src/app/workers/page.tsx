"use client";

import { useEffect, useRef, useState } from "react";
import { IdCard, Search, UserPlus, Check } from "lucide-react";
import { StationField } from "@/components/StationField";
import { BottomSheet, Field, PageTitle } from "@/components/form";
import { apiGet, apiPost } from "@/lib/api-client";
import { MEMBER_GROUPS } from "@/lib/types";
import type { RosterMatch } from "@/lib/types";

const GROUP_OPTIONS: [string, string][] = [
  ["Group 1", "Anthony Group 1"],
  ["Group 2", "Anthony Group 2"],
  ["Group 3", "Anthony Group 3"],
  ["Group 4", "Anthony Group 4"],
  ["Others", "Others / other locations"],
];

function suggestedGroup(station: string): string {
  const m = /^Anthony\s+Group\s+([1-4])$/i.exec(station.trim());
  if (m) return `Group ${m[1]}`;
  if (/^Visitors?$/i.test(station.trim())) return "Others";
  return "";
}

type Toast = { text: string; kind: "ok" | "err" | "warn" } | null;

export default function WorkersIndividualPage() {
  const [station, setStation] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RosterMatch[]>([]);
  const [hint, setHint] = useState("Start typing a name to search the roster.");
  const [sheet, setSheet] = useState<{ worker: RosterMatch | null } | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const onSearch = (q: string) => {
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setResults([]);
      setHint("Start typing a name to search the roster.");
      return;
    }
    setHint("Searching…");
    timer.current = setTimeout(async () => {
      try {
        const res = await apiGet<{ workers: RosterMatch[] }>("/api/workers/search", { q: q.trim() });
        setResults(res.workers || []);
        setHint(res.workers?.length ? "" : "No matching person found in the roster.");
      } catch {
        setHint("Search failed — check connection.");
      }
    }, 180);
  };

  const refreshResults = (updater: (w: RosterMatch) => RosterMatch) => setResults((rs) => rs.map(updater));

  return (
    <div className="mx-auto max-w-xl">
      <PageTitle icon={<IdCard size={20} />} title="Workers / Ministers (Individual)" subtitle="Roster search or walk-in registration" />

      <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800">
        Workers / Ministers only. Do not register a person here if they are already included in a bulk count.
      </div>

      <StationField onChange={setStation} placeholder="e.g. Desk 2 – Sade" />

      <div className="relative mb-3">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-10"
          placeholder="Type a name to search roster…"
          value={query}
          autoFocus
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      {hint && <p className="py-2 text-center text-sm text-slate-400">{hint}</p>}

      <div className="space-y-2">
        {results.map((w) => (
          <button
            key={w.rowId}
            onClick={() => (w.alreadyRegistered ? setToast({ text: `${w.fullName} was already registered.`, kind: "warn" }) : setSheet({ worker: w }))}
            className={`card flex w-full items-center justify-between gap-3 p-3.5 text-left transition ${w.alreadyRegistered ? "opacity-60" : "hover:border-[var(--text)]"}`}
          >
            <div className="min-w-0">
              <div className="truncate font-semibold text-[var(--text)]">{w.fullName}</div>
              <div className="truncate text-xs text-[var(--muted)]">{w.station || "No station listed"}</div>
              {w.details && <div className="truncate text-xs text-[var(--muted)]">{w.details}</div>}
            </div>
            <span className={`pill shrink-0 ${w.alreadyRegistered ? "!bg-green-100 !text-green-700" : ""}`}>
              {w.alreadyRegistered ? (
                <span className="flex items-center gap-1"><Check size={12} /> Registered</span>
              ) : (
                "Tap to register"
              )}
            </span>
          </button>
        ))}
      </div>

      <button className="btn-ghost btn-block mt-5 border-dashed !border-brand-300 !text-brand-700" onClick={() => setSheet({ worker: null })}>
        <UserPlus size={18} /> Not on the roster? Add a new person
      </button>

      {sheet && (
        <PersonSheet
          worker={sheet.worker}
          initialName={query}
          station={station}
          onClose={() => setSheet(null)}
          onToast={setToast}
          onRegistered={(worker) => {
            if (worker) refreshResults((w) => (w.rowId === worker.rowId ? { ...w, alreadyRegistered: true } : w));
            setSheet(null);
          }}
        />
      )}

      {toast && (
        <div
          className={`fixed inset-x-4 bottom-6 z-[60] mx-auto max-w-lg rounded-xl px-4 py-3.5 text-center text-sm font-semibold text-white shadow-xl ${
            toast.kind === "ok" ? "bg-green-600" : toast.kind === "warn" ? "bg-amber-500" : "bg-red-600"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

function PersonSheet({
  worker,
  initialName,
  station,
  onClose,
  onToast,
  onRegistered,
}: {
  worker: RosterMatch | null;
  initialName: string;
  station: string;
  onClose: () => void;
  onToast: (t: Toast) => void;
  onRegistered: (worker: RosterMatch | null) => void;
}) {
  const known = !!worker;
  const [name, setName] = useState(known ? worker!.fullName : initialName);
  const [phone, setPhone] = useState(known ? worker!.phone : "");
  const [group, setGroup] = useState(known ? suggestedGroup(worker!.station) : "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (name.trim().length < 2) return onToast({ text: "Enter a full name.", kind: "err" });
    if (cleanPhone.length < 10) return onToast({ text: "Enter a valid phone number.", kind: "err" });
    if (!MEMBER_GROUPS.includes(group as (typeof MEMBER_GROUPS)[number])) return onToast({ text: "Choose a group or Others.", kind: "err" });
    setBusy(true);
    const res = await apiPost<{ fullName?: string; duplicate?: boolean }>("/api/workers", {
      rowId: worker?.rowId,
      name: name.trim(),
      phone: cleanPhone,
      group,
      station,
      submittedBy: station,
    });
    setBusy(false);
    if (res.success) {
      onToast({ text: `${res.data?.fullName || name} registered in ${group}.`, kind: "ok" });
      onRegistered(worker);
    } else if (res.data?.duplicate) {
      onToast({ text: res.error || "Already registered.", kind: "warn" });
      onRegistered(worker);
    } else {
      onToast({ text: res.error || "Registration was not confirmed.", kind: "err" });
    }
  };

  return (
    <BottomSheet title={known ? "Register Worker / Minister" : "Add a new person"} onClose={onClose}>
      <p className="mb-3 text-sm text-slate-500">
        {known ? "Roster details are filled in. Complete the missing fields." : "Enter the person's details."}
      </p>
      <div className="space-y-3">
        <Field label="Full name" required>
          <input className="input" value={name} readOnly={known} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
        </Field>
        <Field label="Phone number" required>
          <input className="input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08012345678" />
        </Field>
        <Field label="Anthony group / category" required>
          <select className="input" value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="">Select a group…</option>
            {GROUP_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>
        {known && <p className="text-sm text-slate-400">Roster station: {worker!.station || "Not listed"}</p>}
      </div>
      <div className="mt-4 flex gap-2.5">
        <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
        <button className="btn-primary flex-1" onClick={save} disabled={busy}>{busy ? "Saving…" : "Register"}</button>
      </div>
    </BottomSheet>
  );
}
