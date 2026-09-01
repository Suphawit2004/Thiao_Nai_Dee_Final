import { describe, expect, it } from "vitest";
import type { Cafe } from "@/data/cafes";
import { DEFAULT_CAFE_DESCRIPTION, mergeCafes } from "@/data/cafes-data";

function makeCafe(overrides: Partial<Cafe> = {}): Cafe {
  return {
    slug: "test-cafe",
    name: { th: "ทดสอบ", en: "Test" },
    description: { th: "คำอธิบายเดิม", en: "Original description" },
    address: { th: "ที่อยู่", en: "Address" },
    openTime: "08:00",
    closeTime: "17:00",
    closedDays: [],
    priceRange: 1,
    tags: ["work"],
    lifestyleTags: [],
    area: "lakeside",
    lat: 19.16,
    lng: 99.89,
    menuHighlights: [],
    baseRating: 4.5,
    ...overrides,
  };
}

describe("mergeCafes", () => {
  it("keeps all curated cafes when the DB is empty", () => {
    const curated = [makeCafe({ slug: "a" }), makeCafe({ slug: "b" })];
    const result = mergeCafes(curated, []);
    expect(result.map((c) => c.slug)).toEqual(["a", "b"]);
  });

  it("appends cafes that exist only in the DB", () => {
    const curated = [makeCafe({ slug: "a" })];
    const db = [makeCafe({ slug: "new-cafe", description: { th: "", en: "" }, tags: [] })];
    const result = mergeCafes(curated, db);
    expect(result.map((c) => c.slug)).toEqual(["a", "new-cafe"]);
  });

  it("does not duplicate a curated cafe that is also in the DB", () => {
    const curated = [makeCafe({ slug: "a" })];
    const db = [makeCafe({ slug: "a", baseRating: 4.8 })];
    const result = mergeCafes(curated, db);
    expect(result.map((c) => c.slug)).toEqual(["a"]);
    expect(result[0].baseRating).toBe(4.8);
  });

  it("overlays non-empty DB fields onto the curated copy", () => {
    const curated = [makeCafe({ slug: "a", baseRating: 4.5 })];
    const db = [makeCafe({ slug: "a", baseRating: 4.9, priceRange: 2 })];
    const result = mergeCafes(curated, db);
    expect(result[0].baseRating).toBe(4.9);
    expect(result[0].priceRange).toBe(2);
  });

  it("does not clobber rich curated data with sparse DB values (empty description, tags, unknown hours)", () => {
    const curated = [
      makeCafe({ slug: "a", openTime: "07:00", closeTime: "16:00", tags: ["work", "chill"] }),
    ];
    const db = [
      makeCafe({
        slug: "a",
        description: { th: "", en: "" },
        tags: [],
        openTime: "00:00",
        closeTime: "00:00",
      }),
    ];
    const result = mergeCafes(curated, db);
    expect(result[0].description.th).toBe("คำอธิบายเดิม");
    expect(result[0].tags).toEqual(["work", "chill"]);
    expect(result[0].openTime).toBe("07:00");
    expect(result[0].closeTime).toBe("16:00");
  });

  it("fills a fallback description and a neutral tag for sparse new cafes", () => {
    const curated: Cafe[] = [];
    const db = [makeCafe({ slug: "new", description: { th: "", en: "" }, tags: [] })];
    const result = mergeCafes(curated, db);
    expect(result[0].description).toEqual(DEFAULT_CAFE_DESCRIPTION);
    expect(result[0].tags).toEqual(["chill"]);
  });
});
