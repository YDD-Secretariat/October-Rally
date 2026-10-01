"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { queueCount, startQueueSync, syncQueue } from "@/lib/api-client";

/** Footer sync indicator: shows pending offline writes and lets the user retry. */
export function SyncBadge() {
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const update = () => setPending(queueCount());
    update();
    const stop = startQueueSync();
    const onQueue = (e: Event) => setPending((e as CustomEvent<number>).detail ?? queueCount());
    window.addEventListener("rally:queue", onQueue);
    const poll = setInterval(update, 5000);
    return () => {
      stop?.();
      window.removeEventListener("rally:queue", onQueue);
      clearInterval(poll);
    };
  }, []);

  if (pending === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400">
        <CheckCircle2 size={15} className="text-green-500" /> All changes saved
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void syncQueue()}
      className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-800 hover:bg-amber-200"
    >
      <RefreshCw size={14} /> {pending} pending — tap to retry
    </button>
  );
}
