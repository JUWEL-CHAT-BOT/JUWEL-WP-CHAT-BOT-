const os = require('os');
const moment = require('moment-timezone');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const startTime = new Date();
const startFile = __dirname + "/uptimeStart.json";
if (!fs.existsSync(startFile)) fs.writeFileSync(startFile, JSON.stringify({ start: startTime }));

// 🔤 Monospace Font Converter
function mono(text) {
  const map = {
    'A':'𝙰','B':'𝙱','C':'𝙲','D':'𝙳','E':'𝙴','F':'𝙵','G':'𝙶','H':'𝙷','I':'𝙸','J':'𝙹',
    'K':'𝙺','L':'𝙻','M':'𝙼','N':'𝙽','O':'𝙾','P':'𝙿','Q':'𝚀','R':'𝚁','S':'𝚂','T':'𝚃',
    'U':'𝚄','V':'𝚅','W':'𝚆','X':'𝚇','Y':'𝚈','Z':'𝚉',
    'a':'𝚊','b':'𝚋','c':'𝚌','d':'𝚍','e':'𝚎','f':'𝚏','g':'𝚐','h':'𝚑','i':'𝚒','j':'𝚓',
    'k':'𝚔','l':'𝚕','m':'𝚖','n':'𝚗','o':'𝚘','p':'𝚙','q':'𝚚','r':'𝚛','s':'𝚜','t':'𝚝',
    'u':'𝚞','v':'𝚟','w':'𝚠','x':'𝚡','y':'𝚢','z':'𝚣',
    '0':'𝟶','1':'𝟷','2':'𝟸','3':'𝟹','4':'𝟺','5':'𝟻','6':'𝟼','7':'𝟽','8':'𝟾','9':'𝟿',
    '.':'．',':':'：','/':'／','-':'－'
  };
  return String(text).split('').map(c => map[c] || c).join('');
}

const CREDIT = "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐";
const BOT    = "⎯꯭𓆩꯭𝆺𝅥😻⃞𝐑⃞𝐈⃞𝐘⃞𝐀⃞༢࿐";

module.exports = {
  config: {
    name: "uptime",
    version: "3.0.0",
    hasPermssion: 0,
    credits: CREDIT,
    description: "Show system uptime.",
    commandCategory: "system",
    usages: "uptime",
    prefix: false,
    cooldowns: 5
  },

  run: async function ({ api, event, Users, Threads }) {
    const { threadID } = event;

    try {
      // ⏰ Uptime
      const s = (new Date() - startTime) / 1000;
      const uptime = mono(`${Math.floor(s/86400)}d ${Math.floor((s%86400)/3600)}h ${Math.floor((s%3600)/60)}m`);

      // 💾 RAM
      const totalMem = os.totalmem() / 1073741824;
      const freeMem  = os.freemem()  / 1073741824;
      const usedMem  = totalMem - freeMem;
      const usedPct  = ((usedMem / totalMem) * 100).toFixed(0);

      // 📡 Ping
      const t0 = Date.now();
      const sent = await api.sendMessage("⏳", threadID);
      const ping = Date.now() - t0;

      // 📈 Bar
      const bar = p => "█".repeat(Math.round(p/10)) + "░".repeat(10 - Math.round(p/10));

      // 🌍 IP
      let ip = "N/A";
      try { ip = (await axios.get("https://api.ipify.org?format=json")).data.ip; } catch {}

      // 👥 Total Users & 💬 Total Threads
      let userCount = "𝙽/𝙰", threadCount = "𝙽/𝙰";
      try { userCount   = Object.keys(await Users.getAll()).length; } catch {}
      try { threadCount = Object.keys(await Threads.getAll()).length; } catch {}

      // 📊 Commands Count
      let cmdCount = "𝙽/𝙰";
      try {
        const cmdDir = path.join(__dirname, "..", "commands");
        if (fs.existsSync(cmdDir)) {
          cmdCount = fs.readdirSync(cmdDir).filter(f => f.endsWith(".js")).length;
        }
      } catch {}

      // 💾 Bot RAM Usage
      const botRam = (process.memoryUsage().rss / 1048576).toFixed(2);

      // 📦 Node Version
      const nodeVer = process.version;

      // 🔧 Dependencies
      let deps = "𝙾𝙺";
      try {
        require("axios");
        require("fs");
        require("moment-timezone");
      } catch { deps = "𝙴𝚁𝚁𝙾𝚁"; }

      // 🎯 Prefix
      const prefix = global.config?.PREFIX || "𝙽/𝙰";

      // 📩 Final Message
      const msg = `
╔════════════════════════╗
║⚙️ ${mono("SYSTEM STATUS")} ⚙️ 
╠════════════════════════╣
║ 👑 ${mono("CREDIT")}: ${CREDIT}
║ 🤖 ${mono("BOT")}: ${BOT}
║ ⏰ ${mono("UPTIME")}: ${uptime}
╠════════════════════════╣
║ 💻 ${mono("OS")}: ${mono(os.type())} ${mono(os.arch())}
║ 🧠 ${mono("CPU")}: ${mono(os.cpus()[0].model.split(" ").slice(0,2).join(" "))}
║ 💾 ${mono("RAM")}: ${mono(usedMem.toFixed(2))} / ${mono(totalMem.toFixed(2))} ${mono("GB")}
║ 📈 ${bar(usedPct)} ${mono(usedPct)}%
╠════════════════════════╣
║ 🌍 ${mono("IP")}: ${mono(ip)}
║ 📡 ${mono("PING")}: ${mono(ping)}${mono("ms")}
╠════════════════════════╣
║ 👥 ${mono("USERS")}: ${mono(userCount)}
║ 💬 ${mono("THREADS")}: ${mono(threadCount)}
║ 📊 ${mono("COMMANDS")}: ${mono(cmdCount)}
║ 💾 ${mono("BOT RAM")}: ${mono(botRam)} ${mono("MB")}
║ 📦 ${mono("NODE")}: ${mono(nodeVer)}
║ 🔧 ${mono("DEPS")}: ${deps}
║ 🎯 ${mono("PREFIX")}: ${mono(prefix)}
╚═════════════════════════╝
`;

      await api.sendMessage(msg, threadID);
      try { await api.unsendMessage(sent.messageID); } catch {}

    } catch (e) {
      console.error(e);
      await api.sendMessage(`❌ ${mono("Error!")}`, threadID);
    }
  }
};
