"use client";

/** Large numeric headcount input used by the member / worker / visitor forms. */
export function CountBox({
  label,
  value,
  onChange,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <div className="card p-3.5 text-center">
      <label className="mb-1.5 block text-[13px] font-bold text-slate-500">{label}</label>
      <input
        className="w-full rounded-lg border border-[var(--border)] bg-white py-2 text-center text-3xl font-semibold tabular text-[var(--text)] outline-none focus:border-[var(--text)] focus:ring-2 focus:ring-black/5"
        type="number"
        inputMode="numeric"
        min={0}
        autoFocus={autoFocus}
        value={value}
        onFocus={(e) => e.target.select()}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
