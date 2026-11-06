const fs = require("fs-extra");
const request = require("request");

module.exports.config = {
  name: "userinfo",
  version: "5.1.0",
  hasPermssion: 0,
  credits: "MR JUWEL",
  description: "Ultimate user information (All in One UI)",
  commandCategory: "Media",
  usages: "[reply | @tag | uid]",
  cooldowns: 5
};

// ===== 𝐁𝐨𝐥𝐝 𝐒𝐞𝐫𝐢𝐟 𝐅𝐨𝐧𝐭 𝐂𝐨𝐧𝐯𝐞𝐫𝐭𝐞𝐫 =====
function bold(text) {
  const map = {
    "A":"𝐀","B":"𝐁","C":"𝐂","D":"𝐃","E":"𝐄","F":"𝐅","G":"𝐆","H":"𝐇","I":"𝐈","J":"𝐉","K":"𝐊","L":"𝐋","M":"𝐌",
    "N":"𝐍","O":"𝐎","P":"𝐏","Q":"𝐐","R":"𝐑","S":"𝐒","T":"𝐓","U":"𝐔","V":"𝐕","W":"𝐖","X":"𝐗","Y":"𝐘","Z":"𝐙",
    "a":"𝐚","b":"𝐛","c":"𝐜","d":"𝐝","e":"𝐞","f":"𝐟","g":"𝐠","h":"𝐡","i":"𝐢","j":"𝐣","k":"𝐤","l":"𝐥","m":"𝐦",
    "n":"𝐧","o":"𝐨","p":"𝐩","q":"𝐪","r":"𝐫","s":"𝐬","t":"𝐭","u":"𝐮","v":"𝐯","w":"𝐰","x":"𝐱","y":"𝐲","z":"𝐳",
    "0":"𝟎","1":"𝟏","2":"𝟐","3":"𝟑","4":"𝟒","5":"𝟓","6":"𝟔","7":"𝟕","8":"𝟖","9":"𝟗"
  };
  return String(text).split("").map(c => map[c] || c).join("");
}

module.exports.run = async ({ api, event, args }) => {
  let id;

  if (!args[0]) {
    if (event.type == "message_reply") id = event.messageReply.senderID;
    else id = event.senderID;
  } else if (Object.keys(event.mentions).length > 0) {
    id = Object.keys(event.mentions)[0];
  } else {
    id = args[0];
  }

  try {
    const data = await api.getUserInfo(id);
    const user = data[id];

    const url = user.profileUrl || `https://facebook.com/${id}`;
    const isFriend = user.isFriend ? "Yes ✅" : "No ❌";
    const sn = user.vanity || "N/A";
    const name = user.name || "Unknown";
    const gender =
      user.gender == 2 ? "Male 👨" :
      user.gender == 1 ? "Female 👩" :
      "Unknown ❓";

    // ===== Activity Tracking =====
    const dbPath = __dirname + "/cache/activity.json";
    let activityDB = {};
    if (fs.existsSync(dbPath)) activityDB = JSON.parse(fs.readFileSync(dbPath));
    activityDB[id] = (activityDB[id] || 0) + 1;
    fs.writeFileSync(dbPath, JSON.stringify(activityDB, null, 2));
    const realActivity = activityDB[id];

    // ===== First Seen / Last Active =====
    const timePath = __dirname + "/cache/userTime.json";
    let timeDB = {};
    if (fs.existsSync(timePath)) timeDB = JSON.parse(fs.readFileSync(timePath));

    const now = Date.now();
    if (!timeDB[id]) {
      timeDB[id] = { firstSeen: now, lastActive: now };
    } else {
      timeDB[id].lastActive = now;
    }
    fs.writeFileSync(timePath, JSON.stringify(timeDB, null, 2));

    const firstSeen = new Date(timeDB[id].firstSeen).toLocaleDateString("en-GB");
    const lastActive = new Date(timeDB[id].lastActive).toLocaleString("en-GB");

    // ===== Name/Username Change Tracking =====
    const trackPath = __dirname + "/cache/track.json";
    let trackDB = {};
    if (fs.existsSync(trackPath)) trackDB = JSON.parse(fs.readFileSync(trackPath));

    let changeMsg = "No Change ✨";
    if (trackDB[id]) {
      const changes = [];
      if (trackDB[id].name !== name) changes.push("Name 🔄");
      if (trackDB[id].sn !== sn) changes.push("Username 🔄");
      if (changes.length) changeMsg = changes.join(" + ");
    }
    trackDB[id] = { name, sn };
    fs.writeFileSync(trackPath, JSON.stringify(trackDB, null, 2));

    // ===== Name History =====
    const histPath = __dirname + "/cache/nameHistory.json";
    let histDB = {};
    if (fs.existsSync(histPath)) histDB = JSON.parse(fs.readFileSync(histPath));
    if (!histDB[id]) histDB[id] = [name];
    else if (histDB[id][histDB[id].length - 1] !== name) {
      histDB[id].push(name);
      if (histDB[id].length > 5) histDB[id].shift();
    }
    fs.writeFileSync(histPath, JSON.stringify(histDB, null, 2));

    const oldNames = histDB[id].length > 1
      ? histDB[id].slice(0, -1).join(", ")
      : "None";

    // ===== Account Age (UID based estimate) =====
    const uidNum = parseInt(id);
    let accAge = "Unknown";
    if (uidNum < 1000000000) accAge = "2004-2006 🏛️";
    else if (uidNum < 1500000000) accAge = "2008-2010 📜";
    else if (uidNum < 2000000000) accAge = "2011-2013 📅";
    else if (uidNum < 100000000000) accAge = "2014-2016 🆕";
    else accAge = "2017+ ✨";

    // ===== Short URL =====
    const shortUrl = sn !== "N/A"
      ? `fb.com/${sn}`
      : `fb.com/${id}`;

    // ===== Optional fields =====
    const birthday = user.birthday || "Private 🔒";
    const location = user.location?.name || "Private 🔒";
    const hometown = user.hometown?.name || "Private 🔒";
    const relationship = user.relationship_status || "Private 🔒";
    const about = user.about || "Private 🔒";
    const work = user.work?.[0]?.employer?.name || "Private 🔒";
    const education = user.education?.length
      ? user.education[user.education.length - 1].school?.name || "Private 🔒"
      : "Private 🔒";

    // ===== ULTIMATE UI (𝐁𝐨𝐥𝐝 𝐅𝐨𝐧𝐭) =====
    const msg = `
╔═══════════════════════╗
     🎀 ${bold("USER INFO")} 🎀
╚═══════════════════════╝

╭───〔 👤 ${bold("BASIC")} 〕───╮
┃ 👤 ${bold("Name")}: ${name}
┃ 🆔 ${bold("UID")}: ${id}
┃ 📛 ${bold("Username")}: ${sn}
┃ 🚻 ${bold("Gender")}: ${gender}
┃ 🤝 ${bold("Friend")}: ${isFriend}
╰────────────────────╯

╭───〔 📋 ${bold("PERSONAL")} 〕───╮
┃ 🎂 ${bold("Birthday")}: ${birthday}
┃ 📍 ${bold("Location")}: ${location}
┃ 🏠 ${bold("Hometown")}: ${hometown}
┃ ❤️ ${bold("Status")}: ${relationship}
┃ 📝 ${bold("About")}: ${about}
┃ 💼 ${bold("Work")}: ${work}
┃ 🎓 ${bold("Study")}: ${education}
╰────────────────────╯

╭───〔 📊 ${bold("ACTIVITY")} 〕───╮
┃ 📊 ${bold("Total Uses")}: ${realActivity}
┃ 📅 ${bold("First Seen")}: ${firstSeen}
┃ ⏰ ${bold("Last Active")}: ${lastActive}
┃ 🔄 ${bold("Changes")}: ${changeMsg}
┃ 🕵️ ${bold("Old Names")}: ${oldNames}
╰────────────────────╯

╭───〔 🧬 ${bold("ACCOUNT")} 〕───╮
┃ 📅 ${bold("Acc Age")}: ${accAge}
┃ 🔗 ${bold("Short URL")}: ${shortUrl}
┃ 🌐 ${bold("Profile")}: ${url}
╰────────────────────╯

╔═══════════════════════╗
   ✨ ${bold("MR JUWEL")} ✨
╚═══════════════════════╝
`;

    // ===== Send with Profile Picture =====
    const callback = () => api.sendMessage(
      {
        body: msg,
        attachment: fs.createReadStream(__dirname + "/cache/ckuser.png")
      },
      event.threadID,
      () => fs.unlinkSync(__dirname + "/cache/ckuser.png"),
      event.messageID
    );

    return request(
      encodeURI(`https://graph.facebook.com/${id}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`)
    )
      .pipe(fs.createWriteStream(__dirname + "/cache/ckuser.png"))
      .on("close", () => callback());

  } catch (e) {
    console.log(e);
    return api.sendMessage("⚠️ User info আনতে সমস্যা হচ্ছে!", event.threadID, event.messageID);
  }
};
