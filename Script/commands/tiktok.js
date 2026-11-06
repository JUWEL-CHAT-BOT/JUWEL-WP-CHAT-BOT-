const fs = require("fs");
const path = require("path");
const request = require("request");

module.exports.config = {
  name: "tiktok",
  version: "13.0.0",
  hasPermssion: 3,
  credits: "M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  description: "random tiktok video",
  commandCategory: "tiktok",
  usages: "tiktok | tiktok <number> | tiktok unban <id>",
  cooldowns: 15, // ⏱️ প্রতি ইউজার ১৫ সেকেন্ড কুলডাউন
};

// ===== Video List =====
const videoList = [
  "https://i.imgur.com/ngm9Yc0.mp4",
  "https://i.imgur.com/sBGkatG.mp4",
  "https://i.imgur.com/G48cuzp.mp4",
  "https://i.imgur.com/Q6EcjcN.mp4",
  "https://i.imgur.com/lMgXuR8.mp4",
  "https://i.imgur.com/7h7lkGI.mp4",
  "https://i.imgur.com/vhqSt6T.mp4",
  "https://i.imgur.com/23dKd3g.mp4",
  "https://i.imgur.com/8NRWXkv.mp4",
  "https://i.imgur.com/16aKPFI.mp4",
  "https://i.imgur.com/2KlWE81.mp4",
  "https://i.imgur.com/3bjUT82.mp4",
  "https://i.imgur.com/MstMcrc.mp4",
  "https://i.imgur.com/QihcO9C.mp4",
  "https://i.imgur.com/tEwH6BW.mp4",
  "https://i.imgur.com/n5bLlan.mp4",
  "https://i.imgur.com/8TwSKaM.mp4",
  "https://i.imgur.com/BumoMCw.mp4",
  "https://i.imgur.com/lsXfTGX.mp4",
  "https://i.imgur.com/hbLCBg2.mp4",
  "https://i.imgur.com/WoLRVwN.mp4",
  "https://i.imgur.com/9wyyzlW.mp4",
  "https://i.imgur.com/b2vXLFD.mp4",
  "https://i.imgur.com/scFZPU5.mp4",
  "https://i.imgur.com/V7AxIdi.mp4",
  "https://i.imgur.com/l2hfveG.mp4"
];

// ===== Paths =====
const CACHE_DIR = path.join(__dirname, "cache", "tiktok_cache");
const DATA_FILE = path.join(__dirname, "cache", "tiktok_data.json");
try { fs.mkdirSync(CACHE_DIR, { recursive: true }); } catch (e) {}

// ===== 💾 Persistent Ban Storage =====
function loadBanned() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return data.banned || {};
  } catch (e) {
    return {};
  }
}

function saveBanned() {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({ banned: global.client.tiktokBanned }, null, 2)
    );
  } catch (e) {
    console.log("Ban save error:", e);
  }
}

// ===== Trackers =====
if (!global.client.tiktokSpamTracker) global.client.tiktokSpamTracker = {};
if (!global.client.tiktokBanned) global.client.tiktokBanned = loadBanned();
if (!global.client.tiktokCooldown) global.client.tiktokCooldown = {};
if (!global.client.tiktokLast) global.client.tiktokLast = {};

// ===== Font Converter → 𝐀𝐁𝐂𝐃 =====
// bold অক্ষরগুলো surrogate pair, তাই Array.from দিয়ে ভাঙতে হয়
function toBoldFont(text) {
  const normal = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bold = Array.from("𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗");
  return Array.from(text).map(ch => {
    const i = normal.indexOf(ch);
    return i > -1 ? bold[i] : ch;
  }).join("");
}

// ===== File Size Formatter =====
function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

// ===== Admin Check =====
function isAdmin(id) {
  const cfg = global.config || {};
  const list = [].concat(cfg.ADMINBOT || [], cfg.OPERATOR || []).map(String);
  return list.includes(String(id));
}

// ===== 🔁 No-Repeat Random Picker =====
function pickIndex(threadID) {
  if (videoList.length <= 1) return 0;
  const last = global.client.tiktokLast[threadID];
  let idx;
  do {
    idx = Math.floor(Math.random() * videoList.length);
  } while (idx === last);
  global.client.tiktokLast[threadID] = idx;
  return idx;
}

// ===== ⬇️ Download (temp file → rename) =====
function downloadVideo(url, dest) {
  return new Promise((resolve, reject) => {
    const tmp = `${dest}.${Date.now()}.tmp`;
    const ws = fs.createWriteStream(tmp);

    const fail = (err) => {
      try { ws.destroy(); } catch (e) {}
      try { fs.unlinkSync(tmp); } catch (e) {}
      reject(err);
    };

    const req = request(url);
    req.on("response", (res) => {
      if (res.statusCode !== 200) {
        req.abort();
        fail(new Error("HTTP " + res.statusCode));
      }
    });
    req.on("error", fail);
    ws.on("error", fail);
    ws.on("close", () => {
      try {
        if (!fs.existsSync(tmp)) return;
        if (fs.statSync(tmp).size === 0) return fail(new Error("Empty file"));
        fs.renameSync(tmp, dest);
        resolve();
      } catch (e) {
        fail(e);
      }
    });
    req.pipe(ws);
  });
}

// ===== 📦 Video Cache =====
async function getVideoFile(index) {
  const url = videoList[index];
  const file = path.join(CACHE_DIR, path.basename(url));
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return file;
  await downloadVideo(url, file);
  return file;
}

// ===== 🛡️ Ban / Spam / Cooldown Check =====
function checkUser(api, threadID, replyID, senderID) {
  const now = Date.now();

  // 🚫 Ban Check
  if (global.client.tiktokBanned[senderID]) {
    api.sendMessage(
      toBoldFont("🚫 You are BANNED! You cannot use this command."),
      threadID,
      replyID
    );
    return false;
  }

  // 📊 Spam Check (5 times / 60s) — কুলডাউনের আগে চেক হয়
  if (!global.client.tiktokSpamTracker[senderID]) {
    global.client.tiktokSpamTracker[senderID] = [];
  }
  global.client.tiktokSpamTracker[senderID] = global.client.tiktokSpamTracker[senderID]
    .filter(t => now - t < 60000);
  global.client.tiktokSpamTracker[senderID].push(now);

  if (global.client.tiktokSpamTracker[senderID].length > 5) {
    global.client.tiktokBanned[senderID] = true;
    saveBanned();
    api.sendMessage(
      toBoldFont("🚫 SPAM DETECTED! You sent 5+ commands in 1 minute.\nYou have been BANNED."),
      threadID,
      replyID
    );
    return false;
  }

  // ⏱️ Cooldown Check (15s)
  const lastUsed = global.client.tiktokCooldown[senderID] || 0;
  const remaining = 15 - Math.floor((now - lastUsed) / 1000);

  if (remaining > 0) {
    api.sendMessage(
      toBoldFont(`⏳ Please wait ${remaining}s before using this command again!`),
      threadID,
      replyID
    );
    return false;
  }
  global.client.tiktokCooldown[senderID] = now;
  return true;
}

// ===== 🎬 Send Video =====
async function sendVideo(api, threadID, replyID, senderID, index) {
  try {
    const file = await getVideoFile(index);
    const sizeText = formatSize(fs.statSync(file).size);
    const videoNumber = index + 1;

    const bodyText =
`🎬 ${toBoldFont("TIKTOK VIDEO")} 🎬
╔══════════════════════╗
   ${toBoldFont("Total Videos")} : ${toBoldFont(String(videoList.length))}
   ${toBoldFont("Video No")}     : ${toBoldFont(`${videoNumber}/${videoList.length}`)}
   ${toBoldFont("Video Size")}   : ${toBoldFont(sizeText)}
   ${toBoldFont("Cooldown")}     : ${toBoldFont("15s")}
   ${toBoldFont("Credit")}       : 乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐
   ${toBoldFont("React")} ❤️ ${toBoldFont("To Get Next Video")}
╚══════════════════════╝`;

    api.sendMessage(
      { body: bodyText, attachment: fs.createReadStream(file) },
      threadID,
      (err, info) => {
        if (err) return console.log("Send error:", err);
        // 😍 রিঅ্যাকশন রেজিস্টার
        if (info && info.messageID && global.client.handleReaction) {
          global.client.handleReaction.push({
            name: module.exports.config.name,
            messageID: info.messageID,
            author: senderID
          });
        }
      },
      replyID
    );
  } catch (e) {
    console.log("Video error:", e);
    api.sendMessage(
      toBoldFont("❌ Failed to download video. Try again!"),
      threadID,
      replyID
    );
  }
}

// ===== ▶️ Command =====
module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  // ===== 🔓 Unban (Admin only): tiktok unban <id> =====
  if (args && args[0] && args[0].toLowerCase() === "unban") {
    if (!isAdmin(senderID)) {
      return api.sendMessage(
        toBoldFont("❌ Only admin can use unban."),
        threadID,
        messageID
      );
    }
    const target = args[1];
    if (!target) {
      return api.sendMessage(
        toBoldFont("⚠️ Usage: tiktok unban <user id>"),
        threadID,
        messageID
      );
    }
    if (!global.client.tiktokBanned[target]) {
      return api.sendMessage(
        toBoldFont("ℹ️ This user is not banned."),
        threadID,
        messageID
      );
    }
    delete global.client.tiktokBanned[target];
    delete global.client.tiktokSpamTracker[target];
    delete global.client.tiktokCooldown[target];
    saveBanned();
    return api.sendMessage(
      toBoldFont(`✅ Unbanned ${target}`),
      threadID,
      messageID
    );
  }

  // ===== 🔢 Video by number: tiktok <number> =====
  let index = null;
  if (args && args[0]) {
    const n = parseInt(args[0], 10);
    if (isNaN(n) || n < 1 || n > videoList.length) {
      return api.sendMessage(
        toBoldFont(`❌ Invalid number! Choose between 1 and ${videoList.length}`),
        threadID,
        messageID
      );
    }
    index = n - 1;
  }

  if (!checkUser(api, threadID, messageID, senderID)) return;

  if (index === null) {
    index = pickIndex(threadID);
  } else {
    global.client.tiktokLast[threadID] = index;
  }

  await sendVideo(api, threadID, messageID, senderID, index);
};

// ===== ❤️ Reaction → Next Video =====
module.exports.handleReaction = async function ({ api, event, handleReaction }) {
  // শুধু ❤️ রিঅ্যাকশনে কাজ করবে (রিঅ্যাকশন সরালে বা অন্য ইমোজিতে কিছু হবে না)
  if (!event.reaction) return;
  if (event.reaction.replace(/\uFE0F/g, "") !== "❤") return;
  // শুধু যে কমান্ড দিয়েছে সে রিঅ্যাক্ট করলে কাজ করবে
  if (String(event.userID) !== String(handleReaction.author)) return;

  const { threadID, messageID, userID } = event;
  if (!checkUser(api, threadID, messageID, userID)) return;

  const index = pickIndex(threadID);
  await sendVideo(api, threadID, messageID, userID, index);
};
