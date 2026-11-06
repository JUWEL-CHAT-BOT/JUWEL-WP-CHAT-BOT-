// Credit : 乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐
// ============================================================
//  WhatsApp login (Baileys) — login(loginData, cb) এর মতোই: cb(err, api)
//  ব্যবহার: Main.js এ PLATFORM=whatsapp হলে এটা চলে।
// ============================================================
const path = require("path");
const fs = require("fs");
const { createWaApi, digits } = require("./waApi");

const log = (m) => console.log("[ WHATSAPP ] " + m);

// লিংক সম্পূর্ণ হয়েছে কিনা: registered ফ্ল্যাগ বা account (সাইন করা ডিভাইস আইডেন্টিটি) থাকলে হয়েছে
const isLinked = (creds) => !!(creds && (creds.registered === true || creds.account));

// /pair পেজ (JuwelKeepalive.js) এই ফাইল থেকে কোড ও QR পড়ে দেখায়
const PAIR_FILE = path.join(require("os").tmpdir(), "wa_pairing.json");
function writePair(patch) {
  let cur = {};
  try { cur = JSON.parse(fs.readFileSync(PAIR_FILE, "utf8")); } catch (e) { /* নতুন */ }
  fs.writeFileSync(PAIR_FILE, JSON.stringify(Object.assign(cur, patch)));
}
function clearPair() { try { fs.unlinkSync(PAIR_FILE); } catch (e) { /* নেই */ } }

function cfg() {
  const c = (global.config && global.config.WHATSAPP) || {};
  return {
    sessionDir: path.resolve(process.env.WA_SESSION_DIR || c.sessionDir || "wa_session"),
    // Render এর Environment এ BOT_NUMBER দিলে সেটাই চলে (GitHub এ ফাইল বদলাতে হয় না), না থাকলে botnumber.js থেকে
    pairingNumber: (() => {
      const raw = process.env.BOT_NUMBER || (() => { try { return require("../botnumber").number; } catch (e) { return ""; } })();
      return String(raw || "").replace(/\D/g, "");
    })(),
    owners: [].concat(c.owners || []).map((x) => String(x).replace(/\D/g, "")).filter(Boolean),
    browser: c.browserName || "JUWEL BOT",
    loginMode: c.loginMode || "code",
    sendCredsToSelf: c.sendCredsToSelf === true, // ডিফল্ট বন্ধ
    markOnline: c.markOnline === true,
    autoRead: c.autoRead === true,
    selfListen: c.selfListen !== false, // নিজের নম্বরে বট চালালে মালিক ফোন থেকেই কমান্ড দিতে পারবে
  };
}

function mergeOwners(owners) {
  if (!global.config || !owners.length) return;
  for (const key of ["ADMINBOT", "DEVELOPER"]) {
    const set = new Set((global.config[key] || []).map(String));
    owners.forEach((o) => set.add(o));
    global.config[key] = [...set];
  }
}

module.exports = function whatsappLogin(_loginData, callback) {
  require("../includes/creditGuard").enforce("whatsapp"); // Credit Guard
  clearPair(); // আগের রানের পুরনো কোড/QR /pair পেজে যেন না দেখায় (পুরনো কোড বসালেই "Couldn't link device" আসে)

  // মেমোরি লগ: Render ফ্রি প্ল্যানে ~512 MB এর বেশি হলে সার্ভার বট বন্ধ করে দেয় — বন্ধ হওয়ার কারণ ধরতে সুবিধা
  if (!global.__waMemLog) {
    global.__waMemLog = true;
    const memLog = () => log("💾 মেমোরি: " + Math.round(process.memoryUsage().rss / 1048576) + " MB (Render ফ্রি সীমা ~512 MB)");
    const t1 = setTimeout(memLog, 60000), t2 = setInterval(memLog, 600000);
    if (t1.unref) t1.unref();
    if (t2.unref) t2.unref();
  }
  let baileys, pino, qrcode;
  try {
    baileys = require("@whiskeysockets/baileys");
    pino = require("pino");
  } catch (e) {
    return callback({ error: "Baileys ইন্সটল নেই। চালান: npm install   (" + e.message + ")" });
  }
  try { qrcode = require("qrcode-terminal"); } catch (e) { qrcode = null; }

  const makeWASocket = baileys.default || baileys.makeWASocket;
  try { log("Baileys package: " + JSON.parse(fs.readFileSync(path.join(path.dirname(require.resolve("@whiskeysockets/baileys")), "..", "package.json"), "utf8")).version); } catch (e) { /* ভার্সন জানা গেল না */ }
  const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers, makeCacheableSignalKeyStore, downloadMediaMessage } = baileys;

  const c = cfg();
  mergeOwners(c.owners);
  mergeOwners([c.pairingNumber].filter(Boolean)); // বটের নিজের নম্বরও অ্যাডমিন/ডেভেলপার
  fs.mkdirSync(c.sessionDir, { recursive: true });

  let sock = null;
  let firstOpen = true;
  let reconnectTimer = null;
// লিংক না হওয়া পর্যন্ত বারবার নতুন কোড চাইলে (কয়েকটা সার্ভিস চললে) একে অপরের কোড কাটে আর WhatsApp আটকে দিতে পারে।
// তাই চালুর পর এই সময়ের মধ্যেই লিংক করতে হবে; পার হলে বট কোড চাওয়া বন্ধ করে চুপ থাকবে (Render এ Restart দিলে আবার শুরু)।
const PAIR_WINDOW_MS = (Number(process.env.WA_PAIR_WINDOW_MIN) || 20) * 60000;
let pairStart = Date.now();
  let retries = 0;
  const silent = pino({ level: "silent" });
  let badSession = 0, replaced = 0;

  // আগের সকেট পুরোপুরি বন্ধ করি, যাতে দুটো সকেট একই সেশনে একসাথে না চলে (তাতে লিংক/লগইন নষ্ট হয়)
  let pairTimer = null; // ৮ সেকেন্ডের ফলব্যাক টাইমার — সকেট বদলালে বাতিল করতে হয়
  function killSock() {
    clearTimeout(pairTimer);
    try {
      if (!sock) return;
      try { sock.ev.removeAllListeners(); } catch (e) {}
      try { sock.end(undefined); } catch (e) {}
    } catch (e) {}
  }

  function reconnectIn(ms) {
    killSock();
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => connect().catch((e) => log("reconnect error: " + e.message)), ms);
  }

  // সেশন একদম মুছে নতুন করে লগইন (লগআউট/নষ্ট সেশন হলে নিজে থেকেই এটা চলে)
  function resetSession(msg) {
    log(msg);
    killSock();
    store.pause();
    store.forgetConfigCreds();
    credsAnnounced = false;
    try { fs.rmSync(c.sessionDir, { recursive: true, force: true }); fs.mkdirSync(c.sessionDir, { recursive: true }); } catch (e) {}
    store.clearRemote().finally(() => store.resume());
    retries = 0; badSession = 0; replaced = 0;
    pairStart = Date.now();
    try { writePair({ code: null, qr: null, expired: false }); } catch (e) {}
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => connect().catch((e) => log("reconnect error: " + e.message)), 3000);
  }

  const hub = createWaApi({
    getSock: () => sock,
    logger: log,
    mediaDownloader: (m) => downloadMediaMessage(m, "buffer", {}, { logger: silent, reuploadRequest: sock && sock.updateMediaMessage }),
  });

  const store = require("./sessionStore");
  store.configure({ dir: c.sessionDir, key: "wa-session:" + (c.pairingNumber || "default"), log });
  global.waFlushSession = () => store.flush();

  global.waAvatarUrl = hub.avatarUrl;
  global.waNameOf = hub.nameOf;
  try { require("./fbShim").install(); } catch (e) { log("fbShim লোড হয়নি: " + e.message); }


  // নতুন লিংক হলে সেশনের কপি-করার লেখাটা বটের নিজের চ্যাটে ("আপনি নিজেকে মেসেজ") পাঠায়,
  // যাতে ফোন থেকে কপি করে config.json এর WHATSAPP.sessionCreds এ বসানো যায় (লগ/Render খুঁজতে হয় না)
  let credsAnnounced = false;
  async function announceCreds() {
    try {
      if (credsAnnounced || !c.sendCredsToSelf) return;
      if (store.enabled() || store.usedConfigCreds()) return; // ব্যাকআপ আছে, বা কনফিগের সেশন দিয়েই চলছে
      const credsPath = path.join(c.sessionDir, "creds.json");
      if (!fs.existsSync(credsPath)) return;
      const txt = fs.readFileSync(credsPath, "utf8");
      if (!isLinked(JSON.parse(txt))) return;
      const me = digits(sock && sock.user && sock.user.id);
      if (!me) return;
      credsAnnounced = true;
      const jid = me + "@s.whatsapp.net";
      const b64 = Buffer.from(txt, "utf8").toString("base64");
      const intro = "✅ বট লিংক হয়েছে!\n\nরিডিপ্লয়ের পরও যাতে আবার লিংক করতে না হয়:\n১) এর পরের মেসেজটা (লম্বা লেখা) কপি করুন\n২) GitHub এ config.json খুলুন\n৩) \"sessionCreds\": \"\" এর দুই কোটেশনের ভেতরে পেস্ট করুন\n৪) Commit করুন — Render নিজে রিডিপ্লয় করবে\n\n⚠ এটা আপনার WhatsApp এর চাবি। কাউকে দেবেন না, পাবলিক রিপোতে রাখবেন না।";
      const r1 = await sock.sendMessage(jid, { text: intro });
      const r2 = await sock.sendMessage(jid, { text: b64 });
      for (const r of [r1, r2]) if (r && r.key) hub.state.msgs.set(r.key.id, { key: r.key, message: r.message, jid });
      log("🔐 সেশন কপির লেখা বটের নিজের চ্যাটে ('আপনি নিজেকে মেসেজ') পাঠানো হয়েছে");
    } catch (e) {
      credsAnnounced = false;
      log("সেশন কপি পাঠানো যায়নি: " + e.message);
    }
  }

  async function connect() {
    await store.restoreOnce(); // Render রিস্টার্টের পর আগের সেশন ফেরত আনে

    // আগের অসম্পূর্ণ/আধা-লিংক হওয়া সেশন থাকলে মুছে একদম নতুন করে শুরু (নইলে নতুন কোড/QR কাজ করে না)
    try {
      const credsPath = path.join(c.sessionDir, "creds.json");
      const hasDir = fs.existsSync(c.sessionDir) && fs.readdirSync(c.sessionDir).length > 0;
      let stale = false;
      if (fs.existsSync(credsPath)) {
        try { stale = !isLinked(JSON.parse(fs.readFileSync(credsPath, "utf8"))); } catch (e) { stale = true; }
      } else if (hasDir) {
        stale = true; // creds নেই কিন্তু অন্য ফাইল পড়ে আছে
      }
      if (stale) {
        fs.rmSync(c.sessionDir, { recursive: true, force: true });
        log("🧹 আগের অসম্পূর্ণ সেশন মুছে নতুন করে শুরু করা হলো");
      }
      fs.mkdirSync(c.sessionDir, { recursive: true });
    } catch (e) { log("সেশন পরিষ্কার করা যায়নি: " + e.message); }

    const { state, saveCreds } = await useMultiFileAuthState(c.sessionDir);
    // WhatsApp পুরনো/বাসি ক্লায়েন্ট ভার্সনে লিংক শেষ করতে দেয় না ("Couldn't link device")।
    // fetchLatestBaileysVersion() অনেক সময় বাসি ভার্সন দেয়, তাই আগে WhatsApp Web-এর আসল বর্তমান ভার্সন আনি।
    // কোনো টোকেন/সেটিং ছাড়াই নিজে নিজে ঠিক পথ খোঁজা: লিংক না থাকলে প্রতিবার নতুন চেষ্টায় আলাদা ভার্সন-উৎস ও আলাদা
    // ডিভাইস-পরিচয় ব্যবহার হয় (লাইভ WhatsApp Web → Baileys তালিকা → Baileys বান্ডল্ড)। কোনো একটা WhatsApp না মানলে
    // পরের কোডে অন্যটা চলবে। লগে দেখা যাবে কোনটা চলছে।
    const linkedNow = isLinked(state.creds);
    const attempt = linkedNow ? 0 : (global.__waAttempt = (global.__waAttempt || 0) + 1) - 1;
    // ⚠ Baileys-এর নিজের ভার্সন-তালিকা এখন বাসি (WhatsApp সেটা মানে না → "Couldn't link device"), তাই সবসময় লাইভ ভার্সন আগে;
    // লাইভ না পেলে তবেই তালিকা/বান্ডল্ড।
    let strategy = process.env.WA_VERSION === "bundled" ? "bundled" : "live";
    let version, versionFrom = "default";
    if (strategy === "live") {
      try {
        if (typeof baileys.fetchLatestWaWebVersion === "function") {
          const r = await baileys.fetchLatestWaWebVersion({});
          if (r && r.version && !r.error) { version = r.version; versionFrom = "WhatsApp Web (live)"; }
        }
      } catch (e) { /* পরের ধাপে */ }
    }
    if (!version && strategy !== "bundled") {
      try { ({ version } = await fetchLatestBaileysVersion()); versionFrom = "Baileys list (লাইভ পাওয়া যায়নি)"; } catch (e) { /* ডিফল্ট */ }
    }
    if (strategy === "bundled") versionFrom = "Baileys bundled";
    const osPick = linkedNow ? "macOS" : ["macOS", "windows", "macOS", "ubuntu"][attempt % 4];
    const browserCfg = (Browsers[osPick] ? Browsers[osPick]("Chrome") : [c.browser, "Chrome", "1.0"]);

    // নতুন সকেট = নতুন কোড; /pair পেজে আগের সকেটের পুরনো কোড/QR যেন না থাকে
    if (!isLinked(state.creds)) { try { writePair({ code: null, qr: null, expired: false, number: c.pairingNumber }); } catch (e) {} }
    else clearPair();

    killSock();
    sock = makeWASocket({
      version,
      logger: silent,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, silent) },
      browser: browserCfg,
      markOnlineOnConnect: c.markOnline,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
    });

    // WhatsApp এখন কোড বসানোর সময় আগে একটা ফাঁকা/অসম্পূর্ণ link_code_companion_reg নোটিফিকেশন পাঠায়; Baileys সেটা ধরে
    // ভেঙে পড়ে (সংযোগ কেটে যায়, ফোনে "Couldn't link device")। তাই অসম্পূর্ণ হলে চুপচাপ বাদ দিয়ে পূর্ণটার অপেক্ষা করি।
    try {
      const EV = "CB:notification,type:link_code_companion_reg";
      const origs = sock.ws.listeners(EV);
      if (origs.length) {
        sock.ws.removeAllListeners(EV);
        const need = ["link_code_pairing_wrapped_primary_ephemeral_pub", "primary_identity_pub", "link_code_pairing_wrapped_key_bundle"];
        sock.ws.on(EV, async (node) => {
          try {
            const reg = baileys.getBinaryNodeChild(node, "link_code_companion_reg");
            const missing = reg ? need.filter((k) => !baileys.getBinaryNodeChildBuffer(reg, k)) : []; // গঠন অচেনা হলে আটকাই না
            if (missing.length) { log("ℹ অসম্পূর্ণ লিংক নোটিফিকেশন বাদ দেওয়া হলো (নেই: " + missing.join(", ") + ") — পূর্ণটার অপেক্ষা"); return; }
            log("📨 ফোন থেকে পূর্ণ লিংক নোটিফিকেশন এসেছে — লিংক শেষ করা হচ্ছে");
          } catch (e) { /* যাচাই না হলে আগের মতোই চলুক */ }
          for (const fn of origs) { try { await fn(node); } catch (e) { log("লিংক ধাপে ত্রুটি: " + e.message); } }
        });
      }
      // ডায়াগনস্টিক: লিংক না থাকা অবস্থায় WhatsApp কী ধরনের নোটিফিকেশন পাঠাচ্ছে লগে দেখাই
      sock.ws.on("CB:notification", (n) => {
        try { if (!isLinked(state.creds) && n && n.attrs && /companion|link_code|pair/i.test(String(n.attrs.type))) log("🔔 WhatsApp নোটিফিকেশন: " + n.attrs.type); } catch (e) {}
      });
    } catch (e) { log("লিংক-সুরক্ষা বসানো যায়নি: " + e.message); }

    // QR লিংকের ফিক্স (Baileys PR #2765 এর মতো): QR স্ক্যানের পর WhatsApp "companion_reg_refresh" পাঠায় = পুরনো গোপন চাবি বাতিল।
    // Baileys এটা উপেক্ষা করে বলে লিংক শেষ হয় না। তাই নতুন চাবি বানিয়ে QR আবার তৈরি করি — এরপর আবার স্ক্যান করলে লিংক হয়।
    try {
      sock.ws.on("CB:notification", (n) => {
        try {
          if (!n || !n.attrs || isLinked(state.creds)) return;
          const kids = Array.isArray(n.content) ? n.content.map((x) => x && x.tag) : [];
          if (n.attrs.type !== "companion_reg_refresh" && !kids.includes("companion_reg_refresh") && !kids.includes("pair-device-rotate-qr")) return;
          state.creds.advSecretKey = require("crypto").randomBytes(32).toString("base64");
          log("🔁 WhatsApp পুরনো QR চাবি বাতিল করেছে — নতুন QR তৈরি হয়েছে, /pair পেজ রিফ্রেশ করে আবার স্ক্যান করুন");
          if (lastQr) {
            const parts = String(lastQr).split(",");
            if (parts.length >= 4) {
              parts[3] = state.creds.advSecretKey;
              lastQr = parts.join(",");
              try { writePair({ qr: lastQr, qrAt: Date.now(), number: c.pairingNumber }); } catch (e) {}
            }
          }
        } catch (e) { /* চুপ */ }
      });
    } catch (e) { /* চুপ */ }

    // লিংক হওয়ার আগের (আধা) অবস্থা ডিস্কে রাখি না — রিস্টার্টে ওটাই পরের কোড নষ্ট করে
    sock.ev.on("creds.update", async () => {
      if (!isLinked(state.creds)) return;
      await saveCreds();
      store.markDirty();
    });
    store.startBackup();

    log("Baileys WA version: " + (version ? version.join(".") : "default") + " [" + versionFrom + "] · ডিভাইস: " + browserCfg.join("/") + (linkedNow ? "" : " · চেষ্টা #" + (attempt + 1)));

    // পেয়ারিং কোড (QR এর বদলে ফোন নম্বর দিয়ে লগইন)
    // কোড তখনই চাওয়া হয় যখন WhatsApp সার্ভারের সাথে হ্যান্ডশেক শেষ (qr ইভেন্ট আসে); না এলে ২০ সেকেন্ড পর ফলব্যাক।
    // লগইন মোড: "both" (QR + কোড, ডিফল্ট) | "qr" (শুধু QR) | "code" (শুধু কোড)  — env WA_LOGIN_MODE বা config WHATSAPP.loginMode
    const loginMode = String(process.env.WA_LOGIN_MODE || c.loginMode || "code").toLowerCase();
    // ⚠ গুরুত্বপূর্ণ: এক সকেটে একবারই কোড চাইতে হবে। দ্বিতীয়বার চাইলে আগের কোড বাতিল হয়ে যায়
    // (আগের কোডটা বসালে "Couldn't link device")। তাই কোড শুধু "এই" সকেটের জন্য, একবার।
    const mySock = sock;
    let pairingRequested = false;
    let qrHinted = false;
    var lastQr = null;
    const askPairingCode = async () => {
      if (loginMode === "qr") return;
      if (sock !== mySock) return; // সকেট বদলে গেছে — পুরনো টাইমার/ইভেন্টের কোড চাওয়া বাতিল
      if (pairingRequested || !c.pairingNumber || isLinked(mySock.authState.creds)) return;
      pairingRequested = true;
      try {
        const code = await mySock.requestPairingCode(c.pairingNumber);
        if (sock !== mySock) return; // কোড আসতে আসতে সকেট বদলে গেলে এই কোড অকেজো, দেখাব না
        const pretty = String(code).match(/.{1,4}/g).join("-");
        const FR = "\x1b[1;96m", RED = "\x1b[1;91m", YEL = "\x1b[1;93m", PINK = "\x1b[1;95m", DIM = "\x1b[2m", RST = "\x1b[0m";
        log("\n" +
          FR + "╔════════════════════════════════════════════════" + RST + "\n" +
          FR + "║" + RST + "  📱 NUMBER : " + YEL + "+" + c.pairingNumber + RST + "   " + DIM + "(এই নম্বরের WhatsApp এ কোড বসান)" + RST + "\n" +
          FR + "║" + RST + "  📲 CODE   : " + PINK + pretty + RST + "\n" +
          FR + "║" + RST + "  👑 CREDIT : " + RED + "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐" + RST + "\n" +
          FR + "╚════════════════════════════════════════════" + RST + "\n" +
          "  WhatsApp > Linked devices > Link a device > Link with phone number instead\n" +
          "  ২ মিনিটের মধ্যে বসান। নতুন কোড এলে পুরনোটা চলবে না — সবসময় সর্বশেষ (সবচেয়ে নিচের) কোডটা বসান।");
        global.waPairingCode = pretty;
        try { writePair({ code: pretty, codeAt: Date.now(), number: c.pairingNumber, expired: false }); } catch (e) {}
      } catch (e) {
        pairingRequested = false;
        log("pairing code পাওয়া যায়নি: " + e.message);
      }
    };
    if (!c.pairingNumber && loginMode !== "qr") log("⚠ বটের নম্বর পাওয়া যায়নি — botnumber.js এ (অথবা Render এ BOT_NUMBER নামে) নম্বর বসান, দেশের কোডসহ, যেমন 8801XXXXXXXXX");
    else if (!isLinked(sock.authState.creds) && loginMode !== "qr") log("📞 পেয়ারিং কোড এই নম্বরের জন্য তৈরি হবে: +" + c.pairingNumber + " — যে ফোনে কোড বসাবেন, সেটা অবশ্যই এই নম্বরের হতে হবে");
    if (!isLinked(sock.authState.creds) && c.pairingNumber && loginMode !== "qr") pairTimer = setTimeout(askPairingCode, 8000);

    sock.ev.on("connection.update", (u) => {
      const { connection, lastDisconnect, qr } = u;
      if (connection && connection !== "open") log("connection: " + connection);
      if (qr) { lastQr = qr; askPairingCode(); }
      if (qr && !qrHinted && loginMode !== "code") {
        qrHinted = true;
        log("📷 QR তৈরি হয়েছে — Render লিংকের শেষে /pair যোগ করে অন্য ফোনে খুলুন, তারপর বটের ফোনে Linked devices → Link a device থেকে স্ক্যান করুন");
      }
      if (qr && loginMode !== "code") { try { writePair({ qr, qrAt: Date.now(), number: c.pairingNumber }); } catch (e) {} }
      if (qr && !c.pairingNumber) {
        global.waQR = qr;
        log("QR স্ক্যান করুন (WhatsApp > Linked devices > Link a device):");
        if (qrcode) qrcode.generate(qr, { small: true });
        else log("qrcode-terminal নেই; এই স্ট্রিং QR বানিয়ে স্ক্যান করুন: " + qr);
      }
      if (connection === "open") {
        retries = 0; badSession = 0; replaced = 0;
        global.waQR = null;
        global.waPairingCode = null;
        clearPair();
        try { hub.learnPair(sock.user && sock.user.lid && String(sock.user.lid).split(":")[0].split("@")[0] + "@lid", sock.user && sock.user.id); } catch (e) {}
        store.markDirty();
        setTimeout(announceCreds, 15000);
        log("✅ Connected as " + digits(sock.user && sock.user.id));
        if (firstOpen) { firstOpen = false; callback(null, hub.api); }
      }
      if (connection === "close") {
        const code = lastDisconnect && lastDisconnect.error && lastDisconnect.error.output && lastDisconnect.error.output.statusCode;
        const linked = isLinked(sock.authState.creds);
        const again = (ms) => {
          killSock();
          clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => connect().catch((e) => log("reconnect error: " + e.message)), ms);
        };

        // 515: কোড/QR দিয়ে লিংক শেষ হলে WhatsApp নিজেই রিস্টার্ট চায় — সঙ্গে সঙ্গে আবার সংযোগ, সেশন অক্ষত
        if (code === DisconnectReason.restartRequired) {
          log("🔄 লিংক/সংযোগ সম্পন্ন করতে দ্রুত রিস্টার্ট (code 515)");
          return again(1000);
        }
        // 401: ফোন থেকে লগআউট করা হয়েছে (বা সেশন বাতিল) — সব মুছে নতুন করে লগইন, নিজে নিজেই
        if (code === DisconnectReason.loggedOut) {
          return resetSession("⚠ লগআউট ধরা পড়েছে (code 401) — পুরনো সেশন মুছে নতুন করে লগইন শুরু হচ্ছে (/pair পেজ দেখুন)");
        }
        // 500/411: অনেক সময় সাময়িক। লিংক-করা সেশন হলে সঙ্গে সঙ্গে মুছি না, কয়েকবার আবার চেষ্টা করি
        if (code === 500 || code === 411) {
          badSession++;
          if (!linked || badSession >= 4) {
            return resetSession("⚠ সেশন নষ্ট (code " + code + ") — মুছে নতুন করে লগইন শুরু হচ্ছে (/pair পেজ দেখুন)");
          }
          log("⚠ সেশনে সাময়িক সমস্যা (code " + code + ") — আবার চেষ্টা " + badSession + "/3, সেশন মোছা হয়নি");
          return again(5000 * badSession);
        }
        if (code === 403) {
          log("⛔ WhatsApp এই নম্বরে সংযোগ নিষিদ্ধ করেছে (code 403) — নম্বর সাময়িক/স্থায়ী বন্ধ হতে পারে। বট আর চেষ্টা করবে না");
          store.pause();
          return;
        }
        // 440: একই সেশন অন্য জায়গায় খুলেছে (যেমন রিডিপ্লয়ের সময় পুরনো সার্ভার তখনো চলছে) — একটু থেমে আবার চেষ্টা
        if (code === DisconnectReason.connectionReplaced) {
          replaced++;
          if (replaced > 5) {
            log("⚠ একই নম্বরে আরেক জায়গায় বট চলছে (code 440) — বারবার চেষ্টা করেও হয়নি, থামছি। অন্য সব Render সার্ভিস/বট বন্ধ করে Restart দিন");
            store.pause();
            return;
          }
          log("⚠ একই সেশন অন্য জায়গায় খুলেছে (code 440) — ৪৫ সেকেন্ড পর আবার চেষ্টা " + replaced + "/5");
          return again(45000);
        }
        if (!linked && Date.now() - pairStart > PAIR_WINDOW_MS) {
          log("⏹ " + Math.round(PAIR_WINDOW_MS / 60000) + " মিনিটে লিংক হয়নি — কোড চাওয়া বন্ধ করা হলো। আবার চেষ্টা করতে Render এ Manual Deploy → Restart দিন, তারপর /pair থেকে কোড বসান");
          try { writePair({ code: null, qr: null, expired: true }); } catch (e) {}
          store.pause();
          return;
        }
        const wait = Math.min(30000, 2000 * ++retries);
        log("সংযোগ বন্ধ (code " + code + (lastDisconnect && lastDisconnect.error && lastDisconnect.error.message ? ", " + lastDisconnect.error.message : "") + "), " + wait / 1000 + "s পরে আবার চেষ্টা...");
        again(wait);
      }
    });

    // contacts / নাম
    const saveContacts = (list) => {
      try { hub.learnParticipants(list); } catch (e) {}
      for (const ct of list || []) {
        const nm = ct.name || ct.notify || ct.verifiedName;
        if (ct.id && nm) hub.remember(ct.id, ct.phoneNumber || ct.jid, nm);
      }
    };
    sock.ev.on("contacts.upsert", saveContacts);
    sock.ev.on("contacts.update", saveContacts);

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;
      for (const m of messages) {
        try {
          if (m.key && m.key.fromMe) {
            // বটের নিজের পাঠানো মেসেজ কখনো না; ফোন থেকে মালিকের নিজের মেসেজ শুধু selfListen=true হলে
            if (!c.selfListen || hub.state.msgs.has(m.key.id)) continue;
          }
          if (c.autoRead && !m.key.fromMe) sock.readMessages([m.key]).catch(() => {});
          await hub.resolveSender(m);
          hub.toEvents(m).forEach(hub.dispatch);
        } catch (e) { log("message parse error: " + e.message); }
      }
    });

    sock.ev.on("lid-mapping.update", (m) => { try { hub.learnPair(m && m.lid, m && (m.pn || m.jid)); } catch (e) {} });
    sock.ev.on("group-participants.update", (u) => hub.groupEvents(u).forEach(hub.dispatch));
    sock.ev.on("groups.update", (arr) => arr.forEach((u) => hub.groupInfoEvents(u).forEach(hub.dispatch)));
  }

  // /pair পেজের "নতুন কোড নিন" বাটন: কোড কাজ না করলে কয়েক মিনিট অপেক্ষা ছাড়াই সঙ্গে সঙ্গে নতুন কোড
  const NEWCODE_FLAG = path.join(require("os").tmpdir(), "wa_newcode.flag");
  try { fs.unlinkSync(NEWCODE_FLAG); } catch (e) {}
  let lastManual = 0;
  const flagTimer = setInterval(() => {
    try {
      if (!fs.existsSync(NEWCODE_FLAG)) return;
      fs.unlinkSync(NEWCODE_FLAG);
      if (!sock || isLinked(sock.authState.creds)) return;
      if (Date.now() - lastManual < 15000) return; // WhatsApp বারবার চাইলে আটকায়, তাই ১৫ সেকেন্ডের ফাঁক
      lastManual = Date.now();
      pairStart = Date.now();
      retries = 0;
      try { writePair({ code: null, qr: null, expired: false }); } catch (e) {}
      log("🔄 নতুন কোড চাওয়া হয়েছে — সংযোগ নতুন করে শুরু হচ্ছে");
      reconnectIn(500);
    } catch (e) { /* চুপ */ }
  }, 2000);
  if (flagTimer.unref) flagTimer.unref();

  connect().catch((e) => callback({ error: e.message }));
};
