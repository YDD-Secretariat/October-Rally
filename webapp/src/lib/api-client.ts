"use client";

// Client-side API helper — the Next.js replacement for the old config.js `AVS`.
// Keeps the station in localStorage and queues failed writes for retry so the
// registration desks stay offline-tolerant.

const STATION_KEY = "rally_station";
const QUEUE_KEY = "rally_offline_queue_v1";

export interface QueuedWrite {
  id: string;
  path: string;
  body: unknown;
  queuedAt: string;
}

export interface PostResult<T = Record<string, unknown>> {
  success: boolean;
  queued?: boolean;
  error?: string;
  data?: T;
}

export function getStation(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(STATION_KEY) || "";
  } catch {
    return "";
  }
}

export function setStation(name: string) {
  try {
    localStorage.setItem(STATION_KEY, name || "");
  } catch {
    /* storage unavailable */
  }
}

function readQueue(): QueuedWrite[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedWrite[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("rally:queue", { detail: items.length }));
  } catch {
    /* storage unavailable */
  }
}

export function queueCount(): number {
  return readQueue().length;
}

export async function apiGet<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(path, window.location.origin);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data && data.error) throw new Error(data.error);
  return data as T;
}

async function sendPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data as T;
}

function newRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * POST a write. A stable clientRequestId is attached so that if a write is
 * retried (after an offline queue, or a lost response), the server can dedupe
 * it instead of double-counting. On network failure the write — including its
 * id — is saved to a local queue and retried later.
 */
export async function apiPost<T extends Record<string, unknown>>(
  path: string,
  body: Record<string, unknown>,
): Promise<PostResult<T>> {
  const payload = { ...body, clientRequestId: (body.clientRequestId as string) || newRequestId() };
  try {
    const data = await sendPost<T & { success?: boolean; error?: string; duplicate?: boolean }>(path, payload);
    if (data?.success === false && !data.duplicate) {
      return { success: false, error: data.error || "Server did not confirm the write.", data };
    }
    return { success: data?.success !== false, data };
  } catch {
    const queue = readQueue();
    queue.push({
      id: payload.clientRequestId,
      path,
      body: payload,
      queuedAt: new Date().toISOString(),
    });
    writeQueue(queue);
    return { success: false, queued: true, error: "Saved on this device for retry." };
  }
}

let syncing = false;

export async function syncQueue(): Promise<void> {
  if (syncing || typeof navigator !== "undefined" && !navigator.onLine) return;
  const queue = readQueue();
  if (!queue.length) return;
  syncing = true;
  try {
    while (queue.length) {
      const item = queue[0];
      try {
        const data = await sendPost<{ success?: boolean }>(item.path, item.body as Record<string, unknown>);
        if (data?.success === false) break;
        queue.shift();
        writeQueue(queue);
      } catch {
        break; // still offline — stop and keep the rest queued
      }
    }
  } finally {
    syncing = false;
  }
}

export function startQueueSync() {
  if (typeof window === "undefined") return;
  window.addEventListener("online", () => void syncQueue());
  const timer = setInterval(() => void syncQueue(), 15000);
  void syncQueue();
  return () => clearInterval(timer);
}
