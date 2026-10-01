"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  School,
  Users,
  HeartHandshake,
  UserCheck,
  IdCard,
  Camera,
  UtensilsCrossed,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { apiGet } from "@/lib/api-client";
import { fmt } from "@/lib/format";
import type { Summary } from "@/lib/types";

const CARDS = [
  { href: "/register", title: "Register a School", desc: "Headcount by male / female for registration stations", icon: School, badge: "HEADCOUNT" },
  { href: "/members", title: "Register Members", desc: "Group headcount by male & female — no names needed", icon: Users, badge: "BULK" },
  { href: "/visitors", title: "Register Visitors", desc: "Added to Members → Others / Visitors", icon: HeartHandshake, badge: "M / F" },
  { href: "/workers-bulk", title: "Workers / Ministers", desc: "Bulk count — excludes people registered individually", icon: UserCheck, badge: "BULK" },
  { href: "/workers", title: "Workers / Ministers", desc: "Individual registration — roster search or walk-in", icon: IdCard, badge: "INDIVIDUAL" },
  { href: "/upload", title: "Upload Attendance Sheets", desc: "Photo uploader with automatic compression", icon: Camera, badge: null },
  { href: "/dashboard/kitchen", title: "Kitchen Dashboard", desc: "Schools, Members, and Workers / Ministers", icon: UtensilsCrossed, badge: null },
  { href: "/dashboard", title: "Live Dashboard", desc: "Real-time attendance metrics & 1-click CSV reports", icon: BarChart3, badge: "LIVE" },
];

export default function HomePage() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    let active = true;
    const load = () =>
      apiGet<Summary>("/api/summary")
        .then((s) => active && setSummary(s))
        .catch(() => {});
    load();
    const t = setInterval(load, 12000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  const snap = [
    { label: "Grand Total", value: summary?.grandTotal },
    { label: "Students", value: summary?.studentTotal },
    { label: "Members", value: summary?.memberTotal },
    { label: "Workers / Ministers", value: summary?.workerTotal },
  ];

  return (
    <div>
      <section className="card p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">October 1st · Anthony, Lagos</p>
        <h1 className="mt-1.5 text-3xl font-semibold text-[var(--text)] sm:text-4xl">October Rally 2026</h1>
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-[var(--border)] pt-6 sm:grid-cols-4 sm:gap-y-0">
          {snap.map((s, i) => (
            <div key={s.label} className={i === 0 ? "" : "sm:border-l sm:border-[var(--border)] sm:pl-6"}>
              <div className="tabular text-[28px] font-medium leading-none text-[var(--text)]">
                {s.value == null ? "—" : fmt(s.value)}
              </div>
              <div className="mt-2 text-[13px] text-[var(--muted)]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.href + c.title}
              href={c.href}
              className="card group flex items-center gap-4 p-4 transition hover:border-[var(--text)]"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--accent-weak)] text-[var(--text)]">
                <Icon size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-semibold text-[var(--text)]">
                  {c.title}
                  {c.badge && <span className="pill">{c.badge}</span>}
                </span>
                <span className="mt-0.5 block text-sm text-[var(--muted)]">{c.desc}</span>
              </span>
              <ArrowRight size={18} className="text-[var(--border)] transition group-hover:translate-x-0.5 group-hover:text-[var(--text)]" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
