const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "antikick",
  version: "4.0.0",
  hasPermssion: 1,
  credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  description: "Timed kick & silent kick on next message",
  commandCategory: "group",
  usages: "antikick 10m | antikick on | antikick off (reply/mention/uid)",
  cooldowns: 3
};

const dataDir = path.join(__dirname, "cache");
const dataPath = path.join(dataDir, "antikick.json");

// ================= DATA =================

function loadData() {
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(dataPath)) {
      fs.writeFileSync(dataPath, JSON.stringify({ timed: [], watch: [] }));
    }
    let d = JSON.parse(fs.readFileSync(dataPath));
    if (Array.isArray(d)) d = { timed: d, watch: [] }; // old format
    d.timed = d.timed || [];
    d.watch = d.watch || [];
    return d;
  } catch (e) {
    return { timed: [], watch: [] };
  }
}

function saveData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

// ================= HELPERS =================

// Convert A-Z a-z 0-9 to monospace: 𝙰𝙱𝙲 𝚊𝚋𝚌 𝟶𝟷𝟸
function M(s) {
  return String(s).replace(/[A-Za-z0-9]/g, (c) => {
    const n = c.charCodeAt(0);
    if (n >= 65 && n <= 90) return String.fromCodePoint(0x1d670 + n - 65);
    if (n >= 97 && n <= 122) return String.fromCodePoint(0x1d68a + n - 97);
    return String.fromCodePoint(0x1d7f6 + n - 48);
  });
}

// Send notice, auto delete after 4 seconds
function notify(api, threadID, text, replyTo) {
  api.sendMessage(
    M(text),
    threadID,
    (err, info) => {
      if (err || !info) return;
      setTimeout(() => {
        try {
          api.unsendMessage(info.messageID);
        } catch (e) {}
      }, 4000);
    },
    replyTo
  );
}

function dhakaTime(ms) {
  return new Date(ms).toLocaleString("en-US", {
    timeZone: "Asia/Dhaka",
    hour12: true,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function botIsAdmin(api, threadID) {
  try {
    const info = await api.getThreadInfo(threadID);
    const botID = String(api.getCurrentUserID());
    return (info.adminIDs || []).some((a) => String(a.id) === botID);
  } catch (e) {
    return false;
  }
}

function kickSilent(api, uid, threadID) {
  return new Promise((resolve) => {
    try {
      api.removeUserFromGroup(uid, threadID, () => resolve());
    } catch (e) {
      resolve();
    }
  });
}

function removeTimed(threadID, targetID, kickAt) {
  const d = loadData();
  d.timed = d.timed.filter(
    (i) =>
      !(
        String(i.threadID) === String(threadID) &&
        String(i.targetID) === String(targetID) &&
        i.kickAt === kickAt
      )
  );
  saveData(d);
}

// Schedule a silent timed kick
function scheduleKick(api, item) {
  const delay = Math.max(item.kickAt - Date.now(), 0);
  setTimeout(async () => {
    await kickSilent(api, item.targetID, item.threadID);
    removeTimed(item.threadID, item.targetID, item.kickAt);
  }, delay);
}

// ================= ON LOAD (restore timers after restart) =================

module.exports.onLoad = function ({ api }) {
  try {
    const d = loadData();
    for (const item of d.timed) scheduleKick(api, item);
  } catch (e) {}
};

// ================= SILENT KICK ON MESSAGE =================

module.exports.handleEvent = async function ({ api, event }) {
  try {
    if (event.type !== "message" && event.type !== "message_reply") return;

    const { threadID, senderID } = event;
    if (!senderID || String(senderID) === String(api.getCurrentUserID())) return;

    const d = loadData();
    const hit = d.watch.find(
      (w) =>
        String(w.threadID) === String(threadID) &&
        String(w.targetID) === String(senderID)
    );
    if (!hit) return;

    // remove from list first, then kick silently
    d.watch = d.watch.filter((w) => w !== hit && !(
      String(w.threadID) === String(threadID) &&
      String(w.targetID) === String(senderID)
    ));
    saveData(d);

    await kickSilent(api, senderID, threadID);
  } catch (e) {}
};

// ================= COMMAND =================

module.exports.run = async function ({ api, event, args, Users }) {
  const { threadID, messageID, mentions, type, senderID } = event;

  // ---------- BOT ADMIN ONLY ----------
  const botAdmins = (global.config.ADMINBOT || []).map(String);
  if (!botAdmins.includes(String(senderID))) {
    return notify(api, threadID, "❌ Access denied\nBot admin only.", messageID);
  }

  // ---------- USAGE ----------
  if (!args[0]) {
    return notify(
      api,
      threadID,
      `🛡️ Antikick\n\n` +
        `⏱ antikick 10m / 2h\n` +
        `🤫 antikick on  (kick on next msg)\n` +
        `🔓 antikick off\n\n` +
        `Use: reply / mention / uid`,
      messageID
    );
  }

  // ---------- BOT MUST BE GROUP ADMIN ----------
  if (!(await botIsAdmin(api, threadID))) {
    return notify(
      api,
      threadID,
      "⚠️ Bot is not admin!\nMake bot admin first, then use antikick.",
      messageID
    );
  }

  // ---------- TARGET ----------
  let targetID;
  if (type === "message_reply" && event.messageReply) {
    targetID = event.messageReply.senderID;
  } else if (mentions && Object.keys(mentions).length > 0) {
    targetID = Object.keys(mentions)[0];
  } else {
    const uidArg = args.find((a) => /^\d{8,}$/.test(a));
    if (uidArg) targetID = uidArg;
  }

  const mode = args[0].toLowerCase();
  const timeArg = args.find((a) => /^\d+[mh]$/i.test(a));

  if (!targetID) {
    return notify(
      api,
      threadID,
      "⚠️ No user found!\nReply / mention / uid.",
      messageID
    );
  }

  targetID = String(targetID);

  // ---------- PROTECT BOT & BOT ADMINS ----------
  if (targetID === String(api.getCurrentUserID()) || botAdmins.includes(targetID)) {
    return notify(api, threadID, "🚫 Can't target bot or bot admin.", messageID);
  }

  let userName = "Unknown";
  try {
    const user = await Users.getData(targetID);
    userName = user.name || "Unknown";
  } catch (e) {}

  // ---------- MODE: ON (silent kick on next message) ----------
  if (mode === "on") {
    const d = loadData();
    const exists = d.watch.some(
      (w) => String(w.threadID) === String(threadID) && String(w.targetID) === targetID
    );
    if (!exists) {
      d.watch.push({ threadID, targetID, userName });
      saveData(d);
    }
    return notify(
      api,
      threadID,
      `🤫 Silent kick ON\n\n👤 ${userName}\n🆔 ${targetID}\n\nWill be kicked on next message.`,
      messageID
    );
  }

  // ---------- MODE: OFF ----------
  if (mode === "off") {
    const d = loadData();
    d.watch = d.watch.filter(
      (w) => !(String(w.threadID) === String(threadID) && String(w.targetID) === targetID)
    );
    saveData(d);
    return notify(
      api,
      threadID,
      `🔓 Silent kick OFF\n\n👤 ${userName}`,
      messageID
    );
  }

  // ---------- MODE: TIMED ----------
  if (!timeArg) {
    return notify(
      api,
      threadID,
      "❌ Time missing / wrong!\n\nExamples:\nantikick 10m\nantikick 2h",
      messageID
    );
  }

  const match = timeArg.toLowerCase().match(/^(\d+)(m|h)$/);
  const amount = parseInt(match[1]);
  const unit = match[2];
  const delay = unit === "m" ? amount * 60 * 1000 : amount * 60 * 60 * 1000;
  const kickAt = Date.now() + delay;

  const item = { threadID, targetID, userName, kickAt };
  const d = loadData();
  d.timed.push(item);
  saveData(d);

  scheduleKick(api, item);

  return notify(
    api,
    threadID,
    `🛡️ Kick set\n\n👤 ${userName}\n🆔 ${targetID}\n⏳ ${amount}${unit}\n🕒 ${dhakaTime(kickAt)} (BD)`,
    messageID
  );
};
