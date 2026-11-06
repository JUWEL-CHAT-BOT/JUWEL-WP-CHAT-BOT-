const fs = require("fs-extra");
const axios = require("axios");

module.exports.config = {
  name: "help",
  version: "6.1.0",
  hasPermssion: 0,
  credits: "乛 MR ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  description: "All commands in one serial list + command info",
  commandCategory: "system",
  usages: "[command name]",
  cooldowns: 5
};

// ── 𝙼𝚘𝚗𝚘 𝙵𝚘𝚗𝚝 (𝙰𝙱𝙲𝙳 / 𝚊𝚋𝚌𝚍 / 𝟶𝟷𝟸𝟹) ──
function toMono(text) {
  return Array.from(String(text)).map(c => {
    const code = c.codePointAt(0);
    if (code >= 65 && code <= 90)  return String.fromCodePoint(0x1D670 + code - 65); // A-Z
    if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D68A + code - 97); // a-z
    if (code >= 48 && code <= 57)  return String.fromCodePoint(0x1D7F6 + code - 48); // 0-9
    return c;
  }).join("");
}

// ── ⚙ সেটিংস ──
const USER_COOLDOWN = 5 * 60 * 1000;   // একই ইউজার ৫ মিনিটের আগে আবার help দিতে পারবে না
const AUTO_DELETE   = 5 * 60 * 1000;   // ৫ মিনিট পর মেসেজ অটো ডিলিট
const userCooldowns = new Map();

// ── 🗑️ অটো ডিলিট ──
function scheduleDelete(api, info) {
  if (!info || !info.messageID) return;
  setTimeout(() => {
    try { api.unsendMessage(info.messageID); } catch (e) {}
  }, AUTO_DELETE);
}

function sendAutoDelete(api, msg, threadID, replyID) {
  return api.sendMessage(msg, threadID, (err, info) => {
    if (!err) scheduleDelete(api, info);
  }, replyID);
}

// ── config.json পড়া ──
function readConfig() {
  try {
    const configPath = __dirname + "/../../config.json";
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }
  } catch (e) {}
  return {};
}

function getPrefix() {
  const cfgJson = readConfig();
  return cfgJson.PREFIX || global.config?.PREFIX || "!";
}

// ── 📋 নির্দিষ্ট কমান্ডের তথ্য ──
async function sendCommandInfo(api, event, commandName) {
  const { threadID, messageID } = event;
  const { commands } = global.client;
  const prefix = getPrefix();

  const cmd = commands.get(commandName.toLowerCase());
  if (!cmd) {
    return sendAutoDelete(api,
      `╔════════════════╗\n║  ❌ ${toMono("NOT FOUND")} ❌  ║\n╚════════════════╝\n\n` +
      `「 ${toMono(commandName)} 」 নামে কোনো কমান্ড নেই!\n\n` +
      `📌 ${toMono("All commands")}: ${toMono(prefix + "help")}`,
      threadID, messageID
    );
  }

  const cfg = cmd.config || {};
  const cfgJson = readConfig();
  const botName = cfgJson.BOTNAME || "⎯꯭𓆩꯭𝆺𝅥😻⃞𝐑⃞𝐈⃞𝐘⃞𝐀⃞༢࿐";
  const ownerName = cfgJson.OWNER_NAME || "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐";

  const permMap = {
    0: "👤 " + toMono("All User"),
    1: "🛡️ " + toMono("Group Admin"),
    2: "👑 " + toMono("Bot Admin"),
    3: "🔱 " + toMono("Owner")
  };
  const perm = permMap[cfg.hasPermssion] || permMap[0];

  const infoText =
`╔════════════════╗
║  ✨ ${toMono("COMMAND INFO")} ✨
╠════════════════╣
║ 🔖 ${toMono("Name")} ⇢ ${toMono(cfg.name || commandName)}
║ 📄 ${toMono("Usage")} ⇢ ${toMono(cfg.usages || "No usage")}
║ 📜 ${toMono("Desc")} ⇢ ${toMono(cfg.description || "No description")}
║ 🔑 ${toMono("Perm")} ⇢ ${perm}
║ 👨‍💻 ${toMono("Credit")} ⇢ ${cfg.credits || "Unknown"}
║ 📂 ${toMono("Category")} ⇢ ${toMono(cfg.commandCategory || "system")}
║ ⏳ ${toMono("Cooldown")} ⇢ ${toMono(cfg.cooldowns || 0)}s
╠════════════════╣
║ ⚙ ${toMono("Prefix")} ⇢ ${toMono(prefix)}
║ 🤖 ${toMono("Bot")} ⇢ ${botName}
║ 👑 ${toMono("Owner")} ⇢ ${ownerName}
╚════════════════╝`;

  return sendAutoDelete(api, infoText, threadID, messageID);
}

// ── 🔥 Main Help Function ──
async function sendHelp(api, event, args) {
  if (args && args.length > 0) {
    return sendCommandInfo(api, event, args[0].trim());
  }

  const { commands } = global.client;
  const { threadID, messageID } = event;
  const prefix = getPrefix();

  // সব কমান্ড A-Z সিরিয়ালে
  const allCmds = [...new Set(
    [...commands.keys()].map(n => (n || "").trim()).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));

  // ── এক সিরিয়ালে লিস্ট: প্রতি লাইনে একটা কমান্ড, কোনো ফাঁক নেই ──
  const pad = String(allCmds.length).length;
  const commandList = allCmds.map((cmd, i) =>
    `【${toMono(String(i + 1).padStart(pad, "0"))}】 ➜ ${toMono(cmd)}`
  ).join("\n");

  const finalText =
`┏━━━━━━━━━━━━━━━━┓
   ✿ ${toMono("COMMAND LIST")} ✿
┗━━━━━━━━━━━━━━━━┛
${commandList}
┏━━━━━━━━━━━━━━━━┓
  ✦ ${toMono("Total")}: ${toMono(allCmds.length)} ${toMono("Commands")} ✦
  📌 ${toMono("Info")}: ${toMono(prefix)}${toMono("help")} ${toMono("<cmd>")}
┗━━━━━━━━━━━━━━━━┛`;

  const cacheDir = __dirname + "/cache";
  const imgPath = cacheDir + "/helpallbg.jpg";
  const bg = "https://i.imgur.com/MZOc4a3.jpeg";

  try {
    fs.ensureDirSync(cacheDir);

    const res = await axios({
      url: encodeURI(bg),
      method: "GET",
      responseType: "stream",
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const writer = fs.createWriteStream(imgPath);
    res.data.pipe(writer);

    writer.on("finish", () => {
      api.sendMessage(
        { body: finalText, attachment: fs.createReadStream(imgPath) },
        threadID,
        (err, info) => {
          try { fs.unlinkSync(imgPath); } catch (e) {}
          if (!err) scheduleDelete(api, info);
        },
        messageID
      );
    });

    writer.on("error", () => {
      sendAutoDelete(api, finalText, threadID, messageID);
    });

  } catch (error) {
    console.error("Error:", error);
    sendAutoDelete(api, finalText, threadID, messageID);
  }
}

// ── শুধু prefix দিয়ে চলবে ──
module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const now = Date.now();
  const last = userCooldowns.get(senderID);

  if (last && now - last < USER_COOLDOWN) {
    const remain = Math.ceil((USER_COOLDOWN - (now - last)) / 1000);
    const min = Math.floor(remain / 60);
    const sec = remain % 60;
    return sendAutoDelete(
      api,
      `⏳ ${toMono("Cooldown")}!\n\n` +
      `আপনি এইমাত্র help কমান্ড ব্যবহার করেছেন।\n` +
      `আবার ব্যবহার করতে অপেক্ষা করুন: ${min} মিনিট ${sec} সেকেন্ড`,
      threadID, messageID
    );
  }

  userCooldowns.set(senderID, now);
  return sendHelp(api, event, args);
};
