const axios = require("axios");

const triggers = [
  "i love you", "i love u", "i luv you", "iloveyou",
  "আই লাভ ইউ"
];

const audioUrls = [
  "https://files.catbox.moe/z96wll.mp3"
];

// ⏱️ কুলডাউন: ২ ঘন্টা (মিলিসেকেন্ডে)
const COOLDOWN_MS = 2 * 60 * 60 * 1000;

// প্রতিটি থ্রেডের শেষ ব্যবহারের সময়
const lastUsed = new Map();

module.exports.config = {
  name: "auto_voice",
  version: "1.1.0",
  hasPermission: 0,
  credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  description: "Auto voice reply",
  commandCategory: "no prefix",
  usages: "",
  cooldowns: 0
};

module.exports.handleEvent = async function ({ api, event }) {
  try {
    if (!event.body) return;

    // বটের নিজের মেসেজ ইগনোর
    if (event.senderID === api.getCurrentUserID()) return;

    // বড় হাতের/ছোট হাতের সব লেখা (I LOVE YOU, i love you) একই ভাবে ধরবে
    const msg = event.body.toLowerCase().trim();

    // ✅ মেসেজের যেকোনো জায়গায় ট্রিগার থাকলেই কাজ করবে
    const isTriggered = triggers.some(t => msg.includes(t.toLowerCase()));
    if (!isTriggered) return;

    // 👑 বট এডমিন চেক (config.json এর ADMINBOT থেকে)
    const adminList = (global.config && global.config.ADMINBOT) || [];
    const isAdmin = adminList.map(String).includes(String(event.senderID));

    // ⏱️ এডমিন না হলে কুলডাউন চেক
    const key = event.threadID;
    const now = Date.now();

    if (!isAdmin) {
      const last = lastUsed.get(key) || 0;
      if (now - last < COOLDOWN_MS) return;
      lastUsed.set(key, now);
    }

    const url = audioUrls[Math.floor(Math.random() * audioUrls.length)];

    let voice;
    try {
      voice = await axios({
        url,
        method: "GET",
        responseType: "stream",
        timeout: 15000
      });
    } catch (e) {
      // ডাউনলোড ফেল করলে কুলডাউন রিসেট
      if (!isAdmin) lastUsed.delete(key);
      throw e;
    }

    return api.sendMessage(
      {
        body: "🅙𝐔🅦𝐄🅛",
        attachment: voice.data
      },
      event.threadID,
      event.messageID
    );

  } catch (err) {
    console.log("[AUTO_VOICE ERROR]", err.message || err);
  }
};

module.exports.run = async function () {};
