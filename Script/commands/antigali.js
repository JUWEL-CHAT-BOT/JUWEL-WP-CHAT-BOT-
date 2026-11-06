const fs = require('fs');
const path = __dirname + '/antigaliStatus.json';

let offenseTracker = {};
let settings = {};

function loadSettings() {
  try {
    if (fs.existsSync(path)) {
      const data = fs.readFileSync(path, 'utf8');
      settings = JSON.parse(data);
    } else {
      settings = {};
    }
  } catch (e) {
    settings = {};
  }
}
loadSettings();

function saveSettings() {
  fs.writeFileSync(path, JSON.stringify(settings, null, 2), 'utf8');
}

// ==================== গালি তালিকা (ভাষা অনুযায়ী) ====================
const badWordsEnglish = [
  "fucking", "motherfucker", "mother fucker", "fucker", "bollocks", "Sawya", "sawya",
  "tui magi", "stupid juwel",
  "bot fuck you", "🖕", "🖕🖕", "🖕🖕🖕", "toke🖕", "toke🖕🖕", "toke 🖕", "🖕 fuck", "fuck 🖕",
  "chut", "gand", "bhosdi", "benchod", "madarchod", "randi", "kutta bacsa", "magi", "Magi", "MC Bot", "MC bot", "Mc Bot", "Vodar Bot", "Sawyar Bot", "sawyar bot", " bot tor booske chudi", "Bot tor boos ke chudi",
  "xodi", "Xodi", "cdi", "Cdi", "tor mar Voda", "tor mare cdi", "Tor mare chodi", "Tor mar voda", "Tor mar Voda", "Tor Bon ar Voda", "Pompom", "chutmarani", " juwek ke cudi", "Juwel ke cdi", "tor boos Juwel ke Chudi",
  "bokacoda", "xodi", "xoda", "cdi", "72 Lack", "chdi", "chup magi", "Chup magi", "tok chudi", "Tor mar Sawya", " Tor bon ar sawya", "Tor Bon ar Sawya", " Sawya dey",
  "tok abal", "Sawya", "sawya", "Voda", "voda", "Juwel ke chudi", "abal", "vodar group", "Vodar group", "Sawyar group", "nunu", "Nunu", "Tuntuni", "tuntuni", "tor boos ke cudi", "Tor boos ke cudi", "Tor boss ke chudi"
];

const badWordsBengali = [
  "আবাল", "সাউয়া", "ভোদা", "মাগি", "চুদি", "বোকাচোদা", "বোকাচুদা", "মাদারচোদ", "চুদা",
  "চুদতে", "সেক্স করতে", "ভোদার গুপ", "সাউয়ার", "খানকি", "পুটকি", "গুদ", "রেন্ডি", "হাত মার",
  "গিটার বাজাও", "হাত মাড়া", "চুদবো", "চুদানির পোলা", "মাং", "মাংগের বেডি", "বালের বট", " তোর বোন এর ভোদা", "তোর বোন এর সাউয়া", "তোর বোন কে চুদি",
  "সাউয়ার বট", "সাউয়ার কথা", "তোর মার ভোদা", "তোর সাউয়া", "তোর মায়ের সাউয়া", "তোর মার সাউয়া", "তোর মার ভোদা",
  "তোর বোনের সাউয়া", "তোর সাউয়া মাগি", "জুয়েল কে চুদি", "জুয়েল চোকাচোদা",
  "এডমিন এর বাল", "চোদার", "তোর মতো মাগি", "তোক চুদি", "তুই ১২ মাগি", "জুয়েল এর মারে চুদি", "জুয়েল এর মাকে চুদি", "জুয়েল এর মার ভোদা", "জুয়েল এর মার সাউয়া",
  "তুই হাত মাড়া মাগি", "তোর মা মাগি", "তোর বোন মাগি", "তোর মাকে চুদি", "তোর বোনকে চুদি", "জুয়েল এর বোন কে চুদি", "জুয়েল এর বোন এর সাউয়া", "জয়েল এর বোন এর ভোদা",
  "মাদারচোদ", "কার বাল", "নিছের বাল", "চোকাচোদা", "রেন্ডির ছেলে", "রেন্ডি মেয়ে",
  "পম্পম", "Pompom", "আবাল নাকি", "জুয়েল বোকাচোদা", "তুই বোকাচোদা", "তুই বুকাচুদা",
  "জাও গিটার বাজাও", "হাত মারবে", "হাত মারবো", "হাত মারো", "হাত মারতে জাবে", "বট এর বসকে চুদি", "বট তোর বসকে চুদি", "বট তোর বস জুয়েল কে চুদি",
  "গিটার বাজাবো", "তুই ১২ ভাতারী মাগি", "তুই হাত মাড়া", "হাত মাড়ি", "জান চুদতে দিবে", "বট কে চুদি", "বট চুদি", "সাউয়ার বট", "ভোদার বট", "মাংগের বট", "বট তোর বস কে চুদি", "বট তোকে চুদি", "বট তোরে চুদি", "সাউয়ার বট চুদি", "ভোদার বট চুদি"
];

// ==================== গালি চেক ====================
function checkBadMessage(message) {
  const lower = message.toLowerCase().trim();

  for (let word of badWordsBengali) {
    if (lower.includes(word.toLowerCase())) {
      return { hasBad: true, type: 'বাংলা', word: word };
    }
  }

  for (let word of badWordsEnglish) {
    if (lower.includes(word.toLowerCase())) {
      return { hasBad: true, type: 'ইংরেজি', word: word };
    }
  }

  return { hasBad: false };
}

const BOT_ADMINS = ["61594400795920"];

// ==================== অটো ডিলিট (৫ সেকেন্ড) ====================
const DELETE_AFTER = 5000;

function sendTemp(api, text, threadID) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (info) => { if (!done) { done = true; resolve(info); } };
    try {
      const ret = api.sendMessage(text, threadID, (err, info) => {
        if (!err && info && info.messageID) {
          setTimeout(() => {
            try { Promise.resolve(api.unsendMessage(info.messageID)).catch(() => {}); } catch (_) {}
          }, DELETE_AFTER);
        }
        finish(info);
      });
      if (ret && typeof ret.then === 'function') ret.then(finish).catch(() => finish());
    } catch (e) {
      finish();
    }
  });
}

// ==================== ছোট ফ্রেম ====================
const TOP = "╔═════════════════╗";
const MID = "╠═════════════════╣";
const BOT = "╚═════════════════╝";
const FOOT = "║ 🛡️ অ্যান্টি-গালি সিস্টেম (৩ স্ট্রাইক)";

function frame(lines) {
  return [TOP, ...lines.map(l => "║ " + l), MID, FOOT, BOT].join("\n");
}

// ==================== কনফিগ ====================
module.exports.config = {
  name: "antigali",
  version: "4.2.0",
  hasPermssion: 0,
  credits: "MR JUWEL",
  description: "বাংলা+ইংরেজি Anti-Gali (ছোট ফ্রেম, ইউআইডি ছাড়া, অ্যাডমিন ইনবক্স অ্যালার্ট)",
  commandCategory: "moderation",
  usages: "[on/off/status]",
  cooldowns: 0
};

// ==================== ইভেন্ট হ্যান্ডলার ====================
module.exports.handleEvent = async function ({ api, event, Threads }) {
  try {
    if (!event.body) return;
    const threadID = event.threadID;

    const isEnabled = settings[threadID] !== undefined ? settings[threadID] : true;
    if (!isEnabled) return;

    const message = event.body;
    const userID = event.senderID;
    if (!userID) return;

    // ==================== 🤖 বট আইডি ====================
    let botID = null;
    try {
      if (typeof api.getCurrentUserID === 'function') {
        botID = api.getCurrentUserID();
      } else if (global.data && global.data.botID) {
        botID = global.data.botID;
      } else if (global.client && global.client.botID) {
        botID = global.client.botID;
      }
      if (botID) botID = String(botID).trim();
    } catch (e) {
      console.error("Bot ID fetch error:", e);
      botID = null;
    }

    const { hasBad, type, word } = checkBadMessage(message);
    if (!hasBad) return;

    if (event.messageID) {
      try {
        await api.setMessageReaction("❌", event.messageID);
      } catch (e) {
        console.warn("Reaction failed:", e.message);
      }
    }

    if (!offenseTracker[threadID]) offenseTracker[threadID] = {};
    if (!offenseTracker[threadID][userID]) {
      offenseTracker[threadID][userID] = { enCount: 0, bnCount: 0, total: 0, lastUpdated: Date.now() };
    }
    let userData = offenseTracker[threadID][userID];

    if (type === 'ইংরেজি') userData.enCount += 1;
    else if (type === 'বাংলা') userData.bnCount += 1;
    userData.total += 1;
    userData.lastUpdated = Date.now();

    const totalCount = userData.total;
    const enCount = userData.enCount;
    const bnCount = userData.bnCount;

    let userInfo = {};
    let threadInfo = {};
    try {
      const [uInfo, tInfo] = await Promise.all([
        api.getUserInfo(userID).catch(() => ({})),
        api.getThreadInfo(threadID).catch(() => ({}))
      ]);
      userInfo = uInfo;
      threadInfo = tInfo;
    } catch (e) {
      console.error("Info fetch error:", e);
    }

    const userName = userInfo[userID]?.name || "অজানা";
    const groupName = threadInfo.threadName || "Unknown";

    // ==================== 👑 এডমিন লিস্ট ====================
    const adminIDs = Array.isArray(threadInfo.adminIDs) ? threadInfo.adminIDs : [];
    const adminIdList = adminIDs.map(item => {
      if (typeof item === 'string') return String(item).trim();
      if (item && item.id) return String(item.id).trim();
      return null;
    }).filter(Boolean);

    const isAdminInThread = (uid) => {
      if (!uid) return false;
      return adminIdList.includes(String(uid).trim());
    };

    // ==================== গ্রুপ সতর্কবার্তা (ইউআইডি ছাড়া) ====================
    const warnFrame = (n, extra) => frame([
      `⚠️ সতর্কবার্তা #${n} ⚠️`,
      ``,
      `👤 ব্যবহারকারী : ${userName}`,
      `🌐 এই বার্তায় ভাষা : ${type}`,
      `📝 শনাক্তকৃত শব্দ : "${word}"`,
      ``,
      `📊 মোট গালি : ${totalCount} বার`,
      `🇬🇧 ইংরেজি : ${enCount} বার`,
      `🇧🇩 বাংলা : ${bnCount} বার`,
      ``,
      `⚠️ আপনার মেসেজে খারাপ কথা পাওয়া গেছে!`,
      `📌 দয়া করে মেসেজটি ডিলিট করুন!`,
      `💢 গ্রুপের পরিবেশ নষ্ট করিও না!`,
      ``,
      `🔁 খারাপ কথা বলেছেন : ${n} বার (এই সেশন)`,
      `🚫 ${3 - n} বার বাকি, এরপর কিক!`,
      ``,
      extra
    ]);

    // ==================== অ্যাডমিন ইনবক্স অ্যালার্ট (ইউআইডি ছাড়া) ====================
    const alertMsg =
`🚨 অ্যান্টি-গালি অ্যালার্ট 🚨

📌 গ্রুপ: ${groupName}
👤 ব্যবহারকারী: ${userName}
🌐 ভাষা: ${type}
📝 শব্দ: "${word}"
⚠️ সতর্কতা: ${totalCount} (ইংরেজি ${enCount}, বাংলা ${bnCount})
💬 অশালীন বার্তা: "${message}"`;

    const sendPromises = [];

    if (totalCount === 1) {
      sendPromises.push(sendTemp(api, warnFrame(1, '📌 ১ম সতর্কতা! সাবধান!'), threadID).catch(() => {}));
    } else if (totalCount === 2) {
      sendPromises.push(sendTemp(api, warnFrame(2, '⚠️ শেষ সতর্কতা! পরবর্তী বার কিক!'), threadID).catch(() => {}));
    }

    // গ্রুপ অ্যাডমিন + বট অ্যাডমিন — সোজা ইনবক্সে (ডুপ্লিকেট ও বট নিজে বাদ)
    const inboxTargets = [...new Set([...adminIdList, ...BOT_ADMINS])]
      .filter(id => id && id !== botID);
    for (const id of inboxTargets) {
      sendPromises.push(api.sendMessage(alertMsg, id).catch(() => {}));
    }

    await Promise.allSettled(sendPromises).catch(() => {});

    if (event.messageID) {
      setTimeout(() => {
        api.unsendMessage(event.messageID).catch(() => {});
      }, DELETE_AFTER);
    }

    // ==================== ৩ বার হলে কিক ====================
    if (totalCount === 3) {
      let botIsAdmin = false;
      let freshAdmins = adminIdList;

      try {
        const freshInfo = await api.getThreadInfo(threadID);
        freshAdmins = (freshInfo.adminIDs || []).map(a =>
          String(typeof a === 'string' ? a : a.id).trim()
        );
        botIsAdmin = botID ? freshAdmins.includes(String(botID).trim()) : false;
      } catch (e) {
        console.error("Fresh admin check failed:", e);
        botIsAdmin = botID ? isAdminInThread(botID) : false;
      }

      if (!botIsAdmin) {
        await sendTemp(api, frame([
          `⚠️ অটো কিক বন্ধ!`,
          ``,
          `🤖 বট গ্রুপ অ্যাডমিন নয়!`,
          `❌ তাই কাউকে কিক করা সম্ভব নয়!`,
          ``,
          `👤 ${userName}`,
          `📋 Admins: ${freshAdmins.length} জন`
        ]), threadID).catch(() => {});
        return;
      }

      if (isAdminInThread(userID)) {
        await sendTemp(api, frame([
          `⚠️ অটো কিক বন্ধ!`,
          ``,
          `👑 এই ব্যবহারকারী গ্রুপ অ্যাডমিন!`,
          `❌ তাই তাকে কিক করা সম্ভব নয়!`,
          ``,
          `👤 ${userName}`
        ]), threadID).catch(() => {});
        return;
      }

      try {
        await sendTemp(api, frame([
          `🚫 ইউজার কিক করা হয়েছে!`,
          ``,
          `👤 ${userName}`,
          ``,
          `⚠️ ৩ বার খারাপ কথা ব্যবহার করেছেন!`,
          `💢 গ্রুপের পরিবেশ নষ্ট করার জন্য কিক!`,
          `💀 বিদায়! 👋`
        ]), threadID);
        await api.removeUserFromGroup(userID, threadID);
        userData.total = 0; userData.enCount = 0; userData.bnCount = 0;
      } catch (kickErr) {
        console.error("Kick failed:", kickErr);
        userData.total = 2;
        await sendTemp(api, frame([
          `❌ ব্যর্থ হয়েছে!`,
          ``,
          `⚠️ ${userName}`,
          `➡️ কিক করতে ব্যর্থ!`,
          `💬 কারণ: ${kickErr.message || "Unknown"}`
        ]), threadID).catch(() => {});
      }
    }

    setTimeout(() => {
      if (offenseTracker[threadID] && offenseTracker[threadID][userID]) {
        if (Date.now() - offenseTracker[threadID][userID].lastUpdated > 3600000) {
          offenseTracker[threadID][userID].total = 0;
          offenseTracker[threadID][userID].enCount = 0;
          offenseTracker[threadID][userID].bnCount = 0;
        }
      }
    }, 3600000);

  } catch (error) {
    console.error("❌ AntiGali CRASH:", error);
    try {
      await sendTemp(api, "⚠️ অ্যান্টি-গালি সিস্টেমে ত্রুটি! লগ চেক করুন।", event.threadID);
    } catch (_) {}
  }
};

// ==================== রান কমান্ড ====================
module.exports.run = async function ({ api, event, args }) {
  const threadID = event.threadID;
  const command = args[0] ? args[0].toLowerCase() : null;
  const name = module.exports.config.name;

  if (!command) {
    const isBotAdmin = BOT_ADMINS.includes(event.senderID);
    const statusText = settings[threadID] !== undefined ? (settings[threadID] ? '✅ চালু' : '❌ বন্ধ') : '✅ চালু (ডিফল্ট)';
    const lines = [
      `📋 অ্যান্টি-গালি কন্ট্রোল প্যানেল`,
      ``,
      `📌 বর্তমান স্ট্যাটাস: ${statusText}`,
      ``,
      `🔹 অপশন সমূহ:`
    ];
    if (isBotAdmin) {
      lines.push(`➡️ ${name} on → চালু`, `➡️ ${name} off → বন্ধ`);
    } else {
      lines.push(`⚠️ শুধুমাত্র বট অ্যাডমিনরা on/off করতে পারেন`);
    }
    lines.push(`➡️ ${name} status → স্ট্যাটাস`);
    return sendTemp(api, frame(lines), threadID);
  }

  if ((command === 'on' || command === 'off') && !BOT_ADMINS.includes(event.senderID)) {
    return sendTemp(api, frame([
      `⛔ অ্যাক্সেস অস্বীকৃত!`,
      ``,
      `⚠️ শুধুমাত্র বট অ্যাডমিনরা এই কমান্ড`,
      `ব্যবহার করতে পারেন।`
    ]), threadID);
  }

  if (command === 'on') {
    settings[threadID] = true;
    saveSettings();
    return sendTemp(api, frame([
      `✅ সিস্টেম চালু হয়েছে!`,
      ``,
      `📌 এই গ্রুপে এখন থেকে খারাপ কথা ব্যবহার`,
      `করলে ব্যবস্থা নেওয়া হবে।`
    ]), threadID);
  } else if (command === 'off') {
    settings[threadID] = false;
    saveSettings();
    if (offenseTracker[threadID]) delete offenseTracker[threadID];
    return sendTemp(api, frame([
      `❌ সিস্টেম বন্ধ করা হয়েছে!`,
      ``,
      `📌 এই গ্রুপে এখন থেকে কোনো খারাপ কথা`,
      `চেক করা হবে না।`
    ]), threadID);
  } else if (command === 'status') {
    const status = settings[threadID] !== undefined ? settings[threadID] : true;
    const statusText = status ? '✅ চালু' : '❌ বন্ধ';
    return sendTemp(api, frame([
      `📊 সিস্টেম স্ট্যাটাস`,
      ``,
      `🆔 গ্রুপ আইডি : ${threadID}`,
      `📌 বর্তমান অবস্থা : ${statusText}`,
      ``,
      `📋 কমান্ড সমূহ:`,
      `➡️ ${name} on → চালু`,
      `➡️ ${name} off → বন্ধ`,
      `➡️ ${name} status → স্ট্যাটাস`
    ]), threadID);
  } else {
    return sendTemp(api, frame([
      `⚠️ ভুল কমান্ড!`,
      ``,
      `📌 ব্যবহার করুন:`,
      `${name} on/off/status`
    ]), threadID);
  }
};
