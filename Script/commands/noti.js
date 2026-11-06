const fs = require("fs");
const path = require("path");
const request = require("request");

const CMD_NAME = "noti";
const DELAY_MS = 800; // প্রতি গ্রুপের মাঝে বিরতি (ফেসবুক স্প্যাম ব্লক এড়াতে)
const TTS_LANG = "bn"; // ভয়েসের ভাষা (bn = বাংলা, en = English)
const TZ_OFFSET = 6 * 3600 * 1000; // ঢাকা সময় (UTC+6)

// ===== নোটিশ UI =====
const buildNotice = message =>
  "╔══════════════════╗\n" +
  "   👑 𝐀𝐃𝐌𝐈𝐍 𝐍𝐎𝐓𝐈𝐂𝐄 👑\n" +
  "╚══════════════════╝\n\n" +
  "👑 𝙰𝚍𝚖𝚒𝚗   : 乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐\n" +
  "📘 𝙵𝚊𝚌𝚎𝚋𝚘𝚘𝚔 : fb.com/mrjuwel444\n" +
  "💬 𝙼𝚎𝚜𝚜𝚎𝚗𝚐𝚎𝚛: m.me/mrjuwel444\n\n" +
  "┏━━━━━━━━━━━━━━━━━┓\n" +
  "   💬 𝙼𝙴𝚂𝚂𝙰𝙶𝙴\n" +
  "┗━━━━━━━━━━━━━━━━━┛\n\n" +
  message + "\n\n" +
  "━━━━━━━━━━━━━━━━━━━\n" +
  "↩️ এডমিনকে কিছু জানাতে চাইলে এই মেসেজে রিপ্লাই দিন, আমি পৌঁছে দেবো।";

const USAGE =
  "📢 noti ব্যবহার:\n\n" +
  "• noti মেসেজ → সব গ্রুপে\n" +
  "• noti -t ID1,ID2 মেসেজ → নির্দিষ্ট গ্রুপে\n" +
  "• noti -v মেসেজ → নোটিশ + ভয়েস\n" +
  "• noti at 22:30 মেসেজ → ঢাকা সময় ২২:৩০ এ\n" +
  "• noti retry → ব্যর্থ গ্রুপে আবার\n" +
  "• noti cancel → টাইমার বাতিল\n\n" +
  "💡 ছবি/ভিডিও/ভয়েস পাঠাতে সেটাতে রিপ্লাই দিয়ে noti লিখুন।\n" +
  "💡 ফ্ল্যাগ একসাথে চলে: noti -t ID -v at 22:30 মেসেজ";

module.exports.config = {
  name: CMD_NAME,
  version: "2.0.0",
  hasPermssion: 2,
  credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  description: "সব/নির্দিষ্ট গ্রুপে নোটিশ, ভয়েস, টাইমার, রিট্রাই",
  commandCategory: "sandnoto",
  usages: "[msg]",
  cooldowns: 5
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- helpers ----------
const send = (api, msg, threadID, replyTo) =>
  new Promise(resolve => {
    let done = false;
    const finish = v => { if (!done) { done = true; resolve(v); } };
    const timer = setTimeout(() => finish({ err: new Error("timeout") }), 25000);
    try {
      api.sendMessage(msg, threadID, (err, info) => {
        clearTimeout(timer);
        finish({ err, info });
      }, replyTo);
    } catch (e) {
      clearTimeout(timer);
      finish({ err: e });
    }
  });

const download = (url, dest, headers) =>
  new Promise((resolve, reject) => {
    request({ url, headers: headers || {} })
      .on("error", reject)
      .pipe(fs.createWriteStream(dest))
      .on("close", () => {
        try {
          if (fs.statSync(dest).size === 0) return reject(new Error("empty file"));
        } catch (e) { return reject(e); }
        resolve(dest);
      })
      .on("error", reject);
  });

const cacheDir = () => {
  const dir = path.join(__dirname, "cache");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

async function downloadAttachments(attachments) {
  const files = [];
  const dir = cacheDir();
  let i = 0;
  for (const att of attachments || []) {
    try {
      let ext = "";
      try { ext = path.extname(new URL(att.url).pathname); } catch (e) {}
      if (!ext) ext = att.type === "photo" ? ".jpg" : att.type === "video" ? ".mp4" : att.type === "audio" ? ".mp3" : "";
      const dest = path.join(dir, `${CMD_NAME}_${Date.now()}_${i++}${ext}`);
      await download(att.url, dest);
      files.push(dest);
    } catch (e) {
      console.log("[noti] attachment download failed:", e.message || e);
    }
  }
  return files;
}

// টেক্সট থেকে ভয়েস (Google TTS) বানায়
const splitText = (t, max = 180) => {
  const parts = [];
  let cur = "";
  for (const w of t.split(/\s+/).filter(Boolean)) {
    if ((cur + " " + w).trim().length > max) {
      if (cur) parts.push(cur);
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) parts.push(cur);
  return parts.slice(0, 5); // সর্বোচ্চ ৫ টুকরো
};

async function makeVoice(text) {
  const files = [];
  const dir = cacheDir();
  const chunks = splitText(text);
  for (let i = 0; i < chunks.length; i++) {
    try {
      const url =
        "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=" + TTS_LANG +
        "&q=" + encodeURIComponent(chunks[i]);
      const dest = path.join(dir, `${CMD_NAME}_voice_${Date.now()}_${i}.mp3`);
      await download(url, dest, { "User-Agent": "Mozilla/5.0" });
      files.push(dest);
    } catch (e) {
      console.log("[noti] voice failed:", e.message || e);
    }
  }
  return files;
}

// প্রতিবার নতুন stream (একটা stream দুইবার ব্যবহার করা যায় না)
const makeMsg = (body, files) => {
  const msg = { body };
  if (files && files.length) msg.attachment = files.map(f => fs.createReadStream(f));
  return msg;
};

const cleanup = files => (files || []).forEach(f => { try { fs.unlinkSync(f); } catch (e) {} });

// ---------- ব্রডকাস্ট ----------
let queue = Promise.resolve(); // একসাথে একটাই ব্রডকাস্ট চলবে
const enqueue = fn => (queue = queue.then(fn).catch(e => console.log("[noti] job error:", e)));

let lastJob = null;          // retry এর জন্য
const timers = new Map();    // টাইমার
let timerSeq = 0;

async function broadcast(api, job) {
  const failed = [];
  let ok = 0;
  for (const tid of job.threads) {
    let r = await send(api, makeMsg(job.text, job.files), tid);
    if (r.err) {
      await sleep(2500);
      r = await send(api, makeMsg(job.text, job.files), tid); // একবার রিট্রাই
    }
    if (r.err || !r.info) {
      failed.push(tid);
      console.log("[noti] failed:", tid, r.err && (r.err.error || r.err.message || r.err));
    } else {
      ok++;
      global.client.handleReply.push({
        name: CMD_NAME,
        type: "sendnoti",
        messageID: r.info.messageID,
        messID: job.originMsgID,
        threadID: job.originThreadID
      });
    }
    await sleep(DELAY_MS);
  }
  return { ok, failed };
}

async function runJob(ctx, job, silentStart) {
  const { api, Threads } = ctx;
  if (!silentStart) {
    api.sendMessage("⏳ " + job.threads.length + " টি গ্রুপে পাঠানো শুরু হয়েছে...", job.originThreadID);
  }
  const res = await broadcast(api, job);

  if (lastJob && lastJob !== job) cleanup(lastJob.files);
  job.failed = res.failed;
  lastJob = job;
  if (!res.failed.length) {
    cleanup(job.files);
    job.files = [];
  }

  let report = "Send to " + res.ok + " thread, not send to " + res.failed.length + " thread";
  if (res.failed.length) {
    const lines = [];
    for (const tid of res.failed.slice(0, 15)) {
      let n = "Unknown";
      try { n = (await Threads.getInfo(tid)).threadName || "Unnamed"; } catch (e) {}
      lines.push("• " + n + " (" + tid + ")");
    }
    if (res.failed.length > 15) lines.push("... আরও " + (res.failed.length - 15) + " টি");
    report += "\n\n❌ ব্যর্থ গ্রুপ:\n" + lines.join("\n") + "\n\n🔁 আবার চেষ্টা: noti retry";
  }
  api.sendMessage(report, job.originThreadID);
}

// ---------- রিপ্লাই হ্যান্ডলার ----------
module.exports.handleReply = async function ({ api, event, handleReply, Users, Threads }) {
  const { threadID, messageID, senderID, body } = event;
  const hasAtt = event.attachments && event.attachments.length > 0;

  let name = "Unknown";
  try { name = await Users.getNameUser(senderID); } catch (e) {}

  switch (handleReply.type) {
    // গ্রুপের ইউজার নোটিশের রিপ্লাই দিয়েছে -> এডমিনের কাছে
    case "sendnoti": {
      let groupName = "Unknow";
      try { groupName = (await Threads.getInfo(threadID)).threadName || "Unknow"; } catch (e) {}

      const text =
        "== User Reply ==\n\n『Reply』 : " + (body || "") +
        "\n\n\nUser Name: " + name + "\nFrom Group " + groupName;

      const files = hasAtt ? await downloadAttachments(event.attachments) : [];
      const { err, info } = await send(api, makeMsg(text, files), handleReply.threadID);
      cleanup(files);

      if (err || !info) {
        console.log("[noti] reply forward failed:", err);
        return;
      }
      global.client.handleReply.push({
        name: CMD_NAME,
        type: "reply",
        messageID: info.messageID,
        messID: messageID,
        threadID: threadID
      });
      break;
    }

    // এডমিন ইউজারের রিপ্লাইয়ের উত্তর দিয়েছে -> গ্রুপে
    case "reply": {
      const text = buildNotice(body || "");

      const files = hasAtt ? await downloadAttachments(event.attachments) : [];
      let { err, info } = await send(api, makeMsg(text, files), handleReply.threadID, handleReply.messID);
      if (err) {
        ({ err, info } = await send(api, makeMsg(text, files), handleReply.threadID));
      }
      cleanup(files);

      if (err || !info) {
        console.log("[noti] admin reply failed:", err);
        return;
      }
      global.client.handleReply.push({
        name: CMD_NAME,
        type: "sendnoti",
        messageID: info.messageID,
        threadID: threadID
      });
      break;
    }
  }
};

// ---------- কমান্ড ----------
module.exports.run = async function ({ api, event, args, Users, Threads }) {
  const { threadID, messageID, messageReply } = event;
  const ctx = { api, Users, Threads };
  const a = [...args];
  const sub = (a[0] || "").toLowerCase();

  // noti retry
  if (sub === "retry") {
    if (!lastJob || !lastJob.failed || !lastJob.failed.length) {
      return api.sendMessage("ℹ️ আবার পাঠানোর মতো ব্যর্থ গ্রুপ নেই।", threadID, messageID);
    }
    const job = lastJob;
    job.threads = [...job.failed];
    job.originThreadID = threadID;
    job.originMsgID = messageID;
    return enqueue(() => runJob(ctx, job));
  }

  // noti cancel
  if (sub === "cancel") {
    let n = 0;
    for (const [, t] of timers) {
      clearTimeout(t.timer);
      cleanup(t.job.files);
      n++;
    }
    timers.clear();
    return api.sendMessage("🛑 " + n + " টি টাইমার বাতিল করা হয়েছে।", threadID, messageID);
  }

  // ফ্ল্যাগ পার্স
  let targets = null;
  let voice = false;
  let atTime = null;
  while (a.length) {
    const t = a[0].toLowerCase();
    if (t === "-v" || t === "-voice") {
      voice = true; a.shift();
    } else if (t === "-t" && a[1]) {
      targets = a[1].split(",").map(s => s.trim()).filter(Boolean);
      a.splice(0, 2);
    } else if (t === "at" && /^\d{1,2}:\d{2}$/.test(a[1] || "")) {
      atTime = a[1];
      a.splice(0, 2);
    } else break;
  }

  const message = a.join(" ").trim();
  const replyAtt =
    event.type == "message_reply" && messageReply && messageReply.attachments && messageReply.attachments.length
      ? messageReply.attachments
      : [];

  if (!message && !replyAtt.length) return api.sendMessage(USAGE, threadID, messageID);
  if (voice && !message) {
    return api.sendMessage("⚠️ ভয়েস বানাতে মেসেজ লিখতে হবে।\n\n" + USAGE, threadID, messageID);
  }

  // টাইমার সময় হিসাব (ঢাকা সময়)
  let delay = 0;
  let whenText = "";
  if (atTime) {
    const [H, M] = atTime.split(":").map(Number);
    if (H > 23 || M > 59) return api.sendMessage("⚠️ সময় ভুল। উদাহরণ: 22:30", threadID, messageID);
    const nd = new Date(Date.now() + TZ_OFFSET);
    let target = Date.UTC(nd.getUTCFullYear(), nd.getUTCMonth(), nd.getUTCDate(), H, M) - TZ_OFFSET;
    if (target <= Date.now()) target += 24 * 3600 * 1000;
    delay = target - Date.now();
    const hh = String(H).padStart(2, "0");
    const mm = String(M).padStart(2, "0");
    whenText = hh + ":" + mm;
  }

  // ফাইল তৈরি: রিপ্লাই করা অ্যাটাচমেন্ট + ভয়েস
  let files = [];
  if (replyAtt.length) files = await downloadAttachments(replyAtt);
  if (voice) files = files.concat(await makeVoice(message));

  const threads = targets ? targets : [...(global.data.allThreadID || [])];
  if (!threads.length) {
    cleanup(files);
    return api.sendMessage("⚠️ কোনো গ্রুপ পাওয়া যায়নি।", threadID, messageID);
  }

  const job = {
    text: buildNotice(message),
    files,
    threads,
    failed: [],
    originThreadID: threadID,
    originMsgID: messageID
  };

  if (voice && !files.length) {
    api.sendMessage("⚠️ ভয়েস বানানো যায়নি, শুধু নোটিশ পাঠানো হচ্ছে।", threadID);
  }

  if (atTime) {
    const id = ++timerSeq;
    const timer = setTimeout(() => {
      timers.delete(id);
      enqueue(() => runJob(ctx, job, true));
    }, delay);
    timers.set(id, { timer, job });
    const mins = Math.round(delay / 60000);
    return api.sendMessage(
      "⏰ নোটিশ সেট হয়েছে: ঢাকা সময় " + whenText + " এ (" + mins + " মিনিট পর) " +
        threads.length + " টি গ্রুপে যাবে।\n⚠️ বট রিস্টার্ট হলে টাইমার মুছে যায়।",
      threadID,
      messageID
    );
  }

  return enqueue(() => runJob(ctx, job));
};
