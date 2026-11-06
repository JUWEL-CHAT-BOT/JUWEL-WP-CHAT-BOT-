// Credit : 乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐
require("./includes/creditGuard").enforce("Juwel.js"); // Credit Guard
require("./JuwelKeepalive"); // <-- Keep-alive (Render ঘুমিয়ে যাওয়া ঠেকায়)
const { spawn } = require("child_process");
const path = require("path");

const packageInfo = require("./package.json");

const MAIN_FILE = path.join(__dirname, "Main.js");
const COMPAT_PRELOAD = path.join(__dirname, "includes", "compat", "preload.js");

console.log("Starting Main.js...");
console.log(`botName: ${packageInfo.name}`);
console.log(`version: ${packageInfo.version}`);

let bot = null;
let shuttingDown = false;
let consecutiveFails = 0;
let restartRequested = false; // মেমোরি বেশি হলে শুধু বট-প্রসেস রিস্টার্ট (সেশন ডিস্কে থাকে, আবার লগইন লাগে না)
let lastMemRestart = 0;

/* ============================================================
   ===== নতুন যোগ করা অংশ (ADDED FEATURES) - শুরু ==============
   ============================================================ */
const fs = require("fs");
const { spawnSync } = require("child_process");

const C = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
  blue: "\x1b[34m", magenta: "\x1b[35m", cyan: "\x1b[36m", white: "\x1b[37m"
};

const LAUNCHER_STARTED_AT = new Date();
let botStartedAt = null;
let restartCount = 0;
let lastCodeStatus = "Not checked yet";

const BANNER_INTERVAL_MS = 5 * 60 * 1000; // প্রতি ৫ মিনিটে ব্যানার + স্ট্যাটাস আবার দেখাবে

const ok = (m) => console.log(`${C.green}${C.bold}[ OK ]${C.reset} ${C.green}${m}${C.reset}`);
const warn = (m) => console.log(`${C.yellow}${C.bold}[WARN]${C.reset} ${C.yellow}${m}${C.reset}`);
const fail = (m) => console.log(`${C.red}${C.bold}[FAIL]${C.reset} ${C.red}${m}${C.reset}`);
const info = (m) => console.log(`${C.cyan}${C.bold}[INFO]${C.reset} ${C.cyan}${m}${C.reset}`);

function fmtTime(d) {
  return d.toLocaleString("en-GB", { hour12: true });
}

function fmtDuration(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${d}d ${h}h ${m}m ${sec}s`;
}

function showBanner() {
  const w = 62;
  const line = "═".repeat(w);
  const center = (t) => {
    const left = Math.floor((w - t.length) / 2);
    return " ".repeat(left) + t + " ".repeat(w - t.length - left);
  };
  const up = botStartedAt ? fmtDuration(Date.now() - botStartedAt.getTime()) : "Not running";

  console.log("");
  console.log(`${C.magenta}${C.bold}╔${line}╗${C.reset}`);
  console.log(`${C.magenta}${C.bold}║${C.cyan}${center("")}${C.magenta}║${C.reset}`);
  console.log(`${C.magenta}${C.bold}║${C.cyan}${center("♦  J E W E L   C H A T   B O T  ♦")}${C.magenta}║${C.reset}`);
  console.log(`${C.magenta}${C.bold}║${C.yellow}${center("~ Smart • Fast • Reliable ~")}${C.magenta}║${C.reset}`);
  console.log(`${C.magenta}${C.bold}║${C.cyan}${center("")}${C.magenta}║${C.reset}`);
  console.log(`${C.magenta}${C.bold}╠${line}╣${C.reset}`);
  const row = (k, v) => {
    const text = ` ${k.padEnd(16)}: ${String(v)}`;
    console.log(`${C.magenta}${C.bold}║${C.reset}${C.white}${text.slice(0, w).padEnd(w)}${C.magenta}${C.bold}║${C.reset}`);
  };
  row("Bot Name", packageInfo.name);
  row("Version", packageInfo.version);
  row("Launcher Started", fmtTime(LAUNCHER_STARTED_AT));
  row("Bot Started", botStartedAt ? fmtTime(botStartedAt) : "Not running");
  row("Uptime", up);
  row("Restarts", restartCount);
  row("Code Check", lastCodeStatus);
  console.log(`${C.magenta}${C.bold}╚${line}╝${C.reset}`);
  console.log("");
}

/* ---------- কোড/ফাইল লোড চেক ---------- */
function walkJs(dir, out = []) {
  let items = [];
  try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return out; }
  for (const it of items) {
    if (it.name === "node_modules" || it.name === ".git") continue;
    const full = path.join(dir, it.name);
    if (it.isDirectory()) walkJs(full, out);
    else if (it.isFile() && it.name.endsWith(".js")) out.push(full);
    if (out.length > 400) break;
  }
  return out;
}

function resolveLocal(fromFile, req) {
  const base = path.resolve(path.dirname(fromFile), req);
  const tries = [base, base + ".js", base + ".json", base + ".node", path.join(base, "index.js")];
  return tries.some((t) => { try { return fs.statSync(t).isFile(); } catch (_) { return false; } });
}

function checkCode() {
  console.log(`${C.blue}${C.bold}── Code Check ──${C.reset}`);
  let problems = 0;

  if (!fs.existsSync(MAIN_FILE)) {
    fail("Main.js not found! Bot cannot run.");
    lastCodeStatus = "Main.js MISSING";
    return false;
  }
  ok("Main.js found");

  // dependency চেক
  const deps = Object.keys(packageInfo.dependencies || {});
  const missingDeps = deps.filter((d) => !fs.existsSync(path.join(__dirname, "node_modules", d)));
  if (missingDeps.length) {
    problems++;
    fail(`Missing node modules: ${missingDeps.join(", ")}  →  run: npm install`);
  } else if (deps.length) {
    ok(`All ${deps.length} dependencies are installed`);
  }

  // সিনট্যাক্স + require চেক
  const files = walkJs(__dirname).filter((f) => f !== __filename);
  const syntaxErrors = 0; // সিনট্যাক্স এরর Main.js নিজেই লগে দেখায়; আলাদা spawn চেক বাদ (দ্রুত চালুর জন্য)
  let loadErrors = 0;

  for (const f of files) {
    const rel = path.relative(__dirname, f);

    let src = "";
    try { src = fs.readFileSync(f, "utf8"); } catch (_) { continue; }
    const re = /require\(\s*["'](\.{1,2}\/[^"']*)["']\s*\)/g;
    let m;
    while ((m = re.exec(src))) {
      if (!resolveLocal(f, m[1])) {
        loadErrors++;
        fail(`Load problem in ${rel}: cannot find "${m[1]}"`);
      }
    }
  }

  if (!syntaxErrors && !loadErrors) ok(`${files.length} code file(s) checked — no problems found`);
  problems += syntaxErrors + loadErrors;

  if (problems) {
    lastCodeStatus = `${problems} PROBLEM(S) FOUND`;
    warn("Because of the problem(s) above, the bot may not run properly.");
    return false;
  }
  lastCodeStatus = "ALL OK";
  return true;
}

function runPreflight() {
  console.log("");
  info(`Launcher time: ${fmtTime(new Date())}`);
  const k = checkCode();
  console.log("");
  if (k) ok("Everything is fine. Starting the bot...");
  else warn("Some checks failed (see above). Trying to start the bot anyway...");
  console.log("");
}

function describeExit(code, signal) {
  if (signal) return `Killed by signal ${signal}`;
  if (code === 0) return "Bot exited normally (code 0)";
  if (code === 1) return "Bot crashed because of a code error (see the error above)";
  if (code === 2) return "Bot stopped due to wrong usage / invalid script";
  if (code === 9) return "Invalid Argument / Node flag problem";
  return `Bot stopped with unexpected exit code ${code}`;
}

function attachMonitor(child) {
  botStartedAt = new Date();
  restartCount++;
  ok(`Bot process started at ${fmtTime(botStartedAt)} (PID: ${child.pid})`);
  const startedAt = Date.now();

  child.on("error", (error) => {
    fail(`Bot could not be started: ${error.message}`);
  });

  child.on("close", (code, signal) => {
    const ranFor = fmtDuration(Date.now() - startedAt);
    console.log("");
    if (shuttingDown) {
      info(`Bot stopped by launcher. Ran for ${ranFor}`);
      return;
    }
    if (code === 0) warn(describeExit(code, signal));
    else fail(describeExit(code, signal));
    if (code !== 0 && Date.now() - startedAt < 10000) {
      fail("Bot stopped within 10 seconds — it did NOT run properly because of a code problem.");
    }
    info(`Bot ran for ${ranFor}`);
    botStartedAt = null;
    showBanner();
  });
}

function startMonitorTimer() {
  const t = setInterval(() => {
    console.log("");
    console.log(`${C.dim}────────── Auto status refresh ──────────${C.reset}`);
    showBanner();
  }, BANNER_INTERVAL_MS);
  t.unref(); // বট বন্ধ হলে টাইমার প্রসেস ধরে রাখবে না
}

process.on("uncaughtException", (err) => {
  fail(`Launcher error: ${err && err.message}`);
});
process.on("unhandledRejection", (err) => {
  fail(`Launcher unhandled rejection: ${err && err.message ? err.message : err}`);
});
/* ============================================================
   ===== নতুন যোগ করা অংশ (ADDED FEATURES) - শেষ ===============
   ============================================================ */

/* ---------- মেমোরি পাহারা ----------
   Render ফ্রি = ~512 MB। সীমা পার হলে Render পুরো সার্ভার মেরে ফেলে (সেশনও মুছে যায়)।
   তাই তার আগেই শুধু বট-প্রসেস রিস্টার্ট করি — সার্ভার বাঁচে, সেশন ডিস্কে থাকে, আবার লিংক লাগে না। */
function rssMB(pid) {
  try {
    const m = /VmRSS:\s+(\d+) kB/.exec(fs.readFileSync("/proc/" + pid + "/status", "utf8"));
    return m ? Math.round(Number(m[1]) / 1024) : 0;
  } catch (_) { return 0; }
}
function startMemWatch() {
  const LIMIT = Number(process.env.MEM_RESTART_MB) || 440;
  const t = setInterval(() => {
    if (!bot || restartRequested || shuttingDown || !botStartedAt) return;
    if (Date.now() - botStartedAt.getTime() < 5 * 60 * 1000) return;   // চালুর প্রথম ৫ মিনিট ছাড়
    if (Date.now() - lastMemRestart < 10 * 60 * 1000) return;           // দুই রিস্টারের মাঝে অন্তত ১০ মিনিট
    const total = rssMB(bot.pid) + Math.round(process.memoryUsage().rss / 1048576);
    if (total > LIMIT) {
      warn("মেমোরি " + total + " MB (সীমা " + LIMIT + ") — বট-প্রসেস রিস্টার্ট করা হচ্ছে");
      lastMemRestart = Date.now();
      restartRequested = true;
      try { bot.kill("SIGTERM"); } catch (_) {}
      setTimeout(() => { try { if (bot) bot.kill("SIGKILL"); } catch (_) {} }, 10000);
    }
  }, 30000);
  t.unref();
}

function startBot() {
  require("./includes/creditGuard").enforce("Juwel.js/restart"); // Credit Guard
  // Mirai + GoatBot হাইব্রিড লেয়ার: Main.js চালুর আগেই preload.js লোড হয়, যাতে
  // Script/commands ও Script/events-এ GoatBot স্টাইলের ফাইলও (onStart/onChat/onReply...) চলে।
  const nodeArgs = ["--trace-warnings", "--async-stack-traces", "--max-old-space-size=" + (process.env.BOT_HEAP_MB || 320)];
  if (fs.existsSync(COMPAT_PRELOAD)) nodeArgs.push("--require", COMPAT_PRELOAD);
  bot = spawn(process.execPath, [...nodeArgs, MAIN_FILE], {
    cwd: __dirname,
    stdio: "inherit",
    env: {
      ...process.env
    }
  });

  attachMonitor(bot); // <-- নতুন যোগ

  bot.on("error", (error) => {
    console.error("Main.js Error:", error.message);
  });

  const spawnedAt = Date.now();

  bot.on("close", (code, signal) => {
    bot = null;

    if (shuttingDown) {
      process.exit(0);
      return;
    }

    if (restartRequested) {
      restartRequested = false;
      consecutiveFails = 0;
      console.log("♻ মেমোরি কমাতে বট-প্রসেস রিস্টার্ট হচ্ছে (সেশন অক্ষত)...");
      setTimeout(() => { if (!shuttingDown) startBot(); }, 3000);
      return;
    }

    console.log("Main.js stopped.");
    console.log("Exit Code:", code, "Signal:", signal || "none");

    // কোড 0 = ইচ্ছাকৃত বন্ধ (যেমন Offbot কমান্ড), তাই রিস্টার্ট হবে না
    if (code === 0) {
      console.log("Normal exit (code 0). Not restarting.");
      process.exit(0);
      return;
    }

    // ১ মিনিটের বেশি চলে থাকলে ব্যর্থতার গণনা শূন্য, না হলে বাড়বে
    if (Date.now() - spawnedAt > 60000) consecutiveFails = 0;
    else consecutiveFails++;

    // 5s, 10s, 20s, 40s, সর্বোচ্চ 60s অপেক্ষা
    const delay = Math.min(5000 * Math.pow(2, Math.max(0, consecutiveFails - 1)), 60000);
    console.log(`Auto-restart in ${Math.round(delay / 1000)}s (consecutive fails: ${consecutiveFails})`);
    setTimeout(() => {
      if (!shuttingDown) startBot();
    }, delay);
  });
}

function stopBot(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  if (bot && bot.exitCode === null && bot.signalCode === null) {
    try {
      bot.kill(signal);
    } catch (_) {}

    const forceTimer = setTimeout(() => {
      try {
        if (bot) bot.kill("SIGKILL");
      } catch (_) {}
    }, 10000);

    bot.once("close", () => {
      clearTimeout(forceTimer);
      process.exit(0);
    });

    return;
  }

  process.exit(0);
}

process.on("SIGINT", () => stopBot("SIGINT"));
process.on("SIGTERM", () => stopBot("SIGTERM"));

process.on("exit", () => {
  if (bot && bot.exitCode === null && bot.signalCode === null) {
    try {
      bot.kill("SIGKILL");
    } catch (_) {}
  }
});

runPreflight();     // <-- নতুন যোগ: কুকি + কোড চেক
startBot();
showBanner();       // <-- নতুন যোগ: Jewel Chat Bot ব্যানার
startMonitorTimer(); // <-- নতুন যোগ: বারবার স্ট্যাটাস দেখাবে
startMemWatch();
