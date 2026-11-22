"use strict";
// Issues an account pass for a hosted game (docs/HOSTED.md) until a real
// sign-in and payment system exists. Run it on the server, with the same
// HOSTED_SECRET the game uses (environment or the .env file beside package.json):
//   node scripts/hosted-pass.js --id curtis --plan paid --days 30
// It prints a link that signs that browser in. Anyone with the link can use the
// pass, so send it privately. To end every pass at once, change HOSTED_SECRET
// (this also ends every sealed save in players' browsers).
const path = require("node:path");
const Hosted = require("../src/hosted");
try { process.loadEnvFile(process.env.ENV_FILE_PATH || path.join(__dirname, "..", ".env")); } catch {}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : fallback;
}
try {
  const secret = String(process.env.HOSTED_SECRET || "");
  if (secret.length < 32) throw new Error("Set HOSTED_SECRET (at least 32 characters), the same one the hosted game uses.");
  const id = arg("id", "");
  const plan = arg("plan", "free");
  const days = Number(arg("days", "30"));
  const token = Hosted.issuePass({ id, plan, days }, secret);
  const origin = (process.env.HOSTED_ORIGIN || "http://localhost:4173").replace(/\/+$/, "");
  console.log(`Pass for ${id} (${plan}, ${days} days):`);
  console.log(token);
  console.log(`Sign-in link: ${origin}/pass?token=${token}`);
} catch (error) {
  console.error(error.message);
  console.error("Usage: node scripts/hosted-pass.js --id <account> --plan <free|paid> [--days 30]");
  process.exit(1);
}
