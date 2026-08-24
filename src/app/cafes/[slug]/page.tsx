import { notFound } from "next/navigation";
import { CAFES } from "@/data/cafes";
import DetailView from "@/components/DetailView";

interface Params {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return CAFES.map((cafe) => ({ slug: cafe.slug }));
}

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const cafe = CAFES.find((c) => c.slug === slug);
  if (!cafe) return { title: "Not found" };
  return { title: `${cafe.name.th} (${cafe.name.en})` };
}

export default async function CafeDetailPage({ params }: Params) {
  const { slug } = await params;
  const cafe = CAFES.find((c) => c.slug === slug);
  if (!cafe) notFound();
  return <DetailView cafe={cafe} />;
}
