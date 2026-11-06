module.exports.config = {
  name: "info",
  version: "2.1.0",
  hasPermssion: 0,
  credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  description: "Bot information command",
  commandCategory: "For users",
  hide: true,
  usages: "",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args, Users, Threads }) {
  const { threadID, senderID, messageID } = event;
  const request = global.nodemodule["request"];
  const fs = global.nodemodule["fs-extra"];
  const os = require("os");
  const moment = require("moment-timezone");

  /* ─────────── Config Load ─────────── */
  const { configPath } = global.client;
  delete require.cache[require.resolve(configPath)];
  const config = require(configPath);

  const { commands } = global.client;
  const threadSetting = (await Threads.getData(String(threadID))).data || {};
  const prefix = threadSetting.hasOwnProperty("PREFIX")
    ? threadSetting.PREFIX
    : config.PREFIX;

  /* ══════════════════════════════════════════
     ⚡ LOADING ANIMATION (3 seconds)
  ══════════════════════════════════════════ */
  const loadingFrames = [
    `⏳ 𝐋𝐨𝐚𝐝𝐢𝐧𝐠 𝐁𝐨𝐭 𝐈𝐧𝐟𝐨...\n\n▰▱▱▱▱▱▱▱▱▱ 10%`,
    `⏳ 𝐋𝐨𝐚𝐝𝐢𝐧𝐠 𝐁𝐨𝐭 𝐈𝐧𝐟𝐨...\n\n▰▰▱▱▱▱▱▱▱▱ 20%`,
    `⏳ 𝐋𝐨𝐚𝐝𝐢𝐧𝐠 𝐁𝐨𝐭 𝐈𝐧𝐟𝐨...\n\n▰▰▰▱▱▱▱▱▱▱ 30%`,
    `⏳ 𝐋𝐨𝐚𝐝𝐢𝐧𝐠 𝐁𝐨𝐭 𝐈𝐧𝐟𝐨...\n\n▰▰▰▰▱▱▱▱▱▱ 40%`,
    `⏳ 𝐋𝐨𝐚𝐝𝐢𝐧𝐠 𝐁𝐨𝐭 𝐈𝐧𝐟𝐨...\n\n▰▰▰▰▰▱▱▱▱▱ 50%`,
    `⏳ 𝐋𝐨𝐚𝐝𝐢𝐧𝐠 𝐁𝐨𝐭 𝐈𝐧𝐟𝐨...\n\n▰▰▰▰▰▰▱▱▱▱ 60%`,
    `⏳ 𝐋𝐨𝐚𝐝𝐢𝐧𝐠 𝐁𝐨𝐭 𝐈𝐧𝐟𝐨...\n\n▰▰▰▰▰▰▰▱▱▱ 70%`,
    `⏳ 𝐋𝐨𝐚𝐝𝐢𝐧𝐠 𝐁𝐨𝐭 𝐈𝐧𝐟𝐨...\n\n▰▰▰▰▰▰▰▰▱▱ 80%`,
    `⏳ 𝐋𝐨𝐚𝐝𝐢𝐧𝐠 𝐁𝐨𝐭 𝐈𝐧𝐟𝐨...\n\n▰▰▰▰▰▰▰▰▰▱ 90%`,
    `✅ 𝐋𝐨𝐚𝐝𝐢𝐧𝐠 𝐂𝐨𝐦𝐩𝐥𝐞𝐭𝐞!\n\n▰▰▰▰▰▰▰▰▰▰ 100%`,
  ];

  // প্রথম loading message পাঠানো
  const loadingMsg = await api.sendMessage(loadingFrames[0], threadID);

  // বাকি ফ্রেমগুলো প্রতি 300ms পর পর এডিট করা (১০ ফ্রেম × ৩০০ms = ৩ সেকেন্ড)
  let frameIndex = 1;
  const loadingInterval = setInterval(() => {
    if (frameIndex < loadingFrames.length) {
      api.editMessage(loadingFrames[frameIndex], loadingMsg.messageID);
      frameIndex++;
    }
  }, 300);

  /* ─────────── Server Info ─────────── */
  const ramUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
  const ramTotal = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
  const cpuModel = os.cpus()[0].model;
  const platform = os.platform();
  const nodeVersion = process.version;
  const arch = os.arch();

  /* ─────────── Your Info ─────────── */
  const senderName = await Users.getNameUser(senderID);
  const senderData = await Users.getData(senderID);

  /* ─────────── Group Info ─────────── */
  let groupName = "ব্যক্তিগত চ্যাট";
  let memberCount = 1;
  let adminCount = 0;
  let groupEmoji = "❓";
  try {
    const threadInfo = await api.getThreadInfo(threadID);
    groupName = threadInfo.threadName || "Unnamed Group";
    memberCount = threadInfo.participantIDs.length;
    adminCount = threadInfo.adminIDs.length;
    groupEmoji = threadInfo.emoji || "❓";
  } catch (e) {}

  /* ─────────── Version & Category ─────────── */
  const botVersion = module.exports.config.version;
  const totalCommands = commands.size;
  const categorySet = new Set();
  for (const cmd of commands.values()) {
    if (cmd.config && cmd.config.commandCategory) {
      categorySet.add(cmd.config.commandCategory);
    }
  }
  const totalCategories = categorySet.size;
  const totalEvents = global.client.eventRegistered
    ? global.client.eventRegistered.size
    : 0;

  /* ─────────── Profile Links ─────────── */
  const botID = api.getCurrentUserID();
  const botProfile = `https://facebook.com/${botID}`;
  const botMessenger = `https://m.me/${botID}`;

  /* ─────────── Admin Links ─────────── */
  const adminList = Array.isArray(config.ADMINBOT) ? config.ADMINBOT : [];
  let adminLines = "";
  if (adminList.length === 0) {
    adminLines = "│ ⚠️ কোনো অ্যাডমিন সেট করা নেই\n";
  } else {
    for (let i = 0; i < adminList.length; i++) {
      const uid = adminList[i];
      let name = "Admin";
      try {
        name = await Users.getNameUser(uid);
      } catch (e) {}
      adminLines += `│ 👑 𝗔𝗱𝗺𝗶𝗻 ${i + 1}  :  ${name}\n`;
      adminLines += `│    🔵 𝗙𝗕      :  https://www.fb.com/${uid}\n`;
      adminLines += `│    💬 𝗠𝗲𝘀𝘀𝗲𝗻𝗴𝗲𝗿 :  https://www.m.me/${uid}\n`;
      if (i !== adminList.length - 1) adminLines += "│\n";
    }
  }

  /* ─────────── Uptime ─────────── */
  const uptime = process.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);

  const totalUsers = global.data.allUserID.length;
  const totalThreads = global.data.allThreadID.length;

  /* ─────────── Time (BD) ─────────── */
  const time = moment.tz("Asia/Dhaka").format("hh:mm:ss A");
  const date = moment.tz("Asia/Dhaka").format("DD/MM/YYYY");

  /* ─────────── Message ─────────── */
  const msg = `
╔════════════════════╗
   🤖 𝐁𝐎𝐓 𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐓𝐈𝐎𝐍 🤖
╚════════════════════╝
┌────────────────────
│ 🏷️ 𝗕𝗼𝘁 𝗡𝗮𝗺𝗲    :  
│ 📦 𝗩𝗲𝗿𝘀𝗶𝗼𝗻    :  ${botVersion}
│ ⚡ 𝗣𝗿𝗲𝗳𝗶𝘅      :  ${config.PREFIX}
│ 📌 𝗕𝗼𝘅 𝗣𝗿𝗲𝗳𝗶𝘅  :  ${prefix}
│ 🧩 𝗠𝗼𝗱𝘂𝗹𝗲𝘀     :  ${totalCommands}
│ 📂 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝘆   :  ${totalCategories}
│ 🎯 𝗘𝘃𝗲𝗻𝘁𝘀      :  ${totalEvents}
│ 📡 𝗣𝗶𝗻𝗴        :  ${Date.now() - event.timestamp}ms
│ 🕐 𝗧𝗶𝗺𝗲        :  ${time}
│ 📅 𝗗𝗮𝘁𝗲        :  ${date}
└────────────────────
╔════════════════════╗
   🔗 𝐁𝐎𝐓 𝐏𝐑𝐎𝐅𝐈𝐋𝐄 🔗
╚════════════════════╝
┌────────────────────
│ 🆔 𝗕𝗼𝘁 𝗜𝗗     :  ${botID}
│ 🔵 𝗙𝗮𝗰𝗲𝗯𝗼𝗼𝗸   :  ${botProfile}
│ 💬 𝗠𝗲𝘀𝘀𝗲𝗻𝗴𝗲𝗿 :  ${botMessenger}
└────────────────────
╔════════════════════╗
   👑 𝐀𝐃𝐌𝐈𝐍 𝐈𝐍𝐅𝐎 👑
╚════════════════════╝
┌────────────────────
${adminLines}└────────────────────

╔════════════════════╗
   💻 𝐒𝐄𝐑𝐕𝐄𝐑 𝐈𝐍𝐅𝐎 💻
╚════════════════════╝
┌────────────────────
│ 🖥️ 𝗣𝗹𝗮𝘁𝗳𝗼𝗿𝗺 :  ${platform}
│ 🏗️ 𝗔𝗿𝗰𝗵     :  ${arch}
│ ⚙️ 𝗡𝗼𝗱𝗲     :  ${nodeVersion}
│ 🧠 𝗥𝗔𝗠      :  ${ramUsed} MB / ${ramTotal} GB
│ 🔥 𝗖𝗣𝗨      :  ${cpuModel.slice(0, 28)}...
└────────────────────
╔════════════════════╗
   👥 𝐆𝐑𝐎𝐔𝐏 𝐈𝐍𝐅𝐎 👥
╚════════════════════╝
┌────────────────────
│ 📛 𝗡𝗮𝗺𝗲    :  ${groupName}
│ 👤 𝗠𝗲𝗺𝗯𝗲𝗿𝘀 :  ${memberCount}
│ 👑 𝗔𝗱𝗺𝗶𝗻𝘀  :  ${adminCount}
│ 😀 𝗘𝗺𝗼𝗷𝗶    :  ${groupEmoji}
│ 🆔 𝗧𝗵𝗿𝗲𝗮𝗱  :  ${threadID}
└────────────────────
╔════════════════════╗
   👤 𝐘𝐎𝐔𝐑 𝐈𝐍𝐅𝐎 👤
╚════════════════════╝
┌────────────────────
│ 🧑 𝗡𝗮𝗺𝗲  :  ${senderName}
│ 🆔 𝗜𝗗    :  ${senderID}
│ 💰 𝗠𝗼𝗻𝗲𝘆 :  ${senderData.money || 0}$
│ ⭐ 𝗘𝘅𝗽   :  ${senderData.exp || 0}
└────────────────────
╔════════════════════╗
   📊 𝐀𝐂𝐓𝐈𝐕𝐈𝐓𝐈𝐄𝐒 📊
╚════════════════════╝
┌────────────────────
│ ⏱️ 𝗨𝗽𝘁𝗶𝗺𝗲 :  ${days}d ${hours}h ${minutes}m ${seconds}s
│ 👥 𝗚𝗿𝗼𝘂𝗽𝘀 :  ${totalThreads}
│ 🧿 𝗨𝘀𝗲𝗿𝘀  :  ${totalUsers}
└────────────────────
╭━━━━━━━━━━━━━━━━━━━╮
  ❤️ 𝐓𝐡𝐚𝐧𝐤𝐬 𝐅𝐨𝐫 𝐔𝐬𝐢𝐧𝐠 ❤️
  🌺⎯꯭𓆩꯭𝆺𝅥😻⃞𝐑⃞𝐈⃞𝐘⃞𝐀⃞༢࿐ 𝐁𝐎𝐓 🌺
╰━━━━━━━━━━━━━━━━━━━╯

⚙️ 𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗕𝘆 : 乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐
`;

  /* ─────────── Image + Send After 3s ─────────── */
  const imgLinks = [
    "https://i.imgur.com/HMtGAMO.jpeg",
  ];
  const imgLink = imgLinks[Math.floor(Math.random() * imgLinks.length)];
  const cachePath = __dirname + "/cache/info.jpg";

  // ৩ সেকেন্ড অপেক্ষা করে আসল মেসেজ পাঠানো
  setTimeout(() => {
    clearInterval(loadingInterval);

    request(encodeURI(imgLink))
      .pipe(fs.createWriteStream(cachePath))
      .on("close", () => {
        // Loading message ডিলিট করা
        api.unsendMessage(loadingMsg.messageID).catch(() => {});

        // আসল Info পাঠানো
        api.sendMessage(
          {
            body: msg,
            attachment: fs.createReadStream(cachePath),
          },
          threadID,
          () => {
            try { fs.unlinkSync(cachePath); } catch (e) {}
          }
        );
      });
  }, 3000);
};

/* 🔒 Credits Protection */
if (
  module.exports.config.credits !==
  "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐"
) {
  throw new Error("⚠️ Credits পরিবর্তন করা হয়েছে!");
    }
