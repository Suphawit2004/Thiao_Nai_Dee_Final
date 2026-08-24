import CafesExplorer from "@/components/CafesExplorer";
import { TAG_ORDER, type CafeTag } from "@/data/cafes";


export const metadata = { title: "คาเฟ่ทั้งหมด" };

export default async function CafesPage({ searchParams }: PageProps<"/cafes">) {
  const params = await searchParams;
  const raw = typeof params.tag === "string" ? params.tag : "";
  const valid = TAG_ORDER.includes(raw as CafeTag) ? (raw as CafeTag) : null;
  return <CafesExplorer initialTag={valid} />;
}
