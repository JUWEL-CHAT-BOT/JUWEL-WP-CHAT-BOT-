const fs = require("fs");
const path = require("path");
const request = require("request");

module.exports.config = {
  name: "sigma",
  version: "13.0.0",
  hasPermssion: 0,
  credits: "M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  description: "random sigma video",
  commandCategory: "sigma",
  usages: "sigma | sigma <number> | sigma unban <id>",
  cooldowns: 0, // কুলডাউন নিচের কোডে নিজে হ্যান্ডেল করা হয় (অ্যাডমিন বাদে ১৫ সেকেন্ড)
};

// ===== Video List =====
// এখানে ভিডিও লিংক বসান (প্রতিটি লিংক কমা দিয়ে আলাদা করুন)
const videoList = [
  "https://i.imgur.com/apMUmGF.mp4",
  "https://i.imgur.com/MYtSMBV.mp4",
  "https://i.imgur.com/BucfgDc.mp4",
  "https://i.imgur.com/JexKOtj.mp4",
  "https://i.imgur.com/KyDjbMT.mp4",
  "https://i.imgur.com/CTKXBL5.mp4",
  "https://i.imgur.com/2nX3EGv.mp4",
  "https://i.imgur.com/xbA4mT5.mp4",
  "https://i.imgur.com/qAoISuQ.mp4",
  "https://i.imgur.com/Q7XjHsd.mp4",
  "https://i.imgur.com/UEqgZUG.mp4",
  "https://i.imgur.com/xbH5NXq.mp4",
  "https://i.imgur.com/GnE6ecd.mp4",
  "https://i.imgur.com/BiRbej0.mp4",
  "https://i.imgur.com/iIigymA.mp4",
  "https://i.imgur.com/2fgDNY1.mp4",
  "https://i.imgur.com/QD6sJUM.mp4",
  "https://i.imgur.com/OfA9bmi.mp4",
  "https://i.imgur.com/9IUFAle.mp4",
  "https://i.imgur.com/CMY7kk6.mp4",
  "https://i.imgur.com/hFEwU5d.mp4",
  "https://i.imgur.com/FFQePJU.mp4",
  "https://i.imgur.com/ylUBQ46.mp4",
  "https://i.imgur.com/DxFzJSI.mp4",
  "https://i.imgur.com/ZFqobss.mp4",
  "https://i.imgur.com/PudY0kS.mp4",
  "https://i.imgur.com/M68ulHn.mp4",
  "https://i.imgur.com/PYuwzdk.mp4",
  "https://i.imgur.com/OjwrWvM.mp4",
  "https://i.imgur.com/E1VkSNe.mp4",
  "https://i.imgur.com/k7PGOcf.mp4",
  "https://i.imgur.com/zguuTXJ.mp4",
  "https://i.imgur.com/2CCgQYD.mp4",
  "https://i.imgur.com/NsAUlXo.mp4",
  "https://i.imgur.com/pcLZoSH.mp4",
  "https://i.imgur.com/uFuXNtD.mp4",
  "https://i.imgur.com/1M7kC5X.mp4",
  "https://i.imgur.com/s5ECDjH.mp4",
  "https://i.imgur.com/I5Vdv4Z.mp4",
  "https://i.imgur.com/yv0FSAr.mp4",
  "https://i.imgur.com/4gKekMP.mp4",
  "https://i.imgur.com/mRz3ZYo.mp4",
  "https://i.imgur.com/Pu2pyRH.mp4",
  "https://i.imgur.com/gzUqVaZ.mp4",
  "https://i.imgur.com/KTuEvRt.mp4",
  "https://i.imgur.com/CGjMTap.mp4",
  "https://i.imgur.com/QE0qOJS.mp4",
  "https://i.imgur.com/0vV1U06.mp4",
  "https://i.imgur.com/GV7VJg2.mp4",
  "https://i.imgur.com/DgAlKvM.mp4",
  "https://i.imgur.com/Du51opH.mp4",
  "https://i.imgur.com/VtiqWiA.mp4",
  "https://i.imgur.com/AZ1UC3N.mp4",
  "https://i.imgur.com/sb3rtq5.mp4",
  "https://i.imgur.com/2xuiArP.mp4",
  "https://i.imgur.com/4USQsPW.mp4",
  "https://i.imgur.com/yjsbg1W.mp4",
  "https://i.imgur.com/ML2seAm.mp4",
  "https://i.imgur.com/OfhOeFC.mp4",
  "https://i.imgur.com/h9DoDXo.mp4",
  "https://i.imgur.com/XCXMzhz.mp4",
  "https://i.imgur.com/Y721gbs.mp4",
  "https://i.imgur.com/GDiYlaR.mp4",
  "https://i.imgur.com/EOFZJZK.mp4",
  "https://i.imgur.com/pQEdruD.mp4",
  "https://i.imgur.com/B21x2WG.mp4",
  "https://i.imgur.com/Aux8bwM.mp4",
  "https://i.imgur.com/KBnJs2G.mp4",
  "https://i.imgur.com/bp7m0WF.mp4",
  "https://i.imgur.com/gvemmjk.mp4",
  "https://i.imgur.com/db6c9lc.mp4",
  "https://i.imgur.com/eRZ5BtE.mp4",
  "https://i.imgur.com/avdAEvN.mp4",
  "https://i.imgur.com/hbaMZpm.mp4",
  "https://i.imgur.com/dWrMzhc.mp4",
  "https://i.imgur.com/xF6D0IW.mp4",
  "https://i.imgur.com/VcbMJlU.mp4",
  "https://i.imgur.com/Uhvpl5X.mp4",
  "https://i.imgur.com/NzbPjan.mp4",
  "https://i.imgur.com/6qQM1y8.mp4",
  "https://i.imgur.com/mTXs2tq.mp4",
  "https://i.imgur.com/Nz305hJ.mp4",
  "https://i.imgur.com/Ki6Hm3P.mp4",
  "https://i.imgur.com/X6MDo8X.mp4",
  "https://i.imgur.com/JVZXjjI.mp4",
  "https://i.imgur.com/ObIK0Ui.mp4",
  "https://i.imgur.com/C58c8jJ.mp4",
  "https://i.imgur.com/Y8rcc71.mp4",
  "https://i.imgur.com/dPL0o33.mp4",
  "https://i.imgur.com/70QhC23.mp4",
  "https://i.imgur.com/Imbymox.mp4",
  "https://i.imgur.com/zFCbz7s.mp4",
  "https://i.imgur.com/PoALy7U.mp4",
  "https://i.imgur.com/mQgO4Wl.mp4",
  "https://i.imgur.com/3A6DTOl.mp4",
  "https://i.imgur.com/wkx3KBf.mp4",
  "https://i.imgur.com/ti6Kpnb.mp4",
  "https://i.imgur.com/TRWIKZm.mp4",
  "https://i.imgur.com/hZVllUc.mp4",
  "https://i.imgur.com/LN4sFKH.mp4",
  "https://i.imgur.com/CoiNtsw.mp4",
  "https://i.imgur.com/nsBVsOK.mp4",
  "https://i.imgur.com/U2uwVop.mp4",
  "https://i.imgur.com/4Q8R6d7.mp4",
  "https://i.imgur.com/zEcviW6.mp4",
  "https://i.imgur.com/Emj8OK4.mp4",
  "https://i.imgur.com/rVYSF71.mp4",
  "https://i.imgur.com/HyGdFae.mp4",
  "https://i.imgur.com/vHjiMDy.mp4",
  "https://i.imgur.com/DazZjW6.mp4",
  "https://i.imgur.com/M6ybJ2T.mp4",
  "https://i.imgur.com/2B6J5Ln.mp4",
  "https://i.imgur.com/7Etjkxk.mp4",
  "https://i.imgur.com/Y3KicUu.mp4",
  "https://i.imgur.com/Derl8ZP.mp4",
  "https://i.imgur.com/Qo2CnQI.mp4",
  "https://i.imgur.com/f5JwT45.mp4",
  "https://i.imgur.com/fJzA05o.mp4",
  "https://i.imgur.com/G61fbUc.mp4",
  "https://i.imgur.com/a6IQRCq.mp4",
  "https://i.imgur.com/Pf4qDHo.mp4",
  "https://i.imgur.com/yyaSkzg.mp4",
  "https://i.imgur.com/4uXjmG8.mp4",
  "https://i.imgur.com/fRiTWLX.mp4",
  "https://i.imgur.com/DASZHkb.mp4",
  "https://i.imgur.com/k9brExk.mp4",
  "https://i.imgur.com/iTdoX2l.mp4",
  "https://i.imgur.com/aZosWak.mp4",
  "https://i.imgur.com/jqlrojN.mp4",
  "https://i.imgur.com/90pbpVU.mp4",
  "https://i.imgur.com/qV7U4cs.mp4",
  "https://i.imgur.com/HdttxpU.mp4",
  "https://i.imgur.com/Ajv6vFE.mp4",
  "https://i.imgur.com/WzyrW5t.mp4",
  "https://i.imgur.com/DOeBZNV.mp4",
  "https://i.imgur.com/p04O5RW.mp4",
  "https://i.imgur.com/zZE51hf.mp4",
  "https://i.imgur.com/biL8lPd.mp4",
  "https://i.imgur.com/xZSuYEW.mp4",
  "https://i.imgur.com/yzV8weJ.mp4",
  "https://i.imgur.com/0joNCTy.mp4",
  "https://i.imgur.com/tUjEfUE.mp4",
  "https://i.imgur.com/y4oevoM.mp4",
  "https://i.imgur.com/W3PucnY.mp4",
  "https://i.imgur.com/y2Q3Q3I.mp4",
  "https://i.imgur.com/EBX4Zsl.mp4",
  "https://i.imgur.com/Mg3kNd1.mp4",
  "https://i.imgur.com/THYMJNe.mp4",
  "https://i.imgur.com/1GV1RsA.mp4",
  "https://i.imgur.com/1K2QaPB.mp4",
  "https://i.imgur.com/hgH8rmV.mp4",
  "https://i.imgur.com/pmAhHAJ.mp4",
  "https://i.imgur.com/uNo3LMI.mp4",
  "https://i.imgur.com/pMT2nic.mp4",
  "https://i.imgur.com/DRgaDV2.mp4",
  "https://i.imgur.com/2qTDf0G.mp4",
  "https://i.imgur.com/iRZmTDH.mp4",
  "https://i.imgur.com/CKeUJPt.mp4",
  "https://i.imgur.com/5LbgrPm.mp4",
  "https://i.imgur.com/ZVzx8ho.mp4",
  "https://i.imgur.com/FRivpYL.mp4",
  "https://i.imgur.com/RSV1GDg.mp4",
  "https://i.imgur.com/Qwviikp.mp4",
  "https://i.imgur.com/SjUnbuD.mp4",
  "https://i.imgur.com/sSSXc38.mp4",
  "https://i.imgur.com/IqBNS7N.mp4",
  "https://i.imgur.com/napmQKv.mp4",
  "https://i.imgur.com/dimo0r0.mp4",
  "https://i.imgur.com/sSgklUZ.mp4",
  "https://i.imgur.com/yxieBVX.mp4",
  "https://i.imgur.com/zaiQEsk.mp4",
  "https://i.imgur.com/P3FoCq3.mp4",
  "https://i.imgur.com/srt2ObU.mp4",
  "https://i.imgur.com/wsevj9W.mp4",
  "https://i.imgur.com/z2txq3m.mp4",
  "https://i.imgur.com/OWTPme3.mp4",
  "https://i.imgur.com/yi55AKK.mp4",
  "https://i.imgur.com/7UYAVUy.mp4",
  "https://i.imgur.com/Hpvwf6b.mp4",
  "https://i.imgur.com/u0kF6wh.mp4",
  "https://i.imgur.com/QK5Dylk.mp4",
  "https://i.imgur.com/U8Drd92.mp4",
  "https://i.imgur.com/AICkgXX.mp4",
  "https://i.imgur.com/kQXhP1C.mp4",
  "https://i.imgur.com/nkQ2zXz.mp4",
  "https://i.imgur.com/NXv4Qun.mp4",
  "https://i.imgur.com/SfNFjCp.mp4",
  "https://i.imgur.com/wzT7QSe.mp4",
  "https://i.imgur.com/QnYuZZH.mp4",
  "https://i.imgur.com/3HoQ7Th.mp4",
  "https://i.imgur.com/kzii5eP.mp4",
  "https://i.imgur.com/52DKDtY.mp4",
  "https://i.imgur.com/MZbDtQ3.mp4",
  "https://i.imgur.com/K3Aro6o.mp4",
  "https://i.imgur.com/ezk85sb.mp4",
  "https://i.imgur.com/oRaxPl1.mp4",
  "https://i.imgur.com/Do2oUCK.mp4",
  "https://i.imgur.com/sbQzpGl.mp4",
  "https://i.imgur.com/e3kfcb3.mp4",
  "https://i.imgur.com/83ajtVb.mp4",
  "https://i.imgur.com/Qo9MRMz.mp4",
  "https://i.imgur.com/ZjVJXn9.mp4",
  "https://i.imgur.com/svMJZKR.mp4",
  "https://i.imgur.com/YFKcS8W.mp4",
  "https://i.imgur.com/Fdbk0fi.mp4",
  "https://i.imgur.com/cn9sExb.mp4",
  "https://i.imgur.com/42eUmu8.mp4",
  "https://i.imgur.com/ysDedvr.mp4",
  "https://i.imgur.com/SX519fW.mp4",
  "https://i.imgur.com/8sHM2J9.mp4",
  "https://i.imgur.com/0T0g9FM.mp4",
  "https://i.imgur.com/MpbxZ6H.mp4",
  "https://i.imgur.com/QBPgnPo.mp4",
  "https://i.imgur.com/p8hsZGn.mp4",
  "https://i.imgur.com/PMRxDxn.mp4",
  "https://i.imgur.com/5xoQ2BX.mp4",
  "https://i.imgur.com/awQDVnp.mp4",
  "https://i.imgur.com/oASqo3W.mp4",
  "https://i.imgur.com/91iwAjC.mp4",
  "https://i.imgur.com/nhIyCLK.mp4",
  "https://i.imgur.com/QDZrSQe.mp4",
  "https://i.imgur.com/jzsPtVU.mp4",
  "https://i.imgur.com/2q4zxkb.mp4",
  "https://i.imgur.com/QwirofD.mp4",
  "https://i.imgur.com/aLTUk1s.mp4",
  "https://i.imgur.com/pAWp7pZ.mp4",
  "https://i.imgur.com/Wdm7cEy.mp4",
  "https://i.imgur.com/wlODXWS.mp4",
  "https://i.imgur.com/Gl1FKx8.mp4",
  "https://i.imgur.com/AK1slO1.mp4",
  "https://i.imgur.com/cVozsr0.mp4",
  "https://i.imgur.com/wWB16bB.mp4",
  "https://i.imgur.com/6j38Yae.mp4",
  "https://i.imgur.com/bmh61Gw.mp4",
  "https://i.imgur.com/MvFLaMG.mp4",
  "https://i.imgur.com/VD5DHR0.mp4",
  "https://i.imgur.com/0VtAZEy.mp4",
  "https://i.imgur.com/tlmdTK5.mp4",
  "https://i.imgur.com/jrYsuf3.mp4",
  "https://i.imgur.com/AExFlEH.mp4",
  "https://i.imgur.com/4GngWiU.mp4",
  "https://i.imgur.com/EeizVjm.mp4",
  "https://i.imgur.com/2IWTkmG.mp4",
  "https://i.imgur.com/MMJMXGN.mp4",
  "https://i.imgur.com/LrModdM.mp4",
  "https://i.imgur.com/fuEAE2r.mp4",
  "https://i.imgur.com/opy8i9X.mp4",
  "https://i.imgur.com/jUIdPsF.mp4",
  "https://i.imgur.com/f8Xlikk.mp4",
  "https://i.imgur.com/AsqJEfi.mp4",
  "https://i.imgur.com/pgEGVVT.mp4",
  "https://i.imgur.com/u5Z8Vnw.mp4",
  "https://i.imgur.com/Z9fx9Xr.mp4",
  "https://i.imgur.com/Ice62lh.mp4",
  "https://i.imgur.com/MbBRoOC.mp4",
  "https://i.imgur.com/nnifoA1.mp4",
  "https://i.imgur.com/l506g7Y.mp4",
  "https://i.imgur.com/OfcZ2qk.mp4",
  "https://i.imgur.com/UQDvMLL.mp4",
  "https://i.imgur.com/EkRMcAn.mp4",
  "https://i.imgur.com/hhBgy4X.mp4",
  "https://i.imgur.com/yTu8e49.mp4",
  "https://i.imgur.com/WVIFYFC.mp4",
  "https://i.imgur.com/U5eGsBt.mp4",
  "https://i.imgur.com/4UVegdH.mp4",
  "https://i.imgur.com/JQGOaGq.mp4",
  "https://i.imgur.com/Car2YKU.mp4",
  "https://i.imgur.com/kUy8Cup.mp4"
];

// ===== Paths =====
const CACHE_DIR = path.join(__dirname, "cache", "sigma_cache");
const DATA_FILE = path.join(__dirname, "cache", "sigma_data.json");
try { fs.mkdirSync(CACHE_DIR, { recursive: true }); } catch (e) {}

// ===== 💾 Persistent Ban Storage =====
function loadBanned() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return data.banned || {};
  } catch (e) {
    return {};
  }
}

function saveBanned() {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({ banned: global.client.sigmaBanned }, null, 2)
    );
  } catch (e) {
    console.log("Ban save error:", e);
  }
}

// ===== Trackers =====
if (!global.client.sigmaSpamTracker) global.client.sigmaSpamTracker = {};
if (!global.client.sigmaBanned) global.client.sigmaBanned = loadBanned();
if (!global.client.sigmaCooldown) global.client.sigmaCooldown = {};
if (!global.client.sigmaLast) global.client.sigmaLast = {};

// ===== Font Converter → 𝐀𝐁𝐂𝐃 =====
// bold অক্ষরগুলো surrogate pair, তাই Array.from দিয়ে ভাঙতে হয়
function toBoldFont(text) {
  const normal = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bold = Array.from("𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗");
  return Array.from(text).map(ch => {
    const i = normal.indexOf(ch);
    return i > -1 ? bold[i] : ch;
  }).join("");
}

// ===== File Size Formatter =====
function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

// ===== Admin Check =====
function isAdmin(id) {
  const cfg = global.config || {};
  const list = [].concat(cfg.ADMINBOT || [], cfg.OPERATOR || []).map(String);
  return list.includes(String(id));
}

// ===== 🔁 No-Repeat Random Picker =====
function pickIndex(threadID) {
  if (videoList.length <= 1) return 0;
  const last = global.client.sigmaLast[threadID];
  let idx;
  do {
    idx = Math.floor(Math.random() * videoList.length);
  } while (idx === last);
  global.client.sigmaLast[threadID] = idx;
  return idx;
}

// ===== ⬇️ Download (temp file → rename) =====
function downloadVideo(url, dest) {
  return new Promise((resolve, reject) => {
    const tmp = `${dest}.${Date.now()}.tmp`;
    const ws = fs.createWriteStream(tmp);

    const fail = (err) => {
      try { ws.destroy(); } catch (e) {}
      try { fs.unlinkSync(tmp); } catch (e) {}
      reject(err);
    };

    const req = request(url);
    req.on("response", (res) => {
      if (res.statusCode !== 200) {
        req.abort();
        fail(new Error("HTTP " + res.statusCode));
      }
    });
    req.on("error", fail);
    ws.on("error", fail);
    ws.on("close", () => {
      try {
        if (!fs.existsSync(tmp)) return;
        if (fs.statSync(tmp).size === 0) return fail(new Error("Empty file"));
        fs.renameSync(tmp, dest);
        resolve();
      } catch (e) {
        fail(e);
      }
    });
    req.pipe(ws);
  });
}

// ===== 📦 Video Cache =====
async function getVideoFile(index) {
  const url = videoList[index];
  const file = path.join(CACHE_DIR, path.basename(url));
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return file;
  await downloadVideo(url, file);
  return file;
}

// ===== 🛡️ Ban / Spam / Cooldown Check =====
function checkUser(api, threadID, replyID, senderID) {
  // 👑 অ্যাডমিনের জন্য কুলডাউন, স্প্যাম ও ব্যান কিছুই নেই
  if (isAdmin(senderID)) return true;

  const now = Date.now();

  // 🚫 Ban Check
  if (global.client.sigmaBanned[senderID]) {
    api.sendMessage(
      toBoldFont("🚫 You are BANNED! You cannot use this command."),
      threadID,
      replyID
    );
    return false;
  }

  // 📊 Spam Check (5 times / 60s) — কুলডাউনের আগে চেক হয়
  if (!global.client.sigmaSpamTracker[senderID]) {
    global.client.sigmaSpamTracker[senderID] = [];
  }
  global.client.sigmaSpamTracker[senderID] = global.client.sigmaSpamTracker[senderID]
    .filter(t => now - t < 60000);
  global.client.sigmaSpamTracker[senderID].push(now);

  if (global.client.sigmaSpamTracker[senderID].length > 5) {
    global.client.sigmaBanned[senderID] = true;
    saveBanned();
    api.sendMessage(
      toBoldFont("🚫 SPAM DETECTED! You sent 5+ commands in 1 minute.\nYou have been BANNED."),
      threadID,
      replyID
    );
    return false;
  }

  // ⏱️ Cooldown Check (15s)
  const lastUsed = global.client.sigmaCooldown[senderID] || 0;
  const remaining = 15 - Math.floor((now - lastUsed) / 1000);

  if (remaining > 0) {
    api.sendMessage(
      toBoldFont(`⏳ Please wait ${remaining}s before using this command again!`),
      threadID,
      replyID
    );
    return false;
  }
  global.client.sigmaCooldown[senderID] = now;
  return true;
}

// ===== 🎬 Send Video =====
async function sendVideo(api, threadID, replyID, senderID, index) {
  try {
    const file = await getVideoFile(index);
    const sizeText = formatSize(fs.statSync(file).size);
    const videoNumber = index + 1;

    const bodyText =
`🎬 ${toBoldFont("SIGMA VIDEO")} 🎬
╔══════════════════════╗
   ${toBoldFont("Total Videos")} : ${toBoldFont(String(videoList.length))}
   ${toBoldFont("Video No")}     : ${toBoldFont(`${videoNumber}/${videoList.length}`)}
   ${toBoldFont("Video Size")}   : ${toBoldFont(sizeText)}
   ${toBoldFont("Cooldown")}     : ${toBoldFont("15s")}
   ${toBoldFont("Credit")}       : 乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐
   ${toBoldFont("React")} ❤️ ${toBoldFont("To Get Next Video")}
╚══════════════════════╝`;

    api.sendMessage(
      { body: bodyText, attachment: fs.createReadStream(file) },
      threadID,
      (err, info) => {
        if (err) return console.log("Send error:", err);
        // ❤️ রিঅ্যাকশন রেজিস্টার
        if (info && info.messageID && global.client.handleReaction) {
          global.client.handleReaction.push({
            name: module.exports.config.name,
            messageID: info.messageID,
            author: senderID
          });
        }
      },
      replyID
    );
  } catch (e) {
    console.log("Video error:", e);
    api.sendMessage(
      toBoldFont("❌ Failed to download video. Try again!"),
      threadID,
      replyID
    );
  }
}

// ===== ▶️ Command =====
module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  // ===== 🔓 Unban (Admin only): sigma unban <id> =====
  if (args && args[0] && args[0].toLowerCase() === "unban") {
    if (!isAdmin(senderID)) {
      return api.sendMessage(
        toBoldFont("❌ Only admin can use unban."),
        threadID,
        messageID
      );
    }
    const target = args[1];
    if (!target) {
      return api.sendMessage(
        toBoldFont("⚠️ Usage: sigma unban <user id>"),
        threadID,
        messageID
      );
    }
    if (!global.client.sigmaBanned[target]) {
      return api.sendMessage(
        toBoldFont("ℹ️ This user is not banned."),
        threadID,
        messageID
      );
    }
    delete global.client.sigmaBanned[target];
    delete global.client.sigmaSpamTracker[target];
    delete global.client.sigmaCooldown[target];
    saveBanned();
    return api.sendMessage(
      toBoldFont(`✅ Unbanned ${target}`),
      threadID,
      messageID
    );
  }

  // ===== 📭 Empty list guard =====
  if (videoList.length === 0) {
    return api.sendMessage(
      toBoldFont("⚠️ No videos added yet!"),
      threadID,
      messageID
    );
  }

  // ===== 🔢 Video by number: sigma <number> =====
  let index = null;
  if (args && args[0]) {
    const n = parseInt(args[0], 10);
    if (isNaN(n) || n < 1 || n > videoList.length) {
      return api.sendMessage(
        toBoldFont(`❌ Invalid number! Choose between 1 and ${videoList.length}`),
        threadID,
        messageID
      );
    }
    index = n - 1;
  }

  if (!checkUser(api, threadID, messageID, senderID)) return;

  if (index === null) {
    index = pickIndex(threadID);
  } else {
    global.client.sigmaLast[threadID] = index;
  }

  await sendVideo(api, threadID, messageID, senderID, index);
};

// ===== ❤️ Reaction → Next Video =====
module.exports.handleReaction = async function ({ api, event, handleReaction }) {
  // শুধু ❤️ রিঅ্যাকশনে কাজ করবে (রিঅ্যাকশন সরালে বা অন্য ইমোজিতে কিছু হবে না)
  if (!event.reaction) return;
  if (event.reaction.replace(/\uFE0F/g, "") !== "❤") return;
  // শুধু যে কমান্ড দিয়েছে সে রিঅ্যাক্ট করলে কাজ করবে
  if (String(event.userID) !== String(handleReaction.author)) return;
  if (videoList.length === 0) return;

  const { threadID, messageID, userID } = event;
  if (!checkUser(api, threadID, messageID, userID)) return;

  const index = pickIndex(threadID);
  await sendVideo(api, threadID, messageID, userID, index);
};
