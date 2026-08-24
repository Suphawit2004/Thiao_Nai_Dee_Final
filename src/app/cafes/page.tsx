import CafesExplorer from "@/components/CafesExplorer";
import { AREA_ORDER, TAG_ORDER, type CafeArea, type CafeTag } from "@/data/cafes";

export const metadata = {
  title: "คาเฟ่ในตัวเมืองพะเยา — Cafes in Phayao",
  description:
    "รวมคาเฟ่ทั้งหมดในตัวเมืองพะเยา กรองตามแท็ก ราคา และสถานะเปิด-ปิด พร้อมพิกัดและเวลาเปิด Browse all cafes in Phayao city centre with filters for mood, price and opening hours.",
};

export default async function CafesPage({ searchParams }: PageProps<"/cafes">) {
  const params = await searchParams;
  const rawTag = typeof params.tag === "string" ? params.tag : "";
  const tag = TAG_ORDER.includes(rawTag as CafeTag) ? (rawTag as CafeTag) : null;
  const rawArea = typeof params.area === "string" ? params.area : "";
  const area = AREA_ORDER.includes(rawArea as CafeArea) ? (rawArea as CafeArea) : null;
  return <CafesExplorer initialTag={tag} initialArea={area} />;
}
