/**
 * Credit: 乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐
 *
 * JuwelKeepalive.js — Juwel.js-এর একদম প্রথম লাইনে শুধু এটা যোগ করুন:
 *
 *     require("./JuwelKeepalive");
 *
 * কাজ (সব অটো):
 *  - Render-এর PORT-এ ছোট health সার্ভার তোলে
 *  - বটের (Main.js) জন্য PORT এক ধাপ সরিয়ে দেয়, যাতে পোর্ট নিয়ে কনফ্লিক্ট না হয়
 *  - RENDER_EXTERNAL_URL থেকে নিজের লিংক নিয়ে প্রতি ৪ মিনিটে পিং করে
 */

const https = require("https");
const http = require("http");

if (!global.__juwelKeepAlive) {
  global.__juwelKeepAlive = true;

  const PORT = Number(process.env.PORT) || 3000;
  const EXPORT_KEY = require("crypto").randomBytes(12).toString("hex"); // প্রতিবার চালুতে নতুন, শুধু লগে দেখা যায়
const INTERVAL_MS = Number(process.env.KEEPALIVE_INTERVAL_MS) || 4 * 60 * 1000;
  const TARGET = (process.env.KEEPALIVE_URL || process.env.RENDER_EXTERNAL_URL ||
    (process.env.RENDER_EXTERNAL_HOSTNAME ? "https://" + process.env.RENDER_EXTERNAL_HOSTNAME : "") ||
    (process.env.RENDER_SERVICE_NAME ? "https://" + process.env.RENDER_SERVICE_NAME + ".onrender.com" : "")).trim();

  // health সার্ভার: Render এই পোর্টই চেক করে
  const server = http.createServer((req, res) => {
    // /session?key=... → লিংক-করা সেশন (creds) এক কপিতে; Render এর WA_CREDS এ একবার বসালে রিস্টার্টেও লিংক থাকে
    if (req.url && req.url.split("?")[0] === "/session") {
      const given = (new URL(req.url, "http://x").searchParams.get("key") || "");
      const a = Buffer.from(given), b = Buffer.from(EXPORT_KEY);
      if (a.length !== b.length || !require("crypto").timingSafeEqual(a, b)) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end("Not found");
      }
      let creds = "";
      try {
        const dir = process.env.WA_SESSION_DIR || (() => { try { return JSON.parse(require("fs").readFileSync(require("path").join(__dirname, "config.json"), "utf8")).WHATSAPP.sessionDir; } catch (e) { return ""; } })() || "wa_session";
        const txt = require("fs").readFileSync(require("path").resolve(dir, "creds.json"), "utf8");
        { const o = JSON.parse(txt); if (o.registered === true || o.account) creds = Buffer.from(txt, "utf8").toString("base64"); }
      } catch (e) { /* এখনো লিংক হয়নি */ }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
      return res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><body style="font-family:sans-serif;padding:16px">` +
        (creds
          ? `<h2>সেশন কপি করুন</h2><p>নিচের পুরো লেখাটা কপি করে GitHub এ <b>config.json</b> খুলে <b>"sessionCreds": ""</b> এর দুই কোটেশনের ভেতরে বসিয়ে Commit করুন (বিকল্প: Render → Environment এ <b>WA_CREDS</b> নামে বসানো)। তারপর থেকে রিস্টার্ট বা রিডিপ্লয়ে আর লিংক করতে হবে না।</p><textarea id="t" readonly style="width:100%;height:240px;font-size:12px" onclick="this.select()">${creds}</textarea><p><button onclick="var t=document.getElementById('t');t.select();document.execCommand('copy');this.textContent='কপি হয়েছে ✔'" style="padding:10px 18px;font-size:16px">কপি করুন</button></p><p style="color:#b00"><b>গোপন রাখুন:</b> এটা আপনার WhatsApp অ্যাকাউন্টের চাবি। কাউকে দেবেন না, GitHub-এ রাখবেন না।</p>`
          : `<p>এখনো WhatsApp লিংক হয়নি। আগে <code>/pair</code> থেকে লিংক করুন, তারপর এই পেজ আবার খুলুন।</p>`) + `</body>`);
    }
    // /pair/new → সঙ্গে সঙ্গে নতুন কোড (বট প্রসেসকে ফাইল দিয়ে জানায়)
    if (req.url && req.url.split("?")[0] === "/pair/new") {
      try { require("fs").writeFileSync(require("path").join(require("os").tmpdir(), "wa_newcode.flag"), String(Date.now())); } catch (e) {}
      res.writeHead(302, { Location: "/pair" });
      return res.end();
    }
    // /pair → WhatsApp লিংক পেজ: বড় করে কোড (আর QR ব্যাকআপ) দেখায়, লগ ঘাঁটতে হয় না
    if (req.url && req.url.split("?")[0] === "/pair") {
      let info = null;
      try { info = JSON.parse(require("fs").readFileSync(require("path").join(require("os").tmpdir(), "wa_pairing.json"), "utf8")); } catch (e) {}
      const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
      const box = (inner) => `<div class="card">${inner}</div>`;
      let body;
      if (info && info.expired) {
        body = box("<h2>⏹ লিংক করার সময় শেষ</h2><p>বারবার কোড চাইলে WhatsApp আটকে দেয়, তাই বট কোড চাওয়া বন্ধ করেছে।</p><p>Render এ আপনার সার্ভিসে <b>Manual Deploy → Restart</b> দিন, তারপর এই পেজ আবার খুলুন।</p>");
      } else if (!info || (!info.code && !info.qr)) {
        body = box("<h2>⏳ অপেক্ষা করুন...</h2><p>কোড তৈরি হচ্ছে (বা বট আগে থেকেই লিংক করা আছে)। পেজ নিজে রিফ্রেশ হবে।</p><p><a class='btn' href='/pair/new'>🔄 নতুন কোড নিন</a></p>");
      } else {
        const age = info.codeAt ? Math.round((Date.now() - info.codeAt) / 1000) : 0;
        const old = age > 110;
        const codeBlock = info.code
          ? box(`<div class="frame"><div class="lbl">📱 এই নম্বরের WhatsApp এ কোড বসান</div><div class="num"><b>+${esc(info.number || "")}</b></div><div class="lbl">📲 পেয়ারিং কোড</div><div class="code${old ? " old" : ""}">${esc(info.code)}</div><div class="credit">👑 Credit : 乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐</div></div>` +
              (old ? `<p class="warn">⚠ কোডটা পুরনো হয়ে গেছে — নতুন কোড আসা পর্যন্ত অপেক্ষা করুন (পেজ নিজে বদলাবে)</p>` : `<p class="ok">✅ নতুন কোড (${age} সেকেন্ড আগের)</p>`) +
              `<p><a class="btn" href="/pair/new">🔄 নতুন কোড নিন</a></p>` +
              `<ol><li>বটের নম্বরের ফোনে WhatsApp খুলুন</li><li><b>Linked devices → Link a device</b></li><li><b>Link with phone number instead</b> চাপুন</li><li>উপরের গোলাপি কোডটা বসান</li></ol>`)
          : "";
        const qrBlock = info.qr
          ? box(`<h3>QR দিয়ে লিংক</h3><p>অন্য ফোন/কম্পিউটারে এই পেজ খুলে বটের ফোন দিয়ে স্ক্যান করুন (WhatsApp → Linked devices → Link a device)।</p><p class="warn">প্রথম স্ক্যানে ব্যর্থ হলে ৫–১০ সেকেন্ড পর পেজ রিফ্রেশ করুন — নতুন QR আসবে, সেটা আবার স্ক্যান করুন।</p><div id="qr" style="display:inline-block;background:#fff;padding:12px"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script>new QRCode(document.getElementById("qr"),{text:${JSON.stringify(String(info.qr))},width:260,height:260,correctLevel:QRCode.CorrectLevel.L});</script>`)
          : "";
        body = codeBlock + qrBlock;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      return res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="8"><title>WhatsApp Link</title>
<style>body{margin:0;background:#0f172a;color:#e2e8f0;font-family:system-ui,sans-serif;text-align:center;padding:16px}.card{background:#1e293b;border-radius:16px;padding:18px;margin:14px auto;max-width:460px}.lbl{opacity:.7;font-size:14px}.code{font-size:44px;font-weight:800;letter-spacing:5px;color:#ff4fa3;text-shadow:0 0 12px rgba(255,79,163,.55);margin:10px 0;word-break:break-all}.code.old{color:#64748b;text-decoration:line-through}.num{font-size:18px;margin:10px 0;color:#7dd3fc}.num b{font-size:24px}.frame{border:2px solid #22d3ee;border-radius:14px;padding:14px;margin:6px 0;box-shadow:0 0 18px rgba(34,211,238,.25)}.num b{color:#facc15}.credit{margin-top:12px;font-size:15px;font-weight:700;color:#ef4444}.btn{display:inline-block;background:#22d3ee;color:#0f172a;font-weight:700;padding:10px 18px;border-radius:10px;text-decoration:none}.ok{color:#4ade80}.warn{color:#facc15}ol{text-align:left;line-height:1.8}h2,h3{margin:6px 0}</style><body>${body}</body>`);
    }
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bot is alive");
  });
  server.on("error", (e) => console.log(`[KEEPALIVE] server error: ${e.message}`));
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[KEEPALIVE] health সার্ভার চালু, পোর্ট ${PORT}`);
    console.log(`[KEEPALIVE] 🔑 লিংক করার পর সেশন কপির গোপন লিংক (কাউকে দেবেন না): ${(TARGET || "http://localhost:" + PORT).replace(/\/+$/, "")}/session?key=${EXPORT_KEY}`);
  });

  // Main.js (child) যদি নিজের সার্ভার চালায়, সে যেন অন্য পোর্ট পায়
  process.env.KEEPALIVE_PORT = String(PORT);
  process.env.PORT = String(PORT + 1);

  let pingCount = 0;
  function ping(url) {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, { timeout: 20000, headers: { "User-Agent": "self-keepalive" } }, (res) => {
      res.resume();
      pingCount = (pingCount || 0) + 1;
      if (pingCount === 1 || pingCount % 15 === 0 || res.statusCode >= 400) console.log(`[KEEPALIVE] ${new Date().toISOString()} -> ${url} (${res.statusCode}) · মোট পিং: ${pingCount}`);
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", (e) => console.log(`[KEEPALIVE] ping failed: ${e.message}`));
  }

  if (!TARGET) {
    console.log("[KEEPALIVE] RENDER_EXTERNAL_URL নেই (লোকাল রান?), পিং বন্ধ।");
  } else {
    console.log(`[KEEPALIVE] চালু: ${TARGET} প্রতি ${Math.round(INTERVAL_MS / 60000)} মিনিটে পিং`);
    setTimeout(() => {
      ping(TARGET);
      setInterval(() => ping(TARGET), INTERVAL_MS);
    }, 30 * 1000);
  }
}
