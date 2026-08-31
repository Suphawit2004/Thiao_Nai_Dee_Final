#!/usr/bin/env node
/**
 * Manage the admin email allowlist from the CLI (bootstrapping the first admin).
 *
 *   npm run add-admin asvyou90@gmail.com        # add an admin (idempotent)
 *   npm run add-admin -- --list              # list current admins
 *   npm run add-admin -- --remove a@b.com    # remove an admin
 *   npm run add-admin -- --help              # show usage
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 * Reads them from .env.local (or the shell). The service role bypasses RLS,
 * so this works before any admin exists.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

// Lightweight .env.local loader (Node scripts don't auto-load it, next dev does).
function loadEnvFile() {
  const p = join(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const raw of readFileSync(p, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvFile();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "   Add them to .env.local (service_role key: Supabase → Project Settings → API → service_role)."
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const emailRE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function help() {
  console.log(`Usage:
  npm run add-admin <email>          add an admin (idempotent)
  npm run add-admin -- --list        list current admins
  npm run add-admin -- --remove <email>  remove an admin
  npm run add-admin -- --help        show this help`);
}

if (args.includes("--help") || args.includes("-h")) {
  help();
  process.exit(0);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function listAdmins() {
  const { data, error } = await sb.from("admins").select("email").order("email");
  if (error) {
    console.error(`❌ Failed to list admins: ${error.message}`);
    process.exit(1);
  }
  if (!data || data.length === 0) {
    console.log("ℹ️  No admins yet.");
    return;
  }
  console.log(`Admins (${data.length}):`);
  for (const row of data) console.log(`  • ${row.email}`);
}

async function addAdmin(email) {
  const clean = email.trim().toLowerCase();
  if (!emailRE.test(clean)) {
    console.error(`❌ Invalid email: "${email}"`);
    process.exit(1);
  }
  const { error } = await sb.from("admins").upsert({ email: clean }, { onConflict: "email" });
  if (error) {
    if (error.message.toLowerCase().includes("does not exist")) {
      console.error(
        "❌ The admins table does not exist. Run the admin_dashboard_upgrade migration first."
      );
    } else {
      console.error(`❌ Failed to add admin: ${error.message}`);
    }
    process.exit(1);
  }
  console.log(`✅ Added admin: ${clean}`);
  console.log("   Log in at /login with that email, then open /admin.");
}

async function removeAdmin(email) {
  const clean = email.trim().toLowerCase();
  if (!emailRE.test(clean)) {
    console.error(`❌ Invalid email: "${email}"`);
    process.exit(1);
  }
  const { error } = await sb.from("admins").delete().eq("email", clean);
  if (error) {
    console.error(`❌ Failed to remove admin: ${error.message}`);
    process.exit(1);
  }
  console.log(`✅ Removed admin: ${clean}`);
}

async function main() {
  const removeIdx = args.indexOf("--remove");
  if (args.includes("--list")) {
    await listAdmins();
    return;
  }
  if (removeIdx !== -1 && args[removeIdx + 1]) {
    await removeAdmin(args[removeIdx + 1]);
    return;
  }
  const email = args.find((a) => !a.startsWith("--"));
  if (!email) {
    help();
    process.exit(1);
  }
  await addAdmin(email);
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err?.message ?? err);
  process.exit(1);
});
