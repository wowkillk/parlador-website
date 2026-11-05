const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'); const vm=require('node:vm');const path=require('node:path');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'ticket-pricing.js'),'utf8');
function setup(time, {url=null,hostname='example.github.io',search=''}={}) {
 let clock=Date.parse(time), elapsed=0;const events={},intervals=[],nodes=new Map();
 function node(){return {hidden:true,textContent:'',children:[],attrs:{},classList:{toggle(){},add(){}},append(...items){this.children.push(...items)},appendChild(item){this.children.push(item)},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]}}}
 const document={getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},createElement:node,addEventListener(k,f){events[k]=f}};
 class Clock extends Date{static now(){return clock}}
 const window={location:{hostname,search},setInterval(f){intervals.push(f)},addEventListener(k,f){events[k]=f}};
 const context=vm.createContext({window,document,Date:Clock,Intl,URL,URLSearchParams,performance:{now:()=>elapsed}});
 vm.runInContext(fs.readFileSync(path.join(root,'site-config.js'),'utf8'),context);vm.runInContext(source,context);
 const config={...window.PARLADOR_CONFIG.tickets,platformUrl:url};
 window.PARLADOR_TICKETING.mount(config);
 return {api:window.PARLADOR_TICKETING,config,get:document.getElementById,events,advance(time){clock=Date.parse(time);intervals.forEach(f=>f())},tick(ms){elapsed+=ms;intervals.forEach(f=>f())}};
}
test('all five stages: millisecond before, exact start, last millisecond and end',()=>{
 const r=setup('2026-11-01T00:00:00Z'); const stages=r.config.stages;
 stages.forEach((s,i)=>{
  const start=Date.parse(s.start),end=Date.parse(s.end);
  assert.equal(r.api.stateAt(stages,start).index,i);assert.equal(r.api.stateAt(stages,end-1).index,i);
  assert.equal(r.api.stateAt(stages,start-1).index,i===0?-1:i-1);
  assert.equal(r.api.stateAt(stages,end).index,i===4?-1:i+1);
 });
 assert.equal(r.api.stateAt(stages,Date.parse(stages[0].start)-1).kind,'before');
 assert.equal(r.api.stateAt(stages,Date.parse(stages[4].end)).kind,'after');
});
test('open page changes through all stages and clears price at event end',()=>{
 const r=setup('2026-11-20T20:59:59Z');
 assert.equal(r.get('ticket-status').textContent,'COMING SOON');
 const expected=[1700,1900,2300,2500,2700];
 r.config.stages.forEach((s,i)=>{r.advance(s.start);assert.equal(r.get('ticket-price').textContent.replace(/\D/g,''),String(expected[i]));assert.equal(r.get('ticket-buy').hidden,true)});
 assert.match(r.get('ticket-status').textContent,/НА ВХОДЕ/);assert.match(r.get('ticket-message').textContent,/свободных мест/);
 r.advance('2026-12-20T06:00:00+03:00');assert.equal(r.get('ticket-price').hidden,true);assert.equal(r.get('ticket-price').textContent,'');assert.equal(r.get('ticket-status').textContent,'SALES STATUS TO BE ANNOUNCED');
});
test('checkout requires HTTPS, active online stage; never enabled for door, before or after',()=>{
 for(const url of [null,'javascript:alert(1)','http://example.org','https://user:pass@example.org']){const r=setup('2026-11-21T00:00:00+03:00',{url});assert.equal(r.get('ticket-buy').hidden,true)}
 const r=setup('2026-11-20T00:00:00+03:00',{url:'https://tickets.example.org/event'});assert.equal(r.get('ticket-buy').hidden,true);
 r.advance('2026-11-21T00:00:00+03:00');assert.equal(r.get('ticket-buy').hidden,false);
 r.advance('2026-12-19T00:00:00+03:00');assert.equal(r.get('ticket-buy').hidden,true);
 r.advance('2026-12-20T06:00:00+03:00');assert.equal(r.get('ticket-buy').hidden,true);
});
test('local simulation advances, disables checkout, and is ignored on public hosts',()=>{
 const opts={hostname:'localhost',search:'?ticketPreview=2026-11-27T23:59:59%2B03:00',url:'https://tickets.example.org/event'};
 const r=setup('2026-11-06T00:00:00Z',opts);assert.equal(r.get('ticket-preview').hidden,false);assert.match(r.get('ticket-price').textContent,/700/);assert.equal(r.get('ticket-buy').hidden,true);
 r.tick(1000);assert.match(r.get('ticket-price').textContent,/900/);
 const live=setup('2026-11-06T00:00:00Z',{...opts,hostname:'example.github.io'});assert.equal(live.get('ticket-status').textContent,'COMING SOON');assert.equal(live.get('ticket-preview').hidden,true);
});
test('resume and focus refresh a stale page',()=>{
 const r=setup('2026-11-21T00:00:00+03:00');assert.equal(typeof r.events.visibilitychange,'function');assert.equal(typeof r.events.pageshow,'function');assert.equal(typeof r.events.focus,'function');
 r.events.visibilitychange();r.events.pageshow();r.events.focus();
 assert.equal(r.get('price-stages').children.length,5);
});


test('all five display labels, compact dates and prices match the approved copy',()=>{
 const r=setup('2026-11-01T00:00:00Z');
 const labels=['1 НЕДЕЛЯ','2 НЕДЕЛЯ','3 НЕДЕЛЯ','4 НЕДЕЛЯ','НА ВХОДЕ'];
 const dates=['21–27 ноября','28 ноября – 4 декабря','5–11 декабря','12–18 декабря','19 декабря'];
 const prices=[1700,1900,2300,2500,2700];
 const rows=r.get('price-stages').children;
 rows.forEach((row,i)=>{
  assert.equal(row.children[0].textContent,labels[i]);
  assert.equal(row.children[1].textContent.replace(/\D/g,''),String(prices[i]));
  assert.equal(row.children[2].textContent,dates[i]);
 });
 function assertCompactDates(){
  for(const id of ['ticket-period','ticket-next']) assert.doesNotMatch(r.get(id).textContent,/2026|\d{1,2}:\d{2}|МСК|MSK|Europe\/Moscow/);
 }
 assertCompactDates();
 r.config.stages.forEach((stage,i)=>{
  r.advance(stage.start);
  assert.equal(r.get('ticket-status').textContent,i===4?'НА ВХОДЕ':`АНОНСИРОВАННАЯ ЦЕНА / ${labels[i]}`);
  assert.equal(r.get('ticket-period').textContent,dates[i]);
  assert.equal(r.get('ticket-buy').hidden,true);
  assertCompactDates();
  if(i<4) assert.match(r.get('ticket-next').textContent,new RegExp(labels[i+1]));
 });
 assert.equal(r.get('ticket-unavailable').textContent,'НА ВХОДЕ');
 assert.doesNotMatch(r.get('ticket-message').textContent,/AT THE DOOR/);
 r.advance(r.config.stages[4].end);assertCompactDates();
});
