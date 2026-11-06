const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { execFile } = require("child_process");

module.exports = {
  config: {
    name: "autodl",
    version: "4.0.0",
    hasPermssion: 0,
    credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
    description: "Auto Video/MP3 Downloader (multi-link)",
    commandCategory: "media",
    usages: "link দিন | link + mp3 লিখলে অডিও",
    cooldowns: 5
  },

  run: async function () {},

  handleEvent: async function ({ api, event }) {
    const { threadID, messageID, senderID, body } = event;
    if (!body || !body.startsWith("https://")) return;

    //━━━━━━━━━━ SETTINGS ━━━━━━━━━━//
    const COOLDOWN_TIME = 5 * 60 * 1000;
    const MAX_LINKS = 3;                 // এক মেসেজে সর্বোচ্চ কয়টা লিংক
    const MAX_SIZE_MB = 25;              // Messenger লিমিট

    //━━━━━━━━━━ HELPERS ━━━━━━━━━━//
    const react = (emoji) => api.setMessageReaction(emoji, messageID, () => {}, true);
    const send = (msg, reply = true) =>
      new Promise((resolve) =>
        api.sendMessage(msg, threadID, (err, info) => resolve(info), reply ? messageID : undefined)
      );

    const detectPlatform = (url) => {
      if (/facebook\.com|fb\.watch|fb\.me/.test(url)) return "Facebook";
      if (/tiktok\.com/.test(url)) return "TikTok";
      if (/youtube\.com|youtu\.be/.test(url)) return "YouTube";
      if (/instagram\.com/.test(url)) return "Instagram";
      if (/likee\.video/.test(url)) return "Likee";
      if (/pinterest\.com|pin\.it/.test(url)) return "Pinterest";
      if (/twitter\.com|x\.com/.test(url)) return "Twitter";
      if (/capcut\.com/.test(url)) return "CapCut";
      return null;
    };

    const cleanTitle = (t) =>
      String(t || "").replace(/\s+/g, " ").trim().slice(0, 60);

    const fetchInfo = async (link, platform) => {
      const apis = [
        `https://api.samirthakuri10.workers.dev/alldl?url=${encodeURIComponent(link)}`,
        `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(link)}`,
        `https://api.azadx69x.workers.dev/alldl?url=${encodeURIComponent(link)}`
      ];

      for (const apiUrl of apis) {
        try {
          const { data } = await axios.get(apiUrl, { timeout: 20000 });
          if (!data) continue;
          const d = data.data || {};

          const videoUrl =
            data.url || data.video_url || data.download_url ||
            d.url || d.high || d.video || d.hd ||
            (data.links && (data.links.hd || data.links.sd)) ||
            data.high || data.hd || data.video || null;

          const audioUrl =
            data.audio || data.audio_url || data.music ||
            d.audio || d.music || d.audio_url || null;

          if (videoUrl || audioUrl) {
            const title = data.title || data.caption || data.desc || d.title || `${platform} Video`;
            const pick = (...keys) => {
              for (const o of [data, d]) {
                for (const k of keys) {
                  const v = o && o[k];
                  if (v !== undefined && v !== null && v !== "" && !isNaN(Number(v))) return Number(v);
                }
              }
              return null;
            };
            const stats = {
              likes: pick("like", "likes", "like_count", "digg_count"),
              comments: pick("comment", "comments", "comment_count"),
              shares: pick("share", "shares", "share_count")
            };
            return { videoUrl, audioUrl, title: cleanTitle(title), stats };
          }
        } catch (err) {
          console.log("[autodl] API failed:", err.message);
        }
      }
      return null;
    };

    const downloadFile = async (url, dest) => {
      const res = await axios({
        url,
        method: "GET",
        responseType: "stream",
        timeout: 60000,
        maxRedirects: 5,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "*/*"
        }
      });

      const len = Number(res.headers["content-length"] || 0);
      if (len && len > MAX_SIZE_MB * 1024 * 1024) {
        res.data.destroy();
        throw new Error(`SIZE_LIMIT:${(len / 1024 / 1024).toFixed(1)}`);
      }

      await new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(dest);
        res.data.pipe(writer);
        writer.on("finish", resolve);
        writer.on("error", reject);
        res.data.on("error", reject);
      });

      const size = fs.statSync(dest).size;
      if (size < 1000) throw new Error("Downloaded file is too small or corrupted");
      if (size > MAX_SIZE_MB * 1024 * 1024) {
        throw new Error(`SIZE_LIMIT:${(size / 1024 / 1024).toFixed(1)}`);
      }
      return size;
    };

    // ভিডিও থেকে MP3 বের করা (সার্ভারে ffmpeg থাকলে)
    const extractAudio = (videoPath, audioPath) =>
      new Promise((resolve, reject) => {
        execFile(
          "ffmpeg",
          ["-y", "-i", videoPath, "-vn", "-acodec", "libmp3lame", "-q:a", "4", audioPath],
          { timeout: 60000 },
          (err) => (err ? reject(new Error("NO_FFMPEG")) : resolve())
        );
      });

    const safeDelete = (...files) =>
      setTimeout(() => {
        for (const f of files) {
          try { if (f && fs.existsSync(f)) fs.unlinkSync(f); } catch (e) {}
        }
      }, 5000);

    //━━━━━━━━━ UI ━━━━━━━━━//
    const ui = {
      success: ({ platform, title, user, time, size, audio, index, total, stats }) => {
        const fmt = (n) =>
          n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(n);
        const has = (v) => v !== undefined && v !== null;
        const lines = [
          `┃ 🌐 Platform  ➜  ${platform}${total > 1 ? `  ( ${index}/${total} )` : ""}`,
          `┃ 🎞️ Type  ➜  ${audio ? "MP3 Audio" : "Video"}`,
          `┃ 📝 Title  ➜  ${title}`,
          `┃ 👤 User  ➜  ${user}`
        ];
        if (stats) {
          lines.push(`┣━━━━━━━━━━━━━━━━━┫`);
          if (has(stats.likes)) lines.push(`┃ ❤️ Likes  ➜  ${fmt(stats.likes)}`);
          if (has(stats.comments)) lines.push(`┃ 💬 Comments  ➜  ${fmt(stats.comments)}`);
          if (has(stats.shares)) lines.push(`┃ 🔁 Shares  ➜  ${fmt(stats.shares)}`);
          if (lines[lines.length - 1].startsWith("┣")) lines.pop();
        }
        lines.push(`┣━━━━━━━━━━━━━━━━━┫`);
        lines.push(`┃ ⚡ Speed  ➜  ${time} sec`);
        lines.push(`┃ 📦 Size  ➜  ${size}`);
        return (
          `┏━━AUTO DOWNLOADER━━┓\n` +
          lines.join("\n") +
          `\n┗━━━━━━━━━━━━━━━━┛\n` +
          `   乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐`
        );
      },
      cooldown: (user, m, s) =>
        `┏━━━━━ ⏰ COOLDOWN ⏰ ━━━━━┓\n` +
        `┃ 👤 ${user}\n` +
        `┃ ⌛ বাকি: ${m} মিনিট ${s} সেকেন্ড\n` +
        `┗━━━━━━━━━━━━━━━━━━┛\n` +
        `   🙏 একটু অপেক্ষা করো`,
      fail: (reason) =>
        `┏━━━━━ ❌ ERROR ❌ ━━━━━┓\n` +
        `┃ ${reason}\n` +
        `┗━━━━━━━━━━━━━━━━━━┛\n` +
        `   🔁 আবার চেষ্টা করো`,
      unsupported:
        `┏━━━━ ⚠️ UNSUPPORTED ⚠️ ━━━━┓\n` +
        `┃ Facebook • TikTok • YouTube\n` +
        `┃ Instagram • Likee • Pinterest\n` +
        `┃ Twitter • CapCut\n` +
        `┗━━━━━━━━━━━━━━━━━━┛`
    };

    //━━━━━━━━━━ PARSE LINKS ━━━━━━━━━━//
    const allLinks = [...new Set(body.match(/https?:\/\/[^\s]+/g) || [])];
    const links = allLinks.filter((l) => detectPlatform(l)).slice(0, MAX_LINKS);
    if (!links.length) return; // সাপোর্টেড লিংক না থাকলে চুপ (স্প্যাম/কুলডাউন নয়)

    const wantAudio = /\b(mp3|audio|music|গান)\b/i.test(body.replace(/https?:\/\/[^\s]+/g, ""));

    //━━━━━━━━━━ USER + DB ━━━━━━━━━━//
    const userName = (global.data.userName && global.data.userName.get(senderID)) || "Unknown User";
    const mention = [{ tag: userName, id: senderID }];

    const adminIDs = Array.isArray(global.config.ADMINBOT)
      ? global.config.ADMINBOT.map(String)
      : [];
    const isAdmin = adminIDs.includes(String(senderID));

    const cacheDir = path.join(__dirname, "cache");
    fs.ensureDirSync(cacheDir);

    const dbPath = path.join(cacheDir, "autodl-count.json");
    let db = { total: 0, users: {} };
    try {
      if (fs.existsSync(dbPath)) db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
    } catch (e) {
      db = { total: 0, users: {} };
    }
    if (!db.users[senderID]) {
      db.users[senderID] = {
        name: userName,
        totalDownload: 0,
        totalTime: 0,
        lastDownload: null,
        cooldownUntil: 0
      };
    }

    //━━━━━━━━━━ COOLDOWN ━━━━━━━━━━//
    if (!isAdmin) {
      const now = Date.now();
      const until = db.users[senderID].cooldownUntil || 0;
      if (now < until) {
        const remaining = until - now;
        react("⏰");
        return send(
          ui.cooldown(userName, Math.floor(remaining / 60000), Math.floor((remaining % 60000) / 1000))
        );
      }
    }

    //━━━━━━━━━━ PROCESS ━━━━━━━━━━//
    react("⏳");
    let successCount = 0;
    let totalTimeSum = 0;

    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const platform = detectPlatform(link);
      const startTime = Date.now();
      const stamp = `${senderID}_${Date.now()}_${i}`;
      const videoPath = path.join(cacheDir, `autodl_${stamp}.mp4`);
      const audioPath = path.join(cacheDir, `autodl_${stamp}.mp3`);

      try {
        const info = await fetchInfo(link, platform);
        if (!info) {
          await send(ui.fail(`${platform} ভিডিও ডাউনলোড করা যায়নি`));
          continue;
        }

        let sendPath;
        let size;
        let isAudio = false;

        if (wantAudio) {
          if (info.audioUrl) {
            size = await downloadFile(info.audioUrl, audioPath);
            sendPath = audioPath;
            isAudio = true;
          } else if (info.videoUrl) {
            await downloadFile(info.videoUrl, videoPath);
            try {
              await extractAudio(videoPath, audioPath);
              size = fs.statSync(audioPath).size;
              sendPath = audioPath;
              isAudio = true;
            } catch (e) {
              // ffmpeg নেই → ভিডিও পাঠানো হবে
              await send("ℹ️ MP3 বানানো যায়নি, ভিডিও পাঠাচ্ছি…");
              size = fs.statSync(videoPath).size;
              sendPath = videoPath;
            }
          }
        } else {
          if (!info.videoUrl) {
            await send(ui.fail("ভিডিও লিংক পাওয়া যায়নি"));
            continue;
          }
          size = await downloadFile(info.videoUrl, videoPath);
          sendPath = videoPath;
        }

        const time = ((Date.now() - startTime) / 1000).toFixed(1);
        totalTimeSum += Number(time);

        await send({
          body: ui.success({
            platform,
            title: info.title || `${platform} Video`,
            user: userName,
            time,
            size: (size / 1024 / 1024).toFixed(2) + " MB",
            audio: isAudio,
            stats: info.stats,
            index: i + 1,
            total: links.length
          }),
          mentions: mention,
          attachment: fs.createReadStream(sendPath)
        });

        successCount++;
      } catch (e) {
        console.log("[autodl] Error:", e);
        let msg = e.message || "Unknown error";
        if (msg.startsWith("SIZE_LIMIT:")) {
          msg = `ফাইল অনেক বড় (${msg.split(":")[1]} MB)। সর্বোচ্চ ${MAX_SIZE_MB} MB`;
        } else if (/timeout|ETIMEDOUT/.test(msg)) {
          msg = "টাইমআউট! ভিডিও বড় বা সার্ভার স্লো";
        } else if (/ENOTFOUND|ECONNREFUSED/.test(msg)) {
          msg = "সার্ভারে কানেক্ট হচ্ছে না";
        }
        await send(ui.fail(msg));
      } finally {
        safeDelete(videoPath, audioPath);
      }
    }

    //━━━━━━━━━━ UPDATE DB ━━━━━━━━━━//
    if (successCount > 0) {
      db.total += successCount;
      db.users[senderID].name = userName;
      db.users[senderID].totalDownload += successCount;
      db.users[senderID].totalTime += totalTimeSum;
      db.users[senderID].lastDownload = new Date().toLocaleString("en-BD", { timeZone: "Asia/Dhaka" });
      if (!isAdmin) db.users[senderID].cooldownUntil = Date.now() + COOLDOWN_TIME;
      try {
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
      } catch (e) {
        console.log("[autodl] DB write error:", e.message);
      }
      react("✅");
    } else {
      react("❌");
    }
  }
};
