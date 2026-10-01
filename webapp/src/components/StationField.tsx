"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { getStation, setStation } from "@/lib/api-client";

/**
 * Station / desk input. Persists to localStorage and lifts the value up so the
 * parent form can include it in submissions.
 */
export function StationField({
  placeholder = "e.g. Station 1 – Bola",
  onChange,
}: {
  placeholder?: string;
  onChange?: (value: string) => void;
}) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const stored = getStation();
    setValue(stored);
    onChange?.(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="card mb-4 flex items-center gap-3 px-3.5 py-2.5">
      <MapPin size={18} className="shrink-0 text-slate-400" />
      <label htmlFor="station" className="whitespace-nowrap text-[13px] font-semibold text-slate-500">
        Station / Desk
      </label>
      <input
        id="station"
        className="flex-1 bg-transparent text-[15px] outline-none"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onChange?.(e.target.value);
        }}
        onBlur={() => setStation(value.trim())}
      />
    </div>
  );
}
