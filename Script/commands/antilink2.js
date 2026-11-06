/**
 * ANTI LINK 2 & BAD WORD — Script/commands/antilink2.js
 * সব গ্রুপে সবসময় চালু (অন/অফ নেই)।
 * 🔗 লিংক  : শুধু ২ ধরনের লিংক ৫ সেকেন্ড পর ডিলিট + নোটিশ কার্ড:
 *            ১) মেসেঞ্জার গ্রুপের লিংক (m.me/j/...)
 *            ২) ক্ষতিকর সাইট (জুয়া/বেটিং, হ্যাকিং, ফিশিং, IP লগার)
 *            ইউটিউব, টিকটক, রিলস, ভিডিও, টেলিগ্রাম, অন্য সব লিংক ডিলিট হবে না।
 * 🤬 গালি  : সাথে সাথে ডিলিট + সুন্দর ওয়ার্নিং কার্ড (২০ সেকেন্ড পর কার্ডও মুছে যায়)
 * গ্রুপ অ্যাডমিন ও বট অ্যাডমিনের মেসেজে কিছু হবে না।
 * শব্দ ম্যানেজ (শুধু গ্রুপ অ্যাডমিন):  #antilink2 add <শব্দ> | del <শব্দ> | list
 * ⚠️ বট গ্রুপ অ্যাডমিন না হলে কিছুই করবে না (ডিলিট নেই, নোটিশও নেই)।
 * বট অ্যাডমিন হলে: মেসেজ ডিলিট + সুন্দর নোটিশ কার্ড।
 */
const fs = require("fs-extra");
const path = require("path");

const CREDIT = "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐";

module.exports.config = {
  name: "antilink2",
  version: "1.3.0",
  hasPermssion: 1,
  credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  description: "Delete links & bad words from normal users",
  commandCategory: "group",
  usages: "antilink2 add|del|list",
  cooldowns: 3
};

const LINK_DELETE_DELAY_MS = 5000; // লিংক ডিলিটের সময় (৫ সেকেন্ড)
const CARD_LIFETIME_MS = 20000;    // ওয়ার্নিং কার্ড কতক্ষণ থাকবে

// আলাদা ফাইল, যাতে আপনার আগের antilink কোডের সাথে মিশে না যায়
const FILE = path.join(__dirname, "cache", "antilink2.json");

// 👇 নতুন গালিগুলো এই লিস্টে কমা দিয়ে যোগ করুন
const uniq = (a) => { const s = new Set(), o = []; for (const x of a) { const k = x.trim().toLowerCase(); if (k && !s.has(k)) { s.add(k); o.push(x.trim()); } } return o; };
const WORDS_EN_BN = ["fuck", "bitch", "asshole", "fucking", "motherfucker", "mother fucker", "fucker", "bollocks", "Sawya", "sawya", "tui magi", "stupid juwel", "bot fuck you", "🖕", "🖕🖕", "🖕🖕🖕", "toke🖕", "toke🖕🖕", "toke 🖕", "🖕 fuck", "fuck 🖕", "chut", "gand", "bhosdi", "benchod", "madarchod", "randi", "kutta bacsa", "magi", "Magi", "MC Bot", "MC bot", "Mc Bot", "Vodar Bot", "Sawyar Bot", "sawyar bot", "bot tor booske chudi", "Bot tor boos ke chudi", "xodi", "Xodi", "cdi", "Cdi", "tor mar Voda", "tor mare cdi", "Tor mare chodi", "Tor mar voda", "Tor mar Voda", "Tor Bon ar Voda", "Pompom", "chutmarani", "juwek ke cudi", "Juwel ke cdi", "tor boos Juwel ke Chudi", "bokacoda", "xoda", "72 Lack", "chdi", "chup magi", "Chup magi", "tok chudi", "Tor mar Sawya", "Tor bon ar sawya", "Tor Bon ar Sawya", "Sawya dey", "tok abal", "Voda", "voda", "Juwel ke chudi", "abal", "vodar group", "Vodar group", "Sawyar group", "nunu", "Nunu", "Tuntuni", "tuntuni", "tor boos ke cudi", "Tor boos ke cudi", "Tor boss ke chudi", "আবাল", "সাউয়া", "ভোদা", "মাগি", "চুদি", "বোকাচোদা", "বোকাচুদা", "মাদারচোদ", "চুদা", "চুদতে", "সেক্স করতে", "ভোদার গুপ", "সাউয়ার", "খানকি", "পুটকি", "গুদ", "রেন্ডি", "হাত মার", "গিটার বাজাও", "হাত মাড়া", "চুদবো", "চুদানির পোলা", "মাং", "মাংগের বেডি", "বালের বট", "তোর বোন এর ভোদা", "তোর বোন এর সাউয়া", "তোর বোন কে চুদি", "সাউয়ার বট", "সাউয়ার কথা", "তোর মার ভোদা", "তোর সাউয়া", "তোর মায়ের সাউয়া", "তোর মার সাউয়া", "তোর বোনের সাউয়া", "তোর সাউয়া মাগি", "জুয়েল কে চুদি", "জুয়েল চোকাচোদা", "এডমিন এর বাল", "চোদার", "তোর মতো মাগি", "তোক চুদি", "তুই ১২ মাগি", "জুয়েল এর মারে চুদি", "জুয়েল এর মাকে চুদি", "জুয়েল এর মার ভোদা", "জুয়েল এর মার সাউয়া", "তুই হাত মাড়া মাগি", "তোর মা মাগি", "তোর বোন মাগি", "তোর মাকে চুদি", "তোর বোনকে চুদি", "জুয়েল এর বোন কে চুদি", "জুয়েল এর বোন এর সাউয়া", "জয়েল এর বোন এর ভোদা", "কার বাল", "নিছের বাল", "চোকাচোদা", "রেন্ডির ছেলে", "রেন্ডি মেয়ে", "পম্পম", "Pompom", "আবাল নাকি", "জুয়েল বোকাচোদা", "তুই বোকাচোদা", "তুই বুকাচুদা", "জাও গিটার বাজাও", "হাত মারবে", "হাত মারবো", "হাত মারো", "হাত মারতে জাবে", "বট এর বসকে চুদি", "বট তোর বসকে চুদি", "বট তোর বস জুয়েল কে চুদি", "গিটার বাজাবো", "তুই ১২ ভাতারী মাগি", "তুই হাত মাড়া"];
const DEFAULT_WORDS = uniq(WORDS_EN_BN);

let DB = { words: DEFAULT_WORDS };
try { fs.ensureDirSync(path.dirname(FILE)); if (fs.existsSync(FILE)) DB.words = fs.readJsonSync(FILE).words || DEFAULT_WORDS; } catch (_) {}
const save = () => { try { fs.writeJsonSync(FILE, DB); } catch (_) {} };

const creditOK = () => module.exports.config.credits === CREDIT && CREDIT.includes("JU");
const LINE = "━━━━━━━━━━━━━━━━━━━━━━";
const frame = (icon, title, rows) =>
`╔${LINE}╗
   ${icon}  ${title}
╚${LINE}╝

${rows.join("\n")}

${LINE}
🛡️ 𝗔𝘂𝘁𝗼 𝗠𝗼𝗱𝗲𝗿𝗮𝘁𝗶𝗼𝗻 • 𝗔𝗹𝘄𝗮𝘆𝘀 𝗢𝗻
✦ 𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗕𝘆 ➤ ${CREDIT} ✦`;

const creditMsg = () => frame("⛔", "𝗖𝗥𝗘𝗗𝗜𝗧 𝗘𝗥𝗥𝗢𝗥", [
  "⚠️ এই কোডের ক্রেডিট চেঞ্জ করা হয়েছে!", "🚫 তাই এই ফিচারটি কাজ করবে না।", "✅ ঠিক ক্রেডিট ফিরিয়ে দিন।"]);

// ───── লিংক ডিটেকশন: শুধু মেসেঞ্জার গ্রুপ লিংক আর ক্ষতিকর সাইট ─────
// ১) মেসেঞ্জার গ্রুপের ইনভাইট লিংক
const GROUP_LINK_RE = /(?:^|[^a-z0-9])(?:m\.me|fb\.me|messenger\.com|(?:www\.|web\.|m\.)?facebook\.com\/messages)\/(?:j|join)\//i;

// ২) ক্ষতিকর সাইট — হোস্টনেমে এই শব্দ/ডোমেইন থাকলে ধরবে (নতুন যোগ করতে চাইলে এখানে লিখুন)
const HARMFUL_KEYWORDS = [
  // জুয়া / বেটিং
  "casino", "betting", "gambl", "1xbet", "bet365", "1win", "melbet", "mostbet", "parimatch", "betwinner",
  "linebet", "22bet", "betway", "megapari", "pinup", "pin-up", "jeetwin", "jeetbuzz", "crickex", "babu88",
  "jilibet", "baji", "slots", "slotgame", "slotmachine",
  // হ্যাকিং / ফিশিং / IP লগার
  "hack", "phish", "carding", "cvv", "keylogger", "ddos", "botnet", "grabify", "iplogger", "ipgrabber", "ip-grabber"
];
// "hack" থাকলেও এগুলো ভালো সাইট, ডিলিট হবে না
const HARMLESS_HACK_RE = /hacker(rank|one|news|noon|earth)|hackthebox|hackaday|hackclub|hackster|hackathon|hackmd|hackernoon/;
// এই সাইটগুলো কখনোই ডিলিট হবে না
const SAFE_HOST_RE = /(^|\.)(youtube\.com|youtu\.be|tiktok\.com|t\.me|telegram\.(me|org)|instagram\.com|fb\.watch|facebook\.com|fb\.com)$/;

function linkKindOf(text) {
  const t = String(text).toLowerCase();
  if (GROUP_LINK_RE.test(t)) return "group";
  const hosts = t.match(/(?:[a-z0-9-]+\.)+[a-z]{2,}/g) || [];
  for (const h0 of hosts) {
    const h = h0.replace(/^www\./, "");
    if (SAFE_HOST_RE.test(h)) continue;
    if (HARMLESS_HACK_RE.test(h)) continue;
    if (HARMFUL_KEYWORDS.some((k) => h.includes(k))) return "harm";
  }
  return null;
}
const SPLIT_RE = /[\s.,!?;:'"()\[\]{}<>|\\\/\-_*~`^@#$%&+=]+/;

// লুকানো/অদৃশ্য অক্ষর বাদ, ইংরেজি অক্ষর বারবার লিখলে (fuuuck) এক করে ফেলা
const clean = (t) => t.normalize("NFC").replace(/[\u200B-\u200D\u2060\uFEFF]/g, "").toLowerCase();
const squash = (t) => t.replace(/([a-z])\1+/g, "$1");
const isLatin = (w) => /^[a-z]+$/.test(w);

// ছোট ইংরেজি শব্দ (যেমন magi, chut, gand) অন্য শব্দের ভেতরে ধরলে ভুল হয় (magic, parachute),
// তাই ৬+ অক্ষর বা নিচের লিস্টের শব্দ ছাড়া বাকিগুলো শুধু হুবহু মিললে ধরবে।
const SUB_OK = new Set(["fuck", "bitch", "sawya"]);
const canSub = (w) => isLatin(w) && (w.length >= 6 || SUB_OK.has(w));

function badWordIn(text) {
  const t = clean(text);
  const spaced = t.replace(/\s+/g, " ");
  const tokens = t.split(SPLIT_RE).filter(Boolean);
  const joined = squash(t.replace(/[^a-z]/g, "")); // "f u c k" / "f.u.c.k" ধরার জন্য
  for (const raw of DB.words) {
    const w = clean(raw).trim().replace(/\s+/g, " ");
    if (!w) continue;
    // একাধিক শব্দের বাক্য, ইমোজি বা সংখ্যা থাকলে: লেখার ভেতর খোঁজা
    if (/\s/.test(w) || /[^a-z\u0980-\u09FF]/.test(w)) {
      if (spaced.includes(w)) return raw;
      if (/^[a-z ]+$/.test(w) && squash(spaced).includes(squash(w))) return raw;
      continue;
    }
    for (const tok of tokens) {
      if (tok === w) return raw;                                     // হুবহু মিল
      if (canSub(w) && squash(tok).includes(squash(w))) return raw;  // fucking, fuuuck
    }
    if (canSub(w) && joined.includes(squash(w))) return raw;         // f u c k
  }
  return null;
}

const adminCache = new Map(); // tid -> {t, ids}
async function getAdmins(api, tid) {
  const c = adminCache.get(tid);
  if (c && Date.now() - c.t < 60000) return c.ids;
  const info = await api.getThreadInfo(tid);
  const ids = (info.adminIDs || []).map((a) => String(a.id || a));
  adminCache.set(tid, { t: Date.now(), ids });
  return ids;
}

// ───── অটো স্ক্যান: প্রতিটা মেসেজে চলে ─────
module.exports.handleEvent = async function ({ api, event }) {
  try {
    const tid = String(event.threadID);
    if (!event.body || event.type !== "message") return;
    if (!creditOK()) return;

    const sender = String(event.senderID);
    const botID = String(api.getCurrentUserID());
    if (sender === botID) return;

    const linkKind = linkKindOf(event.body);
    const isLink = !!linkKind;
    const bad = isLink ? null : badWordIn(event.body);
    if (!isLink && !bad) return;

    const cfg = global.config || {};
    const botAdmins = [].concat(cfg.ADMINBOT || [], cfg.DEVELOPER || []).map(String);
    if (botAdmins.includes(sender)) return;
    const admins = await getAdmins(api, tid);
    if (!admins.includes(botID)) return; // বট এই গ্রুপে অ্যাডমিন না হলে কিছুই করবে না
    if (admins.includes(sender)) return;

    // 🔗 লিংক: ৫ সেকেন্ড পর ডিলিট + নোটিশ কার্ড (কিক নেই)
    if (isLink) {
      setTimeout(async () => {
        try {
          let ok = true;
          await new Promise((res) => api.unsendMessage(event.messageID, (e) => { if (e) ok = false; res(); }));
          if (!ok) return; // ডিলিট না হলে নোটিশও দেবে না
          let uname = "User";
          try { const u = await api.getUserInfo([sender]); uname = (u[sender] || {}).name || uname; } catch (_) {}
          const notice = linkKind === "group"
            ? frame("🔗", "𝗟𝗜𝗡𝗞 𝗕𝗟𝗢𝗖𝗞𝗘𝗗", [
                `👤 ইউজার : ${uname}`,
                `🚫 আমি যে গ্রুপে থাকবো ওই গ্রুপে কোনো গ্রুপের লিংক শেয়ার করতে পারবি না!`,
                `🗑️ লিংক শেয়ার করলে আমি সেটি ডিলিট করে দিব।`,
                `✅ আপনার লিংকটি ডিলিট করা হয়েছে।`
              ])
            : frame("☠️", "𝗛𝗔𝗥𝗠𝗙𝗨𝗟 𝗟𝗜𝗡𝗞 𝗕𝗟𝗢𝗖𝗞𝗘𝗗", [
                `👤 ইউজার : ${uname}`,
                `🚫 জুয়া, হ্যাকিং বা ক্ষতিকর সাইটের লিংক শেয়ার করা সম্পূর্ণ নিষেধ!`,
                `🗑️ আপনার লিংকটি ডিলিট করা হয়েছে।`,
                `⚠️ আবার করলে কঠোর ব্যবস্থা নেওয়া হবে।`
              ]);
          api.sendMessage({ body: notice, mentions: [{ tag: uname, id: sender }] }, tid, (err, info) => {
            if (!err && info && info.messageID) setTimeout(() => { try { api.unsendMessage(info.messageID); } catch (_) {} }, CARD_LIFETIME_MS);
          });
        } catch (_) {}
      }, LINK_DELETE_DELAY_MS);
      return;
    }

    // 🤬 গালি: সাথে সাথে ডিলিট + নোটিশ কার্ড
    let deleted = true;
    await new Promise((res) => api.unsendMessage(event.messageID, (e) => { if (e) deleted = false; res(); }));
    if (!deleted) return; // ডিলিট না হলে নোটিশও দেবে না

    let name = "User";
    try { const u = await api.getUserInfo([sender]); name = (u[sender] || {}).name || name; } catch (_) {}

    const msg = frame("🤬", "𝗕𝗔𝗗 𝗪𝗢𝗥𝗗 𝗕𝗟𝗢𝗖𝗞𝗘𝗗", [
      `👤 ইউজার : ${name}`,
      `🚫 গ্রুপে গালাগালি করা সম্পূর্ণ নিষেধ!`,
      `🗑️ আপনার মেসেজটি ডিলিট করা হয়েছে।`,
      `⚠️ আবার করলে কঠোর ব্যবস্থা নেওয়া হবে।`
    ]);
    api.sendMessage({ body: msg, mentions: [{ tag: name, id: sender }] }, tid, (err, info) => {
      if (!err && info && info.messageID) setTimeout(() => { try { api.unsendMessage(info.messageID); } catch (_) {} }, CARD_LIFETIME_MS);
    });
  } catch (e) { console.log("[antilink2] Error:", e && e.message ? e.message : e); }
};

// ───── কমান্ড: শুধু ব্লক শব্দ ম্যানেজ (ফিল্টার সবসময় চালু) ─────
module.exports.run = async function ({ api, event, args }) {
  const tid = String(event.threadID);
  const send = (m) => api.sendMessage(m, tid, event.messageID);
  if (!creditOK()) return send(creditMsg());

  const act = (args[0] || "").toLowerCase();
  const w = (args[1] || "").toLowerCase();

  if (act === "list") {
    return send(frame("📚", "𝗕𝗟𝗢𝗖𝗞𝗘𝗗 𝗪𝗢𝗥𝗗𝗦", [DB.words.map((x, i) => `${i + 1}. ${x}`).join("\n") || "কোনো শব্দ নেই"]));
  }
  if (act === "add" && w) {
    if (!DB.words.includes(w)) DB.words.push(w);
    save();
    return send(frame("➕", "𝗪𝗢𝗥𝗗 𝗔𝗗𝗗𝗘𝗗", [`✅ "${w}" ব্লক লিস্টে যোগ হয়েছে`]));
  }
  if (act === "del" && w) {
    DB.words = DB.words.filter((x) => x !== w);
    save();
    return send(frame("➖", "𝗪𝗢𝗥𝗗 𝗥𝗘𝗠𝗢𝗩𝗘𝗗", [`✅ "${w}" ব্লক লিস্ট থেকে সরানো হয়েছে`]));
  }
  return send(frame("🛡️", "𝗔𝗡𝗧𝗜 𝗟𝗜𝗡𝗞 𝟮 • 𝗔𝗟𝗪𝗔𝗬𝗦 𝗢𝗡", [
    "🔗 মেসেঞ্জার গ্রুপ লিংক ও ক্ষতিকর সাইট : ৫ সেকেন্ড পর ডিলিট + নোটিশ", "▶️ ইউটিউব/টিকটক/রিলস/টেলিগ্রাম : ডিলিট হবে না", "🤬 গালি : সাথে সাথে ডিলিট + নোটিশ", "⚠️ বট অ্যাডমিন না হলে কাজ করবে না।", "✅ ফিল্টার সবসময় চালু আছে।", "", "শব্দ ম্যানেজ:", "antilink2 add <শব্দ>", "antilink2 del <শব্দ>", "antilink2 list"]));
};
