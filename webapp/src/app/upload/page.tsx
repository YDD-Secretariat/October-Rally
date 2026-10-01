"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Images, Search, X, Zap } from "lucide-react";
import { PageTitle } from "@/components/form";
import { Message } from "@/components/ui";
import { apiGet, apiPost, getStation } from "@/lib/api-client";
import type { SchoolRow } from "@/lib/types";

type Status = "compressing" | "pending" | "uploading" | "done" | "error";
interface Pending {
  name: string;
  dataUrl: string;
  compSize: number;
  status: Status;
}

function compressImage(file: File, maxWidth = 1600, quality = 0.78): Promise<{ dataUrl: string; compSize: number }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve({ dataUrl, compSize: Math.round((dataUrl.length * 0.75) / 1024) });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function UploadPage() {
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SchoolRow | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const loadSchools = useCallback(() => {
    apiGet<{ schools: SchoolRow[] }>("/api/schools")
      .then((r) => setSchools(r.schools || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadSchools();
    const t = setInterval(loadSchools, 15000);
    return () => clearInterval(t);
  }, [loadSchools]);

  const matches = query.trim()
    ? schools.filter((s) => s.schoolName.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 15)
    : [];

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const idx = pending.length;
      setPending((p) => [...p, { name: file.name, dataUrl: "", compSize: 0, status: "compressing" }]);
      const { dataUrl, compSize } = await compressImage(file);
      setPending((p) => p.map((item, i) => (i === idx ? { ...item, dataUrl, compSize, status: "pending" } : item)));
    }
  };

  const upload = async () => {
    if (!selected) return;
    setBusy(true);
    let ok = 0;
    let fail = 0;
    for (let i = 0; i < pending.length; i++) {
      if (pending[i].status !== "pending") continue;
      setPending((p) => p.map((item, j) => (j === i ? { ...item, status: "uploading" } : item)));
      const res = await apiPost("/api/uploads", {
        schoolId: selected.id,
        schoolName: selected.schoolName,
        fileName: pending[i].name,
        base64Data: pending[i].dataUrl,
        station: getStation(),
      });
      setPending((p) => p.map((item, j) => (j === i ? { ...item, status: res.success ? "done" : "error" } : item)));
      res.success ? ok++ : fail++;
    }
    setBusy(false);
    if (ok && !fail) setMsg({ kind: "ok", text: `${ok} sheet photo(s) uploaded for ${selected.schoolName}.` });
    else if (ok && fail) setMsg({ kind: "err", text: `${ok} uploaded, ${fail} failed. Retry failed ones.` });
    else setMsg({ kind: "err", text: "Upload failed. Check connection and retry." });
  };

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const canUpload = pending.some((p) => p.status === "pending");

  return (
    <div className="mx-auto max-w-xl">
      <PageTitle icon={<Camera size={20} />} title="Upload Attendance Sheets" subtitle="Photo uploader with automatic compression" />

      {!selected ? (
        <>
          <p className="mb-3 text-sm text-slate-500">Search for a registered school, then attach its scanned attendance sheet photo(s).</p>
          <div className="relative mb-3">
            <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-10" placeholder="Type a school name to select…" value={query} autoFocus onChange={(e) => setQuery(e.target.value)} />
          </div>
          {query.trim() && matches.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">No matching school found. Ask the registration desk to register it first.</p>
          )}
          <div className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
            {matches.map((s) => (
              <button key={s.id} className="block w-full px-4 py-3.5 text-left hover:bg-[var(--accent-weak)]" onClick={() => { setSelected(s); setPending([]); setMsg(null); }}>
                <div className="font-bold text-slate-900">{s.schoolName}</div>
                <div className="text-xs text-slate-500">
                  {s.location ? `${s.location} · ` : ""}Coordinator: {s.coordinatorName || "—"} · {s.total} students
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--accent-weak)] px-4 py-3.5">
            <div>
              <div className="text-xs text-[var(--muted)]">Uploading sheets for</div>
              <b className="text-[var(--text)]">{selected.schoolName}</b>
            </div>
            <button className="text-sm font-semibold text-[var(--text)] underline" onClick={() => { setSelected(null); setQuery(""); setPending([]); }}>
              Change school
            </button>
          </div>

          <div className="mb-4 rounded-2xl border-2 border-dashed border-[var(--border)] bg-white p-5 text-center">
            <span className="pill mb-2 inline-flex items-center gap-1 bg-green-100 text-green-700"><Zap size={12} /> Auto-compression on</span>
            <p className="mb-4 text-sm text-slate-500">Take photo(s) of the attendance sheet or choose from your gallery. High-res images are compressed automatically.</p>
            <div className="flex gap-2.5">
              <button className="btn-primary flex-1" onClick={() => cameraRef.current?.click()}><Camera size={18} /> Take Photo</button>
              <button className="btn-ghost flex-1" onClick={() => galleryRef.current?.click()}><Images size={18} /> Choose Files</button>
            </div>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          </div>

          {pending.length > 0 && (
            <div className="mb-4 grid grid-cols-3 gap-2.5">
              {pending.map((p, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-[var(--border)] bg-black">
                  {p.dataUrl && <img src={p.dataUrl} alt="" className="h-full w-full object-cover" />}
                  {p.status === "pending" ? (
                    <>
                      <button
                        className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-xs text-white"
                        onClick={() => setPending((prev) => prev.filter((_, j) => j !== i))}
                      >
                        <X size={13} />
                      </button>
                      <div className="absolute inset-x-0 bottom-0 bg-black/65 py-0.5 text-center text-[11px] font-semibold text-white">{p.compSize} KB</div>
                    </>
                  ) : (
                    <div className="absolute inset-0 grid place-items-center bg-slate-900/75 p-1.5 text-center text-xs font-bold text-white">
                      {p.status === "compressing" ? "Compressing…" : p.status === "uploading" ? "Uploading…" : p.status === "done" ? "Uploaded" : "Failed"}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <button className="btn-primary btn-block" disabled={!canUpload || busy} onClick={upload}>
            {busy ? "Uploading…" : "Upload Photo(s)"}
          </button>
          {msg && <Message kind={msg.kind}>{msg.text}</Message>}
        </>
      )}
    </div>
  );
}
