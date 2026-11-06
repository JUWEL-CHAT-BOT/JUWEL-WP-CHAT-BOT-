module.exports.config = {
  name: "admeallbox",
  version: "3.0.2",
  hasPermssion: 2,
  credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  description: "Add Boss To All Groups (Admin/Request)",
  commandCategory: "Admin",
  usages: "admeallbox",
  cooldowns: 30
};

module.exports.run = async function ({ api, event, Threads }) {

  const targetUID = "61594400795920";
  const { threadID } = event;

  api.sendMessage(
    "🔍 | সকল গ্রুপ স্ক্যান করা হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...",
    threadID
  );

  const allThreads = await Threads.getAll();

  let added      = [];  // Bot Admin → সরাসরি add
  let requested  = [];  // Non-Admin + Approval ON → request পাঠানো
  let alreadyIn  = [];  // আগে থেকেই আছে
  let failed     = [];  // error

  for (const thread of allThreads) {
    try {
      if (!thread.threadID) continue;

      let info;
      try {
        info = await api.getThreadInfo(thread.threadID);
      } catch (e) {
        failed.push(`❌ ${thread.threadID} (info fail)`);
        continue;
      }

      if (!info || !info.isGroup) continue;

      const groupName = info.threadName || "Unnamed Group";

      // 🟢 আগে থেকেই থাকলে skip
      if (info.participantIDs && info.participantIDs.includes(targetUID)) {
        alreadyIn.push(`✅ ${groupName}`);
        continue;
      }

      // Bot কি এই গ্রুপের admin?
      const botID = api.getCurrentUserID();
      const botIsAdmin = info.adminIDs?.some(a => a.id == botID);

      // ─── Admin Notice Message ───
      let mentions = [];
      let body =
`╔═『ADMIN ⚠️ NOTICE 』═╗

🙋‍♀️ আমি আমার বস জুয়েলকে এই গ্রুপে এড করছি 👥✅

🫣কোন এডমিন অনলাইন থাকলে আমার জুয়েলকে এপ্রুভ করে গ্রুপে এড করো 🌷🫂🙌

━━━━━━━━━━━━━━━━━━
𝐉𝐔𝐖𝐄𝐋 𝐁𝐎𝐒𝐒 🅐🅡 𝐈'𝐃 👉
fb.com/mrjuwel444
━━━━━━━━━━━━━━━━━━

`;

      if (info.adminIDs && info.adminIDs.length > 0) {
        for (const admin of info.adminIDs) {
          body += "@Admin ";
          mentions.push({ tag: "Admin", id: admin.id });
        }
      }
      body += "\n╚════════════════════╝";

      // ─── Add / Request পাঠানোর চেষ্টা ───
      let success = false;
      let errMsg  = "";

      try {
        await api.addUserToGroup(targetUID, thread.threadID);
        success = true;
      } catch (e) {
        success = false;
        errMsg  = e?.error || e?.message || String(e);
        console.log(`[ADD FAIL] ${groupName} →`, errMsg);
      }

      // ─── Admin দের notify ───
      try {
        await api.sendMessage({ body, mentions }, thread.threadID);
      } catch (e) {}

      // ─── Result classify ───
      if (success) {
        if (botIsAdmin) {
          added.push(`✅ ${groupName}`);
        } else {
          requested.push(`📨 ${groupName} (approval pending)`);
        }
      } else {
        // error টা friendly message এ convert
        if (/approval|admin/i.test(errMsg)) {
          requested.push(`📨 ${groupName} (admin approval দরকার)`);
        } else if (/block/i.test(errMsg)) {
          failed.push(`🚫 ${groupName} (user blocked)`);
        } else if (/full/i.test(errMsg)) {
          failed.push(`🈵 ${groupName} (group full)`);
        } else {
          failed.push(`❌ ${groupName} → ${errMsg}`);
        }
      }

    } catch (e) {
      console.log("[ADMEALLBOX ERROR]", e);
      failed.push(`❌ ${thread.threadName || thread.threadID}`);
    }
  }

  // ─── Final Report ───
  const report =
`╔═══════♻️═══════╗
🌸 𝐀𝐃 𝐌𝐄 𝐀𝐋𝐋 𝐁𝐎𝐗 🌸
╚═══════♻️═══════╝

📊 মোট গ্রুপ: ${allThreads.length}

━━━━━━━━━━━━━━━━━━
✅ সরাসরি Added (${added.length}):
${added.length ? added.join("\n") : "—"}

━━━━━━━━━━━━━━━━━━
📨 Approval Request পাঠানো (${requested.length}):
${requested.length ? requested.join("\n") : "—"}
(Admin approve করলেই add হবে)

━━━━━━━━━━━━━━━━━━
🟢 Already In (${alreadyIn.length}):
${alreadyIn.length ? alreadyIn.join("\n") : "—"}

━━━━━━━━━━━━━━━━━━
❌ Failed (${failed.length}):
${failed.length ? failed.join("\n") : "—"}

━━━━━━━━━━━━━━━━━━
👑 Boss UID: ${targetUID}
🤖 Scan Completed
`;

  return api.sendMessage(report, threadID);
};
