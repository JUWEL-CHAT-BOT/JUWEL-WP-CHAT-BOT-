// Credit : 乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐
// ============================================================
//  WhatsApp -> Mirai/fca API adapter
//  Baileys socket-কে Messenger (fca) API-র মতো দেখায়, যাতে
//  Script/commands ও Script/events এর পুরনো কোড বদলানো না লাগে।
// ============================================================
const fs = require("fs");
const humanTyping = require("./typing");
const sendChains = new Map(); // jid → চলমান পাঠানোর লাইন
const path = require("path");

const MAX_CACHE = 1500;

const digits = (jid) => String(jid || "").split("@")[0].split(":")[0];
const isGroupJid = (jid) => String(jid || "").endsWith("@g.us");

class LRU extends Map {
  set(k, v) {
    if (this.has(k)) this.delete(k);
    super.set(k, v);
    if (this.size > MAX_CACHE) this.delete(this.keys().next().value);
    return this;
  }
}

function mimeByExt(file) {
  const ext = path.extname(String(file || "")).toLowerCase();
  return (
    {
      ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
      ".gif": "image/gif", ".mp4": "video/mp4", ".mov": "video/quicktime", ".mkv": "video/x-matroska",
      ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".ogg": "audio/ogg; codecs=opus", ".wav": "audio/wav",
      ".pdf": "application/pdf", ".txt": "text/plain", ".zip": "application/zip",
    }[ext] || "application/octet-stream"
  );
}

async function streamToBuffer(s) {
  if (Buffer.isBuffer(s)) return s;
  const chunks = [];
  for await (const c of s) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Buffer.concat(chunks);
}

/** Baileys message content থেকে wrapper (ephemeral/viewOnce ...) খুলে আসল কনটেন্ট দেয় */
function unwrap(message) {
  let m = message;
  for (let i = 0; i < 6 && m; i++) {
    const inner =
      m.ephemeralMessage?.message ||
      m.viewOnceMessage?.message ||
      m.viewOnceMessageV2?.message ||
      m.viewOnceMessageV2Extension?.message ||
      m.documentWithCaptionMessage?.message ||
      m.editedMessage?.message?.protocolMessage?.editedMessage;
    if (!inner) break;
    m = inner;
  }
  return m || {};
}

function createWaApi({ getSock, logger = console.log, mediaDownloader }) {
  const state = {
    listeners: new Set(),
    msgs: new LRU(), // messageID -> { key, message, jid }
    names: new Map(), // id -> name
    jids: new Map(), // id -> jid (lid/pn পার্থক্য মনে রাখতে)
    groups: new Map(), // jid -> { meta, at }
    lid2pn: new Map(), // LID(digits) -> ফোন নম্বর(digits)
    options: {},
  };

  // ---------- id helpers ----------
  const isLid = (j) => String(j || "").endsWith("@lid");
  const isPn = (j) => String(j || "").endsWith("@s.whatsapp.net");
  const asJid = (v, kind) => {
    v = v == null ? "" : String(v);
    if (!v || v.includes("@")) return v;
    const d = v.replace(/\D/g, "");
    if (!d) return "";
    return kind === "pn" ? d + "@s.whatsapp.net" : kind === "lid" ? d + "@lid" : v;
  };

  // WhatsApp এখন গ্রুপে ফোন নম্বরের বদলে LID (লম্বা আইডি) দেয়।
  // LID <-> ফোন নম্বরের জোড়া এখানে মনে রাখা হয়, যাতে অ্যাডমিন/পারমিশন ঠিকমতো মেলে।
  function learnPair(a, b) {
    a = asJid(a); b = asJid(b);
    if (!a || !b) return;
    const lid = isLid(a) ? a : isLid(b) ? b : "";
    const pn = isPn(a) ? a : isPn(b) ? b : "";
    if (!lid || !pn) return;
    const l = digits(lid), p = digits(pn);
    if (!l || !p) return;
    state.lid2pn.set(l, p);
    state.jids.set(p, p + "@s.whatsapp.net");
    state.jids.set(l, l + "@lid");
    if (state.names.has(l) && !state.names.has(p)) state.names.set(p, state.names.get(l));
  }

  // গ্রুপ participants / contacts এর যেকোনো ফিল্ড থেকে জোড়া শেখে
  function learnParticipants(list) {
    for (const x of list || []) {
      if (!x || typeof x === "string") continue;
      const vals = [
        x.id, x.jid, asJid(x.lid, "lid"),
        asJid(x.phoneNumber, "pn"), asJid(x.phone_number, "pn"), asJid(x.pn, "pn"),
      ].filter(Boolean).map(String);
      const lid = vals.find(isLid), pn = vals.find(isPn);
      if (lid && pn) learnPair(lid, pn);
    }
  }

  const resolveId = (jid) => {
    const d = digits(jid);
    return isLid(jid) ? state.lid2pn.get(d) || d : d;
  };

  function remember(jid, altJid, name) {
    if (!jid) return "";
    jid = String(jid);
    if (altJid) learnPair(jid, altJid);
    const id = resolveId(jid);
    if (!isGroupJid(jid)) {
      const d = digits(jid);
      if (isLid(jid)) {
        state.jids.set(d, d + "@lid");
        state.jids.set(id, id === d ? d + "@lid" : id + "@s.whatsapp.net");
      } else {
        state.jids.set(id, id + "@s.whatsapp.net");
      }
    }
    if (name) state.names.set(id, name);
    return id;
  }

  function toJid(id) {
    id = String(id || "");
    if (!id) return id;
    if (id.includes("@")) return id;
    if (state.jids.has(id)) return state.jids.get(id);
    return id + "@s.whatsapp.net";
  }

  const botId = () => {
    const s = getSock();
    if (!s || !s.user) return "";
    learnPair(asJid(s.user.lid, "lid"), s.user.id); // নিজের LID ↔ নম্বর
    return digits(s.user.id);
  };

  const nameOf = (id) => state.names.get(String(id)) || String(id);

  // ---------- incoming: Baileys -> Mirai event ----------
  function toEvents(msg) {
    const out = [];
    if (!msg || !msg.key || !msg.message) return out;
    const key = msg.key;
    const jid = key.remoteJid;
    botId();
    if (!jid || jid === "status@broadcast" || jid.endsWith("@newsletter")) return out;

    const group = isGroupJid(jid);
    const senderJid = group ? key.participant || msg.participant : key.fromMe ? getSock()?.user?.id : jid;
    const senderAlt = group
      ? key.participantAlt || key.participantPn || key.participant_pn || msg.participantPn
      : key.remoteJidAlt || key.senderPn || key.sender_pn;
    const senderID = key.fromMe ? botId() : remember(senderJid, senderAlt, msg.pushName);
    const threadID = group ? jid : remember(jid, key.remoteJidAlt || key.senderPn);

    state.msgs.set(key.id, { key, message: msg.message, jid });

    let content = unwrap(msg.message);

    // সরাসরি protocol message (delete / edit)
    const proto = content.protocolMessage;
    if (proto) {
      if (proto.type === 0 || proto.type === "REVOKE") {
        out.push({ type: "message_unsend", threadID, messageID: proto.key?.id, senderID, deletionTimestamp: Date.now() });
      }
      return out;
    }

    // reaction
    if (content.reactionMessage) {
      out.push({
        type: "message_reaction",
        threadID,
        messageID: content.reactionMessage.key?.id,
        userID: senderID,
        senderID,
        reaction: content.reactionMessage.text || "",
        timestamp: Date.now(),
      });
      return out;
    }

    const typeKey = Object.keys(content).find((k) => k !== "messageContextInfo" && k !== "senderKeyDistributionMessage");
    if (!typeKey) return out;
    const node = content[typeKey] || {};
    const ctx = node.contextInfo || content.messageContextInfo || {};

    const body =
      typeof node === "string" ? node : content.conversation || node.text || node.caption || node.selectedDisplayText || node.selectedButtonId || node.singleSelectReply?.selectedRowId || "";

    // attachments
    const attachments = [];
    const mediaMap = {
      imageMessage: "photo", videoMessage: "video", audioMessage: "audio",
      documentMessage: "file", stickerMessage: "sticker",
    };
    if (mediaMap[typeKey]) {
      const m = { ...msg, message: content };
      attachments.push({
        type: mediaMap[typeKey],
        ID: key.id,
        filename: node.fileName || key.id,
        mimeType: node.mimetype,
        url: "", // WhatsApp-এ সরাসরি URL নেই — getBuffer() ব্যবহার করুন
        getBuffer: () => (mediaDownloader ? mediaDownloader(m) : Promise.reject(new Error("media downloader missing"))),
      });
    } else if (typeKey === "locationMessage") {
      attachments.push({ type: "location", latitude: node.degreesLatitude, longitude: node.degreesLongitude, ID: key.id });
    } else if (typeKey === "contactMessage") {
      attachments.push({ type: "contact", ID: key.id, vcard: node.vcard, name: node.displayName });
    }

    // mentions
    const mentions = {};
    for (const mj of ctx.mentionedJid || []) {
      const id = remember(mj);
      mentions[id] = "@" + nameOf(id);
    }

    const event = {
      type: "message",
      threadID,
      messageID: key.id,
      senderID,
      body: body || "",
      args: (body || "").trim().split(/\s+/).filter(Boolean),
      attachments,
      mentions,
      isGroup: group,
      timestamp: String((msg.messageTimestamp && Number(msg.messageTimestamp) * 1000) || Date.now()),
      platform: "whatsapp",
      isSelf: !!key.fromMe,
    };

    // reply
    if (ctx.quotedMessage && ctx.stanzaId) {
      const q = unwrap(ctx.quotedMessage);
      const qKey = Object.keys(q)[0];
      const qNode = q[qKey] || {};
      const qBody = q.conversation || qNode.text || qNode.caption || "";
      const qSender = remember(ctx.participant || (group ? "" : jid));
      const qAtt = [];
      const qMap = { imageMessage: "photo", videoMessage: "video", audioMessage: "audio", documentMessage: "file", stickerMessage: "sticker" };
      if (qMap[qKey]) {
        const qm = { key: { remoteJid: jid, id: ctx.stanzaId, participant: ctx.participant, fromMe: false }, message: q };
        qAtt.push({ type: qMap[qKey], ID: ctx.stanzaId, url: "", mimeType: qNode.mimetype, getBuffer: () => mediaDownloader(qm) });
      }
      event.type = "message_reply";
      event.messageReply = {
        threadID, messageID: ctx.stanzaId, senderID: qSender, body: qBody, attachments: qAtt, mentions: {},
      };
      // কাউকে নির্দিষ্ট করে mention না থাকলে রিপ্লাই করা জনই "mention"
      if (!Object.keys(mentions).length && qSender) event.mentions = {};
    }

    out.push(event);
    return out;
  }

  function groupEvents(update) {
    // { id, participants, action: add|remove|promote|demote, author }
    const threadID = update.id;
    learnParticipants(update.participants);
    const author = remember(update.author || "", update.authorPn);
    const parts = (update.participants || []).map((p) => (typeof p === "string" ? p : p.id || p.phoneNumber));
    const ids = parts.map((p) => remember(p));
    state.groups.delete(threadID);
    const base = { threadID, author, timestamp: Date.now(), platform: "whatsapp" };
    switch (update.action) {
      case "add":
        return [{ type: "event", logMessageType: "log:subscribe", ...base,
          logMessageData: { addedParticipants: ids.map((id) => ({ userFbId: id, fullName: nameOf(id) })) },
          logMessageBody: "" }];
      case "remove":
        return ids.map((id) => ({ type: "event", logMessageType: "log:unsubscribe", ...base,
          logMessageData: { leftParticipantFbId: id }, logMessageBody: "" }));
      case "promote":
      case "demote":
        return ids.map((id) => ({ type: "event", logMessageType: "log:thread-admins", ...base,
          logMessageData: { ADMIN_EVENT: update.action === "promote" ? "add_admin" : "remove_admin", TARGET_ID: id } }));
      default:
        return [];
    }
  }

  function groupInfoEvents(u) {
    if (u.subject) {
      return [{ type: "event", logMessageType: "log:thread-name", threadID: u.id, author: remember(u.author || ""),
        logMessageData: { name: u.subject }, timestamp: Date.now(), platform: "whatsapp" }];
    }
    return [];
  }

  function dispatch(event) {
    for (const cb of state.listeners) {
      try { cb(null, event); } catch (e) { logger("listener error: " + (e && e.message)); }
    }
  }

  // ---------- helpers ----------
  const done = (cb, fn) => {
    const p = Promise.resolve().then(fn);
    if (typeof cb === "function") {
      p.then((r) => cb(null, r), (e) => cb(e));
      return p.catch(() => {}); // callback দিলে unhandled rejection এড়ানো
    }
    return p;
  };

  const sock = () => {
    const s = getSock();
    if (!s) throw new Error("WhatsApp is not connected yet");
    return s;
  };

  async function groupMeta(jid) {
    const hit = state.groups.get(jid);
    if (hit && Date.now() - hit.at < 60_000) return hit.meta;
    const meta = await sock().groupMetadata(jid);
    learnParticipants(meta.participants);
    state.groups.set(jid, { meta, at: Date.now() });
    return meta;
  }


  // মেসেজ প্রসেসের আগে: পাঠকের LID এর নম্বর অজানা হলে গ্রুপ তথ্য/সিগন্যাল স্টোর থেকে খুঁজে নেয়
  async function resolveSender(msg) {
    try {
      const key = msg && msg.key;
      if (!key || key.fromMe) return;
      const jid = key.remoteJid;
      const who = isGroupJid(jid) ? key.participant || msg.participant : jid;
      if (!isLid(who) || state.lid2pn.has(digits(who))) return;
      try {
        const repo = getSock() && getSock().signalRepository && getSock().signalRepository.lidMapping;
        if (repo && typeof repo.getPNForLID === "function") {
          const pn = await repo.getPNForLID(who);
          if (pn) learnPair(who, asJid(pn, "pn"));
        }
      } catch (e) { /* এই ভার্সনে নেই */ }
      if (!state.lid2pn.has(digits(who)) && isGroupJid(jid)) {
        try { await groupMeta(jid); } catch (e) { /* পরের বার */ }
      }
    } catch (e) { /* ignore */ }
  }

  async function buildContent(msg) {
    if (typeof msg === "string") msg = { body: msg };
    msg = msg || {};
    let text = msg.body != null ? String(msg.body) : "";
    const mentionJids = [];
    for (const m of msg.mentions || []) {
      const id = String(m.id);
      const jid = toJid(id);
      mentionJids.push(jid);
      const at = "@" + digits(jid);
      if (m.tag && text.includes(m.tag)) text = text.replace(m.tag, at);
      else if (!text.includes(at)) text += (text ? " " : "") + at;
    }
    const base = mentionJids.length ? { mentions: mentionJids } : {};

    const atts = [].concat(msg.attachment || []).filter(Boolean);
    const contents = [];
    for (const a of atts) {
      const name = (a && (a.path || a.filename)) || "";
      const buf = await streamToBuffer(a);
      const mime = mimeByExt(name);
      const fileName = path.basename(String(name) || "file");
      if (mime.startsWith("image/")) contents.push({ image: buf, mimetype: mime });
      else if (mime.startsWith("video/")) contents.push({ video: buf, mimetype: mime });
      else if (mime.startsWith("audio/")) contents.push({ audio: buf, mimetype: mime, ptt: false });
      else contents.push({ document: buf, mimetype: mime, fileName });
    }
    if (msg.sticker) contents.push({ sticker: await streamToBuffer(msg.sticker) });
    if (msg.location) contents.push({ location: { degreesLatitude: msg.location.latitude, degreesLongitude: msg.location.longitude } });
    if (msg.url) text = text ? text + "\n" + msg.url : msg.url;

    if (!contents.length) return [{ text: text || " ", ...base }];
    // ক্যাপশন প্রথম মিডিয়াতে
    const first = contents[0];
    if (text && ("image" in first || "video" in first || "document" in first)) first.caption = text;
    else if (text) contents.unshift({ text, ...base });
    if (first.caption && mentionJids.length) first.mentions = mentionJids;
    return contents;
  }

  const api = {
    __platform: "whatsapp",
    __normalized: true,

    // ===== listen =====
    listenMqtt(cb) {
      state.listeners.add(cb);
      const stop = () => state.listeners.delete(cb);
      stop.stop = stop; stop.stopListening = stop; stop.end = stop; stop.close = stop;
      return stop;
    },
    listen(cb) { return api.listenMqtt(cb); },
    stopListening() { state.listeners.clear(); },

    // ===== identity / options =====
    getCurrentUserID: () => botId(),
    getAppState: () => [],
    setOptions(o) { Object.assign(state.options, o || {}); },
    isAutoReLoginEnabled: () => true,
    enableAutoReLogin() {},
    setReconnectOptions() {},
    logout(cb) { return done(cb, () => sock().logout()); },

    // ===== messages =====
    sendMessage(msg, threadID, cb, replyTo) {
      if (typeof cb === "string") { replyTo = cb; cb = undefined; }
      return done(cb, async () => {
        const s = sock();
        const jid = toJid(threadID);
        const quoted = replyTo ? state.msgs.get(String(replyTo)) : null;
        const parts = await buildContent(msg);
        // মানুষের মতো টাইপিং: একই চ্যাটে রিপ্লাইগুলো লাইন ধরে যায় (একসাথে "typing" জট পাকায় না)
        const prev = sendChains.get(jid) || Promise.resolve();
        const job = prev.catch(() => {}).then(async () => {
          let last;
          // যে মেসেজের জবাব দিচ্ছি সেটা (না থাকলে ওই চ্যাটের সর্বশেষ আসা মেসেজ) আগে "seen" হবে
          const incoming = quoted && !quoted.key.fromMe ? quoted : [...state.msgs.values()].reverse().find((m) => m.jid === jid && !m.key.fromMe);
          let first = true;
          for (const c of parts) {
            await humanTyping.beforeSend(s, jid, c, first && incoming ? incoming.key : null);
            first = false;
            const res = await s.sendMessage(jid, c, quoted ? { quoted: { key: quoted.key, message: quoted.message } } : undefined);
            if (res && res.key) state.msgs.set(res.key.id, { key: res.key, message: res.message, jid });
            last = res;
          }
          return last;
        });
        sendChains.set(jid, job);
        const last = await job;
        if (sendChains.get(jid) === job) sendChains.delete(jid);
        return { threadID: String(threadID), messageID: last?.key?.id, timestamp: Date.now() };
      });
    },
    sandmessage(...a) { return api.sendMessage(...a); },

    unsendMessage(messageID, cb) {
      return done(cb, async () => {
        const m = state.msgs.get(String(messageID));
        if (!m) throw new Error("message not found in cache: " + messageID);
        await sock().sendMessage(m.jid, { delete: { ...m.key, fromMe: true } });
      });
    },
    deleteMessage(ids, cb) {
      return done(cb, async () => { for (const id of [].concat(ids)) await api.unsendMessage(id); });
    },
    editMessage(text, messageID, cb) {
      return done(cb, async () => {
        const m = state.msgs.get(String(messageID));
        if (!m) throw new Error("message not found in cache");
        await sock().sendMessage(m.jid, { text: String(text), edit: m.key });
      });
    },
    setMessageReaction(reaction, messageID, cb) {
      if (typeof cb !== "function") cb = undefined;
      return done(cb, async () => {
        const m = state.msgs.get(String(messageID));
        if (!m) throw new Error("message not found in cache");
        const emoji = /^:\w+:$/.test(String(reaction)) ? "👍" : String(reaction || "");
        await sock().sendMessage(m.jid, { react: { text: emoji, key: m.key } });
      });
    },
    getMessage(messageID, cb) {
      return done(cb, async () => state.msgs.get(String(messageID)) || null);
    },
    markAsReadAll(cb) { return done(cb, async () => {}); },
    markAsRead(threadID, cb) {
      return done(typeof cb === "function" ? cb : undefined, async () => {
        const last = [...state.msgs.values()].reverse().find((m) => m.jid === toJid(threadID) && !m.key.fromMe);
        if (last) await sock().readMessages([last.key]);
      });
    },
    sendTypingIndicator(threadID, cb) {
      const jid = toJid(threadID);
      try { sock().sendPresenceUpdate("composing", jid); } catch (e) {}
      const stop = () => { try { sock().sendPresenceUpdate("paused", jid); } catch (e) {} };
      if (typeof cb === "function") setTimeout(() => cb(null), 0);
      return stop;
    },

    // ===== users / threads =====
    getUserInfo(ids, cb) {
      return done(cb, async () => {
        const res = {};
        for (const id of [].concat(ids)) {
          const sid = String(id);
          let name = state.names.get(sid);
          if (!name) {
            try {
              const c = sock().store?.contacts?.[toJid(sid)];
              name = c?.name || c?.notify;
            } catch (e) {}
          }
          res[sid] = {
            name: name || sid, firstName: (name || sid).split(" ")[0], vanity: sid, thumbSrc: "",
            profileUrl: "https://wa.me/" + sid, gender: 0, type: "user", isFriend: false, isBirthday: false, id: sid,
          };
        }
        return res;
      });
    },
    getUID(link, cb) { return done(cb, async () => digits(link)); },
    getThreadInfo(threadID, cb) {
      return done(cb, async () => {
        const tid = String(threadID);
        const jid = toJid(tid);
        const me = botId();
        if (!isGroupJid(jid)) {
          return {
            threadID: tid, threadName: nameOf(tid), participantIDs: [me, tid], isGroup: false, adminIDs: [],
            userInfo: [{ id: tid, name: nameOf(tid), gender: "" }, { id: me, name: nameOf(me), gender: "" }],
            nicknames: {}, emoji: "", color: null, imageSrc: null, approvalMode: false, messageCount: 0,
          };
        }
        const meta = await groupMeta(jid);
        const parts = meta.participants || [];
        const ids = parts.map((p) => remember(p.id, p.phoneNumber || p.jid, p.notify || p.name));
        return {
          threadID: tid, threadName: meta.subject || "", participantIDs: ids, isGroup: true,
          adminIDs: parts.filter((p) => p.admin).map((p) => ({ id: remember(p.id, p.phoneNumber || p.jid) })),
          userInfo: ids.map((id) => ({ id, name: nameOf(id), gender: "" })),
          nicknames: {}, emoji: "", color: null, imageSrc: null, approvalMode: !!meta.joinApprovalMode,
          messageCount: 0, description: meta.desc || "", owner: resolveId(meta.owner || ""),
        };
      });
    },
    getThreadList(limit, ts, tags, cb) {
      if (typeof tags === "function") cb = tags;
      if (typeof ts === "function") cb = ts;
      if (typeof limit === "function") cb = limit;
      return done(cb, async () => {
        const all = await sock().groupFetchAllParticipating();
        return Object.values(all).slice(0, typeof limit === "number" ? limit : 50).map((g) => ({
          threadID: g.id, name: g.subject, isGroup: true, participants: (g.participants || []).map((p) => resolveId(p.id)),
          participantIDs: (g.participants || []).map((p) => resolveId(p.id)), isSubscribed: true,
        }));
      });
    },

    // ===== group admin =====
    removeUserFromGroup(userID, threadID, cb) {
      return done(cb, () => sock().groupParticipantsUpdate(toJid(threadID), [].concat(userID).map(toJid), "remove"));
    },
    addUserToGroup(userID, threadID, cb) {
      return done(cb, () => sock().groupParticipantsUpdate(toJid(threadID), [].concat(userID).map(toJid), "add"));
    },
    changeAdminStatus(threadID, userID, admin, cb) {
      return done(cb, () => sock().groupParticipantsUpdate(toJid(threadID), [].concat(userID).map(toJid), admin ? "promote" : "demote"));
    },
    setTitle(title, threadID, cb) { return done(cb, () => sock().groupUpdateSubject(toJid(threadID), String(title))); },
    changeThreadName(title, threadID, cb) { return api.setTitle(title, threadID, cb); },
    changeGroupImage(image, threadID, cb) {
      return done(cb, async () => sock().updateProfilePicture(toJid(threadID), await streamToBuffer(image)));
    },
    createNewGroup(ids, name, cb) {
      return done(cb, async () => (await sock().groupCreate(String(name), [].concat(ids).map(toJid))).id);
    },
    deleteThread(threadID, cb) { return done(cb, () => sock().groupLeave(toJid(threadID))); },
    changeBlockedStatus(userID, block, cb) {
      return done(cb, () => sock().updateBlockStatus(toJid(userID), block ? "block" : "unblock"));
    },
    changeBio(bio, pub, cb) { return done(typeof pub === "function" ? pub : cb, () => sock().updateProfileStatus(String(bio))); },
  };

  // ---------- WhatsApp-এ নেই এমন Messenger ফিচার: নিরীহ no-op ----------
  const noop = (name) =>
    function (...args) {
      const cb = args.find((a) => typeof a === "function");
      logger(`[WA] api.${name}() WhatsApp-এ সাপোর্টেড না — স্কিপ করা হলো`);
      if (cb) setTimeout(() => cb(null, {}), 0);
      return Promise.resolve({});
    };
  const unsupported = (name) =>
    function (...args) {
      const cb = args.find((a) => typeof a === "function");
      const err = new Error(`api.${name}() is not available on WhatsApp`);
      if (cb) { setTimeout(() => cb(err), 0); return Promise.resolve(); }
      return Promise.reject(err);
    };
  for (const n of ["changeNickname", "changeThreadEmoji", "changeThreadColor", "setThreadThemeMqtt", "createAITheme", "changeAvatar", "changeProfileName"])
    api[n] = noop(n);
  for (const n of ["httpGet", "httpPost", "httpPostFormData", "unfriend", "getFriendsList", "setPostReaction", "getUserProfile", "getThreadHistory", "getMessageInfo", "getThreadID", "getthreadID"])
    api[n] = unsupported(n);

  // প্রোফাইল ছবির URL (fbShim ব্যবহার করে) এবং নাম
  async function avatarUrl(id) {
    try { return await getSock().profilePictureUrl(toJid(String(id)), "image"); } catch (e) { return null; }
  }

  return {
    api,
    avatarUrl,
    state,
    toEvents,
    groupEvents,
    groupInfoEvents,
    dispatch,
    remember,
    learnPair,
    learnParticipants,
    resolveSender,
    resolveId,
    toJid,
    nameOf,
    digits,
  };
}

module.exports = { createWaApi, digits, isGroupJid, unwrap };
