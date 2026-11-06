module.exports.config = {
  name: "imgurall",
  version: "3.0.0",
  hasPermssion: 3,
  credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  description: "কমান্ড মেসেজ থেকে উপরের দিকে গ্রুপের শেষ N টি মিডিয়া Imgur লিংক বানাবে (admin only). Usage: imgurall 10",
  commandCategory: "other",
  usages: "imgurall [count]",
  cooldowns: 30,
};

// true = পুরোনো মিডিয়া আগে, নতুন পরে | false = কমান্ডের সবচেয়ে কাছের মিডিয়া আগে
const OLDEST_FIRST = false;
const MAX_LIMIT = 30;
const PAGE_SIZE = 50;
const MAX_PAGES = 20; // সর্বোচ্চ ১০০০ মেসেজ পর্যন্ত পেছনে খুঁজবে

// ===== বট এডমিন লিস্ট বের করার হেল্পার =====
function getBotAdmins() {
  const fs = global.nodemodule["fs-extra"];
  const path = global.nodemodule["path"];
  const possiblePaths = [];

  if (global.client && global.client.dirConfig) {
    possiblePaths.push(global.client.dirConfig);
  }
  try {
    possiblePaths.push(path.join(__dirname, "..", "..", "config.json"));
    possiblePaths.push(path.join(__dirname, "..", "..", "..", "config.json"));
    possiblePaths.push(path.join(process.cwd(), "config.json"));
  } catch (e) {}

  if (global.config && typeof global.config === "object") {
    const direct =
      global.config.ADMINBOT ||
      global.config.adminBot ||
      global.config.ADMIN ||
      global.config.admin;
    if (Array.isArray(direct) && direct.length > 0) {
      return direct.map(String);
    }
  }

  for (const p of possiblePaths) {
    try {
      if (p && fs.existsSync(p)) {
        const raw = JSON.parse(fs.readFileSync(p, "utf-8"));
        const list =
          raw.ADMINBOT || raw.adminBot || raw.ADMIN || raw.admin || raw.adminIds || [];
        if (Array.isArray(list) && list.length > 0) {
          return list.map(String);
        }
      }
    } catch (e) {}
  }
  return [];
}

// callback ও promise দুই ধরনের fca-তেই কাজ করবে
function getHistory(api, threadID, amount, timestamp) {
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (err, data) => {
      if (done) return;
      done = true;
      err ? reject(err) : resolve(data || []);
    };
    try {
      const r = api.getThreadHistory(threadID, amount, timestamp, (err, h) =>
        finish(err, h)
      );
      if (r && typeof r.then === "function") {
        r.then((h) => finish(null, h)).catch((e) => finish(e));
      }
    } catch (e) {
      finish(e);
    }
  });
}

function getMediaUrl(att) {
  return att.url || att.hiresUrl || att.largePreviewUrl || att.previewUrl || null;
}

function isMedia(att) {
  const t = att.type;
  return t === "photo" || t === "video" || t === "animated_image";
}

// কমান্ড মেসেজের উপর থেকে শুরু করে পেছনের দিকে count টি মিডিয়া খুঁজে আনে
async function collectMedia(api, threadID, commandMessageID, anchorTs, count) {
  const media = [];
  const seen = new Set();
  let cursor = anchorTs;

  for (let page = 0; page < MAX_PAGES && media.length < count; page++) {
    let history;
    try {
      history = await getHistory(api, threadID, PAGE_SIZE, cursor);
    } catch (e) {
      console.log("[imgurall] History fetch error:", e);
      break;
    }
    if (!history || history.length === 0) break;

    // নতুন → পুরোনো
    const sorted = [...history].sort(
      (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
    );

    for (const msg of sorted) {
      if (media.length >= count) break;
      if (msg.messageID === commandMessageID) continue;
      if (anchorTs && msg.timestamp && Number(msg.timestamp) >= Number(anchorTs)) continue;
      if (!msg.attachments || msg.attachments.length === 0) continue;

      for (const att of msg.attachments) {
        if (media.length >= count) break;
        if (!isMedia(att)) continue;
        const url = getMediaUrl(att);
        if (!url || seen.has(url)) continue;
        seen.add(url);
        media.push({ url, type: att.type, timestamp: msg.timestamp });
      }
    }

    // পরের পেজের জন্য সবচেয়ে পুরোনো মেসেজের সময় থেকে আবার পেছনে যাবে
    const oldestTs = Number(sorted[sorted.length - 1].timestamp);
    if (!oldestTs || oldestTs >= Number(cursor)) break;
    cursor = oldestTs;
  }

  return media;
}

module.exports.run = async ({ api, event, args }) => {
  const axios = global.nodemodule["axios"];
  const { threadID, messageID, senderID } = event;

  // ===== বট এডমিন চেক =====
  const botAdminList = getBotAdmins();
  const isBotAdmin =
    botAdminList.length > 0 && botAdminList.includes(String(senderID));

  if (!isBotAdmin) {
    return api.sendMessage(
      "⛔ এই কমান্ডটি শুধুমাত্র বট এডমিন চালাতে পারবে!",
      threadID,
      messageID
    );
  }

  // ===== সংখ্যা পার্স (ডিফল্ট ও সর্বোচ্চ ৩০) =====
  let requestedCount = MAX_LIMIT;
  if (args && args.length > 0) {
    const parsed = parseInt(args[0], 10);
    if (!isNaN(parsed) && parsed > 0) requestedCount = parsed;
  }
  if (requestedCount > MAX_LIMIT) requestedCount = MAX_LIMIT;

  // ===== API key =====
  let Shaon;
  try {
    const apis = await axios.get(
      "https://raw.githubusercontent.com/shaonproject/Shaon/main/api.json"
    );
    Shaon = apis.data.imgur;
  } catch (e) {
    return api.sendMessage("❌ API লোড করা যায়নি!", threadID, messageID);
  }

  api.sendMessage(
    `⏳ ${requestedCount} টি মিডিয়া খুঁজছি...`,
    threadID,
    messageID
  );

  // ===== কমান্ড মেসেজ থেকে উপরে (পেছনে) মিডিয়া সংগ্রহ =====
  const anchorTs = Number(event.timestamp) || Date.now();
  let finalMedia = await collectMedia(
    api,
    threadID,
    messageID,
    anchorTs,
    requestedCount
  );

  if (finalMedia.length === 0) {
    return api.sendMessage(
      "❌ গ্রুপে কোনো মিডিয়া পাওয়া যায়নি!",
      threadID,
      messageID
    );
  }

  if (OLDEST_FIRST) finalMedia = finalMedia.reverse();

  // ===== Imgur-এ আপলোড =====
  const uploadedLinks = [];
  for (const m of finalMedia) {
    try {
      const res = await axios.get(
        `${Shaon}/imgur?link=${encodeURIComponent(m.url)}`
      );
      const link = res.data?.uploaded?.image;
      if (link && link.startsWith("http")) {
        uploadedLinks.push(`"${link}"`);
      }
    } catch (e) {
      // ফেইল হলে স্কিপ
    }
  }

  if (uploadedLinks.length === 0) {
    return api.sendMessage(
      "❌ কোনো মিডিয়া আপলোড করা যায়নি!",
      threadID,
      messageID
    );
  }

  // ===== লিংক পাঠানো =====
  await new Promise((resolve) => {
    api.sendMessage(uploadedLinks.join(",\n"), threadID, () => resolve(), messageID);
  });

  // ===== আলাদা রিসেট নোটিশ =====
  // কোনো স্টেট জমা রাখা হয় না, তাই প্রতিবার কমান্ড দিলে কমান্ড মেসেজ থেকে
  // নতুন করে উপরের মিডিয়া গোনা শুরু হয়। নতুন মিডিয়া না দিলে একই মিডিয়ার লিংক আবার হবে।
  return api.sendMessage(
    `♻️ রিসেট হয়েছে! (${uploadedLinks.length} টি লিংক তৈরি হয়েছে)\nনতুন মিডিয়া দিয়ে আবার কমান্ড দিন।`,
    threadID
  );
};
