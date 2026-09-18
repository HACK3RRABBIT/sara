// Full-data backup: an exact, restorable snapshot — unlike the Excel export
// (excel-export.ts / export-model.ts), which formats dates and months as
// Persian text for reading/printing and is never meant to be parsed back.
// No DOM here; `downloadJson` is the only browser-only piece.
import { sanitizeFileName } from "@/lib/export-model";
import { faNum, isoToJalali } from "@/lib/format";
import { validateSnapshot } from "@/lib/building-validate";
import type { BuildingSnapshot, Settings } from "@/lib/store";

const FORMAT = "sara-backup";
const VERSION = 1;

export type BackupFile = {
  format: typeof FORMAT;
  version: typeof VERSION;
  exportedAt: string;
  data: BuildingSnapshot;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Wrap a snapshot for download. The envelope lets a future format change be
 * detected instead of silently misreading an old file. */
export function buildBackupPayload(
  snapshot: BuildingSnapshot,
  buildingName: Settings["buildingName"],
  now = new Date(),
): { fileName: string; json: string } {
  const file: BackupFile = {
    format: FORMAT,
    version: VERSION,
    exportedAt: now.toISOString(),
    data: snapshot,
  };
  const j = isoToJalali(now.toISOString());
  const stamp = `${faNum(j.year)}-${faNum(j.month)}-${faNum(j.day)}-${faNum(now.getHours())}${pad2(now.getMinutes())}`;
  const fileName = `${sanitizeFileName(buildingName) || "سرا"}-پشتیبان-${stamp}.json`;
  return { fileName, json: JSON.stringify(file, null, 2) };
}

/** Parse an uploaded backup file. Throws a Persian-language Error the UI can
 * show directly on anything that isn't a recognizable backup — invalid JSON,
 * wrong format, or a future version this build doesn't know how to read.
 * `data` is repaired the same way a save is (`validateSnapshot`), so a
 * hand-edited file still comes out usable rather than crashing the app;
 * `exportedAt` comes back as-is so the caller can show it before applying. */
export function parseBackupPayload(text: string): BackupFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("این فایل یک JSON معتبر نیست.");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("این فایل، فایل پشتیبان سرا نیست.");
  }
  const file = parsed as Partial<BackupFile>;
  if (file.format !== FORMAT) {
    throw new Error("این فایل، فایل پشتیبان سرا نیست.");
  }
  if (typeof file.version !== "number" || file.version > VERSION) {
    throw new Error("این فایل با نسخهٔ جدیدتری از سرا گرفته شده و اینجا قابل خواندن نیست.");
  }
  if (typeof file.data !== "object" || file.data === null) {
    throw new Error("این فایل، فایل پشتیبان سرا نیست.");
  }
  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: typeof file.exportedAt === "string" ? file.exportedAt : new Date().toISOString(),
    data: validateSnapshot(file.data as Record<string, unknown>),
  };
}

/** Trigger a client-side download of the backup JSON. */
export function downloadJson(fileName: string, json: string) {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
