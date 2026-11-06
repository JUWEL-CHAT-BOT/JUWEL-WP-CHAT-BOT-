// Credit : 乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐
// ============================================================
//  Facebook graph.facebook.com/<uid>/picture  ->  WhatsApp প্রোফাইল ছবি
//  অনেক কমান্ড (love, bf, gf, pair, profile ...) axios দিয়ে Facebook অ্যাভাটার নামায়।
//  WhatsApp-এ UID = ফোন নম্বর, তাই ওই রিকোয়েস্ট ধরে WhatsApp-এর ছবি (না থাকলে প্লেসহোল্ডার) দেওয়া হয়।
// ============================================================
const zlib = require("zlib");
const { Readable } = require("stream");

// ---- ছোট PNG বানানোর কোড (প্লেসহোল্ডার অ্যাভাটারের জন্য, কোনো লাইব্রেরি লাগে না) ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
let placeholder = null;
function placeholderPng() {
  if (placeholder) return placeholder;
  const S = 256, bg = [226, 232, 240], fg = [148, 163, 184];
  const raw = Buffer.alloc((S * 3 + 1) * S);
  for (let y = 0; y < S; y++) {
    raw[y * (S * 3 + 1)] = 0;
    for (let x = 0; x < S; x++) {
      const head = (x - 128) ** 2 + (y - 98) ** 2 < 48 ** 2;
      const body = (x - 128) ** 2 + (y - 250) ** 2 < 92 ** 2;
      const col = head || body ? fg : bg;
      const o = y * (S * 3 + 1) + 1 + x * 3;
      raw[o] = col[0]; raw[o + 1] = col[1]; raw[o + 2] = col[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4); ihdr[8] = 8; ihdr[9] = 2;
  placeholder = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
  ]);
  return placeholder;
}

async function avatarOf(axios, id) {
  try {
    if (typeof global.waAvatarUrl === "function") {
      const url = await global.waAvatarUrl(id);
      if (url) {
        const r = await axios.get(url, { responseType: "arraybuffer", timeout: 15000, adapter: "http" });
        if (r.data && r.data.length) return Buffer.from(r.data);
      }
    }
  } catch (e) { /* ছবি নেই / প্রাইভেসি — প্লেসহোল্ডার যাবে */ }
  return placeholderPng();
}

function install() {
  let axios;
  try { axios = require("axios"); } catch (e) { return; }
  if (axios.__waShim) return;
  axios.__waShim = true;

  axios.interceptors.request.use((config) => {
    const url = String(config.url || "");
    const m = url.match(/graph\.facebook\.com\/(?:v[\d.]+\/)?([^\/?#]+)(\/picture)?/i);
    if (!m) return config;
    const id = decodeURIComponent(m[1]).replace(/\D/g, "");
    const isPicture = !!m[2];
    config.adapter = async (cfg) => {
      let data, type;
      if (isPicture) {
        const buf = await avatarOf(axios, id);
        type = "image/png";
        data = cfg.responseType === "stream" ? Readable.from(buf)
          : cfg.responseType === "arraybuffer" ? buf
          : cfg.responseType === "text" ? buf.toString("binary") : buf;
      } else {
        const name = (global.waNameOf && global.waNameOf(id)) || id;
        type = "application/json";
        const obj = { id, name, first_name: String(name).split(" ")[0] };
        data = cfg.responseType === "arraybuffer" ? Buffer.from(JSON.stringify(obj)) : obj;
      }
      return { data, status: 200, statusText: "OK", headers: { "content-type": type }, config: cfg, request: {} };
    };
    return config;
  });
}

// ---- `request` লাইব্রেরি: request(url).pipe(file) স্টাইলের কমান্ডের জন্য ----
const PIC_RE = /graph\.facebook\.com\/(?:v[\d.]+\/)?([^\/?#]+)\/picture/i;
function installRequest() {
  let request, axios;
  try { request = require("request"); axios = require("axios"); } catch (e) { return; }
  if (request.__waShim) return;
  const urlOf = (a) => (typeof a === "string" ? a : a && (a.url || a.uri)) || "";
  const wrap = (orig) =>
    new Proxy(orig, {
      apply(target, thisArg, args) {
        const u = decodeURIComponent(String(urlOf(args[0])));
        const m = u.match(PIC_RE);
        if (!m) return Reflect.apply(target, thisArg, args);
        const id = m[1].replace(/\D/g, "");
        const cb = args.find((a) => typeof a === "function");
        const bufP = avatarOf(axios, id);
        if (cb) { bufP.then((b) => cb(null, { statusCode: 200, headers: { "content-type": "image/png" } }, b)); }
        return Readable.from((async function* () { yield await bufP; })());
      },
      get(target, prop, recv) {
        if (prop === "__waShim") return true;
        if (prop === "get") return (...a) => wrap(target)(...a);
        return Reflect.get(target, prop, recv);
      },
    });
  const proxied = wrap(request);
  try {
    const key = require.resolve("request");
    require.cache[key].exports = proxied;
  } catch (e) { /* ignore */ }
}

module.exports = { install: () => { install(); installRequest(); }, placeholderPng };
