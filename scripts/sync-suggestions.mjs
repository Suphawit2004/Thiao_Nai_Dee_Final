#!/usr/bin/env node
// Compatible entry point for older deployment instructions.
console.log("Cafe suggestions now publish atomically from /admin into Supabase.");
console.log("Apply the complete_cafe_features migration before approving cafes.");
console.log("No static-file sync, service-role key, or redeploy is needed after approval.");
