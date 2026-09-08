"use strict";

// Use the same portable filename rules on Windows and Linux. Windows device
// names remain reserved even with a .json suffix; reject them before writing.
const SAVE_NAME_PATTERN = /^[a-z0-9][a-z0-9 _-]{0,47}$/i;
const WINDOWS_DEVICE_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
function sanitizeSaveName(raw) {
  return String(raw || "").trim().replace(/\.json$/i, "");
}
function validSaveName(slot) {
  return typeof slot === "string" && SAVE_NAME_PATTERN.test(slot)
    && slot === slot.trim() && !WINDOWS_DEVICE_NAME.test(slot);
}
module.exports = { sanitizeSaveName, validSaveName };
