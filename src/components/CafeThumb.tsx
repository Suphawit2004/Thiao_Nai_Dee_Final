"use client";

import Image from "next/image";
import type { Cafe } from "@/data/cafes";
import { gradientFor } from "@/lib/thumbs";
import { useLang } from "@/i18n/LangProvider";

interface CafeThumbProps {
  cafe: Cafe;
  emojiClassName?: string;
  sizes?: string;
}

export default function CafeThumb({
  cafe,
  emojiClassName = "",
  sizes = "(max-width: 768px) 100vw, 33vw",
}: CafeThumbProps) {
  const { tr } = useLang();
  if (!cafe.photo) {
    return (
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ background: gradientFor(cafe.slug) }}
        aria-hidden
      >
        <span className={emojiClassName}>☕</span>
      </div>
    );
  }
  return (
    <Image
      src={cafe.photo}
      alt={tr(cafe.name)}
      fill
      sizes={sizes}
      className="object-cover"
    />
  );
}
