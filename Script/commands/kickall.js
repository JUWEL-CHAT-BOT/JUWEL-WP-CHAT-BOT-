module.exports.config = {
  name: "kickall",
  version: "2.1.0",
  hasPermssion: 0,
  credits: "MR JUWEL",
  description: "Remove all group members (Only Bot Admin/Owner)",
  commandCategory: "box chat",
  usages: "",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {

  // 🔒 Load owner/admin list from config.json (no hardcoded UID)
  const fs = require("fs-extra");
  const path = require("path");

  let configPath = path.join(__dirname, "..", "..", "config.json");
  if (!fs.existsSync(configPath)) {
    configPath = path.join(__dirname, "..", "..", "config", "config.json");
  }

  let configData = {};
  try {
    configData = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch (e) {
    return api.sendMessage("❌ config.json পড়া যাচ্ছে না!", event.threadID, event.messageID);
  }

  // Merge possible owner keys used by different bot frameworks
  const ownerList = [
    ...(configData.ownerID || []),
    ...(configData.ADMINBOT || []),
    ...(configData.superAdmin || []),
    ...(configData.adminBot || [])
  ].map(String);

  // ❌ Block non-owners
  if (!ownerList.includes(String(event.senderID))) {
    return api.sendMessage(
      "❌ তুমি এই কমান্ড ব্যবহার করতে পারবে না!\n(শুধু বট Owner/Admin পারবে)",
      event.threadID,
      event.messageID
    );
  }

  try {
    const threadInfo = await api.getThreadInfo(event.threadID);
    const botID = api.getCurrentUserID();

    // ✅ Check bot is admin
    if (!threadInfo.adminIDs.some(item => item.id == botID)) {
      return api.sendMessage("❌ বটকে আগে গ্রুপ এডমিন বানাও!", event.threadID);
    }

    // 👥 Get all members
    const allUsers = threadInfo.participantIDs;

    // ❌ Exclude bot + all owners/admins from config
    const kickList = allUsers.filter(
      uid => uid != botID && !ownerList.includes(String(uid))
    );

    if (kickList.length === 0) {
      return api.sendMessage("ℹ️ কিক করার মতো কোনো মেম্বার নেই!", event.threadID);
    }

    api.sendMessage(
      `🚨 ${kickList.length} জন মেম্বার কিক করা শুরু হচ্ছে...`,
      event.threadID
    );

    for (const id of kickList) {
      try {
        await new Promise(resolve => setTimeout(resolve, 800));
        await api.removeUserFromGroup(id, event.threadID);
      } catch (e) {
        // ignore individual errors
      }
    }

    api.sendMessage("✅ সব মেম্বার কিক সম্পন্ন!", event.threadID);

  } catch (err) {
    console.error(err);
    api.sendMessage("❌ কোনো সমস্যা হয়েছে!", event.threadID);
  }
};
