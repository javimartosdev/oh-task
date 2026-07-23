#!/usr/bin/env bash
# Seed a bootstrap invite code (run against DATABASE_URL).
set -euo pipefail
CODE="${1:-amigos}"
node --input-type=module <<EOF
import postgres from "postgres";
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL required");
const sql = postgres(url, { ssl: url.includes("sslmode=require") || url.includes("neon.tech") ? "require" : false });
await sql\`
  insert into invite_codes (code, max_uses, used_count)
  values (\${"${CODE}".toLowerCase()}, 50, 0)
  on conflict (code) do nothing
\`;
console.log("Invite ready:", "${CODE}".toLowerCase());
await sql.end();
EOF
