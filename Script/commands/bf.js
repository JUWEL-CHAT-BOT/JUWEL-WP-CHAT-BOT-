module.exports.config = {
  name: "bf",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
  description: "BF & GF love banner with both users mentioned and random caption",
  commandCategory: "banner",
  usePrefix: true,
  usages: "[@mention | reply]",
  cooldowns: 40,
  dependencies: {
    "axios": "",
    "fs-extra": "",
    "path": "",
    "canvas": ""
  }
};

// ====== Template settings ======
const TEMPLATE_URL = "https://i.imgur.com/Za2nSA1.jpeg";
const REF_W = 1671;
const REF_H = 941;
// বাম = BF (sender), ডান = GF (target)
// ছবি ঠিকমতো না বসলে শুধু এই x, y, r মান বদলাও
// x, y = ফ্রেমের মাঝখান | rx = আড়াআড়ি রেডিয়াস | ry = লম্বালম্বি রেডিয়াস
// ছোট/বড় করতে rx, ry কমাও/বাড়াও; সরাতে x, y বদলাও
const LEFT  = { x: 376,  y: 374, rx: 186, ry: 186 };
const RIGHT = { x: 1275, y: 376, rx: 186, ry: 186 };
const CREDIT = "乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐";
// ================================

// ====== Captions ======
// এখানে তোমার ক্যাপশনগুলো দাও। প্রতিটা ক্যাপশন ` ` এর ভিতরে, কমা দিয়ে আলাদা করে।
// উদাহরণ:
// `💖 তুমি আমার জীবনের সবচেয়ে সুন্দর গল্প 💖`,
const SIGN = `╭───🎀🪄⤹🍥⤸📰🌷────⎞
╰──⃞⃟✎𐏓꯭꯭𝙼⃞⃟𝚁⪩𝙹⃞⃟𝚄𝚆𝙴⃞⃟𝙻⪨⤸⃞🩷ꤪ🪽`;

const CAPTIONS = [
`]🩵🪽
✧                 ˖°☁️🌷།國།⋆ ˚｡⋆୨୧˚

Ꮗ─⃞⤹𝐘𝐨𝐮 𝐚𝐫𝐞 𝐚𝐥𝐰𝐚𝐲𝐬 𝐁𝐞𝐚𝐮𝐭𝐢𝐟𝐮𝐥 𝐢𝐬 𝐭𝐡𝐞 𝐞𝐲𝐞𝐬 𝐨𝐟 𝐓𝐡𝐞 𝐫𝐢𝐠𝐡𝐭 𝐩𝐞𝐫𝐬𝐨𝐧⋟ꜛᰔᩚ࿐
♡︎ _"𐙚⁽স𝆠፝֟ঠি𝆠፝֟ক₎ ⁽মা𝆠፝֟নু𝆠፝֟ষে𝆠፝֟র₎ ⁽চো𝆠፝֟খে₎ ⁽আ𝆠፝֟প𝆠፝֟নি₎
⁽স𝆠፝֟ব₎ ⁽স𝆠፝֟ম𝆠፝֟য়₎ ⁽সু𝆠፝֟ন্দ𝆠፝֟র₎:♡︎⤸⃞ꜛ ⪼🩷🪽

]🩵🪽
✧        ${SIGN}`,

`]🩵🪽
✧              ˖°☁️🌷།國།⋆ ˚｡⋆୨୧˚

Ꮗ─⃞⤹😽ꤪ⁽জী𝆠፝֟ব𝆠፝֟ন₎ ⁽টা𝆠፝֟ ₎ ⁽সে𝆠፝֟ই₎ ⁽মা𝆠፝֟নু𝆠፝֟ষে𝆠፝֟র₎ ⁽সা𝆠፝֟থে₎ ⁽কা𝆠፝֟টা𝆠፝֟নো₎ ⁽উ𝆠፝֟চি𝆠፝֟ত₎
⁽যা𝆠፝֟র₎ ⁽চে𝆠፝֟হা𝆠፝֟রা₎ ⁽থে𝆠፝֟কে₎ ⁽ম𝆠፝֟ন𝆠፝֟টা₎
⁽ অ𝆠፝֟নে𝆠፝֟ক₎ ⁽সু𝆠፝֟ন্দ𝆠፝֟র₎ ⤸⃞ꜛ國 ⪼🩷🪽

]🩵🪽
✧              ˖°☁️🌷།國།⋆ ˚｡⋆୨୧˚

${SIGN}`,

`ㅤㅤㅤㅤㅤ✧˖°👀😌🤍國⋆ ˚｡⋆୨F୧˚

𝄗 𐚁๋࣭£⭑乛⁽ধৈ𝆠፝֟র্য₎ ⁽রা𝆠፝֟খো₎ ⁽আ𝆠፝֟ল্লা𝆠፝֟হ'𝆠፝֟র₎ ⁽ও𝆠፝֟প𝆠፝֟র₎ ⁽তো𝆠፝֟মা𝆠፝֟র₎ ⁽জ𝆠፝֟ন্য₎ ⁽যে𝆠፝֟টা₎ ⁽ব𝆠፝֟রা𝆠፝֟দ্দ₎ ⁽সে𝆠፝֟টা₎ ⁽দে𝆠፝֟রি𝆠፝֟তে₎ ⁽হ𝆠፝֟লে𝆠፝֟ও₎ ⁽আ𝆠፝֟স𝆠፝֟বে₎ ⁽ই𝆠፝֟ন𝆠፝֟শা𝆠፝֟আ𝆠፝֟ল্লা𝆠፝֟হ₎⎯⃝🙌🏻🐱🪽

⎯⎯⃝🩵┼🎀┼

${SIGN}`,

`˖°☁️🌷།國།⋆ ˚｡⋆୨୧˚

Ꮗ ⁽পু𝆠፝֟রু𝆠፝֟ষে𝆠፝֟র₎ ⁽ম𝆠፝֟নে₎ ⁽যে𝆠፝֟₎ ⁽না𝆠፝֟রী₎ ⁽জা𝆠፝֟য়𝆠፝֟গা₎ ⁽ক𝆠፝֟রে₎ ⁽নি𝆠፝֟তে₎ ⁽পা𝆠፝֟রে₎ ⁽তা𝆠፝֟র₎ ⁽থে𝆠፝֟কে ⁽ভা𝆠፝֟গ্য𝆠፝֟বা𝆠፝֟ন₎ ⁽আ𝆠፝֟র₎ ⁽কে𝆠፝֟উ₎ ⁽নে𝆠፝֟ই₎:)♡🎀🩵🫶🏻

                 ˖°☁️🌷།國།⋆ ˚

${SIGN}`,

`ㅤㅤㅤ✧˖°☁️🌷國⋆ ˚｡⋆এক আকাশ শূন্যতার মাঝে তুমি এক পূর্ণতার ছায়া হাজার মানুষের ভিড়ে আমার অদ্ভুত তুমি এক মায়া✧˖°ㅤㅤ ㅤ💙:)💙🌷✨`,

`ফুল সুন্দর গাছে✧˖°☁️🌷國⋆ ˚｡⋆তুমি সুন্দর আমার কাছে🤲💙:)💙🌷`,

`Ꮗ "ফুলের মধ্যে যেমন " গোলাপ " সেরা তেমনি হাজার নারীর মধ্যে" তুমি আমার কাছে সেরা:ㅤㅤㅤ✧˖°☁️🌷國⋆ ˚｡⋆`,

`╭───⤹🧸⤸📰🌷🥢
╰─আ𝆠፝֟মা𝆠፝֟র ভা𝆠፝֟লো𝆠፝֟বা𝆠፝֟সা নি𝆠፝֟য়ে স𝆠፝֟ন্দে𝆠፝֟হ ক𝆠፝֟রি𝆠፝֟ও না𝆠፝֟হ, ঘু𝆠፝֟টা এ𝆠፝֟ক𝆠፝֟টা জী𝆠፝֟ব𝆠፝֟ন পা𝆠፝֟র ক𝆠፝֟রে দি𝆠፝֟তে পা𝆠፝֟র𝆠፝֟বো তু𝆠፝֟মি বি𝆠፝֟হী𝆠፝֟ন তো𝆠፝֟মা𝆠፝֟র সৃ𝆠፝֟তি নি𝆠፝֟য়ে  -❯🪻🩷`,

`✧˖°✨🫶🏻💗🌷國⋆ ˚｡⋆୨୧˚َ
⎯͢⎯ ♡︎- আমি তোমার জন্য য'ত্নবান এবং বি'শ্বস্ত হবো, তুমি আমার হয়ে থেকে যেও অ'নন্তকাল!  🙂!🤍🥹🖇️⎯͢⎯ ♡︎ ♡︎`,

`╭────────⤹💗⤸📰🌷🥢🪶
╰─⪼ 𝐓𝐮𝐦𝐢 ফুল'হহহ্ 𝐇𝐨𝐲𝐞  এসো  𝐀𝐦𝐚𝐫 শহরে 𝐀𝐦𝐢 নিয়ম 𝐊𝐨𝐫𝐞 যত্ন  𝐍𝐢𝐛𝐨 তোমারে :-🌷😌🎀

${SIGN}`,

`⎞⤹🩷🪻📰⤸🌷

──Ꮗ“তুমি থে𝆠፝֟কে যেও, যেভ༏বে অ𝆠፝֟༏ক༏শে'র বুকে থ༏𝆠፝֟কে চঁ༏দ, অ༏𝆠፝֟মিও থেকে য𝆠፝֟༏বে། হ༏তে রে𝆠፝֟খে হ༏ত-:)💜🌷🫶

${SIGN}`,

`🪻⎯✿⃟🫀তুমি মায়ার কা'রাগার, আর আমি সেই মায়ায় আটকে যাওয়া ক'য়েদি....!─ ⿻ ˚🪼🪻𝆠꯭፝֟🩷🧚‍♀️𝆠꯭፝֟🪽

${SIGN}`,

`──Ꮗ“তুমি থে𝆠፝֟কে যেও, যেভ༏বে অ𝆠፝֟༏ক༏শে'র বুকে থ༏𝆠፝֟কে চঁ༏দ, অ༏𝆠፝֟মিও থেকে য𝆠፝֟༏বে། হ༏তে রে𝆠፝֟খে হ༏ত-:)💜🌷🫶`,

`♡🌺💗
সৌন্দর্য⊱༎ শুধু⊱༎ চোখ⊱༎ আকর্ষণ⊱༎ করে⊱༎কিন্তু⊱༎ ব্যক্তিত্ব⊱༎ হৃদয়⊱༎ কেড়ে⊱༎ নেয়⊱༎🥂🩷⤸🪽
                              💗💌💗  ⎯༢`,

`⟵❍🩷⤹󰂆⤸⊰✎⿻⤹🩷🌷🪽⤸
───Ꮗ⎯যে তোমাকে ভালোবাসবে শতাব্দী ফুরিয়ে গেলেও সে তোমার প্রতি মুগ্ধতা হারাবে না♡︎🩷🌻🫶`,

`╭───⤹🎀⤸︵🩷🪽
╰──(:"𝕍𝐚𝐠𝐠𝐨𝐛𝐚𝐧 𝐓𝐨𝗛 𝐒𝐞𝐞𝐞 𝐉𝐚𝗸𝗘 𝐁𝐮𝐣𝐡𝐚𝐫 𝐌𝐨𝐭𝗢 𝐀𝐤𝐣𝐨𝐧 𝐌𝐚𝐧𝐮𝐬𝐡 𝐀𝗰𝐡𝐞❯<𝟑😊✨🌸`,

`Ꮗ"হারা'ইতে দিলে'ই মানুষ হারায়-!

🌻রাখতে জানলে জীবনে'র শেষ অধ্যায় পর্যন্ত 
একসাথে থাকা যায়-:)♡🤍🌷🎀`,

`⎯⎯꯭𝆺꯭𝅥🪽🌷😌

_⤹🩷🪻📰⤸

─ ⁽ 📃҆ ₎ 𖦹 তে༏ম༏কে দেখ༏র পর অ༏মি অ༏ম༏র নেই তে༏ম༏র হয়ে গেছি ꜛː)💗🫠✨`,

`🩷🪽"হে আল্লাহ" তুমি আমার" দিকে নজ'র রেখো আমি যেন নিজের" স্বার্থর জন্য অন্য কারো ক্ষতি' না করে ফেলি"-!!🌺🥺🪽`,

`╭───⤹💝⤸🌷🥢
╰─✎⿻-/"তোমাকে খাতা কলমে নিজের করে লিখে নিতে পারলে, হয়তো তোমাকে হারানোর ভয় টা কমতো..!!❤️‍🩹🌷

⇄🄰ᴅᴍɪɴꤪꤨ !¡ -💗🌷🙂`,

`╭───⤹💗⤸📰🌷🥢🪶
╰─✎⿻ ⤹-/⤹۵๑ཉ এই বি𝆠፝֟চ্ছেদে𝆠፝֟র যু𝆠፝֟গে আমি তোমা𝆠፝֟কে শ𝆠፝֟ক্ত ক𝆠፝֟রে ধ𝆠፝֟রে রাখ𝆠፝֟তে চা𝆠፝֟ই :)♡😊🩵🫶🏻🎀🥀

───╸ 🫧🌷🩵/-ᜊꨄ︎⤿`,

`«—•}[⊰↺🌻💙🪻↻🪽
╭───⤹󰟱⤸🩵🪻🥢
╰─➤যুগের পর যুগ কেটে যাবে কিন্তু বুকের বা পাশে তুমি রয়ে যাবে!'ᥫ⊰🩵🌷🪽⤸`,

`╭────────⤹💗⤸📰🌷🥢🪶
╰─⪼──⊰➣জীবনে প্রথম দ্বিতীয় বলতে কিছু নেই শেষ পর্যন্ত যে পাশে  থাকে সেই আসল"-:) ♡🌷🩵🫶🏻`,

`╭───⤹💗⤸📰🌷🥢🪶
╰─✎⿻ ⤹-/!~ তো𝆠፝֟মাকে এম𝆠፝֟ন ভা𝆠፝֟বে ভা𝆠፝֟লোবে𝆠፝֟সেছি যে তুমি আমা𝆠፝֟র না হ𝆠፝֟লেও বেশির𝆠፝֟ভাগ মানু𝆠፝֟ষ তোমা𝆠፝֟কে আমা𝆠፝֟র ব𝆠፝֟লে'ই চিন𝆠፝֟বে!"☺️🌷🫶🥢

───╸ 🫧🌷🩵/-`,

`#ʆJ :)-«—•[⊰🌻💙🪻↻🪽✧
─ ⁽ 📃҆ ₎ 𖦹 প༏ওয়༏র ইচ্ছ༏ ট༏ যখন দুইজনের তখন পূর্ণত༏ কেউ অ༏টকে র༏খতে প༏রে ন༏ꜛː)♡༢💌🫶🏻💋 //`,

`✧˖°✨🫶🏻💗🌷國⋆ ˚｡⋆୨୧˚َ
⎯͢⎯ ♡︎ যদি ক༏ট༏র অ༏ঘ༏ত সহ্য করতে ন༏ প༏রে༏ তাহ'লে ফুল ছেঁ༏য়༏'র যে༏গ্য'ত༏ তে༏ম༏র নেই:-) 🙂!🤍🥹🖇️⎯͢⎯ ♡︎ ✨🌸-:)`,

`-)🌷🎀

╭───⤹💗⤸📰🌷🥢🪶
╰─✎⿻ ⤹-/𖦹 অ༏মি এমন একট༏ তুমি চ༏ই যে তুমি অ༏মি ছ༏ড়༏ অন্য কেউ নেই -ꜛ⤹!!💟🫧🌷

____💋

___۵🅜𝐑ܔ𝐉🅤𝐖🅤𝐋 𓆪❤️‍🩹🌷
﹌﹌﹌﹌﹌﹌﹌﹌﹌﹌`,

`╭───⤹⤸📰🌷🥢🪶
╰─✎⿻ ⤹তুমি ছাড়া আমাকে হাজার মানুষ সঙ্গ দিলেও,আমার মধ্যে তোমার শূন্যতা রয়েই যাবে  :)♡🥺🫰`,

`╭───⤹󰟱⤸🩷🪻🪽
╰─!!-তোমার༉ছবির জন্যই༉আমার ফোনের༉গ্যালারিতে༉লক দেওয়া༉নয়তো༉আমার ফোনে༉দামি কোনো জিনিস༉ছিলো না༉-!!⤹😌🌷🌻⤸`,

`. .  ܓ݂ܓ݂ܓ݂ܓ݂ܓ݂ܓ݂ ܓ݂ܓ݂ܓ݂ܓ݂ܓ݂ܓ݂

ㅤㅤㅤㅤㅤㅤ✧˖°👀😌🤍國⋆ ˚｡⋆୨F୧˚

𝄗 𐚁๋࣭£⭑乛এ𝆠፝֟মন এ𝆠፝֟কজ𝆠፝֟ন ম།𝆠፝֟নুষ হে།𝆠፝֟ক, য།𝆠፝֟র কা𝆠፝֟ছে শা𝆠፝֟ন্তি খুঁ།𝆠፝֟জে পা𝆠፝֟বো, অ།𝆠፝֟ভি𝆠፝֟নয় ন།𝆠፝֟য়— স།𝆠፝֟ত্যি𝆠፝֟কা𝆠፝֟রের ভা།𝆠፝֟লোবা𝆠፝֟সা পা𝆠፝֟বো⎯⎯⃝🙌🏻🐱🪽

•⎯⎯⃝🩵┼🎀┼

${SIGN}`,

`╭──⤹🩷🪻📰⤸🌷 
╰─ ⁽ 📃҆ ₎ 𖦹 হ།রিয়ে ফেল།র পর  অ།ফসে།স কর།র চেয়ে,থ།কতে যত্ন কর།ট། অনে'ক বে'শি দ།মীꜛː)♡༢😌🌸🕊️

           ━━━⃞⃟😽ꤪ𝐌⃞⃟𝆠፝֟𝐑༊𝐉⃞⃟𝆠፝֟𝐔𝐖𝐄⃞⃟𝆠፝֟𝐋🎀⃞⃟࿐`,

`𝆠꯭፝֟ ♡゙𝆠፝֟𝆠꯭፝֟〲𝆠፝֟༏ :❫🩷🪽

╰─➛ ⁽ 🥹҆ ₎ 𖦹 হ།রিয়ে ফেল།র পর  অ།ফসে།স কর།র চেয়ে,থ།কতে যত্ন কর།ট། অনে'ক বে'শি দ།মীꜛː)♡༢🙌🌷🌸

𝆠꯭፝֟ ♡゙𝆠፝֟𝆠꯭፝֟〲𝆠፝֟༏ :❫🩷🪽

${SIGN}`,

`✧     

          ˖    
Ꮗ শ𝆠፝֟⃞খে'র এক𝆠፝֟টা𝆠፝֟হহ্ মানু𝆠፝֟ষ𝆠፝֟'হহ আ𝆠፝֟মা𝆠፝֟⃞র'ও হো𝆠፝֟⃞ক, সে শুধু𝆠፝֟'হহ্ আ𝆠፝֟মি𝆠፝֟তে'ই আ𝆠፝֟স’ক্ত'𝆠፝֟হহ্ থা𝆠፝֟⃞কুক-:❫♡❤️‍🩹😌🫶 

${SIGN}`,

`Ꮗ "যতবারই তোমাকে দেখি, নতুন করে ভালোবেসে ফেলি✧˖°☁️🌷國⋆ ˚｡⋆`,

`Ꮗ "সুন্দর অসুন্দর বলতে কিছু নেই আমি তোমাকে ভালোবাসি মানে তোমার চেয়ে সুন্দর এই দুনিয়াতে আর কেউ নাইㅤ✧˖°☁️🌷國⋆ ˚｡⋆`,

`Ꮗ "আমি চাঁদ ও দেখেচি সূর্য ও দেখেছি শান্তি সুধু তুমাকে দেখারㅤㅤㅤ✧˖°☁️🌷國⋆ ˚｡⋆`
];

// ====== Caption UI ======
function buildBody(tag1, tag2, caption) {
  return (
`╔════════════════╗
    🫶 𝐁𝐅 🫂 𝐆𝐅 🎀
╚═════════════════╝

👤 ${tag1}  💞  ${tag2}
${caption ? `\n${caption}\n` : ""}
━━━━━━━━━━━━━━━━━━━
🪪 𝐂𝐫𝐞𝐝𝐢𝐭 ➤ ${CREDIT}
━━━━━━━━━━━━━━━━━━━`
  );
}

module.exports.run = async function ({ event, api }) {
  const axios = require("axios");
  const fs = require("fs-extra");
  const path = require("path");
  const { createCanvas, loadImage } = require("canvas");

  const { threadID, messageID, senderID, mentions, messageReply } = event;

  let targetID = null;
  if (mentions && Object.keys(mentions).length > 0) {
    targetID = Object.keys(mentions)[0];
  } else if (messageReply && messageReply.senderID) {
    targetID = messageReply.senderID;
  }

  if (!targetID) {
    return api.sendMessage(
      "⚠️ কাউকে মেনশন করো বা রিপ্লাই দাও!\n\nউদাহরণ: bf @乛 M𝆠፝֟R ཐི༏ཋྀ JU𝆠፝֟W𝆠፝֟ELꜛཐི༏ཋྀ࿐",
      threadID,
      messageID
    );
  }

  const cacheDir = path.join(__dirname, "cache");
  fs.ensureDirSync(cacheDir);
  const imgPath = path.join(cacheDir, `bf_${senderID}_${targetID}.png`);
  const templatePath = path.join(cacheDir, "bf_template.jpg");

  const getTemplate = async () => {
    if (!fs.existsSync(templatePath)) {
      try {
        const res = await axios.get(TEMPLATE_URL, {
          responseType: "arraybuffer",
          timeout: 30000,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
            "Referer": "https://imgur.com/"
          }
        });
        fs.writeFileSync(templatePath, Buffer.from(res.data));
      } catch (err) {
        throw new Error("TEMPLATE download failed: " + (err.response?.status || err.message));
      }
    }
    return loadImage(templatePath);
  };

  const getAvatar = async (uid) => {
    const url = `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=6628568379|c1e620fa708a1d5696fb991c1bde5662`;
    try {
      const res = await axios.get(url, { responseType: "arraybuffer", timeout: 20000 });
      return loadImage(Buffer.from(res.data));
    } catch (err) {
      throw new Error("AVATAR download failed: " + (err.response?.status || err.message));
    }
  };

  try {
    const [template, avatar1, avatar2] = await Promise.all([
      getTemplate(),
      getAvatar(senderID),
      getAvatar(targetID)
    ]);

    const W = template.width;
    const H = template.height;
    const sx = W / REF_W;
    const sy = H / REF_H;
    const sr = Math.min(sx, sy);

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(template, 0, 0, W, H);

    const drawAvatar = (img, c) => {
      const cx = c.x * sx;
      const cy = c.y * sy;
      const rx = c.rx * sx;
      const ry = c.ry * sy;
      const w = rx * 2;
      const h = ry * 2;
      // ছবি বিকৃত না করে ফ্রেম ভরাতে সেন্টার-ক্রপ
      const scale = Math.max(w / img.width, h / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
      ctx.restore();
    };

    drawAvatar(avatar1, LEFT);
    drawAvatar(avatar2, RIGHT);

    fs.writeFileSync(imgPath, canvas.toBuffer("image/png"));

    // both users' names for mention
    let senderName = "User";
    let targetName = "Friend";
    try {
      const info = await api.getUserInfo([senderID, targetID]);
      senderName = info[senderID]?.name || senderName;
      targetName = info[targetID]?.name || targetName;
    } catch (_) {}

    const tag1 = `@${senderName}`;
    const tag2 = `@${targetName}`;
    const caption = CAPTIONS.length
      ? CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)]
      : "";
    const body = buildBody(tag1, tag2, caption);

    return api.sendMessage(
      {
        body,
        mentions: [
          { tag: tag1, id: senderID },
          { tag: tag2, id: targetID }
        ],
        attachment: fs.createReadStream(imgPath)
      },
      threadID,
      () => fs.unlink(imgPath, () => {}),
      messageID
    );
  } catch (e) {
    console.log("BF CMD ERROR:", e.response?.status, e.message);
    return api.sendMessage(
      "Error: " + (e.response?.status || e.message),
      threadID,
      messageID
    );
  }
};
