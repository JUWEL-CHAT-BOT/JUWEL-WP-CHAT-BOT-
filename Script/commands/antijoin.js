module.exports.config = {
    name: "antijoin",
    version: "2.0.0",
    hasPermssion: 1, // গ্রুপ এডমিন ও বট এডমিন দুজনেই চালাতে পারবে
    credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
    description: "নতুন মেম্বার জয়েন বন্ধ/চালু করুন",
    commandCategory: "system",
    usages: "antijoin on/off",
    cooldowns: 3
};

module.exports.run = async function ({ api, event, args, Threads }) {
    const { threadID, messageID, senderID } = event;

    // বট এডমিন নাকি গ্রুপ এডমিন চেক
    const info = await api.getThreadInfo(threadID);
    const isBotAdmin = (global.config.ADMINBOT || []).includes(senderID);
    const isGroupAdmin = info.adminIDs.some(i => i.id == senderID);

    if (!isBotAdmin && !isGroupAdmin)
        return api.sendMessage(
`╭──────────────────╮
   🚫 অনুমতি নেই
╰──────────────────╯
❌ শুধু বট এডমিন ও গ্রুপ এডমিন
   এই কমান্ড ব্যবহার করতে পারবে।`, threadID, messageID);

    // বট নিজে গ্রুপ এডমিন কিনা চেক
    if (!info.adminIDs.some(i => i.id == api.getCurrentUserID()))
        return api.sendMessage(
`╭──────────────────╮
   ⚠️ সতর্কতা
╰──────────────────╯
🤖 বটকে আগে গ্রুপের এডমিন বানান,
   তারপর আবার চেষ্টা করুন।`, threadID, messageID);

    const threadData = await Threads.getData(threadID);
    const data = threadData.data || {};

    const option = (args[0] || "").toLowerCase();
    if (option === "on") data.newMember = true;
    else if (option === "off") data.newMember = false;
    else data.newMember = !data.newMember; // আর্গুমেন্ট না দিলে টগল

    await Threads.setData(threadID, { data });
    global.data.threadData.set(parseInt(threadID), data);

    const status = data.newMember;
    return api.sendMessage(
`╭━━━━━━━━━━━━━━━━━━╮
   🛡️ এন্টি জয়েন সিস্টেম
╰━━━━━━━━━━━━━━━━━━╯

📌 অবস্থা : ${status ? "🟢 চালু" : "🔴 বন্ধ"}

${status
    ? "✅ এখন থেকে নতুন কেউ গ্রুপে জয়েন করলে\n   তাকে স্বয়ংক্রিয়ভাবে রিমুভ করা হবে।"
    : "✅ এখন থেকে নতুন মেম্বার\n   স্বাভাবিকভাবে জয়েন করতে পারবে।"}

━━━━━━━━━━━━━━━━━━
👑 ক্রেডিট : 乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐`, threadID, messageID);
};
