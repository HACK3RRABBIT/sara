import { jalaaliMonthLength, toGregorian, toJalaali } from "jalaali-js";

export const MONTHS_FA = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

export const WEEKDAYS_FA = [
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
  "شنبه",
] as const;

export type JalaliDate = { year: number; month: number; day: number };

export function faNum(n: number) {
  return new Intl.NumberFormat("fa-IR").format(n);
}

export function money(n: number) {
  const t = Math.round(n);
  const r = t * 10;
  return `${faNum(r)} ریال (${faNum(t)} تومان)`;
}

/** Rial-only, no Toman parenthetical — for tight layouts (compact list rows,
 * dense stat grids) where the full dual-currency string from `money()` would
 * wrap and break alignment. Still leads with Rial, per the same rule. */
export function rial(n: number) {
  return `${faNum(Math.round(n) * 10)} ریال`;
}

export function parseAmount(raw: string) {
  const map: Record<string, string> = {
    "۰": "0",
    "۱": "1",
    "۲": "2",
    "۳": "3",
    "۴": "4",
    "۵": "5",
    "۶": "6",
    "۷": "7",
    "۸": "8",
    "۹": "9",
    "٠": "0",
    "١": "1",
    "٢": "2",
    "٣": "3",
    "٤": "4",
    "٥": "5",
    "٦": "6",
    "٧": "7",
    "٨": "8",
    "٩": "9",
  };
  const normalized = raw
    .replace(/[۰-۹٠-٩]/g, (d) => map[d] ?? d)
    .replace(/[٬,،\s]/g, "");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : NaN;
}

export function jalaliToday(date = new Date()): JalaliDate {
  const j = toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return { year: j.jy, month: j.jm, day: j.jd };
}

export function formatFaFullDate(date = new Date()) {
  const j = jalaliToday(date);
  return `${WEEKDAYS_FA[date.getDay()]} ${faNum(j.day)} ${MONTHS_FA[j.month - 1]} ${faNum(j.year)}`;
}

export function formatFaWeekday(date = new Date()) {
  return WEEKDAYS_FA[date.getDay()];
}

export function formatFaTodayLine(date = new Date()) {
  return `امروز ${formatFaFullDate(date)}`;
}

export function monthLength(year: number, month: number) {
  return jalaaliMonthLength(year, month);
}

export function shiftMonth(year: number, month: number, delta: number) {
  let y = year;
  let m = month + delta;
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  return { year: y, month: m };
}

export function monthTitle(year: number, month: number) {
  return `${MONTHS_FA[month - 1]} ${faNum(year)}`;
}

export function jalaliToIso(year: number, month: number, day: number) {
  const g = toGregorian(year, month, day);
  return new Date(g.gy, g.gm - 1, g.gd, 12, 0, 0).toISOString();
}

export function isoToJalali(iso: string): JalaliDate {
  const date = new Date(iso);
  return jalaliToday(date);
}

export function formatFaDate(iso: string) {
  const j = isoToJalali(iso);
  return `${faNum(j.day)} ${MONTHS_FA[j.month - 1]} ${faNum(j.year)}`;
}

export const PAY_FROM = 25;
export const PAY_TO = 30;

export function payWindowEnd(year: number, month: number) {
  return Math.min(PAY_TO, monthLength(year, month));
}

export function inPayWindow(year: number, month: number, day: number) {
  return day >= PAY_FROM && day <= payWindowEnd(year, month);
}

export function isMonthPast(year: number, month: number, today = jalaliToday()) {
  return year < today.year || (year === today.year && month < today.month);
}

export function isOverdueMonth(year: number, month: number, today = jalaliToday()) {
  if (isMonthPast(year, month, today)) return true;
  if (year === today.year && month === today.month) {
    return today.day > payWindowEnd(year, month);
  }
  return false;
}

export function chargeAmount(base: number, perPerson: number, occupants: number) {
  return base + Math.max(0, occupants) * perPerson;
}
