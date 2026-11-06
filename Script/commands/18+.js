/** Don't change credits bro i will fix¯\_(ツ)_/¯ **/
module.exports.config = {
  name: "18+",
  version: "1.0.0",
  hasPermssion: 2,
  credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  description: "18+ VIDEOS",
  commandCategory: "video",
  usages: "/18+",
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
    "https://drive.google.com/uc?export=download&id=1-gJdG8bxmZLyOC7-6E4A5Hm95Q9gWIPO",
    "https://drive.google.com/uc?export=download&id=1-ryNR8j529EZyTCuMur9wmkFz4ahlv-f",
    "https://drive.google.com/uc?export=download&id=1-vHh7XBtPOS3s42q-s8s30Bzsx2u6czu",
    "https://drive.google.com/uc?export=download&id=11IUd-PDHozLmh_RtvSf0S-f3G6wut1ZT",
    "https://drive.google.com/uc?export=download&id=12YCqZovJ8sVZZZTDLu8dv8NAwsMGfqiB",
    "https://drive.google.com/uc?export=download&id=12eIiCYpd_Jm8zIVRSkqlSt7W-7OsxB6g",
    "https://drive.google.com/uc?export=download&id=13utWruipZ_3fR0QSMtGMnFjGt3bthnbf",
    "https://drive.google.com/uc?export=download&id=14GYNaYL-pkEh3UH0oIUXVamru5h830DY",
    "https://drive.google.com/uc?export=download&id=14UGb2fH4wyUbVSQ-Vt5yf-4sH3-icXGC",
    "https://drive.google.com/uc?export=download&id=161O9_EbCQJ8nHTT7VeE7BWtHvEjHAT4k",
    "https://drive.google.com/uc?export=download&id=170YWB4jpMfR5GpmPb_Lymh6OmrmWDE0x",
    "https://drive.google.com/uc?export=download&id=17nvXNBpMWVmuWLK-kkLzkbrbpW43rD4r",
    "https://drive.google.com/uc?export=download&id=17w7sehThOv6IRrcsLboi7Zk6zZvfBHr5",
    "https://drive.google.com/uc?export=download&id=17yaPd3PoYJkuL0IEZHzcBic9pX4AmGiK",
    "https://drive.google.com/uc?export=download&id=18Dyc1vkysNhHSGi5OYpa6AzD5rk3_vkf",
    "https://drive.google.com/uc?export=download&id=18brau5aYmiMAxfhDTLz_nFWuIcb_mja5",
    "https://drive.google.com/uc?export=download&id=19GcLpOzFYypYFu1FboQyVjWxC9Jh3JC5",
    "https://drive.google.com/uc?export=download&id=19lKQChg0hv2MOTphkyI4zTiUIxuujd03",
    "https://drive.google.com/uc?export=download&id=1AjrBOBRWKpKjLOYV1oof2mVZBzx0ebgD",
    "https://drive.google.com/uc?export=download&id=1BPOEwIt7lGv66w5pUTDU937q4i5ym5S_",
    "https://drive.google.com/uc?export=download&id=1C-VxCoO5gMKCq2rg7PxjlitK4bOg7pt2",
    "https://drive.google.com/uc?export=download&id=1C9t9VNpLT9DelBeDnbFNjdAA0tK_cXh-",
    "https://drive.google.com/uc?export=download&id=1DrhAOOeYIHlTWJU5e26OMjO0R5nueyf7",
    "https://drive.google.com/uc?export=download&id=1Dz7UfOejW9rDFYFAtxmAq_ncv04WaTTL",
    "https://drive.google.com/uc?export=download&id=1EcBmrdqYfQbwSPr2kiKY2QV_6CXLJJj6",
    "https://drive.google.com/uc?export=download&id=1F5Xc5Qff4RGyUuHzuqPfmOn2EZKQIn7P",
    "https://drive.google.com/uc?export=download&id=1FTxkmgt2sWf8U2h8a5HszyKINMr6Gnwm",
    "https://drive.google.com/uc?export=download&id=1Frf4GUg26Abw2lJdQ_RHycNhDMZXfMm2",
    "https://drive.google.com/uc?export=download&id=1FtdiGL244Kcj7tiA6F_2mKeTmMpVCyjr",
    "https://drive.google.com/uc?export=download&id=1G2tE1VdFzzqochfGwXwc46nuwkTeRRSc",
    "https://drive.google.com/uc?export=download&id=1GB6VOhgA3-JUSUZ3D1xgjlKH1Jswy0Z4",
    "https://drive.google.com/uc?export=download&id=1G_04XtbUP-QZNWFzdLohwY_w6BRdmijk",
    "https://drive.google.com/uc?export=download&id=1GpvlwryNcsRz2i6VYEV3NqSLr0WtGGn_",
    "https://drive.google.com/uc?export=download&id=1HYn-ZCVB0JcipKWrMxPnSrAVP4oSjePT",
    "https://drive.google.com/uc?export=download&id=1H_5i2V6W8Fl0N5QIKPACEUcljd8-q_dT",
    "https://drive.google.com/uc?export=download&id=1HhFPMOMXI7DDKc371C-12A0yfC0101x7",
    "https://drive.google.com/uc?export=download&id=1JNRfPMJe1_SodueqhMVf4so0-vjWaK9V",
    "https://drive.google.com/uc?export=download&id=1Jjy85bIGE9efsUIlmHykEistAquEB9oT",
    "https://drive.google.com/uc?export=download&id=1JoXCYZz4YoKpWe809ttUaaSsJdsCJZNf",
    "https://drive.google.com/uc?export=download&id=1Ko-ScBYddulpKX4I4xS7BRkndIaZZ3gT",
    "https://drive.google.com/uc?export=download&id=1LU4PTBFjWlhgzP2HiiJX_Esw2iIq7Zpj",
    "https://drive.google.com/uc?export=download&id=1LaM2kIlZUdA_UbCzX8s92nxcqEJieHLN",
    "https://drive.google.com/uc?export=download&id=1LcClA0b5Qih_tIv_wVRUsWX9gk3bVmzj",
    "https://drive.google.com/uc?export=download&id=1LgVpbMhe0CXM7rIUr9pJNK46QtZcpRtK",
    "https://drive.google.com/uc?export=download&id=1MB-KTUmPMkSb1o4J_EIRQ8mJ3w-cUOtY",
    "https://drive.google.com/uc?export=download&id=1M_cHjSaNWT5b_8p9VSPmzVyz-rqBqo3S",
    "https://drive.google.com/uc?export=download&id=1NC3fFj68PqqvZeg67AdA_cHyNdOBlRfF",
    "https://drive.google.com/uc?export=download&id=1Nk534yO5owt7IaMOKjbT6IGLGW96Gv0f",
    "https://drive.google.com/uc?export=download&id=1O1Cej8MFdytRun3RmGTnmT6uk1T-Zcmu",
    "https://drive.google.com/uc?export=download&id=1O801cupSBdjgkEHcRj9gZgyj2UVbyBZ_",
    "https://drive.google.com/uc?export=download&id=1OZUKqC7ooU572Vice1a0w3O3qRbC1F-r",
    "https://drive.google.com/uc?export=download&id=1P36Avho0fdTGnIm--wsIbSXqvTtaNbGA",
    "https://drive.google.com/uc?export=download&id=1PU4U-VHzWzZ_3chEOUdUJOeOj_8QTC19",
    "https://drive.google.com/uc?export=download&id=1Q-ZiZE9B1nADleloUlZPk9Yt2UcT9Jli",
    "https://drive.google.com/uc?export=download&id=1Q6ZlUc7gYbKng2T5BW8ihDXSohNVvl9i",
    "https://drive.google.com/uc?export=download&id=1QS5LbZmGXsHynBSVP2eNMBctjp7i8Veh",
    "https://drive.google.com/uc?export=download&id=1QoegqFfHWnaSRimcwZouya7xM9aIYOLO",
    "https://drive.google.com/uc?export=download&id=1RFtXmVTzPt6LkpX2q_2co9_-lpKI5czZ",
    "https://drive.google.com/uc?export=download&id=1Rtx9IpniEP0RQ8cREvf4q5OjoBvlxlVd",
    "https://drive.google.com/uc?export=download&id=1RwR0hE9oroYy1r92qySPSFbddsBdnGZd",
    "https://drive.google.com/uc?export=download&id=1TAshp38cUnJ0bQxSnlur_srBG-iSmhKZ",
    "https://drive.google.com/uc?export=download&id=1V5IB7_yn1mPhgnY15Zqo7hl6_ypAj-c_",
    "https://drive.google.com/uc?export=download&id=1VdwLFjOyTX0n5UwyqMtC8_xnwVCEFx3Y",
    "https://drive.google.com/uc?export=download&id=1Wja3iI8LALkZs_XIMLRziTrcPGMipAvW",
    "https://drive.google.com/uc?export=download&id=1X84nddHJ-_4Lc6p9Hj-IXaBmwVkx4alc",
    "https://drive.google.com/uc?export=download&id=1Xw8Mxk3RJJ3Rc1wCZiRg5oKGRN4e_l2L",
    "https://drive.google.com/uc?export=download&id=1Y34gETXZwRBXf60nYOyDNjMEb3GcHw_p",
    "https://drive.google.com/uc?export=download&id=1Z8fRrmLaq2VopeJDxBRyB6m6Aupq38Fw",
    "https://drive.google.com/uc?export=download&id=1ZHd4NUAaWrlyvysQ1VnfkeexlK2t3u46",
    "https://drive.google.com/uc?export=download&id=1ZW_b6EQ4DQI-hSFw3wJeekaSuL-CTt-X",
    "https://drive.google.com/uc?export=download&id=1ZWnRry0HcXUAkeqvEHR51ukzVMWP4q1j",
    "https://drive.google.com/uc?export=download&id=1_7LZ4go5LMgWvRPoKJIku0_Tz3rxdgS-",
    "https://drive.google.com/uc?export=download&id=1_8uTqb3XQcKdLxg-kCPose2zizbjuEfh",
    "https://drive.google.com/uc?export=download&id=1a3nlk9nFVQ4UHNpXzxWZWz1kzcVW2q3f",
    "https://drive.google.com/uc?export=download&id=1ajf90OK-R27jrqJ_ot8O6bCdtQn8PYo0",
    "https://drive.google.com/uc?export=download&id=1auj8r7iOzIAfxhH0GI9JvuYaPxFs6Or3",
    "https://drive.google.com/uc?export=download&id=1b6O6LdfitQLU5o8YnyOUjRP422eE9qwA",
    "https://drive.google.com/uc?export=download&id=1bZIPoHp6UcMXHIISvA0PNirfnQGN0Fdp",
    "https://drive.google.com/uc?export=download&id=1cDyFQ9BfrqKZH1AYgjT9DDxpR7pTcKVI",
    "https://drive.google.com/uc?export=download&id=1e9Ut8dt4BpEwEoaIbh_4ktCY8pLm_90R",
    "https://drive.google.com/uc?export=download&id=1eBj_m0bsySjUcsJEm8DJ-zGaq9tI3gK4",
    "https://drive.google.com/uc?export=download&id=1eEaIBikLu5kwOw3U3xmowlu7TxNFCYGG",
    "https://drive.google.com/uc?export=download&id=1fltQlOK7O4hBNjzqFrhTcZkkalyX-xtP",
    "https://drive.google.com/uc?export=download&id=1iCgSIdDe3OAlbLfHj9MOM5r4p2wJ3IVX",
    "https://drive.google.com/uc?export=download&id=1iDsDpwRTyqVtlkK1cr2yCmX9RWBqro83",
    "https://drive.google.com/uc?export=download&id=1ilsbQ41h27oYFLTkF7DGh5E1y87Fb4Li",
    "https://drive.google.com/uc?export=download&id=1kvPCFpazUyG4kweLotGo4MBOV6ITbDhO",
    "https://drive.google.com/uc?export=download&id=1l-F5zFd9n3xkpNVQVfEQ1QY5Qk0vSuRP",
    "https://drive.google.com/uc?export=download&id=1lHlClK9_bIsIg4GZXTmtcD2uL7HCBidC",
    "https://drive.google.com/uc?export=download&id=1ldhd9bDe5P7dr5IjRSFNw7_p4-T-bUHq",
    "https://drive.google.com/uc?export=download&id=1lgy4CM0dZTgUQe97cHv8ckI-TH1fEdDA",
    "https://drive.google.com/uc?export=download&id=1mr8XTjOfylN4RU8qHQGGLpdBhD9u1922",
    "https://drive.google.com/uc?export=download&id=1mviQxG7P__nj6pzHykEdOxLERwIJCp8E",
    "https://drive.google.com/uc?export=download&id=1pMNK9J3016kHBePSN0yr0QnDSifDlmvX",
    "https://drive.google.com/uc?export=download&id=1q6BysXVGDKrkoV9cLsdtJf37bkCSpxYf",
    "https://drive.google.com/uc?export=download&id=1qOB3u_06QrNcaKcJrnH27db5gplNCv8n",
    "https://drive.google.com/uc?export=download&id=1qWNdqTwOrc7RJUqgHO9vnC_zWqhobg-8",
    "https://drive.google.com/uc?export=download&id=1qZGH73eGzBngq6tzHtm9ssc3nHRG7gdP",
    "https://drive.google.com/uc?export=download&id=1rGfGZT9gu5H9ABnHN5ekXIb7600gFm9d",
    "https://drive.google.com/uc?export=download&id=1rLAG_cGzBAYE1l2OZCs8tdRtCHFpBmz9",
    "https://drive.google.com/uc?export=download&id=12Q0PJAVmHVgsRF7akn3PNRru-tepia5y",
    "https://drive.google.com/uc?export=download&id=1rULVaU0D727BpFK2Rzuw5quMrYXQuT6T",
    "https://drive.google.com/uc?export=download&id=1s3qb7YOWbuy3yRD9TPyCKVolT15MECKe",
    "https://drive.google.com/uc?export=download&id=1soaiC_lLQboDwSeIJpse6diMEpcvXQv-",
    "https://drive.google.com/uc?export=download&id=1sxPeSpyIXO-hitBSGElJBzasuSOJXVM4",
    "https://drive.google.com/uc?export=download&id=1vg49E9Hw4w56CSISINZH_ZSQRSIfCVHN",
    "https://drive.google.com/uc?export=download&id=1vmZKmjJmgsDSbtlUqIRCa1rNjKzq_B9v",
    "https://drive.google.com/uc?export=download&id=1woxnScrA2ADpZnTQeQt3tidrXDVGN6Z-",
    "https://drive.google.com/uc?export=download&id=1x164E3sV32WaeduO14BbbNSVjqm-zBW3",
    "https://drive.google.com/uc?export=download&id=1x3N_JlNIROo_2v7A4jYsIzIYd3Ez-0ep",
    "https://drive.google.com/uc?export=download&id=1yZMUmIIq8nvbannu3DUmLy7SOzgw0TMe",
    "https://drive.google.com/uc?export=download&id=1ymACbIzXyMNJIF8O_XImq9QA4fZcTNdR",
    "https://drive.google.com/uc?export=download&id=1zRAFPp3sMPOlVyhoEPnHflRpiRe6C2pt"
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
