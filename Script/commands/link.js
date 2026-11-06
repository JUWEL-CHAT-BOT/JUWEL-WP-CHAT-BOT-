/** Don't change credits bro i will fix¯\_(ツ)_/¯ **/
module.exports.config = {
  name: "link",
  version: "1.0.0",
  hasPermssion: 2,
  credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  description: "18+ VIDEOS",
  commandCategory: "video",
  usages: "/link",
  cooldowns: 5,
  dependencies: {
    "request": "",
    "fs-extra": ""
  }
};

module.exports.run = async ({ api, event, args, client, Users, Threads, __GLOBAL, Currencies }) => {
  const request = global.nodemodule["request"];
  const fs = global.nodemodule["fs-extra"];

  // ----- Bot Admin Check (SAFE) -----
  let botAdminIDs = [];
  try {
    const cfg = global.client?.config || global.config || {};
    botAdminIDs = (cfg.ADMINBOT || cfg.adminBot || cfg.adminbot || []).map(id => String(id));
  } catch (e) {
    botAdminIDs = [];
  }

  // Fallback: config.json থেকে admin খুঁজবে
  if (botAdminIDs.length === 0) {
    try {
      const cfgPath = __dirname + "/../../config.json";
      if (fs.existsSync(cfgPath)) {
        const cfgJson = JSON.parse(fs.readFileSync(cfgPath, "utf-8"));
        botAdminIDs = (cfgJson.ADMINBOT || cfgJson.adminBot || cfgJson.adminbot || []).map(id => String(id));
      }
    } catch (e) {}
  }

  if (!botAdminIDs.includes(String(event.senderID))) {
    return api.sendMessage("⛔ এই কমান্ড শুধু বট এডমিন ব্যবহার করতে পারবে!", event.threadID, event.messageID);
  }
  // ----------------------------------------------

  // ----- 10 Random Sexy/Hot Captions with Emojis -----
  const captions = [
    "💋 তোমার ঠোঁট আমার ঘাড়ে বুলিয়ে দাও,\n🥵 আমার শরীর কাঁপছে তোমার স্পর্শে,\n👅 আজ রাতে কোনো লিমিট নেই,\n🍆 শুধু তুমি আর আমি, আর কিছু না 💦",

    "🫦 তোমার হাত আমার কোমরে জড়িয়ে ধরো,\n🥵 আরও জোরে টেনে নাও নিজের বুকে,\n💋 এই রাতটা আমাদের, পুরোটা আমাদের,\n🍓 যা করতে চাও করো, আমি রাজি 💦",

    "👅 তোমার নিঃশ্বাস আমার ঘাড়ে লাগছে,\n🥵 আমার সারা শরীর জ্বলে উঠছে,\n💋 কাপড়গুলো আজ বাধা হয়ে দাঁড়িয়েছে,\n🍆 খুলে ফেলো, আর দেরি কোরো না 🔥",

    "💋 তোমার আঙুল আমার ঠোঁটে বুলাও,\n🫦 আমার চোখ বন্ধ, শুধু তোমার স্পর্শ,\n🥵 আজ রাতে সব কিছু ভুলে যাই,\n👅 শুধু শরীর আর শরীরের খেলা 💦",

    "🍓 তোমার বুকে মুখ গুঁজে শ্বাস নিচ্ছি,\n🥵 তোমার হৃদয়ের গতি বেড়ে যাচ্ছে,\n👅 আমার হাত তোমার পিঠে নিচে নামছে,\n🍆 আরও কাছে এসো, আরও গভীরে 🔥",

    "💋 তোমার ঠোঁট চুমুতে আমার ঘাড় কামড়াও,\n🥵 আমার শরীর তোমার নিচে কাঁপছে,\n🫦 এই মুহূর্তটা চিরকাল থেকে যাক,\n👅 আরও জোরে, আরও গভীরে যাও 💦",

    "🥵 আমার হাঁটু তোমার হাঁটুতে ঠেকেছে,\n🍆 তোমার হাত আমার উরুতে উঠছে,\n💋 রাত গভীর, নীরবতা ভেঙে দাও,\n🍓 আজ কোনো লজ্জা নেই, শুধু কামনা 🔥",

    "👅 তোমার চুল আমার মুখে পড়ছে,\n💋 তোমার ঠোঁট আমার বুকের ওপর,\n🥵 আমার হাত তোমার কোমরে শক্ত,\n🫦 আজ রাতে থামবে না কিছুই 💦",

    "🍓 তোমার গায়ের গন্ধে আমি মাতাল,\n🥵 তোমার স্পর্শে আমার মাথা ঘোরে,\n👅 আজ রাতে বিছানা ছেড়ে উঠব না,\n💋 শুধু তোমার সাথে ডুবে থাকব 🔥",

    "🍆 তোমার চোখে আজ অগ্নি জ্বলছে,\n🥵 আমার শরীরে কাঁটা দিয়ে উঠছে,\n💋 আর দেরি না করে কাছে এসো,\n👅 আজ রাতে সব সীমা ভেঙে দাও 💦"
  ];
  const caption = captions[Math.floor(Math.random() * captions.length)];

  const links = [
    "https://i.imgur.com/hpaecbb.mp4",
    "https://i.imgur.com/hVGhqL9.mp4"
  ];

  const totalVideos = links.length;
  const randomIndex = Math.floor(Math.random() * totalVideos);
  const selectedLink = links[randomIndex];
  const videoNumber = randomIndex + 1;

  const cachePath = __dirname + "/cache/video_" + Date.now() + ".mp4";

  const downloadVideo = () => {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(cachePath);
      const req = request(
        {
          url: encodeURI(selectedLink),
          headers: { "User-Agent": "Mozilla/5.0" },
          timeout: 60000
        },
        (err, res, body) => {
          if (err) return reject(err);
          if (res.statusCode !== 200) return reject(new Error("HTTP " + res.statusCode));
        }
      );

      req.on("error", reject);
      req.pipe(file);

      file.on("finish", () => {
        file.close();
        const size = fs.statSync(cachePath).size;
        if (size < 10000) {
          // virus warning page বা খালি ফাইল
          return reject(new Error("Invalid video (small file)"));
        }
        resolve();
      });
      file.on("error", reject);
    });
  };

  try {
    await downloadVideo();

    const bodyText =
`❰ 𝗖𝗥𝗘𝗗𝗜𝗧𝗦 ❱
乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐

❰ 𝗖𝗔𝗣𝗧𝗜𝗢𝗡 ❱
${caption}

🎬 𝗩𝗶𝗱𝗲𝗼 𝗡𝘂𝗺𝗯𝗲𝗿 : ${videoNumber}/${totalVideos}
⏳ ১০ মিনিট পর এই ভিডিও ডিলিট হয়ে যাবে।`;

    api.sendMessage(
      {
        body: bodyText,
        attachment: fs.createReadStream(cachePath)
      },
      event.threadID,
      (err, info) => {
        // Cache ফাইল ২০ সেকেন্ড পর ডিলিট (সেন্ড শেষ হওয়ার জন্য 충েष সময়)
        setTimeout(() => {
          if (fs.existsSync(cachePath)) {
            try { fs.unlinkSync(cachePath); } catch (e) {}
          }
        }, 20000);

        // ১০ মিনিট পর মেসেজ আনসেন্ড
        if (!err && info && info.messageID) {
          setTimeout(() => {
            api.unsendMessage(info.messageID).catch(() => {});
          }, 10 * 60 * 1000);
        }
      },
      event.messageID
    );

  } catch (e) {
    if (fs.existsSync(cachePath)) {
      try { fs.unlinkSync(cachePath); } catch (err) {}
    }
    return api.sendMessage(
      "❌ ভিডিও ডাউনলোড করা যায়নি।\nকারণ: " + (e.message || e),
      event.threadID,
      event.messageID
    );
  }
};
