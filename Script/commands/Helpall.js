const fs = require("fs-extra");
const request = require("request");
const path = require("path");

module.exports.config = {
  name: "help2",
  version: "5.0.0",
  hasPermssion: 0,
  credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  description: "Shows all commands list with edit-on-reply pagination",
  commandCategory: "system",
  usages: "[page number]",
  cooldowns: 5,
  envConfig: {
    autoUnsend: true,
    delayUnsend: 20
  }
};

// 🔠 Mathematical Bold Font Converter
function toBold(text) {
  const boldMap = {
    'A': '𝙰', 'B': '𝙱', 'C': '𝙲', 'D': '𝙳', 'E': '𝙴', 'F': '𝙵', 'G': '𝙶',
    'H': '𝙷', 'I': '𝙸', 'J': '𝙹', 'K': '𝙺', 'L': '𝙻', 'M': '𝙼', 'N': '𝙽',
    'O': '𝙾', 'P': '𝙿', 'Q': '𝚀', 'R': '𝚁', 'S': '𝚂', 'T': '𝚃', 'U': '𝚄',
    'V': '𝚅', 'W': '𝚆', 'X': '𝚇', 'Y': '𝚈', 'Z': '𝚉',
    'a': '𝚊', 'b': '𝚋', 'c': '𝚌', 'd': '𝚍', 'e': '𝚎', 'f': '𝚏', 'g': '𝚐',
    'h': '𝚑', 'i': '𝚒', 'j': '𝚓', 'k': '𝚔', 'l': '𝚕', 'm': '𝚖', 'n': '𝚗',
    'o': '𝚘', 'p': '𝚙', 'q': '𝚚', 'r': '𝚛', 's': '𝚜', 't': '𝚝', 'u': '𝚞',
    'v': '𝚟', 'w': '𝚠', 'x': '𝚡', 'y': '𝚢', 'z': '𝚣',
    '0': '𝟶', '1': '𝟷', '2': '𝟸', '3': '𝟹', '4': '𝟺',
    '5': '𝟻', '6': '𝟼', '7': '𝟽', '8': '𝟾', '9': '𝟿'
  };
  return String(text).split('').map(ch => boldMap[ch] || ch).join('');
}

// 🎯 Prefix বের করার ফাংশন
function getPrefix(threadID) {
  const threadSetting = global.data.threadData.get(parseInt(threadID)) || {};
  return threadSetting.PREFIX || global.config.PREFIX || "";
}

// 🔹 আপনার ফটো লিংক এখানে বসান ✅
const helpImages = [
  "https://i.imgur.com/HMtGAMO.jpeg",
];

function downloadImages(callback) {
  const randomUrl = helpImages[Math.floor(Math.random() * helpImages.length)];
  const filePath = path.join(__dirname, "cache", "help_random.jpg");

  request(randomUrl)
    .pipe(fs.createWriteStream(filePath))
    .on("close", () => callback([filePath]))
    .on("error", () => callback([]));
}

// 🎯 কমান্ড লিস্ট টেক্সট (আপনার আগের UI হুবহু)
function buildListText(pageInput, prefix) {
  const { commands } = global.client;
  const arrayInfo = Array.from(commands.keys())
    .filter(cmdName => cmdName && cmdName.trim() !== "")
    .sort();

  const page = Math.max(parseInt(pageInput) || 1, 1);
  const numberOfOnePage = 100;
  const totalPages = Math.ceil(arrayInfo.length / numberOfOnePage) || 1;
  const safePage = Math.min(page, totalPages);
  const start = numberOfOnePage * (safePage - 1);
  const helpView = arrayInfo.slice(start, start + numberOfOnePage);

  let msg = helpView.map((cmdName, i) => {
    const num = toBold(String(start + i + 1).padStart(3, "0"));
    return `║ ${num} ➤ ${toBold(cmdName)}`;
  }).join("\n");

  const displayPrefix = prefix || "(no prefix)";
  const nextPage = safePage + 1;
  const prevPage = safePage - 1 > 0 ? safePage - 1 : 1;

  const text = `╔══════════════════════╗
║ 📜 𝐂𝐎𝐌𝐌𝐀𝐍𝐃 𝐋𝐈𝐒𝐓 📜 ║
╠══════════════════════╣
║ 📄 𝐏𝐚𝐠𝐞 ⇢ ${toBold(safePage)}/${toBold(totalPages)}
║ 🧮 𝐓𝐨𝐭𝐚𝐥 ⇢ ${toBold(arrayInfo.length)}
║ 📦 𝐒𝐡𝐨𝐰𝐢𝐧𝐠 ⇢ ${toBold(helpView.length)}
╠══════════════════════╣
${msg}
╠══════════════════════╣
║ ⚙ 𝐏𝐫𝐞𝐟𝐢𝐱 ⇢ ${toBold(displayPrefix)}
║ 🤖 𝐁𝐨𝐭 ⇢ ${toBold(global.config.BOTNAME || "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐")}
║ 👑 𝐎𝐰𝐧𝐞𝐫 ⇢ 乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐
╠══════════════════════╣
║ 💬 𝐑𝐞𝐩𝐥𝐲 𝐰𝐢𝐭𝐡 𝐧𝐮𝐦𝐛𝐞𝐫 ⇢ 𝐄𝐝𝐢𝐭 𝐏𝐚𝐠𝐞
║ ⬅ ${toBold("help " + prevPage)} ⇢ 𝐏𝐫𝐞𝐯
║ ➡ ${toBold("help " + nextPage)} ⇢ 𝐍𝐞𝐱𝐭
╚══════════════════════╝`;

  return { text, safePage, totalPages };
}

// 🎯 কমান্ড লিস্ট পাঠানোর হেল্পার
function showCommandList(api, event, pageInput, saveForEdit = false) {
  const { threadID, messageID } = event;
  const prefix = getPrefix(threadID);
  const { text, safePage } = buildListText(pageInput, prefix);

  downloadImages(files => {
    const attachments = files.map(f => fs.createReadStream(f));
    api.sendMessage({ body: text, attachment: attachments }, threadID, (err, info) => {
      files.forEach(f => fs.unlinkSync(f));

      // 🧠 saveForEdit true হলে এই মেসেজের ID সেভ করি
      if (saveForEdit && info && info.messageID) {
        if (!global.help2Messages) global.help2Messages = new Map();
        global.help2Messages.set(info.messageID, {
          threadID,
          page: safePage,
          senderID: event.senderID
        });
      }
    }, messageID);
  });
}

// 🎯 handleEvent: শুধু রিপ্লাই চেক করে মেসেজ এডিট করবে
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, body, messageReply, type } = event;

  if (!global.help2Messages) return;
  if (type !== "message_reply") return;
  if (!messageReply || !body) return;

  const saved = global.help2Messages.get(messageReply.messageID);
  if (!saved || saved.threadID !== threadID) return;

  const num = parseInt(body.trim());
  if (isNaN(num) || num < 1) return;

  const prefix = getPrefix(threadID);
  const { text, safePage } = buildListText(num, prefix);

  downloadImages(files => {
    const attachments = files.map(f => fs.createReadStream(f));
    const editData = { body: text };
    if (attachments.length) editData.attachment = attachments;

    api.editMessage(editData, messageReply.messageID, (err) => {
      if (err) {
        // ⚠️ editMessage সাপোর্ট না থাকলে → unsend + resend
        api.unsendMessage(messageReply.messageID, () => {
          api.sendMessage(editData, threadID, (e2, info) => {
            files.forEach(f => fs.unlinkSync(f));
            if (info && info.messageID) {
              saved.page = safePage;
              saved.threadID = threadID;
              global.help2Messages.set(info.messageID, saved);
            }
          });
        });
        return;
      }

      files.forEach(f => fs.unlinkSync(f));

      // ✅ পেজ আপডেট
      saved.page = safePage;
      global.help2Messages.set(messageReply.messageID, saved);
    });
  });
};

// 🎯 run: শুধু কমান্ড লিস্ট
module.exports.run = function ({ api, event, args }) {
  let pageArg = 1;
  if (args[0] && !isNaN(parseInt(args[0]))) {
    pageArg = parseInt(args[0]);
  }

  // ✅ saveForEdit = true → এই মেসেজে রিপ্লাই করলে এডিট হবে
  showCommandList(api, event, pageArg, true);
};
