/**
 * ╔══════════════════════════════════════╗
 * ║        ID NAME SET COMMAND          ║
 * ║        Command: idnameset            ║
 * ╚══════════════════════════════════════╝
 */

const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "idnameset",
  version: "1.0.0",
  hasPermssion: 2,
  credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  description: "Bot Admin দিয়ে Facebook profile name পরিবর্তনের চেষ্টা করে",
  commandCategory: "Admin",
  usages: "idnameset <নতুন নাম>",
  cooldowns: 5
};


// ===============================
// CONFIG থেকে BOT ADMIN UID নেওয়া
// ===============================
function getBotAdmins() {
  try {
    const configPath = path.join(process.cwd(), "config.json");

    if (!fs.existsSync(configPath))
      return [];

    const config = JSON.parse(
      fs.readFileSync(configPath, "utf8")
    );

    /*
      তোমার config.json-এ যদি adminbot / ADMINBOT
      / adminUIDs যেকোনো একটি থাকে সেগুলো নেওয়া হবে।
    */

    return (
      config.adminbot ||
      config.ADMINBOT ||
      config.adminUIDs ||
      config.adminUID ||
      []
    );
  } catch (error) {
    return [];
  }
}


// ===============================
// ADMIN CHECK
// ===============================
function isBotAdmin(uid) {
  const admins = getBotAdmins();

  if (Array.isArray(admins))
    return admins.map(String).includes(String(uid));

  return String(admins) === String(uid);
}


// ===============================
// ৬০ দিনের ERROR থেকে দিন বের করা
// ===============================
function getRemainingDays(text) {

  if (!text)
    return null;

  text = String(text);

  // যেমন: 37 days
  let match = text.match(/(\d+)\s*(?:days?|দিন)/i);

  if (match)
    return parseInt(match[1]);

  // যেমন: 37 day
  match = text.match(/(\d+)\s*day/i);

  if (match)
    return parseInt(match[1]);

  return null;
}


// ===============================
// MAIN COMMAND
// ===============================
module.exports.run = async function ({
  api,
  event,
  args
}) {

  const { threadID, messageID, senderID } = event;


  // ===============================
  // BOT ADMIN CHECK
  // ===============================
  if (!isBotAdmin(senderID)) {

    return api.sendMessage(
      "❌ এই কমান্ডটি শুধুমাত্র Bot Admin ব্যবহার করতে পারবে।",
      threadID,
      messageID
    );
  }


  // ===============================
  // NAME CHECK
  // ===============================
  const newName = args.join(" ").trim();

  if (!newName) {

    return api.sendMessage(
      "⚠️ নতুন নাম লিখুন!\n\n" +
      "ব্যবহার:\n" +
      "idnameset <নতুন নাম>\n\n" +
      "উদাহরণ:\n" +
      "idnameset MR JUWEL",
      threadID,
      messageID
    );
  }


  // ===============================
  // NAME LENGTH CHECK
  // ===============================
  if (newName.length < 2) {

    return api.sendMessage(
      "❌ নামটি খুব ছোট।\nকমপক্ষে ২টি অক্ষর ব্যবহার করুন।",
      threadID,
      messageID
    );
  }


  if (newName.length > 50) {

    return api.sendMessage(
      "❌ নামটি অনেক বড়।\nসর্বোচ্চ ৫০টি অক্ষর ব্যবহার করুন।",
      threadID,
      messageID
    );
  }


  // ===============================
  // PROCESS MESSAGE
  // ===============================
  await api.sendMessage(
    "⏳ নাম পরিবর্তনের অনুরোধ প্রসেস করা হচ্ছে...\n\n" +
    "নতুন নাম: " + newName,
    threadID,
    messageID
  );


  try {

    /*
     * IMPORTANT:
     *
     * Mirai-এর standard api-তে Facebook profile name
     * পরিবর্তনের official method নাও থাকতে পারে।
     *
     * তাই নিচের method শুধুমাত্র তোমার framework/API
     * সত্যিই support করলে কাজ করবে।
     */

    if (typeof api.changeProfileName !== "function") {

      return api.sendMessage(
        "❌ নাম পরিবর্তন করা যায়নি।\n\n" +
        "কারণ:\n" +
        "এই Mirai API-তে Facebook Profile Name পরিবর্তনের " +
        "official API পাওয়া যাচ্ছে না।\n\n" +
        "⚠️ api.changeProfileName() method পাওয়া যায়নি।",
        threadID
      );
    }


    // ===============================
    // NAME CHANGE
    // ===============================
    const result = await api.changeProfileName(newName);


    // ===============================
    // SUCCESS
    // ===============================
    return api.sendMessage(
      "✅ NAME CHANGE SUCCESSFUL\n\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "👤 নতুন নাম: " + newName + "\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "✨ Facebook ID-এর নাম পরিবর্তনের অনুরোধ সফল হয়েছে।",
      threadID
    );


  } catch (error) {

    let errorText = "";

    if (error) {
      errorText =
        error.errorDescription ||
        error.message ||
        error.error ||
        String(error);
    }


    // ===============================
    // 60 DAYS CHECK
    // ===============================
    const remainingDays = getRemainingDays(errorText);


    if (
      /60\s*days?/i.test(errorText) ||
      /60\s*দিন/i.test(errorText) ||
      /change.*name/i.test(errorText)
    ) {

      if (remainingDays !== null) {

        return api.sendMessage(
          "❌ এখন নাম পরিবর্তন করা যাবে না।\n\n" +
          "⏳ আরও " + remainingDays + " দিন অপেক্ষা করতে হবে।\n\n" +
          "📅 ৬০ দিনের restriction শেষ হলে আবার নাম পরিবর্তন করতে পারবেন।",
          threadID
        );

      }

      return api.sendMessage(
        "❌ এখন নাম পরিবর্তন করা যাবে না।\n\n" +
        "⏳ Facebook-এর ৬০ দিনের নাম পরিবর্তন restriction সক্রিয় আছে।\n\n" +
        "৬০ দিন পূর্ণ হওয়ার পর আবার চেষ্টা করুন।",
        threadID
      );
    }


    // ===============================
    // OTHER ERROR
    // ===============================
    return api.sendMessage(
      "❌ নাম পরিবর্তন করা যায়নি।\n\n" +
      "কারণ:\n" +
      errorText,
      threadID
    );

  }

};
