const axios = require('axios');
const availableCmdsUrl = "https://raw.githubusercontent.com/Mostakim0978/D1PT0/refs/heads/main/availableCmds.json";
const cmdUrlsJson = "https://raw.githubusercontent.com/Mostakim0978/D1PT0/refs/heads/main/cmdUrls.json";
const ITEMS_PER_PAGE = 10;

// ===== Mathematical Monospace Font Converter =====
// FIX: এই ফন্টের অক্ষরগুলো surrogate pair (২ কোড-ইউনিট), তাই string[i] দিয়ে নিলে ভেঙে যায়।
// Array.from() ব্যবহার করলে প্রতিটা অক্ষর ঠিকভাবে আলাদা হয়।
const NORMAL = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
const BOLD = Array.from("𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿");

function toBold(text) {
  if (text === undefined || text === null) return "";
  return Array.from(text.toString()).map(ch => {
    const i = NORMAL.indexOf(ch);
    return i !== -1 ? BOLD[i] : ch;
  }).join("");
}

module.exports.config = {
  name: "cmdstore",
  aliases: ["cs", "cmds"],
  credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  hasPermssion: 3, // শুধু বট এডমিন
  version: "7.1",
  usePrefix: true,
  prefix: true,
  description: "Commands Store of Dipto",
  countDown: 3,
  commandCategory: "store",
  category: "store",
  usages: "[command name | single character | page number]"
};

module.exports.run = async function ({ api, event, args }) {
  const query = args.join(" ").trim().toLowerCase();
  try {
    const response = await axios.get(availableCmdsUrl);
    const cmds = response.data && response.data.cmdName;
    if (!Array.isArray(cmds)) throw new Error("Invalid cmdName data");

    let finalArray = cmds;
    let page = 1;

    if (query) {
      if (!isNaN(query)) {
        page = parseInt(query);
      } else if (query.length === 1) {
        finalArray = cmds.filter(c => String(c.cmd).toLowerCase().startsWith(query));
        if (finalArray.length === 0) {
          return api.sendMessage(
            `❌ | ${toBold("No commands found starting with")} "${toBold(query)}".`,
            event.threadID, undefined, event.messageID);
        }
      } else {
        finalArray = cmds.filter(c => String(c.cmd).toLowerCase().includes(query));
        if (finalArray.length === 0) {
          return api.sendMessage(
            `❌ | ${toBold("Command not found")}: "${toBold(query)}".`,
            event.threadID, undefined, event.messageID);
        }
      }
    }

    const totalPages = Math.ceil(finalArray.length / ITEMS_PER_PAGE);
    if (page < 1 || page > totalPages) {
      return api.sendMessage(
        `❌ | ${toBold("Invalid page number. Please enter a number between 1 and")} ${totalPages}.`,
        event.threadID, undefined, event.messageID);
    }

    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const cmdsToShow = finalArray.slice(startIndex, endIndex);
    const cmdName = module.exports.config.name;

    // ===== UI Design =====
    let msg = `╔══════════════════════╗\n`;
    msg += `   ✦ ${toBold("CMD STORE")} ✦\n`;
    msg += `╚══════════════════════╝\n`;
    msg += `┌──────────────────────┐\n`;
    msg += `│ 📄 ${toBold("Page")} : ${toBold(page)} / ${toBold(totalPages)}\n`;
    msg += `│ 📦 ${toBold("Total")} : ${toBold(finalArray.length)} ${toBold("commands")}\n`;
    msg += `│ 👑 ${toBold("Owner")} : ${toBold("MR JUWELL")}\n`;
    msg += `└──────────────────────┘\n\n`;

    cmdsToShow.forEach((cmd, index) => {
      const num = startIndex + index + 1;
      msg += `╭─❰ ${toBold(num)} ❱\n`;
      msg += `│ 🧩 ${toBold("Name")}   : ${toBold(cmd.cmd)}\n`;
      msg += `│ ✍️ ${toBold("Author")} : ${toBold(cmd.author || "N/A")}\n`;
      msg += `│ 🕒 ${toBold("Update")} : ${toBold(cmd.update || "N/A")}\n`;
      msg += `╰───────────────❍\n`;
    });

    msg += `\n┌──────────────────────┐\n`;
    msg += `│ 💡 ${toBold("Reply with a number")}\n`;
    msg += `│ ${toBold("to get the command URL")}\n`;
    if (page < totalPages) {
      msg += `│ ➡️ ${toBold("Next")} : ${toBold(cmdName)} ${toBold(page + 1)}\n`;
    }
    msg += `└──────────────────────┘\n`;
    msg += `⚡ ${toBold("Powered by MR JUWELL")} ⚡`;

    api.sendMessage(
      msg,
      event.threadID,
      (error, info) => {
        if (error || !info) return;
        global.client.handleReply.push({
          name: cmdName,
          type: "reply",
          messageID: info.messageID,
          author: event.senderID,
          cmdName: finalArray,
          page: page
        });
      },
      event.messageID
    );
  } catch (error) {
    console.error(error);
    api.sendMessage(
      `❌ | ${toBold("Failed to retrieve commands")}.`,
      event.threadID, undefined, event.messageID);
  }
};

module.exports.handleReply = async function ({ api, event, handleReply }) {
  if (handleReply.author != event.senderID) {
    return api.sendMessage(`🚫 ${toBold("Who are you")}? 🐸`, event.threadID, undefined, event.messageID);
  }
  const reply = parseInt(event.body);
  const startIndex = (handleReply.page - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const maxNum = Math.min(endIndex, handleReply.cmdName.length);

  if (isNaN(reply) || reply < startIndex + 1 || reply > maxNum) {
    return api.sendMessage(
      `❌ | ${toBold("Please reply with a number between")} ${startIndex + 1} ${toBold("and")} ${maxNum}.`,
      event.threadID, undefined, event.messageID);
  }
  try {
    const selected = handleReply.cmdName[reply - 1];
    const cmdName = selected.cmd;
    const status = selected.status;
    const response = await axios.get(cmdUrlsJson);
    const selectedCmdUrl = response.data[cmdName];
    if (!selectedCmdUrl) {
      return api.sendMessage(
        `❌ | ${toBold("Command URL not found")}.`,
        event.threadID, undefined, event.messageID);
    }
    api.unsendMessage(handleReply.messageID);

    // ===== URL UI =====
    let msg = `╔══════════════════════╗\n`;
    msg += `   ✦ ${toBold("COMMAND INFO")} ✦\n`;
    msg += `╚══════════════════════╝\n`;
    msg += `┌──────────────────────┐\n`;
    msg += `│ 🧩 ${toBold("Name")}   : ${toBold(cmdName)}\n`;
    msg += `│ 📌 ${toBold("Status")} : ${toBold(status || "N/A")}\n`;
    msg += `│ ✍️ ${toBold("Author")} : ${toBold("MR JUWELL")}\n`;
    msg += `└──────────────────────┘\n\n`;
    msg += `🔗 ${toBold("Command URL")}:\n${selectedCmdUrl}\n\n`;
    msg += `⚡ ${toBold("Powered by MR JUWELL")} ⚡`;

    api.sendMessage(msg, event.threadID, undefined, event.messageID);
  } catch (error) {
    console.error(error);
    api.sendMessage(
      `❌ | ${toBold("Failed to retrieve the command URL")}.`,
      event.threadID, undefined, event.messageID);
  }
};
