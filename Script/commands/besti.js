module.exports.config = {
  name: "besti",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  description: "Besti & Bestu banner with both users mentioned and random caption",
  commandCategory: "banner",
  usePrefix: true,
  usages: "[@mention | reply]",
  cooldowns: 40,
  dependencies: {
    "axios": "",
    "fs-extra": "",
    "path": "",
    "canvas": ""
  }
};

// ====== Template settings ======
const TEMPLATE_URL = "https://i.imgur.com/lwTIx3o.jpeg";
const REF_W = 1536;
const REF_H = 1024;

// বাম = BESTU (sender), ডান = BESTI (target)
// ছবি ঠিকমতো না বসলে শুধু এই x, y, rx, ry মান বদলাও
// x, y = ফ্রেমের মাঝখান | rx = আড়াআড়ি রেডিয়াস | ry = লম্বালম্বি রেডিয়াস
const LEFT = { x: 402, y: 392, rx: 200, ry: 200 };
const RIGHT = { x: 1122, y: 398, rx: 205, ry: 205 };

const CREDIT = "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐";
// ================================

// ====== Captions ======
const CAPTIONS = [
  `"5" 🌷💞🫀🫂🌸🌷
পৃথিবীতে অনেক বন্ধু পাওয়া যায় 🫂
কিন্তু বেস্টুর মতো মনের মানুষ পাওয়া ভাগ্যের ব্যাপার 🌸
তুই আমার জীবনের সেই ভাগ্য, যাকে আমি হারাতে চাই না 💞🫀`,

  `"6" 🌷💞🫀🫂🌸🌷
বেস্টু আর বেস্টির সম্পর্কটা একটু আলাদা 🌷
এখানে রাগ আছে, অভিমান আছে, আবার অনেক মায়াও আছে 🫂
সবকিছুর পরেও আমরা যেন একে অপরের আপন থাকি 💞🌸`,

  `"7" 🌷💞🫀🫂🌸🌷
বেস্টি তুই আমার হাসির কারণ, মনের শান্তি 🫀
তোর সাথে কথা বললেই মনটা ভালো হয়ে যায় 🌸
তুই থাকিস পাশে, এটাই আমার ছোট্ট আবদার 💞🫂`,

  `"8" 🌷💞🫀🫂🌸🌷
সময় বদলাক, বদলে যাক চারপাশের মানুষ 🌸
তবুও তোর প্রতি আমার মায়াটা যেন না বদলায় 🫂
বেস্টু তুই থাকিস আমার জীবনের শেষ গল্প পর্যন্ত 💞🌷`,

  `"9" 🌷💞🫀🫂🌸🌷
আমার বেস্টি আমার কাছে গোলাপের মতো সুন্দর 🌷
যার মায়ায় মনটা বারবার আটকে যায় 💞
তোর মতো একজনকে বন্ধু হিসেবে পাওয়া সত্যিই ভাগ্যের 🫀🌸`,

  `"10" 🌷💞🫀🫂🌸🌷
বেস্টু তুই থাকলে একাকিত্বও হার মেনে যায় 🫂
তোর সাথে ছোট ছোট মুহূর্তগুলোও স্মৃতি হয়ে রয় 🌸
বন্ধুত্বের এই বন্ধনটা থাকুক চিরকাল অটুট 💞🫀🌷`
];

// ====== Caption UI ======
function buildBody(tag1, tag2, caption) {
  return (
`╔════════════════╗
 🫶 𝐁𝐄𝐒𝐓𝐔 🫂 𝐁𝐄𝐒𝐓𝐈 🎀
╚═════════════════╝

👤 ${tag1}
💞 ${tag2}
${caption ? `\n${caption}\n` : ""}
━━━━━━━━━━━━━━━━━━━
🪪 𝐂𝐫𝐞𝐝𝐢𝐭 ➤ ${CREDIT}
━━━━━━━━━━━━━━━━━━━`
  );
}

module.exports.run = async function ({ event, api }) {
  const axios = require("axios");
  const fs = require("fs-extra");
  const path = require("path");
  const { createCanvas, loadImage } = require("canvas");

  const { threadID, messageID, senderID, mentions, messageReply } = event;

  let targetID = null;
  if (mentions && Object.keys(mentions).length > 0) {
    targetID = Object.keys(mentions)[0];
  } else if (messageReply && messageReply.senderID) {
    targetID = messageReply.senderID;
  }

  if (!targetID) {
    return api.sendMessage(
      "⚠️ কাউকে মেনশন করো বা রিপ্লাই দাও!\n\nউদাহরণ: besti @RIYA",
      threadID,
      messageID
    );
  }

  const cacheDir = path.join(__dirname, "cache");
  fs.ensureDirSync(cacheDir);

  const imgPath = path.join(cacheDir, `besti_${senderID}_${targetID}.png`);
  const templatePath = path.join(cacheDir, "besti_template.jpg");

  const getTemplate = async () => {
    if (!fs.existsSync(templatePath)) {
      try {
        const res = await axios.get(TEMPLATE_URL, {
          responseType: "arraybuffer",
          timeout: 30000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
            "Referer": "https://imgur.com/"
          }
        });
        fs.writeFileSync(templatePath, Buffer.from(res.data));
      } catch (err) {
        throw new Error("TEMPLATE download failed: " + (err.response?.status || err.message));
      }
    }
    return loadImage(templatePath);
  };

  const getAvatar = async (uid) => {
    const url = `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=6628568379|c1e620fa708a1d5696fb991c1bde5662`;
    try {
      const res = await axios.get(url, { responseType: "arraybuffer", timeout: 20000 });
      return loadImage(Buffer.from(res.data));
    } catch (err) {
      throw new Error("AVATAR download failed: " + (err.response?.status || err.message));
    }
  };

  try {
    const [template, avatar1, avatar2] = await Promise.all([
      getTemplate(),
      getAvatar(senderID),
      getAvatar(targetID)
    ]);

    const W = template.width;
    const H = template.height;
    const sx = W / REF_W;
    const sy = H / REF_H;

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(template, 0, 0, W, H);

    const drawAvatar = (img, c) => {
      const cx = c.x * sx;
      const cy = c.y * sy;
      const rx = c.rx * sx;
      const ry = c.ry * sy;

      const w = rx * 2;
      const h = ry * 2;

      // ছবি বিকৃত না করে ফ্রেম ভরাতে সেন্টার-ক্রপ
      const scale = Math.max(w / img.width, h / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
      ctx.restore();
    };

    drawAvatar(avatar1, LEFT);
    drawAvatar(avatar2, RIGHT);

    fs.writeFileSync(imgPath, canvas.toBuffer("image/png"));

    // both users' names for mention
    let senderName = "User";
    let targetName = "Friend";
    try {
      const info = await api.getUserInfo([senderID, targetID]);
      senderName = info[senderID]?.name || senderName;
      targetName = info[targetID]?.name || targetName;
    } catch (_) {}

    const tag1 = `@${senderName}`;
    const tag2 = `@${targetName}`;

    const caption = CAPTIONS.length
      ? CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)]
      : "";

    const body = buildBody(tag1, tag2, caption);

    return api.sendMessage(
      {
        body,
        mentions: [
          { tag: tag1, id: senderID },
          { tag: tag2, id: targetID }
        ],
        attachment: fs.createReadStream(imgPath)
      },
      threadID,
      () => fs.unlink(imgPath, () => {}),
      messageID
    );
  } catch (e) {
    console.log("BESTI CMD ERROR:", e.response?.status, e.message);
    return api.sendMessage(
      "Error: " + (e.response?.status || e.message),
      threadID,
      messageID
    );
  }
};
