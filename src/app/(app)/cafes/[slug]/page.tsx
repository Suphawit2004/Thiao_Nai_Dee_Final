import { notFound } from "next/navigation";
import { CAFES, type Cafe } from "@/data/cafes";
import DetailView from "@/components/DetailView";

interface Params {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return CAFES.map((cafe) => ({ slug: cafe.slug }));
}

export const dynamicParams = false;

const SCHEMA_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function cafeJsonLd(cafe: Cafe): string {
  const json = {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    name: `${cafe.name.th} (${cafe.name.en})`,
    description: cafe.description.th,
    telephone: cafe.phone,
    servesCuisine: ["Coffee", "Cafe"],
    priceRange: "฿".repeat(cafe.priceRange),
    address: {
      "@type": "PostalAddress",
      streetAddress: cafe.address.th,
      addressLocality: "เมืองพะเยา",
      addressRegion: "พะเยา",
      addressCountry: "TH",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: cafe.lat,
      longitude: cafe.lng,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: SCHEMA_DAYS.filter((_, i) => !cafe.closedDays.includes(i)),
        opens: cafe.openTime,
        closes: cafe.closeTime,
      },
    ],
  };
  return JSON.stringify(json).replace(/</g, "\\u003c");
}

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const cafe = CAFES.find((c) => c.slug === slug);
  if (!cafe) return { title: "Not found" };
  return {
    title: `${cafe.name.th} (${cafe.name.en})`,
    description: cafe.description.th,
  };
}

export default async function CafeDetailPage({ params }: Params) {
  const { slug } = await params;
  const cafe = CAFES.find((c) => c.slug === slug);
  if (!cafe) notFound();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: cafeJsonLd(cafe) }}
      />
      <DetailView cafe={cafe} />
    </>
  );
}
