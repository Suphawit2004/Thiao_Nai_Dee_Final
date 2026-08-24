import type { Cafe } from "@/data/cafes";

export interface OpenStatus {
  isOpenToday: boolean;
  isOpenNow: boolean;
}

export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function getOpenStatus(cafe: Cafe, now: Date = new Date()): OpenStatus {
  if (cafe.closedDays.includes(now.getDay())) {
    return { isOpenToday: false, isOpenNow: false };
  }
  const cur = now.getHours() * 60 + now.getMinutes();
  const start = minutesOf(cafe.openTime);
  const end = minutesOf(cafe.closeTime);
  return { isOpenToday: true, isOpenNow: cur >= start && cur < end };
}
