const fs = require('fs');
const request = require("request");
const path = require("path");

module.exports.config = {
  name: "noti2",
  version: "3.0.0",
  hasPermssion: 2,
  credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  description: "Admin broadcast with premium Royal Gold UI",
  commandCategory: "sandnoto",
  usages: "[msg] | stats | block @user | unblock @user | delete",
  cooldowns: 5
};

// ---------- 👑 ADMIN INFO (এখানে পরিবর্তন করুন) ----------
const ADMIN_INFO = {
  name: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  fbLink: "fb.com/mrjuwel444",
  messengerLink: "m.me/mrjuwel444"
};

// ---------- 𝙵𝙾𝙽𝚃 𝙲𝙾𝙽𝚅𝙴𝚁𝚃𝙴𝚁 ----------
const toFont = (text) => {
  const map = {
    'A':'𝙰','B':'𝙱','C':'𝙲','D':'𝙳','E':'𝙴','F':'𝙵','G':'𝙶','H':'𝙷','I':'𝙸','J':'𝙹',
    'K':'𝙺','L':'𝙻','M':'𝙼','N':'𝙽','O':'𝙾','P':'𝙿','Q':'𝚀','R':'𝚁','S':'𝚂','T':'𝚃',
    'U':'𝚄','V':'𝚅','W':'𝚆','X':'𝚇','Y':'𝚈','Z':'𝚉',
    'a':'𝚊','b':'𝚋','c':'𝚌','d':'𝚍','e':'𝚎','f':'𝚏','g':'𝚐','h':'𝚑','i':'𝚒','j':'𝚓',
    'k':'𝚔','l':'𝚕','m':'𝚖','n':'𝚗','o':'𝚘','p':'𝚙','q':'𝚚','r':'𝚛','s':'𝚜','t':'𝚝',
    'u':'𝚞','v':'𝚟','w':'𝚠','x':'𝚡','y':'𝚢','z':'𝚣',
    '0':'𝟶','1':'𝟷','2':'𝟸','3':'𝟹','4':'𝟺','5':'𝟻','6':'𝟼','7':'𝟽','8':'𝟾','9':'𝟿'
  };
  return text.split('').map(c => map[c] || c).join('');
};

// ---------- 🎨 ROYAL GOLD UI ----------
const UI = {
  top:    "╔══════════════════╗\n   👑 𝐀𝐃𝐌𝐈𝐍 𝐍𝐎𝐓𝐈𝐂𝐄 👑\n╚══════════════════╝",
  mid:    "┏━━━━━━━━━━━━━━━━━┓\n   💬 𝙼𝙴𝚂𝚂𝙰𝙶𝙴\n┗━━━━━━━━━━━━━━━━━┛",
  line:   "━━━━━━━━━━━━━━━━━━━"
};

// ---------- 👑 ADMIN CONTACT BLOCK ----------
const adminContactBlock =
  "👑 " + toFont("Admin") + "   : " + ADMIN_INFO.name + "\n" +
  "📘 " + toFont("Facebook") + " : " + ADMIN_INFO.fbLink + "\n" +
  "💬 " + toFont("Messenger") + ": " + ADMIN_INFO.messengerLink;

// ---------- PATHS ----------
const CACHE_DIR     = path.join(__dirname, "cache");
const STATS_FILE    = path.join(CACHE_DIR, "noti_stats.json");
const BLOCKED_FILE  = path.join(CACHE_DIR, "noti_blocked.json");
const SENT_FILE     = path.join(CACHE_DIR, "sent_messages.json");

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

// ---------- DB HELPERS ----------
const loadJSON = (file, def) => {
  try {
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(def, null, 2));
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch { return def; }
};
const saveJSON = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

let stats        = loadJSON(STATS_FILE, { total: 0, replies: 0, users: {}, perGroup: {} });
let blocked      = loadJSON(BLOCKED_FILE, []);
let sentMessages = loadJSON(SENT_FILE, []);

let atmDir = [];

// ---------- ATTACHMENT DOWNLOADER ----------
const getAtm = (attachments, body) => new Promise(async (resolve) => {
  const messageData = { body };
  const streams = [];

  for (const att of attachments) {
    await new Promise(async (done) => {
      try {
        const res = await request.get(att.url);
        const pathname = res.uri.pathname;
        const ext = pathname.substring(pathname.lastIndexOf('.') + 1);
        const filePath = path.join(CACHE_DIR, att.filename + "." + ext);

        res.pipe(fs.createWriteStream(filePath)).on("close", () => {
          streams.push(fs.createReadStream(filePath));
          atmDir.push(filePath);
          done();
        });
      } catch (err) {
        console.log("getAtm error:", err);
        done();
      }
    });
  }
  messageData.attachment = streams;
  resolve(messageData);
});

// ---------- 🎙️ VOICE ----------
const getVoice = (url, filename = `voice_${Date.now()}.mp3`) =>
  new Promise(async (resolve) => {
    try {
      const filePath = path.join(CACHE_DIR, filename);
      const res = await request.get(url);
      res.pipe(fs.createWriteStream(filePath)).on("close", () => {
        atmDir.push(filePath);
        resolve(fs.createReadStream(filePath));
      });
    } catch (e) {
      console.log("getVoice error:", e);
      resolve(null);
    }
  });

// ---------- REPLY HANDLER ----------
module.exports.handleReply = async function ({
  api, event, handleReply, Users, Threads
}) {
  const { threadID, messageID, senderID, body } = event;

  if (senderID == api.getCurrentUserID()) return;
  if (blocked.includes(senderID)) return;

  const senderName = await Users.getNameUser(senderID);

  switch (handleReply.type) {

    // ==== ইউজার → অ্যাডমিন ====
    case "sendnoti": {
      let groupName = "Unknow";
      try {
        const info = await Threads.getInfo(threadID);
        groupName = info.threadName || "Unknow";
      } catch {}

      const caption =
        "╔══════════════════╗\n" +
        "   💬 𝚄𝚂𝙴𝚁 𝚁𝙴𝙿𝙻𝚈 💬\n" +
        "╚══════════════════╝\n\n" +
        "👤 " + toFont("Name") + "  : " + senderName + "\n" +
        "📌 " + toFont("Group") + " : " + groupName + "\n\n" +
        "┏━━━━━━━━━━━━━━━━━┓\n" +
        "   💬 𝚁𝙴𝙿𝙻𝚈\n" +
        "┗━━━━━━━━━━━━━━━━━┛\n\n" +
        body + "\n\n" +
        UI.line;

      let sendData = caption;

      const voiceAtt = event.attachments?.find(a =>
        a.type === "audio" || a.type === "voice" || (a.url && a.url.includes(".mp3"))
      );

      if (voiceAtt) {
        const voiceStream = await getVoice(voiceAtt.url);
        if (voiceStream) {
          api.sendMessage(
            { body: caption, attachment: voiceStream },
            handleReply.threadID,
            (err, info) => {
              cleanupAtm();
              if (err) return console.log(err);
              registerReply(info, "reply", threadID);
            },
            messageID
          );
          break;
        }
      }

      if (event.attachments?.length > 0) {
        sendData = await getAtm(event.attachments, caption);
      }

      api.sendMessage(sendData, handleReply.threadID, (err, info) => {
        cleanupAtm();
        if (err) return console.log(err);

        api.setMessageReaction("✅", info.messageID, () => {}, true);

        stats.replies++;
        stats.users[senderID] = (stats.users[senderID] || 0) + 1;
        stats.perGroup[threadID] = (stats.perGroup[threadID] || 0) + 1;
        saveJSON(STATS_FILE, stats);

        registerReply(info, "reply", threadID);
      }, messageID);

      break;
    }

    // ==== অ্যাডমিন → ইউজার ====
    case "reply": {
      const userCaption =
        UI.top + "\n\n" +
        adminContactBlock + "\n\n" +
        UI.mid + "\n\n" +
        body + "\n\n" +
        UI.line;

      let sendData = userCaption;

      if (event.attachments?.length > 0) {
        sendData = await getAtm(event.attachments, userCaption);
      }

      api.sendMessage(sendData, handleReply.threadID, (err, info) => {
        cleanupAtm();
        if (err) return console.log(err);

        api.setMessageReaction("✅", info.messageID, () => {}, true);
        registerReply(info, "sendnoti", handleReply.threadID);
      }, messageID);

      break;
    }
  }
};

// ---------- HELPERS ----------
function cleanupAtm() {
  atmDir.forEach(f => { try { fs.unlinkSync(f); } catch {} });
  atmDir = [];
}

function registerReply(info, type, threadID) {
  global.client.handleReply.push({
    name: "noti2",
    type,
    messageID: info.messageID,
    threadID
  });

  sentMessages.push({
    messageID: info.messageID,
    threadID,
    time: Date.now(),
    type
  });
  if (sentMessages.length > 500) sentMessages = sentMessages.slice(-500);
  saveJSON(SENT_FILE, sentMessages);
}

// ---------- ADMIN SUB-COMMANDS ----------
async function handleAdminCommand(api, event, args, Users) {
  const { threadID } = event;
  const sub = args[0].toLowerCase();

  // 📊 STATS
  if (sub === "stats") {
    const topUsers = Object.entries(stats.users)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([uid, cnt], i) => {
        const medal = ["🥇","🥈","🥉","4️⃣","5️⃣"][i] || `${i+1}.`;
        return `${medal} ${uid} → ${cnt}`;
      }).join("\n") || "None yet";

    return api.sendMessage(
      "╔══════════════════╗\n" +
      "   📊 𝙽𝙾𝚃𝙸 𝚂𝚃𝙰𝚃𝚂 📊\n" +
      "╚══════════════════╝\n\n" +
      "📨 " + toFont("Total Notices") + " : " + stats.total + "\n" +
      "💬 " + toFont("Total Replies") + " : " + stats.replies + "\n" +
      "👥 " + toFont("Unique Users") + "  : " + Object.keys(stats.users).length + "\n" +
      "🚫 " + toFont("Blocked Users") + " : " + blocked.length + "\n\n" +
      "┏━━━━━━━━━━━━━━━━━┓\n" +
      "   🏆 𝚃𝙾𝙿 𝚁𝙴𝙿𝙻𝙸𝙴𝚁𝚂\n" +
      "┗━━━━━━━━━━━━━━━━━┛\n\n" +
      topUsers + "\n\n" +
      UI.line,
      threadID
    );
  }

  // 🚫 BLOCK
  if (sub === "block") {
    const target = event.mentions && Object.keys(event.mentions)[0];
    if (!target) return api.sendMessage("❌ " + toFont("Mention someone to block"), threadID);
    if (!blocked.includes(target)) blocked.push(target);
    saveJSON(BLOCKED_FILE, blocked);
    return api.sendMessage("🚫 " + toFont("Blocked") + " : " + target, threadID);
  }

  // ✅ UNBLOCK
  if (sub === "unblock") {
    const target = event.mentions && Object.keys(event.mentions)[0];
    if (!target) return api.sendMessage("❌ " + toFont("Mention someone to unblock"), threadID);
    blocked = blocked.filter(u => u !== target);
    saveJSON(BLOCKED_FILE, blocked);
    return api.sendMessage("✅ " + toFont("Unblocked") + " : " + target, threadID);
  }

  // 📋 BLOCKLIST
  if (sub === "blocklist") {
    if (!blocked.length) return api.sendMessage("✅ " + toFont("No blocked users"), threadID);
    const list = [];
    for (const uid of blocked) {
      let name = uid;
      try { name = await Users.getNameUser(uid); } catch {}
      list.push("• " + name);
    }
    return api.sendMessage(
      "🚫 " + toFont("BLOCKED USERS") + "\n" + list.join("\n"),
      threadID
    );
  }

  // 🗑️ DELETE last sent
  if (sub === "delete" || sub === "unsend") {
    if (!sentMessages.length) return api.sendMessage("❌ " + toFont("Nothing to delete"), threadID);
    const last = sentMessages.pop();
    saveJSON(SENT_FILE, sentMessages);
    api.unsendMessage(last.messageID, (err) => {
      if (err) return api.sendMessage("❌ " + toFont("Failed to unsend"), threadID);
      api.sendMessage("🗑️ " + toFont("Last message unsent"), threadID);
    });
    return;
  }

  // 🧹 CLEAR STATS
  if (sub === "clearstats") {
    stats = { total: 0, replies: 0, users: {}, perGroup: {} };
    saveJSON(STATS_FILE, stats);
    return api.sendMessage("🧹 " + toFont("Stats cleared"), threadID);
  }

  return false;
}

// ---------- MAIN RUN ----------
module.exports.run = async function ({ api, event, args, Users }) {
  const { threadID, messageID, senderID, messageReply } = event;

  if (!args[0]) return api.sendMessage("Please input message", threadID);

  const subResult = await handleAdminCommand(api, event, args, Users);
  if (subResult !== false) return;

  let allThreads = (global.data.allThreadID || [])
    .filter(t => !blocked.includes(t))
    .filter(t => t && typeof t === "string" && t.length > 5);

  if (allThreads.length === 0) {
    return api.sendMessage("❌ No valid thread found", threadID);
  }

  let successCount = 0;
  let failCount = 0;
  const failedThreads = [];

  const text = args.join(" ");

  // ✅ ROYAL GOLD UI
  let plainMsg =
    UI.top + "\n\n" +
    adminContactBlock + "\n\n" +
    UI.mid + "\n\n" +
    text + "\n\n" +
    UI.line;

  let sendData = plainMsg;

  // 🎙️ Voice reply
  if (event.type === "message_reply" && messageReply) {
    const voiceAtt = messageReply.attachments?.find(a =>
      a.type === "audio" || a.type === "voice" || (a.url && a.url.includes(".mp3"))
    );

    if (voiceAtt) {
      const voiceStream = await getVoice(voiceAtt.url);
      if (voiceStream) {
        sendData = {
          body: UI.top + "\n\n" +
                adminContactBlock + "\n\n" +
                "┏━━━━━━━━━━━━━━━━━┓\n" +
                "   🎙️ 𝚅𝙾𝙸𝙲𝙴 𝙵𝚁𝙾𝙼 𝙰𝙳𝙼𝙸𝙽\n" +
                "┗━━━━━━━━━━━━━━━━━┛\n\n" +
                text + "\n\n" +
                UI.line,
          attachment: voiceStream
        };
      }
    } else if (messageReply.attachments?.length > 0) {
      sendData = await getAtm(
        messageReply.attachments,
        UI.top + "\n\n" +
        adminContactBlock + "\n\n" +
        UI.mid + "\n\n" +
        text + "\n\n" +
        UI.line
      );
    }
  }

  await new Promise(async (resolve) => {
    const total = allThreads.length;
    let done = 0;

    const sendToThread = (tid) => {
      return new Promise((res) => {
        try {
          api.sendMessage(sendData, tid, (err, info) => {
            if (err) {
              failCount++;
              failedThreads.push({
                tid,
                error: err.error || err.message || JSON.stringify(err)
              });
              console.log(`❌ [${done+1}/${total}] Failed → ${tid} :`, err.error || err);
            } else {
              successCount++;
              registerReply(info, "sendnoti", threadID);
              console.log(`✅ [${done+1}/${total}] Sent → ${tid}`);
            }
            done++;
            setTimeout(res, 2000);
          });
        } catch (e) {
          failCount++;
          failedThreads.push({ tid, error: e.message });
          done++;
          setTimeout(res, 1000);
        }
      });
    };

    for (const tid of allThreads) {
      await sendToThread(tid);
    }

    cleanupAtm();
    resolve();
  });

  stats.total += successCount;
  saveJSON(STATS_FILE, stats);

  let report =
    "✅ " + toFont("Sent") + " : " + successCount +
    " | ❌ " + toFont("Failed") + " : " + failCount;

  if (failedThreads.length > 0) {
    report += "\n\n❌ " + toFont("Failed Reasons") + ":\n";
    const shown = failedThreads.slice(0, 5);
    for (const f of shown) {
      report += `• ${f.tid} → ${String(f.error).substring(0, 60)}\n`;
    }
    if (failedThreads.length > 5) {
      report += `...and ${failedThreads.length - 5} more`;
    }
  }

  return api.sendMessage(report, threadID);
};
