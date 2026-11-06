module.exports.config = {
	name: "adduser",
	version: "6.0.0",
	hasPermssion: 0,
	credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
	description: "Add user to group by UID or Facebook link (bot admin only)",
	commandCategory: "group",
	usages: "[uid/link]",
	cooldowns: 5,
	usePrefix: true
};

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

//━━━━━━━━━━━━━━━
// ✅ GET UID FROM LINK
//━━━━━━━━━━━━━━━
async function getUID(url) {
	try {
		if (!url.includes("facebook.com") && !url.includes("fb.com"))
			return [null, null, true];
		if (!url.startsWith("http")) url = "https://" + url;

		const res = await axios.get(url, {
			headers: { "user-agent": "Mozilla/5.0" },
			timeout: 10000
		});
		const data = res.data;

		const uid =
			data.match(/"userID":"(\d+)"/)?.[1] ||
			data.match(/"entity_id":"(\d+)"/)?.[1] ||
			data.match(/"profile_id":"(\d+)"/)?.[1] ||
			data.match(/profile\.php\?id=(\d+)/)?.[1];

		const name =
			data.match(/<title>(.*?)<\/title>/)?.[1]?.replace(" | Facebook", "") ||
			"Facebook User";

		if (!uid) return [null, null, true];
		return [uid, name, false];
	} catch (e) {
		return [null, null, true];
	}
}

//━━━━━━━━━━━━━━━
// ✅ GET NAMES FROM UIDs
//━━━━━━━━━━━━━━━
async function getUserNames(api, ids) {
	try {
		const info = await new Promise((resolve, reject) => {
			api.getUserInfo(ids, (err, data) => (err ? reject(err) : resolve(data)));
		});
		const result = {};
		for (const id of ids) result[id] = info?.[id]?.name || "Admin";
		return result;
	} catch (e) {
		const result = {};
		for (const id of ids) result[id] = "Admin";
		return result;
	}
}

//━━━━━━━━━━━━━━━
// ✅ CHECK BOT ADMIN (config.json → ADMINBOT)
//━━━━━━━━━━━━━━━
function isBotAdmin(senderID) {
	try {
		const candidates = [
			path.join(process.cwd(), "config.json"),
			path.join(__dirname, "..", "..", "config.json"),
			path.join(__dirname, "..", "config.json")
		];

		const configPath = candidates.find(p => fs.existsSync(p));
		if (!configPath) return false;

		const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
		const admins = (config.ADMINBOT || []).map(String);
		return admins.includes(String(senderID));
	} catch (e) {
		console.log("[adduser] config read error:", e.message);
		return false;
	}
}

//━━━━━━━━━━━━━━━
// ✅ SAFE getThreadInfo
//━━━━━━━━━━━━━━━
async function safeGetThreadInfo(api, threadID) {
	try {
		if (typeof api.getThreadInfo === "function") {
			const info = await api.getThreadInfo(threadID);
			if (info) return info;
		}
	} catch (e) {
		console.log("[adduser] getThreadInfo failed:", e.message);
	}

	try {
		if (typeof api.getThreadList === "function") {
			const list = await api.getThreadList(50, null, ["INBOX"]);
			const t = list.find(x => x.threadID == threadID);
			if (t) return t;
		}
	} catch (e) {
		console.log("[adduser] getThreadList failed:", e.message);
	}

	return null;
}

//━━━━━━━━━━━━━━━
// ✅ CHECK USER IN GROUP (fresh)
// true = আছে | false = নেই | null = যাচাই করা যায়নি
//━━━━━━━━━━━━━━━
async function isUserInGroup(api, threadID, uid) {
	await new Promise(r => setTimeout(r, 3000));
	const info = await safeGetThreadInfo(api, threadID);
	if (!info || !Array.isArray(info.participantIDs)) return null;
	return info.participantIDs.map(String).includes(String(uid));
}

//━━━━━━━━━━━━━━━
// ✅ MAIN RUN
//━━━━━━━━━━━━━━━
module.exports.run = async function ({ api, event, args }) {
	const { threadID, messageID, senderID } = event;
	const botID = String(api.getCurrentUserID());
	const send = (msg) => api.sendMessage(msg, threadID, messageID);

	// ❌ BOT ADMIN CHECK (config.json)
	if (!isBotAdmin(senderID)) {
		return send(`╭━━━❌ ACCESS DENIED ❌━━━╮
┃
┃ ⚠️ শুধুমাত্র BOT ADMIN এই কমান্ড
┃ ব্যবহার করতে পারবে!
╰━━━━━━━━━━━━━━━━━━╯`);
	}

	// ❌ NO INPUT
	if (!args[0]) {
		return send(`╭━━━📌 ADDUSER SYSTEM 📌━━━╮
┃
┃ ➤ উদাহরণ:
┃ /adduser 1000xxxxxxxx
┃ /adduser https://facebook.com/xxx
╰━━━━━━━━━━━━━━━━━━╯`);
	}

	const loadingMsg = await api.sendMessage(
		`╭━━━⏳ PROCESSING ⏳━━━╮
┃
┃ 🔍 User Checking...
┃ 📡 Collecting UID...
┃ ⚙️ Preparing Add System...
╰━━━━━━━━━━━━━━━━━━╯`,
		threadID
	);

	const removeLoading = () => {
		try { api.unsendMessage(loadingMsg.messageID); } catch (e) {}
	};

	// UID / LINK
	let uid;
	let name = "Facebook User";

	if (!isNaN(args[0])) {
		uid = String(args[0]);
		const names = await getUserNames(api, [uid]);
		name = names[uid] === "Admin" ? "Facebook User" : names[uid];
	} else {
		const [id, userName, fail] = await getUID(args[0]);
		if (fail || !id) {
			removeLoading();
			return send(`╭━━━❌ FAILED ❌━━━╮
┃
┃ ⚠️ Facebook UID বের করা যায়নি!
╰━━━━━━━━━━━━━━━━━━╯`);
		}
		uid = String(id);
		name = userName;
	}

	// ✅ THREAD INFO (আগে থেকে: approval mode, admin list, bot admin কিনা)
	const beforeInfo = await safeGetThreadInfo(api, threadID);

	let adminIDs = [];
	let approvalMode = false;
	let isBotAdminInGroup = false;

	if (beforeInfo) {
		adminIDs = (beforeInfo.adminIDs || []).map(e => String(e.id || e));
		approvalMode = beforeInfo.approvalMode === true || beforeInfo.approvalMode === 1;
		isBotAdminInGroup = adminIDs.includes(botID);

		// ALREADY IN GROUP
		if ((beforeInfo.participantIDs || []).map(String).includes(uid)) {
			removeLoading();
			return send(`╭━━━⚠️ USER EXIST ⚠️━━━╮
┃
┃ 👤 ${name}
┃ 🆔 ${uid}
┃
┃ আগে থেকেই গ্রুপে আছে।
╰━━━━━━━━━━━━━━━━━━╯`);
		}
	}

	//━━━━━━━━━━━━━━━
	// ✅ ADD USER
	//━━━━━━━━━━━━━━━
	try {
		let added = false;
		let lastErr;

		try {
			await api.addUserToGroup(uid, threadID);
			added = true;
		} catch (e1) {
			lastErr = e1;
			try {
				await api.addUserToGroup(threadID, uid);
				added = true;
			} catch (e2) {
				lastErr = e2;
			}
		}

		removeLoading();

		if (!added) throw lastErr;

		// ✅ আসলেই গ্রুপে ঢুকেছে কিনা যাচাই
		const inGroup = await isUserInGroup(api, threadID, uid);

		// 🎉 সরাসরি অ্যাড হয়ে গেছে
		if (inGroup === true) {
			return send(`╭━━━✅ USER ADDED ✅━━━╮
┃
┃ 👤 Name : ${name}
┃ 🆔 UID  : ${uid}
┃
┃ 🎉 সফলভাবে গ্রুপে এড করা হয়েছে!
╰━━━━━━━━━━━━━━━━━━╯`);
		}

		// 🔔 APPROVAL চালু → গ্রুপ এডমিনদের মেনশন
		if (approvalMode) {
			const admins = adminIDs.filter(id => id !== botID).slice(0, 15);

			let body = `╭━━━🔔 APPROVAL NEEDED 🔔━━━╮
┃
┃ 👤 Name : ${name}
┃ 🆔 UID  : ${uid}
┃
┃ ✅ বট এই ইউজারকে এড করেছে।
┃ ⚠️ গ্রুপে Approval চালু আছে,
┃ তাই কোনো এডমিন তাকে
┃ Approve করে এড করে দিন।
╰━━━━━━━━━━━━━━━━━━╯`;

			const mentions = [];

			if (admins.length > 0) {
				const names = await getUserNames(api, admins);
				body += "\n\n👮 Admins:";
				for (const id of admins) {
					const tag = "@" + names[id];
					body += "\n";
					const fromIndex = body.length;
					body += tag;
					mentions.push({ tag, id, fromIndex });
				}
			}

			return api.sendMessage({ body, mentions }, threadID, messageID);
		}

		// ⚠️ APPROVAL বন্ধ, কিন্তু বট এডমিন নয় → জয়েন রিকুয়েস্ট
		if (!isBotAdminInGroup) {
			return send(`╭━━━⏳ JOIN REQUEST ⏳━━━╮
┃
┃ 👤 Name : ${name}
┃ 🆔 UID  : ${uid}
┃
┃ ✅ Join request পাঠানো হয়েছে।
┃ ⚠️ বট এই গ্রুপের এডমিন নয়,
┃ তাই সরাসরি এড করতে পারেনি।
╰━━━━━━━━━━━━━━━━━━╯`);
		}

		// যাচাই করা যায়নি
		return send(`╭━━━✅ REQUEST SENT ✅━━━╮
┃
┃ 👤 Name : ${name}
┃ 🆔 UID  : ${uid}
┃
┃ অ্যাড রিকুয়েস্ট সফল হয়েছে,
┃ তবে স্ট্যাটাস যাচাই করা যায়নি।
╰━━━━━━━━━━━━━━━━━━╯`);

	} catch (e) {
		removeLoading();
		console.log("[adduser] addUserToGroup error:", e);
		return send(`╭━━━❌ ADD FAILED ❌━━━╮
┃
┃ ⚠️ ইউজারকে এড করা যায়নি!
┃
┃ 📌 Possible Reasons:
┃ • Profile Locked
┃ • Add Option Off
┃ • Bot Blocked
┃ • Invalid UID
┃ • Bot Not Admin in Group
┃
┃ 🛠 Error: ${String((e && (e.message || e.error)) || "Unknown").slice(0, 100)}
╰━━━━━━━━━━━━━━━━━━╯`);
	}
};
