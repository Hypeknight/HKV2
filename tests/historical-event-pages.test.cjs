const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
function load(file,mocks={},extra='') {
  const exports={};
  const source=ts.transpileModule(fs.readFileSync(file,'utf8')+extra,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  new Function('exports','require',source)(exports,name=>Object.hasOwn(mocks,name)?mocks[name]:name.startsWith('@/')?{}:require(name));
  return exports;
}
const base={id:'event',slug:'canonical-event',name:'Existing event',status:'scheduled',is_public:true,is_approved:true,hidden_by_admin:false,removed_at:null,owner_id:'owner',event_start_at:'2099-01-01T19:00:00Z',event_end_at:'2099-01-01T23:00:00Z',promotion_start_at:'2000-01-01T00:00:00Z',promotion_end_at:'2100-01-01T00:00:00Z'};
function client(event=base,{user=null,error=null}={}) {
  const calls=[];
  return {calls,auth:{getUser:async()=>({data:{user:user?{id:user}:null},error:null})},from(table){
    let filters=[];let head=false;
    function result(){
      calls.push(table);
      if(table==='events') {const matches=event&&filters.every(f=>f(event));return {data:matches?event:null,error:error||(matches?null:{message:'no rows'})};}
      if(table==='profiles')return {data:{app_role:'user'},error:null};
      return {data:head?null:table==='event_sources'?[]:null,count:head?0:null,error:null};
    }
    const q={select(cols,opts){head=!!opts?.head;return q;},eq(k,v){filters.push(r=>r[k]===v);return q;},in(k,vs){filters.push(r=>vs.includes(r[k]));return q;},is(k,v){filters.push(r=>r[k]===v);return q;},lte(k,v){filters.push(r=>r[k]<=v);return q;},gte(k,v){filters.push(r=>r[k]>=v);return q;},order(){return q;},single:async()=>result(),maybeSingle:async()=>result(),then(resolve,reject){return Promise.resolve(result()).then(resolve,reject);}};
    return q;
  }};
}
function setup(event=base,opts={}) {
  const db=client(event,opts);let views=0,pulseLoads=0;
  const children=({children})=>React.createElement('div',null,children);
  const panel=({children,title})=>React.createElement('section',null,React.createElement('h2',null,title),children);
  const noop=()=>null;
  const ui={};for(const name of ['ButtonLink','Chip','EventTime','InfoCard'])ui[name]=children;
  ui.Panel=panel;ui.EventStatusBadge=()=>React.createElement('span',null,'CURRENT-TIME-BADGE');
  const page=load('app/events/[slug]/page.tsx',{
    'next/link':{default:children},'next/navigation':{notFound(){throw Error('not found');}},'next/headers':{cookies:async()=>({get:()=>null})},
    '@/lib/supabase/server':{createClient:async()=>db},'@/lib/config/lookups':{getLookupMap:async()=>({})},
    '@/lib/reporting/snapshot':{publicCurrentCount:(n,e,authorized)=>authorized&&!e&&n!==null?String(n):'Unavailable'},
    '@/lib/metadata/event-metadata':{getEventShareMetadata:noop},'@/lib/presence/participant-cookie':{parseParticipantToken:()=>null},
    '@/lib/patron-pulse/service':{loadPublicPatronPulse:async()=>{pulseLoads++;return {session:null,pulses:[],announcements:[],hasVerifiedEventPresence:false};}},
    '@/app/events/actions':{recordRecentEventView:async()=>{views++;},reportEvent:noop,toggleEventSave:noop,updateEventRsvp:noop},
    '@/components/analytics/TrackView':{default:()=>React.createElement('span',null,'OBSERVED-PAGE-VIEW')},
    '@/components/analytics/SignalAnchor':{default:children},'@/components/events/ShareEventButton':{default:noop},'@/components/events/TicketSourceLink':{default:children},
    '@/components/patron-pulse/PatronPulseGuestPanel':{default:()=>React.createElement('div',null,'LIVE-GUEST-PANEL')},'@/components/ui':ui,
  }).default;
  const metadata=load('lib/metadata/event-metadata.ts',{
    '@/lib/supabase/server':{createClient:async()=>db},'@/lib/metadata/share':{cleanMetadataText:(value,fallback)=>value||fallback,buildShareMetadata:args=>args},
  }).getEventShareMetadata;
  return {db,page:()=>page({params:Promise.resolve({slug:'canonical-event'})}),metadata:()=>metadata('canonical-event'),effects:()=>({views,pulseLoads})};
}
for(const status of ['scheduled','active','live','completed','ended','cancelled','archived']) {
  test(status+' public page and share metadata resolve the same canonical record',async()=>{
    const s=setup({...base,status});const html=renderToStaticMarkup(await s.page());const meta=await s.metadata();
    assert.match(html,/Existing event/);assert.equal(meta.path,'/events/canonical-event');assert.match(meta.title,/Existing event/);
    assert.equal(s.effects().views,1);assert.match(html,/OBSERVED-PAGE-VIEW/);
    const historical=['completed','ended','cancelled','archived'].includes(status);
    if(historical){const label=status==='cancelled'?'Cancelled':status==='archived'?'Archived':'Completed';assert.match(html,new RegExp(label+' event'));assert.ok(meta.title.startsWith(label+' · '));assert.match(html,/Live participation is unavailable/);assert.doesNotMatch(html,/CURRENT-TIME-BADGE|LIVE-GUEST-PANEL/);assert.equal(s.effects().pulseLoads,0);}
    else {assert.match(html,/CURRENT-TIME-BADGE/);assert.match(html,/LIVE-GUEST-PANEL/);assert.equal(s.effects().pulseLoads,1);}
    assert.match(html,/Unavailable/);assert.doesNotMatch(html,/Save Event|I&#x27;m Going/);
  });
}
for(const [name,change] of [['hidden',{hidden_by_admin:true}],['private',{is_public:false}],['unapproved',{is_approved:false}],['draft',{status:'draft'}],['removed status',{status:'removed'}],['removed timestamp',{removed_at:'2026-01-01'}]]) {
  test(name+' is unavailable even to an authenticated owner',async()=>{
    for(const status of ['scheduled','completed','cancelled']) for(const user of [null,'owner']) {
      const s=setup({...base,status,...change},{user});await assert.rejects(s.page(),/not found/);
      const meta=await s.metadata();assert.equal(meta.title,'Event Not Available | HypeKnight');assert.equal(meta.image,undefined);
      assert.deepEqual(s.effects(),{views:0,pulseLoads:0});
    }
  });
}
test('missing or failed event lookups never render a historical page',async()=>{
  for(const s of [setup(null),setup(base,{error:{message:'query failure'}})])await assert.rejects(s.page(),/not found/);
  for(const s of [setup(null),setup(base,{error:{message:'query failure'}})]) assert.equal((await s.metadata()).title,'Event Not Available | HypeKnight');
});
test('historical saved/RSVP presentation retains existing authentication behavior',async()=>{
  const s=setup({...base,status:'completed'},{user:'owner'});const html=renderToStaticMarkup(await s.page());
  assert.match(html,/Save Event/);assert.match(html,/RSVP/);assert.match(html,/not verified attendance/);
  assert.match(html,/Currently Saved Accounts/);assert.match(html,/>0</);
});
test('upcoming Discovery excludes historical records even inside a synthetic valid time window',async()=>{
  const {loadHypeKnightEvents}=load('app/events/page.tsx',{},'\nexport {loadHypeKnightEvents};');
  for(const status of ['scheduled','active','completed','ended','cancelled','archived']) {
    const result=await loadHypeKnightEvents(client({...base,status}));
    assert.equal(Boolean(result.data),['scheduled','active'].includes(status),status);
  }
});
