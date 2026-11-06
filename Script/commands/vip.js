const fs = require("fs");
const path = require("path");

module.exports.config = {
    name: "vip",
    version: "1.1.0",
    hasPermssion: 3, // শুধু ADMINBOT
    credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
    description: "ভিআইপি মোড ও ভিআইপি ইউজার ম্যানেজ করুন",
    commandCategory: "Admin",
    usages: "[on|off|add|remove|list|status] <userID / reply / mention>",
    cooldowns: 5
};

// ===== UI হেল্পার =====
const LINE = "━━━━━━━━━━━━━━━━━━";
const ui = (icon, title, body) =>
    `╭${LINE}╮\n   ${icon} ${title}\n╰${LINE}╯\n${body ? body + "\n" : ""}\n✦ 乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐`;

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const cacheDir = path.join(__dirname, "../../Script/commands/cache");
    const vipFilePath = path.join(cacheDir, "vip.json");
    const vipModePath = path.join(cacheDir, "vipMode.json");

    const send = (msg) => api.sendMessage(msg, threadID, messageID);

    // ===== ফাইল হেল্পার =====
    const ensureDir = () => {
        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
    };

    const loadVIP = () => {
        try {
            if (!fs.existsSync(vipFilePath)) return [];
            const data = JSON.parse(fs.readFileSync(vipFilePath, "utf-8"));
            return Array.isArray(data) ? data.map(String) : [];
        } catch (e) {
            return [];
        }
    };

    const saveVIP = (list) => {
        ensureDir();
        fs.writeFileSync(vipFilePath, JSON.stringify(list, null, 2), "utf-8");
    };

    const loadVIPMode = () => {
        try {
            if (!fs.existsSync(vipModePath)) return false;
            const data = JSON.parse(fs.readFileSync(vipModePath, "utf-8"));
            return Boolean(data.vipMode);
        } catch (e) {
            return false;
        }
    };

    const saveVIPMode = (mode) => {
        ensureDir();
        fs.writeFileSync(vipModePath, JSON.stringify({ vipMode: mode }, null, 2), "utf-8");
    };
    // ===== হেল্পার শেষ =====

    const subCommand = args[0]?.toLowerCase();

    if (!subCommand) {
        return send(ui("🎀", "ভিআইপি কমান্ড",
            "ব্যবহার:\n• vip on — ভিআইপি মোড চালু\n• vip off — ভিআইপি মোড বন্ধ\n• vip add <ID/রিপ্লাই/মেনশন>\n• vip remove <ID/রিপ্লাই/মেনশন>\n• vip list — ভিআইপি তালিকা\n• vip status — বর্তমান অবস্থা"));
    }

    // টার্গেট আইডি: আর্গুমেন্ট > রিপ্লাই > মেনশন
    let targetID = args[1];
    if (!targetID && event.messageReply) targetID = event.messageReply.senderID;
    if (!targetID && event.mentions && Object.keys(event.mentions).length > 0) {
        targetID = Object.keys(event.mentions)[0];
    }
    if (targetID) targetID = String(targetID);

    let vipList = loadVIP();

    switch (subCommand) {
        case "on":
            saveVIPMode(true);
            return send(ui("✅", "ভিআইপি মোড চালু",
                "এখন শুধুমাত্র 💎 ভিআইপি ইউজাররা কমান্ড ব্যবহার করতে পারবে।"));

        case "off":
            saveVIPMode(false);
            return send(ui("🔓", "ভিআইপি মোড বন্ধ",
                "এখন সবাই কমান্ড ব্যবহার করতে পারবে।"));

        case "status":
            return send(ui("📊", "বর্তমান অবস্থা",
                `• ভিআইপি মোড: ${loadVIPMode() ? "🟢 চালু" : "🔴 বন্ধ"}\n• মোট ভিআইপি: ${vipList.length} জন`));

        case "add":
            if (!targetID)
                return send(ui("❌", "ত্রুটি", "দয়া করে ইউজার আইডি দিন, কাউকে রিপ্লাই করুন বা মেনশন করুন।"));
            if (vipList.includes(targetID))
                return send(ui("⚠️", "আগে থেকেই ভিআইপি", `আইডি: ${targetID}\nএই ইউজার আগে থেকেই ভিআইপি তালিকায় আছে।`));
            vipList.push(targetID);
            saveVIP(vipList);
            return send(ui("💎", "ভিআইপি যোগ করা হয়েছে", `আইডি: ${targetID}\nসফলভাবে ভিআইপি তালিকায় যোগ করা হয়েছে।`));

        case "remove":
            if (!targetID)
                return send(ui("❌", "ত্রুটি", "দয়া করে ইউজার আইডি দিন, কাউকে রিপ্লাই করুন বা মেনশন করুন।"));
            if (!vipList.includes(targetID))
                return send(ui("⚠️", "খুঁজে পাওয়া যায়নি", `আইডি: ${targetID}\nএই ইউজার ভিআইপি তালিকায় নেই।`));
            vipList = vipList.filter((id) => id !== targetID);
            saveVIP(vipList);
            return send(ui("🗑️", "ভিআইপি সরানো হয়েছে", `আইডি: ${targetID}\nভিআইপি তালিকা থেকে সরিয়ে দেওয়া হয়েছে।`));

        case "list":
            if (vipList.length === 0)
                return send(ui("📋", "ভিআইপি তালিকা", "তালিকা এখন খালি।"));
            return send(ui("📋", "ভিআইপি তালিকা",
                vipList.map((id, i) => `${i + 1}. 💎 ${id}`).join("\n") + `\n\nমোট: ${vipList.length} জন`));

        default:
            return send(ui("❓", "অজানা সাব-কমান্ড",
                "ব্যবহার: vip [on|off|add|remove|list|status] <ID/রিপ্লাই/মেনশন>"));
    }
};
