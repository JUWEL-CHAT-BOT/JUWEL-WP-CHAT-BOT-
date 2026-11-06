module.exports.config = {
    name: "antijoinEvent",
    eventType: ["log:subscribe"],
    version: "2.0.0",
    credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
    description: "এন্টি জয়েন চালু থাকলে নতুন মেম্বার রিমুভ করবে"
};

module.exports.run = async function ({ api, event, Threads }) {
    const { threadID, logMessageData } = event;

    const threadData = await Threads.getData(threadID);
    const data = threadData.data || {};
    if (!data.newMember) return; // বন্ধ থাকলে কিছু করবে না

    const botID = api.getCurrentUserID();
    const added = logMessageData.addedParticipants || [];

    for (const user of added) {
        const uid = user.userFbId;
        if (uid == botID) continue; // বট নিজেকে রিমুভ করবে না

        try {
            await api.removeUserFromGroup(uid, threadID);
            api.sendMessage(
`╭━━━━━━━━━━━━━━━━━━╮
   🛡️ এন্টি জয়েন সক্রিয়
╰━━━━━━━━━━━━━━━━━━╯
🚷 ${user.fullName || "নতুন মেম্বার"} কে
   গ্রুপ থেকে রিমুভ করা হয়েছে।

ℹ️ এই গ্রুপে নতুন মেম্বার জয়েন বন্ধ আছে।`, threadID);
        } catch (e) {
            console.log("[ANTIJOIN] রিমুভ করা যায়নি:", e);
        }
    }
};
