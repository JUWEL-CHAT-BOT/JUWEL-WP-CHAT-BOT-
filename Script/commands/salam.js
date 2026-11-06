const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");

module.exports.config = {
  name: "salam",
  version: "8.0",
  hasPermssion: 0,
  credits: "MR JUWEL",
  description: "Auto reply Salam + Wrong Salam Detector + Islamic Tips",
  commandCategory: "noprefix",
  usages: "assalamu alaikum",
  cooldowns: 5
};

module.exports.handleEvent = async function ({ api, event, Users }) {
  const { threadID, messageID, senderID, body } = event;
  if (!body) return;

  // বট নিজের মেসেজ ইগনোর
  if (senderID === api.getCurrentUserID()) return;

  // ✅ সঠিক সালাম (৪টি)
  const correctSalam = [
    "assalamu alaikum",
    "assalamualaikum",
    "আসসালামু আলাইকুম",
    "আসসালামুআলাইকুম"
  ];

  // ❌ ভুল/ভাঙা সালাম
  const wrongSalam = [
    "assalamu alaikom", "assalamu alaikm",
    "assalam o alaikum", "asalamu alaikum",
    "asalam alaikum", "asalamualaikum",
    "assalam alaikum", "assalamu alaikummm",
    "assalamualaikom",
    "সালাম আলাইকুম", "আসালামু আলাইকুম",
    "আসসালাম আলাইকুম", "আসসালামু আলাইকোম",
    "আসসালামু আলাইকুমু", "আসসালামু আলাইখুম"
  ];

  const msg = body.toLowerCase().trim();
  const hasCorrect = correctSalam.some(w => msg.includes(w.toLowerCase()));

  // ─────────────────────────────────────────
  // ১. ভুল সালাম → শুধু টেক্সট নোটিশ + র্যান্ডম টিপস
  // ─────────────────────────────────────────
  if (!hasCorrect) {
    const matchedWrong = wrongSalam.find(w => msg.includes(w.toLowerCase()));

    if (matchedWrong) {
      const name = await Users.getNameUser(senderID).catch(() => "বন্ধু");

      const wrongNotice =
`╔════════════════════╗
   ⚠️ ভুল সালাম সনাক্ত ⚠️
╚════════════════════╝

👤 ${name}

❌ আপনি লিখেছেন:
   "${matchedWrong}"

📖 ভুলের অর্থ:
   ${getWrongMeaning(matchedWrong)}

━━━━━━━━━━━━━━━━━━━━
✅ সঠিক সালাম:
   🌷 আসসালামু আলাইকুম 🌷
   (Assalamu Alaikum)

📖 সঠিক অর্থ:
   "আপনার উপর শান্তি বর্ষিত হোক"

━━━━━━━━━━━━━━━━━━━━
${getRandomTip()}

━━━━━━━━━━━━━━━━━━━━
💡 ভুল হলে চিন্তা নেই —
সঠিকভাবে শিখে নিন! 🤲`;

      return api.sendMessage(wrongNotice, threadID, messageID);
    }
  }

  // ─────────────────────────────────────────
  // ২. সঠিক সালাম → ছবি সহ রিপ্লাই
  // ─────────────────────────────────────────
  if (!hasCorrect) return;

  try {
    const name = await Users.getNameUser(senderID);

    const profilePicUrl = `https://graph.facebook.com/${senderID}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const imgPath = path.join(cacheDir, `${senderID}_${Date.now()}.jpg`);
    const img = (await axios.get(profilePicUrl, { responseType: "arraybuffer" })).data;
    fs.writeFileSync(imgPath, img);

    const replyMsg =
`╔═══════════════╗
ও্ঁয়া্ঁলা্ঁই্ঁকু্ঁম্ঁ 🌷 আ্ঁস্ঁসা্ঁলা্ঁম্ঁ
𝐖𝐀𝐀𝐋𝐀𝐈𝐊𝐔𝐌🌷𝐀𝐒𝐒𝐀𝐋𝐀𝐌
👥 ${name}
╚═══════════════╝`;

    return api.sendMessage(
      {
        body: replyMsg,
        attachment: fs.createReadStream(imgPath)
      },
      threadID,
      () => fs.existsSync(imgPath) && fs.unlinkSync(imgPath),
      messageID
    );

  } catch (err) {
    console.error("❌ Salam Error:", err);
  }
};

// ─────────────────────────────────────────
// 📖 ভুল সালামের অর্থ
// ─────────────────────────────────────────
function getWrongMeaning(wrong) {
  const meanings = {
    "assalamu alaikom": "'আলাইকুম' এর বদলে 'আলাইকোম' — উচ্চারণ ভুল",
    "assalamu alaikm": "শেষের 'উ' বাদ পড়েছে — অসম্পূর্ণ",
    "assalam o alaikum": "উর্দু প্রভাবিত ভুল বানান",
    "asalamu alaikum": "প্রথম 's' বাদ পড়েছে",
    "asalam alaikum": "শব্দ অসম্পূর্ণ — 'আসসালামু' নয়",
    "asalamualaikum": "একসাথে লেখায় ভুল",
    "assalam alaikum": "'আসসালামু' এর বদলে 'আসসালাম'",
    "assalamu alaikummm": "অতিরিক্ত 'm' যুক্ত",
    "assalamualaikom": "'কুম' এর বদলে 'কোম'",
    "সালাম আলাইকুম": "'আসসালামু' বাদ পড়েছে",
    "আসালামু আলাইকুম": "প্রথম 'স' বাদ পড়েছে",
    "আসসালাম আলাইকুম": "'আসসালামু' এর বদলে 'আসসালাম'",
    "আসসালামু আলাইকোম": "'আলাইকুম' এর বদলে 'আলাইকোম'",
    "আসসালামু আলাইকুমু": "অতিরিক্ত 'উ' যুক্ত",
    "আসসালামু আলাইখুম": "'ক' এর বদলে 'খ'"
  };
  return meanings[wrong] || "অজানা ভুল — সঠিক বানান ব্যবহার করুন";
}

// ─────────────────────────────────────────
// 💡 র্যান্ডম ইসলামিক টিপস (১০টি)
// ─────────────────────────────────────────
function getRandomTip() {
  const tips = [
`💡 টিপস: সালাম হলো জান্নাতে প্রবেশের
একটি মাধ্যম। রাসূল (সা.) বলেছেন —
সালামের প্রসার কর, খাদ্য দাও, আত্মীয়তার
সম্পর্ক রাখ, তাহলে নিরাপদে জান্নাতে যাবে।`,

`💡 টিপস: সালাম দেওয়া সুন্নত,
আর উত্তর দেওয়া ওয়াজিব।
আল্লাহ বলেন — যখন তোমাদের সালাম দেওয়া হয়,
তখন উত্তমভাবে উত্তর দাও। (কুরআন ৪:৮৬)`,

`💡 টিপস: বেশি শব্দে সালাম = বেশি নেকি।
"আসসালামু আলাইকুম" = ১০ নেকি,
"ওয়া রাহমাতুল্লাহ" সহ = ২০ নেকি,
"ওয়া বারাকাতুহ" সহ = ৩০ নেকি।`,

`💡 টিপস: জান্নাতে ফেরেশতারা সালাম দিয়ে
অভ্যর্থনা জানাবেন। আল্লাহ বলেন —
"তোমাদের প্রতি শান্তি বর্ষিত হোক,
তোমরা সুখী হও, অনন্তকাল প্রবেশ করো।"`,

`💡 টিপস: সালাম পারস্পরিক ভালোবাসা
সৃষ্টি করে। রাসূল (সা.) বলেছেন —
তোমরা ঈমানদার হবে না যতক্ষণ পরস্পরকে
ভালোবাসো না। সালামের প্রসার কর।`,

`💡 টিপস: সালাম হলো আল্লাহর
নামসমূহের একটি নাম। রাসূল (সা.) বলেছেন —
সালাম আল্লাহর একটি নাম, যা তিনি পৃথিবীতে
রেখেছেন। সুতরাং তোমরা এর প্রসার কর।`,

`💡 টিপস: প্রথম সালাম দানকারী
আল্লাহর নিকটে সর্বোত্তম।
রাসূল (সা.) বলেছেন — মানুষের মধ্যে
আল্লাহর নিকটে সেই ব্যক্তি উত্তম, যে আগে সালাম দেয়।`,

`💡 টিপস: জান্নাতে জান্নাতবাসীদের
সম্ভাষণ হবে সালাম। আল্লাহ বলেন —
তারা সেখানে কোনো অসার কথা শুনবে না,
শুধু শুনবে "সালাম, সালাম"।`,

`💡 টিপস: ঘরে প্রবেশের সময় সালাম দিলে
বরকত নাজিল হয়। রাসূল (সা.) বলেছেন —
পরিবারের কাছে প্রবেশ করে সালাম দাও,
এটি তোমার ও পরিবারের জন্য বরকত হবে।`,

`💡 টিপস: সালাম হলো জান্নাতের চাবি।
রাসূল (সা.) বলেছেন — তোমরা সালামের
প্রসার কর, নিরাপদ থাকবে।
আর সালামের সাথে জান্নাতে প্রবেশ করবে।`
  ];
  return tips[Math.floor(Math.random() * tips.length)];
}

module.exports.run = () => {};
