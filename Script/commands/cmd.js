const fs = require("fs-extra");
const path = require("path");

const CREDIT = "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐";

module.exports.config = {
  name: "cmd",
  version: "3.0.0",
  hasPermssion: 2,
  credits: CREDIT,
  description: "Command control system",
  commandCategory: "System",
  usages: "[load/unload/reload/loadAll/unloadAll/info/count/watch]",
  cooldowns: 2
};

// ===== FONT (monospace: 𝙰𝙱𝙲𝙳) =====
function mono(text) {
  return String(text).replace(/[A-Za-z0-9]/g, (ch) => {
    const c = ch.charCodeAt(0);
    if (c >= 65 && c <= 90) return String.fromCodePoint(0x1d670 + (c - 65));
    if (c >= 97 && c <= 122) return String.fromCodePoint(0x1d68a + (c - 97));
    return String.fromCodePoint(0x1d7f6 + (c - 48));
  });
}

// ===== PERMISSION (reads admins from config.json) =====
function getAdmins() {
  const cfg = (global.config) || {};
  const list = [].concat(cfg.ADMINBOT || [], cfg.OPERATOR || []);
  return list.map(String);
}

function isAdmin(uid) {
  return getAdmins().includes(String(uid));
}

// ===== HELPERS =====
function send(api, text, threadID, messageID) {
  return api.sendMessage(mono(text), threadID, messageID);
}

function safeName(name) {
  // block path traversal like ../../x
  return String(name || "").replace(/\.js$/i, "").replace(/[^\w\-]/g, "");
}

// file name -> registered command name (they can differ)
global.__cmdFileMap = global.__cmdFileMap || new Map();

// ===== LOAD =====
function loadCommand(file, api) {
  const fileName = safeName(file);
  if (!fileName) throw new Error("Invalid module name");

  const filePath = path.join(__dirname, fileName + ".js");
  if (!fs.existsSync(filePath)) throw new Error("File not found: " + fileName + ".js");

  delete require.cache[require.resolve(filePath)];
  const cmd = require(filePath);

  if (!cmd.config || !cmd.config.name || typeof cmd.run !== "function")
    throw new Error("Invalid module structure (config.name / run missing)");

  if (typeof cmd.onLoad === "function") cmd.onLoad({ api });

  global.client.commands.set(cmd.config.name, cmd);
  global.__cmdFileMap.set(fileName, cmd.config.name);

  // re-register event handler (was removed on unload)
  const reg = global.client.eventRegistered;
  if (typeof cmd.handleEvent === "function" && !reg.includes(cmd.config.name))
    reg.push(cmd.config.name);

  return `✅ Loaded → ${cmd.config.name}`;
}

// ===== UNLOAD =====
function unloadCommand(file) {
  const fileName = safeName(file);
  const cmdName = global.__cmdFileMap.get(fileName) || fileName;

  if (!global.client.commands.has(cmdName))
    throw new Error("Module not loaded: " + cmdName);

  global.client.commands.delete(cmdName);
  global.__cmdFileMap.delete(fileName);

  global.client.eventRegistered = global.client.eventRegistered.filter(
    (i) => i !== cmdName
  );

  return `❌ Unloaded → ${cmdName}`;
}

// ===== WATCH SYSTEM (stored on global so reloading cmd.js won't duplicate it) =====
function startWatcher(api, threadID) {
  if (global.__cmdWatcher) return false;

  const timers = new Map();

  global.__cmdWatcher = fs.watch(__dirname, (eventType, filename) => {
    if (!filename || !filename.endsWith(".js")) return;

    const name = filename.replace(/\.js$/, "");
    if (name === "cmd") return; // never hot-reload ourselves

    // debounce: fs.watch fires several events per save
    clearTimeout(timers.get(name));
    timers.set(
      name,
      setTimeout(() => {
        timers.delete(name);
        try {
          if (!fs.existsSync(path.join(__dirname, filename))) {
            unloadCommand(name);
            return send(api, `🗑 File removed, unloaded: ${name}`, threadID);
          }
          loadCommand(name, api);
          send(api, `🔄 Auto reloaded: ${name}`, threadID);
        } catch (e) {
          send(api, `⚠️ Reload error: ${name}\n${e.message}`, threadID);
        }
      }, 400)
    );
  });

  return true;
}

function stopWatcher() {
  if (!global.__cmdWatcher) return false;
  global.__cmdWatcher.close();
  global.__cmdWatcher = null;
  return true;
}

// ===== MAIN =====
module.exports.run = async function ({ event, args, api }) {
  const { threadID, messageID, senderID } = event;

  if (!isAdmin(senderID)) {
    return send(api, "❌ You don't have permission!", threadID, messageID);
  }

  const action = args[0];
  const name = args[1];

  try {
    switch (action) {
      case "count":
        return send(api, `📦 Total commands: ${global.client.commands.size}`, threadID, messageID);

      case "load":
        if (!name) return send(api, "⚠️ Please provide a module name!", threadID, messageID);
        return send(api, loadCommand(name, api), threadID, messageID);

      case "unload":
        if (!name) return send(api, "⚠️ Please provide a module name!", threadID, messageID);
        return send(api, unloadCommand(name), threadID, messageID);

      case "reload": {
        if (!name) return send(api, "⚠️ Please provide a module name!", threadID, messageID);
        try { unloadCommand(name); } catch (_) {}
        return send(api, loadCommand(name, api), threadID, messageID);
      }

      case "loadAll": {
        const files = fs.readdirSync(__dirname).filter((f) => f.endsWith(".js"));
        let msg = "📥 Loading all modules...\n\n";

        for (const file of files) {
          const n = file.replace(/\.js$/, "");
          try {
            msg += loadCommand(n, api) + "\n";
          } catch (e) {
            msg += `⚠️ ${n} → ${e.message}\n`;
          }
        }
        return send(api, msg, threadID, messageID);
      }

      case "unloadAll": {
        const all = Array.from(global.client.commands.keys());
        let msg = "📤 Unloading all modules...\n\n";

        for (const n of all) {
          if (n === "cmd") continue;
          try {
            msg += unloadCommand(n) + "\n";
          } catch (e) {
            msg += `⚠️ ${n} → ${e.message}\n`;
          }
        }
        return send(api, msg, threadID, messageID);
      }

      case "info": {
        if (!name) return send(api, "⚠️ Please provide a module name!", threadID, messageID);

        const cmd = global.client.commands.get(name);
        if (!cmd) return send(api, "❌ Module not found!", threadID, messageID);

        const c = cmd.config;
        const deps = Object.keys(c.dependencies || {}).join(", ") || "None";

        return send(
          api,
`╔═════〔 CMD DETAILS 〕═════╗
│ 📌 Name : ${c.name}
│ 👑 Author : ${c.credits}
│ ⚙️ Version : ${c.version}
│ 🔒 Permission : ${c.hasPermssion}
│ ⏱ Cooldown : ${c.cooldowns}s
│ 📦 Dependencies : ${deps}
╚═════════════════════════╝`,
          threadID,
          messageID
        );
      }

      case "watch": {
        if (global.__cmdWatcher) {
          stopWatcher();
          return send(api, "🛑 Auto reload turned off", threadID, messageID);
        }
        startWatcher(api, threadID);
        return send(api, "👀 Auto reload turned on", threadID, messageID);
      }

      default:
        return send(
          api,
          "⚙️ Usage:\n" +
          "cmd load name\n" +
          "cmd unload name\n" +
          "cmd reload name\n" +
          "cmd loadAll\n" +
          "cmd unloadAll\n" +
          "cmd info name\n" +
          "cmd count\n" +
          "cmd watch\n\n" +
          `Credit: ${CREDIT}`,
          threadID,
          messageID
        );
    }
  } catch (err) {
    return send(api, "❌ Error:\n" + err.message, threadID, messageID);
  }
};
