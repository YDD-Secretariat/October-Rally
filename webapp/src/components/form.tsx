import type { ReactNode } from "react";

export function PageTitle({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#1a1a1a] text-white">{icon}</span>
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
    </div>
  );
}

export function Fieldset({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="mb-5 border-0 p-0">
      <legend className="mb-2 text-sm font-semibold text-[var(--text)]">{legend}</legend>
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}

export function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <span className="label">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </div>
  );
}

export function RecentList<T>({
  title,
  items,
  empty,
  render,
}: {
  title: string;
  items: T[];
  empty: string;
  render: (item: T) => ReactNode;
}) {
  return (
    <section className="mt-8">
      <h3 className="mb-2.5 text-sm font-bold text-slate-600">{title}</h3>
      {items.length === 0 ? (
        <div className="card px-4 py-3 text-sm text-slate-400">{empty}</div>
      ) : (
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="card flex items-center justify-between gap-3 px-4 py-3 text-sm">
              {render(it)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-lg font-bold text-slate-900">{title}</h2>
        {children}
      </div>
    </div>
  );
}
