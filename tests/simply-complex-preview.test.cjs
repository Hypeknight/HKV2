const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup:render}=require('react-dom/server');
const cache={};
function load(file,mocks={}) {
 const out={};
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 new Function('exports','require',js)(out,name=>name in mocks?mocks[name]:name.startsWith('@/lib/')?lib(name.slice(2)+'.ts'):require(name));return out;
}
function lib(file){return cache[file]??(cache[file]=load(file));}
const data=lib('lib/discovery/preview-home.ts');
const success=rows=>({status:'success',data:rows});const fail={status:'unavailable',data:null};
const native=(overrides={})=>({id:'native',name:'Native night',slug:'native-night',status:'scheduled',is_public:true,is_approved:true,hidden_by_admin:false,removed_at:null,city:'Kansas City',state:'MO',event_start_at:'2026-11-15T20:00:00-06:00',flyer_url:'https://images.example.test/native.jpg',event_type:'music',...overrides});
const external=(overrides={})=>({id:'provider-1',name:'External night',status:'active',city:'Kansas City',state:'MO',source_code:'ticketmaster',event_start_at:'2026-11-16T20:00:00-06:00',segment:'Music',...overrides});
const Link=({href,children,...props})=>React.createElement('a',{href,...props},children);
const ui=load('components/preview/SimplyComplexHome.tsx',{'next/link':{default:Link},'@/components/preview/PreviewArtwork':{default:load('components/preview/PreviewArtwork.tsx').default},'@/components/ui/EventTime':{default:({value})=>React.createElement('time',{dateTime:value},value)}});
const html=(inventory,props={})=>render(React.createElement(ui.default,{inventory,...props}));
test('real native and supplemental inventory retains canonical detail destinations and native priority',()=>{
 const result=data.previewInventory(success([native()]),success([external()]));assert.equal(result.status,'success');assert.deepEqual(result.events.map(e=>e.href),['/events/native-night','/events/external/provider-1']);assert.equal(result.events[1].provider,'Ticketmaster');
});
test('historical, private, draft, unapproved, hidden and removed native records stay excluded',()=>{
 for(const change of [{status:'completed'},{status:'cancelled'},{status:'draft'},{is_public:false},{is_approved:false},{hidden_by_admin:true},{removed_at:'2026-11-01'}]) assert.equal(data.previewInventory(success([native(change)]),success([])).events.length,0,JSON.stringify(change));
});
test('unsafe identifiers and image URLs are not actionable or loaded',()=>{
 assert.equal(data.previewInventory(success([native({slug:'//evil.test'})]),success([])).events.length,0);
 for(const image of ['javascript:alert(1)','https://user:password@evil.test/image','data:image/png;base64,abc','/untrusted'])assert.equal(data.previewInventory(success([native({flyer_url:image})]),success([])).events[0].image,null);
});
test('aggregate preview props allowlist contains no private operational or participant data',()=>{
 const result=data.previewInventory(success([native({created_by:'private-owner',participant_id:'private-person',ticket_url:'https://private.test',signals:['private-evidence']})]),success([]));assert.doesNotMatch(JSON.stringify(result),/private-|created_by|participant|signals|ticket_url/);
});
test('structured category evidence retains Shamrock correction and does not invent unknown categories',()=>{
 const result=data.previewInventory(success([]),success([external({name:'Shamrock martial arts',segment:'Sports',genre:'Mixed Martial Arts'}),external({id:'unknown',segment:'Unknown'})]));assert.deepEqual(result.events[0].categories,['sports']);assert.deepEqual(result.events[1].categories,[]);
});
function client(results){const calls=[];return {calls,from(table){const chain={then(resolve,reject){const result=results[table];return result instanceof Error?Promise.reject(result).then(resolve,reject):Promise.resolve(result).then(resolve,reject);}};for(const method of ['select','in','eq','is','lte','gte','order','limit','not','or'])chain[method]=(...args)=>{calls.push([table,method,...args]);return chain;};return chain;}};}
test('loader reuses homepage eligibility boundaries, authenticated client and bounded queries',async()=>{
 const c=client({events:{data:[native()],error:null},external_events:{data:[external()],error:null}});const result=await data.loadPreviewInventory(c,new Date('2026-11-01T12:00:00Z'));assert.equal(result.events.length,2);
 assert.ok(c.calls.some(call=>call[0]==='events'&&call[1]==='in'&&JSON.stringify(call[3])==='["scheduled","active"]'));
 for(const bound of ['promotion_start_at','promotion_end_at'])assert.ok(c.calls.some(call=>call[2]===bound));
 assert.equal(c.calls.filter(call=>call[1]==='limit'&&call[2]===80).length,2);assert.deepEqual([...new Set(c.calls.map(call=>call[0]))],['events','external_events']);
});
test('query errors and rejected promises retain independently successful content',async()=>{
 for(const failure of [{data:null,error:{message:'private database detail'}},new Error('private failure')]){
 const result=await data.loadPreviewInventory(client({events:failure,external_events:{data:[external()],error:null}}));assert.equal(result.status,'partial');assert.equal(result.events.length,1);assert.doesNotMatch(JSON.stringify(result),/private/);
 }
});
test('missing/malformed rows and complete failure produce unavailable rather than success-empty',async()=>{
 for(const failure of [{data:null,error:null},{data:[{id:'bad'}],error:null},new Error('query failed')]){
 const result=await data.loadPreviewInventory(client({events:failure,external_events:failure}));assert.equal(result.status,'unavailable');assert.deepEqual(result.events,[]);
 }
});
test('successful empty sample remains success with no invented inventory',async()=>{
 const result=await data.loadPreviewInventory(client({events:{data:[],error:null},external_events:{data:[],error:null}}));assert.equal(result.status,'success');assert.match(html(result),/No eligible events returned in this snapshot/);assert.doesNotMatch(html(result),/temporarily unavailable/);
});
test('unavailable view never claims factual zero or successful empty market',()=>{
 const out=html({status:'unavailable',events:[]});assert.match(out,/does not mean there are no events/);assert.match(out,/Try again/);assert.doesNotMatch(out,/No eligible events returned|No matching events|0 found|0 events/);
});
test('partial view retains successful event cards and truthful source limitation',()=>{
 const out=html(data.previewInventory(fail,success([external()])));assert.match(out,/External night/);assert.match(out,/not the full inventory/);assert.match(out,/External · Ticketmaster/);assert.doesNotMatch(out,/No matching events/);
});
test('city filtering is exact and category navigation retains market context',()=>{
 const inv=data.previewInventory(success([native()]),success([external({id:'other',city:'Lawrence',state:'KS'})]));assert.equal(inv.events.filter(e=>data.inPreviewCity(e,'kansas city','Missouri')).length,1);
 const out=html(inv,{city:'Kansas City',state:'MO'});assert.ok(out.includes("city=Kansas+City&amp;state=MO&amp;category=music"));assert.ok(!out.includes('href="/events/external/other"'));assert.match(out,/name="city".*value="Kansas City"/);assert.match(out,/name="state".*value="MO"/);
});
test('empty market allows general discovery; no matching category tiles fabricated',()=>{
 const out=html(data.previewInventory(success([native()]),success([])),{city:'No fixture'});assert.match(out,/No matching events in this snapshot/);assert.doesNotMatch(out,/sc-category-number/);assert.match(out,/Explore all locations/);
});
test('loading and intentional state examples are explicit accessible states',()=>{
 const out=html({status:'success',events:[]},{demo:'loading'});assert.match(out,/State demonstration: loading/);assert.match(out,/role="status"/);assert.match(out,/Finding your next night/);assert.doesNotMatch(out,/No eligible events returned/);
});
test('semantic search, optional market, navigation and image fallback remain usable without JavaScript',()=>{
 const out=html(data.previewInventory(success([native({flyer_url:null})]),success([])));assert.match(out,/for="sc-search"/);assert.match(out,/id="sc-search"/);assert.match(out,/method="get"/);assert.match(out,/Skip · Explore all locations/);assert.match(out,/Event image unavailable/);assert.ok(out.includes('href="/dashboard/events/new/step-1"'));
});
test('preview does not emit homepage impressions, pretend Featured delivery or expose recommendation scores',()=>{
 const source=fs.readFileSync('components/preview/SimplyComplexHome.tsx','utf8');assert.doesNotMatch(source,/TrackView|DiscoveryImpression|SignalLink|recordSearchSubmission|score|Featured/);
 const css=fs.readFileSync('app/preview/simply-complex/preview.css','utf8');assert.match(css,/prefers-reduced-motion/);assert.match(css,/focus-visible/);assert.match(css,/max-width:639px/);
});

test('broken provider artwork recovers to neutral fallback without losing event content',()=>{
 let failed=false;const Artwork=load('components/preview/PreviewArtwork.tsx',{react:{useState:()=>[false,value=>{failed=value;}]}}).default;const tree=Artwork({image:'https://example.test/missing.jpg'});tree.props.children.props.onError();assert.equal(failed,true);
 const Failed=load('components/preview/PreviewArtwork.tsx',{react:{useState:()=>[true,()=>{}]}}).default;const out=render(React.createElement(Failed,{image:'https://example.test/missing.jpg'}));assert.match(out,/Event image unavailable/);assert.doesNotMatch(out,/<img/);
});
test('state demonstrations are explicit, noindex, and empty/loading/error examples perform no inventory query',async()=>{
 let calls=0;const Page=load('app/preview/simply-complex/page.tsx',{'./preview.css':{},'@/lib/supabase/server':{createClient:async()=>{calls++;throw Error('not expected');}},'@/components/preview/SimplyComplexHome':{default:()=>null}});
 for(const demo of ['empty','loading','unavailable']){const view=await Page.default({searchParams:Promise.resolve({demo})});assert.equal(view.props.demo,demo);assert.deepEqual(view.props.inventory.events,[]);assert.equal(view.props.inventory.status,demo==='unavailable'?'unavailable':'success');}
 assert.equal(calls,0);assert.deepEqual(Page.metadata.robots,{index:false,follow:false});
});
