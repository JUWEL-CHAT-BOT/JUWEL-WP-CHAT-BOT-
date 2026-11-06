const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "quiz",
  version: "5.1.0",
  hasPermssion: 0,
  credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  description: "বাংলা কুইজ + কয়েন + গিফট + স্পিন + টপ১০",
  usePrefix: false,
  commandCategory: "Game",
  usages: "quiz [h]",
  cooldowns: 5,
  dependencies: { "axios": "", "fs-extra": "" }
};

// ==================== কনস্ট্যান্ট ====================
const QUIZ_TIMEOUT = 40 * 1000; // ৪০ সেকেন্ড
const REWARD = 5000;
const PENALTY = 1000;
const MAX_BET = 100000;
const QUIZ_URL =
  "https://rubish-apihub.onrender.com/rubish/quiz-api?category=Bangla&apikey=rubish69";

// ==================== কয়েন স্টোর ====================
const CACHE_DIR = path.join(__dirname, "cache");
const COIN_FILE = path.join(CACHE_DIR, "coins.json");
const NAME_FILE = path.join(CACHE_DIR, "usernames.json");

function ensureDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.ensureDirSync(CACHE_DIR);
}

function loadJSON(file, def = {}) {
  try {
    ensureDir();
    if (!fs.existsSync(file)) fs.writeJsonSync(file, def);
    return fs.readJsonSync(file);
  } catch (e) {
    console.error("loadJSON error:", e);
    return def;
  }
}

function saveJSON(file, data) {
  try {
    ensureDir();
    fs.writeJsonSync(file, data, { spaces: 2 });
  } catch (e) {
    console.error("saveJSON error:", e);
  }
}

function loadCoins() { return loadJSON(COIN_FILE, {}); }
function saveCoins(d) { saveJSON(COIN_FILE, d); }
function loadNames() { return loadJSON(NAME_FILE, {}); }
function saveNames(d) { saveJSON(NAME_FILE, d); }

// ==================== কনফিগ ====================
function getBotConfig() {
  try {
    const cfgPath = path.join(__dirname, "..", "..", "config.json");
    if (fs.existsSync(cfgPath)) return fs.readJsonSync(cfgPath);
  } catch (e) {}
  return {};
}

function getAdminCoins() {
  return Number(getBotConfig().adminCoins) || 1928377;
}
function getDefaultCoins() {
  return Number(getBotConfig().defaultCoins) || 10500;
}
function isBotAdmin(uid) {
  const cfg = getBotConfig();
  const admins = cfg.botAdminID || cfg.ADMINBOT || [];
  return admins.map(String).includes(String(uid));
}

// ==================== কয়েন হেল্পার ====================
function getCoins(uid) {
  if (isBotAdmin(uid)) return getAdminCoins();
  const data = loadCoins();
  if (data[uid] === undefined) {
    data[uid] = getDefaultCoins();
    saveCoins(data);
  }
  return data[uid];
}

function setCoins(uid, amount) {
  if (isBotAdmin(uid)) return getAdminCoins();
  const data = loadCoins();
  data[uid] = Math.max(0, amount);
  saveCoins(data);
  return data[uid];
}

function addCoins(uid, amount) {
  if (isBotAdmin(uid)) return getAdminCoins();
  return setCoins(uid, getCoins(uid) + amount);
}

// ==================== নাম সেভ ====================
function saveName(uid, name) {
  if (!uid || !name) return;
  const names = loadNames();
  if (names[uid] === name) return;
  names[uid] = name;
  saveNames(names);
}

function getName(uid) {
  const names = loadNames();
  return names[uid] || null;
}

async function resolveName(Users, uid) {
  try {
    if (Users && Users.getNameUser) {
      const n = await Users.getNameUser(uid);
      if (n) {
        saveName(uid, n);
        return n;
      }
    }
  } catch (e) {}
  return getName(uid) || "ইউজার";
}

// ==================== সঠিক উত্তর নর্মালাইজ ====================
// API থেকে answer "A" / "a" / "A) text" / পুরো অপশন টেক্সট — সবই হ্যান্ডেল করে
function normalizeAnswer(data) {
  const raw = String(data.answer).trim();
  const opts = { A: data.A, B: data.B, C: data.C, D: data.D };

  const upper = raw.toUpperCase();
  if (["A", "B", "C", "D"].includes(upper)) return upper;

  const m = upper.match(/^([ABCD])[\)\.\:\s]/);
  if (m) return m[1];

  const found = Object.keys(opts).find(
    k => String(opts[k]).trim() === raw
  );
  if (found) return found;

  const foundLoose = Object.keys(opts).find(
    k => String(opts[k]).trim().toLowerCase() === raw.toLowerCase()
  );
  return foundLoose || null;
}

// ==================== টপ ১০ ====================
function getTop10() {
  const data = loadCoins();
  const names = loadNames();
  return Object.entries(data)
    .map(([uid, coins]) => ({
      uid,
      coins: Number(coins) || 0,
      name: names[uid] || `User_${String(uid).slice(-4)}`
    }))
    .sort((a, b) => b.coins - a.coins)
    .slice(0, 10);
}

function formatTop10() {
  const top = getTop10();
  const medals = ["🥇", "🥈", "🥉"];
  let text = `╭────✦ 🏆 টপ ১০ লিডারবোর্ড ✦────╮\n`;
  if (!top.length) {
    text += `│ এখনো কোনো ডাটা নেই\n`;
  } else {
    top.forEach((u, i) => {
      const rank = medals[i] || ` ${i + 1}.`;
      text += `│ ${rank} ${u.name} — ${u.coins} 💰\n`;
    });
  }
  text += `╰──────────────────────────────╯`;
  return text;
}

// ==================== কুইজ মেইন ====================
module.exports.run = async function ({ api, event, args, Users }) {
  const { threadID, messageID, senderID } = event;
  const cmd = (args[0] || "").toLowerCase();

  // প্রতিবার কমান্ড চালালেই নাম সেভ (টপ ১০-এ নাম দেখানোর জন্য)
  await resolveName(Users, senderID);

  // ---------- হেল্প ----------
  if (cmd === "h" || cmd === "help") {
    return api.sendMessage(
      `╭──✦ 🧠 কুইজ গাইড ✦──╮\n` +
        `│ ➤ কমান্ড: quiz\n` +
        `│ ➤ সঠিক উত্তর: +৫০০০ কয়েন 💰\n` +
        `│ ➤ ভুল উত্তর: −১০০০ কয়েন ❌\n` +
        `│ ➤ প্রতিটা ইউজার শুরুতে: ১০৫০০ কয়েন 🎁\n` +
        `│ ➤ সময়: ৪০ সেকেন্ড ⏰\n` +
        `│ ➤ কুইজ মেসেজ ডিলিট হবে না ✅\n` +
        `╰──────────────────────╯\n\n` +
        `📌 অন্যান্য কমান্ড:\n` +
        `➤ quiz bal → কয়েন চেক\n` +
        `➤ quiz top → টপ ১০ লিডারবোর্ড 🏆\n` +
        `➤ quiz gift @মেনশন <amount> → গিফট (বা রিপ্লাই দিয়ে)\n` +
        `➤ quiz spin <amount> → স্পিন গেম 🎰\n\n` +
        `⚡ শুভকামনা!`,
      threadID,
      messageID
    );
  }

  // ---------- ব্যালেন্স ----------
  if (["bal", "balance", "money", "many"].includes(cmd)) {
    const coins = getCoins(senderID);
    const tag = isBotAdmin(senderID) ? "👑 এডমিন" : "👤 ইউজার";
    return api.sendMessage(
      `╭──✦ 💰 ব্যালেন্স ✦──╮\n` +
        `│ ${tag}\n` +
        `│ 🏦 কয়েন: ${coins}\n` +
        `╰────────────────────╯`,
      threadID,
      messageID
    );
  }

  // ---------- টপ ১০ ----------
  if (["top", "top10", "leaderboard", "lb"].includes(cmd)) {
    return api.sendMessage(formatTop10(), threadID, messageID);
  }

  // ---------- গিফট ----------
  if (cmd === "gift") {
    const mentions = Object.keys(event.mentions || {});
    let receiver = null;
    let recName = null;

    if (event.type === "message_reply" && event.messageReply) {
      receiver = event.messageReply.senderID;
      recName = await resolveName(Users, receiver);
    } else if (mentions.length) {
      receiver = mentions[0];
      recName = String(event.mentions[receiver] || "").replace(/^@/, "") ||
        (await resolveName(Users, receiver));
    }

    if (!receiver) {
      return api.sendMessage(
        `⚠️ কাউকে মেনশন করো বা রিপ্লাই দিয়ে লিখো:\nquiz gift <amount>`,
        threadID,
        messageID
      );
    }
    if (String(receiver) === String(senderID)) {
      return api.sendMessage("❌ নিজেকে নিজে গিফট দেওয়া যাবে না!", threadID, messageID);
    }

    // মেনশন থাকলে amount সবসময় শেষ আর্গুমেন্টে থাকে
    const amount = parseInt(args[args.length - 1]);
    if (!amount || amount <= 0) {
      return api.sendMessage(
        "⚠️ সঠিক পরিমাণ লেখো: quiz gift @নাম <amount>",
        threadID,
        messageID
      );
    }

    const senderBal = getCoins(senderID);
    if (senderBal < amount) {
      return api.sendMessage(
        `❌ পর্যাপ্ত কয়েন নেই।\n💰 ব্যালেন্স: ${senderBal}`,
        threadID,
        messageID
      );
    }

    if (!isBotAdmin(senderID)) setCoins(senderID, senderBal - amount);
    addCoins(receiver, amount);

    return api.sendMessage(
      {
        body:
          `╭──✦ 🎁 গিফট সফল ✦──╮\n` +
          `│ 📥 প্রাপক: ${recName}\n` +
          `│ 💰 পরিমাণ: ${amount} কয়েন\n` +
          `│ 🏦 তোমার ব্যালেন্স: ${getCoins(senderID)}\n` +
          `╰───────────────────╯`,
        mentions: [{ id: receiver, tag: recName }]
      },
      threadID,
      messageID
    );
  }

  // ---------- স্পিন ----------
  if (cmd === "spin") {
    const bet = args[1] === undefined ? 100 : parseInt(args[1]);
    if (!bet || bet <= 0) {
      return api.sendMessage("⚠️ সঠিক বাজি লেখো: quiz spin <amount>", threadID, messageID);
    }
    if (bet > MAX_BET) {
      return api.sendMessage(
        `⚠️ সর্বোচ্চ বাজি ${MAX_BET} কয়েন।`,
        threadID,
        messageID
      );
    }

    const bal = getCoins(senderID);
    if (bal < bet) {
      return api.sendMessage(
        `❌ পর্যাপ্ত কয়েন নেই।\n💰 ব্যালেন্স: ${bal}`,
        threadID,
        messageID
      );
    }

    if (!isBotAdmin(senderID)) setCoins(senderID, bal - bet);

    // গড় রিটার্ন ≈ ০.৯৪x (ইনফ্লেশন ঠেকানোর জন্য)
    const rand = Math.random();
    let reward = 0;
    let msg = "";

    if (rand < 0.02) { reward = bet * 5; msg = "🎉🎉 MEGA JACKPOT! (5x)"; }
    else if (rand < 0.10) { reward = bet * 3; msg = "🎊 GREAT! (3x)"; }
    else if (rand < 0.30) { reward = bet * 2; msg = "✨ NICE! (2x)"; }
    else if (rand < 0.50) { reward = bet; msg = "😐 ফেরত পেলে (1x)"; }
    else { reward = 0; msg = "💀 হেরে গেলে! (0x)"; }

    addCoins(senderID, reward);

    return api.sendMessage(
      `╭──✦ 🎰 স্পিন রেজাল্ট ✦──╮\n` +
        `│ ${msg}\n` +
        `│ 💰 পেয়েছ: ${reward}\n` +
        `│ 🏦 নতুন ব্যালেন্স: ${getCoins(senderID)}\n` +
        `╰────────────────────────╯`,
      threadID,
      messageID
    );
  }

  // ---------- কুইজ স্টার্ট ----------
  try {
    const res = await axios.get(QUIZ_URL, { timeout: 25000 });
    const data = res.data;
    if (!data || !data.question || !data.answer) throw new Error("Invalid quiz data");

    const correct = normalizeAnswer(data);
    if (!correct) throw new Error("Cannot resolve correct answer: " + JSON.stringify(data));

    const quizText =
      `╭──────✦ 🧠 বাংলা কুইজ ✦──────╮\n` +
      `│\n` +
      `│ ❓ প্রশ্ন: ${data.question}\n` +
      `│\n` +
      `│ 𝗔) ${data.A}\n` +
      `│ 𝗕) ${data.B}\n` +
      `│ 𝗖) ${data.C}\n` +
      `│ 𝗗) ${data.D}\n` +
      `│\n` +
      `╰────────────────────────────╯\n` +
      `✍️ এই মেসেজে রিপ্লাই দাও: A / B / C / D\n` +
      `💰 সঠিক: +৫০০০ | ❌ ভুল: −১০০০\n` +
      `⏰ সময়: ৪০ সেকেন্ড`;

    return api.sendMessage(quizText, threadID, (err, info) => {
      if (err) return console.error(err);

      const timeout = setTimeout(() => {
        const idx = global.client.handleReply.findIndex(
          e => e.messageID === info.messageID
        );
        if (idx !== -1) {
          global.client.handleReply.splice(idx, 1);
          api.sendMessage(
            `⏰ সময় শেষ!\n✅ সঠিক উত্তর ছিল: ${correct}) ${data[correct]}`,
            threadID
          );
        }
      }, QUIZ_TIMEOUT);

      global.client.handleReply.push({
        name: module.exports.config.name,
        messageID: info.messageID,
        author: senderID,
        answer: correct,
        answerText: data[correct],
        timeout
      });
    });
  } catch (e) {
    console.error("quiz error:", e.message || e);
    return api.sendMessage(
      "❌ কুইজ লোড করা যায়নি (সার্ভার ঘুমিয়ে থাকতে পারে), ১ মিনিট পর আবার চেষ্টা করো!",
      threadID,
      messageID
    );
  }
};

// ==================== handleReply ====================
module.exports.handleReply = async function ({ api, event, handleReply, Users }) {
  const { senderID, threadID, messageID, body } = event;

  if (String(senderID) !== String(handleReply.author)) return;

  const userAnswer = (body || "").trim().toUpperCase();
  if (!["A", "B", "C", "D"].includes(userAnswer)) {
    return api.sendMessage("⚠️ শুধু A / B / C / D লিখে উত্তর দাও", threadID, messageID);
  }

  // টাইমআউট ক্লিয়ার
  if (handleReply.timeout) clearTimeout(handleReply.timeout);

  const idx = global.client.handleReply.findIndex(
    e => e.messageID === handleReply.messageID
  );
  if (idx !== -1) global.client.handleReply.splice(idx, 1);

  try {
    const name = await resolveName(Users, senderID);
    const mention = [{ id: senderID, tag: name }];
    const admin = isBotAdmin(senderID);
    const correctLine = `${handleReply.answer}${handleReply.answerText ? ") " + handleReply.answerText : ""}`;

    if (userAnswer === handleReply.answer) {
      // ============ সঠিক উত্তর ============
      if (admin) {
        return api.sendMessage(
          {
            body:
              `╭──✦ 🎉 অভিনন্দন ✦──╮\n` +
              `│ 👤 ${name}\n` +
              `│ ✅ উত্তর সঠিক!\n` +
              `│ 👑 এডমিন কয়েন: ${getAdminCoins()}\n` +
              `╰──────────────────╯`,
            mentions: mention
          },
          threadID,
          messageID
        );
      }

      addCoins(senderID, REWARD);
      const newBal = getCoins(senderID);

      return api.sendMessage(
        {
          body:
            `╭──✦ 🎉 অভিনন্দন ✦──╮\n` +
            `│ 👤 ${name}\n` +
            `│ ✅ উত্তর সঠিক!\n` +
            `│ 💰 পেয়েছ: +${REWARD} কয়েন\n` +
            `│ 🏦 মোট ব্যালেন্স: ${newBal}\n` +
            `╰──────────────────╯`,
          mentions: mention
        },
        threadID,
        messageID
      );
    } else {
      // ============ ভুল উত্তর ============
      if (admin) {
        return api.sendMessage(
          {
            body:
              `╭──✦ ❌ দুঃখিত ✦──╮\n` +
              `│ 👤 ${name}\n` +
              `│ ❌ উত্তর ভুল!\n` +
              `│ ✅ সঠিক: ${correctLine}\n` +
              `│ 👑 এডমিন কয়েন: ${getAdminCoins()}\n` +
              `╰────────────────╯`,
            mentions: mention
          },
          threadID,
          messageID
        );
      }

      const before = getCoins(senderID);
      const deducted = Math.min(PENALTY, before); // ব্যালেন্সের বেশি কাটা হবে না
      setCoins(senderID, before - deducted);
      const newBal = getCoins(senderID);

      return api.sendMessage(
        {
          body:
            `╭──✦ ❌ দুঃখিত ✦──╮\n` +
            `│ 👤 ${name}\n` +
            `│ ❌ উত্তর ভুল!\n` +
            `│ ✅ সঠিক উত্তর: ${correctLine}\n` +
            `│ 💸 কাটা হলো: −${deducted} কয়েন\n` +
            `│ 🏦 ব্যালেন্স: ${newBal}\n` +
            `╰────────────────╯`,
          mentions: mention
        },
        threadID,
        messageID
      );
    }
  } catch (err) {
    console.error("handleReply error:", err);
  }
};
