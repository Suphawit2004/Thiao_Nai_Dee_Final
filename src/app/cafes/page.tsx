import CafesExplorer from "@/components/CafesExplorer";
import { TAG_ORDER, type CafeTag } from "@/data/cafes";


export const metadata = {
  title: "คาเฟ่ในตัวเมืองพะเยา — Cafes in Phayao",
  description:
    "รวมคาเฟ่ทั้งหมดในตัวเมืองพะเยา กรองตามแท็ก ราคา และสถานะเปิด-ปิด พร้อมพิกัดและเวลาเปิด Browse all cafes in Phayao city centre with filters for mood, price and opening hours.",
};

export default async function CafesPage({ searchParams }: PageProps<"/cafes">) {
  const params = await searchParams;
  const raw = typeof params.tag === "string" ? params.tag : "";
  const valid = TAG_ORDER.includes(raw as CafeTag) ? (raw as CafeTag) : null;
  return <CafesExplorer initialTag={valid} />;
}
