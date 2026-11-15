const themes = {
  standard: ['山間夜航', '日常主題', '#26373e', '#96b9c2'],
  halloween: ['南瓜夜遊', '萬聖節', '#2f1943', '#fba25a'],
  christmas: ['雪夜聖誕', '聖誕節', '#173f40', '#c7eee0'],
  newyear: ['煙火迎新', '元旦', '#171b44', '#cfb8ff'],
  lunar: ['燈火迎春', '農曆新年', '#551c29', '#ffc16b'],
  birthday: ['生日快樂', '生日', '#4a2d51', '#ffc2d9']
};
const tz = 'Asia/Taipei';
const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
const save = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
const get = id => document.getElementById(id);
const timeFormat = new Intl.DateTimeFormat('zh-TW', {timeZone:tz,hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const dayFormat = new Intl.DateTimeFormat('zh-TW', {timeZone:tz,year:'numeric',month:'numeric',day:'numeric'});
const weekFormat = new Intl.DateTimeFormat('zh-TW', {timeZone:tz,weekday:'short'});
const lunarFormat = new Intl.DateTimeFormat('en-u-ca-chinese', {timeZone:tz,month:'numeric',day:'numeric'});
const dayMs = 86400000;
const modes = {auto:'自動',standard:'日常',halloween:'萬聖節',christmas:'聖誕節',newyear:'元旦',lunar:'農曆新年',birthday:'生日'};
let selection = read('theme') || 'auto';
if (!Object.hasOwn(modes, selection)) selection = 'auto';
let birthday = read('birthday') || '';
get('birthday').value = birthday;

function dayInTaiwan(now) {
  const parts = Object.fromEntries(dayFormat.formatToParts(now).map(({type,value}) => [type,value]));
  return Date.UTC(+parts.year,+parts.month-1,+parts.day);
}
function holidays(year) {
  const dates = [
    ['newyear',Date.UTC(year,0,1),3,1],
    ['halloween',Date.UTC(year,9,31),4,0],
    ['christmas',Date.UTC(year,11,25),7,1]
  ];
  // Taiwan's official 2027 calendar lists February 6. Some ICU versions report February 7.
  if (year === 2027) dates.push(['lunar',Date.UTC(2027,1,6),3,5]);
  for(let day = Date.UTC(year,0,20); year !== 2027 && day <= Date.UTC(year,1,22); day += dayMs) {
    const parts = lunarFormat.formatToParts(day);
    if(parts.find(p=>p.type==='month')?.value==='1' && parts.find(p=>p.type==='day')?.value==='1') {
      dates.push(['lunar',day,3,5]);
      break;
    }
  }
  if (birthday) {
    const [,month,day] = birthday.split('-').map(Number);
    const lastDay = new Date(Date.UTC(year,month,0)).getUTCDate();
    dates.push(['birthday',Date.UTC(year,month-1,Math.min(lastDay,day)),0,0]);
  }
  return dates;
}
function calendar(now) {
  const today = dayInTaiwan(now);
  const year = new Date(today).getUTCFullYear();
  const dates = [year-1,year,year+1].flatMap(holidays).sort((a,b)=>a[1]-b[1]);
  const active = dates.find(([key,date])=>key==='birthday' && date===today)
    || dates.find(([key,date,before,after])=>today>=date-before*dayMs && today<=date+after*dayMs);
  return {today, theme:active?.[0] || 'standard', next:dates.find(([,date])=>date>=today)};
}
let renderedTheme;
function render() {
  const now = new Date();
  const {today, theme, next} = calendar(now);
  const key = selection === 'auto' ? theme : selection;
  const [title,label,base] = themes[key];
  get('date').textContent = dayFormat.format(now);
  get('clock').textContent = timeFormat.format(now);
  get('weekday').textContent = weekFormat.format(now);
  get('title').textContent = title;
  get('subtitle').textContent = label;
  get('mode').textContent = selection === 'auto' ? '依台灣日期切換' : '手動預覽';
  get('upcoming').textContent = themes[next[0]][1];
  const days = (next[1]-today)/dayMs;
  get('remaining').textContent = days ? '距離下個節日還有 '+days+' 天' : '就在今天';
  get('hero').style.setProperty('--scene',base);
  for(const button of get('themes').children) button.setAttribute('aria-pressed',String(button.value===selection));
  if(renderedTheme !== key) {
    renderedTheme = key;
    draw(key);
  }
}
for(const [value,label] of Object.entries(modes)) {
  const button = document.createElement('button');
  button.className = 'theme';
  button.value = value;
  button.textContent = label;
  button.addEventListener('click',()=>{selection=value;save('theme',value);render();});
  get('themes').append(button);
}
get('birthday').addEventListener('change',event=>{birthday=event.target.value;save('birthday',birthday);render();});
get('preview').addEventListener('click',event=>{
  const active=get('app').classList.toggle('wide');
  event.currentTarget.setAttribute('aria-pressed',active);
  event.currentTarget.textContent=active?'返回手機版':'車機預覽';
});
function draw(key) {
  const canvas=get('art'), {width,height}=canvas.getBoundingClientRect();
  if(!width || !height) return;
  const scale=Math.min(devicePixelRatio || 1,2);
  canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
  const ctx=canvas.getContext('2d');
  ctx.scale(canvas.width/width,canvas.height/height);
  const [, ,base,accent]=themes[key];
  const sky=ctx.createLinearGradient(0,0,width,height);
  sky.addColorStop(0,'#10191f');sky.addColorStop(1,base);
  ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
  const mobile=width<600;
  const x=width*(mobile?.66:.76), y=height*(mobile?.71:.55);
  const unit=Math.min(width/4.1,height/3.2);
  function ellipse(x,y,rx,ry,color) {
    ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
  }
  function polygon(points,color) {
    ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
    ctx.closePath();ctx.fillStyle=color;ctx.fill();
  }
  for(let i=0;i<85;i++) {
    const sx=(i*139.713%width), sy=(i*73.91%height);
    ellipse(sx,sy,i%5===0?2:1,i%5===0?2:1,i%3===0?accent+'88':'#ffffff40');
  }
  ctx.save();ctx.translate(x,y);ctx.scale(unit,unit);
  const glow=ctx.createRadialGradient(0,0,0,0,0,1.7);
  glow.addColorStop(0,accent+'50');glow.addColorStop(1,accent+'00');
  ellipse(0,0,1.7,1.7,glow);
  if(key==='standard') {
    ellipse(.35,-.47,.4,.4,'#c4ded6');
    polygon([[-3,.95],[-1.1,-.12],[-.52,.27],[.14,-.42],[1.9,.83],[2,.95]],'#497078');
    polygon([[-3,1.13],[-.85,.17],[-.13,.64],[.6,.01],[1.9,.77],[2,1.3]],'#25454e');
    polygon([[-1,1.9],[.31,.69],[.43,.69],[.94,1.9]],'#a4c1b662');
  } else if(key==='halloween') {
    function pumpkin(px,py,s) {
      ctx.save();ctx.translate(px,py);ctx.scale(s,s);
      polygon([[-.1,-.39],[-.1,-.65],[.09,-.74],[.16,-.39]],'#83a96a');
      ellipse(-.29,0,.37,.42,'#c9602f');ellipse(.29,0,.37,.42,'#e57a37');ellipse(0,0,.38,.45,'#f7a047');
      polygon([[-.34,-.07],[-.2,-.26],[-.06,-.04]],'#412034');
      polygon([[.06,-.04],[.2,-.26],[.34,-.07]],'#412034');
      polygon([[-.32,.11],[-.12,.18],[0,.12],[.13,.18],[.32,.11],[.16,.3],[-.16,.3]],'#412034');ctx.restore();
    }
    ellipse(0,.41,1,.12,'#160f25');pumpkin(.48,.13,.69);pumpkin(-.19,0,1.12);
    polygon([[.6,-.63],[.36,-.74],[.43,-.49],[.63,-.55],[.83,-.5],[.91,-.74],[.7,-.63]],'#c4a3d1');
  } else if(key==='christmas') {
    ellipse(0,.74,1.2,.12,'#a7d6c0');
    polygon([[-.1,.57],[-.1,.79],[.1,.79],[.1,.57]],'#884e35');
    for(let i=0;i<3;i++) {
      const offset=i*.3;
      polygon([[0,-.9+offset],[-.38-i*.13,-.18+offset],[.38+i*.13,-.18+offset]],['#86c5aa','#4f9d87','#428170'][i]);
    }
    polygon([[0,-1.03],[.048,-.89],[.19,-.89],[.075,-.8],[.12,-.65],[0,-.74],[-.12,-.65],[-.075,-.8],[-.19,-.89],[-.048,-.89]],'#ffd590');
    for(const [ox,oy] of [[-.18,-.27],[.19,-.13],[-.32,.12],[.05,.34],[.39,.32]]) ellipse(ox,oy,.052,.052,'#ffc98b');
  } else if(key==='newyear') {
    for(const [px,py,r,color] of [[-.29,-.2,.74,'#f9bb88'],[.48,-.53,.47,'#d4b3ff'],[.52,.39,.43,'#a0e7ef']]) {
      for(let i=0;i<20;i++){
        const a=i*Math.PI/10, length=r*(.75+i%4*.08);
        ctx.beginPath();ctx.moveTo(px+Math.cos(a)*r*.2,py+Math.sin(a)*r*.2);
        ctx.lineTo(px+Math.cos(a)*length,py+Math.sin(a)*length);
        ctx.strokeStyle=color;ctx.lineWidth=.022;ctx.lineCap='round';ctx.stroke();
        ellipse(px+Math.cos(a)*(length+.085),py+Math.sin(a)*(length+.085),.017,.017,color);
      }
    }
  } else if(key==='lunar') {
    for(const [px,py,s] of [[-.28,-.18,1.08],[.56,.17,.76]]) {
      ctx.save();ctx.translate(px,py);ctx.scale(s,s);
      ctx.fillStyle='#ffc16b';ctx.fillRect(-.013,-3,.026,3.85);
      ellipse(0,0,.36,.41,'#e65753');ellipse(0,0,.24,.41,'#f77b59');ellipse(0,0,.10,.41,'#fe9867');
      ctx.fillStyle='#ffd294';ctx.fillRect(-.17,-.44,.34,.07);ctx.fillRect(-.18,.37,.36,.08);
      for(let j=-2;j<=2;j++) ctx.fillRect(j*.044,.57,.02,.17);
      ctx.restore();
    }
  } else {
    ellipse(0,.6,.88,.115,'#eaa7ce');
    ctx.fillStyle='#ed9aba';ctx.fillRect(-.62,.02,1.24,.54);
    ellipse(0,.55,.62,.12,'#ed9aba');ellipse(0,.02,.62,.15,'#ffe3e9');
    for(let i=0;i<6;i++) ellipse(-.49+i*.195,.2,.065,.09,'#ffe3e9');
    for(const px of [-.29,0,.29]) {
      ctx.fillStyle='#a5dcd3';ctx.fillRect(px-.032,-.34,.064,.36);
      ellipse(px,-.42,.046,.092,'#ffd28c');
    }
  }
  ctx.restore();
}
new ResizeObserver(()=>{if(renderedTheme) draw(renderedTheme);}).observe(get('hero'));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
render();
setInterval(render,15000);
if('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
