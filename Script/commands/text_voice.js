module.exports.config = {
  name: "text_voice",
  version: "1.4",
  hasPermssion: 0,
  credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  description: "মেসেজে I love you / আই লাভ ইউ থাকলেই কিউট মেয়ের ভয়েস প্লে করবে 😍",
  commandCategory: "noprefix",
  usages: "𝚃𝚎𝚡𝚃",
  cooldowns: 5
};

const axios = require("axios");
const fs = require("fs");
const path = require("path");

// ✅ এখানে সরাসরি ডাউনলোডযোগ্য অডিও লিংক দিন (mp3/m4a হলে ভালো)
// ভালো ফ্রি হোস্ট: https://cdn.jsdelivr.net  |  https://raw.githubusercontent.com  |  https://file.io
const triggers = [
  {
    pattern: /i\s*love\s*you/i,
    url: "https://cdn.jsdelivr.net/gh/yourname/yourrepo@main/iloveyou.mp3"
  },
  {
    pattern: /আই\s*লাভ\s*ইউ/,
    url: "https://cdn.jsdelivr.net/gh/yourname/yourrepo@main/ailoveyou.mp3"
  }
];

const cooldowns = {};

module.exports.handleEvent = async ({ api, event }) => {
  const { threadID, messageID, body, senderID } = event;
  if (!body || !senderID) return;

  const cleanedBody = body
    .replace(/[0-9]/g, "")
    .replace(/[^\p{L}\s\u0980-\u09FF]/gu, "")
    .trim();

  const matched = triggers.find(t => t.pattern.test(cleanedBody));
  if (!matched) return;

  const now = Date.now();
  if (cooldowns[senderID] && now - cooldowns[senderID] < 5000) return;
  cooldowns[senderID] = now;

  const audioUrl = matched.url;
  const ext = path.extname(new URL(audioUrl).pathname) || ".mp3";
  const cacheDir = path.join(__dirname, "cache");
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  const fileName = `voice_${Date.now()}_${Math.floor(Math.random()*9999)}${ext}`;
  const filePath = path.join(cacheDir, fileName);

  const cleanup = () => fs.unlink(filePath, () => {});

  try {
    const res = await axios({
      method: "GET",
      url: audioUrl,
      responseType: "stream",
      timeout: 30000,
      maxRedirects: 5,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "audio/*,*/*"
      },
      validateStatus: s => s >= 200 && s < 400
    });

    // ✅ Content-Type চেক — HTML পেজ নামালে বাদ দেব
    const ct = (res.headers["content-type"] || "").toLowerCase();
    if (ct.includes("text/html") || ct.includes("application/json")) {
      res.data.destroy();
      console.error("❌ Not an audio file. Content-Type:", ct);
      return; // চুপচাপ বাদ
    }

    const writer = fs.createWriteStream(filePath);
    res.data.pipe(writer);

    writer.on("finish", () => {
      const stat = fs.statSync(filePath);
      if (stat.size < 1000) { cleanup(); return; } // ফাইল খুব ছোট → বাদ

      api.sendMessage(
        { body: "", attachment: fs.createReadStream(filePath) },
        threadID,
        (err) => { cleanup(); if (err) console.error("Send error:", err); },
        messageID
      );
    });

    writer.on("error", (err) => { console.error("Write:", err.message); cleanup(); });

  } catch (error) {
    console.error("Download error:", error.message);
    cleanup();
  }
};

module.exports.run = () => {};
