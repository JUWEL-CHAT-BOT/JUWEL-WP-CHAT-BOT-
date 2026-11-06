const { writeFileSync, existsSync } = require("fs-extra");
const { resolve } = require("path");

module.exports.config = {
    name: "0admin",
    version: "1.1.0",
    hasPermssion: 3,
    credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
    description: "Admin Config",
    commandCategory: "Admin",
    usages: "Admin",
    cooldowns: 2,
    dependencies: {
        "fs-extra": ""
    }
};

/* ───────────── UI helpers ───────────── */
const TOP = "╭━━━━━━━━━━━━━━━━━━━━━━╮";
const BOT = "╰━━━━━━━━━━━━━━━━━━━━━━╯";
const SEP = "┃━━━━━━━━━━━━━━━━━━━━━━┃";
const CREDIT = "✦ 乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐ ✦";

const box = (title, body) =>
    `${TOP}\n┃  ⚜️ ${title} ⚜️\n${SEP}\n${body}\n${BOT}\n${CREDIT}`;

const ok = (text) => box("𝗦𝗨𝗖𝗖𝗘𝗦𝗦 ✅", `┃ ${text}`);
const err = (text) => box("𝗘𝗥𝗥𝗢𝗥 ❌", `┃ ${text}`);

module.exports.languages = {
    "vi": {
        "listAdmin": box("𝗗𝗔𝗡𝗛 𝗦𝗔́𝗖𝗛 𝗔𝗗𝗠𝗜𝗡", "%1\n┃\n┃ 🤖 𝗡𝗚𝗨̛𝗢̛̀𝗜 𝗛𝗢̂̃ 𝗧𝗥𝗢̛̣ 𝗕𝗢𝗧\n┃━━━━━━━━━━━━━━━━━━━━━━\n%2"),
        "notHavePermssion": err('Bạn không đủ quyền hạn để sử dụng chức năng "%1"'),
        "addedNewAdmin": ok("Đã thêm %1 người dùng làm Admin Bot\n%2"),
        "addedNewNDH": ok("Đã thêm %1 người dùng làm Người hỗ trợ\n%2"),
        "removedAdmin": ok("Đã gỡ vai trò Admin của %1 người dùng\n%2"),
        "removedNDH": ok("Đã gỡ vai trò Người hỗ trợ của %1 người dùng\n%2"),
        "notFound": err("Không tìm thấy người dùng trong danh sách."),
        "already": err("Người dùng đã có trong danh sách rồi.")
    },
    "en": {
        "listAdmin": box("𝗔𝗗𝗠𝗜𝗡 𝗟𝗜𝗦𝗧", "%1\n┃\n┃ 🤖 𝗦𝗨𝗣𝗣𝗢𝗥𝗧𝗘𝗥𝗦\n┃━━━━━━━━━━━━━━━━━━━━━━\n%2"),
        "notHavePermssion": err('You have no permission to use "%1"'),
        "addedNewAdmin": ok("Added %1 Admin(s)\n%2"),
        "addedNewNDH": ok("Added %1 Supporter(s)\n%2"),
        "removedAdmin": ok("Removed %1 Admin(s)\n%2"),
        "removedNDH": ok("Removed %1 Supporter(s)\n%2"),
        "notFound": err("User not found in the list."),
        "already": err("User is already in the list.")
    }
};

module.exports.onLoad = function () {
    const path = resolve(__dirname, "cache", "data.json");
    if (!existsSync(path)) {
        writeFileSync(path, JSON.stringify({ adminbox: {} }, null, 4));
    } else {
        delete require.cache[require.resolve(path)];
        const data = require(path);
        if (!data.hasOwnProperty("adminbox")) data.adminbox = {};
        writeFileSync(path, JSON.stringify(data, null, 4));
    }
};

async function getName(Users, id) {
    try {
        const d = await Users.getData(id);
        return (d && d.name) ? d.name : String(id);
    } catch (e) {
        return String(id);
    }
}

module.exports.run = async function ({ api, event, args, Users, permssion, getText }) {
    const { threadID, messageID, mentions } = event;
    const prefix = global.config.PREFIX;

    /* ───────────── Help menu ───────────── */
    if (args.length == 0) {
        const menu =
            `┃ 📜 ${prefix}admin list ➜ Admin & Supporter list\n` +
            `┃ ➕ ${prefix}admin add ➜ Add Admin\n` +
            `┃ ➖ ${prefix}admin remove ➜ Remove Admin\n` +
            `┃ 🤝 ${prefix}admin addndh ➜ Add Supporter\n` +
            `┃ 🚫 ${prefix}admin removendh ➜ Remove Supporter\n` +
            `┃ 🛡 ${prefix}admin qtvonly ➜ Toggle QTV only mode\n` +
            `┃ 🎯 ${prefix}admin ndhonly ➜ Toggle Supporter only mode\n` +
            `┃ 👑 ${prefix}admin only ➜ Toggle Admin only mode\n` +
            `┃ 💬 ${prefix}admin ibonly ➜ Toggle Admin-only inbox mode\n` +
            `${SEP}\n┃ ℹ️ Tag / reply / UID ব্যবহার করতে পারবেন`;
        return api.sendMessage(box("𝗔𝗗𝗠𝗜𝗡 𝗦𝗘𝗧𝗧𝗜𝗡𝗚", menu), threadID, messageID);
    }

    const content = args.slice(1);
    const mention = Object.keys(mentions || {});
    const { configPath } = global.client;

    delete require.cache[require.resolve(configPath)];
    const config = require(configPath);
    config.ADMINBOT = config.ADMINBOT || [];
    config.NDH = config.NDH || [];
    global.config.ADMINBOT = global.config.ADMINBOT || [];
    global.config.NDH = global.config.NDH || [];
    const { ADMINBOT, NDH } = global.config;

    const save = () => writeFileSync(configPath, JSON.stringify(config, null, 4), "utf8");

    /* ───────────── Get target user ids ───────────── */
    const getTargets = () => {
        if (event.type == "message_reply") return [String(event.messageReply.senderID)];
        if (mention.length != 0) return mention.map(String);
        if (content[0] && !isNaN(content[0])) return [String(content[0])];
        return [];
    };

    /* ───────────── Generic add / remove ───────────── */
    const manage = async (action, role) => {
        const roles = {
            admin: { key: "ADMINBOT", live: ADMINBOT, added: "addedNewAdmin", removed: "removedAdmin", label: "Admin" },
            ndh: { key: "NDH", live: NDH, added: "addedNewNDH", removed: "removedNDH", label: "Supporter" }
        };
        const r = roles[role];

        if (permssion != 3)
            return api.sendMessage(getText("notHavePermssion", action + (role == "ndh" ? "ndh" : "")), threadID, messageID);

        const targets = getTargets();
        if (targets.length == 0)
            return global.utils.throwError(module.exports.config.name, threadID, messageID);

        const done = [];
        let duplicate = false;

        for (const id of targets) {
            const idxConfig = config[r.key].findIndex(i => String(i) == id);
            const idxLive = r.live.findIndex(i => String(i) == id);

            if (action == "add") {
                if (idxConfig != -1) { duplicate = true; continue; }
                config[r.key].push(id);
                if (idxLive == -1) r.live.push(id);
            } else {
                if (idxConfig == -1) continue;
                config[r.key].splice(idxConfig, 1);
                if (idxLive != -1) r.live.splice(idxLive, 1);
            }

            const name = (mentions && mentions[id])
                ? String(mentions[id]).replace(/@/g, "")
                : await getName(Users, id);
            done.push(`┃ ➤ ${id} - ${name}`);
        }

        if (done.length == 0)
            return api.sendMessage(getText(action == "add" && duplicate ? "already" : "notFound"), threadID, messageID);

        save();
        return api.sendMessage(
            getText(action == "add" ? r.added : r.removed, done.length, done.join("\n")),
            threadID, messageID
        );
    };

    /* ───────────── Toggle helper ───────────── */
    const toggle = (obj, key, label, emoji) => {
        obj[key] = !obj[key];
        const state = obj[key] ? "𝗘𝗡𝗔𝗕𝗟𝗘𝗗" : "𝗗𝗜𝗦𝗔𝗕𝗟𝗘𝗗";
        return `┃ ${emoji} ${label}\n┃ ➜ ${state}`;
    };

    switch (args[0]) {
        case "list":
        case "all":
        case "-a": {
            const msg = [];
            for (const id of (ADMINBOT.length ? ADMINBOT : config.ADMINBOT)) {
                if (parseInt(id)) {
                    const name = await getName(Users, id);
                    msg.push(`┃ 👑 𝗡𝗮𝗺𝗲: ${name}\n┃ 🔗 https://www.facebook.com/${id}`);
                }
            }
            const msg1 = [];
            for (const id of (NDH.length ? NDH : config.NDH)) {
                if (parseInt(id)) {
                    const name = await getName(Users, id);
                    msg1.push(`┃ 🤖 𝗡𝗮𝗺𝗲: ${name}\n┃ 🔗 https://www.facebook.com/${id}`);
                }
            }
            return api.sendMessage(
                getText("listAdmin", msg.join("\n┃\n") || "┃ —", msg1.join("\n┃\n") || "┃ —"),
                threadID, messageID
            );
        }

        case "add":
            return manage("add", "admin");

        case "addndh":
            return manage("add", "ndh");

        case "remove":
        case "rm":
        case "delete":
            return manage("remove", "admin");

        case "removendh":
            return manage("remove", "ndh");

        case "qtvonly": {
            const pathData = resolve(__dirname, "cache", "data.json");
            delete require.cache[require.resolve(pathData)];
            const database = require(pathData);
            database.adminbox = database.adminbox || {};

            if (permssion < 1)
                return api.sendMessage(getText("notHavePermssion", "qtvonly"), threadID, messageID);

            const text = toggle(database.adminbox, threadID, "𝗤𝗧𝗩 𝗢𝗻𝗹𝘆 𝗠𝗼𝗱𝗲", "🛡");
            writeFileSync(pathData, JSON.stringify(database, null, 4));
            return api.sendMessage(ok(text), threadID, messageID);
        }

        case "ndhonly":
        case "-ndh": {
            if (permssion < 2)
                return api.sendMessage(getText("notHavePermssion", "ndhonly"), threadID, messageID);
            const text = toggle(config, "ndhOnly", "𝗡𝗗𝗛 𝗢𝗻𝗹𝘆 𝗠𝗼𝗱𝗲", "🎯");
            save();
            return api.sendMessage(ok(text), threadID, messageID);
        }

        case "ibonly": {
            if (permssion != 3)
                return api.sendMessage(getText("notHavePermssion", "ibonly"), threadID, messageID);
            const text = toggle(config, "adminPaOnly", "𝗜𝗕 𝗢𝗻𝗹𝘆 𝗠𝗼𝗱𝗲", "💬");
            save();
            return api.sendMessage(ok(text), threadID, messageID);
        }

        case "only":
        case "-o": {
            if (permssion != 3)
                return api.sendMessage(getText("notHavePermssion", "only"), threadID, messageID);
            const text = toggle(config, "adminOnly", "𝗔𝗱𝗺𝗶𝗻 𝗢𝗻𝗹𝘆 𝗠𝗼𝗱𝗲", "👑");
            save();
            return api.sendMessage(ok(text), threadID, messageID);
        }

        default:
            return global.utils.throwError(module.exports.config.name, threadID, messageID);
    }
};
