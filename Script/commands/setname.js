const CREDIT = "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐";

module.exports.config = {
	name: "setname",
	version: "1.0.1",
	hasPermssion: 0,
	credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
	description: "Nickname পরিবর্তন করুন",
	commandCategory: "Box Chat",
	usages: "[name] | reply [name] | @tag [name]",
	cooldowns: 3
};

module.exports.run = async function ({ api, event, args }) {

	// ⚠️ ক্রেডিট পরিবর্তন করলে কমান্ড কাজ করবে না
	if (module.exports.config.credits !== CREDIT) {
		return api.sendMessage("❌ ক্রেডিট বদলানো হয়েছে, কমান্ড বন্ধ।", event.threadID, event.messageID);
	}

	const { threadID, senderID, messageID, mentions, messageReply } = event;

	try {

		if (!args[0]) {
			return api.sendMessage(
				"⚠️ নাম দিন\n.setname Juwel\n.setname @user Boss\n\n✨ Powered By Juwel",
				threadID,
				messageID
			);
		}

		let targetUsers = [];
		let newName = args.join(" ");

		if (messageReply) {
			targetUsers.push(messageReply.senderID);
		}
		else if (Object.keys(mentions).length > 0) {
			targetUsers = Object.keys(mentions);
			for (const uid of targetUsers) {
				newName = newName.replace(mentions[uid], "");
			}
			newName = newName.trim();
		}
		else {
			targetUsers.push(senderID);
		}

		if (!newName) {
			return api.sendMessage("⚠️ সঠিক নাম দিন\n\n✨ Powered By Juwel", threadID, messageID);
		}

		if (Array.from(newName).length > 50) {
			return api.sendMessage("⚠️ নাম সর্বোচ্চ 50 অক্ষর\n\n✨ Powered By Juwel", threadID, messageID);
		}

		let failed = 0;

		for (const uid of targetUsers) {
			try {
				await api.changeNickname(newName, threadID, uid);
			} catch (e) {
				console.log("Nickname change failed for", uid, e.message);
				failed++;
			}
		}

		if (failed === targetUsers.length) {
			return api.sendMessage("❌ নাম পরিবর্তন হয়নি\n\n✨ Powered By Juwel", threadID, messageID);
		}

		return api.sendMessage(
			`✅ নাম সেট: ${newName}\n\n✨ Powered By Juwel`,
			threadID,
			messageID
		);

	} catch (e) {
		console.log(e);
		return api.sendMessage("❌ নাম পরিবর্তন হয়নি\n\n✨ Powered By Juwel", threadID, messageID);
	}
};
