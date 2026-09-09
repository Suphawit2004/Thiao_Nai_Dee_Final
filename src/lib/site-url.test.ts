import { describe, expect, it } from "vitest";
import { getSiteUrl } from "./site-url";

describe("site metadata URL", () => {
  it("uses the Vercel production domain when a configured value is empty", () => {
    expect(getSiteUrl("", "cafe.vercel.app")).toBe("https://cafe.vercel.app");
    expect(getSiteUrl("  ", "cafe.vercel.app")).toBe("https://cafe.vercel.app");
  });
  it("keeps a configured custom domain and supports local development", () => {
    expect(getSiteUrl(" https://cafe.example/ ", "cafe.vercel.app")).toBe("https://cafe.example");
    expect(getSiteUrl("", "")).toBe("http://localhost:3000");
  });
});
