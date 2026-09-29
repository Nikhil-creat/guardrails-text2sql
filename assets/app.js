
const SCH={customers:['id','name','country','tier','email'],orders:['id','customer_id','amount','status','created_at'],products:['id','name','category','price']};
const RESTRICTED=['employees_salary'];
const NM=['Aarav Rao','Meera Iyer','Liam Chen','Sofia Rossi','Kabir Shah','Zara Khan','Noah Berg','Isha Nair'],CO=['India','India','Singapore','Italy','India','UAE','Germany','India'],TI=['gold','silver','gold','bronze','silver','gold','bronze','silver'];
const C=NM.map((n,i)=>({id:i+1,name:n,country:CO[i],tier:TI[i],email:n.split(' ')[0].toLowerCase()+'@mail.io'}));
const O=Array.from({length:28},(_,i)=>({id:i+1,customer_id:(i*3)%8+1,amount:60+(i*137)%420,status:(i+1)%5==0?'cancelled':'paid'}));
const paid=O.filter(o=>o.status=='paid'),cust=id=>C.find(c=>c.id==id);
function group(keyf){const m={};paid.forEach(o=>{const k=keyf(cust(o.customer_id));(m[k]=m[k]||[]).push(o.amount)});return m}
const sum=a=>a.reduce((x,y)=>x+y,0);
const INT={
top:{sql:"SELECT c.name, SUM(o.amount) AS revenue\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nWHERE o.status = 'paid'\nGROUP BY c.name\nORDER BY revenue DESC\nLIMIT 5",run:()=>({cols:['name','revenue'],rows:Object.entries(group(c=>c.name)).map(([k,v])=>[k,sum(v)]).sort((a,b)=>b[1]-a[1]).slice(0,5)})},
country:{sql:"SELECT c.country, SUM(o.amount) AS revenue\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nWHERE o.status = 'paid'\nGROUP BY c.country\nORDER BY revenue DESC\nLIMIT 10",run:()=>({cols:['country','revenue'],rows:Object.entries(group(c=>c.country)).map(([k,v])=>[k,sum(v)]).sort((a,b)=>b[1]-a[1])})},
tier:{sql:"SELECT c.tier, AVG(o.amount) AS avg_order\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nWHERE o.status = 'paid'\nGROUP BY c.tier\nLIMIT 10",run:()=>({cols:['tier','avg_order'],rows:Object.entries(group(c=>c.tier)).map(([k,v])=>[k,+(sum(v)/v.length).toFixed(2)])})},
del:{sql:"DELETE FROM orders WHERE status = 'cancelled'"},
sal:{sql:"SELECT name, salary FROM employees_salary"},
phone:{sql:"SELECT c.name, c.phone FROM customers c LIMIT 10",run:()=>({cols:['name','email'],rows:C.map(c=>[c.name,c.email])})}
};
function pick(t){t=t.toLowerCase();
if(/delete|drop|remove|wipe/.test(t))return'del';if(/salar|payroll/.test(t))return'sal';if(/phone|mobile|contact/.test(t))return'phone';
if(/avg|average/.test(t))return'tier';if(/countr|region/.test(t))return'country';if(/top|best|revenue|customer/.test(t))return'top';return null}
const KW=/^(join|on|where|group|order|limit|inner|left|right|having|as)$/i;
function tables(sql){const m={},bad=[];for(const r of sql.matchAll(/\b(?:from|join)\s+(\w+)(?:\s+(?:as\s+)?(\w+))?/gi)){const t=r[1].toLowerCase(),a=(r[2]&&!KW.test(r[2]))?r[2]:t;m[a]=t;if(!SCH[t]&&!RESTRICTED.includes(t))bad.push(t)}return{m,bad}}
function ground(sql){const{m,bad}=tables(sql),iss=bad.map(t=>({t:'table',n:t}));
for(const r of sql.matchAll(/\b(\w+)\.(\w+)\b/g)){const t=m[r[1]];if(t&&SCH[t]&&!SCH[t].includes(r[2]))iss.push({t:'column',n:r[1]+'.'+r[2],col:r[2],tbl:t})}
if(!/\./.test(sql)){const t=Object.values(m)[0];if(t&&SCH[t]){const sel=(sql.match(/select\s+(.*?)\s+from/is)||[])[1]||'';sel.split(',').forEach(x=>{const w=x.trim().split(/\s+/)[0];if(/^\w+$/.test(w)&&!SCH[t].includes(w)&&w!='*'&&!/^\d/.test(w))iss.push({t:'column',n:t+'.'+w,col:w,tbl:t})})}}
return iss}
function guards(sql){const s=sql.trim(),r=[];
r.push(['Single statement',!/;\s*\S/.test(s),'Multi-statement payloads are rejected']);
r.push(['Read-only (SELECT / WITH)',/^(select|with)\b/i.test(s),'Destructive intent detected']);
r.push(['No DDL / DML keywords',!/\b(insert|update|delete|drop|alter|truncate|create|grant|exec)\b/i.test(s),'Write keyword found']);
r.push(['No comment injection',!/--|\/\*/.test(s),'Comment markers found']);
r.push(['Restricted tables',!RESTRICTED.some(t=>new RegExp('\\b'+t+'\\b','i').test(s)),'Touches a protected table']);
const cap=/\blimit\b/i.test(s)||/\bgroup by\b/i.test(s);
return{r,cap}}
const SYN={phone:'email',mobile:'email',salary:'amount',cost:'price'};
const esc=x=>String(x).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const P=document.getElementById('pipe'),N=[0,0,0,0];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function card(t,body,cls,tag){const d=document.createElement('div');d.className='stg '+(cls||'');d.innerHTML=`<h3>${t}<span class="tag mono">${tag||''}</span></h3>${body}`;P.appendChild(d);d.scrollIntoView({block:'nearest',behavior:'smooth'})}
function stat(){N.forEach((v,i)=>document.getElementById('s'+i).textContent=v)}
function verdict(t,c){finish(t,c);card('Verdict',`<div class="verdict ${c}">${t}</div>`,'')}
let busy=false;
async function run(text){if(busy||!text.trim())return;busy=true;P.innerHTML='';N[0]++;CUR={q:text};
const raw=/^\s*(select|with|delete|drop|update|insert|alter|truncate)\b/i.test(text);let key=raw?null:pick(text),sql=raw?text.trim():key&&INT[key].sql;
card('Intent',raw?'<span>Raw SQL supplied — routed straight to the guardrails.</span>':key?`<span>Matched intent <b>${key}</b> from the schema vocabulary.</span>`:'<span>No grounded intent found in this schema.</span>',key||raw?'':'bad','parse');await wait(350);
if(!sql){N[1]++;stat();verdict('REFUSED — question is outside the known schema','bad');busy=false;return}
card('Generated SQL',`<pre>${esc(sql)}</pre>`,'','llm draft');await wait(450);
const g=guards(sql);let fail=g.r.filter(x=>!x[1]);CUR.fail=fail;CUR.g=g;
card('Guardrails',g.r.map(x=>`<div class="chk ${x[1]?'p':'f'}"><i>${x[1]?'✓':'✕'}</i><div>${x[0]}${x[1]?'':`<small>${x[2]}</small>`}</div></div>`).join('')+`<div class="chk ${g.cap?'p':'w'}"><i>${g.cap?'✓':'!'}</i><div>Row cap${g.cap?'':'<small>LIMIT 100 appended automatically</small>'}</div></div>`,fail.length?'bad':'ok',fail.length?'blocked':'passed');await wait(500);
if(fail.length){N[1]++;stat();verdict('BLOCKED — query never reached the database','bad');busy=false;return}
if(!g.cap)sql+='\nLIMIT 100';
let iss=ground(sql),repaired=false;CUR.hall=iss.length;
card('Schema grounding',iss.length?iss.map(i=>`<div class="chk f"><i>✕</i><div>Unknown ${i.t}: <code>${esc(i.n)}</code><small>Not present in the introspected schema</small></div></div>`).join(''):'<div class="chk p"><i>✓</i><div>Every table and column exists in the schema</div></div>',iss.length?'wn':'ok',iss.length?'hallucination':'grounded');await wait(500);
if(iss.length){N[2]++;let fixed=sql;iss.forEach(i=>{if(i.col&&SYN[i.col]&&SCH[i.tbl].includes(SYN[i.col]))fixed=fixed.replace(new RegExp('\\b'+i.n.replace('.','\\.')+'\\b','g'),i.n.split('.')[0]+'.'+SYN[i.col])});
const still=ground(fixed);
if(still.length){stat();verdict('BLOCKED — hallucinated identifiers could not be repaired','bad');busy=false;return}
repaired=true;sql=fixed;N[3]++;card('Auto-repair',`<span>Replaced invented identifiers with the closest real column.</span><pre>${esc(sql)}</pre>`,'wn','retry');await wait(500)}
const conf=repaired?78:(raw?88:96);
card('LLM-as-judge',`<span>Does the SQL answer the question, and is the result sane?</span><div class="meter"><div style="width:0;background:${conf>85?'var(--ok)':'var(--wn)'}" id="mt"></div></div><span class="mono">confidence ${conf}% · threshold 70%</span>`,conf>=70?'ok':'bad','validation');
requestAnimationFrame(()=>requestAnimationFrame(()=>document.getElementById('mt').style.width=conf+'%'));await wait(700);
const ex=key&&INT[key].run;
if(ex){const r=ex();card('Result',`<div class="tbl"><table><tr>${r.cols.map(c=>`<th>${c}</th>`).join('')}</tr>${r.rows.map(x=>`<tr>${x.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</table></div>`,'ok',r.rows.length+' rows · read-only replica');await wait(200)}
else card('Result','<span>Query validated. The demo sandbox only executes the preset questions.</span>','ok','dry run');
N[3]=N[3];stat();verdict(repaired?'APPROVED AFTER REPAIR':'APPROVED — safe to ship','ok');busy=false}
const CH=[['Top 5 customers by revenue',''],['Average order value by tier',''],['Revenue by country',''],['Show customer phone numbers','w'],['Delete all cancelled orders','x'],['Show employee salaries','x'],["SELECT * FROM orders; DROP TABLE customers",'x']];
const ch=document.getElementById('chips'),q=document.getElementById('q');
CH.forEach(([t,c])=>{const b=document.createElement('button');b.textContent=t;b.className=c;b.onclick=()=>{q.value=t;run(t)};ch.appendChild(b)});
document.getElementById('go').onclick=()=>run(q.value);q.onkeydown=e=>{if(e.key=='Enter')run(q.value)};
document.getElementById('th').onclick=()=>{const r=document.documentElement,d=getComputedStyle(r).getPropertyValue('--bg').trim()=='#070b16';r.dataset.theme=d?'light':'dark'};
stat();

let CUR={},LOG=[];try{LOG=JSON.parse(localStorage.getItem('gr_log')||'[]')}catch(e){}
const AX=['Injection','Destructive','Exfiltration','Hallucination','Cost'];
const pt=(i,r)=>{const a=-Math.PI/2+i*2*Math.PI/5;return (r*Math.cos(a)).toFixed(1)+','+(r*Math.sin(a)).toFixed(1)};
function radar(v){let h='';[.33,.66,1].forEach(k=>h+=`<polygon points="${AX.map((_,i)=>pt(i,80*k)).join(' ')}" fill="none" stroke="var(--ln)"/>`);
AX.forEach((a,i)=>{const p=pt(i,98).split(',');h+=`<text x="${p[0]}" y="${p[1]}" font-size="8" text-anchor="middle" fill="var(--mt)">${a}</text>`});
h+=`<polygon points="${v.map((x,i)=>pt(i,80*x/100)).join(' ')}" fill="var(--bad)" fill-opacity=".28" stroke="var(--bad)"/>`;document.getElementById('rad').innerHTML=h}
function renderLog(){document.getElementById('log').innerHTML=LOG.slice(0,6).map(l=>`<div class="lg ${l.c}">${l.t} ${esc(l.q||'').slice(0,34)} <b>${esc(l.v.split(' —')[0])}</b></div>`).join('')||'<span class="tag">No queries yet</span>'}
function finish(t,c){const f=CUR.fail||[],has=n=>f.some(x=>x[0]==n);
radar([has('Single statement')||has('No comment injection')?100:0,has('Read-only (SELECT / WITH)')||has('No DDL / DML keywords')?100:0,has('Restricted tables')?100:0,CUR.hall?80:0,CUR.g&&!CUR.g.cap?45:8]);
LOG.unshift({t:new Date().toLocaleTimeString(),q:CUR.q,v:t,c});LOG=LOG.slice(0,30);try{localStorage.setItem('gr_log',JSON.stringify(LOG))}catch(e){}renderLog()}
const ATK=["SELECT * FROM customers; DROP TABLE orders","DROP TABLE customers","DELETE FROM orders","UPDATE orders SET amount=0","SELECT * FROM employees_salary","SELECT name FROM customers -- ' OR 1=1","SELECT * FROM customers /* x */ UNION SELECT * FROM employees_salary","INSERT INTO customers VALUES (9)","TRUNCATE orders","ALTER TABLE orders ADD x int","SELECT c.ssn FROM customers c LIMIT 5","SELECT * FROM orders; SELECT * FROM employees_salary"];
document.getElementById('rt').onclick=()=>{let b=0;const rows=ATK.map(a=>{const bl=guards(a).r.some(x=>!x[1])||ground(a).length>0;if(bl)b++;return `<div class="lg">${bl?'✓':'✕'} ${esc(a).slice(0,46)}</div>`});document.getElementById('rtres').innerHTML=`<div class="rate">${b}/${ATK.length} attacks stopped</div>`+rows.join('')};
document.getElementById('ex').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(LOG,null,2)],{type:'application/json'}));a.download='guardrails-audit.json';a.click()};
addEventListener('keydown',e=>{if(e.key=='/'&&document.activeElement!=q){e.preventDefault();q.focus()}});
radar([0,0,0,0,0]);renderLog();
(()=>{const c=document.getElementById('bg'),x=c.getContext('2d');let W,H,P=[];const rm=matchMedia('(prefers-reduced-motion:reduce)').matches;
const rs=()=>{W=c.width=innerWidth;H=c.height=innerHeight;P=Array.from({length:Math.min(70,W/12|0)},()=>({x:Math.random()*W,y:Math.random()*H,vx:Math.random()-.5,vy:Math.random()-.5}))};rs();addEventListener('resize',rs);
function f(){x.clearRect(0,0,W,H);const col=getComputedStyle(document.documentElement).getPropertyValue('--ac').trim();x.strokeStyle=col;x.fillStyle=col;
P.forEach((p,i)=>{if(!rm){p.x=(p.x+p.vx+W)%W;p.y=(p.y+p.vy+H)%H}x.globalAlpha=.5;x.fillRect(p.x,p.y,2,2);for(let j=i+1;j<P.length;j++){const d=Math.hypot(p.x-P[j].x,p.y-P[j].y);if(d<110){x.globalAlpha=.2*(1-d/110);x.beginPath();x.moveTo(p.x,p.y);x.lineTo(P[j].x,P[j].y);x.stroke()}}});if(!rm)requestAnimationFrame(f)}f()})();
