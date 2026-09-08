"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const mode = process.argv[2];
if (!["check", "test"].includes(mode)) {
  console.error("Usage: node scripts/verify.js <check|test>");
  process.exit(2);
}
function jsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? jsFiles(full) : entry.isFile() && entry.name.endsWith(".js") ? [full] : [];
  }).sort();
}
function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: "inherit", shell: false });
  if (result.error) console.error(result.error.message);
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
if (mode === "test") {
  const tests = jsFiles(path.join(root, "tests")).filter((file) => file.endsWith(".test.js"));
  if (!tests.length) throw new Error("No test files found.");
  // Explicit file arguments work in cmd.exe, PowerShell and POSIX shells.
  // Do not execute campaign/fuzz diagnostic programs as unit-test files.
  run(["--test", ...tests]);
} else {
  const files = [path.join(root, "server.js"), ...["src", "public", "tests", "scripts"].flatMap((dir) => jsFiles(path.join(root, dir)))];
  for (const file of files) run(["--check", file]);
  console.log(`Syntax checked ${files.length} JavaScript files.`);
}
