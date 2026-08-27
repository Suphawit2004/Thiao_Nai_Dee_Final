import { describe, expect, it } from "vitest";
import { resolveClientIp } from "@/lib/client-ip";

function getter(headers: Record<string, string>) {
  return (name: string) => headers[name] ?? null;
}

describe("resolveClientIp", () => {
  it("prefers x-real-ip over x-forwarded-for", () => {
    expect(
      resolveClientIp(getter({ "x-real-ip": "1.2.3.4", "x-forwarded-for": "5.6.7.8" }))
    ).toBe("1.2.3.4");
  });

  it("takes the last (closest-proxy) x-forwarded-for entry", () => {
    expect(resolveClientIp(getter({ "x-forwarded-for": "spoofed, 9.9.9.9" }))).toBe("9.9.9.9");
  });

  it("trims whitespace and falls back to unknown", () => {
    expect(resolveClientIp(getter({ "x-forwarded-for": " 10.0.0.1 " }))).toBe("10.0.0.1");
    expect(resolveClientIp(getter({}))).toBe("unknown");
    expect(resolveClientIp(getter({ "x-forwarded-for": ",," }))).toBe("unknown");
  });
});
