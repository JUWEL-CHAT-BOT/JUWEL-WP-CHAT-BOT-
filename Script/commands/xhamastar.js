const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const API = "https://eryxenx.agi.bd/api/xhamstar";
const MAX_CARDS = 6;
const MAX_UPLOAD_MB = 25;
const DEFAULT_QUALITY = "worst";
const CACHE_DIR = path.join(__dirname, "cache");

const CREDIT = "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐";

// bot message ID -> { author, results }
const sessions = new Map();
// already-processed reply events (prevents double download)
const handled = new Set();

/* ───────────── UI helpers ───────────── */
const TOP = "╔═══════════════════╗";
const BOT = "╚═══════════════════╝";
const LINE = "━━━━━━━━━━━━━━━━━━━━";

const box = (title, content) =>
  `${TOP}\n   ${title}\n${BOT}\n\n${content}\n\n${LINE}\n👑 ${CREDIT}`;

/* ───────────── Utils ───────────── */
function react(api, emoji, messageID) {
  try { api.setMessageReaction(emoji, messageID, () => {}, true); } catch (_) {}
}

function send(api, msg, threadID, messageID) {
  return new Promise(resolve => {
    api.sendMessage(msg, threadID, (err, info) => resolve({ err, info }), messageID);
  });
}

function formatDuration(value) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string" && /[:a-zA-Z]/.test(value)) return value.trim();
  const total = Math.floor(Number(value));
  if (!Number.isFinite(total) || total <= 0) return "";
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = n => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

async function getStreamFromURL(url) {
  const res = await axios.get(url, { responseType: "stream", timeout: 30000 });
  return res.data;
}

async function apiSearch(query) {
  const res = await axios.get(`${API}/search`, {
    params: { q: query, limit: 10 },
    timeout: 60000
  });
  return res.data;
}

async function apiDownload(url, quality, dest) {
  const res = await axios.get(`${API}/download`, {
    params: { url, quality },
    responseType: "stream",
    timeout: 900000
  });
  const title = res.headers["x-video-title"] || "Video";
  await new Promise((resolve, reject) => {
    const out = fs.createWriteStream(dest);
    res.data.pipe(out);
    out.on("finish", resolve);
    out.on("error", reject);
    res.data.on("error", reject);
  });
  return { dest, title };
}

/* ───────────── Mirai module ───────────── */
module.exports.config = {
  name: "xhamstar",
  version: "1.1.0",
  hasPermssion: 3,
  credits: CREDIT,
  description: "Search and download videos via the xhamster_api service",
  commandCategory: "media",
  usages:
    "xhamstar search <query>\n" +
    "xhamstar <query>\n" +
    "xhamstar <video url> [worst|half|best|720|1080] (default: worst)",
  cooldowns: 5,
  dependencies: {
    "axios": "",
    "fs-extra": ""
  }
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const list = args || [];
  const first = list[0] || "";

  if (/^https?:\/\//i.test(first)) {
    return doDownload({
      api, event,
      url: first,
      quality: list[1] || DEFAULT_QUALITY
    });
  }

  const input = list.join(" ").trim();
  if (!input) {
    return api.sendMessage(
      box("🎬 𝗫𝗛𝗔𝗠𝗦𝗧𝗔𝗥", "📌 Usage:\n• xhamstar search <query>\n• xhamstar <query>\n• xhamstar <url> [quality]"),
      threadID, messageID
    );
  }

  const query = input.toLowerCase().startsWith("search") ? input.slice(6).trim() : input;
  if (!query) return api.sendMessage(box("⚠️ 𝗘𝗥𝗥𝗢𝗥", "Empty search query."), threadID, messageID);

  return doSearch({ api, event, query });
};

/* ───────────── Reply handling ───────────── */
async function processReply({ api, event, session, repliedID }) {
  const { threadID, messageID, senderID } = event;

  if (handled.has(messageID)) return;
  if (senderID !== session.author) return;

  const body = (event.body || "").trim();
  const n = body.match(/^(\d+)$/);
  const d = body.match(/^download(?:\s+(\S+))?$/i);
  if (!n && !d) return;

  handled.add(messageID);
  setTimeout(() => handled.delete(messageID), 60000);

  const results = session.results || [];
  if (!results.length) {
    return api.sendMessage(box("⚠️ 𝗘𝗥𝗥𝗢𝗥", "No result to download."), threadID, messageID);
  }

  let url, quality = DEFAULT_QUALITY;

  if (n) {
    const index = parseInt(n[1], 10);
    if (index < 1 || index > results.length) {
      handled.delete(messageID);
      return api.sendMessage(
        box("⚠️ 𝗜𝗡𝗩𝗔𝗟𝗜𝗗", `Choose a number from 1 to ${results.length}.`),
        threadID, messageID
      );
    }
    url = results[index - 1].url;
  } else {
    url = results[0].url;
    quality = d[1] || DEFAULT_QUALITY;
  }

  // remove the search list message + session
  try { api.unsendMessage(repliedID); } catch (_) {}
  sessions.delete(repliedID);
  try {
    const i = global.client.handleReply.findIndex(x => x.messageID === repliedID);
    if (i !== -1) global.client.handleReply.splice(i, 1);
  } catch (_) {}

  return doDownload({ api, event, url, quality });
}

// Standard Mirai reply hook
module.exports.handleReply = async function ({ api, event, handleReply }) {
  const session = sessions.get(handleReply.messageID) || handleReply;
  return processReply({ api, event, session, repliedID: handleReply.messageID });
};

// Fallback hook: catches replies even if the framework's handleReply doesn't fire
module.exports.handleEvent = async function ({ api, event }) {
  if (event.type !== "message_reply" || !event.messageReply) return;
  const repliedID = event.messageReply.messageID;
  const session = sessions.get(repliedID);
  if (!session) return;
  return processReply({ api, event, session, repliedID });
};

/* ───────────── Search ───────────── */
async function doSearch({ api, event, query }) {
  const { threadID, messageID, senderID } = event;
  const r = emoji => react(api, emoji, messageID);

  r("⏳");

  let data;
  try {
    data = await apiSearch(query);
  } catch (e) {
    r("❌");
    return api.sendMessage(
      box("❌ 𝗦𝗘𝗔𝗥𝗖𝗛 𝗙𝗔𝗜𝗟𝗘𝗗", e.response?.data?.error || e.message),
      threadID, messageID
    );
  }

  if (!data || !data.ok) {
    r("❌");
    return api.sendMessage(
      box("❌ 𝗦𝗘𝗔𝗥𝗖𝗛 𝗙𝗔𝗜𝗟𝗘𝗗", (data && data.error) || "Unknown error"),
      threadID, messageID
    );
  }

  const results = data.results || [];
  if (!results.length) {
    r("❌");
    return api.sendMessage(box("🔎 𝗡𝗢 𝗥𝗘𝗦𝗨𝗟𝗧", "No results found."), threadID, messageID);
  }

  const shown = results.slice(0, MAX_CARDS);
  const lines = shown.map((x, i) => {
    const title = (x.title || "Untitled").slice(0, 120);
    const duration = formatDuration(x.duration);
    return `🎞️ ${i + 1}. ${title}` + (duration ? `\n     ⏱️ ${duration}` : "");
  });

  const content =
    `🔎 Results for "${query}"\n${LINE}\n` +
    lines.join("\n\n") +
    `\n${LINE}\n💬 Reply to this message:\n` +
    `• Video number (1-${shown.length}) → download\n` +
    `• "download [quality]" → download the first one`;

  const body = box("🎬 𝗫𝗛𝗔𝗠𝗦𝗧𝗔𝗥 𝗦𝗘𝗔𝗥𝗖𝗛", content);

  const attachment = [];
  for (const x of shown) {
    if (!x.thumbnail) continue;
    try { attachment.push(await getStreamFromURL(x.thumbnail)); } catch (_) {}
  }

  const { err, info } = await send(
    api,
    attachment.length ? { body, attachment } : { body },
    threadID,
    messageID
  );

  if (err || !info) {
    r("❌");
    return;
  }

  const session = { author: senderID, results: shown };
  sessions.set(info.messageID, session);
  setTimeout(() => sessions.delete(info.messageID), 10 * 60 * 1000);

  global.client.handleReply.push({
    name: module.exports.config.name,
    messageID: info.messageID,
    author: senderID,
    results: shown
  });

  r("✅");
}

/* ───────────── Download ───────────── */
async function doDownload({ api, event, url, quality }) {
  const { threadID, messageID } = event;
  const r = emoji => react(api, emoji, messageID);

  r("⏳");
  fs.ensureDirSync(CACHE_DIR);
  const dest = path.join(CACHE_DIR, `xh_${Date.now()}.mp4`);

  try {
    const { title } = await apiDownload(url, quality, dest);
    const sizeMB = fs.statSync(dest).size / (1024 * 1024);

    if (sizeMB > MAX_UPLOAD_MB) {
      r("❌");
      return api.sendMessage(
        box(
          "⚠️ 𝗧𝗢𝗢 𝗟𝗔𝗥𝗚𝗘",
          `File size: ${sizeMB.toFixed(1)} MB\nLimit: ${MAX_UPLOAD_MB} MB\n\nTry a lower quality (worst / half).`
        ),
        threadID, messageID
      );
    }

    const content =
      `🎞️ Title: ${title}\n` +
      `📦 Size: ${sizeMB.toFixed(1)} MB\n` +
      `🎚️ Quality: ${quality}`;

    await send(
      api,
      {
        body: box("✅ 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗 𝗖𝗢𝗠𝗣𝗟𝗘𝗧𝗘", content),
        attachment: fs.createReadStream(dest)
      },
      threadID,
      messageID
    );
    r("✅");
  } catch (e) {
    r("❌");
    api.sendMessage(
      box("❌ 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗 𝗙𝗔𝗜𝗟𝗘𝗗", e.response?.data?.error || e.message),
      threadID, messageID
    );
  } finally {
    try { if (fs.existsSync(dest)) fs.unlinkSync(dest); } catch (_) {}
  }
}
