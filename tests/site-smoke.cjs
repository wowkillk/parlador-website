const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../script.js','utf8');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
function run(config,now='2026-11-06T00:00:00Z') {
 const nodes=new Map();
 function element(id='') {return {id,hidden:['menu-panel','ticket-buy','telegram-join','ticket-categories'].includes(id), disabled:id.endsWith('unavailable'),children:[],attrs:{},events:{},textContent:'',classList:{add(){},remove(){},toggle(){}},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},addEventListener(k,f){this.events[k]=f},focus(){document.activeElement=this},append(...items){this.children.push(...items)},appendChild(c){this.children.push(c)},remove(){},querySelectorAll(q){return q==='.artist-card'?cards:links},getBoundingClientRect(){return {width:160}},scrollBy({left}){this.scrollLeft=Math.max(0,Math.min(this.scrollWidth-this.clientWidth,this.scrollLeft+left));this.events.scroll?.()},scrollLeft:0,clientWidth:332,scrollWidth:1192};}
 const links=Array.from({length:6},()=>{const e=element();e.getAttribute=()=> '#community';return e});
 const cards=Array.from({length:7},()=>element());
 const document={getElementById(id){if(!nodes.has(id))nodes.set(id,element(id));return nodes.get(id)},querySelector(q){return this.getElementById(q)},querySelectorAll(){return []},createElement(){return element()},body:element(),addEventListener(){}};
 const window={location:{hostname:"localhost",search:""},PARLADOR_CONFIG:config,matchMedia:()=>({matches:true,addEventListener(){}}),addEventListener(){},setInterval(){},getComputedStyle:()=>({columnGap:'12'})};
 class Clock extends Date {static now(){return Date.parse(now)}}
 const context=vm.createContext({window,document,URL,URLSearchParams,Intl,performance:{now:()=>0},Date:Clock});
 vm.runInContext(fs.readFileSync(__dirname+"/../site-config.js","utf8"),context);
 vm.runInContext(fs.readFileSync(__dirname+"/../ticket-pricing.js","utf8"),context);
 vm.runInContext(source,context);
 return {get:id=>document.getElementById(id),nodes};
}
let r=run({});
r.get('.menu-toggle').events.click();assert.equal(r.get('menu-panel').hidden,false);
r.get('.menu-toggle').events.click();assert.equal(r.get('menu-panel').hidden,true);
assert.ok(r.get('artists-position').textContent.endsWith('/ 07'));
r.get('artists-next').events.click();assert.ok(r.get('artist-list').scrollLeft>0);
assert.equal(r.get('telegram-join').hidden,true);
assert.equal(r.get('ticket-buy').hidden,true);
for(const [now,label] of [['2026-12-19T20:00:00Z','THE NIGHT IS ON / MOSCOW TIME'],['2026-12-20T04:00:00Z','SESSION COMPLETE / MOSCOW TIME']]) {
r=run({},now);assert.equal(r.get('countdown-label').textContent,label);}
console.log('PASS: full scripts, menu, seven-card scroll, event timer, disabled ticket and Telegram links');
