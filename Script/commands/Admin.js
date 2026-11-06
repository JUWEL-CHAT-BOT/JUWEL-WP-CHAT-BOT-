const fs = require("fs-extra");
const axios = require("axios");
const moment = require("moment-timezone");

module.exports.config = {
  name: "admin",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  description: "Show Owner Info as Text with Image",
  commandCategory: "info",   // ← noprefix থেকে বদলে "info" করা হলো
  usages: "admin",
  cooldowns: 5
};

const IMAGE_URL = "https://i.imgur.com/elZgt87.jpeg";

// A-Z, a-z, 0-9 -> 𝐀𝐁𝐂𝐃 (Mathematical Bold)
function bold(text) {
  return Array.from(text).map(ch => {
    const c = ch.codePointAt(0);
    if (c >= 65 && c <= 90) return String.fromCodePoint(0x1D400 + (c - 65));
    if (c >= 97 && c <= 122) return String.fromCodePoint(0x1D41A + (c - 97));
    if (c >= 48 && c <= 57) return String.fromCodePoint(0x1D7CE + (c - 48));
    return ch;
  }).join("");
}

// ❌ handleEvent পুরোপুরি বাদ দেওয়া হলো — তাই noprefix বন্ধ
// এখন prefix দিয়ে /admin লিখলেই কাজ করবে

module.exports.run = async function ({ api, event }) {
  const time = moment().tz("Asia/Dhaka").format("DD/MM/YYYY hh:mm:ss A");

  const design = `
╔══════════════════════╗
║ 👑 ${bold("ADMIN")} 🩷   
╚══════════════════════╝
┏━━━ 👤 ${bold("PERSONAL INFO")} ━━━┓
┃ 🧑 ${bold("Name")}      ›  ${bold("JUWEL")}
┃ 🎭 ${bold("Nick")}      ›  ${bold("MR JUWEL")}
┃ 🚹 ${bold("Gender")}    ›  ${bold("MALE")}
┃ 🎂 ${bold("Age")}       ›  ${bold("22+")}
┃ 🎂 ${bold("Birthday")}  ›  ${bold("APRIL 24")}
┃ 🩸 ${bold("Blood")}     ›  ${bold("A+")}
┃ 🙆 ${bold("Height")}    ›  ${bold('5"6')}
┃ 🧍 ${bold("Weight")}    ›  ${bold("54+")}
┃ 🕌 ${bold("Religion")}  ›  ${bold("ISLAM")}
┃ 🏡 ${bold("Address")}   ›  ${bold("RANGPUR")}
┗━━━━━━━━━━━━━━━━━━━━━┛
┏━━━ 💫 ${bold("PERSONALITY")} ━━━┓
┃ 😈 ${bold("Attitude")}  ›  ${bold("KING")}
┃ 🎮 ${bold("FF")}        ›  ${bold("LOVER")}
┃ 🎓 ${bold("Prasuna")}   ›  ${bold("OFF")}
┃ 💰 ${bold("Work")}      ›  ${bold("CONTRACTION")}
┃ ❤️ ${bold("Relation")}  ›  ${bold("SINGEL")}
┗━━━━━━━━━━━━━━━━━━━━━┛
┏━━━ 🌐 ${bold("SOCIAL LINKS")} ━━━┓
┃ 📘 ${bold("Messenger")} ›  ${bold("mrjuwel444")}
┃ 📱 ${bold("WhatsApp")}  ›  ${bold("+8801943488192")}
┃ 📸 ${bold("Instagram")} ›  ${bold("mrjuwel_2025")}
┃ 🎵 ${bold("TikTok")}    ›  ${bold("mrjuwel2025")}
┃ ✈️ ${bold("Telegram")}  ›  ${bold("mrjuwel2025")}
┃ 📧 ${bold("Email")}     ›  ${bold("mrjuwel315@gmail.com")}
┗━━━━━━━━━━━━━━━━━━━━━┛
┏━━━ 🔗 ${bold("DIRECT LINK")} ━━━┓
┃ Facebook  : https://www.fb.com/mrjuwel444
┃ Messenger : https://www.m.me/mrjuwel444
┗━━━━━━━━━━━━━━━━━━━━━┛
╔══════════════════════╗
║  🕒 ${bold("Updated")}: ${bold(time)}  
╚══════════════════════╝
`;

  const cacheDir = __dirname + "/cache";
  const path = cacheDir + "/admin.jpg";
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  try {
    const res = await axios.get(IMAGE_URL, {
      responseType: "arraybuffer",
      timeout: 20000,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });
    fs.writeFileSync(path, Buffer.from(res.data));

    return api.sendMessage(
      { body: design, attachment: fs.createReadStream(path) },
      event.threadID,
      () => fs.existsSync(path) && fs.unlinkSync(path),
      event.messageID
    );
  } catch (e) {
    console.log("Image load failed:", e.message);
    return api.sendMessage(design, event.threadID, event.messageID);
  }
};
