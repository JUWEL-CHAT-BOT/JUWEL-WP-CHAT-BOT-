const chalk = require("chalk");
const fs = require("fs");

const logFile = __dirname + "/joinHistory.json";
if (!fs.existsSync(logFile)) fs.writeFileSync(logFile, "[]");

function saveLog(data) {
  fs.writeFileSync(logFile, JSON.stringify(data, null, 2));
}

function addLog(entry) {
  let data = JSON.parse(fs.readFileSync(logFile));
  data.push(entry);
  saveLog(data);
}

// config.json থেকে অ্যাডমিন লিস্ট পড়ে (ADMINBOT)
function getAdmins() {
  const list = (global.config && global.config.ADMINBOT) || [];
  return list.map(String);
}

function isAdmin(uid) {
  return getAdmins().includes(String(uid));
}

module.exports.config = {
  name: "join",
  version: "6.1.0",
  hasPermssion: 2,
  credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  description: "JOIN GROUPS WHERE BOT IS BUT YOU ARE NOT",
  commandCategory: "system",
  cooldowns: 5
};

let autoMode = false;

module.exports.onLoad = () => {
  console.log(chalk.hex("#00ff99")("🚀 JOIN SYSTEM LOADED"));
};

// ---------------- HANDLE REPLY ----------------
module.exports.handleReply = async function ({ api, event, handleReply }) {
  const { threadID, senderID, body } = event;
  const { ID, author } = handleReply;

  if (senderID != author) return;
  if (!isAdmin(senderID)) return;

  const input = (body || "").trim().toLowerCase();
  let selected = [];

  if (input === "add all") {
    selected = ID.map((_, i) => i);
  } else {
    selected = input.split(/\s+/)
      .map(x => parseInt(x) - 1)
      .filter(i => !isNaN(i) && i >= 0 && i < ID.length);
  }

  if (selected.length === 0)
    return api.sendMessage("❌ Invalid input", threadID);

  let result = {
    added: 0,
    already: 0,
    failed: 0,
    retry: 0,
    details: []
  };

  for (const i of selected) {
    const tid = ID[i];
    let groupName = "Unknown Group";

    try {
      try {
        const info = await api.getThreadInfo(tid);
        groupName = info.name || groupName;

        // যে অ্যাডমিন reply করেছে সে already আছে কিনা
        if (info.participantIDs && info.participantIDs.map(String).includes(String(senderID))) {
          result.already++;
          result.details.push(`⚠️ Already You Joined → ${groupName}`);
          addLog({
            user: senderID,
            threadID: tid,
            name: groupName,
            status: "Already You Joined",
            time: new Date().toISOString()
          });
          continue;
        }
      } catch {}

      // যে অ্যাডমিন কমান্ড দিয়েছে তাকেই গ্রুপে add করা
      let success = false;
      let lastError = "";

      for (let r = 0; r < 3; r++) {
        try {
          await api.addUserToGroup(senderID, tid);
          success = true;
          result.retry += r;
          break;
        } catch (err) {
          lastError = (err?.error || err?.message || JSON.stringify(err) || "").toLowerCase();

          if (lastError.includes("already") || lastError.includes("exists")) {
            success = true;
            break;
          }
          await new Promise(res => setTimeout(res, 800));
        }
      }

      if (success) {
        result.added++;
        result.details.push(`✅ You Joined → ${groupName}`);
        addLog({
          user: senderID,
          threadID: tid,
          name: groupName,
          status: "You Joined",
          time: new Date().toISOString()
        });
      } else {
        result.failed++;
        result.details.push(`❌ Failed → ${groupName} (${lastError.slice(0, 40)})`);
        addLog({
          user: senderID,
          threadID: tid,
          name: groupName,
          status: "Failed",
          time: new Date().toISOString()
        });
      }

    } catch (e) {
      result.failed++;
      result.details.push(`❌ Error → ${groupName}`);
    }
  }

  return api.sendMessage(
`╔══════════════════════╗
║ ⚡ JOIN REPORT
╠══════════════════════╣
║ ✅ Added   : ${result.added}
║ ⚠️ Already : ${result.already}
║ ❌ Failed  : ${result.failed}
║ 🔄 Retry   : ${result.retry}
╚══════════════════════╝

📌 DETAILS:
${result.details.join("\n") || "No Data"}`,
    threadID
  );
};

// ---------------- MAIN ----------------
module.exports.run = async function ({ api, event }) {
  const { threadID, senderID, messageID } = event;

  // config.json এর ADMINBOT চেক
  if (!isAdmin(senderID))
    return api.sendMessage("⚠️ Only Admin can use this command", threadID, messageID);

  const botID = String(api.getCurrentUserID());

  let inbox = await api.getThreadList(200, null, ["INBOX"]);

  // ফিল্টার: bot আছে, কিন্তু কমান্ড দেওয়া অ্যাডমিন নেই
  let groups = inbox.filter(t =>
    t.isGroup &&
    t.threadID &&
    t.name &&
    t.participantIDs &&
    t.participantIDs.map(String).includes(botID) &&
    !t.participantIDs.map(String).includes(String(senderID))
  );

  if (groups.length === 0)
    return api.sendMessage(
      "⚠️ এমন কোনো গ্রুপ পাওয়া যায়নি যেখানে bot আছে কিন্তু আপনি নেই",
      threadID
    );

  let msg = `╔══════════════════════╗
║ ⚡ GROUPS (Bot In, You Not)
╚══════════════════════╝\n\n`;

  const ID = [];
  groups.forEach((t, i) => {
    msg += `┃ ${i + 1}. ${t.name}\n`;
    ID.push(t.threadID);
  });

  msg += `\n╔══════════════════════╗
║ ✏️ Reply: 1 2 3 / add all
║ 🔒 ADMIN ONLY MODE
╚══════════════════════╝`;

  return api.sendMessage(msg, threadID, (err, info) => {
    if (!err) {
      global.client.handleReply.push({
        name: module.exports.config.name,
        author: senderID,
        messageID: info.messageID,
        ID
      });
    }
  }, messageID);
};

// ---------------- AUTO MODE ----------------
module.exports.handleEvent = async function ({ api, event }) {
  if (!isAdmin(event.senderID)) return;

  const body = (event.body || "").toLowerCase();

  if (body === "auto on") {
    autoMode = true;
    return api.sendMessage("🟢 AUTO MODE ON", event.threadID);
  }

  if (body === "auto off") {
    autoMode = false;
    return api.sendMessage("🔴 AUTO MODE OFF", event.threadID);
  }
};
