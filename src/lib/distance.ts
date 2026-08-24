import type { Cafe } from "@/data/cafes";

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) / Math.PI;
  return R * c;
}

export interface DistanceFromRoad {
  cafe: Cafe;
  distanceKm: number;
  fromLakeside: boolean;
}

export function calculateDistancesFromRoad(
  cafes: Cafe[],
  lakesideCenter: [number, number],
  universityCenter: [number, number],
): DistanceFromRoad[] {
  return cafes.map((cafe) => {
    const d1 = haversineKm(lakesideCenter[0], lakesideCenter[1], cafe.lat, cafe.lng);
    const d2 = haversineKm(universityCenter[0], universityCenter[1], cafe.lat, cafe.lng);
    const total = d1 + d2;
    const fromLakeside = d1 < d2;
    return {
      cafe,
      distanceKm: Number(total.toFixed(2)),
      fromLakeside,
    };
  });
}

export const LAKESIDE_CENTER: [number, number] = [19.17, 99.90];
export const UNIVERSITY_CENTER: [number, number] = [19.05, 99.93];
export const MAX_DISTANCE_KM = 5;