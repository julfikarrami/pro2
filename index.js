const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const fs = require('fs');
const axios = require('axios');
const cron = require('node-cron');

const ADMIN = "8801410508042@c.us";
let GROUP = "";

const client = new Client({
    authStrategy:new LocalAuth({dataPath:'./session'}),
    puppeteer:{
        headless:true,
        executablePath:process.env.PUPPETEER_EXECUTABLE_PATH,
        args:['--no-sandbox','--disable-setuid-sandbox']
    }
});

// QR IMAGE LINK
client.on('qr', async qr=>{
    console.log("QR RECEIVED — open link:");
    const url = await QRCode.toDataURL(qr);
    console.log(url);
});

client.on('ready',()=>console.log("🟢 BOT ONLINE"));


// গ্রুপ আইডি অটো ধরবে
client.on('message', async msg=>{
if(!GROUP && msg.from.includes("@g.us")){
GROUP = msg.from;
console.log("GROUP ID:",GROUP);
}

// admin only report
if(msg.from!==ADMIN) return;
if(!msg.body.startsWith("/add")) return;

let l=msg.body.split("\n");
let name=l[1].split(":")[1].trim();

let prayers=[
["ফজর",l[2].includes("yes")],
["যোহর",l[3].includes("yes")],
["আসর",l[4].includes("yes")],
["মাগরিব",l[5].includes("yes")],
["এশা",l[6].includes("yes")]
];

let today=prayers.filter(p=>p[1]).length*10;
let db={};
if(fs.existsSync("data.json")) db=JSON.parse(fs.readFileSync("data.json"));
if(!db[name])db[name]=0;
db[name]+=today;
fs.writeFileSync("data.json",JSON.stringify(db,null,2));

let miss=prayers.filter(p=>!p[1]).map(p=>p[0]).join(", ");

await msg.reply(`🕌 রিপোর্ট
👤 ${name}
⭐ আজ: ${today}
📊 মোট: ${db[name]}`);

if(miss.length>0)
client.sendMessage(GROUP,`⚠️ ${name} আজ ${miss} নামাজ পড়েনি`);
});


// ---- নামাজ সময় Rajshahi ----
async function schedule(){
let r=await axios.get("https://api.aladhan.com/v1/timingsByCity?city=Rajshahi&country=Bangladesh&method=1");
let t=r.data.data.timings;

function set(time,text){
let [h,m]=time.split(":");
cron.schedule(`${m} ${h} * * *`,()=>client.sendMessage(GROUP,text));
}

set(t.Fajr,"⏰ ফজরের সময় হয়েছে\nনিয়ত: আমি আল্লাহর সন্তুষ্টির জন্য ফজরের নামাজ আদায় করছি");
set(t.Dhuhr,"🕌 যোহরের সময় হয়েছে");
set(t.Asr,"🕌 আসরের সময় হয়েছে");

set(t.Maghrib,`🌙 ইফতারের সময় হয়েছে
নিয়ত: আমি আল্লাহর সন্তুষ্টির জন্য রোজা ভঙ্গ করছি`);

set(t.Isha,"🕌 এশার সময় হয়েছে");

// সেহরি শেষ এলার্ট
let [h,m]=t.Fajr.split(":");
m=parseInt(m)-10;
cron.schedule(`${m} ${h} * * *`,()=>client.sendMessage(GROUP,"⚠️ সেহরির শেষ সময় ১০ মিনিট বাকি!"));
}

setTimeout(schedule,15000);
client.initialize();
