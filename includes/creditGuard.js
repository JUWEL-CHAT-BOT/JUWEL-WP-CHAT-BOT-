// Credit : 乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐
"use strict";
// ============================================================
//  Credit Guard — মূল ফাইলগুলোর ক্রেডিট বদলানো বা মুছে ফেলা হলে বট চালু হবে না।
//  (কমান্ড ও ইভেন্ট ফাইলের উপর এই নিয়ম খাটে না)
// ============================================================
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const CREDIT = "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐";
const CREDIT_SHA256 = "8f74924e81a157abaf089d90717e48a4949617a7379d20a2df567cb0ab0dad81";
const ROOT = path.resolve(__dirname, "..");

// যে ফাইলগুলোতে ক্রেডিট থাকতে হবে
const FILES = ["Juwel.js", "Main.js", "JuwelKeepalive.js", "includes/creditGuard.js", "includes/listen.js", "includes/handle/handleCommand.js", "includes/handle/handleCreateDatabase.js", "includes/handle/handleReaction.js", "includes/controllers/threads.js", "utils/console.js", "whatsapp/index.js", "whatsapp/waApi.js", "whatsapp/fbShim.js", "whatsapp/sessionStore.js", "whatsapp/typing.js", "botnumber.js"];
// এই ফাইলগুলোতে গার্ড কল থাকতে হবে (মুছে ফেললেও বট চলবে না)
const MUST_CALL_GUARD = ["Juwel.js", "Main.js", "whatsapp/index.js"];

const sha256 = (s) => crypto.createHash("sha256").update(String(s), "utf8").digest("hex");

function verify() {
  const problems = [];
  if (sha256(CREDIT) !== CREDIT_SHA256) problems.push("includes/creditGuard.js এর ক্রেডিট বদলানো হয়েছে");
  for (const f of FILES) {
    let t = "";
    try { t = fs.readFileSync(path.join(ROOT, f), "utf8"); } catch (e) { problems.push(f + " পাওয়া যায়নি"); continue; }
    if (!t.includes(CREDIT)) problems.push(f + " এ ক্রেডিট নেই/বদলানো হয়েছে");
  }
  for (const f of MUST_CALL_GUARD) {
    try { if (!/creditGuard/.test(fs.readFileSync(path.join(ROOT, f), "utf8"))) problems.push(f + " থেকে Credit Guard সরানো হয়েছে"); } catch (e) { /* উপরে ধরা হয়েছে */ }
  }
  try {
    if (!fs.readFileSync(path.join(ROOT, "config.json"), "utf8").includes(CREDIT)) problems.push("config.json এ ক্রেডিট নেই/বদলানো হয়েছে");
  } catch (e) { problems.push("config.json পাওয়া যায়নি"); }
  return problems;
}

function enforce(who) {
  const problems = verify();
  if (!problems.length) return true;
  const R = "\x1b[1;91m", Y = "\x1b[1;93m", Z = "\x1b[0m";
  console.error("\n" + R + "╔══════════════════════════════════════════════════════╗" + Z);
  console.error(R + "║  ❌ CREDIT GUARD — বট চালু হবে না" + Z + " (" + (who || "?") + ")");
  console.error(R + "║  কারণ: ক্রেডিট বদলানো/মুছে ফেলা হয়েছে" + Z);
  console.error(R + "╚══════════════════════════════════════════════════════╝" + Z);
  for (const p of problems) console.error(Y + "   • " + p + Z);
  console.error("   মূল ক্রেডিট ফিরিয়ে দিন: " + CREDIT + "\n");
  process.exit(1);
}

module.exports = { CREDIT, verify, enforce };
