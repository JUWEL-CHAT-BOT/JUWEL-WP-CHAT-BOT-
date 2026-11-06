const fs = require("fs");
const path = require("path");
const axios = require("axios");

module.exports.config = {
  name: "give",
  version: "3.6.0",
  hasPermssion: 2,
  credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  description: "2-step upload UI (animation → file info)",
  commandCategory: "utility",
  usages: "[filename]",
  cooldowns: 5
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// একাধিক সার্ভিসে আপলোড (একটা ব্যর্থ হলে পরেরটা চেষ্টা করবে)
async function uploadPaste(text) {
  const errors = [];

  // ১) dpaste.org
  try {
    const params = new URLSearchParams({
      content: text,
      syntax: "js",
      expiry_days: "365"
    });
    const res = await axios.post("https://dpaste.org/api/", params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": UA
      },
      timeout: 20000
    });
    const url = String(res.data).trim().replace(/^"|"$/g, "");
    if (/^https?:\/\//.test(url)) return url + "/raw";
  } catch (e) {
    errors.push("dpaste.org: " + e.message);
  }

  // ২) dpaste.com
  try {
    const params = new URLSearchParams({
      content: text,
      syntax: "js",
      expiry_days: "365"
    });
    const res = await axios.post("https://dpaste.com/api/v2/", params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": UA
      },
      timeout: 20000
    });
    const url = String(res.data).trim();
    if (/^https?:\/\//.test(url)) return url + ".txt";
  } catch (e) {
    errors.push("dpaste.com: " + e.message);
  }

  // ৩) paste.rs (সরাসরি raw লিংক দেয়)
  try {
    const res = await axios.post("https://paste.rs/", text, {
      headers: { "Content-Type": "text/plain", "User-Agent": UA },
      timeout: 20000
    });
    const url = String(res.data).trim();
    if (/^https?:\/\//.test(url)) return url;
  } catch (e) {
    errors.push("paste.rs: " + e.message);
  }

  throw new Error("সব আপলোড ব্যর্থ → " + errors.join(" | "));
}

module.exports.run = async function ({ api, event, args }) {
  if (!args[0]) {
    return api.sendMessage("❌ ফাইল নাম দাও", event.threadID);
  }

  const fileName = args[0];
  const commandsPath = path.join(__dirname, "..", "commands");

  const filePath1 = path.join(commandsPath, fileName);
  const filePath2 = path.join(commandsPath, fileName + ".js");

  let fileToRead;
  if (fs.existsSync(filePath1)) fileToRead = filePath1;
  else if (fs.existsSync(filePath2)) fileToRead = filePath2;
  else return api.sendMessage("❌ ফাইল পাওয়া যায়নি", event.threadID);

  let interval;

  try {
    const data = fs.readFileSync(fileToRead, "utf8");

    let c = {};
    try {
      delete require.cache[require.resolve(fileToRead)];
      c = require(fileToRead).config || {};
    } catch {}

    const stats = fs.statSync(fileToRead);
    const sizeKB = (stats.size / 1024).toFixed(2);
    const lines = data.split("\n").length;

    const frames = [
      "▰▱▱▱▱▱▱▱▱▱ 10%",
      "▰▰▱▱▱▱▱▱▱▱ 20%",
      "▰▰▰▱▱▱▱▱▱▱ 30%",
      "▰▰▰▰▱▱▱▱▱▱ 40%",
      "▰▰▰▰▰▱▱▱▱▱ 50%",
      "▰▰▰▰▰▰▱▱▱▱ 60%",
      "▰▰▰▰▰▰▰▱▱▱ 70%",
      "▰▰▰▰▰▰▰▰▱▱ 80%",
      "▰▰▰▰▰▰▰▰▰▱ 90%"
    ];

    const sent = await api.sendMessage(
`╔════════════════════╗
║ ⚡ Upload শুরু...
╚════════════════════╝`,
      event.threadID
    );
    const msgID = (sent && sent.messageID) || sent;

    const safeEdit = async (text) => {
      try {
        await api.editMessage(text, msgID);
      } catch {}
    };

    // অ্যানিমেশন (আপলোডের সাথে সমান্তরালে)
    let i = 0;
    interval = setInterval(() => {
      if (i >= frames.length) return;
      safeEdit(
`╔════════════════════╗
║ 📤 Uploading...
║ ${frames[i]}
╚════════════════════╝`
      );
      i++;
    }, 600);

    // আপলোড
    const link = await uploadPaste(data);

    clearInterval(interval);

    await safeEdit(
`╔════════════════════╗
║ ✅ Upload Complete
║ ▰▰▰▰▰▰▰▰▰▰ 100% 🚀
╚════════════════════╝`
    );

    await new Promise((r) => setTimeout(r, 1000));

    const fileInfo =
`╔════════════════════════╗
║ 📄 ${(c.name || fileName).toUpperCase()} FILE
╠════════════════════════╣
║ 📌 Name : ${c.name || fileName}
║ 👑 Author : ${c.credits || "Unknown"}
║ ⚙️ Version : ${c.version || "1.0.0"}
║ 🔒 Permission : ${c.hasPermission ?? c.hasPermssion ?? "N/A"}
║ ⏱ Cooldown : ${c.cooldowns || 0}s
║ 📦 Depends : ${Object.keys(c.dependencies || {}).join(", ") || "None"}
║ 📊 Size : ${sizeKB} KB
║ 📜 Lines : ${lines}
╠════════════════════════╣
║ 🔗 LINK:
║ ${link}
╚════════════════════════╝`;

    return api.sendMessage(fileInfo, event.threadID);
  } catch (err) {
    if (interval) clearInterval(interval);
    console.error(err);
    return api.sendMessage("❌ ERROR: " + err.message, event.threadID);
  }
};
