const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage, registerFont } = require("canvas");

/* ───────────── ফন্ট (নেই থাকলে নিজে ডাউনলোড করে নেবে) ───────────── */
const fontDir = path.join(__dirname, "fonts");
if (!fs.existsSync(fontDir)) fs.mkdirSync(fontDir, { recursive: true });

const FONT_BASE =
  "https://github.com/notofonts/notofonts.github.io/raw/main/fonts";
const FONT_LIST = [
  ["NotoSans", "Noto Sans"],
  ["NotoSansBengali", "Noto Sans Bengali"],
  ["NotoSansDevanagari", "Noto Sans Devanagari"],
  ["NotoSansGurmukhi", "Noto Sans Gurmukhi"]
];

let fontsReady = null;
function ensureFonts() {
  if (fontsReady) return fontsReady;
  fontsReady = (async () => {
    for (const [name, family] of FONT_LIST) {
      for (const [style, weight] of [["Regular", "normal"], ["Bold", "bold"]]) {
        const file = `${name}-${style}.ttf`;
        const fp = path.join(fontDir, file);
        try {
          const ok = fs.existsSync(fp) && fs.statSync(fp).size > 10000;
          if (!ok) {
            const { data } = await axios.get(
              `${FONT_BASE}/${name}/hinted/ttf/${file}`,
              { responseType: "arraybuffer", timeout: 60000 }
            );
            fs.writeFileSync(fp, Buffer.from(data));
          }
          registerFont(fp, { family, weight });
        } catch (e) {
          console.log(`[song] ফন্ট লোড হয়নি: ${file} → ${e.message}`);
        }
      }
    }
  })();
  return fontsReady;
}
ensureFonts(); // বট চালু হওয়ার সময়ই ব্যাকগ্রাউন্ডে শুরু

const FONT =
  '"Noto Sans", "Noto Sans Bengali", "Noto Sans Devanagari", "Noto Sans Gurmukhi", sans-serif';

const CREDIT = "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐";
const COOLDOWN = 2 * 60 * 1000; // ২ মিনিট
const SELECT_TIMEOUT = 20 * 1000; // ২০ সেকেন্ড
const MAX_RESULTS = 5;
const PRELOAD_COUNT = 2; // কতগুলো গান আগে থেকে রেডি করা হবে (সার্ভারে চাপ পড়লে ৩ করো)
const SEARCH_TIMEOUT = 60 * 1000; // সার্চ API-র জন্য ৬০ সেকেন্ড (সার্ভার ঘুমিয়ে থাকলে জাগতে সময় লাগে)
const SEARCH_RETRIES = 2; // মোট কয়বার চেষ্টা করবে
const cooldowns = new Map();

const cacheDir = path.join(__dirname, "cache");
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

let apiCache = { url: null, time: 0 };
const ytapi = async () => {
  if (apiCache.url && Date.now() - apiCache.time < 5 * 60 * 1000)
    return apiCache.url;
  const api = await axios.get(
    "https://gitlab.com/shahadat-sahu/sahu-api/-/raw/main/API.json",
    { timeout: 15000 }
  );
  apiCache = { url: api.data.ytapi, time: Date.now() };
  return apiCache.url;
};

module.exports.config = {
  name: "song",
  aliases: ["music", "songs", "gan"],
  version: "2.5.0",
  credits: CREDIT,
  countDown: 0,
  hasPermssion: 0,
  description: "YouTube music downloader",
  category: "media",
  commandCategory: "media",
  usePrefix: true,
  usages: "{pn} song name"
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const safeUnsend = (api, id) => {
  if (!id) return;
  try {
    const p = api.unsendMessage(id);
    if (p && p.catch) p.catch(() => {});
  } catch (e) {}
};
const cleanup = files =>
  setTimeout(() => {
    files.forEach(f => {
      try {
        if (f && fs.existsSync(f)) fs.unlinkSync(f);
      } catch (e) {}
    });
  }, 15000);

async function saveToFile(url, file, timeout = 120000) {
  const res = await axios.get(url, { responseType: "stream", timeout });
  await new Promise((resolve, reject) => {
    const w = fs.createWriteStream(file);
    const timer = setTimeout(() => {
      res.data.destroy();
      w.destroy();
      reject(new Error("ফাইল ডাউনলোডে অনেক সময় লাগছে"));
    }, timeout);
    const fail = e => {
      clearTimeout(timer);
      reject(e);
    };
    res.data.pipe(w);
    w.on("finish", () => {
      clearTimeout(timer);
      resolve();
    });
    w.on("error", fail);
    res.data.on("error", fail);
  });
}

function getThumb(song) {
  const id = song.videoId || song.id;
  return (
    song.thumbnail ||
    song.thumbnails?.[0]?.url ||
    song.thumb ||
    (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null)
  );
}

function formatLeft(ms) {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m} মিনিট ${sec} সেকেন্ড` : `${sec} সেকেন্ড`;
}

/* ───────────── গানের সময় ফরম্যাট ───────────── */
function formatDuration(d) {
  if (d === undefined || d === null || d === "") return "N/A";

  if (typeof d === "object") {
    d = d.timestamp || d.text || d.seconds || d.duration || null;
    if (d === null) return "N/A";
  }

  // সেকেন্ড হিসেবে সংখ্যা এলে (যেমন 215)
  if (typeof d === "number" || /^\d+(\.\d+)?$/.test(String(d).trim())) {
    const total = Math.floor(Number(d));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = n => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  }

  // আগে থেকেই "3:45" ফরম্যাটে থাকলে
  return String(d);
}

/* ───────────── ভিউ ফরম্যাট ───────────── */
const formatViews = v => {
  if (v === undefined || v === null || v === "") return "";
  if (typeof v === "string" && /[a-zA-Z]/.test(v)) return v; // আগে থেকেই "51M views" হলে
  const n = Number(String(v).replace(/[^\d.]/g, ""));
  if (!n) return "";
  let out;
  if (n >= 1e9) out = (n / 1e9).toFixed(1).replace(".0", "") + "B";
  else if (n >= 1e6) out = Math.round(n / 1e6) + "M";
  else if (n >= 1e3) out = Math.round(n / 1e3) + "K";
  else out = String(n);
  return out + " views";
};

/* ───────────── সার্চ (রিট্রাই + ব্যাকআপ) ───────────── */
// ১) আগে sahu-api দিয়ে সার্চ, ২ বার চেষ্টা করবে
// ২) তাও ব্যর্থ হলে yt-search প্যাকেজ থাকলে সেটা দিয়ে সার্চ (npm i yt-search)
async function searchSongs(query) {
  let lastErr = null;

  for (let attempt = 1; attempt <= SEARCH_RETRIES; attempt++) {
    try {
      const API = await ytapi();
      const { data } = await axios.get(`${API}/api/search`, {
        params: { q: query, limit: 15 },
        timeout: SEARCH_TIMEOUT
      });
      if (data && Array.isArray(data.results) && data.results.length)
        return data.results;
      throw new Error("কোনো গান পাওয়া যায়নি");
    } catch (e) {
      lastErr = e;
      console.log(`[song] সার্চ চেষ্টা ${attempt} ব্যর্থ: ${e.message}`);
      apiCache = { url: null, time: 0 }; // পরেরবার API লিংক নতুন করে আনবে
      if (attempt < SEARCH_RETRIES) await sleep(1500);
    }
  }

  // ব্যাকআপ: yt-search
  try {
    const yts = require("yt-search");
    const r = await yts(query);
    const videos = (r.videos || []).slice(0, 15);
    if (videos.length) {
      console.log("[song] yt-search দিয়ে রেজাল্ট আনা হয়েছে");
      return videos;
    }
  } catch (e) {
    console.log("[song] yt-search ব্যাকআপ কাজ করেনি:", e.message);
  }

  throw lastErr || new Error("সার্চ ব্যর্থ");
}

/* ───────────── ক্যানভাস হেল্পার ───────────── */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, maxW, maxLines) {
  const words = String(text).split(" ");
  const lines = [];
  let line = "";
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + " " + words[i] : words[i];
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = words[i];
      if (lines.length === maxLines - 1) {
        line = words.slice(i).join(" ");
        break;
      }
    } else line = test;
  }
  lines.push(line);

  // শেষ লাইন বেশি লম্বা হলে ... দিয়ে কাটা
  let last = lines[lines.length - 1];
  if (ctx.measureText(last).width > maxW) {
    while (last.length > 1 && ctx.measureText(last + "…").width > maxW)
      last = last.slice(0, -1);
    lines[lines.length - 1] = last + "…";
  }
  return lines.slice(0, maxLines);
}

/* ───────────── ৫টা গানের লিস্ট একটা ছবিতে ───────────── */
async function makeListImage(songs, outFile) {
  await ensureFonts();
  const W = 720,
    ROW = 168,
    PAD = 12;
  const canvas = createCanvas(W, ROW * songs.length + PAD);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0f0f0f";
  ctx.fillRect(0, 0, W, canvas.height);

  for (let i = 0; i < songs.length; i++) {
    const s = songs[i];
    const y = PAD + i * ROW + 6;
    const tx = 50,
      tw = 248,
      th = 140;

    // নম্বর
    ctx.fillStyle = "#aaaaaa";
    ctx.font = `bold 22px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(String(i + 1), 24, y + th / 2 + 8);
    ctx.textAlign = "left";

    // থাম্বনেইল
    try {
      const url = getThumb(s);
      const { data } = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 5000
      });
      const img = await loadImage(Buffer.from(data));
      ctx.save();
      roundRect(ctx, tx, y, tw, th, 12);
      ctx.clip();
      const scale = Math.max(tw / img.width, th / img.height);
      const dw = img.width * scale,
        dh = img.height * scale;
      ctx.drawImage(img, tx + (tw - dw) / 2, y + (th - dh) / 2, dw, dh);
      ctx.restore();
    } catch (e) {
      ctx.fillStyle = "#272727";
      roundRect(ctx, tx, y, tw, th, 12);
      ctx.fill();
    }

    // সময়ের ব্যাজ
    const dur = formatDuration(s.duration ?? s.timestamp ?? s.duration_seconds);
    ctx.font = `bold 16px ${FONT}`;
    const bw = ctx.measureText(dur).width + 14;
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    roundRect(ctx, tx + tw - bw - 8, y + th - 30, bw, 22, 6);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(dur, tx + tw - bw - 1, y + th - 13);

    // টাইটেল (২ লাইন)
    const x2 = tx + tw + 20;
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 20px ${FONT}`;
    const lines = wrapText(ctx, s.title || "Unknown", W - x2 - 20, 2);
    lines.forEach((l, k) => ctx.fillText(l, x2, y + 26 + k * 25));

    // চ্যানেল
    const ch = s.channel?.name || s.channel || s.author?.name || "Unknown";
    ctx.fillStyle = "#aaaaaa";
    ctx.font = `bold 17px ${FONT}`;
    ctx.fillText(String(ch).slice(0, 28), x2, y + 92);

    // ভিউ • কতদিন আগে
    const views = formatViews(s.views ?? s.view_count ?? s.viewCount);
    const ago = s.published || s.ago || s.uploaded || s.uploadedAt || "";
    const meta = [views, ago].filter(Boolean).join(" • ");
    ctx.font = `16px ${FONT}`;
    ctx.fillText(meta, x2, y + 118);
  }

  fs.writeFileSync(outFile, canvas.toBuffer("image/png"));
}

/* ───────────── জব তৈরি + অপেক্ষা (প্রিলোডেও ব্যবহার হয়) ───────────── */
async function createJob(song) {
  const API = await ytapi();

  const { data: job } = await axios.post(
    `${API}/api/download`,
    { url: song.url, format: "mp3" },
    { timeout: 60000 }
  );
  const jobId = job?.job_id || job?.id;
  if (!jobId) {
    console.log("[song] job রেসপন্স:", JSON.stringify(job).slice(0, 300));
    throw new Error("ডাউনলোড জব তৈরি হয়নি");
  }

  const deadline = Date.now() + 3 * 60 * 1000; // সর্বোচ্চ ৩ মিনিট
  let i = 0;
  while (Date.now() < deadline) {
    const { data: status } = await axios.get(`${API}/api/jobs/${jobId}`, {
      timeout: 15000
    });
    const st = String(status.status || "").toLowerCase();

    if (st === "failed" || st === "error") {
      console.log("[song] job failed:", JSON.stringify(status).slice(0, 300));
      throw new Error("এই গানটি ডাউনলোড করা যায়নি");
    }

    const fileUrl = status.file_url || status.download_url || status.url;
    if (
      ["completed", "done", "success", "finished"].includes(st) &&
      fileUrl
    )
      return { API, result: { ...status, file_url: fileUrl } };

    await sleep(i++ < 10 ? 300 : 700);
  }
  console.log("[song] job timeout:", song.url);
  throw new Error("সার্ভার থেকে গান আসতে অনেক দেরি হচ্ছে");
}

/* ───────────── গান ডাউনলোড ───────────── */
async function downloadSong(api, event, song, prefetched) {
  let data = null;
  if (prefetched) {
    try {
      // প্রিলোড ৬০ সেকেন্ডের বেশি আটকে থাকলে নতুন করে চেষ্টা
      data = await Promise.race([
        prefetched,
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error("prefetch timeout")), 60000)
        )
      ]);
    } catch (e) {
      console.log("[song] প্রিলোড ফেল:", e.message);
      data = null;
    }
  }
  if (!data) data = await createJob(song);

  const { API, result } = data;
  const url = result.file_url.startsWith("/")
    ? `${API}${result.file_url}`
    : result.file_url;

  const file = path.join(cacheDir, `song_${Date.now()}_${event.senderID}.mp3`);
  await saveToFile(url, file, 120000);
  if (!fs.existsSync(file) || fs.statSync(file).size < 1000)
    throw new Error("ফাইল ঠিকমতো ডাউনলোড হয়নি");

  return {
    file,
    title: result.title || song.title || "Unknown",
    duration: result.duration
  };
}

/* ───────────── কমান্ড রান ───────────── */
module.exports.run = async ({ api, event, args }) => {
  const { threadID, messageID, senderID } = event;

  if (!args.length)
    return api.sendMessage(
      "🎵 গানের নাম লিখুন!\n\n📌 উদাহরণ: song tum hi ho",
      threadID,
      messageID
    );

  const last = cooldowns.get(senderID);
  if (last && Date.now() - last < COOLDOWN) {
    const left = COOLDOWN - (Date.now() - last);
    return api.sendMessage(
      `⏳ একটু অপেক্ষা করুন!\n\nআবার কমান্ড দিতে পারবেন: ${formatLeft(left)} পর`,
      threadID,
      messageID
    );
  }
  cooldowns.set(senderID, Date.now());

  const query = args.join(" ");

  const searchMsg = await api.sendMessage(
    `🔎 ইউটিউব থেকে তোমার গান সার্চ করা হচ্ছে...\n\n🎶 "${query}"\n⏳ একটু অপেক্ষা করো`,
    threadID,
    messageID
  );

  const thumbFiles = [];
  try {
    const results = await searchSongs(query);

    const seen = new Set();
    const songs = results
      .filter(s => {
        const id = s.videoId || s.id || s.url;
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .slice(0, MAX_RESULTS);

    if (!songs.length) throw new Error("কোনো গান পাওয়া যায়নি");

    // সার্চ রেজাল্ট পাওয়ার সাথেই ব্যাকগ্রাউন্ডে জব শুরু (ছবি বানানোর সাথে একসাথে চলবে)
    const jobs = songs.map((s, i) => {
      if (i >= PRELOAD_COUNT) return null;
      const p = createJob(s);
      p.catch(() => {}); // এরর হলে ক্র্যাশ যেন না করে
      return p;
    });

    // ৫টা গানের লিস্ট একটা ছবিতে
    const stamp = Date.now();
    const listImg = path.join(cacheDir, `list_${stamp}_${senderID}.png`);
    await makeListImage(songs, listImg);
    thumbFiles.push(listImg);

    const body = `🎵 "${query}" এর রেজাল্ট

📩 গান পেতে এই মেসেজে রিপ্লাই করে
🔢 1-${songs.length} নম্বর লিখুন
⏰ ২০ সেকেন্ডের মধ্যে সিলেক্ট করুন
━━━━━━━━━━━━━━━━━━
👑 ${CREDIT}`;

    const msg = { body, attachment: fs.createReadStream(listImg) };

    api.sendMessage(msg, threadID, (err, info) => {
      safeUnsend(api, searchMsg?.messageID);
      cleanup(thumbFiles);
      if (err || !info) return;

      const entry = {
        name: "song",
        messageID: info.messageID,
        commandMessageID: messageID, // 👈 আপনার মূল কমান্ড মেসেজ (গান এটাতেই রিপ্লাই হবে)
        author: senderID,
        results: songs,
        jobs,
        busy: false
      };
      global.client.handleReply.push(entry);

      // ২০ সেকেন্ডে সিলেক্ট না করলে লিস্ট ডিলিট
      setTimeout(() => {
        const list = global.client.handleReply;
        const idx = list.findIndex(h => h.messageID === info.messageID);
        if (idx === -1) return; // আগেই সিলেক্ট হয়ে গেছে
        if (entry.busy) return; // ডাউনলোড চলছে, ডিলিট করা যাবে না
        list.splice(idx, 1);
        safeUnsend(api, info.messageID);
      }, SELECT_TIMEOUT);
    });
  } catch (error) {
    safeUnsend(api, searchMsg?.messageID);
    cleanup(thumbFiles);
    cooldowns.delete(senderID);
    const reason = /timeout/i.test(error.message)
      ? "সার্চ সার্ভার সাড়া দিচ্ছে না, একটু পরে আবার চেষ্টা করুন।"
      : error.response?.data?.error?.message || error.message;
    return api.sendMessage(
      `⚠️ সার্চ ব্যর্থ হয়েছে\n${reason}`,
      threadID,
      messageID
    );
  }
};

/* ───────────── নম্বর রিপ্লাই ───────────── */
module.exports.handleReply = async ({ api, event, handleReply }) => {
  const { threadID, messageID, senderID } = event;

  const choice = parseInt(String(event.body || "").trim(), 10);

  // অন্য কেউ রিপ্লাই করলে নোটিশ
  if (senderID !== handleReply.author) {
    if (!isNaN(choice))
      return api.sendMessage(
        `🚫 এটা তোমার কমান্ড না!\n\n⚠️ শুধু যে কমান্ড দিয়েছে সে-ই গান সিলেক্ট করতে পারবে।\n🎵 নিজে গান পেতে নিজে কমান্ড দাও।`,
        threadID,
        messageID
      );
    return;
  }

  if (isNaN(choice) || choice < 1 || choice > handleReply.results.length)
    return api.sendMessage(
      `❌ ভুল নম্বর! 1 থেকে ${handleReply.results.length} এর মধ্যে লিখুন।`,
      threadID,
      messageID
    );

  if (handleReply.busy) return;
  handleReply.busy = true;

  const song = handleReply.results[choice - 1];
  const waitMsg = await api.sendMessage(
    `⏳ গান আনা হচ্ছে...\n\n🎼 ${song.title || "Unknown"}\n🚀 একটু অপেক্ষা করুন`,
    threadID,
    messageID
  );

  let file;
  try {
    const res = await downloadSong(
      api,
      event,
      song,
      handleReply.jobs?.[choice - 1]
    );
    file = res.file;

    const dur = formatDuration(
      song.duration ?? song.timestamp ?? song.duration_seconds ?? res.duration
    );

    const body = `╭━━━━━━━━━━━━━━━━━━╮
   ${CREDIT}
╰━━━━━━━━━━━━━━━━━━╯
🎼 ${res.title}
👤 ${song.channel?.name || song.channel || song.author?.name || "Unknown"}
⏱️ সময়: ${dur}
🎚️ MP3 • 192kbps
━━━━━━━━━━━━━━━━━━
👑 ${CREDIT}`;

    api.sendMessage(
      { body, attachment: fs.createReadStream(file) },
      threadID,
      err => {
        safeUnsend(api, waitMsg?.messageID);
        cleanup([file]);
        if (err) {
          console.log("[song] পাঠাতে সমস্যা:", err);
          handleReply.busy = false;
          return api.sendMessage(
            `❌ গান পাঠানো যায়নি\n\n${
              err.message || err.error || "অজানা সমস্যা"
            }\n\n🔁 আবার নম্বর দিয়ে রিপ্লাই করুন।`,
            threadID
          );
        }
        safeUnsend(api, handleReply.messageID);
        const list = global.client.handleReply;
        const idx = list.findIndex(h => h.messageID === handleReply.messageID);
        if (idx !== -1) list.splice(idx, 1);
      },
      handleReply.commandMessageID || messageID // 👈 মূল কমান্ড মেসেজে রিপ্লাই হবে
    );
  } catch (error) {
    console.log("[song] ডাউনলোড এরর:", error.message);
    handleReply.busy = false;
    safeUnsend(api, waitMsg?.messageID);
    cleanup([file]);
    return api.sendMessage(
      `❌ ডাউনলোড ব্যর্থ\n\n${error.message}\n\n🔁 অন্য একটি নম্বর দিয়ে রিপ্লাই করুন।`,
      threadID,
      messageID
    );
  }
};
