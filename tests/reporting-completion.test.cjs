const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
function load(file,mocks={}) {
  const exports={};
  const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  new Function('exports','require','console',source)(exports,name=>name in mocks?mocks[name]:require(name),{error(){}});
  return exports;
}
const facts=load('lib/reporting/factual.ts');
const snapshots=load('lib/reporting/snapshot.ts',{'./factual':facts});
const Panel=load('components/patron-pulse/PulseResultsPanel.tsx').default;
const current={version:'p2b3b',saved:0,going:2,interested:1,discovery_observations:5,organic_observations:2,unclassified_observations:3};
const poll={pulseId:'pulse',title:'Choose',status:'closed',sampleState:'empty',totalResponses:0,optionSample:null,options:[{optionId:'a',label:'A',count:null},{optionId:'b',label:'B',count:null}]};
const snapshot=(results=[poll])=>({version:'p2b3b-display-v1',disclosure:'aggregate',complete:true,sessionId:'session',responseCount:results.some(p=>p.sampleState==='insufficient_sample')?null:results.reduce((s,p)=>s+(p.totalResponses||0),0),responseCountState:results.some(p=>p.sampleState==='insufficient_sample')?'insufficient_sample':'observed',results});
test('operational current counts are distinct from retained signal actions',()=>{
  const state=snapshots.ownerSnapshot(current,null);
  assert.equal(state.saved.value,0); assert.equal(state.going.value,2);
  const history=facts.eventFacts([{signal_type:'event_saved',signal_count:7,unique_actor_count:3}],null);
  assert.equal(history.saves.value,7);assert.equal(state.saved.state,'observed');
});
test('current-state RPC errors, missing migration and invalid contracts withhold counts',()=>{
  for(const [data,error] of [[null,null],[current,{}],[{...current,saved:null},null],[{...current,going:Number.MAX_SAFE_INTEGER+1},null],[{...current,unclassified_observations:0},null]]) {
    const result=snapshots.ownerSnapshot(data,error);assert.equal(result.available,false);assert.equal(result.saved.value,null);assert.equal(result.organic.value,null);
  }
});
test('public totals require authorized scope; valid zero differs from hidden or failed rows',()=>{
  assert.equal(snapshots.publicCurrentCount(0,null,true),'0');
  for(const args of [[0,null,false],[null,null,true],[5,{},true]]) assert.equal(snapshots.publicCurrentCount(...args),'Unavailable');
});
test('empty polls keep observed counts but withhold percentages and bars',()=>{
  const result=snapshots.pulseSnapshot(snapshot(),null,'session');
  assert.equal(result.unavailable,false);assert.equal(result.responseCount,0);
  const html=renderToStaticMarkup(React.createElement(Panel,{results:result.results}));
  assert.match(html,/0 current answers/);assert.match(html,/percentages are withheld/);assert.doesNotMatch(html,/0\.0%|width:/);
});
test('failed, null, wrong-session, truncated and inconsistent samples fail closed',()=>{
  for(const [data,error] of [[null,null],[snapshot(),{}],[{...snapshot(),sessionId:'other'},null],[{...snapshot(),complete:false},null],[{...snapshot(),responseCount:1},null],[snapshot([{...poll,optionSample:1}]),null],[snapshot([poll,poll]),null],[snapshot([{...poll,totalResponses:1,optionSample:1,options:[{optionId:'a',label:'A',count:2}]}]),null]]) {
    const result=snapshots.pulseSnapshot(data,error,'session');assert.equal(result.unavailable,true);assert.equal(result.responseCount,null);assert.deepEqual(result.results,[]);
  }
});
test('snapshot response and Pulse boundaries do not truncate at 1000 rows',()=>{
  for(const n of [999,1000,1001,2001]) {
    const result=snapshots.pulseSnapshot(snapshot([{...poll,sampleState:'observed',totalResponses:n,optionSample:n,options:[{optionId:'a',label:'A',count:n}]}]),null,'session');
    assert.equal(result.responseCount,n);assert.equal(result.results[0].options[0].percentage,100);
    const polls=Array.from({length:n},(_,i)=>({...poll,pulseId:String(i)}));
    assert.equal(snapshots.pulseSnapshot(snapshot(polls),null,'session').results.length,n);
  }
});
test('aggregates retain no participant, account, credential or free-text response data',()=>{
  const data=snapshot([{...poll,participant_id:'secret',user_id:'secret',participant_token:'secret',text_response:'secret'}]);
  assert.doesNotMatch(JSON.stringify(snapshots.pulseSnapshot(data,null,'session')),/secret/);
});
test('organic observations cannot classify unknown acquisition or imply Featured delivery',()=>{
  const state=snapshots.ownerSnapshot(current,null);
  assert.equal(state.organic.value,2);assert.equal(state.unclassified.value,3);
  const historical=facts.eventFacts([{signal_type:'featured_purchase',signal_count:8,unique_actor_count:1}],null);
  assert.equal(historical.featuredImpressions.state,'not_instrumented');assert.equal(historical.organicImpressions.value,null);
});
function publicPage(db) {
  const empty=()=>null;const content=({children})=>React.createElement('div',null,children);
  const ui={};for(const key of ['ButtonLink','Chip','EventStatusBadge','EventTime','InfoCard','Panel']) ui[key]=content;
  return load('app/events/[slug]/page.tsx',{
    'next/link':{default:content},'next/navigation':{notFound(){throw Error('not found');}},'next/headers':{cookies:async()=>({get:()=>null})},
    '@/lib/supabase/server':{createClient:async()=>db},'@/lib/reporting/snapshot':snapshots,
    '@/lib/config/lookups':{getLookupMap:async()=>({})},'@/lib/event-sources/providers':{eventSourceLabel:()=>''},
    '@/lib/metadata/event-metadata':{getEventShareMetadata:async()=>({})},
    '@/lib/presence/participant-cookie':{parseParticipantToken:()=>null},
    '@/lib/patron-pulse/service':{loadPublicPatronPulse:async()=>({settings:{},session:null,pulses:[],announcements:[],hasVerifiedEventPresence:false})},
    '@/app/events/actions':{recordRecentEventView:async()=>{},reportEvent:empty,toggleEventSave:empty,updateEventRsvp:empty},
    '@/components/analytics/TrackView':{default:empty},'@/components/analytics/SignalAnchor':{default:content},
    '@/components/events/ShareEventButton':{default:empty},'@/components/events/TicketSourceLink':{default:content},
    '@/components/patron-pulse/PatronPulseGuestPanel':{default:empty},'@/components/ui':ui,
  }).default;
}
function publicClient({user=null,count=0,countError=null,viewerError=null}={}) {
  const calls=[];
  return {calls,auth:{getUser:async()=>({data:{user:user?{id:user}:null},error:null})},from(table){
    let head=false;let viewer=false;
    const result=()=>table==='events'?{data:{id:'event',name:'Event',slug:'event',owner_id:'owner'},error:null}:
      table==='event_sources'?{data:[],error:null}:table==='profiles'?{data:{app_role:'user'},error:null}:
      {data:null,count:head?count:null,error:head?countError:viewerError};
    const q={select(cols,opts){head=!!opts?.head;if(head)calls.push(table);return q;},eq(key){if(key==='user_id')viewer=true;return q;},
      single:async()=>result(),maybeSingle:async()=>result(),then(resolve,reject){return Promise.resolve(result()).then(resolve,reject);}};
    for(const name of ['in','is','order'])q[name]=()=>q;return q;
  }};
}
test('signed-out event detail does not query RLS-hidden totals or render fabricated zero',async()=>{
  const db=publicClient();const html=renderToStaticMarkup(await publicPage(db)({params:Promise.resolve({slug:'event'})}));
  assert.deepEqual(db.calls,[]);assert.match(html,/Currently Saved Accounts/);assert.match(html,/Unavailable/);assert.doesNotMatch(html,/>0</);
});
test('public event detail renders valid signed-in zero and query failure unavailable independently',async()=>{
  for(const countError of [null,{message:'failed'}]) {
    const html=renderToStaticMarkup(await publicPage(publicClient({user:'viewer',countError}))({params:Promise.resolve({slug:'event'})}));
    if(countError) {assert.match(html,/Unavailable/);assert.doesNotMatch(html,/>0</);} else assert.match(html,/>0</);
  }
});
test('failed viewer state does not pretend an unsaved selection or offer a mutation form',async()=>{
  const html=renderToStaticMarkup(await publicPage(publicClient({user:'viewer',viewerError:{message:'failed'}}))({params:Promise.resolve({slug:'event'})}));
  assert.match(html,/saved and RSVP state is temporarily unavailable/);assert.doesNotMatch(html,/Remove Save|Save Event|I&#x27;m Going/);
});

test('approved safeguard covers 0,1,4,5,6 effective samples without reconstructing totals',()=>{
  for(const n of [0,1,4,5,6]) {
    const visible=n>=5;const small=n>0&&n<5;
    const p={...poll,sampleState:n===0?'empty':small?'insufficient_sample':'observed',totalResponses:small?null:n,optionSample:visible?n:null,
      options:[{optionId:'a',label:'A',count:visible?n:null}]};
    const result=snapshots.pulseSnapshot(snapshot([p]),null,'session');
    assert.equal(result.unavailable,false);assert.equal(result.results[0].options[0].count,visible?n:null);
    assert.equal(result.results[0].options[0].percentage,visible?100:null);assert.equal(result.responseCount,small?null:n);
    assert.equal(result.results[0].optionSample,visible?n:null);
    const html=renderToStaticMarkup(React.createElement(Panel,{results:result.results}));
    if(small) {assert.match(html,/Insufficient sample/);assert.doesNotMatch(html,/[1-4] current answers|100\.0%|width:/);} else if(!n) assert.match(html,/0 current answers/);
  }
});
test('suppressed leaked counts, denominators, session totals and diagnostic spoofing fail closed',()=>{
  const p={...poll,sampleState:'insufficient_sample',totalResponses:null};const data=snapshot([p]);
  for(const payload of [{...data,responseCount:4},{...data,responseCountState:'observed'},snapshot([{...p,totalResponses:4}]),snapshot([{...p,optionSample:4}]),snapshot([{...p,options:[{optionId:'a',label:'A',count:4}]}]),{...data,version:'p2b3b'}]) {
    assert.equal(snapshots.pulseSnapshot(payload,null,'session').unavailable,true);
  }
  const diagnostic={...snapshot([{...poll,sampleState:'diagnostic',totalResponses:1,optionSample:1,options:[{optionId:'a',label:'A',count:1}]}]),disclosure:'diagnostic'};
  assert.equal(snapshots.pulseSnapshot(diagnostic,null,'session').unavailable,true);
  const result=snapshots.pulseSnapshot(diagnostic,null,'session',true);
  assert.equal(result.responseCount,1);assert.equal(result.results[0].options[0].percentage,100);
});
test('mixed visible and insufficient samples withhold reconstructing session total and strip extra fields',()=>{
  const hidden={...poll,pulseId:'hidden',sampleState:'insufficient_sample',totalResponses:null,participant_id:'secret',hiddenCount:4};
  const shown={...poll,pulseId:'shown',sampleState:'observed',totalResponses:6,optionSample:6,options:[{optionId:'a',label:'A',count:6}]};
  const result=snapshots.pulseSnapshot(snapshot([hidden,shown]),null,'session');
  assert.equal(result.unavailable,false);assert.equal(result.responseCount,null);assert.equal(result.results[1].totalResponses,6);
  assert.doesNotMatch(JSON.stringify(result),/secret|hiddenCount/);
});

test('five or more effective answers show supported small option cells without extra suppression',()=>{
  const p={...poll,sampleState:'observed',totalResponses:5,optionSample:5,options:[{optionId:'a',label:'A',count:4},{optionId:'b',label:'B',count:1}]};
  const result=snapshots.pulseSnapshot(snapshot([p]),null,'session');
  assert.equal(result.results[0].options[1].count,1);assert.equal(result.results[0].options[1].percentage,20);
  const html=renderToStaticMarkup(React.createElement(Panel,{results:result.results}));assert.match(html,/20\.0%/);assert.doesNotMatch(html,/Withheld/);
});
