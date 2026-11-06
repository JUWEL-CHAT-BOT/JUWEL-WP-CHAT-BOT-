module.exports.config = {
  name: "wish",
  version: "2.1.0",
  hasPermssion: 0,
  credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  description: "Happy birthday wish for your friends (global groups)",
  commandCategory: "JUWEL ",
  usages: "@tag",
  dependencies: {
    axios: "latest",
    "fs-extra": "latest",
    canvas: "latest"
  },
  cooldowns: 0
};

// বাংলাদেশ টাইমজোন (UTC+6)
const TZ_OFFSET_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Global store for all scheduled birthday wishes (in-memory)
const scheduledBirthday = global.scheduledBirthday = global.scheduledBirthday || {
  targets: [],     // array of { targetID, wisherName }
  timer: null,
  timerSet: false
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

module.exports.wrapText = (ctx, text, maxWidth) => {
  return new Promise(resolve => {
    if (ctx.measureText(text).width < maxWidth) return resolve([text]);
    if (ctx.measureText("W").width > maxWidth) return resolve(null);

    const words = text.split(" ");
    const lines = [];
    let line = "";

    while (words.length > 0) {
      let split = false;
      while (ctx.measureText(words[0]).width >= maxWidth) {
        const word = words[0];
        words[0] = word.slice(0, -1);
        if (split) {
          words[1] = word.slice(-1) + words[1];
        } else {
          split = true;
          words.splice(1, 0, word.slice(-1));
        }
      }

      if (ctx.measureText(line + words[0]).width < maxWidth) {
        line += words.shift() + " ";
      } else {
        lines.push(line.trim());
        line = "";
      }

      if (words.length === 0) {
        lines.push(line.trim());
      }
    }
    return resolve(lines);
  });
};

async function createWish(targetID, wisherName, api, Users) {
  const { loadImage, createCanvas } = require("canvas");
  const fs = require("fs-extra");
  const axios = require("axios");

  const cacheDir = __dirname + "/cache";
  fs.ensureDirSync(cacheDir);

  const uniqueTag = Date.now() + "_" + targetID + "_" + Math.floor(Math.random() * 1000);
  const bgPath = `${cacheDir}/background_${uniqueTag}.png`;
  const avtPath = `${cacheDir}/Avtmot_${uniqueTag}.png`;

  const targetName = await Users.getNameUser(targetID);

  const bgURLs = ["https://i.postimg.cc/k4RS69d8/20230921-195836.png"];
  const bgURL = bgURLs[Math.floor(Math.random() * bgURLs.length)];

  let avtData = (await axios.get(
    `https://graph.facebook.com/${targetID}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
    { responseType: "arraybuffer" }
  )).data;
  fs.writeFileSync(avtPath, Buffer.from(avtData));

  let bgData = (await axios.get(bgURL, { responseType: "arraybuffer" })).data;
  fs.writeFileSync(bgPath, Buffer.from(bgData));

  let bgImage = await loadImage(bgPath);
  let avtImage = await loadImage(avtPath);
  let canvas = createCanvas(bgImage.width, bgImage.height);
  let ctx = canvas.getContext("2d");

  ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
  ctx.font = "400 32px Arial";
  ctx.fillStyle = "#1878F3";
  ctx.textAlign = "start";

  const nameLines = await module.exports.wrapText(ctx, targetName, 1160);
  if (nameLines) {
    ctx.fillText(nameLines.join("\n"), 120, 727);
  }

  ctx.beginPath();
  ctx.drawImage(avtImage, 70, 270, 400, 400);

  const imageBuffer = canvas.toBuffer();
  fs.writeFileSync(bgPath, imageBuffer);
  fs.removeSync(avtPath);

  const body =
    "┏┓┏┓\n" +
    "┃┗┛ 𝒂𝒑𝒑𝒚_🎂🎆🎉\n" +
    "┃┏┓┃ 🄱🄸🅁🅃🄷🄳🄰🅈🎉🎆\n" +
    "┗┛┗┛ Birthday Wishes For You..💐💗\n" +
    "🥰 " + targetName + " 😘\n\n" +
    "_𝐇𝐚𝐩𝐩𝐲 𝐛𝐢𝐫𝐭𝐡𝐝𝐚𝐲 🎂_\n" +
    "অনেক অনেক শুভ কামনা, দোয়া ও ভালবাসা রইল তোমার জন্য ❤\n" +
    "তোমার জীবনের প্রতিটা ক্ষণ আনন্দময় হোক এই কামনা করি...\n" +
    "শুভ জন্মদিন 🎂🎂🎂\n" +
    "🌷🌷\n\n" +
    "_𝐇𝐚𝐩𝐩𝐲 𝐁𝐢𝐫𝐭𝐡𝐝𝐚𝐲 𝐖𝐢𝐬𝐡𝐞𝐬 𝐟𝐨𝐫 𝐔😍_\n" +
    "𝐈 𝐰𝐢𝐬𝐡 𝐮 𝐦𝐚𝐧𝐲 𝐦𝐨𝐫𝐞 𝐡𝐚𝐩𝐩𝐲 𝐫𝐞𝐭𝐮𝐫𝐧𝐬 𝐨𝐟 𝐭𝐡𝐞 𝐝𝐚𝐲 💞\n\n" +
    "🖤 আশা করি সারাজীবন এমনই থাকবা, সবসময় ভালো থাকো এই কামনা করি\n" +
    "❤ জন্মদিনে শুধু এটাই কাম‍্য যাতে ভবিষ্যতে অনেক অনেক সুখী হও ❤\n" +
    "শুভ জন্মদিন 🫂 ❤️‍🩹\n\n" +
    "𝐌𝐚𝐤𝐢𝐧𝐠 𝐭𝐡𝐢𝐬 𝐰𝐢𝐬𝐡:" + wisherName;

  return {
    body: body,
    attachment: fs.createReadStream(bgPath),
    bgPath: bgPath
  };
}

// বাংলাদেশ সময় অনুযায়ী রাত ১২টা পর্যন্ত বাকি সময় (ms)
function getDelayToMidnight() {
  const nowDhaka = Date.now() + TZ_OFFSET_MS;
  const delay = DAY_MS - (nowDhaka % DAY_MS);
  return delay <= 0 ? DAY_MS : delay;
}

function formatTimeRemaining(ms) {
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return `${hours} ঘন্টা ${minutes} মিনিট ${seconds} সেকেন্ড`;
}

function createNotice(targetName, delayMs) {
  const timeStr = formatTimeRemaining(delayMs);
  const lines = [
    `  🎉 নোটিশ  🎉`,
    `  ${targetName} কে উইশ করা হবে আজ রাত ১২ টায় 🕛`,
    `  সমস্ত গ্রুপে যেখানে তিনি আছেন`,
    `  বাকি সময়: ${timeStr}`,
    `  ❤️ শুভ হোক সবকিছু`
  ];
  const width = Math.max(...lines.map(l => l.length)) + 4;
  const border = "─".repeat(width - 2);

  let frame = "┌" + border + "┐\n";
  for (const line of lines) {
    const pad = width - line.length - 2;
    const leftPad = Math.floor(pad / 2);
    const rightPad = pad - leftPad;
    frame += "│" + " ".repeat(leftPad) + line + " ".repeat(rightPad) + "│\n";
  }
  frame += "└" + border + "┘";
  return frame;
}

// বটের সব গ্রুপের threadID সংগ্রহ (callback + global data দুটোই ব্যবহার)
function getGroupThreadIDs(api) {
  return new Promise(resolve => {
    const ids = new Set();
    try {
      (global.data && global.data.allThreadID || []).forEach(id => ids.add(String(id)));
    } catch (e) {}

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve([...ids]);
    };

    // কলব্যাক না এলে ১৫ সেকেন্ড পর এগিয়ে যাবে
    const t = setTimeout(finish, 15000);

    try {
      api.getThreadList(100, null, ["INBOX"], (err, list) => {
        clearTimeout(t);
        if (!err && Array.isArray(list)) {
          list.filter(x => x.isGroup && x.threadID).forEach(x => ids.add(String(x.threadID)));
        } else if (err) {
          console.error("getThreadList error:", err);
        }
        finish();
      });
    } catch (e) {
      clearTimeout(t);
      console.error("getThreadList exception:", e);
      finish();
    }
  });
}

function getThreadInfoAsync(api, threadID) {
  return new Promise((resolve, reject) => {
    api.getThreadInfo(threadID, (err, info) => (err ? reject(err) : resolve(info)));
  });
}

function sendAsync(api, msg, threadID) {
  return new Promise(resolve => {
    api.sendMessage(msg, threadID, (err, info) => resolve({ err, info }));
  });
}

/**
 * Execute all scheduled wishes at midnight.
 */
async function executeScheduledWishes(api, Users) {
  const fs = require("fs-extra");
  const targets = scheduledBirthday.targets.slice();

  scheduledBirthday.targets = [];
  scheduledBirthday.timerSet = false;
  scheduledBirthday.timer = null;

  if (targets.length === 0) return;

  try {
    const threadIDs = await getGroupThreadIDs(api);
    console.log(`[wish] midnight: ${targets.length} target, ${threadIDs.length} group`);

    for (const { targetID, wisherName } of targets) {
      for (const threadID of threadIDs) {
        try {
          const threadInfo = await getThreadInfoAsync(api, threadID);
          const members = (threadInfo && threadInfo.participantIDs || []).map(String);
          if (!members.includes(String(targetID))) continue;

          const wishData = await createWish(targetID, wisherName, api, Users);
          const { err } = await sendAsync(
            api,
            { body: wishData.body, attachment: wishData.attachment },
            threadID
          );
          if (err) console.error(`[wish] send failed ${threadID}:`, err);
          if (fs.existsSync(wishData.bgPath)) fs.unlinkSync(wishData.bgPath);

          await sleep(2000); // ফ্লাড/ব্লক এড়াতে বিরতি
        } catch (err) {
          console.error(`[wish] thread ${threadID} / user ${targetID}:`, err);
        }
      }
    }
  } catch (err) {
    console.error("[wish] Error executing scheduled wishes:", err);
  }
}

/**
 * Set the global midnight timer if not already set.
 */
function scheduleMidnightTask(api, Users) {
  if (scheduledBirthday.timerSet) return;
  const delay = getDelayToMidnight();

  scheduledBirthday.timer = setTimeout(() => {
    executeScheduledWishes(api, Users).catch(e => console.error("[wish]", e));
  }, delay);

  scheduledBirthday.timerSet = true;
}

module.exports.run = async function ({
  args,
  Users,
  Threads,
  api,
  event,
  Currencies
}) {
  try {
    // Determine target: mention > reply > sender
    let targetID = Object.keys(event.mentions || {})[0];
    if (!targetID && event.messageReply) {
      targetID = event.messageReply.senderID;
    }
    if (!targetID) {
      targetID = event.senderID;
    }

    const wisherName = await Users.getNameUser(event.senderID);
    const targetName = await Users.getNameUser(targetID);

    // নিজের জন্য হলে সাথে সাথে পাঠাবে
    if (targetID === event.senderID) {
      const wishData = await createWish(targetID, wisherName, api, Users);
      return api.sendMessage(
        { body: wishData.body, attachment: wishData.attachment },
        event.threadID,
        () => {
          const fs = require("fs-extra");
          if (fs.existsSync(wishData.bgPath)) fs.unlinkSync(wishData.bgPath);
        },
        event.messageID
      );
    }

    // Add to global scheduled list (deduplicate)
    const alreadyScheduled = scheduledBirthday.targets.some(t => t.targetID === targetID);
    if (!alreadyScheduled) {
      scheduledBirthday.targets.push({ targetID, wisherName });
    }

    scheduleMidnightTask(api, Users);

    const delay = getDelayToMidnight();
    const notice = createNotice(targetName, delay);
    await api.sendMessage(notice, event.threadID, event.messageID);

  } catch (err) {
    console.error("wish command error:", err);
    return api.sendMessage(
      "❌ কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন।\n" + err.message,
      event.threadID,
      event.messageID
    );
  }
};
