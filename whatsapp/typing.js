// Credit : 乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐
// ============================================================
//  মানুষের মতো টাইপিং ইফেক্ট (WhatsApp)
//  বট রিপ্লাই পাঠানোর আগে: মেসেজ "পড়ে" (blue tick) → কিছুক্ষণ ভাবে → "typing..." দেখায় (লেখার দৈর্ঘ্য অনুযায়ী) → পাঠায়।
//  ভয়েস মেসেজে "recording audio..." দেখায়। সেটিং: config.json → WHATSAPP.humanTyping
// ============================================================
const rnd = (a, b) => a + Math.random() * (b - a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function settings() {
  const c = (global.config && global.config.WHATSAPP && global.config.WHATSAPP.humanTyping) || {};
  return {
    enabled: c.enabled !== false,
    msPerChar: Number(c.msPerChar) || 45,      // প্রতি অক্ষরে কত মিলিসেকেন্ড
    minMs: Number(c.minMs) || 800,             // সবচেয়ে কম টাইপিং সময়
    maxMs: Number(c.maxMs) || 6000,            // সবচেয়ে বেশি (লম্বা মেসেজেও এর বেশি অপেক্ষা নয়)
    readBeforeReply: c.readBeforeReply !== false, // রিপ্লাইয়ের আগে মেসেজ "seen" করা
  };
}

// কী ধরনের কনটেন্ট, কত সময় লাগবে
function plan(content, cfg) {
  const c = content || {};
  const text = String(c.text || c.caption || "");
  if (c.audio || c.ptt) return { presence: "recording", ms: rnd(1800, 3500) };
  if (!text) return { presence: "composing", ms: rnd(900, 1800) }; // ছবি/ভিডিও/স্টিকার
  const ms = text.length * cfg.msPerChar * rnd(0.8, 1.3) + rnd(300, 900);
  return { presence: "composing", ms: Math.max(cfg.minMs, Math.min(cfg.maxMs, ms)) };
}

// একটা মেসেজ পাঠানোর আগে মানুষের মতো আচরণ। lastIncomingKey থাকলে আগে "seen" করে।
async function beforeSend(sock, jid, content, lastIncomingKey) {
  const cfg = settings();
  if (!cfg.enabled || !jid || jid === "status@broadcast") return;
  try {
    try { await sock.presenceSubscribe(jid); } catch (e) {}
    if (cfg.readBeforeReply && lastIncomingKey) {
      await sleep(rnd(300, 900));
      try { await sock.readMessages([lastIncomingKey]); } catch (e) {}
      await sleep(rnd(250, 700));
    }
    const p = plan(content, cfg);
    await sock.sendPresenceUpdate(p.presence, jid);
    await sleep(p.ms);
    await sock.sendPresenceUpdate("paused", jid);
    await sleep(rnd(120, 350));
  } catch (e) { /* টাইপিং ফেল করলেও মেসেজ যাবে */ }
}

module.exports = { beforeSend, settings, plan };
