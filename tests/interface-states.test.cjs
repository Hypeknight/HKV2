const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const {renderToStaticMarkup: render} = require('react-dom/server');
function load(file, mocks={}) {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  new Function('exports','require',js)(exports, name => Object.hasOwn(mocks,name) ? mocks[name] : name === 'server-only' ? {} : name.startsWith('@/') ? {} : require(name));
  return exports;
}
const states = load('lib/interface-state/data.ts');
const record = {id:'event',name:'Available Native',slug:'available-native',status:'scheduled',is_public:true,is_approved:true,hidden_by_admin:false,removed_at:null,city:'Kansas City',state:'MO',event_start_at:'2099-01-01T20:00:00Z',promotion_start_at:'2000-01-01',promotion_end_at:'2100-01-01'};
const external = {...record,id:'external',name:'Available External',status:'active',classification:'Sports',genre:'Football',source_code:'ticketmaster'};
const lookupKeys = ['music_genres','event_types','vibe_tags','event_amenities','age_requirements'];
const lookups = Object.fromEntries(lookupKeys.map(key=>[key,[]]));
function database(overrides={},user=null) {
  const calls=[];
  const defaults = {events:{data:[record]},external_events:{data:[external]},profiles:{data:{id:'owner',display_name:'Owner',app_role:'user'}},event_saves:{data:[]},event_rsvps:{data:[]},markets:{data:[]},market_areas:{data:[]},special_days:{data:[]}};
  return {calls,auth:{getUser:async()=>({data:{user:user?{id:user,email:'owner@example.test'}:null}})},from(table){
    calls.push(table);
    const result=()=> {const value=Object.hasOwn(overrides,table)?overrides[table]:defaults[table]||{data:[]};if(value instanceof Error)throw value;return value;};
    const q={};for(const method of ['select','eq','in','is','not','or','neq','lte','gte','order','limit'])q[method]=()=>q;
    q.single=q.maybeSingle=async()=>result();q.then=(yes,no)=>Promise.resolve().then(result).then(yes,no);return q;
  }};
}
const Link=({href,children})=>React.createElement('a',{href},children);
const Notice=({message})=>React.createElement('p',{role:'status'},message);
const Card=({event})=>React.createElement('a',{href:event.href},event.name);
const Rail=({events=[],emptyText='No events are showing yet.'})=>React.createElement('div',null,events.length?events.map(event=>React.createElement(Card,{event,key:event.id})):emptyText);
const ui={SectionHeader:({title,text})=>React.createElement('section',null,title,text),EventCard:Card,EventRail:Rail,EmptyState:({text})=>React.createElement('p',null,text),MetricCard:({label,value})=>React.createElement('p',null,label,': ',value)};
function mocks(db,extra={}) {return {
  'next/link':{default:Link},'next/navigation':{redirect(path){throw Error('redirect:'+path)},notFound(){throw Error('not-found')}},
  '@/lib/supabase/server':{createClient:async()=>db},'@/lib/interface-state/data':states,'@/components/interface-state/DataNotice':{default:Notice},
  '@/lib/discovery/classification':load('lib/discovery/classification.ts'),'@/lib/discovery/destinations':load('lib/discovery/destinations.ts'),
  '@/lib/settings':{getPlatformSettings:async()=>({homepage_show_special_days:true})},'@/lib/states':{normalizeState:value=>value,US_STATES:[]},
  '@/lib/config/lookups':{getLookupMap:async()=>lookups},'@/lib/city-aliases':{expandCitySearch:value=>[value]},
  '@/lib/markets/registry':{buildMarketRegistry:()=>({}),resolveSearchMarket:()=>null,isLocationInMarket:()=>false},
  '@/lib/discovery/recommend-events':{getRecommendedEventsForUser:async()=>({preferences:null,recommendations:[]})},
  '@/lib/data':{getOwnedVenues:async()=>[]},'@/app/dashboard/actions':{signOutAction:()=>null},'./actions':{signOutAction:()=>null},
  '@/components/events/DiscoveryEventCard':{default:Card},'@/components/ui':ui,
  '@/components/analytics/TrackView':{default:()=>null},'@/components/analytics/SignalLink':{default:Link},
  '@/components/discovery/DiscoveryCommandBar':{default:()=>null},'@/components/location/DeviceLocationBadge':{default:()=>null},
  '@/components/discovery/DiscoverySearchForm':{default:({children})=>React.createElement('form',null,children)},...extra};}
async function page(file,db,query={},extra={}) {return render(await load(file,mocks(db,extra)).default({searchParams:Promise.resolve(query)}));}

test('collection states distinguish valid nonempty, empty, malformed, error and rejection; safe diagnostics',async()=>{
  const log=[];const original=console.error;console.error=(...args)=>log.push(args);
  try {
    for(const data of [[],[record]]) {const result=await states.readRows('test.valid',async()=>({data}),states.hasIdentity);assert.equal(result.status,'success');assert.equal(result.data.length,data.length);}
    for(const result of [{data:null},{data:undefined},{data:{}},{data:[null]},{data:[{}]},{data:[],error:{message:'SECRET SQL',code:'private'}}])assert.equal((await states.readRows('test.invalid',async()=>result,states.hasIdentity)).status,'unavailable');
    assert.equal((await states.readRows('test.reject',async()=>{throw Error('SECRET USER')})).status,'unavailable');
    assert.equal(JSON.stringify(log).includes('SECRET'),false);assert.ok(JSON.stringify(log).includes('test.reject'));
    assert.equal(states.countLabel(true,0),0);assert.equal(states.countLabel(false,0),'Unavailable');assert.equal(states.countLabel(true,NaN),'Unavailable');
    assert.equal(states.combinedState([{status:'success',data:[]},{status:'unavailable',data:null}]),'partial');
  } finally {console.error=original;}
});
for(const file of ['app/page.tsx','app/events/page.tsx']) {
 test(file+' preserves nonempty content and successful empty states',async()=>{
  assert.match(await page(file,database()),/Available Native/);
  const empty=await page(file,database({events:{data:[]},external_events:{data:[]}}),{category:'sports'});
  assert.doesNotMatch(empty,/temporarily unavailable|Results unavailable/);
  if(file==='app/events/page.tsx')assert.match(empty,/0 matching events/);else assert.match(empty,/Nothing is showing as live right now/);
 });
 for(const failed of [{data:null,error:{message:'SECRET database'}},new Error('SECRET request'),{data:null},{data:[null]},{data:[{id:'missing-name-and-status'}]}])test(file+' partial failure '+JSON.stringify(failed),async()=>{
  const html=await page(file,database({events:failed}));assert.match(html,/Available External/);assert.match(html,/temporarily unavailable/);assert.match(html,/Unavailable|unavailable/);assert.doesNotMatch(html,/SECRET|No recently added events yet/);
 });
 test(file+' both failed does not assert no events or zero inventory',async()=>{
  const html=await page(file,database({events:{data:null,error:{}},external_events:new Error('SECRET')}),{category:'music'});
  assert.match(html,/temporarily unavailable/);assert.doesNotMatch(html,/0 matching events|No events match|Nothing is showing as live|No recently added/);
 });
 test(file+' retries can recover to valid empty data',async()=>{
  assert.match(await page(file,database({events:new Error('fail')})),/unavailable/);
  assert.doesNotMatch(await page(file,database({events:{data:[]},external_events:{data:[]}})),/temporarily unavailable/);
 });
}
test('Discovery respects requested source completeness and conservatively withholds missing geographic results',async()=>{
 const db=database({events:new Error('native')});
 const externalOnly=await page('app/events/page.tsx',db,{source:'external'});assert.match(externalOnly,/1 matching event/);assert.match(externalOnly,/Available External/);
 const geography=await page('app/events/page.tsx',database({markets:new Error('markets')}),{city:'Kansas City'});assert.match(geography,/Location-based results are temporarily unavailable/);assert.doesNotMatch(geography,/0 matching events|Available Native|Available External/);
 const ordinary=await page('app/events/page.tsx',database({markets:new Error('markets')}));assert.match(ordinary,/Available Native/);assert.match(ordinary,/Market information is temporarily unavailable/);
});
test('filter failure retains successful inventory and selected filter value',async()=>{
 const html=await page('app/events/page.tsx',database(),{music:'Rock'},{'@/lib/config/lookups':{getLookupMap:async()=>{throw Error('SECRET')}}});
 assert.match(html,/Filter choices are temporarily unavailable/);assert.match(html,/<option value="rock" selected="">rock<\/option>/);assert.doesNotMatch(html,/SECRET/);
});
test('dashboard successful zeros remain zero; failures are not portfolio or engagement zeros',async()=>{
 const empty=await page('app/dashboard/page.tsx',database({events:{data:[]}},'owner'));assert.doesNotMatch(empty,/Unavailable|temporarily unavailable/);assert.match(empty,/Saved/);assert.match(empty,/>0</);
 const html=await page('app/dashboard/page.tsx',database({events:new Error('SECRET'),event_saves:{data:null,error:{}},event_rsvps:{data:null}},'owner'),{}, {'@/lib/data':{getOwnedVenues:async()=>{throw Error('SECRET')}},'@/lib/discovery/recommend-events':{getRecommendedEventsForUser:async()=>{throw Error('SECRET')}}});
 assert.match(html,/Unavailable/);assert.match(html,/business workspace information is temporarily unavailable/);assert.doesNotMatch(html,/No events yet|feed is warming up|SECRET/);
});
test('dashboard independent success survives another failure; missing profile does not invent completion',async()=>{
 const html=await page('app/dashboard/page.tsx',database({profiles:{data:null},event_saves:new Error('save')},'owner'));assert.match(html,/Available Native/);assert.match(html,/Profile setup progress is temporarily unavailable/);assert.doesNotMatch(html,/%/);
});
test('signed out dashboard redirects before private queries; public pages do not query private recommendations',async()=>{
 const db=database();await assert.rejects(page('app/dashboard/page.tsx',db),/redirect:\/auth\/login/);assert.deepEqual(db.calls,[]);
 for(const file of ['app/page.tsx','app/events/page.tsx'])await page(file,database(),{}, {'@/lib/discovery/recommend-events':{getRecommendedEventsForUser:async()=>{throw Error('must not call')}}});
});
test('Venue context retains authority checks, errors safely, and rejects missing/malformed records',async()=>{
 async function context(result,denied=false){let called=0;const fn=load('lib/venues/command-center.ts',{'next/navigation':{notFound(){throw Error('not-found')}},'@/lib/interface-state/data':states,'@/lib/venues/require-management':{requireVenueManagement:async()=>{called++;if(denied)throw Error('denied');return {supabase:database({venues:result})};}}}).getVenueCommandContext;return {fn,called:()=>called};}
 let c=await context({data:{id:'venue',name:'Venue'}});assert.equal((await c.fn('venue')).venue.name,'Venue');assert.equal(c.called(),1);
 for(const result of [{data:null,error:{}},new Error('SECRET'),{data:{id:'other'}},{data:{id:'venue'}},{}]) {c=await context(result);await assert.rejects(c.fn('venue'),/temporarily unavailable/);}
 c=await context({data:null});await assert.rejects(c.fn('venue'),/not-found/);
 c=await context({data:{id:'venue'}},true);await assert.rejects(c.fn('venue'),/denied/);
 const overview=load('app/dashboard/venues/[id]/page.tsx',{'next/link':{default:Link},'@/lib/venues/command-center':{getVenueCommandContext:async()=>({venue:{id:'venue',name:'Venue',is_visible:null}})}}).default;
 const html=render(await overview({params:Promise.resolve({id:'venue'})}));assert.match(html,/Not recorded/);assert.doesNotMatch(html,/Administratively hidden/);
});
test('retry refreshes current route; pending retry displays loading and disables duplicate attempts',()=>{
 let refreshed=0;
 for(const pending of [false,true]) {const Notice=load('components/interface-state/DataNotice.tsx',{'react':{useTransition:()=>[pending,fn=>fn()]},'next/navigation':{useRouter:()=>({refresh(){refreshed++;}})}}).default;const tree=Notice({message:'Unavailable'});const button=tree.props.children[1];assert.equal(button.props.disabled,pending);assert.equal(button.props.children,pending?'Loading…':'Try again');if(!pending)button.props.onClick();}
 assert.equal(refreshed,1);
 const Loading=load('app/loading.tsx').default;assert.match(render(React.createElement(Loading)),/aria-busy="true"/);assert.match(render(React.createElement(Loading)),/Loading HypeKnight/);
 const ErrorPage=load('components/interface-state/RouteError.tsx').default;let reset=0;const tree=ErrorPage({error:Error('SECRET'),reset:()=>reset++});tree.props.children[2].props.onClick();assert.equal(reset,1);assert.doesNotMatch(render(tree),/SECRET/);
});

test('strict filter retrieval distinguishes a missing response from successful empty choices',async()=>{
 const helper=load('lib/config/lookups.ts',{'@/lib/supabase/server':{createClient:async()=>database({lookup_values:{data:null}})}});
 await assert.rejects(helper.getLookupMap(['music_genres'],{requireData:true}),/unavailable/);
 const valid=load('lib/config/lookups.ts',{'@/lib/supabase/server':{createClient:async()=>database({lookup_values:{data:[]}})}});
 assert.deepEqual(await valid.getLookupMap(['music_genres'],{requireData:true}),{music_genres:[]});
});
test('malformed market metadata cannot become an empty geographic search',async()=>{
 const html=await page('app/events/page.tsx',database({markets:{data:[{id:'incomplete'}]}}),{city:'Kansas City'});
 assert.match(html,/Location-based results are temporarily unavailable/);assert.doesNotMatch(html,/0 matching events/);
});

test('malformed profile cannot produce a factual setup percentage',async()=>{
 const html=await page('app/dashboard/page.tsx',database({profiles:{data:{}}},'owner'));
 assert.match(html,/Profile setup progress is temporarily unavailable/);assert.doesNotMatch(html,/%/);
});
