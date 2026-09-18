import assert from "node:assert/strict";
import { test } from "node:test";
import { buildBackupPayload, parseBackupPayload } from "./backup.ts";
import type { BuildingSnapshot } from "./building-core.ts";

const snapshot: BuildingSnapshot = {
  units: [
    {
      id: "u1",
      number: "۱",
      floor: 1,
      occupants: 2,
      resident: "سارا",
      phone: "",
      occupied: true,
      note: "",
    },
  ],
  charges: [
    { id: "c1", unitId: "u1", year: 1404, month: 3, amount: 1_700_000, note: "", issuedAt: "2025-06-24T00:00:00.000Z" },
  ],
  payments: [
    { id: "p1", unitId: "u1", year: 1404, month: 3, amount: 800_000, method: "card", date: "2025-06-25T00:00:00.000Z", note: "" },
  ],
  expenses: [
    { id: "e1", title: "برق", category: "electricity", amount: 200_000, date: "2025-06-20T00:00:00.000Z", vendor: "", note: "" },
  ],
  settings: {
    buildingName: "سرا",
    address: "",
    manager: "",
    cardNumber: "",
    bank: "",
    baseCharge: 1_500_000,
    perPerson: 100_000,
    previousManagerReceivable: 0,
  },
};

test("buildBackupPayload wraps the snapshot in a dated, named envelope", () => {
  const { fileName, json } = buildBackupPayload(snapshot, "سرا", new Date("2025-06-24T10:05:00.000Z"));
  assert.match(fileName, /^سرا-پشتیبان-.+\.json$/);
  const parsed = JSON.parse(json);
  assert.equal(parsed.format, "sara-backup");
  assert.equal(parsed.version, 1);
  assert.deepEqual(parsed.data, snapshot);
});

test("parseBackupPayload round-trips buildBackupPayload's own output", () => {
  const { json } = buildBackupPayload(snapshot, "سرا");
  const file = parseBackupPayload(json);
  assert.deepEqual(file.data, snapshot);
});

test("parseBackupPayload rejects invalid JSON", () => {
  assert.throws(() => parseBackupPayload("not json"), /JSON معتبر/);
});

test("parseBackupPayload rejects a file that isn't a Sara backup", () => {
  assert.throws(() => parseBackupPayload(JSON.stringify({ hello: "world" })), /فایل پشتیبان سرا نیست/);
  assert.throws(
    () => parseBackupPayload(JSON.stringify({ format: "something-else", data: {} })),
    /فایل پشتیبان سرا نیست/,
  );
});

test("parseBackupPayload rejects a newer version than this build understands", () => {
  assert.throws(
    () => parseBackupPayload(JSON.stringify({ format: "sara-backup", version: 99, data: {} })),
    /نسخهٔ جدیدتری/,
  );
});

test("parseBackupPayload repairs a malformed data section instead of throwing", () => {
  const file = parseBackupPayload(
    JSON.stringify({ format: "sara-backup", version: 1, exportedAt: "x", data: { units: "not an array" } }),
  );
  assert.deepEqual(file.data.units, []);
  // No settings in the malformed payload at all — falls back to the same
  // defaults a fresh, never-saved building would have (validateSnapshot).
  assert.equal(file.data.settings.buildingName, "سرا");
});
