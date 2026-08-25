/**
 * Best-effort client IP resolution for rate limiting.
 *
 * Header trustworthiness depends on the hosting platform: on most PaaS
 * (Vercel, Fly, Render) the edge overwrites these headers, making them safe.
 * On bare hosts a client can spoof them and rotate IPs to evade the per-IP
 * limit — only the global fuse holds in that case.
 */
export function resolveClientIp(headerGet: (name: string) => string | null): string {
  const real = headerGet("x-real-ip")?.trim();
  if (real) return real;

  const forwarded = headerGet("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last;
  }

  return "unknown";
}
