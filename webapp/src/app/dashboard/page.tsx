"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, FileSpreadsheet, School, Users, HeartHandshake, Search } from "lucide-react";
import { StatCard, SectionHeading, GenderBar } from "@/components/ui";
import { BottomSheet } from "@/components/form";
import { apiGet } from "@/lib/api-client";
import { downloadCsv, fmt, timeOnly, dateTime, todayStamp } from "@/lib/format";
import type { DashboardPayload, SchoolRow } from "@/lib/types";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string>("—");
  const [offline, setOffline] = useState(false);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<SchoolRow | null>(null);
  const lastHash = useRef("");

  const refresh = useCallback(async () => {
    try {
      const payload = await apiGet<DashboardPayload>("/api/dashboard");
      const hash = JSON.stringify(payload);
      if (hash !== lastHash.current) {
        lastHash.current = hash;
        setData(payload);
      }
      setOffline(false);
      setUpdatedAt(new Date().toLocaleTimeString());
    } catch {
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    let timer = setInterval(refresh, 15000);
    const onVisibility = () => {
      clearInterval(timer);
      if (!document.hidden) {
        refresh();
        timer = setInterval(refresh, 15000);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  const s = data?.summary;
  const stats = data?.stats;
  const bulk = data?.bulk;
  const workers = data?.workers;
  const visitors = data?.visitors;

  const filteredSchools = useMemo(() => {
    const list = data?.schools || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (sc) =>
        sc.schoolName.toLowerCase().includes(q) ||
        (sc.location || "").toLowerCase().includes(q) ||
        (sc.coordinatorName || "").toLowerCase().includes(q),
    );
  }, [data?.schools, search]);

  /* ---- CSV exports ---- */
  const exportSummary = () =>
    downloadCsv(`October_Rally_Summary_${todayStamp()}.csv`, [
      ["OCTOBER RALLY 2026 — EVENT ATTENDANCE REPORT"],
      ["Generated At", new Date().toLocaleString()],
      [],
      ["CATEGORY", "MALE", "FEMALE", "TOTAL"],
      ["Students (Schools)", stats?.totalMale ?? 0, stats?.totalFemale ?? 0, stats?.totalStudents ?? 0],
      ["Members (Bulk)", bulk?.totalMale ?? 0, bulk?.totalFemale ?? 0, bulk?.totalMembers ?? 0],
      ["Visitors", visitors?.totalMale ?? 0, visitors?.totalFemale ?? 0, visitors?.totalVisitors ?? 0],
      ["Workers / Ministers — Bulk", workers?.bulkMale ?? 0, workers?.bulkFemale ?? 0, workers?.bulkTotal ?? 0],
      ["Workers / Ministers — Individual", "—", "—", workers?.individualTotal ?? 0],
      [],
      ["GRAND TOTAL ATTENDANCE", "", "", s?.grandTotal ?? 0],
    ]);

  const exportSchools = () =>
    downloadCsv(`October_Rally_Schools_${todayStamp()}.csv`, [
      ["School Name", "Location", "Coordinator", "Phone", "Male", "Female", "Total", "Station", "Registered At"],
      ...(data?.schools || []).map((sc) => [sc.schoolName, sc.location, sc.coordinatorName, sc.coordinatorPhone, sc.male, sc.female, sc.total, sc.station, sc.createdAt]),
    ]);

  const exportMembers = () =>
    downloadCsv(`October_Rally_Members_${todayStamp()}.csv`, [
      ["Group", "Male", "Female", "Total"],
      ...(bulk?.groups || []).map((g) => [g.name, g.male, g.female, g.total]),
    ]);

  const exportVisitors = () =>
    downloadCsv(`October_Rally_Visitors_${todayStamp()}.csv`, [
      ["Category", "Male", "Female", "Total", "Notes", "Station", "Registered At"],
      ...(visitors?.visitors || []).map((v) => [v.category, v.male, v.female, v.total, v.notes, v.station, v.createdAt]),
    ]);

  return (
    <div>
      {/* Header row */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-slate-900">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" />
            Live Dashboard
          </h1>
          <p className="text-sm text-slate-500">Anthony, Lagos · Last updated: {offline ? "Cached (offline)" : updatedAt}</p>
        </div>
      </div>

      {/* Grand hero */}
      <section className="card flex flex-col gap-7 p-6 sm:p-8">
        <div>
          <div className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">Grand total attendance, all channels</div>
          <div className="tabular mt-2 text-[56px] font-medium leading-[1.05] sm:text-6xl">{fmt(s?.grandTotal ?? 0)}</div>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-[var(--border)] pt-6 sm:grid-cols-4 sm:gap-y-0">
          <HeroTile first value={s?.studentTotal} label="Students (Schools)" />
          <HeroTile value={s?.memberTotal} label="Members (Bulk)" />
          <HeroTile value={s?.workerTotal} label="Workers / Ministers" />
          <HeroTile value={s?.visitorTotal} label="Visitors & Guests" />
        </div>
        <GenderBar male={s?.totalMale ?? 0} female={s?.totalFemale ?? 0} />
      </section>

      {/* Export bar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-[var(--muted)]">Data actions &amp; backups</span>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={exportSummary}><FileSpreadsheet size={16} /> Full Summary</button>
          <button className="btn-ghost" onClick={exportSchools}><Download size={16} /> Schools</button>
          <button className="btn-ghost" onClick={exportMembers}><Download size={16} /> Members</button>
          <button className="btn-ghost" onClick={exportVisitors}><Download size={16} /> Visitors</button>
        </div>
      </div>

      {/* Visitors */}
      <SectionHeading
        title="Visitors"
        right={<span className="text-sm text-[var(--muted)]">{fmt(visitors?.totalVisitors ?? 0)} total</span>}
      />
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Visitors" value={visitors?.totalVisitors ?? 0} />
        <StatCard label="Male Visitors" value={visitors?.totalMale ?? 0} accent="male" />
        <StatCard label="Female Visitors" value={visitors?.totalFemale ?? 0} accent="female" />
      </div>
      <Table head={["Time", "Male", "Female", "Total", "Notes"]} className="mt-3">
        {(visitors?.visitors || []).length === 0 ? (
          <EmptyRow cols={5} text="No visitors registered yet." />
        ) : (
          (visitors?.visitors || []).map((v) => (
            <tr key={v.id} className="border-t border-[var(--border)]">
              <Td>{timeOnly(v.createdAt)}</Td>
              <Td num>{v.male}</Td>
              <Td num>{v.female}</Td>
              <Td num bold>{v.total}</Td>
              <Td>{v.notes || <span className="text-slate-400">—</span>}</Td>
            </tr>
          ))
        )}
      </Table>

      {/* Members */}
      <SectionHeading
        title="Members"
        right={<span className="text-sm text-[var(--muted)]">{fmt(bulk?.totalMembers ?? 0)} members</span>}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Members" value={bulk?.totalMembers ?? 0} />
        <StatCard label="Male Members" value={bulk?.totalMale ?? 0} accent="male" />
        <StatCard label="Female Members" value={bulk?.totalFemale ?? 0} accent="female" />
        <StatCard label="Active Groups" value={bulk?.groups.length ?? 0} />
      </div>
      <Table head={["Group", "Male", "Female", "Total"]} className="mt-3">
        {(bulk?.groups || []).length === 0 ? (
          <EmptyRow cols={4} text="No members registered yet." />
        ) : (
          <>
            {(bulk?.groups || []).map((g) => (
              <tr key={g.name} className="border-t border-[var(--border)]">
                <Td bold>{g.name}</Td>
                <Td num>{g.male}</Td>
                <Td num>{g.female}</Td>
                <Td num bold>{g.total}</Td>
              </tr>
            ))}
            <tr className="border-t border-[var(--border)] bg-[var(--accent-weak)] font-semibold">
              <Td bold>Total Members</Td>
              <Td num>{bulk?.totalMale ?? 0}</Td>
              <Td num>{bulk?.totalFemale ?? 0}</Td>
              <Td num>{bulk?.totalMembers ?? 0}</Td>
            </tr>
          </>
        )}
      </Table>

      {/* Workers */}
      <SectionHeading
        title="Workers / Ministers"
        right={<span className="text-sm text-[var(--muted)]">{fmt(workers?.total ?? 0)} registered</span>}
      />
      <div className="card divide-y divide-[var(--border)]">
        <StationRow label="Bulk registration" value={fmt(workers?.bulkTotal ?? 0)} />
        <StationRow label="Bulk male / female" value={`${fmt(workers?.bulkMale ?? 0)} / ${fmt(workers?.bulkFemale ?? 0)}`} />
        <StationRow label="Individual registration" value={fmt(workers?.individualTotal ?? 0)} />
      </div>

      {/* Schools */}
      <SectionHeading
        title="Schools Registered"
        right={<span className="text-sm text-[var(--muted)]">{fmt(stats?.totalSchools ?? 0)} schools</span>}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Students" value={stats?.totalStudents ?? 0} />
        <StatCard label="Schools" value={stats?.totalSchools ?? 0} />
        <StatCard label="Male Students" value={stats?.totalMale ?? 0} accent="male" />
        <StatCard label="Female Students" value={stats?.totalFemale ?? 0} accent="female" />
      </div>
      <div className="relative mt-3">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input pl-10" placeholder="Search school, location, or coordinator…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Table head={["School", "Location", "Male", "Female", "Total", "Station", "Time"]} className="mt-3">
        {filteredSchools.length === 0 ? (
          <EmptyRow cols={7} text="No schools registered yet." />
        ) : (
          filteredSchools.map((sc) => (
            <tr key={sc.id} className="cursor-pointer border-t border-[var(--border)] hover:bg-[var(--accent-weak)]" onClick={() => setDetail(sc)}>
              <Td bold>{sc.schoolName}</Td>
              <Td>{sc.location || "—"}</Td>
              <Td num>{sc.male}</Td>
              <Td num>{sc.female}</Td>
              <Td num bold>{sc.total}</Td>
              <Td>{sc.station || "—"}</Td>
              <Td>{timeOnly(sc.createdAt)}</Td>
            </tr>
          ))
        )}
      </Table>

      {detail && (
        <BottomSheet title={detail.schoolName} onClose={() => setDetail(null)}>
          <div className="mt-1 space-y-0">
            <DetailRow label="Location" value={detail.location || "—"} />
            <DetailRow label="Coordinator" value={detail.coordinatorName || "—"} />
            <DetailRow label="Phone" value={detail.coordinatorPhone || "—"} />
            <DetailRow label="Male students" value={fmt(detail.male)} />
            <DetailRow label="Female students" value={fmt(detail.female)} />
            <DetailRow label="Total students" value={fmt(detail.total)} bold />
            <DetailRow label="Station" value={detail.station || "—"} />
            <DetailRow label="Registered" value={dateTime(detail.createdAt)} />
            <DetailRow label="Photos uploaded" value={fmt(detail.photoCount)} />
          </div>
          <button className="btn-primary btn-block mt-4" onClick={() => setDetail(null)}>Close</button>
        </BottomSheet>
      )}
    </div>
  );
}

/* ---- presentational helpers ---- */

function HeroTile({ value, label, first }: { value?: number; label: string; first?: boolean }) {
  return (
    <div className={first ? "" : "sm:border-l sm:border-[var(--border)] sm:pl-6"}>
      <div className="tabular text-[28px] font-medium leading-none text-[var(--text)]">{fmt(value ?? 0)}</div>
      <div className="mt-2 text-[13px] text-[var(--muted)]">{label}</div>
    </div>
  );
}

function Table({ head, children, className = "" }: { head: string[]; children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden overflow-x-auto rounded-2xl border border-[var(--border)] bg-white ${className}`}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            {head.map((h, i) => (
              <th key={h} className={`px-4 py-3.5 text-[12px] font-medium uppercase tracking-[0.05em] text-[var(--muted)] ${i === 0 ? "text-left" : "text-center"}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Td({ children, num, bold }: { children: React.ReactNode; num?: boolean; bold?: boolean }) {
  return <td className={`px-4 py-3 ${num ? "text-center tabular" : "text-left"} ${bold ? "font-semibold text-[var(--text)]" : "text-[var(--muted)]"}`}>{children}</td>;
}

function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-10 text-center text-[var(--muted)]">{text}</td>
    </tr>
  );
}

function StationRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      <b className="tabular font-semibold text-[var(--text)]">{value}</b>
    </div>
  );
}

function DetailRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] py-2.5 text-sm last:border-b-0">
      <span className="text-[var(--muted)]">{label}</span>
      <span className={bold ? "font-semibold text-[var(--text)]" : "text-[var(--text)]"}>{value}</span>
    </div>
  );
}
