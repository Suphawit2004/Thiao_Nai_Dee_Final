/** Empty dashboard variables should use the deployment domain, not crash metadata. */
export function getSiteUrl(
  configured = process.env.NEXT_PUBLIC_SITE_URL,
  productionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL,
): string {
  const base = configured?.trim() || (productionDomain?.trim() ? `https://${productionDomain.trim()}` : "http://localhost:3000");
  return new URL(base).toString().replace(/\/+$/, "");
}
