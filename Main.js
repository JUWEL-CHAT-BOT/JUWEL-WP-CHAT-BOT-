// Credit : 乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐
// ============================================================
//  MR JUWEL - JUWEL CHAT BOT
//  Main file (readable / editable version)
// ============================================================

const moment = require('moment-timezone');
const { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } = require('fs-extra');
const { join, resolve } = require('path');
const { execSync } = require('child_process');

// ---------- Credit Guard ----------
require('./includes/creditGuard').enforce('Main.js');

// ---------- Branding (এখানে নাম বদলাতে পারবে) ----------
const logName = 'MR JUWEL';
const logNickName = 'JUWEL CHAT BOT';
const logAnthorName = 'MR JUWEL';
const logconsoleName = 'JUWEL BOT';

// ---------- Bot number ----------
// বটের নম্বর botnumber.js এ; অ্যাডমিনের নম্বর/UID শুধু config.json এর ADMINBOT এ
const botNumber = (() => { try { return require('./botnumber').number || ''; } catch (e) { return ''; } })();

// ---------- Timezone ----------
// বাংলাদেশ এর জন্য 'Asia/Dhaka' দাও
const TIMEZONE = 'Asia/Kolkata';

const logger = require('./utils/log')(logName, logNickName);
const consoleLogger = require('./utils/console');

consoleLogger.init(logconsoleName);

const listPackage = JSON.parse(readFileSync('./package.json')).dependencies;
const listbuiltinModules = require('module').builtinModules;
const chalk = require('chalk');

// ---------- Banner ----------
const colorOptions = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
const selectedColor = colorOptions[Math.floor(Math.random() * colorOptions.length)];

const BOT_ART = chalk[selectedColor](`
░░░░░██╗██╗░░░██╗░██╗░░░░░░░██╗███████╗██╗░░░░░
░░░░░██║██║░░░██║░██║░░██╗░░██║██╔════╝██║░░░░░
░░░░░██║██║░░░██║░╚██╗████╗██╔╝█████╗░░██║░░░░░
██╗░░██║██║░░░██║░░████╔═████║░██╔══╝░░██║░░░░░
╚█████╔╝╚██████╔╝░░╚██╔╝░╚██╔╝░███████╗███████╗
░╚════╝░░╚═════╝░░░░╚═╝░░░╚═╝░░╚══════╝╚══════╝
          JUWEL CHAT BOT
            MR JUWEL
`);

// ---------- Global client ----------
global.client = new Object({
    commands: new Map(),
    commandAliases: new Map(),
    events: new Map(),
    cooldowns: new Map(),
    eventRegistered: new Array(),
    handleSchedule: new Array(),
    handleReaction: new Array(),
    handleReply: new Array(),
    mainPath: process.cwd(),
    configPath: new String(),
    getTime: function (option) {
        switch (option) {
            case 'seconds':
                return '' + moment.tz(TIMEZONE).format('ss');
            case 'minutes':
                return '' + moment.tz(TIMEZONE).format('mm');
            case 'hours':
                return '' + moment.tz(TIMEZONE).format('HH');
            case 'date':
                return '' + moment.tz(TIMEZONE).format('DD');
            case 'month':
                return '' + moment.tz(TIMEZONE).format('MM');
            case 'year':
                return '' + moment.tz(TIMEZONE).format('YYYY');
            case 'fullHour':
                return '' + moment.tz(TIMEZONE).format('HH:mm:ss');
            case 'fullYear':
                return '' + moment.tz(TIMEZONE).format('DD/MM/YYYY');
            case 'fullTime':
                return '' + moment.tz(TIMEZONE).format('HH:mm:ss DD/MM/YYYY');
        }
    }
});

global.client.commandAliasIndex = new Map();

// ---------- Alias helpers ----------
global.client.normalizeAliases = function (commandConfig) {
    const sources = [];
    if (commandConfig && commandConfig.aliases !== undefined) sources.push(commandConfig.aliases);
    if (commandConfig && commandConfig.alias !== undefined) sources.push(commandConfig.alias);

    const result = [];
    for (const source of sources) {
        if (source === null || source === undefined) continue;
        const parts = Array.isArray(source) ? source : String(source).split(/[,\s]+/);
        for (const part of parts) {
            const value = String(part === null || part === undefined ? '' : part).trim();
            if (!value) continue;
            const lower = value.toLowerCase();
            if (!result.includes(lower)) result.push(lower);
        }
    }
    return result;
};

global.client.resolveCommandName = function (input) {
    const name = String(input === null || input === undefined ? '' : input).trim().toLowerCase();
    if (!name) return null;

    for (const key of global.client.commands.keys()) {
        if (String(key).trim().toLowerCase() === name) return key;
    }

    const target = global.client.commandAliases.get(name);
    if (target !== undefined && global.client.commands.has(target)) return target;
    return null;
};

global.client.resolveCommand = function (input) {
    const resolved = global.client.resolveCommandName(input);
    return resolved === null ? null : global.client.commands.get(resolved) || null;
};

global.client.getAliases = function (input) {
    const resolved = global.client.resolveCommandName(input);
    if (resolved === null) return [];
    return (global.client.commandAliasIndex.get(resolved) || []).slice();
};

global.client.commandCandidates = function () {
    const list = [];
    for (const key of global.client.commands.keys()) list.push(String(key));
    for (const key of global.client.commandAliases.keys()) list.push(key);
    return list;
};

global.client.registerCommand = function (module, fileName) {
    const result = { ok: false, reason: null, name: null, conflict: null, aliases: [], skipped: [] };

    if (!module || typeof module !== 'object' || !module.config) {
        result.reason = 'module has no config';
        return result;
    }

    let name = String(module.config.name === null || module.config.name === undefined ? '' : module.config.name).trim();
    if (!name && fileName) name = String(fileName).trim().replace(/\.js$/i, '');
    if (!name) {
        result.reason = 'module.config.name is empty';
        return result;
    }
    result.name = name;

    const lowerName = name.toLowerCase();

    for (const key of global.client.commands.keys()) {
        if (String(key).trim().toLowerCase() === lowerName) {
            result.reason = 'command name collision: "' + name + '" is already loaded (' + key + ')';
            result.conflict = String(key);
            return result;
        }
    }

    const aliasOwner = global.client.commandAliases.get(lowerName);
    if (aliasOwner !== undefined) {
        result.reason = 'command name collision: "' + name + '" is already used as an alias of "' + aliasOwner + '"';
        result.conflict = aliasOwner;
        return result;
    }

    const accepted = [];
    for (const alias of global.client.normalizeAliases(module.config)) {
        if (alias === lowerName) {
            result.skipped.push({ alias: alias, reason: 'it is the same as the command name' });
            continue;
        }

        const owner = global.client.commandAliases.get(alias);
        if (owner !== undefined && owner !== name) {
            result.skipped.push({ alias: alias, reason: 'it is already an alias of "' + owner + '"' });
            continue;
        }

        let conflictCommand = null;
        for (const key of global.client.commands.keys()) {
            if (String(key).trim().toLowerCase() === alias) {
                conflictCommand = String(key);
                break;
            }
        }
        if (conflictCommand !== null) {
            result.skipped.push({ alias: alias, reason: 'it is already a command name ("' + conflictCommand + '")' });
            continue;
        }

        accepted.push(alias);
    }

    global.client.commands.set(name, module);
    for (const alias of accepted) global.client.commandAliases.set(alias, name);

    if (accepted.length) global.client.commandAliasIndex.set(name, accepted);
    else global.client.commandAliasIndex.delete(name);

    result.ok = true;
    result.aliases = accepted;
    return result;
};

global.client.unregisterCommand = function (input) {
    const resolved = global.client.resolveCommandName(input);
    if (resolved === null) return false;

    global.client.commands.delete(resolved);

    const aliases = global.client.commandAliasIndex.get(resolved) || [];
    for (const alias of aliases) {
        if (global.client.commandAliases.get(alias) === resolved) global.client.commandAliases.delete(alias);
    }
    global.client.commandAliasIndex.delete(resolved);

    if (Array.isArray(global.client.eventRegistered)) {
        global.client.eventRegistered = global.client.eventRegistered.filter(x => x !== resolved);
    }
    return true;
};

// ---------- Global data ----------
global.data = new Object({
    threadInfo: new Map(),
    threadData: new Map(),
    userName: new Map(),
    userBanned: new Map(),
    threadBanned: new Map(),
    commandBanned: new Map(),
    threadAllowNSFW: new Array(),
    allUserID: new Array(),
    allCurrenciesID: new Array(),
    allThreadID: new Array()
});

global.utils = require('./utils');
global.nodemodule = new Object();
global.config = new Object();
global.configModule = new Object();
global.moduleData = new Array();
global.language = new Object();
global.developers = [botNumber].filter(Boolean);

global.isDeveloper = function (id) {
    if (!id) return false;
    const uid = String(id);
    const configDevs = global.config && Array.isArray(global.config.DEVELOPER) ? global.config.DEVELOPER.map(String) : [];
    return configDevs.includes(uid) || global.developers.includes(uid);
};

if (typeof global.handleListen === 'undefined') global.handleListen = null;

// ---------- Load config.json ----------
var configValue;
try {
    global.client.configPath = join(global.client.mainPath, 'config.json');
    configValue = require(global.client.configPath);
    logger.loader('Found file config: config.json');
} catch (cfgErr) {
    if (existsSync(global.client.configPath)) {
        logger.loader('config.json এ ভুল আছে: ' + (cfgErr && cfgErr.message) + ' — কমা (,) বা কোটেশন (") বাদ পড়েছে কিনা দেখুন', 'error');
    }
    const configTempPath = join(global.client.mainPath, 'config.json.temp');
    if (existsSync(configTempPath)) {
        configValue = JSON.parse(readFileSync(configTempPath));
        logger.loader('আগের ভালো কপি ব্যবহার হচ্ছে: ' + configTempPath + ' (config.json ঠিক করুন)');
    } else {
        return logger.loader('config.json not found!', 'error');
    }
}

try {
    for (const key in configValue) global.config[key] = configValue[key];
    // DEVELOPER আলাদা লাগে না: ADMINBOT-ই ডেভেলপার-লেভেলের অ্যাক্সেস পায়
    global.config.ADMINBOT = [].concat(global.config.ADMINBOT || []).map(String);
    global.config.DEVELOPER = [...new Set([].concat(global.config.DEVELOPER || [], global.config.ADMINBOT).map(String))];
    logger.loader('Config Loaded!');
} catch {
    return logger.loader("Can't load file config!", 'error');
}

const { Sequelize, sequelize } = require('./includes/database');

writeFileSync(global.client.configPath + '.temp', JSON.stringify(global.config, null, 4), { encoding: 'utf8', mode: 0o600 });

// ---------- Language file ----------
const langFile = readFileSync(__dirname + '/languages/' + (global.config.language || 'en') + '.lang', { encoding: 'utf-8' }).split(/\r?\n|\r/);
const langData = langFile.filter(line => line.indexOf('#') != 0 && line != '');

for (const item of langData) {
    const getSeparator = item.indexOf('=');
    const itemKey = item.slice(0, getSeparator);
    const itemValue = item.slice(getSeparator + 1, item.length);
    const head = itemKey.slice(0, itemKey.indexOf('.'));
    const key = itemKey.replace(head + '.', '');
    const value = itemValue.replace(/\\n/gi, '\n');

    if (typeof global.language[head] == 'undefined') global.language[head] = new Object();
    global.language[head][key] = value;
}

global.getText = function (...args) {
    const language = global.language;
    if (!language.hasOwnProperty(args[0])) throw __filename + ' - Not found key language: ' + args[0];

    var text = language[args[0]][args[1]];
    for (var i = args.length - 1; i > 0; i--) {
        const regex = RegExp('%' + i, 'g');
        text = text.replace(regex, args[i + 1]);
    }
    return text;
};

// NOTE: 'shahadat' নামটা .lang ফাইলের key — এটা বদলালে languages/*.lang ফাইলেও বদলাতে হবে।

logger('JUWEL BOT', '[ Starting ]');

// ---------- Web server + single instance ----------
const express = require('express');
const path = require('path');
const http = require('http');
const PID_FILE = join(global.client.mainPath, '.bot.pid');

function checkSingleInstance() {
    // Juwel.js লঞ্চার সবসময় একটাই Main.js চালায়। তাই শুধু তখনই আটকাই যখন পুরনো PID সত্যিই Main.js এবং বেঁচে আছে
    // (কন্টেইনারে PID নতুন করে ব্যবহার হয়, পুরনো PID অন্য প্রসেসের হলে ভুল করে বট বন্ধ না হয়)
    try {
        if (existsSync(PID_FILE)) {
            const oldPid = parseInt(readFileSync(PID_FILE, 'utf8').trim(), 10);
            if (oldPid && oldPid !== process.pid && oldPid !== process.ppid) {
                let alive = false;
                try { process.kill(oldPid, 0); alive = true; } catch (e) {}
                if (alive) {
                    let isMain = true;
                    try { isMain = /Main\.js/.test(readFileSync('/proc/' + oldPid + '/cmdline', 'utf8')); } catch (e) {}
                    if (isMain) {
                        logger('Another bot instance (PID ' + oldPid + ') is already running. Preventing duplicate sessions.', '[ WARNING ]');
                        return false;
                    }
                }
                logger('Removing stale PID file from a previous run.', '[ WARNING ]');
            }
        }
        writeFileSync(PID_FILE, String(process.pid), 'utf8');
    } catch (e) {}
    return true;
}

function removePidFile() {
    try {
        if (existsSync(PID_FILE)) {
            const pid = parseInt(readFileSync(PID_FILE, 'utf8').trim(), 10);
            if (pid === process.pid) unlinkSync(PID_FILE);
        }
    } catch (e) {}
}

const app = express();
const port = process.env.PORT || 8080;

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '/index.html'));
});
app.get('/index.html', function (req, res) {
    res.sendFile(path.join(__dirname, '/index.html'));
});

const server = http.createServer(app);
let botStartupStarted = false;
let listenerStarted = false;

async function startBot() {
    if (botStartupStarted) return;
    botStartupStarted = true;

    try {
        await sequelize.authenticate();
        const modelsInput = { Sequelize: Sequelize, sequelize: sequelize };
        const models = require('./includes/database/model')(modelsInput);
        logger(global.getText('shahadat', 'successConnectDatabase'), '[ DATABASE ]');
        onBot({ models: models });
    } catch (error) {
        logger('Database error: ' + error.message, '[ ERROR ]');
    }
}

if (!checkSingleInstance()) {
    logger('Duplicate bot instance detected - exiting so the running instance keeps its session.', '[ WARNING ]');
    process.exit(1);
}

server.listen(port, '0.0.0.0', () => {
    logger('Server running on port ' + port, '[ WEB ]');
    startBot();
}).on('error', err => {
    if (err.code === 'EADDRINUSE') {
        logger('Port ' + port + ' is already in use - this runtime will not open another bot connection', '[ WEB ]');
        process.exit(1);
        return;
    }
    if (err.code === 'EACCES') logger('Port ' + port + ' permission denied', '[ ERROR ]');
    else logger('Web server error: ' + err.message, '[ ERROR ]');
    startBot();
});

// ---------- Console message logging ----------
const consoleNameCache = new Map();

function isConsoleEnabled(threadID) {
    const id = String(threadID);
    const threadData = global.data.threadData.get(id) || global.data.threadData.get(parseInt(id, 10)) || {};
    return threadData.console !== false;
}

async function getConsoleInfo(api, event) {
    const threadID = String(event.threadID);
    const senderID = String(event.senderID);

    let groupName = (global.data.threadInfo.get(threadID) || {}).threadName;
    if (!groupName && !consoleNameCache.has('thread|' + threadID)) {
        try {
            const info = await api.getThreadInfo(threadID);
            consoleNameCache.set('thread|' + threadID, (info || {}).threadName || '');
        } catch {
            consoleNameCache.set('thread|' + threadID, '');
        }
    }
    if (!groupName) groupName = consoleNameCache.get('thread|' + threadID) || undefined;

    let userName = global.data.userName.get(senderID);
    if (!userName && !consoleNameCache.has('user|' + senderID)) {
        try {
            const info = await api.getUserInfo([senderID]);
            consoleNameCache.set('user|' + senderID, ((info || {})[senderID] || {}).name || '');
        } catch {
            consoleNameCache.set('user|' + senderID, '');
        }
    }
    if (!userName) userName = consoleNameCache.get('user|' + senderID) || undefined;

    return { groupName: groupName, userName: userName };
}

function logMessageToConsole(api, event) {
    try {
        if (!event || !['message', 'message_reply'].includes(event.type)) return;

        const threadID = String(event.threadID || '');
        const senderID = String(event.senderID || '');
        if (!threadID || !senderID) return;

        let botID = '';
        try {
            botID = String(api.getCurrentUserID() || '');
        } catch {
            botID = '';
        }
        if (botID && senderID === botID) return;
        if (!isConsoleEnabled(threadID)) return;

        getConsoleInfo(api, event)
            .then(function ({ groupName, userName }) {
                consoleLogger.log({
                    groupName: groupName,
                    threadID: threadID,
                    userName: userName,
                    senderID: senderID,
                    content: event.body ? event.body : undefined
                });
            })
            .catch(function () {});
    } catch (e) {}
}

// ---------- Install / load a dependency for a module ----------
function loadModuleDependencies(moduleItem) {
    const deps = moduleItem.config.dependencies;
    if (!deps || typeof deps !== 'object') return;

    for (const dep in deps) {
        const moduleDir = join(__dirname, 'nodemodules', 'node_modules', dep);
        try {
            if (!global.nodemodule.hasOwnProperty(dep)) {
                if (listPackage.hasOwnProperty(dep) || listbuiltinModules.includes(dep)) global.nodemodule[dep] = require(dep);
                else global.nodemodule[dep] = require(moduleDir);
            }
        } catch {
            let loaded = false;
            let lastError;

            logger.loader(global.getText('shahadat', 'notFoundPackage', dep, moduleItem.config.name), 'warn');

            execSync(
                'npm --package-lock false --save install ' + dep +
                (deps[dep] == '*' || deps[dep] == '' ? '' : '@' + deps[dep]),
                { stdio: 'inherit', env: process.env, shell: true, cwd: join(__dirname, 'nodemodules') }
            );

            for (let i = 1; i <= 3; i++) {
                try {
                    require.cache = {};
                    if (listPackage.hasOwnProperty(dep) || listbuiltinModules.includes(dep)) global.nodemodule[dep] = require(dep);
                    else global.nodemodule[dep] = require(moduleDir);
                    loaded = true;
                    break;
                } catch (e) {
                    lastError = e;
                }
                if (loaded || !lastError) break;
            }

            if (!loaded || lastError) {
                throw global.getText('shahadat', 'cantInstallPackage', dep, moduleItem.config.name, lastError);
            }
        }
    }
    logger.loader(global.getText('shahadat', 'loadedPackage', moduleItem.config.name));
}

function loadModuleEnvConfig(moduleItem) {
    if (!moduleItem.config.envConfig) return;
    const name = moduleItem.config.name;

    try {
        for (const key in moduleItem.config.envConfig) {
            if (typeof global.configModule[name] == 'undefined') global.configModule[name] = {};
            if (typeof global.config[name] == 'undefined') global.config[name] = {};

            if (typeof global.config[name][key] !== 'undefined') global.configModule[name][key] = global.config[name][key];
            else global.configModule[name][key] = moduleItem.config.envConfig[key] || '';

            if (typeof global.config[name][key] == 'undefined') global.config[name][key] = moduleItem.config.envConfig[key] || '';
        }
        logger.loader(global.getText('shahadat', 'loadedConfig', name));
    } catch (error) {
        throw new Error(global.getText('shahadat', 'loadedConfig', name, JSON.stringify(error)), 'error');
    }
}

// ---------- Main bot start ----------
function onBot({ models }) {
    const loginFn = require('./whatsapp');
    loginFn({}, async (loginError, api) => {
        if (loginError) {
            logger('Login error: ' + logger.redactSecrets(JSON.stringify(loginError)), 'ERROR');
            return;
        }

        if (listenerStarted) {
            logger('Bot already running - duplicate login callback ignored', '[ LISTENER ]');
            return;
        }

        global.client.api = api;
        global.client.timeStart = new Date().getTime();

        // ===== Load commands =====
        (function loadCommands() {
            const disabledCommands = Array.isArray(global.config.commandDisabled) ? global.config.commandDisabled : [];
            const commandFiles = readdirSync(global.client.mainPath + '/Script/commands').filter(
                file => file.endsWith('.js') && !file.includes('example') && !disabledCommands.includes(file)
            );

            for (const file of commandFiles) {
                var registered = null;
                try {
                    var commandModule = require(global.client.mainPath + '/Script/commands/' + file);

                    if (!commandModule.config || !commandModule.run || !commandModule.config.commandCategory) {
                        throw new Error(global.getText('shahadat', 'errorFormat'));
                    }

                    registered = global.client.registerCommand(commandModule, file);
                    if (!registered.ok) throw new Error(registered.reason);

                    for (const skipped of registered.skipped) {
                        logger.loader('Command "' + registered.name + '": alias "' + skipped.alias + '" was ignored because ' + skipped.reason + '.', 'warn');
                    }

                    if (!commandModule.languages || typeof commandModule.languages != 'object' || Object.keys(commandModule.languages).length == 0) {
                        logger.loader(global.getText('shahadat', 'notFoundLanguage', commandModule.config.name), 'warn');
                    }

                    loadModuleDependencies(commandModule);
                    loadModuleEnvConfig(commandModule);

                    if (commandModule.onLoad) {
                        try {
                            commandModule.onLoad({ api: api, models: models });
                        } catch (error) {
                            throw new Error(global.getText('shahadat', 'cantOnload', commandModule.config.name, JSON.stringify(error)), 'error');
                        }
                    }

                    if (commandModule.handleEvent) global.client.eventRegistered.push(registered.name);

                    logger.loader(global.getText('shahadat', 'successLoadModule', commandModule.config.name));
                } catch (error) {
                    if (registered && registered.ok) global.client.unregisterCommand(registered.name);
                    const failedName = commandModule && commandModule.config && commandModule.config.name ? commandModule.config.name : file;
                    logger.loader(global.getText('shahadat', 'failLoadModule', failedName, error), 'error');
                }
            }
        })();

        // ===== Load events =====
        (function loadEvents() {
            const disabledEvents = Array.isArray(global.config.eventDisabled) ? global.config.eventDisabled : [];
            const eventFiles = readdirSync(global.client.mainPath + '/Script/events').filter(
                file => file.endsWith('.js') && !disabledEvents.includes(file)
            );

            for (const file of eventFiles) {
                try {
                    var eventModule = require(global.client.mainPath + '/Script/events/' + file);

                    if (!eventModule.config || !eventModule.run) {
                        throw new Error(global.getText('shahadat', 'errorFormat'));
                    }
                    if (global.client.events.has(eventModule.config.name) || '') {
                        throw new Error(global.getText('shahadat', 'nameExist'));
                    }

                    loadModuleDependencies(eventModule);
                    loadModuleEnvConfig(eventModule);

                    if (eventModule.onLoad) {
                        try {
                            eventModule.onLoad({ api: api, models: models });
                        } catch (error) {
                            throw new Error(global.getText('shahadat', 'cantOnload', eventModule.config.name, JSON.stringify(error)), 'error');
                        }
                    }

                    global.client.events.set(eventModule.config.name, eventModule);
                    logger.loader(global.getText('shahadat', 'successLoadModule', eventModule.config.name));
                } catch (error) {
                    const failedName = eventModule && eventModule.config && eventModule.config.name ? eventModule.config.name : file;
                    logger.loader(global.getText('shahadat', 'failLoadModule', failedName, error), 'error');
                }
            }
        })();

        console.log(BOT_ART);
        logger.loader(global.getText('shahadat', 'finishLoadModule', global.client.commands.size, global.client.events.size));
        logger.loader('Startup Time: ' + ((Date.now() - global.client.timeStart) / 1000).toFixed() + 's');
        logger.loader('===== [ ' + (Date.now() - global.client.timeStart) + 'ms ] =====');

        writeFileSync(global.client.configPath, JSON.stringify(global.config, null, 4), 'utf8');
        if (existsSync(global.client.configPath + '.temp')) unlinkSync(global.client.configPath + '.temp');

        const listener = require('./includes/listen')({ api: api, models: models, logAnthorName: logAnthorName });

        function handleListen(error, event) {
            if (error) {
                return logger(global.getText('shahadat', 'handleListenError', logger.redactSecrets(JSON.stringify(error))), 'error');
            }
            if (['presence', 'typ', 'read_receipt'].some(t => t == event.type)) return;
            if (global.config.DeveloperMode == true) console.log(event);

            logMessageToConsole(api, event);
            return listener(event);
        }

        if (typeof api.listenMqtt === 'function') {
            try {
                api.listenMqtt(handleListen);
                listenerStarted = true;
                logger('MQTT listener registered - reconnect is managed by whatsapp/index.js', '[ LISTENER ]');
            } catch (e) {
                logger('Listen error: ' + e.message, '[ ERROR ]');
                return;
            }
        } else {
            logger('api.listenMqtt is unavailable - MQTT listener was not started', '[ ERROR ]');
        }

        try {
            if (typeof checkBan === 'function') await checkBan(api);
        } catch (e) {}

        if (!global.checkBan) logger(global.getText('shahadat', 'warningSourceCode'), '[ GLOBAL BAN ]');
    });
}

// ---------- Error handling ----------
process.on('uncaughtException', err => {
    logger('Uncaught Exception: ' + logger.redactSecrets(err && err.message ? err.message : err), '[ ERROR ]');
});

process.on('unhandledRejection', err => {
    logger('Unhandled Rejection: ' + logger.redactSecrets(err && err.message ? err.message : err), '[ ERROR ]');
});

// ---------- Graceful shutdown ----------
let isTerminating = false;

async function handleExitSignal(signal) {
    if (isTerminating) return;
    isTerminating = true;

    logger('Received ' + signal + ', shutting down gracefully...', '[ Shutdown ]');
    removePidFile();

    try {
        if (server && server.listening) server.close();
    } catch (e) {}

    stopListenerBestEffort();

    // বন্ধ হওয়ার আগে WhatsApp সেশন ব্যাকআপ (সর্বোচ্চ ৫ সেকেন্ড)
    const flush = typeof global.waFlushSession === 'function' ? Promise.resolve(global.waFlushSession()).catch(() => {}) : Promise.resolve();
    Promise.race([flush, new Promise((r) => setTimeout(r, 5000))]).then(() => setTimeout(() => process.exit(0), 500));
}

function stopListenerBestEffort() {
    try {
        const listener = global.handleListen;
        global.handleListen = null;
        if (!listener) return;

        if (typeof listener.stopListening === 'function') listener.stopListening();
        else if (typeof listener.stop === 'function') listener.stop();
        else if (typeof listener.end === 'function') listener.end();
        else if (typeof listener === 'function') listener();
    } catch (e) {}
}

process.on('SIGINT', () => handleExitSignal('SIGINT'));
process.on('SIGTERM', () => handleExitSignal('SIGTERM'));
process.on('exit', () => {
    stopListenerBestEffort();
    removePidFile();
});
