const fs = require("fs");
const path = require("path");
const request = require("request");

module.exports.config = {
  name: "anime",
  version: "13.0.0",
  hasPermssion: 0,
  credits: "M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  description: "random anime video",
  commandCategory: "anime",
  usages: "anime | anime <number> | anime unban <id>",
  cooldowns: 0, // কুলডাউন নিচের কোডে নিজে হ্যান্ডেল করা হয় (অ্যাডমিন বাদে ১৫ সেকেন্ড)
};

// ===== Video List =====
// এখানে ভিডিও লিংক বসান (প্রতিটি লিংক কমা দিয়ে আলাদা করুন)
const videoList = [
  "https://i.imgur.com/mh2Cswh.mp4",
  "https://i.imgur.com/MOGVFxE.mp4",
  "https://i.imgur.com/BKQK7dT.mp4",
  "https://i.imgur.com/NhGkMg9.mp4",
  "https://i.imgur.com/ie3vYcD.mp4",
  "https://i.imgur.com/RsD6LqM.mp4",
  "https://i.imgur.com/RqhYA8k.mp4",
  "https://i.imgur.com/H9QAPyo.mp4",
  "https://i.imgur.com/qk1tvQ2.mp4",
  "https://i.imgur.com/j4Uxe4P.mp4",
  "https://i.imgur.com/o2pyTS4.mp4",
  "https://i.imgur.com/X3tahoo.mp4",
  "https://i.imgur.com/OUeitoF.mp4",
  "https://i.imgur.com/a22uGRO.mp4",
  "https://i.imgur.com/evYeJ3s.mp4",
  "https://i.imgur.com/ESUNM2f.mp4",
  "https://i.imgur.com/9ouEzLL.mp4",
  "https://i.imgur.com/y1Ap2VF.mp4",
  "https://i.imgur.com/FND3AyV.mp4",
  "https://i.imgur.com/XsBTVMU.mp4",
  "https://i.imgur.com/BIRri1A.mp4",
  "https://i.imgur.com/EHaWoPV.mp4",
  "https://i.imgur.com/5zy6DOC.mp4",
  "https://i.imgur.com/wfz5Qua.mp4",
  "https://i.imgur.com/bALzXkx.mp4",
  "https://i.imgur.com/vzHdExm.mp4",
  "https://i.imgur.com/aSHL9dM.mp4",
  "https://i.imgur.com/JXZtjro.mp4",
  "https://i.imgur.com/uyd8FHx.mp4",
  "https://i.imgur.com/wpbLem4.mp4",
  "https://i.imgur.com/gDUTarX.mp4",
  "https://i.imgur.com/291MZze.mp4",
  "https://i.imgur.com/lCcw5Oz.mp4",
  "https://i.imgur.com/dCAdG7b.mp4",
  "https://i.imgur.com/knEvnbn.mp4",
  "https://i.imgur.com/R3ptum9.mp4",
  "https://i.imgur.com/tUed2nt.mp4",
  "https://i.imgur.com/sqHWn6v.mp4",
  "https://i.imgur.com/CU2KBTj.mp4",
  "https://i.imgur.com/en18l6Z.mp4",
  "https://i.imgur.com/FrRANZq.mp4",
  "https://i.imgur.com/GmVN0IA.mp4",
  "https://i.imgur.com/OVjxg39.mp4",
  "https://i.imgur.com/2ZxQMZT.mp4",
  "https://i.imgur.com/35i7fZn.mp4",
  "https://i.imgur.com/h4YJi4u.mp4",
  "https://i.imgur.com/hECxsV2.mp4",
  "https://i.imgur.com/wPNLVdB.mp4",
  "https://i.imgur.com/MLnjK9Z.mp4",
  "https://i.imgur.com/2jlAzWF.mp4",
  "https://i.imgur.com/scTn8LO.mp4",
  "https://i.imgur.com/oZlfcRM.mp4",
  "https://i.imgur.com/yAF2Vv8.mp4",
  "https://i.imgur.com/S7cBq8W.mp4",
  "https://i.imgur.com/o4JH74h.mp4",
  "https://i.imgur.com/bBJPhZn.mp4",
  "https://i.imgur.com/yMoPMYh.mp4",
  "https://i.imgur.com/04v2cZc.mp4",
  "https://i.imgur.com/LQTXiMn.mp4",
  "https://i.imgur.com/JbEl4n4.mp4",
  "https://i.imgur.com/x6jZHdo.mp4",
  "https://i.imgur.com/WGVf3Xg.mp4",
  "https://i.imgur.com/2Msk5HI.mp4",
  "https://i.imgur.com/FuQNFx8.mp4",
  "https://i.imgur.com/Yd2ziHa.mp4",
  "https://i.imgur.com/8fOmPGE.mp4",
  "https://i.imgur.com/ajL9x7i.mp4",
  "https://i.imgur.com/UeYEbjJ.mp4",
  "https://i.imgur.com/UWhH4km.mp4",
  "https://i.imgur.com/cBzngpL.mp4"
];

// ===== Paths =====
const CACHE_DIR = path.join(__dirname, "cache", "anime_cache");
const DATA_FILE = path.join(__dirname, "cache", "anime_data.json");
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
      JSON.stringify({ banned: global.client.animeBanned }, null, 2)
    );
  } catch (e) {
    console.log("Ban save error:", e);
  }
}

// ===== Trackers =====
if (!global.client.animeSpamTracker) global.client.animeSpamTracker = {};
if (!global.client.animeBanned) global.client.animeBanned = loadBanned();
if (!global.client.animeCooldown) global.client.animeCooldown = {};
if (!global.client.animeLast) global.client.animeLast = {};

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
  const last = global.client.animeLast[threadID];
  let idx;
  do {
    idx = Math.floor(Math.random() * videoList.length);
  } while (idx === last);
  global.client.animeLast[threadID] = idx;
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
  // 👑 অ্যাডমিনের জন্য কুলডাউন, স্প্যাম ও ব্যান কিছুই নেই
  if (isAdmin(senderID)) return true;

  const now = Date.now();

  // 🚫 Ban Check
  if (global.client.animeBanned[senderID]) {
    api.sendMessage(
      toBoldFont("🚫 You are BANNED! You cannot use this command."),
      threadID,
      replyID
    );
    return false;
  }

  // 📊 Spam Check (5 times / 60s) — কুলডাউনের আগে চেক হয়
  if (!global.client.animeSpamTracker[senderID]) {
    global.client.animeSpamTracker[senderID] = [];
  }
  global.client.animeSpamTracker[senderID] = global.client.animeSpamTracker[senderID]
    .filter(t => now - t < 60000);
  global.client.animeSpamTracker[senderID].push(now);

  if (global.client.animeSpamTracker[senderID].length > 5) {
    global.client.animeBanned[senderID] = true;
    saveBanned();
    api.sendMessage(
      toBoldFont("🚫 SPAM DETECTED! You sent 5+ commands in 1 minute.\nYou have been BANNED."),
      threadID,
      replyID
    );
    return false;
  }

  // ⏱️ Cooldown Check (15s)
  const lastUsed = global.client.animeCooldown[senderID] || 0;
  const remaining = 15 - Math.floor((now - lastUsed) / 1000);

  if (remaining > 0) {
    api.sendMessage(
      toBoldFont(`⏳ Please wait ${remaining}s before using this command again!`),
      threadID,
      replyID
    );
    return false;
  }
  global.client.animeCooldown[senderID] = now;
  return true;
}

// ===== 🎬 Send Video =====
async function sendVideo(api, threadID, replyID, senderID, index) {
  try {
    const file = await getVideoFile(index);
    const sizeText = formatSize(fs.statSync(file).size);
    const videoNumber = index + 1;

    const bodyText =
`🎬 ${toBoldFont("ANIME VIDEO")} 🎬
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
        // ❤️ রিঅ্যাকশন রেজিস্টার
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

  // ===== 🔓 Unban (Admin only): anime unban <id> =====
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
        toBoldFont("⚠️ Usage: anime unban <user id>"),
        threadID,
        messageID
      );
    }
    if (!global.client.animeBanned[target]) {
      return api.sendMessage(
        toBoldFont("ℹ️ This user is not banned."),
        threadID,
        messageID
      );
    }
    delete global.client.animeBanned[target];
    delete global.client.animeSpamTracker[target];
    delete global.client.animeCooldown[target];
    saveBanned();
    return api.sendMessage(
      toBoldFont(`✅ Unbanned ${target}`),
      threadID,
      messageID
    );
  }

  // ===== 📭 Empty list guard =====
  if (videoList.length === 0) {
    return api.sendMessage(
      toBoldFont("⚠️ No videos added yet!"),
      threadID,
      messageID
    );
  }

  // ===== 🔢 Video by number: anime <number> =====
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
    global.client.animeLast[threadID] = index;
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
  if (videoList.length === 0) return;

  const { threadID, messageID, userID } = event;
  if (!checkUser(api, threadID, messageID, userID)) return;

  const index = pickIndex(threadID);
  await sendVideo(api, threadID, messageID, userID, index);
};
