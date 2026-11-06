module.exports.config = {
  name: "setmrjuwel",
  version: "3.2.0",
  hasPermssion: 0,
  credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  description: "Set nickname (Mirai)",
  commandCategory: "Box Chat",
  usages: "",
  cooldowns: 5
};

const ORIGINAL_CREDIT = "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐";
const POWERED = "⚡ Powered By Juwel";

const NICKNAME = `⁽────⁽𝐌𝐑₎────₎
╔════ཐི༏ཋྀ════╗
━〲🅙𝐔🅦𝐄🅛⤸⃞🩷࿐`;

// ক্রেডিট পরিবর্তন করলে কমান্ড কাজ করবে না
function creditOk() {
  return module.exports.config.credits === ORIGINAL_CREDIT;
}

// config.json থেকে এডমিন লিস্ট পড়বে
function getBotAdmins() {
  const cfg = global.config || {};
  const list = [
    ...(cfg.ADMINBOT || []),
    ...(cfg.OPERATOR || []),
    ...(cfg.NDH || [])
  ];
  return list.map(String);
}

module.exports.onLoad = function () {
  if (!creditOk()) {
    console.log("❌ Credit changed! setmrjuwel command disabled.");
  }
};

module.exports.run = async function ({ api, event }) {
  const { threadID, messageID, senderID } = event;

  if (!creditOk()) {
    return api.sendMessage(
      "⚠️ ক্রেডিট পরিবর্তন করা হয়েছে, তাই কমান্ড বন্ধ!\n" + POWERED,
      threadID,
      messageID
    );
  }

  // শুধু config-এর বট এডমিন; গ্রুপ এডমিন হওয়া লাগবে না
  if (!getBotAdmins().includes(String(senderID))) {
    return api.sendMessage(
      "❌ শুধু বট এডমিন এই কমান্ড ব্যবহার করতে পারবে!\n" + POWERED,
      threadID,
      messageID
    );
  }

  try {
    await api.changeNickname(NICKNAME, threadID, senderID);

    return api.sendMessage(
`╭━━━〔 ✅ 𝗗𝗢𝗡𝗘 〕━━━╮
┃ Nickname Updated Successfully
╰━━━━━━━━━━━━━━━━╯
${POWERED}`,
      threadID,
      messageID
    );

  } catch (err) {
    console.log(err);
    return api.sendMessage(
`╭━━━〔 ❌ 𝗘𝗥𝗥𝗢𝗥 〕━━━╮
┃ Nickname Update Failed
╰━━━━━━━━━━━━━━━━╯
${POWERED}`,
      threadID,
      messageID
    );
  }
};
