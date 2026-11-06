// Credit : 乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐
// ============================================================
//  WhatsApp সেশন ব্যাকআপ (Render ফ্রি প্ল্যানে ডিস্ক মুছে যায় বলে)
//  বট চালু হলে আগের সেশন ফিরিয়ে আনে, চলার সময় বদলালে ব্যাকআপ রাখে।
//  ব্যবহার: Upstash Redis (ফ্রি) এর REST URL ও TOKEN env এ দিলেই চালু হয়।
//    UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN (অথবা config.json → WHATSAPP.sessionStore)
//  না দিলে এই ফাইল কিছুই করে না (শুধু লোকাল wa_session ফোল্ডার ব্যবহার হয়)।
// ============================================================
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");

// মান আসে env থেকে, না থাকলে config.json এর WHATSAPP.sessionStore {url, token} থেকে
const waCfg = () => (global.config && global.config.WHATSAPP) || {};
const storeCfg = () => waCfg().sessionStore || {};
const getUrl = () => String(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || storeCfg().url || "").trim().replace(/\/+$/, "");
const getToken = () => String(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || storeCfg().token || "").trim();
const getCreds = () => String(process.env.WA_CREDS || waCfg().sessionCreds || "").trim();
const CHUNK = 350000; // প্রতি অংশে সর্বোচ্চ অক্ষর (Upstash ফ্রি রিকোয়েস্ট লিমিট ১MB)
const MIN_GAP = 60000; // দুই ব্যাকআপের মধ্যে ন্যূনতম ফাঁক
const TICK = 20000;

let cfg = { dir: "", key: "wa-session:default", log: console.log };
let paused = false, started = false, restored = false, uploading = false;
let lastHash = "", lastSig = "", lastUpload = 0, lastLog = 0, timer = null;
let credsFromConfig = false; // config.json/env এর সেশন থেকে এই রানে লগইন হয়েছে কিনা

const enabled = () => !!(getUrl() && getToken() && typeof fetch === "function");

function configure(o) { cfg = Object.assign(cfg, o || {}); }

async function redis(commands) {
  const r = await fetch(getUrl() + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + getToken(), "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error("store HTTP " + r.status);
  const out = await r.json();
  for (const x of out) if (x && x.error) throw new Error("store: " + x.error);
  return out;
}

function listFiles(dir) {
  try {
    return fs.readdirSync(dir).filter((n) => {
      try { return fs.statSync(path.join(dir, n)).isFile(); } catch (e) { return false; }
    }).sort();
  } catch (e) { return []; }
}

function signature(dir) {
  return listFiles(dir).map((n) => {
    try { const st = fs.statSync(path.join(dir, n)); return n + ":" + st.size + ":" + Math.floor(st.mtimeMs); } catch (e) { return n; }
  }).join("|");
}

function isRegistered(dir) {
  try { const o = JSON.parse(fs.readFileSync(path.join(dir, "creds.json"), "utf8")); return o.registered === true || !!o.account; } catch (e) { return false; }
}

function pack(dir) {
  const files = {};
  for (const n of listFiles(dir)) {
    const buf = fs.readFileSync(path.join(dir, n));
    const txt = buf.toString("utf8");
    if (Buffer.from(txt, "utf8").equals(buf)) {
      if (n.endsWith(".json")) JSON.parse(txt); // লেখার মাঝখানে থাকলে এরর দিয়ে এবারের ব্যাকআপ বাদ
      files[n] = { t: txt };
    } else {
      files[n] = { b: buf.toString("base64") };
    }
  }
  return zlib.gzipSync(Buffer.from(JSON.stringify(files)), { level: 9 }).toString("base64");
}

function unpack(b64, dir) {
  const files = JSON.parse(zlib.gunzipSync(Buffer.from(b64, "base64")).toString("utf8"));
  fs.mkdirSync(dir, { recursive: true });
  let n = 0;
  for (const [name, v] of Object.entries(files)) {
    if (!name || name.includes("/") || name.includes("\\") || name.startsWith(".")) continue;
    fs.writeFileSync(path.join(dir, name), v.t != null ? Buffer.from(v.t, "utf8") : Buffer.from(v.b, "base64"));
    n++;
  }
  return n;
}

const sha = (s) => crypto.createHash("sha1").update(s).digest("hex");

async function upload(force) {
  if (!enabled() || paused || uploading || !cfg.dir) return false;
  if (!isRegistered(cfg.dir)) return false; // লিংক হওয়ার আগের অবস্থা ব্যাকআপ হবে না
  uploading = true;
  try {
    const data = pack(cfg.dir);
    const hash = sha(data);
    if (hash === lastHash) { lastSig = signature(cfg.dir); return true; }
    const n = Math.ceil(data.length / CHUNK);
    for (let i = 0; i < n; i++) await redis([["SET", cfg.key + ":" + i, data.slice(i * CHUNK, (i + 1) * CHUNK)]]);
    await redis([["SET", cfg.key + ":meta", JSON.stringify({ n, hash, at: Date.now() })]]);
    lastHash = hash; lastUpload = Date.now(); lastSig = signature(cfg.dir);
    if (force || Date.now() - lastLog > 600000) {
      lastLog = Date.now();
      cfg.log("☁ সেশন ব্যাকআপ রাখা হয়েছে (" + Math.round(data.length / 1024) + " KB)");
    }
    return true;
  } catch (e) {
    if (!/Unexpected|JSON/.test(e.message)) cfg.log("☁ সেশন ব্যাকআপ হয়নি: " + e.message);
    return false;
  } finally { uploading = false; }
}

function restoreFromEnv() {
  const v = getCreds();
  if (!v) return false;
  try {
    const credsPath = path.join(cfg.dir, "creds.json");
    if (fs.existsSync(credsPath)) return false;
    const txt = Buffer.from(v, "base64").toString("utf8");
    const o = JSON.parse(txt);
    if (!o || !(o.registered === true || o.account)) throw new Error("এটা লিংক-করা সেশন নয়");
    fs.mkdirSync(cfg.dir, { recursive: true });
    fs.writeFileSync(credsPath, txt);
    credsFromConfig = true;
    cfg.log("🔑 WA_CREDS থেকে সেশন ফেরানো হয়েছে — নতুন করে লিংক করতে হবে না");
    return true;
  } catch (e) {
    cfg.log("WA_CREDS ব্যবহার করা যায়নি: " + e.message + " (মানটা ঠিকমতো কপি হয়েছে কিনা দেখুন)");
    return false;
  }
}

async function restoreFromRemote() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await redis([["GET", cfg.key + ":meta"]]);
      const metaStr = r[0] && r[0].result;
      if (!metaStr) { cfg.log("☁ আগের কোনো সেশন ব্যাকআপ নেই (প্রথমবার লিংক করুন)"); return; }
      const meta = JSON.parse(metaStr);
      let data = "";
      for (let i = 0; i < meta.n; i++) {
        const rr = await redis([["GET", cfg.key + ":" + i]]);
        const part = rr[0] && rr[0].result;
        if (typeof part !== "string") throw new Error("অংশ " + i + " পাওয়া যায়নি");
        data += part;
      }
      if (sha(data) !== meta.hash) throw new Error("ব্যাকআপ ফাইল অসম্পূর্ণ (hash মেলেনি)");
      const count = unpack(data, cfg.dir);
      lastHash = meta.hash;
      cfg.log("☁ আগের সেশন ফিরিয়ে আনা হয়েছে (" + count + " ফাইল) — নতুন করে লিংক করতে হবে না");
      return;
    } catch (e) {
      cfg.log("☁ সেশন ফেরানো যায়নি (চেষ্টা " + attempt + "/3): " + e.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

async function restoreOnce() {
  if (restored) return;
  restored = true;
  const credsPath = path.join(cfg.dir, "creds.json");
  if (fs.existsSync(credsPath)) { cfg.log("লোকাল সেশন পাওয়া গেছে"); return; }
  if (enabled()) {
    await restoreFromRemote();
    if (fs.existsSync(credsPath)) return;
  }
  if (restoreFromEnv()) return;
  if (!enabled()) cfg.log("ℹ সেশন সেভ বন্ধ আছে — এটা স্বাভাবিক, কিছু বসাতে হবে না। Render রিস্টার্ট হলে /pair থেকে আবার কোড বসাতে হবে");
}

async function clearRemote() {
  if (!enabled()) return;
  try {
    const r = await redis([["GET", cfg.key + ":meta"]]);
    const metaStr = r[0] && r[0].result;
    const n = metaStr ? JSON.parse(metaStr).n : 0;
    const cmds = [["DEL", cfg.key + ":meta"]];
    for (let i = 0; i < n; i++) cmds.push(["DEL", cfg.key + ":" + i]);
    await redis(cmds);
    lastHash = "";
    cfg.log("☁ পুরনো সেশন ব্যাকআপ মুছে ফেলা হয়েছে");
  } catch (e) { cfg.log("☁ ব্যাকআপ মুছতে পারেনি: " + e.message); }
}

function startBackup() {
  if (started || !enabled()) return;
  started = true;
  timer = setInterval(() => {
    if (paused || uploading) return;
    const sig = signature(cfg.dir);
    if (sig === lastSig) return;
    if (Date.now() - lastUpload < MIN_GAP) return;
    upload(false);
  }, TICK);
  if (timer.unref) timer.unref();
}

const markDirty = () => { lastSig = ""; };
const pause = () => { paused = true; };
const resume = () => { paused = false; };
const flush = () => upload(true);

const usedConfigCreds = () => credsFromConfig;
const forgetConfigCreds = () => { credsFromConfig = false; };

module.exports = { configure, enabled, restoreOnce, startBackup, flush, clearRemote, markDirty, pause, resume, usedConfigCreds, forgetConfigCreds };
