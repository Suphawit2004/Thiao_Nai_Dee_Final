import type { Cafe } from "@/data/cafes";

export interface OpenStatus {
  isOpenToday: boolean;
  isOpenNow: boolean;
}

export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function getOpenStatus(cafe: Cafe, dateObj: Date = new Date()): OpenStatus {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(dateObj);
  let dayStr = "", h = 0, m = 0;
  for (const p of parts) {
    if (p.type === "weekday") dayStr = p.value;
    else if (p.type === "hour") h = parseInt(p.value, 10);
    else if (p.type === "minute") m = parseInt(p.value, 10);
  }

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayIndex = days.indexOf(dayStr);

  if (cafe.closedDays.includes(dayIndex)) {
    return { isOpenToday: false, isOpenNow: false };
  }

  const cur = h * 60 + m;
  const start = minutesOf(cafe.openTime);
  const end = minutesOf(cafe.closeTime);

  let isOpenNow = false;
  if (end > start) {
    isOpenNow = cur >= start && cur < end;
  } else {
    // Crosses midnight (e.g. 20:00 to 02:00)
    isOpenNow = cur >= start || cur < end;
  }

  return { isOpenToday: true, isOpenNow };
}
