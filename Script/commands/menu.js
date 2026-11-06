const fs = require("fs");
const path = require("path");

const COMMANDS_DIR = path.join(__dirname);
const dbPath = path.join(__dirname, "database.json");
const logPath = path.join(__dirname, "log.json");
const backupDir = path.join(__dirname, "backup");

// ================= FONT (𝙰𝙱𝙲𝙳 monospace) =================
function mono(str) {
  return String(str).replace(/[A-Za-z0-9]/g, (c) => {
    const code = c.codePointAt(0);
    if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d670 + code - 65);
    if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d68a + code - 97);
    if (code >= 48 && code <= 57) return String.fromCodePoint(0x1d7f6 + code - 48);
    return c;
  });
}

// ================= UI HELPERS =================
const LINE = "━━━━━━━━━━━━━━━━━━━";
const THIN = "┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄";

function header(icon, title) {
  return `┏${LINE}┓\n   ${icon}  ${mono(title)}\n┗${LINE}┛`;
}

function section(title) {
  return `\n◤ ${mono(title)} ◢\n${THIN}`;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function footer(text) {
  return `\n${THIN}\n💬 ${mono(text)}`;
}

// ================= DATABASE =================
function getDB() {
  try {
    if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, "{}");
    return JSON.parse(fs.readFileSync(dbPath, "utf8") || "{}");
  } catch (e) {
    return {};
  }
}

function saveDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// ================= LOG SYSTEM =================
function logAction(data) {
  let logs = [];
  try {
    if (fs.existsSync(logPath)) logs = JSON.parse(fs.readFileSync(logPath, "utf8") || "[]");
  } catch (e) {
    logs = [];
  }

  logs.push({
    time: new Date().toLocaleString(),
    action: data.action,
    user: data.user,
    thread: data.thread
  });

  fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
}

// ================= COMMAND LIST =================
function listCommands() {
  return fs
    .readdirSync(COMMANDS_DIR)
    .filter((f) => f.endsWith(".js") && f !== path.basename(__filename))
    .map((f) => f.replace(/\.js$/, ""))
    .sort((a, b) => a.localeCompare(b));
}

function getUptime() {
  const uptime = process.uptime();
  const h = Math.floor(uptime / 3600);
  const m = Math.floor((uptime % 3600) / 60);
  return `${h}h ${m}m`;
}

// config.json থেকে ADMINBOT লিস্ট পড়া (প্রতিবার ফ্রেশ পড়ে, তাই রিস্টার্ট ছাড়াই আপডেট হয়)
function getAdminList() {
  const candidates = [
    path.join(process.cwd(), "config.json"),
    path.join(__dirname, "../../config.json"),
    path.join(__dirname, "../config.json"),
    path.join(__dirname, "config.json")
  ];

  for (const p of candidates) {
    try {
      if (!fs.existsSync(p)) continue;
      const cfg = JSON.parse(fs.readFileSync(p, "utf8"));
      if (Array.isArray(cfg.ADMINBOT)) return cfg.ADMINBOT.map(String);
    } catch (e) {}
  }

  // ফাইল না পেলে মেমরির config ব্যবহার
  return ((global.config && global.config.ADMINBOT) || []).map(String);
}

function isBotAdmin(userID) {
  return getAdminList().includes(String(userID));
}

function isBanned(threadID, threadData) {
  const db = getDB();
  if (db[threadID] && typeof db[threadID].banned !== "undefined") return !!db[threadID].banned;
  return !!(threadData && threadData.banned);
}

// ================= TIMER TRACKER =================
// commands ফোল্ডারের কোনো ফাইল যে setInterval / setTimeout বানায় সেগুলো ট্র্যাক করে রাখে,
// যাতে Soft restart (৭ নম্বর) দিলে caption-এর মতো লুপ কমান্ড পুরোপুরি বন্ধ হয়ে যায়।
// বটের নিজের timer (fca, mqtt ইত্যাদি) ট্র্যাক হয় না, তাই সেগুলো নিরাপদ।
if (!global.__cmdTimerTracker) {
  const tracker = {
    timers: new Set(),
    setInterval: global.setInterval,
    setTimeout: global.setTimeout,
    clearInterval: global.clearInterval,
    clearTimeout: global.clearTimeout
  };
  global.__cmdTimerTracker = tracker;

  // কলের stack-এ commands ফোল্ডারের (menu ছাড়া) কোনো ফাইল থাকলে সেটা কমান্ডের timer
  const isCommandOwned = () => {
    const old = Error.stackTraceLimit;
    Error.stackTraceLimit = 40;
    const stack = new Error().stack || "";
    Error.stackTraceLimit = old;
    return stack
      .split("\n")
      .some((l) => l.includes(COMMANDS_DIR) && !l.includes(__filename));
  };

  global.setInterval = function (fn, ms, ...args) {
    const t = tracker.setInterval.call(this, fn, ms, ...args);
    if (isCommandOwned()) tracker.timers.add(t);
    return t;
  };

  global.setTimeout = function (fn, ms, ...args) {
    if (typeof fn === "function" && isCommandOwned()) {
      let t;
      const wrapped = function (...a) {
        tracker.timers.delete(t);
        return fn.apply(this, a);
      };
      t = tracker.setTimeout.call(this, wrapped, ms, ...args);
      tracker.timers.add(t);
      return t;
    }
    return tracker.setTimeout.call(this, fn, ms, ...args);
  };

  global.clearInterval = function (t) {
    tracker.timers.delete(t);
    return tracker.clearInterval.call(this, t);
  };

  global.clearTimeout = function (t) {
    tracker.timers.delete(t);
    return tracker.clearTimeout.call(this, t);
  };
}

// সব চলমান কমান্ড timer বন্ধ করে, কয়টা বন্ধ হলো সেই সংখ্যা ফেরত দেয়
function stopCommandTimers() {
  // while-loop ধরনের কমান্ডের জন্য টোকেন (কমান্ডে global.__restartToken চেক করলে লুপ থামবে)
  global.__restartToken = (global.__restartToken || 0) + 1;

  const tracker = global.__cmdTimerTracker;
  if (!tracker) return 0;

  let n = 0;
  for (const t of Array.from(tracker.timers)) {
    try {
      tracker.clearInterval.call(global, t);
      tracker.clearTimeout.call(global, t);
      n++;
    } catch (_) {}
  }
  tracker.timers.clear();
  return n;
}

// ================= SOFT RESTART (HOT RELOAD) =================
// Bot process বন্ধ হয় না, uptime ঠিক থাকে। চলমান কমান্ড বন্ধ হয়ে সব কমান্ড ফাইল নতুন করে লোড হয়।
async function softReload(ctx) {
  const result = { loaded: 0, failed: [], removed: 0 };
  const self = path.basename(__filename);

  const disabled = getDisabled();
  const files = fs
    .readdirSync(COMMANDS_DIR)
    .filter((f) => f.endsWith(".js") && f !== self)
    .filter((f) => !disabled.includes(f.replace(/\.js$/, "")));

  const commands = global.client && global.client.commands;
  const eventReg = global.client && global.client.eventRegistered;
  const fileNames = new Set(files.map((f) => f.replace(/\.js$/, "")));
  const loadedNames = new Set();

  for (const file of files) {
    const full = path.join(COMMANDS_DIR, file);
    try {
      // পুরনো cache মুছে ফেলা
      delete require.cache[require.resolve(full)];
      const cmd = require(full);

      if (!cmd || !cmd.config || !cmd.config.name)
        throw new Error("config.name missing");
      if (typeof cmd.run !== "function" && typeof cmd.onStart !== "function")
        throw new Error("run function missing");

      // onLoad থাকলে চালানো
      if (typeof cmd.onLoad === "function") {
        await cmd.onLoad({
          api: ctx.api,
          models: ctx.models,
          Users: ctx.Users,
          Threads: ctx.Threads,
          Currencies: ctx.Currencies
        });
      }

      if (commands) commands.set(cmd.config.name, cmd);

      // handleEvent রেজিস্টার
      if (eventReg && cmd.handleEvent && !eventReg.includes(cmd.config.name)) {
        eventReg.push(cmd.config.name);
      }

      loadedNames.add(cmd.config.name);
      result.loaded++;
    } catch (e) {
      result.failed.push(`${file}: ${e.message}`);
    }
  }

  // যে কমান্ডের ফাইল আর নেই সেগুলো সরিয়ে দেওয়া
  if (commands) {
    for (const [key, cmd] of Array.from(commands)) {
      if (cmd && cmd.config && cmd.config.name === "menu") continue;
      const stillExists = fileNames.has(key) || loadedNames.has(key);
      if (!stillExists) {
        commands.delete(key);
        if (eventReg) {
          const i = eventReg.indexOf(key);
          if (i !== -1) eventReg.splice(i, 1);
        }
        result.removed++;
      }
    }
  }

  return result;
}

// ================= DISABLED COMMANDS (ON/OFF) =================
function getDisabled() {
  const db = getDB();
  return Array.isArray(db.__disabledCommands) ? db.__disabledCommands : [];
}

function saveDisabled(list) {
  const db = getDB();
  db.__disabledCommands = list;
  saveDB(db);
}

function unregisterCommand(file) {
  try {
    const full = path.join(COMMANDS_DIR, `${file}.js`);
    let name = file;
    try {
      const mod = require(full);
      if (mod && mod.config && mod.config.name) name = mod.config.name;
    } catch (_) {}

    if (global.client && global.client.commands) global.client.commands.delete(name);
    const reg = global.client && global.client.eventRegistered;
    if (reg) {
      const i = reg.indexOf(name);
      if (i !== -1) reg.splice(i, 1);
    }
  } catch (_) {}
}

function applyDisabled() {
  for (const f of getDisabled()) unregisterCommand(f);
}

// ================= RELOAD ONE COMMAND =================
async function reloadOne(file, ctx) {
  const safe = path.basename(file, ".js");
  const full = path.join(COMMANDS_DIR, `${safe}.js`);
  if (!fs.existsSync(full)) throw new Error("File not found");

  delete require.cache[require.resolve(full)];
  const cmd = require(full);

  if (!cmd || !cmd.config || !cmd.config.name) throw new Error("config.name missing");
  if (typeof cmd.run !== "function" && typeof cmd.onStart !== "function")
    throw new Error("run function missing");

  if (typeof cmd.onLoad === "function") {
    await cmd.onLoad({
      api: ctx.api,
      models: ctx.models,
      Users: ctx.Users,
      Threads: ctx.Threads,
      Currencies: ctx.Currencies
    });
  }

  if (global.client && global.client.commands) global.client.commands.set(cmd.config.name, cmd);
  const reg = global.client && global.client.eventRegistered;
  if (reg && cmd.handleEvent && !reg.includes(cmd.config.name)) reg.push(cmd.config.name);

  return cmd.config.name;
}

// ================= COMMAND PAGES (সব কমান্ড পেজ করে দেখানো) =================
// মেসেঞ্জারে এক মেসেজে অনেক লম্বা টেক্সট যায় না, তাই ২০০+ কমান্ড পেজে ভাগ করে দেখানো হয়।
// এক পেজে কয়টা কমান্ড দেখাবে (মেসেজ কেটে গেলে এই সংখ্যা কমিয়ে দিন)
const CMD_PER_PAGE = 200;

const CMD_KINDS = {
  list: { icon: "🧩", title: "COMMAND LIST", hint: "" },
  delete: { icon: "🗑️", title: "DELETE COMMAND", hint: "Reply with the number to delete" },
  reload: { icon: "🔁", title: "RELOAD COMMAND", hint: "Reply with the number to reload" },
  toggle: { icon: "🎛️", title: "COMMAND ON/OFF", hint: "Reply with the number to toggle" }
};

function cmdPageText(kind, cmds, page) {
  const k = CMD_KINDS[kind];
  const totalPages = Math.max(1, Math.ceil(cmds.length / CMD_PER_PAGE));
  const start = page * CMD_PER_PAGE;
  const slice = cmds.slice(start, start + CMD_PER_PAGE);
  const dis = getDisabled();

  const lines = slice.map((c, i) => {
    const num = `【${mono(pad(start + i + 1))}】`;
    if (kind === "toggle") return `${num} ${dis.includes(c) ? "🔴" : "🟢"} ${mono(c)}`;
    return `${num} ➜ ${mono(c)}`;
  });

  // একের বেশি পেজ হলেই কেবল পেজের তথ্য ও n/p হিন্ট দেখাবে
  let hint = k.hint;
  if (totalPages > 1) {
    const nav = `Page ${page + 1}/${totalPages} | n = next | p = prev`;
    hint = hint ? `${hint} | ${nav}` : nav;
  }

  const out = [header(k.icon, k.title)];
  if (kind === "list") out.push(`\n◈ ${mono("Total")} ➜ ${mono(cmds.length)}`, THIN, lines.join("\n"));
  else out.push(`\n${lines.join("\n")}`);
  if (hint) out.push(footer(hint));

  return out.join("\n");
}

function sendCmdPage(api, event, kind, cmds, page) {
  return api.sendMessage(cmdPageText(kind, cmds, page), event.threadID, (err, info) => {
    if (err) return;
    global.client.handleReply.push({
      name: module.exports.config.name,
      messageID: info.messageID,
      author: event.senderID,
      type: "cmdPick",
      kind,
      cmds,
      page
    });
  });
}

// ================= GROUP ON/OFF =================
const PER_PAGE = 10;

async function setThreadBan(threadID, val, Threads) {
  const db = getDB();
  db[threadID] = db[threadID] || {};
  db[threadID].banned = val;
  saveDB(db);

  try {
    const t = (await Threads.getData(threadID)) || {};
    const d = t.data || {};
    d.banned = val;
    await Threads.setData(threadID, { data: d });
    if (global.data && global.data.threadBanned) {
      if (val) global.data.threadBanned.set(threadID, 1);
      else global.data.threadBanned.delete(threadID);
    }
  } catch (e) {}
}

async function fetchGroups(Threads) {
  try {
    const all = await Threads.getAll(["threadID", "threadInfo"]);
    return (all || [])
      .filter((t) => t.threadInfo && t.threadInfo.isGroup !== false)
      .map((t) => ({
        id: String(t.threadID),
        name: (t.threadInfo && t.threadInfo.threadName) || "Unnamed group"
      }));
  } catch (e) {
    return [];
  }
}

function groupPageText(groups, page) {
  const db = getDB();
  const totalPages = Math.max(1, Math.ceil(groups.length / PER_PAGE));
  const start = page * PER_PAGE;
  const slice = groups.slice(start, start + PER_PAGE);

  const lines = slice.map((g, i) => {
    const off = db[g.id] && db[g.id].banned;
    return `【${mono(pad(start + i + 1))}】 ${off ? "🔴" : "🟢"} ${g.name}`;
  });

  return [
    header("👥", "GROUP LIST"),
    `\n◈ ${mono("Total")} ➜ ${mono(groups.length)}   ◈ ${mono("Page")} ➜ ${mono(page + 1 + "/" + totalPages)}`,
    THIN,
    lines.join("\n"),
    footer("Reply number to toggle ON/OFF | n = next | p = prev")
  ].join("\n");
}

// ================= CONFIG =================
module.exports.config = {
  name: "menu",
  version: "4.4.0",
  hasPermssion: 2,
  credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  description: "Pro control panel",
  commandCategory: "system",
  usages: "menu",
  cooldowns: 2
};

// বট চালু হওয়ার পর OFF করা কমান্ডগুলো আবার বন্ধ করে দেয়
module.exports.onLoad = function () {
  setTimeout(applyDisabled, 15000);
};

// ================= MENU UI =================
module.exports.run = async function ({ api, event, Threads }) {
  if (!isBotAdmin(event.senderID))
    return api.sendMessage(`⛔ ${mono("Only bot admins can use this command.")}`, event.threadID, event.messageID);

  let data = {};
  try {
    data = (await Threads.getData(event.threadID))?.data || {};
  } catch (e) {}

  const cmds = listCommands();
  const banned = isBanned(event.threadID, data);

  const menu = [
    header("🤖", "BOT CONTROL PANEL"),
    section("INFO"),
    `◈ ${mono("Status")}   ➜ ${banned ? mono("OFF") + " 🔴" : mono("ON") + " 🟢"}`,
    `◈ ${mono("Commands")} ➜ ${mono(cmds.length)}`,
    `◈ ${mono("Uptime")}   ➜ ${mono(getUptime())}`,
    section("OPTIONS"),
    `❶ 📊 ${mono("Bot status")}`,
    `❷ 🧩 ${mono("Command list")}`,
    `❸ 🗑️ ${mono("Delete command")}`,
    `❹ 🔴 ${mono("Turn OFF in this chat")}`,
    `❺ 🟢 ${mono("Turn ON in this chat")}`,
    `❻ ♻️ ${mono("Full restart")}`,
    `❼ 🔄 ${mono("Soft restart (stop all + reload)")}`,
    `❽ 🔁 ${mono("Reload one command")}`,
    `❾ 🎛️ ${mono("Command ON/OFF")}`,
    `❿ 👥 ${mono("Group list ON/OFF")}`,
    footer("Reply with an option number")
  ].join("\n");

  return api.sendMessage(menu, event.threadID, (err, info) => {
    if (err) return;

    global.client.handleReply.push({
      name: module.exports.config.name,
      messageID: info.messageID,
      author: event.senderID,
      type: "menu"
    });
  });
};

// ================= HANDLE REPLY =================
module.exports.handleReply = async function ({ api, event, handleReply, Threads, Users, Currencies, models }) {
  if (event.senderID !== handleReply.author) return;
  if (!isBotAdmin(event.senderID))
    return api.sendMessage(`⛔ ${mono("Only bot admins can use this command.")}`, event.threadID);

  const reply = (msg, cb) => api.sendMessage(msg, event.threadID, cb);

  let data = {};
  try {
    data = (await Threads.getData(event.threadID))?.data || {};
  } catch (e) {}

  // ================= MENU =================
  if (handleReply.type === "menu") {
    const choice = (event.body || "").trim();

    switch (choice) {
      // 📊 STATUS
      case "1": {
        const cmds = listCommands();
        const banned = isBanned(event.threadID, data);

        return reply(
          [
            header("📊", "BOT STATUS"),
            section("DETAILS"),
            `◈ ${mono("Bot")}      ➜ ${banned ? mono("OFF") + " 🔴" : mono("ON") + " 🟢"}`,
            `◈ ${mono("Commands")} ➜ ${mono(cmds.length)}`,
            `◈ ${mono("Uptime")}   ➜ ${mono(getUptime())}`
          ].join("\n")
        );
      }

      // 🧩 COMMAND LIST (পেজ করা)
      case "2": {
        return sendCmdPage(api, event, "list", listCommands(), 0);
      }

      // 🗑 DELETE COMMAND (পেজ করা)
      case "3": {
        return sendCmdPage(api, event, "delete", listCommands(), 0);
      }

      // 🚫 BAN
      case "4": {
        const db = getDB();
        db[event.threadID] = db[event.threadID] || {};
        db[event.threadID].banned = 1;
        saveDB(db);

        try {
          const t = (await Threads.getData(event.threadID)) || {};
          const d = t.data || {};
          d.banned = 1;
          await Threads.setData(event.threadID, { data: d });
          if (global.data && global.data.threadBanned) global.data.threadBanned.set(event.threadID, 1);
        } catch (e) {}

        logAction({ action: "Bot turned OFF", user: event.senderID, thread: event.threadID });

        return reply(`🔴 ${mono("Bot has been turned OFF in this group.")}`);
      }

      // 🟢 UNBAN
      case "5": {
        const db = getDB();
        db[event.threadID] = db[event.threadID] || {};
        db[event.threadID].banned = 0;
        saveDB(db);

        try {
          const t = (await Threads.getData(event.threadID)) || {};
          const d = t.data || {};
          d.banned = 0;
          await Threads.setData(event.threadID, { data: d });
          if (global.data && global.data.threadBanned) global.data.threadBanned.delete(event.threadID);
        } catch (e) {}

        logAction({ action: "Bot turned ON", user: event.senderID, thread: event.threadID });

        return reply(`🟢 ${mono("Bot has been turned ON in this group.")}`);
      }

      // ♻️ FULL RESTART
      case "6": {
        logAction({ action: "Full restart", user: event.senderID, thread: event.threadID });
        return reply(`♻️ ${mono("Bot is restarting...")}`, () => {
          setTimeout(() => process.exit(1), 1200);
        });
      }

      // 🔄 SOFT RESTART (bot stays online, uptime kept)
      case "7": {
        await reply(`🔄 ${mono("Stopping running commands & reloading...")}`);

        try {
          // আগে সব চলমান কমান্ড (caption loop ইত্যাদি) বন্ধ
          const stopped = stopCommandTimers();

          const res = await softReload({ api, models, Users, Threads, Currencies });

          logAction({
            action: `Soft restart (stopped ${stopped}, loaded ${res.loaded}, failed ${res.failed.length})`,
            user: event.senderID,
            thread: event.threadID
          });

          const lines = [
            header("🔄", "SOFT RESTART DONE"),
            section("RESULT"),
            `◈ ${mono("Stopped")} ➜ ${mono(stopped)} ⏹️`,
            `◈ ${mono("Loaded")}  ➜ ${mono(res.loaded)} ✅`,
            `◈ ${mono("Removed")} ➜ ${mono(res.removed)}`,
            `◈ ${mono("Failed")}  ➜ ${mono(res.failed.length)} ${res.failed.length ? "❌" : "✅"}`,
            `◈ ${mono("Uptime")}  ➜ ${mono(getUptime())} (kept)`
          ];

          if (res.failed.length) {
            lines.push(section("ERRORS"));
            lines.push(res.failed.slice(0, 10).map((f) => `• ${f}`).join("\n"));
          }

          return reply(lines.join("\n"));
        } catch (e) {
          return reply(`❌ ${mono("Soft restart failed")}: ${mono(e.message)}`);
        }
      }

      // 🔁 RELOAD ONE COMMAND (পেজ করা)
      case "8": {
        return sendCmdPage(api, event, "reload", listCommands(), 0);
      }

      // 🎛️ COMMAND ON/OFF (পেজ করা)
      case "9": {
        return sendCmdPage(api, event, "toggle", listCommands(), 0);
      }

      // 👥 GROUP LIST ON/OFF
      case "10": {
        const groups = await fetchGroups(Threads);
        if (!groups.length) return reply(`❌ ${mono("No groups found")}`);

        return reply(groupPageText(groups, 0), (err, info) => {
          if (err) return;
          global.client.handleReply.push({
            name: module.exports.config.name,
            messageID: info.messageID,
            author: event.senderID,
            type: "groupPick",
            groups,
            page: 0
          });
        });
      }

      default:
        return reply(`❌ ${mono("Invalid option")}`);
    }
  }

  // ================= COMMAND PICK (list / delete / reload / toggle) =================
  if (handleReply.type === "cmdPick") {
    const body = (event.body || "").trim().toLowerCase();
    const { kind, page } = handleReply;
    const cmds = handleReply.cmds;
    const totalPages = Math.max(1, Math.ceil(cmds.length / CMD_PER_PAGE));

    // PAGING
    if (["n", "next", "p", "prev"].includes(body)) {
      const newPage = page + (body.startsWith("n") ? 1 : -1);
      if (newPage < 0 || newPage >= totalPages) return reply(`❌ ${mono("No more pages")}`);
      return sendCmdPage(api, event, kind, cmds, newPage);
    }

    if (kind === "list") return reply(`❌ ${mono("Reply n / p to change page")}`);

    const idx = parseInt(body, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= cmds.length) return reply(`❌ ${mono("Invalid number")}`);

    const file = cmds[idx];

    // 🗑 DELETE → কনফার্ম চাওয়া
    if (kind === "delete") {
      return reply(
        [header("⚠️", "CONFIRM DELETE"), `\n◈ ${mono("File")} ➜ ${mono(file + ".js")}`, footer("Type yes or no")].join("\n"),
        (err, info) => {
          if (err) return;
          global.client.handleReply.push({
            name: module.exports.config.name,
            messageID: info.messageID,
            author: event.senderID,
            type: "confirmDelete",
            cmdName: file
          });
        }
      );
    }

    // 🔁 RELOAD
    if (kind === "reload") {
      if (getDisabled().includes(file))
        return reply(`⚠️ ${mono(file)} ${mono("is OFF. Turn it ON first.")}`);

      try {
        const name = await reloadOne(file, { api, models, Users, Threads, Currencies });
        logAction({ action: `Reloaded command: ${file}.js`, user: event.senderID, thread: event.threadID });
        return reply(
          [header("✅", "RELOADED"), `\n◈ ${mono("File")} ➜ ${mono(file + ".js")}`, `◈ ${mono("Name")} ➜ ${mono(name)}`].join("\n")
        );
      } catch (e) {
        return reply(`❌ ${mono("Reload failed")}: ${mono(e.message)}`);
      }
    }

    // 🎛️ TOGGLE ON/OFF
    if (kind === "toggle") {
      if (file === "menu") return reply(`❌ ${mono("You cannot turn OFF the menu command")}`);

      let dis = getDisabled();
      let status;

      if (dis.includes(file)) {
        // TURN ON
        try {
          await reloadOne(file, { api, models, Users, Threads, Currencies });
          dis = dis.filter((f) => f !== file);
          saveDisabled(dis);
          logAction({ action: `Command ON: ${file}`, user: event.senderID, thread: event.threadID });
          status = `🟢 ${mono(file)} ${mono("is now ON")}`;
        } catch (e) {
          return reply(`❌ ${mono("Failed to turn ON")}: ${mono(e.message)}`);
        }
      } else {
        // TURN OFF
        dis.push(file);
        saveDisabled(dis);
        unregisterCommand(file);
        logAction({ action: `Command OFF: ${file}`, user: event.senderID, thread: event.threadID });
        status = `🔴 ${mono(file)} ${mono("is now OFF")}`;
      }

      return reply(status);
    }
  }

  // ================= GROUP PICK =================
  if (handleReply.type === "groupPick") {
    const body = (event.body || "").trim().toLowerCase();
    const groups = handleReply.groups;
    const totalPages = Math.max(1, Math.ceil(groups.length / PER_PAGE));

    // PAGING
    if (["n", "next", "p", "prev"].includes(body)) {
      let page = handleReply.page + (body.startsWith("n") ? 1 : -1);
      if (page < 0 || page >= totalPages) return reply(`❌ ${mono("No more pages")}`);

      return reply(groupPageText(groups, page), (err, info) => {
        if (err) return;
        global.client.handleReply.push({
          name: module.exports.config.name,
          messageID: info.messageID,
          author: event.senderID,
          type: "groupPick",
          groups,
          page
        });
      });
    }

    // TOGGLE
    const idx = parseInt(body, 10) - 1;
    const start = handleReply.page * PER_PAGE;
    if (isNaN(idx) || idx < start || idx >= Math.min(groups.length, start + PER_PAGE))
      return reply(`❌ ${mono("Invalid number")}`);

    const g = groups[idx];
    const db = getDB();
    const wasOff = db[g.id] && db[g.id].banned;
    await setThreadBan(g.id, wasOff ? 0 : 1, Threads);

    logAction({
      action: `Group ${wasOff ? "ON" : "OFF"}: ${g.name}`,
      user: event.senderID,
      thread: event.threadID
    });

    return reply(`${wasOff ? "🟢" : "🔴"} ${g.name} ➜ ${mono(wasOff ? "ON" : "OFF")}`);
  }

  // ================= CONFIRM DELETE =================
  if (handleReply.type === "confirmDelete") {
    const ans = (event.body || "").toLowerCase().trim();
    const name = handleReply.cmdName;

    if (!["yes", "y", "no", "n"].includes(ans))
      return api.sendMessage(`👉 ${mono("Please type yes or no")}`, event.threadID);

    if (ans.startsWith("n"))
      return api.sendMessage(`❌ ${mono("Cancelled")}`, event.threadID);

    const safeName = path.basename(name, ".js");

    if (safeName === "menu")
      return api.sendMessage(`❌ ${mono("You cannot delete the menu command")}`, event.threadID);

    const filePath = path.join(COMMANDS_DIR, `${safeName}.js`);

    if (!fs.existsSync(filePath))
      return api.sendMessage(
        `❌ ${mono("File not found")}:\n${mono(filePath)}`,
        event.threadID
      );

    try {
      // BACKUP
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
      fs.copyFileSync(filePath, path.join(backupDir, `${safeName}.js`));

      // DELETE
      fs.unlinkSync(filePath);

      // VERIFY
      if (fs.existsSync(filePath))
        return api.sendMessage(
          `❌ ${mono("File was not deleted (possible permission problem)")}`,
          event.threadID
        );

      // REMOVE FROM MEMORY
      try {
        delete require.cache[require.resolve(filePath)];
      } catch (_) {}

      try {
        if (global.client && global.client.commands) {
          global.client.commands.delete(safeName);
          for (const [key, cmd] of global.client.commands) {
            if (cmd && cmd.config && cmd.config.name === safeName) global.client.commands.delete(key);
          }
        }
      } catch (_) {}

      logAction({
        action: `Deleted command: ${safeName}.js`,
        user: event.senderID,
        thread: event.threadID
      });

      return api.sendMessage(
        [header("✅", "DELETED"), `\n◈ ${mono("File")}   ➜ ${mono(safeName + ".js")}`, `◈ ${mono("Backup")} ➜ ${mono("Saved")} 💾`].join("\n"),
        event.threadID
      );
    } catch (e) {
      return api.sendMessage(`❌ ${mono("Error")}: ${mono(e.message)}`, event.threadID);
    }
  }
};
