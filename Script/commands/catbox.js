const axios = require("axios");
const FormData = require("form-data");
const path = require("path");

const CATBOX_USERHASH = "7a49365abd762f85de0480728";
const MAX_FILES = 10;
const CATBOX_API = "https://catbox.moe/user/api.php";
const LITTER_API = "https://litterbox.catbox.moe/resources/internals/api.php";
const TIMEOUT = 120000;
const TEMP_TIMES = ["1h", "12h", "24h", "72h"];

const EXT_BY_TYPE = {
	photo: ".jpg",
	animated_image: ".gif",
	video: ".mp4",
	audio: ".mp3",
	sticker: ".png"
};

module.exports.config = {
	name: "catbox",
	version: "1.1.2",
	hasPermssion: 0,
	credits: "EryXenX",
	description: "Upload files to Catbox and get direct links",
	commandCategory: "media",
	usages: "[reply file] | [url ...] | [1h|12h|24h|72h] (reply to a file)",
	cooldowns: 10,
	dependencies: {
		"axios": "",
		"form-data": ""
	}
};

// ---------- helpers ----------
const isLink = text => typeof text === "string" && /^https?:\/\/\S+$/.test(text.trim());

const guessName = (attachment, index) => {
	let name = attachment.filename || "";
	if (!path.extname(name)) {
		let ext = "";
		try {
			ext = path.extname(new URL(attachment.url).pathname);
		}
		catch (e) {
			ext = "";
		}
		if (!ext) ext = EXT_BY_TYPE[attachment.type] || ".bin";
		name = `${name || `file_${Date.now()}_${index}`}${ext}`;
	}
	return name.replace(/[^\w.\-]/g, "_");
};

const nameFromUrl = (url, index) => {
	let base = "";
	try {
		base = path.basename(new URL(url).pathname);
	}
	catch (e) {
		base = "";
	}
	if (!base || !path.extname(base)) base = `file_${Date.now()}_${index}.bin`;
	return base.replace(/[^\w.\-]/g, "_");
};

const readResult = data => {
	const text = typeof data === "string" ? data.trim() : "";
	if (isLink(text)) return text;
	throw new Error(text || "Empty response from server");
};

const uploadByUrl = async url => {
	const form = new FormData();
	form.append("reqtype", "urlupload");
	if (CATBOX_USERHASH) form.append("userhash", CATBOX_USERHASH);
	form.append("url", url);
	const res = await axios.post(CATBOX_API, form, {
		headers: form.getHeaders(),
		timeout: TIMEOUT,
		maxBodyLength: Infinity,
		maxContentLength: Infinity
	});
	return readResult(res.data);
};

const uploadBuffer = async (url, filename, tempTime) => {
	const file = await axios.get(url, {
		responseType: "arraybuffer",
		timeout: TIMEOUT,
		maxContentLength: Infinity
	});
	const buffer = Buffer.from(file.data);

	const form = new FormData();
	form.append("reqtype", "fileupload");
	if (tempTime) form.append("time", tempTime);
	else if (CATBOX_USERHASH) form.append("userhash", CATBOX_USERHASH);
	form.append("fileToUpload", buffer, { filename, knownLength: buffer.length });

	const res = await axios.post(tempTime ? LITTER_API : CATBOX_API, form, {
		headers: form.getHeaders(),
		timeout: TIMEOUT,
		maxBodyLength: Infinity,
		maxContentLength: Infinity
	});
	return readResult(res.data);
};

const uploadOne = async (source, tempTime) => {
	if (!tempTime) {
		try {
			return await uploadByUrl(source.url);
		}
		catch (e) {
			return await uploadBuffer(source.url, source.name, null);
		}
	}
	return await uploadBuffer(source.url, source.name, tempTime);
};

// ---------- main ----------
module.exports.run = async function ({ api, event, args }) {
	const { threadID, messageID } = event;

	const send = (body) => new Promise(resolve => {
		api.sendMessage(body, threadID, (err, info) => resolve(err ? null : info), messageID);
	});

	const list = (args || []).slice();
	let tempTime = null;

	if (list.length && TEMP_TIMES.includes(String(list[0]).toLowerCase()))
		tempTime = String(list.shift()).toLowerCase();

	const sources = [];

	for (const item of list) {
		if (isLink(item)) sources.push({ url: item.trim(), name: nameFromUrl(item, sources.length) });
	}

	if (!sources.length) {
		const attachments = (event.messageReply && event.messageReply.attachments) || [];
		attachments.forEach((att, i) => {
			if (att && att.url) sources.push({ url: att.url, name: guessName(att, i) });
		});
	}

	if (!sources.length)
		return send(
			"Reply to an image, video, audio or file, or send a direct link.\n" +
			"Usage: /catbox | /catbox <url> | /catbox 1h|12h|24h|72h"
		);

	const picked = sources.slice(0, MAX_FILES);
	const skipped = sources.length - picked.length;

	const waiting = await send(`Uploading ${picked.length} file(s)${tempTime ? ` for ${tempTime}` : ""}...`);
	const waitingID = waiting && waiting.messageID;

	const lines = [];
	let ok = 0;

	for (let i = 0; i < picked.length; i++) {
		try {
			const link = await uploadOne(picked[i], tempTime);
			ok++;
			lines.push(picked.length > 1 ? `${i + 1}. ${link}` : link);
		}
		catch (e) {
			const reason = String((e && e.message) || "failed").slice(0, 80);
			lines.push(`${i + 1}. Failed (${reason})`);
		}
	}

	let text = lines.join("\n");
	if (tempTime && ok) text += `\n\nThese links expire in ${tempTime}.`;
	if (skipped > 0) text += `\n\nSkipped ${skipped} file(s). Max ${MAX_FILES} per command.`;

	if (waitingID && typeof api.editMessage === "function") {
		try {
			await new Promise((resolve, reject) => {
				api.editMessage(text, waitingID, err => (err ? reject(err) : resolve()));
			});
			return;
		}
		catch (e) {
			return send(text);
		}
	}

	return send(text);
};
