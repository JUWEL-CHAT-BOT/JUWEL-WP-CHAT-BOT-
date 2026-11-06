const axios = require('axios');

module.exports.config = {
    name: "welcome",
    version: "1.6.0",
    hasPermssion: 0,
    credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
    description: "Welcome system with auto trigger, profile photo & auto-delete",
    commandCategory: "group",
    usages: "/welcome [reply/mention/uid]",
    cooldowns: 5
};

// ============================================================
//  ✅ Name Fetch
// ============================================================
async function getName(api, uid) {
    try {
        const info = await api.getUserInfo(uid);
        if (info && info[uid] && info[uid].name) return info[uid].name;

        const info2 = await api.getUserInfo([uid]);
        if (info2 && info2[uid] && info2[uid].name) return info2[uid].name;

        return "Facebook User";
    } catch (e) {
        return "Facebook User";
    }
}

// ============================================================
//  ✅ Text Clean
// ============================================================
function cleanText(text) {
    if (!text) return "";
    return text
        .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
        .replace(/[\u{2600}-\u{27BF}]/gu, '')
        .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// ============================================================
//  ✅ Flexible Trigger Word Detector
// ============================================================
function isTriggerWord(text) {
    if (!text) return false;

    let t = cleanText(text).toLowerCase();
    t = t.replace(/[''`´]/g, '');
    t = t.replace(/[,.!?;:"()\[\]{}<>]/g, ' ');
    t = t.replace(/\s+/g, ' ').trim();

    if (!t) return false;

    const has = (...words) => words.some(w => t.includes(w));

    // Pattern 1: আমি + নতুন / গ্রুপ + নতুন
    const hasAmi = has("আমি", "আমিও");
    const hasGroup = has("গ্রুপ", "গ্ৰুপ", "গুরুপ", "group", "গ্রুপে", "গ্ৰুপে");
    const hasNotun = has("নতুন", "new");

    if (hasAmi && hasNotun) return true;
    if (hasGroup && hasNotun) return true;
    if (hasAmi && hasGroup && hasNotun) return true;

    // Pattern 2: Phrases
    const phrases = [
        "গ্রুপে নতুন", "গ্ৰুপে নতুন", "গ্রুপে নতুন এসেছি", "গ্রুপে নতুন হলাম",
        "এই গ্রুপে নতুন", "এই গ্ৰুপে নতুন", "এই গ্রুপে আমি নতুন",
        "নতুন এসেছি", "নতুন হলাম", "নতুন যোগ", "নতুন জয়েন",
        "জয়েন করেছি", "জয়েন করলাম", "যোগ দিয়েছি", "যোগ দিলাম",
        "যোগ হলাম", "মেম্বার হলাম", "সদস্য হলাম", "গ্রুপে যোগ",
        "গ্রুপে জয়েন", "গ্রুপে এলাম", "গ্রুপে আসলাম",
        "আমি নতুন", "আমিও নতুন", "আমি নতুন এসেছি",
        "আমাকে ওয়েলকাম", "আমাকে স্বাগতম", "আমাকে welcome",
        "ওয়েলকাম করো", "ওয়েলকাম দাও", "স্বাগতম জানাও",
        "ওয়েলকাম করবেন", "স্বাগতম জানাবেন",
        "কে ওয়েলকাম করবে", "কে স্বাগতম জানাবে",
        "নতুন সদস্য", "নতুন মেম্বার",
        "গ্রুপে আসলাম", "গ্রুপে ঢুকলাম", "গ্রুপে প্রবেশ",
        "গ্রুপে প্রথম", "গ্রুপে নতুন মুখ",
        "ভাই আমি নতুন", "আপু আমি নতুন", "স্যার আমি নতুন",
        "i am new", "im new", "iam new", "im a new",
        "i am new here", "im new here",
        "i am new in this group", "im new in this group",
        "i am new to this group", "im new to this group",
        "i just joined", "i have joined", "i joined",
        "just joined", "just joined the group",
        "new member", "new here", "new in group",
        "new to this group", "new to group",
        "welcome me", "say welcome", "please welcome",
        "who will welcome", "who will welcome me",
        "add me", "i am added",
        "hi im new", "hello im new", "hey im new",
        "im the new guy", "im the new one",
        "im newbie", "im a newbie", "newbie here",
        "freshly joined", "recently joined"
    ];

    for (let p of phrases) {
        if (t.includes(p)) return true;
    }

    // Pattern 3: Solo word
    const words = t.split(/[\s।,]+/).filter(Boolean);
    const soloBan = ["নতুন", "জয়েন", "যোগ", "স্বাগতম", "ওয়েলকাম"];
    const soloEng = ["new", "join", "joined", "welcome"];

    for (let w of words) {
        if (soloBan.includes(w)) return true;
        if (soloEng.includes(w)) return true;
    }

    return false;
}

// ============================================================
//  🚀 MAIN RUN
// ============================================================
module.exports.run = async ({ api, event, args, Users }) => {
    const threadID = event.threadID;
    const threadInfo = await api.getThreadInfo(threadID).catch(() => null);
    const groupName = threadInfo?.threadName || "Unknown Group";

    const botID = api.getCurrentUserID();
    const senderID = event.senderID;
    const body = event.body || "";

    // 🚫 Bot নিজের মেসেজে trigger হবে না
    if (senderID === botID) return;

    let targetID = null;
    let deleteAfterMs = null; // ✅ কত ms পরে ডিলিট হবে

    // ===== ১. রিপ্লে (Comment/Reply) → 3 min পরে ডিলিট =====
    if (event.messageReply) {
        targetID = event.messageReply.senderID;
        deleteAfterMs = 3 * 60 * 1000; // ✅ ৩ মিনিট
    }
    // ===== ২. মেনশন → সাথে সাথে ডিলিট =====
    else if (event.mentions && Object.keys(event.mentions).length > 0) {
        const cleanBody = cleanText(body).toLowerCase();
        const welcomeWords = ["ওয়েলকাম", "স্বাগতম", "welcome", "new", "নতুন", "জয়েন", "যোগ"];
        const hasWelcomeWord = welcomeWords.some(w => cleanBody.includes(w));

        if (hasWelcomeWord || args[0] || body.startsWith("/welcome") || body.startsWith("!welcome")) {
            targetID = Object.keys(event.mentions)[0];
            deleteAfterMs = 1000; // ✅ ১ সেকেন্ড পরে ডিলিট
        }
    }
    // ===== ৩. UID → সাথে সাথে ডিলিট =====
    else if (args[0] && /^\d{5,}$/.test(args[0])) {
        targetID = args[0];
        deleteAfterMs = 1000;
    }
    // ===== ৪. অটো ট্রিগার (ভিডিও/টেক্সট) → সাথে সাথে ডিলিট =====
    else {
        if (isTriggerWord(body)) {
            targetID = senderID;
            deleteAfterMs = 1000; // ✅ ১ সেকেন্ড পরে ডিলিট
        }
    }

    if (!targetID) return;

    // ===== টার্গেট ইউজারের নাম =====
    const username = await getName(api, targetID);

    // ===== অ্যাডমিন লিস্ট =====
    const adminIDs = threadInfo?.adminIDs?.map(i => i.id) || [];
    const botadmin = "61594400795920";
    const botadminName = await getName(api, botadmin);

    // ===== Mentions তৈরি =====
    let mentions = [];
    let adminText = "";
    const seenTags = new Set();

    for (let id of adminIDs) {
        let name = await getName(api, id);
        let tag = "@" + name;
        let counter = 1;
        while (seenTags.has(tag)) {
            tag = "@" + name + " " + counter;
            counter++;
        }
        seenTags.add(tag);
        adminText += `${tag}\n`;
        mentions.push({ id: id, tag: tag });
    }

    let botTag = "@" + botadminName;
    let bc = 1;
    while (seenTags.has(botTag)) {
        botTag = "@" + botadminName + " " + bc;
        bc++;
    }
    seenTags.add(botTag);
    mentions.push({ id: botadmin, tag: botTag });

    let userTag = "@" + username;
    let uc = 1;
    while (seenTags.has(userTag)) {
        userTag = "@" + username + " " + uc;
        uc++;
    }
    seenTags.add(userTag);
    mentions.push({ id: targetID, tag: userTag });

    // ===== প্রোফাইল ফটো =====
    let profilePicStream = null;
    try {
        const avatarUrl = `https://graph.facebook.com/${targetID}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
        const response = await axios({
            method: 'get',
            url: avatarUrl,
            responseType: 'stream',
            timeout: 10000
        });
        profilePicStream = response.data;
    } catch (error) {
        console.error("Error fetching profile photo:", error);
    }

    // ===== মেসেজ তৈরি =====
    const msg = `
𐙚𐙚𐙚𐙚𐙚𐙚𐙚𐙚𐙚𐙚𐙚𐙚𐙚𐙚𐙚𐙚𐙚𐙚𐙚𐙚𐙚𐙚𐙚

❥‌‌𖠣꙰ٜٜٜٜٜٜٜٜٜ‌‌‌‌‌‌‌‌‌‌‌‌⚀ค้้้้้้้้้้้้้้้้้้้­้้้้้้้้้้้้้้้้้้้้­้้้้้้้้ـٰٖٖٖٖٖٜ۬ـٰٰٖٖٖٖٜ۬ـٰٰٰٖٖٖٜ۬ـٰٰٰٰٖٖٜ۬ـٰٰٰٰٰٖٜ۬𝐴𝑠𝑠𝑙𝑎𝑚𝑢𝑙𝑎𝑖𝑘𝑢𝑚ـٰٖٖٖٖٖٜ۬ـٰٰٖٖٖٖٜ۬ـٰٰٰٖٖٖٜ۬ـٰٰٰٰٖٖٜ۬ـٰٰٰٰٰٖٜ۬ค้้้้้้้้้้้้้้้้้้้­้้้้้้้้้้้้้้้้้้้้­้้้้้้้้⁜ٜٜٜٜٜٜٜٜٜ‌‌❥꙰
┏━━━━━━━━━━━━━━━┓

 ${groupName}

┗━━━━━━━━━━━━━━━┛
গু্ঁপে্ঁ আ্ঁমা্ঁদে্ঁর্ঁ সা্ঁথে্ঁ যু্ঁক্ত্ঁ হ্ঁও্ঁয়া্ঁর্ঁ

 জ্ঁন্য্ঁ তো্ঁমা্ঁকে্ঁ অ্ঁস্ঁংখ্য্ঁ ধ্ঁন্য্ঁবা্ঁদ্ঁ ┏━━━━━━━━━━━━━━━┓
༊তা্ঁর সা্ঁথে্ঁ ༆ এ্ঁর্ঁ প্ঁক্ষ্ঁ
থে্ঁকে্ঁ হা্ঁজা্ঁরো্ঁ কা্ঁঠ্ঁ 🌹🥀

গো্ঁলা্ঁপে্ঁর্ঁ শু্ঁভে্ঁচ্ছা্ঁ ও্ঁ

 অ্ঁভি্ঁন্ঁদ্ঁন্ঁ༊᭄আ্ঁমা্ঁদে্ঁর্ঁ সা্ঁথে্ঁই্ঁ 
সা্ঁথে্ঁ যু্ঁক্ত্ঁ হ্ঁয়ে্ঁছে্ঁন্ঁ & আ্ঁমা্ঁদে্ঁর্ঁ

 সা্ঁথে্ঁই্ঁ থা্ঁক্ঁবা্ঁ🫶🫰💝┗━━━━━━━━━━━━━━━┛

 ⍣⃟ ⍣⃟⍣⃟ ⍣⃟⍣⃟ ⍣⃟⍣⃟ ⍣⃟⍣⃟ ⍣⃟⍣⃟ ⍣⃟⍣⃟ ⍣⃟⍣⃟ ⍣⃟⍣⃟ ⍣⃟

┏━━━━━━━━━━━━━━━┓,, আ্ঁশা্ঁ,,ক্ঁরি্ঁ,,গ্রু্ঁপে্ঁ,স্ঁম্ঁয়্ঁ,,

দি্ঁবা্ঁ স্ঁবা্ঁর্ঁ,,, সা্ঁথে্ঁ,,আ্ঁড্ডা্ঁ,,

 দি্ঁবা্ঁ,, কো্ঁন্ঁ,,স্ঁম্ঁস্যা্ঁ,, হ্ঁলে্ঁ

👑এ্ঁড্ঁমি্ঁন্ঁকে্ঁ🔰,, জা্ঁনা্ঁবা্ঁ,,

,༆নি্ঁজে্ঁর্ঁ,, ম্ঁনে্ঁ,, ক্ঁরে্ঁ,

গ্রু্ঁপ্ঁটা্ঁকে্ঁ 🫶ভা্ঁলো্ঁবা্ঁস্ঁবা্ঁ★ ┗━━━━━━━━━━━━━━━┛
┏━━━━━━━━━━━━━━━━━━┓
 👤 𝐁🅞𝐓 𝐀𝐃🅜𝐈𝐍

 👉 ${botTag}
 🔗 https://www.facebook.com/profile.php?id=${botadmin}
━━━━━━━━━━━━━━━━━━━━
👥𝐆𝐎🅡𝐔𝐏 𝐀𝐃🅜𝐈𝐍 
 
 ${adminText}
┗━━━━━━━━━━━━━━━━━━━┛
╭──────•◈•──────╮
💓══❥ⵗⵗ̥̥̊̊ⵗ̥̥̥̥̊̊̊ⵗ̥̥̥̥̥̊̊̊̊ⵗ̥̥̥̥̥̥̊̊̊̊̊ⵗ̥̥̥̥̥̥̥̊̊̊̊̊ⵗ̥̥̥̥̥̥̥̥̊̊̊̊ⵗ̥̥̥̥̥̥̥̥̥̊̊̊ⵗ̥̥̥̥̥̥̥̥̥̥̊̊ⵗ̥̥̥̥̥̥̥̥̥̥̥ⵗ̥̥̥̥̥̥̥̥̥̥̊̊ⵗ̥̥̥̥̥̥̥̥̥̊̊̊ⵗ̥̥̥̥̥̥̥̥̊̊̊̊ⵗ̥̥̥̥̥̥̊̊̊̊̊ⵗ̥̥̥̥̥̊̊̊̊ⵗ̥̥̥̥̊̊̊ⵗ̥̥̊̊══❥💓 ┏━━━━━━━━━━━━━━━┓
 
 ──⃟🐱𝗪𝗘𝗟𝗖𝗢𝗠𝗘🫵🫶🫂🌷

 ━〲😽ꤪ ${userTag}

┗━━━━━━━━━━━━━━━┛
`;

    // ===== পাঠানো + Auto Delete =====
    try {
        let sentMsg;
        if (profilePicStream) {
            sentMsg = await api.sendMessage({
                body: msg,
                mentions: mentions,
                attachment: profilePicStream
            }, threadID);
        } else {
            sentMsg = await api.sendMessage({ body: msg, mentions: mentions }, threadID);
        }

        // ✅ Auto Delete Logic
        const messageID = sentMsg?.messageID || sentMsg;
        if (messageID && deleteAfterMs) {
            setTimeout(async () => {
                try {
                    await api.unsendMessage(messageID);
                    console.log(`🗑️ Deleted welcome message after ${deleteAfterMs / 1000}s`);
                } catch (err) {
                    console.error("❌ Delete failed:", err.message);
                }
            }, deleteAfterMs);
        }

    } catch (error) {
        console.error("Error sending message:", error);
        try {
            const fallbackMsg = await api.sendMessage({ body: msg, mentions: mentions }, threadID);
            const messageID = fallbackMsg?.messageID || fallbackMsg;
            if (messageID && deleteAfterMs) {
                setTimeout(async () => {
                    try {
                        await api.unsendMessage(messageID);
                    } catch (e) {}
                }, deleteAfterMs);
            }
        } catch (e) {
            console.error("Fallback failed:", e);
        }
    }
};
