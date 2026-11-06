const fs = require("fs");
const request = require("request");
const path = require("path");

module.exports.config = {
  name: "boxinfo",
  version: "4.1.0",
  hasPermssion: 1,
  credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  description: "View detailed group/box information",
  commandCategory: "Box",
  usages: "boxinfo",
  cooldowns: 5,
  dependencies: { request: "" },
};

const CREDIT = "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐";
const TZ = "Asia/Dhaka"; // change if your timezone is different

// ─────────────────────────────────────────
// 💾 Data (cached in memory, saved with delay)
// ─────────────────────────────────────────
const CACHE_DIR = path.join(__dirname, "cache");
const DATA_FILE = path.join(CACHE_DIR, "boxinfo_data.json");
let DB = null;
let saveTimer = null;

function loadData() {
  if (DB) return DB;
  try {
    DB = fs.existsSync(DATA_FILE)
      ? JSON.parse(fs.readFileSync(DATA_FILE, "utf8"))
      : {};
  } catch {
    DB = {};
  }
  return DB;
}

function saveNow() {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(DB || {}, null, 2), "utf8");
  } catch (e) {
    console.error("[boxinfo] save error:", e);
  }
}

function saveData() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveNow();
  }, 5000);
}

function getThread(threadID) {
  const db = loadData();
  if (!db[threadID]) {
    db[threadID] = {
      trackingSince: Date.now(),
      peakHours: {},
      trackedMessages: 0,
      lastWeeklyReport: null,
    };
    saveData();
  }
  if (!db[threadID].trackingSince) db[threadID].trackingSince = Date.now();
  return db[threadID];
}

// ─────────────────────────────────────────
// 🕒 Time helpers
// ─────────────────────────────────────────
function getHourInTZ(date = new Date()) {
  const h = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hourCycle: "h23",
    timeZone: TZ,
  }).format(date);
  return parseInt(h, 10) % 24;
}

function getWeekdayInTZ(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: TZ }).format(date);
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric", timeZone: TZ,
  });
}

// ─────────────────────────────────────────
// ⏰ Activity tracking (every message, not only on command)
// ─────────────────────────────────────────
function trackActivity(threadID) {
  const t = getThread(threadID);
  const hour = String(getHourInTZ());
  t.peakHours[hour] = (t.peakHours[hour] || 0) + 1;
  t.trackedMessages = (t.trackedMessages || 0) + 1;
  saveData();
}

function getPeakHour(threadID) {
  const peak = getThread(threadID).peakHours || {};
  const entries = Object.entries(peak);
  if (!entries.length) return "No data yet";
  const [hourStr, count] = entries.sort((a, b) => b[1] - a[1])[0];
  const hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:00 ${ampm} (${count} msgs)`;
}

function getPeakHourChart(threadID) {
  const peak = getThread(threadID).peakHours || {};
  if (!Object.keys(peak).length) return null;

  const slots = [
    ["🌅 Morning   6-12 ", [6, 7, 8, 9, 10, 11]],
    ["☀️ Afternoon 12-18", [12, 13, 14, 15, 16, 17]],
    ["🌆 Evening  18-24 ", [18, 19, 20, 21, 22, 23]],
    ["🌙 Night     0-6  ", [0, 1, 2, 3, 4, 5]],
  ];

  const totals = slots.map(([label, hours]) => [
    label,
    hours.reduce((s, h) => s + (peak[String(h)] || 0), 0),
  ]);
  const max = Math.max(...totals.map(([, n]) => n), 1);

  return totals
    .map(([label, n]) => {
      const bars = Math.round((n / max) * 8);
      return `${label}: ${"█".repeat(bars)}${"░".repeat(8 - bars)} ${n}`;
    })
    .join("\n");
}

// ─────────────────────────────────────────
// 🧮 Gender helpers
// ─────────────────────────────────────────
function normGender(g) {
  if (g === "MALE" || g === 2 || g === "2" || g === "male") return "M";
  if (g === "FEMALE" || g === 1 || g === "1" || g === "female") return "F";
  return "U";
}

function genderBar(males, females, total) {
  if (!total) return "N/A";
  let m = Math.round((males / total) * 10);
  let f = Math.round((females / total) * 10);
  while (m + f > 10) (m >= f ? m-- : f--);
  const u = 10 - m - f;
  return "♂".repeat(m) + "♀".repeat(f) + "·".repeat(u);
}

function getGroupBadge(n) {
  if (n >= 200) return "💎 MEGA GROUP";
  if (n >= 100) return "🏆 LARGE GROUP";
  if (n >= 50) return "🥈 MEDIUM GROUP";
  return "🥉 SMALL GROUP";
}

// ─────────────────────────────────────────
// 📅 Weekly report (Monday, once per day)
// ─────────────────────────────────────────
function shouldSendWeeklyReport(threadID) {
  if (getWeekdayInTZ() !== "Mon") return false;
  const last = getThread(threadID).lastWeeklyReport;
  if (!last) return true;
  return fmtDate(last) !== fmtDate(Date.now());
}

async function sendWeeklyReport(api, event, threadInfo) {
  const tid = event.threadID;
  const { threadName, participantIDs, messageCount, adminIDs } = threadInfo;
  const chart = getPeakHourChart(tid);

  const report =
    `╔══════════════════════════╗\n` +
    `║  📊 WEEKLY GROUP REPORT  ║\n` +
    `╚══════════════════════════╝\n\n` +
    `📅 Date      : ${fmtDate(Date.now())}\n` +
    `🏷️ Group     : ${threadName || "Unnamed"}\n` +
    `👥 Members   : ${participantIDs.length}\n` +
    `👑 Admins    : ${(adminIDs || []).length}\n` +
    `💬 Messages  : ${messageCount ?? getThread(tid).trackedMessages}\n` +
    `⏰ Peak Hour : ${getPeakHour(tid)}\n\n` +
    `━━━━ 📈 ACTIVITY CHART ━━━━\n` +
    (chart ? `${chart}\n` : `No activity data yet.\n`) +
    `\n✅ Group is active & running!\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⚡ Powered by ${CREDIT}`;

  api.sendMessage(report, tid, null, event.messageID);
  getThread(tid).lastWeeklyReport = Date.now();
  saveData();
}

// ─────────────────────────────────────────
// 👂 Track every message in the group
// ─────────────────────────────────────────
module.exports.handleEvent = async function ({ event }) {
  try {
    if (!event || !event.threadID) return;
    if (event.type !== "message" && event.type !== "message_reply") return;
    trackActivity(String(event.threadID));
  } catch (e) {
    console.error("[boxinfo] track error:", e);
  }
};

// ─────────────────────────────────────────
// 🚀 Main command
// ─────────────────────────────────────────
module.exports.run = async function ({ api, event }) {
  const send = (msg) => api.sendMessage(msg, event.threadID, null, event.messageID);

  try {
    const threadInfo = await api.getThreadInfo(event.threadID);
    const threadID = String(event.threadID);
    const participantIDs = threadInfo.participantIDs || [];
    const adminIDs = threadInfo.adminIDs || [];
    const userInfo = threadInfo.userInfo || [];
    const { emoji, threadName, approvalMode, imageSrc, messageCount } = threadInfo;

    // Count this command as activity too
    trackActivity(threadID);

    if (shouldSendWeeklyReport(threadID)) {
      await sendWeeklyReport(api, event, threadInfo);
    }

    // Gender (unknown = everyone we could not identify)
    let males = 0, females = 0;
    const users = Array.isArray(userInfo) ? userInfo : Object.values(userInfo);
    for (const u of users) {
      const g = normGender(u && u.gender);
      if (g === "M") males++;
      else if (g === "F") females++;
    }
    const total = participantIDs.length;
    const unknown = Math.max(0, total - males - females);
    const malePct = total ? Math.round((males / total) * 100) : 0;
    const femalePct = total ? Math.round((females / total) * 100) : 0;

    const chart = getPeakHourChart(threadID);
    const t = getThread(threadID);
    const now = new Date().toLocaleString("en-US", {
      dateStyle: "medium", timeStyle: "short", timeZone: TZ,
    });

    const body =
      `╔══════════════════════════╗\n` +
      `║   ⚙️  G R O U P  I N F O  ║\n` +
      `╚══════════════════════════╝\n\n` +
      `      ${getGroupBadge(total)}\n\n` +
      `┏━━━ 📌 BASIC INFO ━━━┓\n` +
      `┃ 🏷️ Name     : ${threadName || "Unnamed"}\n` +
      `┃ 🆔 Group ID : ${threadID}\n` +
      `┃ 😀 Emoji    : ${emoji || "None"}\n` +
      `┃ 🔐 Approval : ${approvalMode ? "✅ Enabled" : "❌ Disabled"}\n` +
      `┗━━━━━━━━━━━━━━━━━━┛\n\n` +
      `┏━━━ 👥 MEMBERS ━━━┓\n` +
      `┃ 👤 Total   : ${total}\n` +
      `┃ 👑 Admins  : ${adminIDs.length}\n` +
      `┃ ♂️ Males   : ${males} (${malePct}%)\n` +
      `┃ ♀️ Females : ${females} (${femalePct}%)\n` +
      `┃ ❓ Unknown : ${unknown}\n` +
      `┃ 📊 Ratio   : ${genderBar(males, females, total)}\n` +
      `┗━━━━━━━━━━━━━━━━━━┛\n\n` +
      `┏━━━ 💬 ACTIVITY ━━━┓\n` +
      `┃ 💬 Messages  : ${messageCount ?? "N/A"}\n` +
      `┃ ⏰ Peak Hour : ${getPeakHour(threadID)}\n` +
      `┃ 📡 Tracked   : ${t.trackedMessages || 0} msgs\n` +
      `┃ 🕐 Checked   : ${now}\n` +
      `┗━━━━━━━━━━━━━━━━━━┛\n` +
      (chart ? `\n━━━━ 📈 ACTIVITY CHART ━━━━\n${chart}\n━━━━━━━━━━━━━━━━━━━━━━━━━\n` : "") +
      `\n⚡ Powered by ${CREDIT}`;

    // ---- send (with group photo if available) ----
    if (!imageSrc) return send(body);

    const cachePath = path.join(CACHE_DIR, `boxinfo_${threadID}_${Date.now()}.png`);
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

    const cleanup = () => {
      try { if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath); } catch {}
    };

    let finished = false;
    const fail = () => {
      if (finished) return;
      finished = true;
      cleanup();
      send(body);
    };

    const ws = fs.createWriteStream(cachePath);
    request(encodeURI(imageSrc))
      .on("error", fail)
      .pipe(ws)
      .on("error", fail)
      .on("close", () => {
        if (finished) return;
        finished = true;
        api.sendMessage(
          { body, attachment: fs.createReadStream(cachePath) },
          event.threadID,
          cleanup,
          event.messageID
        );
      });
  } catch (err) {
    console.error("[boxinfo] Error:", err);
    api.sendMessage(
      "❌ Failed to fetch group info. Please try again.",
      event.threadID, null, event.messageID
    );
  }
};
