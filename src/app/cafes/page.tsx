import CafesExplorer, { type InitialFilters } from "@/components/CafesExplorer";
import {
  AREA_ORDER,
  LIFESTYLE_ORDER,
  TAG_ORDER,
  type CafeArea,
  type CafeTag,
  type LifeStyleTag,
} from "@/data/cafes";

export const metadata = {
  title: "คาเฟ่ในเมืองพะเยา — Cafes in Phayao",
  description:
    "รวมคาเฟ่ทั้งหมดในเมืองพะเยา กรองตามพื้นที่ แท็ก ไลฟ์สไตล์ ราคา และสถานะเปิด-ปิด พร้อมพิกัดและเวลาเปิด Browse all cafes in Phayao with filters for area, mood, lifestyle, price and opening hours.",
};

type ParamValue = string | string[] | undefined;

function first(raw: ParamValue): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

function parseCsv<T extends string>(raw: ParamValue, allowed: readonly T[]): T[] {
  const value = first(raw);
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter((v): v is T => (allowed as readonly string[]).includes(v));
}

export default async function CafesPage({ searchParams }: PageProps<"/cafes">) {
  const params = await searchParams;

  const initialFilters: InitialFilters = {
    query: first(params.q) ?? "",
    tags: parseCsv<CafeTag>(params.tag, TAG_ORDER),
    life: parseCsv<LifeStyleTag>(params.life, LIFESTYLE_ORDER),
    area: AREA_ORDER.includes(first(params.area) as CafeArea)
      ? (first(params.area) as CafeArea)
      : null,
    maxPrice: first(params.price) === "1" || first(params.price) === "2"
      ? (Number(first(params.price)) as 1 | 2)
      : 0,
    openNow: first(params.open) === "1",
    transitionZone: first(params.zone) === "1",
  };

  return <CafesExplorer initialFilters={initialFilters} />;
}