"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  School,
  Users,
  UserCheck,
  IdCard,
  HeartHandshake,
  Camera,
  LayoutDashboard,
  Menu,
  X,
} from "lucide-react";

const LINKS = [
  { href: "/", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/register", label: "Schools", icon: School },
  { href: "/members", label: "Members", icon: Users },
  { href: "/workers-bulk", label: "Workers (Bulk)", icon: UserCheck },
  { href: "/workers", label: "Workers (Individual)", icon: IdCard },
  { href: "/visitors", label: "Visitors", icon: HeartHandshake },
  { href: "/upload", label: "Uploads", icon: Camera },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

export function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5 font-semibold text-[var(--text)]">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#1a1a1a] text-xs font-bold text-white">OR</span>
          <span className="hidden sm:inline">October Rally 2026</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {LINKS.filter((l) => l.href !== "/").map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive(l.href, l.exact)
                  ? "bg-[#1a1a1a] text-white"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          aria-label="Toggle navigation"
          className="btn-ghost lg:hidden !px-2.5 !py-2"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <nav className="grid grid-cols-2 gap-1 border-t border-[var(--border)] bg-white px-4 py-3 lg:hidden">
          {LINKS.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${
                  isActive(l.href, l.exact) ? "bg-[#1a1a1a] text-white" : "text-[var(--muted)] hover:bg-[var(--accent-weak)]"
                }`}
              >
                <Icon size={16} />
                {l.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
