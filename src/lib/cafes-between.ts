import type { Cafe } from "@/data/cafes";
import {
  LAKESIDE_CENTER,
  UNIVERSITY_CENTER,
  MAX_DISTANCE_KM,
  calculateDistancesFromRoad,
  haversineKm,
  DistanceFromRoad,
} from "./distance";

export function isInTransitionZone(cafe: Cafe): boolean {
  const d1 = haversineKm(LAKESIDE_CENTER[0], LAKESIDE_CENTER[1], cafe.lat, cafe.lng);
  const d2 = haversineKm(UNIVERSITY_CENTER[0], UNIVERSITY_CENTER[1], cafe.lat, cafe.lng);
  const total = d1 + d2;
  const roadDistance = Math.abs(d1 - d2);
  return total <= MAX_DISTANCE_KM * 2 && roadDistance <= MAX_DISTANCE_KM;
}

export function getCafesBetweenAreas(cafes: Cafe[]): DistanceFromRoad[] {
  return calculateDistancesFromRoad(cafes, LAKESIDE_CENTER, UNIVERSITY_CENTER);
}

export function filterByMaxDistance(
  distances: DistanceFromRoad[],
  maxKm: number = MAX_DISTANCE_KM
): DistanceFromRoad[] {
  return distances.filter((d) => d.distanceKm <= maxKm);
}

export function sortByProximityToLakeside(
  distances: DistanceFromRoad[]
): DistanceFromRoad[] {
  return [...distances].sort((a, b) => (a.fromLakeside && !b.fromLakeside ? -1 : 1));
}

// Export for use in other modules
export { MAX_DISTANCE_KM };