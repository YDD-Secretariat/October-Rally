"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, UtensilsCrossed } from "lucide-react";
import { apiGet } from "@/lib/api-client";
import { fmt } from "@/lib/format";
import type { Summary } from "@/lib/types";

export default function KitchenDashboardPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [status, setStatus] = useState("Connecting to registration data…");
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const summary = await apiGet<Summary>("/api/summary");
      setData(summary);
      setError(false);
      setStatus("Live data · Updated " + new Date().toLocaleTimeString());
    } catch (e) {
      setError(true);
      setStatus("Could not load the live count. " + (e instanceof Error ? e.message : ""));
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-[0.08em] text-[var(--muted)]">October Rally 2026 · Operations</div>
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#1a1a1a] text-white"><UtensilsCrossed size={20} /></span>
        <h1 className="text-2xl font-semibold text-[var(--text)]">Kitchen Dashboard</h1>
      </div>

      <section className="card flex items-center justify-between gap-4 p-6 sm:p-8">
        <div>
          <span className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">Grand total · registered attendance</span>
          <div className="tabular mt-2 text-[56px] font-medium leading-[1.05] text-[var(--text)] sm:text-6xl">{data ? fmt(data.grandTotal) : "—"}</div>
          <p className="mt-1.5 text-sm text-[var(--muted)]">Schools + Members + Visitors + Workers / Ministers</p>
        </div>
        <UtensilsCrossed size={64} className="hidden shrink-0 text-[var(--border)] sm:block" />
      </section>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Students · Schools" value={data?.studentTotal} />
        <Metric label="Members" value={data?.memberTotal} />
        <Metric label="Visitors" value={data?.visitorTotal} />
        <Metric label="Workers / Ministers" value={data?.workerTotal} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Panel title="Schools" pill={`${data?.schools.length ?? 0} schools`}>
          {(data?.schools || []).length === 0 ? (
            <Empty>No schools registered yet.</Empty>
          ) : (
            (data?.schools || []).map((sc, i) => <Row key={i} label={sc.name} value={fmt(sc.total)} />)
          )}
        </Panel>

        <div className="space-y-4">
          <Panel title="Members" pill="Groups 1–4 + Others">
            {(data?.groups || []).length === 0 ? (
              <Empty>No members registered yet.</Empty>
            ) : (
              (data?.groups || []).map((g, i) => <Row key={i} label={g.name} value={fmt(g.total)} />)
            )}
          </Panel>

          <Panel title="Workers / Ministers" pill={`${fmt(data?.workers.total ?? 0)} total`} tone="amber">
            <Row label="Bulk registration" value={fmt(data?.workers.bulkTotal ?? 0)} />
            <Row label="Individual registration" value={fmt(data?.workers.individualTotal ?? 0)} />
            <Row label="Bulk male / female" value={`${fmt(data?.workers.bulkMale ?? 0)} / ${fmt(data?.workers.bulkFemale ?? 0)}`} />
          </Panel>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <span className={`text-sm ${error ? "text-red-600" : "text-slate-400"}`}>{status}</span>
        <button className="btn-ghost !py-2 !text-xs" onClick={refresh}><RefreshCw size={14} /> Refresh now</button>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value?: number }) {
  return (
    <div className="card p-5">
      <div className="tabular text-[28px] font-medium leading-none text-[var(--text)]">{value == null ? "—" : fmt(value)}</div>
      <div className="mt-2 text-[13px] text-[var(--muted)]">{label}</div>
    </div>
  );
}

function Panel({ title, pill, children }: { title: string; pill: string; tone?: "teal" | "amber"; children: React.ReactNode }) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-5 pb-3 pt-4">
        <h2 className="text-base font-semibold text-[var(--text)]">{title}</h2>
        <span className="pill">{pill}</span>
      </div>
      <div className="px-5 pb-3">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] py-3 text-sm first:border-t-0">
      <span className="min-w-0 break-words text-[var(--muted)]">{label}</span>
      <b className="tabular shrink-0 font-semibold text-[var(--text)]">{value}</b>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-4 text-sm text-[var(--muted)]">{children}</div>;
}
