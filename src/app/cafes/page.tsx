import { Suspense } from "react";
import CafesExplorer from "@/components/CafesExplorer";

export const metadata = { title: "คาเฟ่ทั้งหมด" };

export default function CafesPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10 text-espresso/50">…</div>}>
      <CafesExplorer />
    </Suspense>
  );
}
