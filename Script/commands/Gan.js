const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");

let lastPlayed = -1;
const downloading = new Set();
const processedMessages = new Set();

// 🛡️ Cooldown + Ban system
const userCooldown = new Map();
const userWarnings = new Map();
const bannedUsers = new Map();

const COOLDOWN_MS = 5000;          // ৫ সেকেন্ড cooldown
const BAN_WINDOW_MS = 60000;       // ১ মিনিট window
const MAX_USES_IN_WINDOW = 4;      // ১ মিনিটে সর্বোচ্চ ৪ বার
const BAN_DURATION_MS = 5 * 60000; // ৫ মিনিট ban

module.exports.config = {
  name: "gan",
  version: "1.6.0",
  hasPermission: 0,
  credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  description: "Play random song without prefix",
  commandCategory: "music",
  usages: "gan",
  cooldowns: 5,
};

const songLinks = [
  "https://files.catbox.moe/etsdn9.mp3",
  "https://files.catbox.moe/ayepdz.mp3",
  "https://files.catbox.moe/oaecnx.mp3",
  "https://files.catbox.moe/xtpf61.mp3",
  "https://files.catbox.moe/12grz0.mp3",
  "https://files.catbox.moe/aaqddo.mp3",
  "https://files.catbox.moe/k3acvx.mp3",
  "https://files.catbox.moe/nry1qv.mp3",
  "https://files.catbox.moe/23e8u1.mp3",
  "https://files.catbox.moe/y8dzik.mp3",
  "https://files.catbox.moe/z9d2e6.mp3",
  "https://files.catbox.moe/0xscc8.mp3",
  "https://files.catbox.moe/q4m2ad.mp3",
  "https://files.catbox.moe/y8bg4r.mp3",
  "https://files.catbox.moe/q61co1.mp3",
  "https://files.catbox.moe/euq7fo.mp3",
  "https://files.catbox.moe/x5f56o.mp3",
  "https://files.catbox.moe/avlqok.mp3",
  "https://files.catbox.moe/v0twt3.mp3",
  "https://files.catbox.moe/qmpvpt.mp3",
  "https://files.catbox.moe/wrdtb0.mp3",
  "https://files.catbox.moe/s4bzr8.mp3",
  "https://files.catbox.moe/4m5z15.mp3",
  "https://files.catbox.moe/i6v5xj.mp3",
  "https://files.catbox.moe/7tz9ts.mp3",
  "https://files.catbox.moe/mdh4rg.mp3",
  "https://files.catbox.moe/aa643l.mp3",
  "https://files.catbox.moe/ih48ki.mp3",
  "https://files.catbox.moe/gvvb82.mp3",
  "https://files.catbox.moe/tht37y.mp3",
  "https://files.catbox.moe/bmk3mq.mp3",
  "https://files.catbox.moe/9i3g65.mp3",
  "https://files.catbox.moe/ap2yed.mp3",
];

/* ─── UI (ছোট নোটিশ) ─── */
function uiBanNotice(remainingSec) {
  const min = Math.floor(remainingSec / 60);
  const sec = remainingSec % 60;
  const timeStr = min > 0 ? `${min}m ${sec}s` : `${sec}s`;
  return `🚫 𝐁𝐀𝐍𝐍𝐄𝐃!\n⏳ বাকি: ${timeStr}\n📌 কারণ: স্প্যাম (১ মিনিটে ৪ বার)`;
}

function uiBannedJustNow() {
  return `⛔ 𝐘𝐎𝐔 𝐀𝐑𝐄 𝐁𝐀𝐍𝐍𝐄𝐃!\n🚨 স্প্যাম ডিটেক্টেড\n⏱️ সময়: ৫ মিনিট\n🔒 Status: BANNED`;
}

function uiCooldown(waitSec) {
  return `⏱️ 𝐒𝐋𝐎𝐖 𝐃𝐎𝐖𝐍!\n⏳ অপেক্ষা: ${waitSec} সেকেন্ড\n💡 Spam করলে ব্যান খাবেন!`;
}

/* ─── Cooldown + Ban Check ─── */
function checkUserLimit(api, event) {
  const { senderID, threadID } = event;
  const now = Date.now();

  // Ban check
  const banUntil = bannedUsers.get(senderID);
  if (banUntil && now < banUntil) {
    const remaining = Math.ceil((banUntil - now) / 1000);
    api.sendMessage(uiBanNotice(remaining), threadID);
    return false;
  } else if (banUntil && now >= banUntil) {
    bannedUsers.delete(senderID);
    userWarnings.delete(senderID);
  }

  // Cooldown check
  const last = userCooldown.get(senderID) || 0;
  if (now - last < COOLDOWN_MS) {
    const wait = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
    api.sendMessage(uiCooldown(wait), threadID);
    return false;
  }
  userCooldown.set(senderID, now);

  // Abuse tracking
  let w = userWarnings.get(senderID);
  if (!w || now - w.firstTime > BAN_WINDOW_MS) {
    w = { count: 1, firstTime: now };
    userWarnings.set(senderID, w);
  } else {
    w.count++;
    if (w.count >= MAX_USES_IN_WINDOW) {
      bannedUsers.set(senderID, now + BAN_DURATION_MS);
      userWarnings.delete(senderID);
      api.sendMessage(uiBannedJustNow(), threadID);
      return false;
    }
  }

  return true;
}

/* ─── Play Song ─── */
async function playSong(api, event) {
  const { threadID, messageID } = event;

  if (downloading.has(threadID)) {
    return api.sendMessage("⏳ আগের গান এখনো পাঠানো হচ্ছে, অপেক্ষা করুন...", threadID);
  }
  downloading.add(threadID);

  api.setMessageReaction("🎶", messageID, () => {}, true);

  let index;
  do {
    index = Math.floor(Math.random() * songLinks.length);
  } while (index === lastPlayed && songLinks.length > 1);
  lastPlayed = index;

  const songNumber = index + 1;
  const url = songLinks[index];

  const cacheDir = path.join(__dirname, "cache");
  fs.ensureDirSync(cacheDir);

  const filePath = path.join(cacheDir, `gan_${songNumber}_${Date.now()}.mp3`);

  const cleanup = () => {
    downloading.delete(threadID);
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) {}
  };

  try {
    const res = await axios({
      url,
      method: "GET",
      responseType: "stream",
      timeout: 120000,
      maxRedirects: 10,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept": "*/*",
        "Referer": "https://catbox.moe/",
      },
      validateStatus: (s) => s >= 200 && s < 400,
    });

    const writer = fs.createWriteStream(filePath);
    res.data.pipe(writer);

    res.data.on("error", (err) => {
      console.error("[GAN] Stream error:", err.message);
      cleanup();
      api.sendMessage("❌ ডাউনলোড stream error!", threadID);
    });

    writer.on("error", (err) => {
      console.error("[GAN] Writer error:", err.message);
      cleanup();
      api.sendMessage("❌ ফাইল সেভ করতে সমস্যা!", threadID);
    });

    writer.on("finish", () => {
      const size = fs.statSync(filePath).size;
      if (size < 5000) {
        cleanup();
        return api.sendMessage("❌ ফাইলটি ছোট/করাপ্ট, আবার চেষ্টা করুন।", threadID);
      }

      api.sendMessage(
        {
          body: `🎧𝐉𝐔𝐖𝐄𝐋🔊

🎵 Song No: ${songNumber}/${songLinks.length}
🔀 Mode: No Prefix

Enjoy 🎶`,
          attachment: fs.createReadStream(filePath),
        },
        threadID,
        () => cleanup()
      );
    });
  } catch (e) {
    console.error("[GAN] Error:", e.message);
    cleanup();
    api.sendMessage(
      `❌ গান পাঠাতে সমস্যা হয়েছে!\nReason: ${e.message}`,
      threadID
    );
  }
}

/* ─── No-prefix trigger ─── */
module.exports.handleEvent = async function ({ api, event }) {
  if (!event.body || !event.messageID) return;
  if (processedMessages.has(event.messageID)) return;
  processedMessages.add(event.messageID);
  setTimeout(() => processedMessages.delete(event.messageID), 60000);

  const msg = event.body.trim().toLowerCase();
  if (msg === "gan") {
    if (!checkUserLimit(api, event)) return;
    return playSong(api, event);
  }
};

/* ─── Prefix trigger এ কিছুই করবে না (double trigger fix) ─── */
module.exports.run = async function () {
  return;
};
