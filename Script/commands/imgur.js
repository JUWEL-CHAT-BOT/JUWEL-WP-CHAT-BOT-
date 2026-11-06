module.exports.config = {
  name: "imgur",
  version: "1.0.3",
  hasPermssion: 0,
  credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  description: "Upload replied image/video/GIF to Imgur",
  commandCategory: "other",
  usages: "[reply with any media file]",
  cooldowns: 30,
};

module.exports.run = async ({ api, event }) => {
  const axios = global.nodemodule['axios'];

  const { threadID, messageID, messageReply } = event;

  // ===== API key fetch =====
  let Shaon;
  try {
    const apis = await axios.get(
      'https://raw.githubusercontent.com/shaonproject/Shaon/main/api.json'
    );
    Shaon = apis.data.imgur;
  } catch (e) {
    return api.sendMessage("❌ API লোড করা যায়নি!", threadID, messageID);
  }

  // ===== রিপ্লাই চেক =====
  if (
    !messageReply ||
    !messageReply.attachments ||
    messageReply.attachments.length === 0
  ) {
    return api.sendMessage(
      "📌 ছবি বা ভিডিওতে রিপ্লাই দিয়ে `imgur` কমান্ড দিন...!✅",
      threadID,
      messageID
    );
  }

  const links = [];

  for (const attachment of messageReply.attachments) {
    try {
      const url = encodeURIComponent(attachment.url);
      const upload = await axios.get(`${Shaon}/imgur?link=${url}`);
      links.push(upload.data.uploaded.image || "❌ No link received");
    } catch (e) {
      links.push("❌ Failed to upload");
    }
  }

  const message =
    links.length === 1
      ? links[0]
      : `✅ Uploaded files Imgur links:\n\n${links.join("\n")}`;

  return api.sendMessage(message, threadID, messageID);
};
