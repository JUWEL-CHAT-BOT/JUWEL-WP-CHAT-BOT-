const fs = require("fs-extra");
const os = require("os");
const path = require("path");

module.exports.config = {
  name: "prefix",
  version: "3.3.0",
  hasPermssion: 0,
  credits: "MR JUWEL",
  description: "Show bot prefix, owner info, system stats & command list",
  commandCategory: "Information",
  usages: "[help]",
  cooldowns: 5
};

// Put your own links here
const OWNER_FB_LINK = "https://www.fb.com/mrjuwel333";
const SUPPORT_LINK = "https://m.me/j/bUq30eov7FMa149R/?send_source=gc%3Acopy_invite_link_t";

// Auto delete time for the info card (20 seconds)
const DELETE_AFTER = 20000;

// Anti-spam store (used by handleEvent only)
const spamMap = new Map();
const SPAM_COOLDOWN = 10000; // 10 seconds

// Converts A-Z, a-z, 0-9 to the 𝗕𝗼𝗹𝗱 sans-serif font
function f(str) {
  return String(str).replace(/[A-Za-z0-9]/g, (ch) => {
    const c = ch.charCodeAt(0);
    if (c >= 65 && c <= 90) return String.fromCodePoint(0x1d5d4 + (c - 65));
    if (c >= 97 && c <= 122) return String.fromCodePoint(0x1d5ee + (c - 97));
    return String.fromCodePoint(0x1d7ec + (c - 48));
  });
}

// Get prefix from config.json
function getConfigPrefix() {
  try {
    const configPath = path.join(__dirname, "..", "..", "config.json");
    if (fs.existsSync(configPath)) {
      const configData = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (configData.PREFIX && configData.PREFIX.trim() !== "") {
        return configData.PREFIX;
      }
    }
  } catch (e) {
    console.log("⚠️ config.json read error:", e.message);
  }
  return null;
}

function getPrefix(threadID) {
  const configPrefix = getConfigPrefix();
  const threadSetting = global.data.threadData.get(parseInt(threadID)) || {};
  return configPrefix || threadSetting.PREFIX || global.config.PREFIX;
}

function getUptime() {
  const sec = process.uptime();
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

function mb(bytes) {
  return (bytes / 1024 / 1024).toFixed(0);
}

function getBotInfo() {
  return {
    botName: global.config.BOTNAME || "────〲─⃞🎀⁽𝐑𝆠፝֟𝐈𝐘𝆠፝֟𝐀₎⪨‌‌‌‌‌‌‌‌‌‌‌‎⤸⃞🎀𐙚࿐",
    ownerName: global.config.OWNER_NAME || "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐"
  };
}

async function getUserName(Users, senderID) {
  try {
    return (await Users.getNameUser(senderID)) || "Friend";
  } catch (e) {
    return "Friend";
  }
}

// ─────────────────────────────────────────────
// Sends the BIG info card (shared by trigger words and the command)
// ─────────────────────────────────────────────
async function sendBigCard({ api, event, Users, prefix }) {
  const { threadID, messageID, senderID } = event;

  const userName = await getUserName(Users, senderID);
  const { botName, ownerName } = getBotInfo();

  const totalUsers = global.data.allUserID?.length || 0;
  const totalThreads = global.data.allThreadID?.length || 0;
  const totalCmds = global.client?.commands?.size || 0;

  // RAM / CPU
  const totalRam = os.totalmem();
  const usedRam = totalRam - os.freemem();
  const botRam = process.memoryUsage().rss;
  const cpus = os.cpus();
  const cpuModel = cpus.length ? cpus[0].model.trim() : "Unknown";
  const cpuCores = cpus.length;
  const load = os.loadavg()[0].toFixed(2);

  // Ping
  const ping = event.timestamp ? Math.max(Date.now() - event.timestamp, 0) : 0;

  const msg =
`╭─────────────⭓
│  ✨ ${f("PREFIX")} ✨
│  ➤ 『 ${prefix} 』
├─────────────⭓
│  👋 ${f("Hello,")} ${f(userName)}!
├─────────────⭓
│  🤖 ${botName}
│  👑 ${ownerName}
│  ⏱️ ${f(getUptime())}
│  👥 ${f(totalUsers)}  |  💬 ${f(totalThreads)}
│  📦 ${f("Total Commands:")} ${f(totalCmds)}
├─────────────⭓
│  📡 ${f("Ping:")} ${f(ping + "ms")}
│  🧠 ${f("RAM:")} ${f(mb(usedRam))}/${f(mb(totalRam))} ${f("MB")}
│  🤖 ${f("Bot RAM:")} ${f(mb(botRam))} ${f("MB")}
│  ⚙️ ${f("CPU:")} ${f(cpuModel)}
│  🔢 ${f("Cores:")} ${f(cpuCores)} | ${f("Load:")} ${f(load)}
├─────────────⭓
│  🔗 ${f("Owner:")} ${OWNER_FB_LINK}
│  💬 ${f("Support:")} ${SUPPORT_LINK}
│  📜 ${f("Command List:")} ${prefix}prefix help
╰─────────────⭓`;

  return api.sendMessage(
    msg,
    threadID,
    (err, info) => {
      if (err || !info) return;
      // Auto delete after 20 seconds
      setTimeout(() => {
        try { api.unsendMessage(info.messageID); } catch (e) {}
      }, DELETE_AFTER);
    },
    messageID
  );
}

// ─────────────────────────────────────────────
// Trigger words (no prefix needed) → now show the BIG card
// ─────────────────────────────────────────────
module.exports.handleEvent = async ({ event, api, Users }) => {
  const { threadID, messageID, body, senderID } = event;
  if (!body) return;

  const now = Date.now();
  if (spamMap.has(senderID) && now - spamMap.get(senderID) < SPAM_COOLDOWN) return;

  const triggerWords = [
    "prefix", "mprefix", "mpre", "bot prefix", "what is the prefix", "bot name",
    "how to use bot", "bot not working", "bot is offline", "prefx", "prfix",
    "perfix", "bot not talking", "where is bot", "bot dead", "bots dead",
    "what prefix", "freefix", "what is bot", "what prefix bot",
    "how use bot", "where are the bots", "where prefix",
    "প্রিফিক্স", "বট প্রিফিক্স", "পিন", "বটের নাম", "বট কি",
    "বট কাজ করছে না", "বট অফলাইন", "প্রিফিক্স কি",
    "प्रीफिक्स", "बॉट प्रीफिक्स", "बॉट का नाम", "बॉट क्या है",
    "dấu lệnh", "daulenh", "tiền tố"
  ];

  if (!triggerWords.includes(body.toLowerCase().trim())) return;
  spamMap.set(senderID, now);

  const reactions = ["💖", "✨", "🌸", "💫", "❤️", "🦋", "🌟"];
  api.setMessageReaction(
    reactions[Math.floor(Math.random() * reactions.length)],
    messageID, () => {}, true
  );

  const prefix = getPrefix(threadID);
  if (!prefix || String(prefix).trim() === "") {
    return api.sendMessage(f("Prefix cannot be blank"), threadID, messageID);
  }

  return sendBigCard({ api, event, Users, prefix });
};

// ─────────────────────────────────────────────
// Run with prefix: {prefix}prefix  or  {prefix}prefix help
// ─────────────────────────────────────────────
module.exports.run = async ({ event, api, args, Users }) => {
  const { threadID, messageID } = event;

  const prefix = getPrefix(threadID);
  if (!prefix || String(prefix).trim() === "") {
    return api.sendMessage(f("Prefix cannot be blank"), threadID, messageID);
  }

  // Command list
  if (args[0] && args[0].toLowerCase() === "help") {
    const cmds = global.client && global.client.commands
      ? Array.from(global.client.commands.keys()).sort()
      : [];
    const list = cmds.length
      ? cmds.map((c) => `• ${prefix}${c}`).join("\n")
      : f("No commands found");
    return api.sendMessage(
`╭─────────────⭓
│  📜 ${f("Command List")} (${f(cmds.length)})
├─────────────⭓
${list}
╰─────────────⭓
💡 ${f("Details:")} ${prefix}help <command>`,
      threadID,
      messageID
    );
  }

  return sendBigCard({ api, event, Users, prefix });
};
