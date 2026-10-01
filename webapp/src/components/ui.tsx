import type { ReactNode } from "react";
import { fmt } from "@/lib/format";

export function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: "male" | "female" | "brand";
}) {
  const valueColor =
    accent === "male"
      ? "text-[var(--male)]"
      : accent === "female"
        ? "text-[var(--female)]"
        : "text-[var(--text)]";
  return (
    <div className="card p-5">
      <div className={`tabular text-[28px] font-medium leading-none ${valueColor}`}>
        {typeof value === "number" ? fmt(value) : value}
      </div>
      <div className="mt-2 text-[13px] text-[var(--muted)]">{label}</div>
    </div>
  );
}

export function SectionHeading({
  title,
  badge,
  right,
}: {
  title: string;
  badge?: { label: string; className: string };
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 mt-10 flex items-baseline justify-between gap-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--text)]">
        {title}
        {badge && <span className={`pill ${badge.className}`}>{badge.label}</span>}
      </h2>
      {right}
    </div>
  );
}

export function GenderBar({ male, female }: { male: number; female: number }) {
  const total = male + female || 1;
  const malePct = Math.round((male / total) * 100);
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-[var(--border)]">
        <div className="bg-[var(--male)] transition-[width] duration-500" style={{ width: `${malePct}%` }} />
        <div className="bg-[var(--female)] transition-[width] duration-500" style={{ width: `${100 - malePct}%` }} />
      </div>
      <div className="mt-2.5 flex justify-between text-[13px] text-[var(--muted)]">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[var(--male)]" />
          Male: {fmt(male)} ({malePct}%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[var(--female)]" />
          Female: {fmt(female)} ({100 - malePct}%)
        </span>
      </div>
    </div>
  );
}

export function Message({ kind, children }: { kind: "ok" | "err" | null; children: ReactNode }) {
  if (!kind) return null;
  const cls =
    kind === "ok"
      ? "bg-green-50 text-green-800 border-green-200"
      : "bg-red-50 text-red-800 border-red-200";
  return (
    <div className={`mt-3.5 rounded-xl border px-3.5 py-3 text-sm font-medium ${cls}`}>
      {children}
    </div>
  );
}
