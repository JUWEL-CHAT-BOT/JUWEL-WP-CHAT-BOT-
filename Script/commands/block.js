const fs = require("fs-extra");
const path = require("path");

const BLOCK_FILE = path.join(__dirname, "blockedUsers.json");

// =========================
// 💾 BACKUP SYSTEM
// =========================
if (fs.existsSync(BLOCK_FILE)) {
  const backupFile = path.join(__dirname, "blockedUsers_backup.json");

  if (!fs.existsSync(backupFile)) {
    try {
      fs.copySync(BLOCK_FILE, backupFile);
      console.log("💾 ব্যাকআপ সংরক্ষিত: blockedUsers_backup.json");
    } catch (err) {
      console.error("❌ ব্যাকআপ ব্যর্থ:", err.message);
    }
  }
}

// =========================
// GLOBAL DATA INIT
// =========================
if (!global.data) global.data = {};
if (!global.data.userBlocked) {
  global.data.userBlocked = new Map();
}

// =========================
// LOAD BLOCK DATA
// =========================
function loadBlock() {
  try {
    if (!fs.existsSync(BLOCK_FILE)) {
      fs.writeFileSync(BLOCK_FILE, JSON.stringify({}, null, 2));
      console.log("📄 নতুন blockedUsers.json তৈরি করা হয়েছে");
      return;
    }

    const data = JSON.parse(fs.readFileSync(BLOCK_FILE, "utf8"));

    global.data.userBlocked.clear();

    for (const id in data) {
      global.data.userBlocked.set(id, data[id]);
    }

    console.log(`✅ Block data loaded: ${global.data.userBlocked.size} জন`);
  } catch (error) {
    console.error("❌ Block data load error:", error);
    fs.writeFileSync(BLOCK_FILE, JSON.stringify({}, null, 2));
  }
}

// =========================
// SAVE BLOCK DATA
// =========================
function saveBlock() {
  try {
    const obj = Object.fromEntries(global.data.userBlocked);
    fs.writeFileSync(BLOCK_FILE, JSON.stringify(obj, null, 2));
    console.log(`💾 Block data saved: ${Object.keys(obj).length} জন`);
  } catch (error) {
    console.error("❌ Block data save error:", error);
  }
}

// =========================
// HELPERS
// =========================

// Messenger থেকে আসল block / unblock
function messengerBlock(api, userID, shouldBlock) {
  return new Promise((resolve) => {
    if (typeof api.changeBlockedStatus !== "function") {
      return resolve({
        ok: false,
        error: "আপনার fca ভার্সনে changeBlockedStatus নেই"
      });
    }
    try {
      api.changeBlockedStatus(userID, shouldBlock, (err) => {
        if (err) {
          return resolve({
            ok: false,
            error: err.error || err.message || String(err)
          });
        }
        resolve({ ok: true });
      });
    } catch (e) {
      resolve({ ok: false, error: e.message });
    }
  });
}

// ইউজারের নাম আনা
function getUserName(api, uid) {
  return new Promise((resolve) => {
    try {
      api.getUserInfo(uid, (err, info) => {
        if (err || !info || !info[uid]) return resolve("অজানা");
        resolve(info[uid].name || "অজানা");
      });
    } catch (e) {
      resolve("অজানা");
    }
  });
}

function isAdmin(uid) {
  return (
    global.config &&
    Array.isArray(global.config.ADMINBOT) &&
    global.config.ADMINBOT.includes(String(uid))
  );
}

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleString("bn-BD", {
      timeZone: "Asia/Dhaka"
    });
  } catch (e) {
    return String(ts);
  }
}

// =========================
// INITIAL LOAD
// =========================
loadBlock();

// =========================
// CONFIG
// =========================
module.exports.config = {
  name: "block",
  version: "2.0.0",
  hasPermssion: 2,
  credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  description: "Block users from Messenger and from using the bot",
  commandCategory: "admin",
  usages: "block @user | block UID | unblock UID | block list",
  cooldowns: 3
};

// =========================
// HANDLE EVENT
// =========================
module.exports.handleEvent = async ({ event, api }) => {
  try {
    const senderID = event.senderID;
    if (!senderID) return;

    // Admin protection
    if (isAdmin(senderID)) return;

    // Blocked হলে কিছুই করবে না (ignore)
    if (!global.data.userBlocked.has(String(senderID))) return;

    return;
  } catch (error) {
    console.error("❌ Block handleEvent error:", error);
  }
};

// =========================
// COMMAND
// =========================
module.exports.run = async ({ event, api, args }) => {
  const { threadID, messageID, messageReply, mentions, senderID } = event;
  const send = (msg) => api.sendMessage(msg, threadID, messageID);

  try {
    // কমান্ডের নাম বের করা (prefix বাদ দিয়ে)
    const fullMsg = (event.body || "").trim();
    const prefix = (global.config && global.config.PREFIX) || "/";
    let cmd = fullMsg.split(/\s+/)[0].toLowerCase();
    if (cmd.startsWith(prefix.toLowerCase())) {
      cmd = cmd.slice(prefix.length);
    }
    cmd = cmd.replace(/^\/+/, "");

    // =========================
    // LIST
    // =========================
    if (
      cmd === "blocklist" ||
      (cmd === "block" && (args[0] || "").toLowerCase() === "list")
    ) {
      if (global.data.userBlocked.size === 0) {
        return send("📭 কোনো ইউজার Block করা নেই।");
      }

      let msg = `╔══════ BLOCK LIST ══════╗\n\n`;
      let i = 1;
      for (const [uid, d] of global.data.userBlocked) {
        msg += `${i++}. 👤 ${d.userName || "অজানা"}\n`;
        msg += `   🆔 ${uid}\n`;
        msg += `   🕒 ${d.time ? formatTime(d.time) : "অজানা"}\n\n`;
      }
      msg += `📊 মোট: ${global.data.userBlocked.size} জন\n╚════════════════════╝`;
      return send(msg);
    }

    // =========================
    // TARGET ID
    // =========================
    let targetID = null;
    let mentionName = null;

    if (messageReply) {
      targetID = messageReply.senderID;
    } else if (mentions && Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
      mentionName = String(mentions[targetID] || "").replace("@", "");
    } else if (args.length > 0) {
      targetID = args[0];
    }

    // =========================
    // UNBLOCK
    // =========================
    if (cmd === "unblock") {
      if (!targetID) {
        return send(
          `╔════ UNBLOCK ════╗

⚠️ ইউজার নির্বাচন করুন।

📌 ব্যবহার:
➜ unblock @user
➜ unblock UID
➜ মেসেজে Reply করে unblock

╚═════════════════╝`
        );
      }

      targetID = String(targetID);

      if (!/^\d+$/.test(targetID)) {
        return send("❌ সঠিক UID দিন!");
      }

      const oldData = global.data.userBlocked.get(targetID);

      // Messenger থেকে unblock (লিস্টে না থাকলেও চেষ্টা করবে)
      const result = await messengerBlock(api, targetID, false);

      if (oldData) {
        global.data.userBlocked.delete(targetID);
        if (global.data.userBanned) global.data.userBanned.delete(targetID);
        saveBlock();
      }

      if (!oldData && !result.ok) {
        return send("⚠️ এই ইউজার Block লিস্টে নেই।");
      }

      return send(
        `╔════ UNBLOCK ════╗

✅ ইউজার Unblock করা হয়েছে!

👤 নাম: ${(oldData && oldData.userName) || "অজানা"}
🆔 UID: ${targetID}
${
  result.ok
    ? "📨 Messenger: Unblock সম্পন্ন"
    : `⚠️ Messenger: Unblock হয়নি (${result.error})`
}

╚═════════════════╝`
      );
    }

    // =========================
    // BLOCK
    // =========================
    if (cmd === "block") {
      if (!targetID) {
        return send(
          `╔══════ BLOCK ══════╗

⚠️ ইউজার নির্বাচন করুন।

📌 ব্যবহার:

➜ block @user
➜ block UID
➜ কোনো মেসেজে Reply করে block
➜ block list (তালিকা দেখতে)
➜ unblock UID

╚══════════════════╝`
        );
      }

      targetID = String(targetID);

      if (!/^\d+$/.test(targetID)) {
        return send("❌ সঠিক UID দিন!");
      }

      // নিজেকে বা বটকে block করা যাবে না
      const botID = api.getCurrentUserID ? String(api.getCurrentUserID()) : null;
      if (targetID === String(senderID)) {
        return send("❌ নিজেকে Block করা যাবে না!");
      }
      if (botID && targetID === botID) {
        return send("❌ বট নিজেকে Block করতে পারবে না!");
      }

      // Admin protection
      if (isAdmin(targetID)) {
        return send("❌ Admin কে Block করা যাবে না!");
      }

      // Already blocked
      if (global.data.userBlocked.has(targetID)) {
        const oldData = global.data.userBlocked.get(targetID);

        return send(
          `╔════ BLOCK ════╗

⚠️ এই ইউজার ইতিমধ্যে Block করা আছে!

👤 নাম: ${oldData.userName || "অজানা"}

🆔 UID: ${targetID}

👮 Block করেছেন:
${oldData.by || "অজানা"}

🕒 সময়:
${oldData.time ? formatTime(oldData.time) : "অজানা"}

╚═══════════════╝`
        );
      }

      // নাম সংগ্রহ
      const userName = mentionName || (await getUserName(api, targetID));
      const adminName = await getUserName(api, String(senderID));

      // 1) Messenger থেকে আসল Block
      const result = await messengerBlock(api, targetID, true);

      // 2) বটের লিস্টে যুক্ত
      global.data.userBlocked.set(targetID, {
        userName,
        by: adminName,
        byID: String(senderID),
        time: Date.now(),
        messengerBlocked: result.ok
      });

      // 3) বট যাতে কমান্ড না চালায়
      if (!global.data.userBanned) global.data.userBanned = new Map();
      global.data.userBanned.set(targetID, {
        reason: "blocked",
        dateAdded: Date.now()
      });

      saveBlock();

      return send(
        `╔════ BLOCK ════╗

✅ ইউজার Block করা হয়েছে!

👤 নাম: ${userName}
🆔 UID: ${targetID}
👮 Block করেছেন: ${adminName}

${
  result.ok
    ? "📨 Messenger: Block সম্পন্ন ✅"
    : `⚠️ Messenger: Block হয়নি ❌\n📝 কারণ: ${result.error}\n(বটের লিস্টে যুক্ত হয়েছে, বট তাকে ignore করবে)`
}

╚═══════════════╝`
      );
    }
  } catch (error) {
    console.error("❌ Block run error:", error);
    return api.sendMessage(
      "❌ কমান্ড চালাতে সমস্যা হয়েছে!",
      threadID,
      messageID
    );
  }
};
